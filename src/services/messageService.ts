import { collection, doc, getDocs, setDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Message {
  id: string;
  learnerId: string;
  sender: 'admin' | 'learner';
  text: string;
  createdAt: number;
  read: boolean;
}

const COLLECTION_NAME = 'messages';

export const messageService = {
  subscribeToLearnerMessages(learnerId: string, callback: (messages: Message[]) => void) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('learnerId', '==', learnerId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      // Sort in memory to avoid composite index limits
      messages.sort((a, b) => a.createdAt - b.createdAt);
      callback(messages);
    });
  },

  async sendMessage(learnerId: string, sender: 'admin' | 'learner', text: string): Promise<string> {
    const newDocRef = doc(collection(db, COLLECTION_NAME));
    const newMessage: Message = {
      id: newDocRef.id,
      learnerId,
      sender,
      text,
      createdAt: Date.now(),
      read: false
    };
    await setDoc(newDocRef, newMessage);
    return newDocRef.id;
  },

  async markAsRead(learnerId: string, viewer: 'admin' | 'learner') {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('learnerId', '==', learnerId)
    );
    const snapshot = await getDocs(q);
    
    // Filter in memory to avoid missing composite index errors
    const updates = snapshot.docs
      .filter(doc => {
         const data = doc.data() as Message;
         return data.sender === (viewer === 'admin' ? 'learner' : 'admin') && data.read === false;
      })
      .map(messageDoc => 
        setDoc(doc(db, COLLECTION_NAME, messageDoc.id), { read: true }, { merge: true })
      );
    
    await Promise.all(updates);
  },
  
  subscribeToUnreadAdminMessages(callback: (unreadCounts: Record<string, number>) => void) {
    const q = query(collection(db, COLLECTION_NAME), where('read', '==', false));
    
    return onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Message;
        if (data.sender === 'learner') {
          counts[data.learnerId] = (counts[data.learnerId] || 0) + 1;
        }
      });
      callback(counts);
    });
  },
  
  subscribeToUnreadLearnerMessages(learnerId: string, callback: (count: number) => void) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('learnerId', '==', learnerId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const unreadCount = snapshot.docs.filter(doc => {
         const data = doc.data() as Message;
         return data.sender === 'admin' && data.read === false;
      }).length;
      callback(unreadCount);
    });
  }
};
