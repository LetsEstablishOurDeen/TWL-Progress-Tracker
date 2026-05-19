import { Learner } from '../types';

const LEARNERS_KEY = 'wisdom_lounge_learners';

function getLearners(): Learner[] {
  const data = localStorage.getItem(LEARNERS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLearners(learners: Learner[]) {
  localStorage.setItem(LEARNERS_KEY, JSON.stringify(learners));
}

// Simple event target to simulate real-time updates
export const learnerEvents = new EventTarget();

export const learnerService = {
  subscribeToLearners(callback: (learners: Learner[]) => void) {
    // Initial call
    callback(getLearners());
    
    // Listener for changes within the same tab
    const listener = () => callback(getLearners());
    learnerEvents.addEventListener('learners_changed', listener);
    
    // Listener for cross-tab changes
    const storageListener = (e: StorageEvent) => {
      if (e.key === LEARNERS_KEY) {
        callback(getLearners());
      }
    };
    window.addEventListener('storage', storageListener);
    
    return () => {
      learnerEvents.removeEventListener('learners_changed', listener);
      window.removeEventListener('storage', storageListener);
    };
  },

  async addLearner(learner: Omit<Learner, 'joinedAt'>) {
    const learners = getLearners();
    if (learners.find(l => l.id === learner.id)) {
      throw new Error("Learner already exists");
    }
    const newLearner: Learner = {
      ...learner,
      joinedAt: new Date().toISOString(),
      moduleStats: {},
      moduleItems: {}
    };
    learners.push(newLearner);
    saveLearners(learners);
    learnerEvents.dispatchEvent(new Event('learners_changed'));
  },

  async updateLearner(id: string, updates: Partial<Learner>) {
    const learners = getLearners();
    const index = learners.findIndex(l => l.id === id);
    if (index === -1) throw new Error("Learner not found");
    
    learners[index] = { ...learners[index], ...updates };
    saveLearners(learners);
    learnerEvents.dispatchEvent(new Event('learners_changed'));
  },

  async approveLearner(id: string) {
    return this.updateLearner(id, { isApproved: true });
  },

  async deleteLearner(id: string) {
    let learners = getLearners();
    learners = learners.filter(l => l.id !== id);
    saveLearners(learners);
    learnerEvents.dispatchEvent(new Event('learners_changed'));
  },
  
  async testConnection() {
    console.log("Local storage connected successfully.");
  }
};

