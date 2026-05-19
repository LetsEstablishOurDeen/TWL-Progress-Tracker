import { Learner } from '../types';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export function getLearnerBadges(learner: Learner): Badge[] {
  const badges: Badge[] = [];
  const books = learner.booksCompleted.length;
  const presentations = learner.presentationsGiven.length;
  const tasks = learner.tasksCompleted;

  if (books >= 1) {
    badges.push({ id: 'scholar', name: 'Scholar', description: 'Completed first book', icon: '📖' });
  }
  if (books >= 5) {
    badges.push({ id: 'avid_reader', name: 'Avid Reader', description: 'Completed 5 books', icon: '📚' });
  }
  if (books >= 10) {
    badges.push({ id: 'bibliophile', name: 'Bibliophile', description: 'Completed 10 books', icon: '🏛️' });
  }

  if (presentations >= 1) {
    badges.push({ id: 'speaker', name: 'Speaker', description: 'Gave a presentation', icon: '🗣️' });
  }
  if (presentations >= 3) {
    badges.push({ id: 'orator', name: 'Orator', description: 'Gave 3 presentations', icon: '🎙️' });
  }
  if (presentations >= 5) {
    badges.push({ id: 'thought_leader', name: 'Thought Leader', description: 'Gave 5 presentations', icon: '🌟' });
  }

  if (tasks >= 5) {
    badges.push({ id: 'doer', name: 'Doer', description: 'Completed 5 tasks', icon: '✅' });
  }
  if (tasks >= 20) {
    badges.push({ id: 'achiever', name: 'Achiever', description: 'Completed 20 tasks', icon: '🚀' });
  }
  if (tasks >= 50) {
    badges.push({ id: 'taskmaster', name: 'Taskmaster', description: 'Completed 50 tasks', icon: '👑' });
  }

  return badges;
}
