import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface LoungeCircle {
  id: string;
  title: string;
  description: string;
  moderator: string;
  schedule: string;
  category: string; // e.g. Reading, Memorization, Language, Discussion
  format?: string; // e.g. Onsite, Online, Hybrid
  joinLink?: string; // custom join link set by admin
  duration?: string; // e.g. 6 weeks, Ongoing, 10 sessions
  methodology?: string; // e.g. Live reading, Pictorial snippets, Post-reading discussion
  bookName?: string; // e.g. Ar-Raheeq Al-Makhtum
  bookAuthor?: string; // custom book author
  subject?: string; // e.g. Islamic History / Hadith / Biography
  startDate?: string; // e.g. 2024-08-01 or TBD
  status?: 'ongoing' | 'upcoming' | 'past';
  createdAt: number;
}

const COLLECTION_NAME = 'lounge_circles';

export const fallbackCircles: LoungeCircle[] = [
  {
    id: 'circle-1',
    title: 'The Sealed Nectar Reading Circle',
    description: 'An informal weekly circle gathering to read and analyze "Ar-Raheeq Al-Makhtum" (The Sealed Nectar) together. No registration required, all are welcome to sit, listen, and share reflection.',
    moderator: 'Brother Yousuf',
    schedule: 'Every Friday after Maghrib',
    category: 'Book Reading',
    format: 'Onsite',
    duration: 'Ongoing',
    methodology: 'Live book reading and collective discussion',
    bookName: 'Ar-Raheeq Al-Makhtum',
    createdAt: 1718870000000,
  },
  {
    id: 'circle-2',
    title: 'Classical Arabic Grammar Lab',
    description: 'An exchange circle focused on practicing syntax (Nahw) and morphology (Sarf) of Quranic verses. Beginners are supported by senior learners in a non-judgmental environment.',
    moderator: 'Sister Zara',
    schedule: 'Mondays & Thursdays 8:30 PM',
    category: 'Language Practice',
    format: 'Hybrid',
    joinLink: 'https://meet.google.com',
    duration: '12 Weeks',
    methodology: 'Pictorial snippets & interactive whiteboard drills',
    createdAt: 1718880000000,
  }
];

function cleanUndefinedFields<T extends object>(obj: T): T {
  const result = { ...obj };
  (Object.keys(result) as Array<keyof T>).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

export const circleService = {
  async getCircles(): Promise<LoungeCircle[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const dbCircles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoungeCircle));
      if (dbCircles.length === 0) {
        if (localStorage.getItem('circles_seeded') !== 'true') {
          try {
            for (const circle of fallbackCircles) {
              await setDoc(doc(db, COLLECTION_NAME, circle.id), circle);
            }
            localStorage.setItem('circles_seeded', 'true');
            return fallbackCircles;
          } catch (seedError) {
            console.warn('Failed to seed fallback circles:', seedError);
            return fallbackCircles;
          }
        }
        return [];
      }
      return dbCircles;
    } catch (e) {
      console.warn('Firestore failed to fetch circles, falling back to static data:', e);
      return fallbackCircles;
    }
  },

  async addCircle(circle: Omit<LoungeCircle, 'id'>): Promise<string> {
    const newDocRef = doc(collection(db, COLLECTION_NAME));
    const newCircle = { ...circle, id: newDocRef.id };
    await setDoc(newDocRef, cleanUndefinedFields(newCircle));
    return newDocRef.id;
  },

  async updateCircle(id: string, circle: Partial<Omit<LoungeCircle, 'id'>>): Promise<void> {
    await setDoc(doc(db, COLLECTION_NAME, id), cleanUndefinedFields(circle), { merge: true });
  },

  async deleteCircle(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};
