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
  getDocs,
  collectionGroup
} from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { EditRequest } from '../types';

export const REQUESTS_COLLECTION = 'edit_requests';

export const getFolderName = (name: string | undefined): string => {
  if (!name) return 'Unknown_Learner';
  return name.trim().replace(/\//g, '-');
};

export const requestService = {
  async submitRequest(request: Omit<EditRequest, 'id' | 'status' | 'requestedAt'> & { status?: 'approved' | 'pending' }) {
    try {
      // Avoid composite indexes by querying only by learnerId and filtering in-memory
      const q = query(
        collectionGroup(db, 'requests'),
        where('learnerId', '==', request.learnerId)
      );
      const snap = await getDocs(q);
      const titleToMatch = request.details?.title?.toLowerCase().trim();
      const isDuplicate = snap.docs.some(doc => {
        const data = doc.data();
        if (data.status !== 'pending' || data.type !== request.type || (data.isFocus || false) !== (request.isFocus || false)) {
          return false;
        }
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

    try {
      const folder = getFolderName(request.learnerName);
      const colRef = collection(db, REQUESTS_COLLECTION, folder, 'requests');
      const sanitizedPayload = sanitizeFirestoreData({
        ...request,
        status: request.status || 'pending',
        requestedAt: new Date().toISOString()
      });
      return await addDoc(colRef, sanitizedPayload);
    } catch (e) {
      console.error("Failed to add request to database:", e);
      throw e;
    }
  },

  async updateRequestStatus(id: string, status: 'approved' | 'rejected', learnerName?: string, docPath?: string) {
    let docRef;
    if (docPath) {
      docRef = doc(db, docPath);
    } else if (learnerName) {
      docRef = doc(db, REQUESTS_COLLECTION, getFolderName(learnerName), 'requests', id);
    } else {
      // Search fallback: find across all requests
      const q = query(collectionGroup(db, 'requests'));
      const snap = await getDocs(q);
      const found = snap.docs.find(d => d.id === id);
      if (found) {
        docRef = found.ref;
      } else {
        throw new Error(`Request not found for ID: ${id}`);
      }
    }
    return await updateDoc(docRef, { status });
  },

  async deleteRequest(id: string, learnerName?: string, docPath?: string) {
    let docRef;
    if (docPath) {
      docRef = doc(db, docPath);
    } else if (learnerName) {
      docRef = doc(db, REQUESTS_COLLECTION, getFolderName(learnerName), 'requests', id);
    } else {
      // Search fallback: find across all requests
      const q = query(collectionGroup(db, 'requests'));
      const snap = await getDocs(q);
      const found = snap.docs.find(d => d.id === id);
      if (found) {
        docRef = found.ref;
      } else {
        docRef = doc(db, REQUESTS_COLLECTION, id);
      }
    }
    return await deleteDoc(docRef);
  },

  async deleteRequestsByLearnerId(learnerId: string) {
    try {
      const q = query(
        collectionGroup(db, 'requests'),
        where('learnerId', '==', learnerId)
      );
      const snapshot = await getDocs(q);
      const promises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to delete requests for learner:", error);
    }
  },

  subscribeToRequests(callback: (requests: (EditRequest & { docPath?: string })[]) => void) {
    const q = query(
      collectionGroup(db, 'requests')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        docPath: doc.ref.path,
        ...doc.data()
      })) as any[];
      
      // Sort in-memory to prevent requiring composite indexes
      requests.sort((a, b) => {
        const timeA = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
        const timeB = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
        return timeB - timeA;
      });
      callback(requests);
    });
  }
};
