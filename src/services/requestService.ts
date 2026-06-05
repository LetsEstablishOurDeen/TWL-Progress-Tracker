import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot,
  orderBy,
  deleteDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { EditRequest } from '../types';

export const REQUESTS_COLLECTION = 'edit_requests';

export const requestService = {
  async submitRequest(request: Omit<EditRequest, 'id' | 'status' | 'requestedAt'>) {
    try {
      // Direct prevent duplicate request submissions
      const q = query(
        collection(db, REQUESTS_COLLECTION),
        where('learnerId', '==', request.learnerId),
        where('status', '==', 'pending'),
        where('type', '==', request.type),
        where('isFocus', '==', request.isFocus || false)
      );
      const snap = await getDocs(q);
      const titleToMatch = request.details?.title?.toLowerCase().trim();
      const isDuplicate = snap.docs.some(doc => {
        const data = doc.data();
        const existingTitle = data.details?.title?.toLowerCase().trim();
        const detailsMatch = request.type === 'task' 
          ? (data.details?.count === request.details?.count && data.details?.description === request.details?.description)
          : (existingTitle === titleToMatch);
        return detailsMatch;
      });

      if (isDuplicate) {
        console.log("Blocking duplicate pending request submission for:", request.learnerId, request.type);
        return null;
      }
    } catch (e) {
      console.error("Deduplication check failed:", e);
    }

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

  async deleteRequestsByLearnerId(learnerId: string) {
    try {
      const q = query(
        collection(db, REQUESTS_COLLECTION),
        where('learnerId', '==', learnerId)
      );
      const snapshot = await getDocs(q);
      const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to delete requests for learner:", error);
    }
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
