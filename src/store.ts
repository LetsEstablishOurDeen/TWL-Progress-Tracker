import { useState, useEffect } from 'react';
import { Learner } from './types';
import { learnerService } from './services/learnerService';
import { logService } from './services/logService';

export function useLearners() {
  const [learners, setLearners] = useState<Learner[]>([]);

  useEffect(() => {
    learnerService.testConnection();
    const unsubscribe = learnerService.subscribeToLearners(setLearners);
    return () => unsubscribe();
  }, []);

  const addLearner = async (learner: Omit<Learner, 'joinedAt'>) => {
    await learnerService.addLearner(learner);
    await logService.addLog(
      learner.id,
      learner.fullName,
      'Register Profile',
      `New learner profile registered for "${learner.fullName}"`
    );
  };

  const approveLearner = async (id: string) => {
    const learner = learners.find(l => l.id === id);
    await learnerService.approveLearner(id);
    if (learner) {
      await logService.addLog(
        id,
        learner.fullName,
        'Approve Learner',
        `Admin approved learner profile for "${learner.fullName}"`
      );
    }
  };

  const removeLearner = async (id: string) => {
    const learner = learners.find(l => l.id === id);
    await learnerService.deleteLearner(id);
    if (learner) {
      await logService.addLog(
        id,
        learner.fullName,
        'Delete Learner',
        `Admin deleted learner profile for "${learner.fullName}"`
      );
    }
  };

  const updateLearner = async (id: string, updates: Partial<Learner>) => {
    const learner = learners.find(l => l.id === id);
    await learnerService.updateLearner(id, updates);
    if (learner) {
      if (updates.isPaused !== undefined) {
        const action = updates.isPaused ? 'Pause Learner' : 'Resume Learner';
        const msg = updates.isPaused 
          ? `Admin paused learner profile for "${learner.fullName}"`
          : `Admin resumed learner profile for "${learner.fullName}"`;
        await logService.addLog(id, learner.fullName, action, msg);
      } else {
        await logService.addLog(
          id,
          learner.fullName,
          'Update Profile',
          `Learner profile details updated for "${learner.fullName}"`
        );
      }
    }
  };

  return { learners, addLearner, approveLearner, removeLearner, updateLearner };
}
