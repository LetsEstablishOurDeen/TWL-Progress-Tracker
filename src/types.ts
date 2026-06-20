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
    author?: string;
    createdAt: string;
    estimatedDuration?: string;
    location?: 'lounge' | 'personal';
    isLoungeModule?: boolean;
    sessionAttendance?: Record<string, 'attended' | 'missed'>;
    isResearchPaper?: boolean;
  }[];
  completedTafsirModule?: boolean;
  completedSeerahModule?: boolean;
  completedDawraEQuran?: boolean;
  completedArticlesModule?: boolean;
  isProfilePublic?: boolean;
  librarySubmissionsCount?: number;
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
  isLibrarySubmission?: boolean;
  moduleId?: string;
  details: {
    title?: string;
    author?: string;
    completedAt?: string;
    duration?: string;
    count?: number;
    description?: string;
    estimatedDuration?: string;
    location?: 'lounge' | 'personal';
    isLoungeModule?: boolean;
    community?: string;
    link?: string;
    hasFile?: boolean;
    fileLink?: string;
    documentOverview?: string;
    overview?: string;
    isResearchPaper?: boolean;
    isOnline?: boolean;
    source?: string;
    ustadName?: string;
    communityName?: string;
    subject?: string;
    objective?: string;
    materialOwnership?: 'own' | 'someone_else';
    language?: string;
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
