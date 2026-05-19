import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EditRequest } from '../types';

export const REQUESTS_COLLECTION = 'edit_requests';

export const requestService = {
  async submitRequest(request: Omit<EditRequest, 'id' | 'status' | 'requestedAt'>) {
    const colRef = collection(db, REQUESTS_COLLECTION);
    return await addDoc(colRef, {
      ...request,
      status: 'pending',
      requestedAt: new Date().toISOString()
    });
  },

  async updateRequestStatus(id: string, status: 'approved' | 'rejected') {
    const docRef = doc(db, REQUESTS_COLLECTION, id);
    return await updateDoc(docRef, { status });
  },

  async deleteRequest(id: string) {
    const docRef = doc(db, REQUESTS_COLLECTION, id);
    return await deleteDoc(docRef);
  },

  subscribeToRequests(callback: (requests: EditRequest[]) => void) {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      orderBy('requestedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EditRequest[];
      callback(requests);
    });
  }
};
