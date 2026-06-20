import { learnerService, LEARNERS_COLLECTION } from '../services/learnerService';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

  async signUp(id: string, password: string, fullName: string, phoneNumber?: string) {
    try {
      await learnerService.addLearner({
        id: id,
        fullName,
        phoneNumber,
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
      
      let data = null;
      let finalId = id;
      
      if (!snap.exists()) {
        // Fallback to name search if lookup by ID fails
        const { collection, getDocs } = await import('firebase/firestore');
        const querySnapshot = await getDocs(collection(db, LEARNERS_COLLECTION));
        
        const userInput = id.toLowerCase().trim();
        const userDoc = querySnapshot.docs.find(d => {
          const name = d.data().fullName;
          return name && name.toLowerCase().trim() === userInput;
        });
        
        if (!userDoc) {
          const error: any = new Error("User not found");
          error.code = 'auth/user-not-found';
          throw error;
        } else {
          data = userDoc.data();
          finalId = userDoc.id;
        }
      } else {
        data = snap.data();
      }

      if (data.password !== password) {
        const error: any = new Error("Wrong password");
        error.code = 'auth/wrong-password';
        throw error;
      }

      const user = { uid: finalId, email: null };
      this.setCurrentLearnerUser(user);
      return user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  },

  async adminSignIn(forceReAuth = false) {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive.readonly');
    
    if (forceReAuth) {
      provider.setCustomParameters({ prompt: 'consent' });
    }
    
    // We should also store the credential so we can get the access token
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      await this.setAccessToken(credential.accessToken);
    }
  },

  async setAccessToken(token: string) {
    // Keep it in memory or localStorage depending on persistence needs
    // For simple usage, we can store loosely in localStorage (not typically recommended for long-lived, but works for this scope) or memory
    // Let's use memory/sessionStorage to avoid long-term token leaks
    sessionStorage.setItem('google_drive_access_token', token);
    try {
      await setDoc(doc(db, 'settings', 'google_drive'), {
        accessToken: token,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Could not store Google Drive token in Firestore:", err);
    }
  },

  getAccessToken() {
    return sessionStorage.getItem('google_drive_access_token');
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

