import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, getFirestore } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  iconBg: string;
  iconBorder: string;
  iconType: string;
  createdAt: number;
}

const COLLECTION_NAME = 'notices';

export const noticeService = {
  async getNotices(): Promise<Notice[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice));
  },

  async addNotice(notice: Omit<Notice, 'id'>): Promise<string> {
    const newDocRef = doc(collection(db, COLLECTION_NAME));
    const newNotice = { ...notice, id: newDocRef.id };
    await setDoc(newDocRef, newNotice);
    return newDocRef.id;
  },

  async deleteNotice(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};
