import { learnerService } from '../services/learnerService';

// Basic LocalStorage Auth Simulation
const AUTH_KEY = 'wisdom_lounge_auth_user';

export interface AuthUser {
  uid: string;
  email: string | null;
}

const authEvents = new EventTarget();

export const authService = {
  getCurrentUser(): AuthUser | null {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser(user: AuthUser | null) {
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
      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  },

  async signIn(id: string, password: string) {
    try {
      // Just grab from learnerService indirectly (since we are in same localStorage)
      const data = localStorage.getItem('wisdom_lounge_learners');
      const learners = data ? JSON.parse(data) : [];
      const profile = learners.find((l: any) => l.id === id);

      if (!profile) {
        const error: any = new Error("User not found");
        error.code = 'auth/user-not-found';
        throw error;
      }
      
      if (profile.password !== password) {
        const error: any = new Error("Wrong password");
        error.code = 'auth/wrong-password';
        throw error;
      }

      const user = { uid: id, email: null };
      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  },

  async adminSignIn() {
    const user = { uid: 'admin', email: 'araizhasan00@gmail.com' };
    this.setCurrentUser(user);
    return user;
  },

  async signOut() {
    this.setCurrentUser(null);
  },

  onAuthChange(callback: (user: AuthUser | null) => void) {
    // Initial call
    callback(this.getCurrentUser());

    const listener = () => callback(this.getCurrentUser());
    authEvents.addEventListener('auth_changed', listener);
    
    const storageListener = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) {
        callback(this.getCurrentUser());
      }
    };
    window.addEventListener('storage', storageListener);

    return () => {
      authEvents.removeEventListener('auth_changed', listener);
      window.removeEventListener('storage', storageListener);
    };
  }
};

