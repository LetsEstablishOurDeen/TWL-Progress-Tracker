export interface Learner {
  id: string; // Phone number
  fullName: string;
  phoneNumber?: string; // Phone number registered with TWL
  password?: string;
  isApproved: boolean;
  booksCompleted: string[];
  presentationsGiven: string[];
  tasksCompleted: number;
  joinedAt: string;
  enrolledModules?: string[];
  moduleStats?: Record<string, number>;
  moduleItems?: Record<string, string[]>;
  currentFocuses?: {
    id: string;
    domain: string;
    title: string;
    createdAt: string;
    estimatedDuration?: string;
    location?: 'lounge' | 'personal';
  }[];
  completedTafsirModule?: boolean;
  completedSeerahModule?: boolean;
  completedDawraEQuran?: boolean;
  completedArticlesModule?: boolean;
}

export interface StatusTier {
  id: string;
  name: string;
  requiredBadges: number;
  perks: string[];
}

export interface EditRequest {
  id: string;
  learnerId: string;
  learnerName: string;
  type: string;
  isFocus?: boolean;
  moduleId?: string;
  details: {
    title?: string;
    completedAt?: string;
    duration?: string;
    count?: number;
    description?: string;
    estimatedDuration?: string;
    location?: 'lounge' | 'personal';
  };
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface FocusReminder {
  id: string;
  learnerId: string;
  learnerName: string;
  focusId: string;
  focusTitle: string;
  focusDomain: string;
  targetDate: string;
  createdAt: string;
  type: 'deadline' | 'progress';
  status: 'pending' | 'answered';
  questionText: string;
  responseText?: string;
  responseType?: 'on_track' | 'completed' | 'rescheduled' | 'struggling';
  newTargetDate?: string;
  respondedAt?: string;
  adminRead: boolean;
  learnerRead: boolean;
}
