import { Learner } from './types';
import { APP_DOMAINS } from './constants';

export const getDomainValue = (learner: Learner, type: string) => {
  if (type === 'book') return learner.booksCompleted?.length || 0;
  if (type === 'presentation') return learner.presentationsGiven?.length || 0;
  if (type === 'task') return learner.tasksCompleted || 0;
  
  // Handle module-based domains
  const domain = APP_DOMAINS.find(d => d.type === type);
  if (domain) {
    let total = learner.moduleStats?.[domain.id] || 0;
    if ('subOptions' in domain && domain.subOptions) {
      (domain.subOptions as any[]).forEach((sub: any) => {
        total += learner.moduleStats?.[sub.id] || 0;
      });
    }
    return total;
  }
  
  return 0;
};

export const getDomainMultiplier = (type: string) => {
  if (type === 'book') return 5;
  if (type === 'presentation') return 10;
  if (type === 'task') return 1;
  return 2; // Every other module gives 2 points per completed task
};

export const getOverallPoints = (learner: Learner) => {
  let pts = 0;
  APP_DOMAINS.forEach(d => {
    pts += getDomainValue(learner, d.type) * getDomainMultiplier(d.type);
  });
  return pts;
};
