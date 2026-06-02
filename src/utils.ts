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
    
    if (type === 'dowra' && learner.completedDawraEQuran && total === 0) total = 1;
    if (type === 'tafsir' && learner.completedTafsirModule && total === 0) total = 1;
    if (type === 'seerah' && learner.completedSeerahModule && total === 0) total = 1;
    if (type === 'articles' && learner.completedArticlesModule && total === 0) total = 1;
    
    if ('subOptions' in domain && domain.subOptions) {
      (domain.subOptions as unknown as any[]).forEach((sub: any) => {
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
  return 2; // Default multiplier
};

export const getModulePoints = (learner: Learner, type: string) => {
  const count = getDomainValue(learner, type);
  if (count <= 0) return 0;
  
  // For repeating modules (Tafsir and Dowra), offer increasing points for successive completions
  if (type === 'tafsir' || type === 'dowra') {
    let pts = 0;
    for (let i = 1; i <= count; i++) {
      if (i === 1) pts += 15;        // 1st completion gives 15 points
      else if (i === 2) pts += 25;   // 2nd completion gives 25 points
      else if (i === 3) pts += 45;   // 3rd completion gives 45 points
      else pts += 70;                // 4th+ completion gives 70 points each
    }
    return pts;
  }
  
  if (type === 'seerah' || type === 'articles') {
    return count * 15;
  }
  
  return count * getDomainMultiplier(type);
};

export const getOverallPoints = (learner: Learner) => {
  let pts = 0;
  APP_DOMAINS.forEach(d => {
    pts += getModulePoints(learner, d.type);
  });
  
  if (learner.currentFocuses) {
    // 2 points per active focus for initiative
    pts += learner.currentFocuses.length * 2;
  }
  
  return pts;
};
