import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../lib/firebase';
import { LogEntry } from '../types';

const LOGS_COLLECTION = 'learner_logs';

export const logService = {
  /**
   * Add a new log entry to the database
   */
  async addLog(learnerId: string, learnerName: string, action: string, details: string) {
    try {
      const logData = {
        learnerId,
        learnerName,
        action,
        details,
        timestamp: new Date().toISOString()
      };
      
      const sanitized = sanitizeFirestoreData(logData);
      await addDoc(collection(db, LOGS_COLLECTION), sanitized);
    } catch (error) {
      console.error('Error adding learner log:', error);
    }
  },

  /**
   * Subscribe to the latest log entries in real-time
   */
  subscribeToLogs(callback: (logs: LogEntry[]) => void, maxCount: number = 300) {
    const q = query(
      collection(db, LOGS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(maxCount)
    );

    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as LogEntry[];
      callback(logs);
    }, (error) => {
      console.warn('Firestore subscription notice for learner logs:', error);
    });
  }
};
