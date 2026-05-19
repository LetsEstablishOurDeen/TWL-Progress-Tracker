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

export const LEARNERS_COLLECTION = 'learners';

function handleFirestoreError(error: unknown) {
  console.error('Firestore Error: ', error);
  throw error;
}

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
      handleFirestoreError(error);
    });
  },

  async addLearner(learner: Omit<Learner, 'joinedAt'>) {
    const docRef = doc(db, LEARNERS_COLLECTION, learner.id);
    const joinedAt = new Date().toISOString();
    try {
      await setDoc(docRef, { 
        ...learner, 
        joinedAt,
        moduleStats: {},
        moduleItems: {}
      });
    } catch (error) {
      handleFirestoreError(error);
    }
  },

  async updateLearner(id: string, updates: Partial<Learner>) {
    const docRef = doc(db, LEARNERS_COLLECTION, id);
    try {
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error);
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
      handleFirestoreError(error);
    }
  },

  async testConnection() {
    try {
      const q = query(collection(db, LEARNERS_COLLECTION), where('isApproved', '==', true));
      await getDocFromServer(doc(db, LEARNERS_COLLECTION, 'connection-test-id'));
      console.log("Firebase connected successfully.");
    } catch (error: any) {
      console.error("Firebase connection error:", error.message);
    }
  }
};