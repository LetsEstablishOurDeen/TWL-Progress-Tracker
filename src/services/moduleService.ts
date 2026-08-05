import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';

export interface LoungeModule {
  id: string;
  status: 'ongoing' | 'upcoming' | 'past';
  title: string;
  tag: string;
  collaboratorTag?: string; // New field
  isEnrollmentOpen?: boolean;
  hasLoungeDiscountEnrollment?: boolean;
  loungeDiscountEnrollment?: number;
  hasLoungeDiscountMonthly?: boolean;
  loungeDiscountMonthly?: number;
  batch: string;
  synopsis: string;
  timeline: string;
  sessions: string;
  duration: string;
  time: string;
  enrollment: string;
  enrollmentFee: string;
  fee: string;
  speaker: string;
  location: string;
  category: string; // e.g. tafsir, seerah, dowra, articles
  color: string; // e.g. amber, green, blue, purple, rose, sky
  orientationDate?: string; // YYYY-MM-DD
  sessionDates?: string[]; // Custom assigned session dates
  createdAt: number;
}

const COLLECTION_NAME = 'lounge_modules';

export const fallbackModules: LoungeModule[] = [
  {
    id: 'module-1',
    status: 'ongoing',
    title: 'Tafsir',
    tag: 'The Exegesis Of The Noble Quran',
    batch: 'Surah Nisaa',
    synopsis: 'Diving deep into the architecture of justice, society, and divine law-exploring the balance between rights, duties, and accountability in this world and the next.',
    timeline: 'Orientation on June 14th',
    sessions: 'Bi-weekly',
    duration: '2 Months',
    time: 'Night time',
    enrollment: 'Open',
    enrollmentFee: 'PKR 1000',
    fee: 'PKR 500/mo',
    color: 'amber',
    speaker: 'Sana Amjad',
    location: 'Inside the Lounge',
    category: 'tafsir',
    orientationDate: '2026-06-14',
    sessionDates: [
      '2026-06-15', '2026-06-17', '2026-06-22', '2026-06-24', 
      '2026-06-29', '2026-07-01', '2026-07-06', '2026-07-08', 
      '2026-07-13', '2026-07-15', '2026-07-20', '2026-07-22', 
      '2026-07-27', '2026-07-29', '2026-08-03', '2026-08-05', 
      '2026-08-10', '2026-08-12'
    ],
    createdAt: 1718870000000,
  },
  {
    id: 'module-2',
    status: 'upcoming',
    title: 'Seerah',
    tag: 'The Legacy Of The Beloved ﷺ',
    collaboratorTag: 'A Collaboration With Mindful Muslims', // Added collaborator tag
    isEnrollmentOpen: true, // Added enrollment setting
    batch: 'living like the beloved prophet ﷺ',
    synopsis: 'Focusing on the Fiqh-us-Seerah.',
    timeline: 'TBD',
    sessions: 'TBD',
    duration: 'TBD',
    time: 'TBD',
    enrollment: 'TBD',
    enrollmentFee: 'TBD',
    fee: 'TBD',
    color: 'green',
    speaker: 'Sadia Nouman',
    location: 'Inside the Lounge',
    category: 'seerah',
    orientationDate: '2026-08-15',
    sessionDates: [],
    createdAt: 1718880000000,
  },
  {
    id: 'module-3',
    status: 'past',
    title: 'Dowra e Quran',
    tag: 'An intensive study through the entire Quran',
    batch: 'Islamic Year ١٤٤٧.ھ',
    synopsis: 'An intensive study through the entire Quran, understanding brief meanings and overarching themes of every Surah with Khalid Mehmood Abbasi.',
    timeline: 'Ramadhan 2026',
    sessions: 'N/A',
    duration: 'Whole Month',
    time: 'Whole Day',
    enrollment: 'Closed',
    enrollmentFee: 'N/A',
    fee: 'N/A',
    color: 'blue',
    speaker: 'Khalid Mehmood Abbasi',
    location: 'Inside the Lounge',
    category: 'dowra',
    orientationDate: '2026-03-01',
    sessionDates: [],
    createdAt: 1718890000000,
  }
];

export const moduleService = {
  async getModules(): Promise<LoungeModule[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const dbModules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoungeModule));
      if (dbModules.length === 0) {
        if (localStorage.getItem('modules_seeded') !== 'true') {
          try {
            for (const mod of fallbackModules) {
              await setDoc(doc(db, COLLECTION_NAME, mod.id), mod);
            }
            localStorage.setItem('modules_seeded', 'true');
            return fallbackModules;
          } catch (seedError) {
            console.warn('Failed to seed fallback modules:', seedError);
            return fallbackModules;
          }
        }
        return [];
      }
      // Re-order to have ongoing/upcoming first if desired, or keep createdOrder
      return dbModules.sort((a, b) => {
        // Sort by status: ongoing, then upcoming, then past, then createdAt
        const statusOrder = { ongoing: 0, upcoming: 1, past: 2 };
        const orderA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 9;
        const orderB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 9;
        if (orderA !== orderB) return orderA - orderB;
        return b.createdAt - a.createdAt;
      });
    } catch (e) {
      console.warn('Firestore failed to fetch modules, falling back to static data:', e);
      return fallbackModules;
    }
  },

  subscribeToModules(callback: (modules: LoungeModule[]) => void): () => void {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    return onSnapshot(q, async (snapshot) => {
      let dbModules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoungeModule));
      if (dbModules.length === 0) {
        if (localStorage.getItem('modules_seeded') !== 'true') {
          try {
            for (const mod of fallbackModules) {
              await setDoc(doc(db, COLLECTION_NAME, mod.id), mod);
            }
            localStorage.setItem('modules_seeded', 'true');
            dbModules = [...fallbackModules];
          } catch (seedError) {
            console.warn('Failed to seed fallback modules:', seedError);
            dbModules = [...fallbackModules];
          }
        }
      }
      
      const sorted = dbModules.sort((a, b) => {
        const statusOrder = { ongoing: 0, upcoming: 1, past: 2 };
        const orderA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 9;
        const orderB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 9;
        if (orderA !== orderB) return orderA - orderB;
        return b.createdAt - a.createdAt;
      });
      callback(sorted);
    }, (error) => {
      console.warn("Firestore live query failed, returning fallback modules:", error);
      callback(fallbackModules);
    });
  },

  async addModule(mod: Omit<LoungeModule, 'id'>): Promise<string> {
    const newDocRef = doc(collection(db, COLLECTION_NAME));
    const newModule = { ...mod, id: newDocRef.id };
    await setDoc(newDocRef, sanitizeFirestoreData(newModule));
    return newDocRef.id;
  },

  async updateModule(id: string, mod: Partial<Omit<LoungeModule, 'id'>>): Promise<void> {
    await setDoc(doc(db, COLLECTION_NAME, id), sanitizeFirestoreData(mod), { merge: true });
  },

  async deleteModule(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};
