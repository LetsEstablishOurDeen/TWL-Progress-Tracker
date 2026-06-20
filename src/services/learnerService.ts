import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  getDocFromServer,
  addDoc,
  runTransaction
} from 'firebase/firestore';
import { db, auth, sanitizeFirestoreData } from '../lib/firebase';
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
      const payload = sanitizeFirestoreData({ 
        ...learner, 
        joinedAt,
        moduleStats: {},
        moduleItems: {}
      });
      await setDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error);
    }
  },

  async updateLearnerWithTransaction(id: string, updateFn: (learner: Learner) => Partial<Learner>) {
    const docRef = doc(db, LEARNERS_COLLECTION, id);
    try {
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists()) {
          throw new Error("Learner does not exist!");
        }
        const currentData = docSnap.data() as Learner;
        const updates = updateFn(currentData);
        if (updates && Object.keys(updates).length > 0) {
          const sanitizedUpdates = sanitizeFirestoreData(updates);
          transaction.update(docRef, sanitizedUpdates);
        }
      });
    } catch (error) {
      handleFirestoreError(error);
    }
  },

  async updateLearner(id: string, updates: Partial<Learner>) {
    const docRef = doc(db, LEARNERS_COLLECTION, id);
    try {
      const sanitizedUpdates = sanitizeFirestoreData(updates);
      await updateDoc(docRef, sanitizedUpdates);
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
      // Clean up requests
      try {
        const { requestService } = await import('./requestService');
        await requestService.deleteRequestsByLearnerId(id);
      } catch (err) {
        console.error("Failed to clean up requests for deleted learner:", err);
      }
      // Clean up reminders
      try {
        const { reminderService } = await import('./reminderService');
        await reminderService.deleteRemindersByLearnerId(id);
      } catch (err) {
        console.error("Failed to clean up reminders for deleted learner:", err);
      }
    } catch (error) {
      handleFirestoreError(error);
    }
  },

  async seedDefaultLearners() {
    const list = [
      {
        id: "923001234501",
        fullName: "Abdullah Omar",
        phoneNumber: "+92 300 1234501",
        password: "password123",
        isApproved: true,
        booksCompleted: ["Sahih Bukhari", "Riyadh as-Salihin"],
        presentationsGiven: ["Introduction to Seerah"],
        tasksCompleted: 14,
        moduleStats: { dowra: 90, tafsir: 80, seerah: 95, articles: 70 },
        moduleItems: { dowra: ["Dowra e Quran Lesson 1-5"], tafsir: ["Surah Nisaa Session 1"] },
        currentFocuses: [
          {
            id: "focus-1",
            domain: "books",
            title: "Study Muwatta Imam Malik",
            createdAt: "2026-05-20T08:00:00.000Z",
            estimatedDuration: "2026-06-15",
            location: "lounge"
          }
        ]
      },
      {
        id: "923001234502",
        fullName: "Ayesha Siddiqua",
        phoneNumber: "+92 300 1234502",
        password: "password123",
        isApproved: true,
        booksCompleted: ["Riyadh as-Salihin"],
        presentationsGiven: ["Women in Early Islamic History"],
        tasksCompleted: 8,
        moduleStats: { dowra: 75, tafsir: 65, articles: 80 },
        moduleItems: { articles: ["Read Islamic Jurisprudence Article"] },
        currentFocuses: [
          {
            id: "focus-2",
            domain: "presentations",
            title: "Delivering Tafsir Insights on Surah Nisaa",
            createdAt: "2026-05-28T09:00:00.000Z",
            estimatedDuration: "2026-06-05",
            location: "personal"
          }
        ]
      },
      {
        id: "923001234503",
        fullName: "Hamza Farooq",
        phoneNumber: "+92 300 1234503",
        password: "password123",
        isApproved: false,
        booksCompleted: [],
        presentationsGiven: [],
        tasksCompleted: 0,
        moduleStats: {},
        moduleItems: {},
        currentFocuses: []
      }
    ];

    try {
      for (const item of list) {
        await setDoc(doc(db, LEARNERS_COLLECTION, item.id), {
          ...item,
          joinedAt: new Date().toISOString()
        });
      }

      // Also populate a few sample requests and reminders to keep the app highly engaging!
      const { REQUESTS_COLLECTION, getFolderName } = await import('./requestService');
      const reqs = [
        {
          learnerId: "923001234501",
          learnerName: "Abdullah Omar",
          type: "book",
          details: { title: "Riyadh as-Salihin", completedAt: new Date().toISOString(), description: "Completed study of all chapters in Riyadh as-Salihin." },
          status: "approved",
          requestedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
        },
        {
          learnerId: "923001234501",
          learnerName: "Abdullah Omar",
          type: "presentation",
          details: { title: "Spiritual Disciplines", completedAt: new Date().toISOString(), description: "Presented on the daily life of early Muslim scholars." },
          status: "approved",
          requestedAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
        },
        {
          learnerId: "923001234502",
          learnerName: "Ayesha Siddiqua",
          type: "task",
          details: { title: "Recitation Practice", completedAt: new Date().toISOString(), description: "Completed 3 recitation drills this week.", count: 3 },
          status: "approved",
          requestedAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
        }
      ];

      for (const r of reqs) {
        const folder = getFolderName(r.learnerName);
        await addDoc(collection(db, REQUESTS_COLLECTION, folder, 'requests'), r);
      }

      const { REMINDERS_COLLECTION } = await import('./reminderService');
      const rems = [
        {
          learnerId: "923001234501",
          learnerName: "Abdullah Omar",
          focusId: "focus-1",
          focusTitle: "Study Muwatta Imam Malik",
          focusDomain: "books",
          targetDate: "2026-06-15",
          createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
          type: "deadline",
          status: "pending",
          questionText: "Assalamu Alaikum! Your active focus on 'Study Muwatta Imam Malik' is approaching its target completion date. How is your progress going?",
          adminRead: false,
          learnerRead: false
        }
      ];

      for (const rem of rems) {
        await addDoc(collection(db, REMINDERS_COLLECTION), rem);
      }
    } catch (err) {
      console.error("Error seeding initial data:", err);
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