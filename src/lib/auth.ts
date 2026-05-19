import { learnerService, LEARNERS_COLLECTION } from '../services/learnerService';
import { db, auth } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

// Basic LocalStorage Auth Simulation for Learners
const AUTH_KEY = 'wisdom_lounge_auth_user';

export interface AuthUser {
  uid: string;
  email: string | null;
}

const authEvents = new EventTarget();

export const authService = {
  getCurrentLearnerUser(): AuthUser | null {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  },

  setCurrentLearnerUser(user: AuthUser | null) {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
    authEvents.dispatchEvent(new Event('auth_changed'));
  },

  async signUp(id: string, password: string, fullName: string) {
    try {
      await learnerService.addLearner({
        id: id,
        fullName,
        isApproved: false,
        booksCompleted: [],
        presentationsGiven: [],
        tasksCompleted: 0,
        // @ts-ignore
        password: password
      });

      const user = { uid: id, email: null };
      this.setCurrentLearnerUser(user);
      return user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  },

  async signIn(id: string, password: string) {
    try {
      const docRef = doc(db, LEARNERS_COLLECTION, id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const error: any = new Error("User not found");
        error.code = 'auth/user-not-found';
        throw error;
      }
      
      const data = snap.data();
      if (data.password !== password) {
        const error: any = new Error("Wrong password");
        error.code = 'auth/wrong-password';
        throw error;
      }

      const user = { uid: id, email: null };
      this.setCurrentLearnerUser(user);
      return user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  },

  async adminSignIn() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  async signOut() {
    this.setCurrentLearnerUser(null);
    await firebaseSignOut(auth);
  },

  onAuthChange(callback: (user: AuthUser | null) => void) {
    // We combine Firebase Auth (for Admin) and LocalStorage (for Learner)
    let currentFirebaseUser: AuthUser | null = null;

    const fireUnsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        currentFirebaseUser = { uid: u.uid, email: u.email };
        callback(currentFirebaseUser);
      } else {
        currentFirebaseUser = null;
        callback(this.getCurrentLearnerUser());
      }
    });

    const listener = () => {
      if (!currentFirebaseUser) {
        callback(this.getCurrentLearnerUser());
      }
    };
    authEvents.addEventListener('auth_changed', listener);
    
    const storageListener = (e: StorageEvent) => {
      if (e.key === AUTH_KEY && !currentFirebaseUser) {
        callback(this.getCurrentLearnerUser());
      }
    };
    window.addEventListener('storage', storageListener);

    return () => {
      fireUnsubscribe();
      authEvents.removeEventListener('auth_changed', listener);
      window.removeEventListener('storage', storageListener);
    };
  }
};

