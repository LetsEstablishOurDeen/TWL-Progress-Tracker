import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  onSnapshot,
  orderBy,
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FocusReminder } from '../types';

export const REMINDERS_COLLECTION = 'focus_reminders';

function handleFirestoreError(error: unknown, operation: string, path: string) {
  console.error(`Firestore Error during ${operation} at ${path}:`, error);
  throw error;
}

export const reminderService = {
  // Subscribe to all reminders (typically for admin)
  subscribeToAllReminders(callback: (reminders: FocusReminder[]) => void) {
    const q = query(
      collection(db, REMINDERS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const reminders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FocusReminder[];
      callback(reminders);
    }, (error) => {
      handleFirestoreError(error, 'subscribeToAll', REMINDERS_COLLECTION);
    });
  },

  // Subscribe to reminders for a single learner
  subscribeToLearnerReminders(learnerId: string, callback: (reminders: FocusReminder[]) => void) {
    const q = query(
      collection(db, REMINDERS_COLLECTION),
      where('learnerId', '==', learnerId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const reminders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FocusReminder[];
      callback(reminders);
    }, (error) => {
      handleFirestoreError(error, 'subscribeToLearner', REMINDERS_COLLECTION);
    });
  },

  // Add a new reminder
  async addReminder(reminder: Omit<FocusReminder, 'id'>) {
    try {
      const colRef = collection(db, REMINDERS_COLLECTION);
      return await addDoc(colRef, reminder);
    } catch (error) {
      handleFirestoreError(error, 'addReminder', REMINDERS_COLLECTION);
    }
  },

  // Submit learner response to a reminder
  async respondToReminder(
    reminderId: string, 
    responseType: 'on_track' | 'completed' | 'rescheduled' | 'struggling',
    responseText: string,
    newTargetDate?: string
  ) {
    try {
      const docRef = doc(db, REMINDERS_COLLECTION, reminderId);
      const updates: Partial<FocusReminder> = {
        status: 'answered',
        responseType,
        responseText,
        respondedAt: new Date().toISOString(),
        adminRead: false, // Set to false so admin gets a fresh notification alert
        learnerRead: true
      };
      if (newTargetDate) {
        updates.newTargetDate = newTargetDate;
      }
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, 'respondToReminder', `${REMINDERS_COLLECTION}/${reminderId}`);
    }
  },

  // Mark reminder as read (by learner or admin)
  async markAsRead(reminderId: string, observer: 'learner' | 'admin') {
    try {
      const docRef = doc(db, REMINDERS_COLLECTION, reminderId);
      const updates = observer === 'admin' ? { adminRead: true } : { learnerRead: true };
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, 'markAsRead', `${REMINDERS_COLLECTION}/${reminderId}`);
    }
  },

  // Delete a reminder
  async deleteReminder(reminderId: string) {
    try {
      const docRef = doc(db, REMINDERS_COLLECTION, reminderId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, 'deleteReminder', `${REMINDERS_COLLECTION}/${reminderId}`);
    }
  },

  // Dynamic automatic engine: triggers reminders/questions for a learner's active focuses
  async checkAndGenerateReminders(learnerId: string, learnerName: string, activeFocuses: any[]) {
    if (!activeFocuses || activeFocuses.length === 0) return;

    try {
      // 1. Fetch existing reminders for this learner to avoid duplicates
      const q = query(
        collection(db, REMINDERS_COLLECTION),
        where('learnerId', '==', learnerId)
      );
      const querySnapshot = await getDocs(q);
      const existingReminders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FocusReminder[];

      const now = new Date();
      const todayString = now.toISOString().split('T')[0];

      for (const focus of activeFocuses) {
        if (!focus.estimatedDuration) continue;

        const targetDateStr = focus.estimatedDuration;
        const targetDate = new Date(targetDateStr);
        
        // Calculate days remaining to target date
        const diffTime = targetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 2a. Check if expected date is close (<= 3 days) -> Trigger deadline reminder
        if (diffDays <= 3) {
          // Check if we've already generated a 'deadline' reminder for this focus which was created within the last 5 days
          const hasRecentDeadline = existingReminders.some(r => 
            r.focusId === focus.id && 
            r.type === 'deadline' &&
            (now.getTime() - new Date(r.createdAt).getTime()) < 1000 * 60 * 60 * 24 * 5
          );

          if (!hasRecentDeadline) {
            let questionText = `Assalamu Alaikum! Your active focus on "${focus.title}" (${(focus.domain || 'focus').toUpperCase()}) is approaching its target completion date (${targetDateStr}). `;
            if (diffDays < 0) {
              questionText = `Assalamu Alaikum! Your active focus on "${focus.title}" was expected to be completed by ${targetDateStr}. `;
            }
            questionText += `How is your progress going? Let us know if you have completed the goal or need some help/extra time.`;

            await this.addReminder({
              learnerId,
              learnerName,
              focusId: focus.id,
              focusTitle: focus.title,
              focusDomain: focus.domain,
              targetDate: targetDateStr,
              createdAt: now.toISOString(),
              type: 'deadline',
              status: 'pending',
              questionText,
              adminRead: false,
              learnerRead: false
            });
          }
        }

        // 2b. Check if created > 7 days ago -> Trigger periodic gentle progress question (if no reminders in last 7 days)
        const focusCreatedAt = new Date(focus.createdAt || now.toISOString());
        const focusAgeDays = Math.ceil((now.getTime() - focusCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

        if (focusAgeDays >= 7) {
          // Check if any reminder (deadline or progress) has been sent for this focus in the last 7 days
          const hasRecentReminder = existingReminders.some(r => 
            r.focusId === focus.id && 
            (now.getTime() - new Date(r.createdAt).getTime()) < 1000 * 60 * 60 * 24 * 7
          );

          if (!hasRecentReminder) {
            let domainLabel = (focus.domain || 'focus').toUpperCase();
            let promptQuestion = `Dear Learner, you have been focused on "${focus.title}" (${domainLabel}) for over a week now. How has your experience been so far? Are you learning valuable insights? Tell us about your current status!`;

            await this.addReminder({
              learnerId,
              learnerName,
              focusId: focus.id,
              focusTitle: focus.title,
              focusDomain: focus.domain,
              targetDate: targetDateStr,
              createdAt: now.toISOString(),
              type: 'progress',
              status: 'pending',
              questionText: promptQuestion,
              adminRead: false,
              learnerRead: false
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to check and generate reminders:", error);
    }
  }
};
