import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling fallback enabled to prevent offline errors in iframes
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

/**
 * Recursively removes all 'undefined' fields from an object so Firestore doesn't throw.
 * It replaces undefined values with null or completely omits them from maps.
 */
export function sanitizeFirestoreData<T>(val: T): T {
  if (val === undefined) return null as any;
  if (val === null) return null as any;
  if (Array.isArray(val)) {
    return val.map(item => sanitizeFirestoreData(item)) as any;
  }
  if (typeof val === 'object') {
    // If it's a date or secondary custom Firestore type that we want to preserve, return it, but
    // since we only use plain JS objects/types here, standard object traversal is safe.
    const sanitized: any = {};
    for (const key of Object.keys(val as any)) {
      const value = (val as any)[key];
      if (value !== undefined) {
        sanitized[key] = sanitizeFirestoreData(value);
      }
    }
    return sanitized;
  }
  return val;
}

