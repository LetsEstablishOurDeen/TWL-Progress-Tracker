export interface Learner {
  id: string; // Phone number
  fullName: string;
  phoneNumber?: string; // Phone number registered with TWL
  password?: string;
  isApproved: boolean;
  isPaused?: boolean;
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
    moduleId?: string;
    sessionAttendance?: Record<string, 'attended' | 'missed'>;
    isResearchPaper?: boolean;
    isSeries?: boolean;
    seriesCount?: number;
    seriesArticleTitles?: string;
    bookSubmissionMethod?: 'overview' | 'written';
    presentationTargetDate?: string;
    totalPages?: number;
    averagePagesPerDay?: number;
  }[];
  completedTafsirModule?: boolean;
  completedSeerahModule?: boolean;
  completedDawraEQuran?: boolean;
  completedArticlesModule?: boolean;
  isProfilePublic?: boolean;
  librarySubmissionsCount?: number;
  bucketList?: {
    id: string;
    domain: string; // 'book', 'presentation', 'task', etc.
    title: string;
    author?: string;
    notes?: string;
    createdAt: string;
  }[];
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
    moduleId?: string;
    circleId?: string;
    circleTitle?: string;
    community?: string;
    link?: string;
    hasFile?: boolean;
    fileLink?: string;
    documentOverview?: string;
    overview?: string;
    isResearchPaper?: boolean;
    isSeries?: boolean;
    seriesCount?: number;
    seriesArticleTitles?: string;
    isOnline?: boolean;
    source?: string;
    ustadName?: string;
    communityName?: string;
    subject?: string;
    objective?: string;
    materialOwnership?: 'own' | 'someone_else';
    language?: string;
    submissionMethod?: 'overview' | 'written';
    bookSubmissionMethod?: 'overview' | 'written';
    presentationTargetDate?: string;
    totalPages?: number;
    averagePagesPerDay?: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
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
  type: 'deadline' | 'progress' | 'abandon';
  status: 'pending' | 'answered' | 'declined';
  adminMessage?: string;
  questionText: string;
  responseText?: string;
  responseType?: 'on_track' | 'completed' | 'rescheduled' | 'struggling' | 'abandoned';
  newTargetDate?: string;
  respondedAt?: string;
  adminRead: boolean;
  learnerRead: boolean;
}

export interface LogEntry {
  id: string;
  learnerId: string;
  learnerName: string;
  action: string;
  details: string;
  timestamp: string;
}

