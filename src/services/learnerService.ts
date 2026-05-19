import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Learner } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const LEARNERS_COLLECTION = 'learners';

export const learnerService = {
  subscribeToLearners(callback: (learners: Learner[]) => void) {
    const q = query(collection(db, LEARNERS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const learners = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Learner[];
      callback(learners);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, LEARNERS_COLLECTION);
    });
  },

  async addLearner(learner: Omit<Learner, 'joinedAt'>) {
    const docRef = doc(db, LEARNERS_COLLECTION, learner.id);
    const joinedAt = new Date().toISOString();
    try {
      await setDoc(docRef, { ...learner, joinedAt });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${LEARNERS_COLLECTION}/${learner.id}`);
    }
  },

  async updateLearner(id: string, updates: Partial<Learner>) {
    const docRef = doc(db, LEARNERS_COLLECTION, id);
    try {
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${LEARNERS_COLLECTION}/${id}`);
    }
  },

  async approveLearner(id: string) {
    return this.updateLearner(id, { isApproved: true });
  },

  async deleteLearner(id: string) {
    const docRef = doc(db, LEARNERS_COLLECTION, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${LEARNERS_COLLECTION}/${id}`);
    }
  },

  async testConnection() {
    try {
      // Try to get a single document from learners instead of a blocked collection
      const q = query(collection(db, LEARNERS_COLLECTION), where('isApproved', '==', true));
      await getDocFromServer(doc(db, LEARNERS_COLLECTION, 'connection-test-id'));
      console.log("Firebase connected successfully.");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('the client is offline')) {
          console.error("Firebase is offline. Check network or configuration.");
        } else if (error.message.includes('permission-denied')) {
          // This is actually a good sign that we reached the server
          console.log("Firebase server reached (permission check passed).");
        } else {
          console.error("Firebase connection error:", error.message);
        }
      }
    }
  }
};
