export interface Learner {
  id: string; // Phone number
  fullName: string;
  password?: string;
  isApproved: boolean;
  booksCompleted: string[];
  presentationsGiven: string[];
  tasksCompleted: number;
  joinedAt: string;
}
