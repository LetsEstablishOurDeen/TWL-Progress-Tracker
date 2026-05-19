import { useState, useEffect } from 'react';
import { Learner } from './types';
import { learnerService } from './services/learnerService';

export function useLearners() {
  const [learners, setLearners] = useState<Learner[]>([]);

  useEffect(() => {
    learnerService.testConnection();
    const unsubscribe = learnerService.subscribeToLearners(setLearners);
    return () => unsubscribe();
  }, []);

  const addLearner = async (learner: Omit<Learner, 'joinedAt'>) => {
    await learnerService.addLearner(learner);
  };

  const approveLearner = async (id: string) => {
    await learnerService.approveLearner(id);
  };

  const removeLearner = async (id: string) => {
    await learnerService.deleteLearner(id);
  };

  const updateLearner = async (id: string, updates: Partial<Learner>) => {
    await learnerService.updateLearner(id, updates);
  };

  return { learners, addLearner, approveLearner, removeLearner, updateLearner };
}
