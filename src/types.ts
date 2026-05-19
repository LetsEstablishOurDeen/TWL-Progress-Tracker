export interface Learner {
  id: string; // Phone number
  fullName: string;
  password?: string;
  isApproved: boolean;
  booksCompleted: string[];
  presentationsGiven: string[];
  tasksCompleted: number;
  joinedAt: string;
  enrolledModules?: string[];
  moduleStats?: Record<string, number>;
  moduleItems?: Record<string, string[]>;
}

export interface EditRequest {
  id: string;
  learnerId: string;
  learnerName: string;
  type: string;
  moduleId?: string;
  details: {
    title?: string;
    completedAt?: string;
    duration?: string;
    count?: number;
    description?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}
