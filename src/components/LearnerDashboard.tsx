import { useState, FormEvent, ReactNode, useMemo, useEffect, useRef } from 'react';
import { Learner, EditRequest, FocusReminder } from '../types';
import { 
  BookOpen, Mic, CheckCircle2, Search, Medal, Eye, EyeOff, 
  LayoutDashboard, BarChart3, Plus, X, Clock, Send, Info, Lock,
  Bell, Calendar, HelpCircle, Flame, Activity, Sparkles, Volume2, Settings,
  ChevronLeft, ChevronRight, Trophy, MessageSquare, Upload, ArrowRight, Users, Check, Trash2,
  AlertTriangle, TrendingDown, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLearnerBadges, ALL_BADGES } from '../lib/badges';
import { getLearnerStatus, getStatusProgress, getBannerBgStyle } from '../lib/status';
import { requestService } from '../services/requestService';
import { reminderService } from '../services/reminderService';
import { notificationService, AppNotification, playNotificationSound } from '../services/notificationService';
import { authService } from '../lib/auth';
import { MODULES, APP_DOMAINS, SUBJECTS } from '../constants';
import { getOverallPoints, getDomainValue, toTitleCase, formatDateDDMMYYYY, displayToNativeDate, nativeToDisplayDate, formatDateFull, isTargetDateExceeded } from '../utils';
import { messageService } from '../services/messageService';
import { ChatWidget } from './Messaging';
import { circleService, LoungeCircle } from '../services/circleService';
import { moduleService, LoungeModule } from '../services/moduleService';
import { CelebrationCardModal, CelebrationCardData } from './CelebrationCardModal';

import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

// Safely aggregates module items including sub-options
const getModuleItems = (learner: any, mod: any) => {
  let items = learner.moduleItems?.[mod.id] || [];
  
  if (mod.type === 'dowra' && learner.completedDawraEQuran && items.length === 0) items = ['Dowra e Quran (Completed)'];
  if (mod.type === 'tafsir' && learner.completedTafsirModule && items.length === 0) items = ['Tafsir Module (Completed)'];
  if (mod.type === 'seerah' && learner.completedSeerahModule && items.length === 0) items = ['Seerah Module (Completed)'];
  if (mod.type === 'research papers/article' && learner.completedArticlesModule && items.length === 0) items = ['research papers/article (Completed)'];

  if ('subOptions' in mod && mod.subOptions) {
    (mod.subOptions as any[]).forEach((sub: any) => {
      items = [...items, ...(learner.moduleItems?.[sub.id] || [])];
    });
  }
  return items;
};

const getDomainItems = (learner: any, type: string) => {
  if (type === 'book') return learner.booksCompleted || [];
  if (type === 'presentation') return learner.presentationsGiven || [];
  
  // Handle module-based domains
  const domain = APP_DOMAINS.find(d => d.type === type);
  if (domain) {
    return getModuleItems(learner, domain);
  }
  
  return []; 
};

const getModuleDisplayAndBatch = (focusTitle: string) => {
  const t = focusTitle ? focusTitle.toLowerCase().trim() : '';
  if (t === 'the exegesis of the noble quran' || t === 'surah nisaa' || t === 'tafsir') {
    return {
      displayTitle: 'Tafsir',
      batchName: 'Surah Nisaa'
    };
  }
  if (t === 'the legacy of the beloved ﷺ' || t === 'living like the beloved prophet_ﷺ' || t === 'living like the beloved prophet ﷺ' || t === 'living like the beloved prophet' || t === 'seerah') {
    return {
      displayTitle: 'Seerah',
      batchName: 'living like the beloved prophet ﷺ'
    };
  }
  if (t === 'dowra e quran' || t === 'islamic year ١٤٤٧.ھ' || t === 'dowra') {
    return {
      displayTitle: 'Dowra e Quran',
      batchName: 'Islamic Year ١٤٤٧.ھ'
    };
  }
  return {
    displayTitle: focusTitle,
    batchName: null
  };
};

export function LearnerDashboard({ 
  learners, 
  onRegister,
  activeLearner,
  setActiveLearner,
  pendingEnrollment,
  clearPendingEnrollment,
  onNavigateToCircles,
  isAdmin = false
}: { 
  learners: Learner[], 
  onRegister: (data: Omit<Learner, 'joinedAt'>) => void,
  activeLearner: Learner | null,
  setActiveLearner: (learner: Learner | null) => void,
  pendingEnrollment?: { title: string, category: string, duration?: string, speaker?: string, targetDomain?: string } | null,
  clearPendingEnrollment?: () => void,
  onNavigateToCircles?: () => void,
  isAdmin?: boolean
}) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [searchTerm, setSearchTerm] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration specific state
  const [regName, setRegName] = useState('');
  const [regId, setRegId] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [submissionMethod, setSubmissionMethod] = useState<'overview' | 'written' | null>(null);
  const [requestPresentationTargetDate, setRequestPresentationTargetDate] = useState('');
  const [requestType, setRequestType] = useState<EditRequest['type']>(APP_DOMAINS[0]?.type || 'book');
  
  const [pendingRequests, setPendingRequests] = useState<EditRequest[]>([]);
  const [reminders, setReminders] = useState<FocusReminder[]>([]);
  const [allLearnerRequests, setAllLearnerRequests] = useState<EditRequest[]>([]);
  const [allApprovedSubjects, setAllApprovedSubjects] = useState<string[]>([]);

  // Celebration Card Modal state
  const [isCelebrationCardOpen, setIsCelebrationCardOpen] = useState(false);
  const [celebrationCardData, setCelebrationCardData] = useState<CelebrationCardData | undefined>(undefined);

  // Reminder Response State
  const [activeReplyReminderId, setActiveReplyReminderId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyDate, setReplyDate] = useState('');
  const [replyType, setReplyType] = useState<'text' | 'date' | null>(null);
  const [isReminderSubmitting, setIsReminderSubmitting] = useState(false);

  // Tracker Modal State
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [selectedFocusTracker, setSelectedFocusTracker] = useState<any>(null);
  const [trackerMonth, setTrackerMonth] = useState(new Date());
  const [loungeModules, setLoungeModules] = useState<LoungeModule[]>([]);

  // Bucket List States
  const [isBucketModalOpen, setIsBucketModalOpen] = useState(false);
  const [bucketItemTitle, setBucketItemTitle] = useState('');
  const [bucketItemAuthor, setBucketItemAuthor] = useState('');
  const [bucketItemDomain, setBucketItemDomain] = useState('book');
  const [bucketItemNotes, setBucketItemNotes] = useState('');
  const [isBucketSubmitting, setIsBucketSubmitting] = useState(false);
  const [activeBucketItemToRemoveId, setActiveBucketItemToRemoveId] = useState<string | null>(null);

  const [bucketIsFromLibrary, setBucketIsFromLibrary] = useState(true);
  const [bucketLibrarySearch, setBucketLibrarySearch] = useState('');
  const [selectedLibraryBook, setSelectedLibraryBook] = useState<any | null>(null);
  const [allPlatformRequests, setAllPlatformRequests] = useState<EditRequest[]>([]);
  const [driveFilesState, setDriveFilesState] = useState<any[]>([]);

  // Distinct parameters for other domains in bucket list
  const [bucketItemLink, setBucketItemLink] = useState('');
  const [bucketItemOverview, setBucketItemOverview] = useState('');
  const [bucketItemIsResearchPaper, setBucketItemIsResearchPaper] = useState(false);
  const [bucketItemIsSeries, setBucketItemIsSeries] = useState(false);
  const [bucketItemSeriesCount, setBucketItemSeriesCount] = useState(2);
  const [bucketItemSeriesTitles, setBucketItemSeriesTitles] = useState('');
  const [bucketItemIsOnline, setBucketItemIsOnline] = useState(false);
  const [bucketItemSource, setBucketItemSource] = useState('');
  const [bucketItemUstadName, setBucketItemUstadName] = useState('');
  const [bucketItemHasCommunity, setBucketItemHasCommunity] = useState(false);
  const [bucketItemCommunity, setBucketItemCommunity] = useState('');
  const [bucketItemSubject, setBucketItemSubject] = useState('');
  const [bucketItemObjective, setBucketItemObjective] = useState('');

  const currentFocusTracker = useMemo(() => {
    if (!selectedFocusTracker || !activeLearner) return null;
    return activeLearner.currentFocuses?.find(f => f.id === selectedFocusTracker.id) || selectedFocusTracker;
  }, [selectedFocusTracker, activeLearner]);

  const archiveBooks = useMemo(() => {
    // 1. Get approved book requests
    const bookRequests = allPlatformRequests.filter(r => r.status === 'approved' && (r.type === 'book' || r.isLibrarySubmission) && r.details?.title);
    const requestItems = bookRequests.map(req => ({
      id: req.id,
      title: toTitleCase(req.details?.title || 'Untitled Document'),
      author: toTitleCase(req.details?.author || req.details?.ustadName || req.details?.speaker || 'Unknown Author'),
      webViewLink: req.details?.fileLink || '',
      isFromDrive: false,
    }));

    // 2. Map drive files (category === 'books')
    const driveBooks = driveFilesState.filter(f => !f.driveCategory || f.driveCategory === 'books').map(file => {
      // Clean up file name
      let title = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ");
      title = toTitleCase(title);
      return {
        id: file.id,
        title: title,
        author: 'Unknown Author',
        webViewLink: file.webViewLink || file.webContentLink || '',
        isFromDrive: true,
      };
    });

    // 3. Combine and remove duplicates based on title (or link if matched)
    const combined = [...requestItems];
    
    const isMatchedByLink = (link1: string, link2: string) => {
      if (!link1 || !link2) return false;
      const extractId = (url: string) => {
        const match = url.match(/[-\w]{25,}/);
        return match ? match[0] : url;
      };
      try {
        const data = JSON.parse(link1);
        if (Array.isArray(data)) {
          return data.some((obj: any) => extractId(obj.link) === extractId(link2));
        }
      } catch {}
      if (link1.includes('|||')) {
        return link1.split('|||').some(p => extractId(p) === extractId(link2));
      }
      return extractId(link1) === extractId(link2);
    };

    driveBooks.forEach(db => {
      const alreadyHas = combined.some(ri => isMatchedByLink(ri.webViewLink, db.webViewLink) || ri.title.toLowerCase().trim() === db.title.toLowerCase().trim());
      if (!alreadyHas) {
        combined.push(db);
      }
    });

    // Sort alphabetically by title
    return combined.sort((a, b) => a.title.localeCompare(b.title));
  }, [allPlatformRequests, driveFilesState]);

  const archiveAuthors = useMemo(() => {
    const authorsSet = new Set<string>();
    
    // Default or common scholars to pre-populate
    const defaultScholars = [
      "Imam an-Nawawi",
      "Ibn Taymiyyah",
      "Ibn al-Qayyim",
      "Imam al-Ghazali",
      "Ibn Kathir",
      "Sheikh Bilal Ismail",
      "Dr. Yasir Qadhi",
      "Dr. Jonathan Brown"
    ];
    defaultScholars.forEach(a => authorsSet.add(a));

    allPlatformRequests.forEach(r => {
      if (r.status === 'approved') {
        const author = r.details?.author || r.details?.ustadName || r.details?.speaker;
        if (author) {
          authorsSet.add(toTitleCase(author));
        }
      }
    });

    return Array.from(authorsSet).sort();
  }, [allPlatformRequests]);

  const isBucketFormInvalid = useMemo(() => {
    if (bucketItemDomain === 'book') {
      if (bucketIsFromLibrary) {
        return !selectedLibraryBook;
      } else {
        return !bucketItemTitle.trim() || !bucketItemAuthor.trim();
      }
    } else if (bucketItemDomain === 'research papers/article') {
      if (bucketItemIsSeries && (!bucketItemSeriesCount || bucketItemSeriesCount < 2)) return true;
      return !bucketItemTitle.trim();
    } else if (bucketItemDomain === 'talaqqi') {
      return !bucketItemTitle.trim() || !bucketItemUstadName.trim() || (bucketItemIsOnline && !bucketItemSource.trim()) || (bucketItemHasCommunity && !bucketItemCommunity.trim());
    } else if (['tafsir', 'seerah', 'dowra'].includes(bucketItemDomain)) {
      return !bucketItemTitle.trim() || !bucketItemAuthor.trim() || (bucketItemHasCommunity && !bucketItemCommunity.trim());
    } else if (bucketItemDomain === 'task') {
      return !bucketItemTitle.trim();
    } else if (bucketItemDomain === 'presentation') {
      return !bucketItemTitle.trim();
    }
    return false;
  }, [
    bucketItemDomain,
    bucketIsFromLibrary,
    selectedLibraryBook,
    bucketItemTitle,
    bucketItemAuthor,
    bucketItemUstadName,
    bucketItemIsOnline,
    bucketItemSource,
    bucketItemHasCommunity,
    bucketItemCommunity
  ]);

  useEffect(() => {
    const unsubscribe = moduleService.subscribeToModules(setLoungeModules);
    return () => unsubscribe();
  }, []);

  const [devicePermission, setDevicePermission] = useState<NotificationPermission>('default');
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [badgeCategoryFilter, setBadgeCategoryFilter] = useState<string>('All');
  const [showPastReminders, setShowPastReminders] = useState(false);
  const remindersScrollRef = useRef<HTMLDivElement>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Load Google Drive files when bucket list modal is opened
  useEffect(() => {
    if (isBucketModalOpen) {
      const loadDriveFiles = async () => {
        try {
          const { driveService } = await import('../services/driveService');
          const token = await driveService.getAuthToken();
          if (token) {
            const files = await driveService.listFiles();
            setDriveFilesState(files || []);
          }
        } catch (err) {
          console.warn("Could not fetch drive files in bucket list:", err);
        }
      };
      loadDriveFiles();
    }
  }, [isBucketModalOpen]);

  useEffect(() => {
    if (!activeLearner) return;
    const unsub = messageService.subscribeToUnreadLearnerMessages(activeLearner.id, (count: number) => {
      setUnreadMessages(count);
    });
    return () => unsub();
  }, [activeLearner?.id]);

  // Sync permissions and subscribe to new notifications (for in-app toasts & audio)
  useEffect(() => {
    // Reset snap states whenever learner changes to guarantee correct triggers
    notificationService.resetState();

    const unsubPermission = notificationService.subscribeToPermission((permission) => {
      setDevicePermission(permission);
    });

    const unsubNotifications = notificationService.subscribeToNotifications((notification) => {
      setActiveToast(notification);
    });

    return () => {
      unsubPermission();
      unsubNotifications();
    };
  }, [activeLearner?.id]);

  // Auto-dismiss handler for toasts
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  // Auto-reset sub-tab if permission is not active
  useEffect(() => {
    if (devicePermission !== 'granted') {
      setActiveSubTab('dashboard');
    }
  }, [devicePermission]);

  const handleReminderResponse = async (
    reminder: FocusReminder, 
    type: 'on_track' | 'completed' | 'rescheduled' | 'struggling',
    customText?: string,
    newDate?: string
  ) => {
    if (!activeLearner) return;
    setIsReminderSubmitting(true);
    try {
      let text = '';
      if (type === 'on_track') {
        text = 'Alhamdulillah, I am fully on track with this learning focus!';
      } else if (type === 'completed') {
        text = 'I have successfully finished this focus, submitting for approval.';
        setRequestType(reminder.focusDomain);
        setItemTitle(reminder.focusTitle);
        
        // Auto-fill from previously given info
        if (activeLearner.currentFocuses) {
          const focus = activeLearner.currentFocuses.find(f => f.id === reminder.focusId || (f.title === reminder.focusTitle && f.domain === reminder.focusDomain));
          if (focus) {
            setItemAuthor(focus.author || '');
            setTimeTaken(focus.estimatedDuration || '');
          }
        }
        
        setCompletionDate(new Date().toISOString().split('T')[0]);
        setIsRequestModalOpen(true);
      } else if (type === 'rescheduled') {
        if (!newDate) {
          setError("Please choose a valid reschedule date.");
          return;
        }
        text = `Need to adjust target date. Requested to reschedule target completion to ${newDate}.`;
        if (activeLearner.currentFocuses) {
          const updatedFocuses = activeLearner.currentFocuses.map(f => {
            if (f.id === reminder.focusId || (f.title === reminder.focusTitle && f.domain === reminder.focusDomain)) {
              return { ...f, estimatedDuration: newDate };
            }
            return f;
          });
          const { learnerService } = await import('../services/learnerService');
          await learnerService.updateLearner(activeLearner.id, { currentFocuses: updatedFocuses });
        }
      } else if (type === 'struggling') {
        text = customText || 'I am struggling on a few aspects and would appreciate advice/assistance.';
      }

      await reminderService.respondToReminder(reminder.id, type, text, newDate);
      setSuccess("Your response has been saved. Admin is notified!");
      
      setActiveReplyReminderId(null);
      setReplyText('');
      setReplyDate('');
      setReplyType(null);
    } catch (err) {
      setError("Failed to submit response.");
    } finally {
      setIsReminderSubmitting(false);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  // Form State
  const [loungeCircles, setLoungeCircles] = useState<LoungeCircle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemAuthor, setItemAuthor] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [timeTaken, setTimeTaken] = useState('');
  const [taskCount, setTaskCount] = useState(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestLoungeModule, setIsRequestLoungeModule] = useState(false);
  const [requestLocation, setRequestLocation] = useState<'lounge' | 'personal'>('lounge');
  const [requestSelectedCircleId, setRequestSelectedCircleId] = useState('');
  const [requestSelectedModuleId, setRequestSelectedModuleId] = useState('');
  const [requestCommunity, setRequestCommunity] = useState('');
  const [requestHasCommunity, setRequestHasCommunity] = useState(false);
  const [requestLink, setRequestLink] = useState('');
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [requestDocumentOverview, setRequestDocumentOverview] = useState('');
  const [materialOwnership, setMaterialOwnership] = useState<'own' | 'someone_else'>('own');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [requestOverview, setRequestOverview] = useState('');
  const [requestIsResearchPaper, setRequestIsResearchPaper] = useState(false);
  const [requestIsSeries, setRequestIsSeries] = useState(false);
  const [requestSeriesCount, setRequestSeriesCount] = useState(2);
  const [requestSeriesTitles, setRequestSeriesTitles] = useState('');
  const [requestIsOnline, setRequestIsOnline] = useState(false);
  const [requestSource, setRequestSource] = useState('');
  const [requestUstadName, setRequestUstadName] = useState('');
  const [requestSubject, setRequestSubject] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [requestObjective, setRequestObjective] = useState('');

  const activeDomain = useMemo(() => APP_DOMAINS.find(d => d.type === requestType), [requestType]);
  const isTaskLike = requestType === 'task';

  const selectedRequestCircle = useMemo(() => {
    if (!requestSelectedCircleId) return null;
    return loungeCircles.find(c => c.id === requestSelectedCircleId) || null;
  }, [loungeCircles, requestSelectedCircleId]);

  const selectedRequestModule = useMemo(() => {
    if (!requestSelectedModuleId) return null;
    return loungeModules.find(m => m.id === requestSelectedModuleId) || null;
  }, [loungeModules, requestSelectedModuleId]);

  const hideSubmitButton = 
    (requestType === 'book' && requestLocation === 'lounge' && !requestSelectedCircleId) ||
    (requestLocation === 'personal' && !['task'].includes(requestType) && !submissionMethod) ||
    ((['tafsir', 'seerah', 'dowra'].includes(requestType)) && requestLocation === 'lounge' && !requestSelectedModuleId) ||
    (requestType === 'talaqqi' && requestLocation === 'lounge' && !requestSelectedCircleId);

  const hideExtraFields = false;

  useEffect(() => {
    const shouldBeLoungeModule = ['tafsir', 'seerah', 'dowra'].includes(requestType) && requestLocation === 'lounge';
    setIsRequestLoungeModule(shouldBeLoungeModule);
    if (!shouldBeLoungeModule) {
      setRequestSelectedModuleId('');
    }
  }, [requestType, requestLocation]);

  useEffect(() => {
    if (activeLearner) {
      const unsubscribe = requestService.subscribeToRequests((allRequests) => {
        setAllPlatformRequests(allRequests);
        const userReqs = allRequests.filter(r => r.learnerId === activeLearner.id);
        const pending = userReqs.filter(r => r.status === 'pending');
        setPendingRequests(pending);
        setAllLearnerRequests(userReqs);
        
        // Extract all unique subjects from approved requests across the platform
        const approvedSubs = Array.from(
          new Set(
            allRequests
              .filter(r => r.status === 'approved' && r.details?.subject)
              .map(r => r.details!.subject as string)
          )
        ).sort();
        setAllApprovedSubjects(approvedSubs);

        notificationService.processRequestsSnapshot(allRequests, activeLearner.id);
      });
      return () => unsubscribe();
    }
  }, [activeLearner?.id]);

  useEffect(() => {
    if (activeLearner) {
      reminderService.checkAndGenerateReminders(
        activeLearner.id,
        activeLearner.fullName,
        activeLearner.currentFocuses || []
      );

      const unsubscribe = reminderService.subscribeToLearnerReminders(activeLearner.id, (allReminders) => {
        setReminders(allReminders);
        notificationService.processRemindersSnapshot(allReminders, activeLearner.id);
      });
      return () => unsubscribe();
    }
  }, [activeLearner?.id]);

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeLearner) return;

    setIsSubmitting(true);
    try {
      const normType = requestType.endsWith('s') ? requestType.slice(0, -1) : requestType;
      
      const activeFocus = activeLearner.currentFocuses?.find(f => f.title === itemTitle);
      const isModule = activeFocus && (activeFocus.isLoungeModule === true || (activeFocus.isLoungeModule === undefined && activeFocus.location === 'lounge' && ['seerah', 'tafsir', 'dowra'].includes(activeFocus.domain)));
      
      if (isModule) {
        const attendance = activeFocus.sessionAttendance || {};
        const attendedCount = Object.values(attendance).filter(v => v === 'attended').length;
        const totalSessions = 10;
        
        if ((attendedCount / totalSessions) < 0.7) {
            setError("You have attended less than 70% of sessions. You are considered to not have taken the module seriously, and no scores will be granted.");
            setTimeout(() => setError(null), 8000);
            
            // Automatically abandon it since they failed
            const updatedFocuses = activeLearner.currentFocuses?.filter(f => f.id !== activeFocus.id) || [];
            const { learnerService } = await import('../services/learnerService');
            await learnerService.updateLearner(activeLearner.id, { currentFocuses: updatedFocuses });
            
            if (activeFocus.id) {
              try {
                await requestService.deleteRequest(activeFocus.id);
                await reminderService.deleteRemindersByFocusId(activeFocus.id);
                await reminderService.addReminder({
                  learnerId: activeLearner.id,
                  learnerName: activeLearner.fullName,
                  focusId: activeFocus.id || 'abandoned-' + Date.now(),
                  focusTitle: activeFocus.title,
                  focusDomain: activeFocus.domain,
                  targetDate: activeFocus.estimatedDuration || '',
                  createdAt: new Date().toISOString(),
                  type: 'abandon',
                  status: 'answered',
                  questionText: `This focus has been automatically abandoned due to low attendance (< 70%).`,
                  responseText: `${activeLearner.fullName} failed attendance threshold (attended ${attendedCount}/10). The focus on "${activeFocus.title}" (${(activeFocus.domain || 'focus').toUpperCase()}) was automatically abandoned.`,
                  adminRead: false,
                  learnerRead: true
                });
              } catch (err) {
                console.error("Failed to automatically abandon focus:", err);
              }
            }
            
            setIsRequestModalOpen(false);
            setIsSubmitting(false);
            return;
        }
      }

      let uploadedFileLink = '';
      let hasFile = false;
      if (requestFile) {
        try {
          setIsUploadingFile(true);
          const { driveService } = await import('../services/driveService');
          const titleToUse = itemTitle || activeDomain?.label || normType;
          
          let categoryFolder = 'Books';
          if (normType === 'research papers/article') {
            categoryFolder = requestIsResearchPaper ? 'Research Papers' : 'Articles';
          } else if (normType === 'seerah' || normType === 'tafsir' || normType === 'dowra' || normType === 'module') {
            categoryFolder = 'Seerah, Tafsir & Dowra Notes';
          } else if (normType === 'talaqqi') {
            categoryFolder = 'Guided Studies Notes';
          } else if (normType === 'presentation') {
            categoryFolder = 'Presentation Files';
          }
          
          const res = await driveService.uploadFile(requestFile, titleToUse || undefined, categoryFolder);
          if (res && res.webViewLink) {
            uploadedFileLink = res.webViewLink;
            hasFile = true;
          }
        } catch (err: any) {
          console.warn("Optional document upload failed or unauthorized:", err);
          if (err.message && err.message.includes('401')) {
            setError('Upload failed: The Library Drive connection has expired. Admin must reconnect to Google Drive. Keep your files stored, but you can submit this request without the file for now if you clear the file selection.');
          } else {
            setError('Upload failed: ' + err.message);
          }
          setIsSubmitting(false);
          setIsUploadingFile(false);
          return; // Halt submission
        } finally {
          setIsUploadingFile(false);
        }
      }

      await requestService.submitRequest({
        learnerId: activeLearner.id,
        learnerName: activeLearner.fullName,
        type: normType,
        details: {
          title: toTitleCase(itemTitle || activeDomain?.label || normType),
          author: toTitleCase(normType === 'talaqqi' ? requestUstadName : itemAuthor),
          completedAt: completionDate,
          duration: timeTaken,
          count: taskCount,
          description: description,
          location: requestLocation,
          community: requestCommunity,
          isLoungeModule: isRequestLoungeModule,
          moduleId: isRequestLoungeModule ? requestSelectedModuleId : undefined,
          circleId: ((normType === 'book' || normType === 'talaqqi') && requestLocation === 'lounge') ? requestSelectedCircleId : undefined,
          circleTitle: ((normType === 'book' || normType === 'talaqqi') && requestLocation === 'lounge') ? (loungeCircles.find(c => c.id === requestSelectedCircleId)?.title || undefined) : undefined,
          link: (normType === 'research papers/article' || normType === 'presentation') ? requestLink : undefined,
          hasFile,
          fileLink: uploadedFileLink || undefined,
          documentOverview: requestDocumentOverview || undefined,
          overview: requestOverview || undefined,
          isResearchPaper: normType === 'research papers/article' ? requestIsResearchPaper : undefined,
          isSeries: normType === 'research papers/article' ? requestIsSeries : undefined,
          seriesCount: (normType === 'research papers/article' && requestIsSeries) ? Math.max(2, requestSeriesCount) : undefined,
          seriesArticleTitles: (normType === 'research papers/article' && requestIsSeries) ? requestSeriesTitles.trim() : undefined,
          submissionMethod: !['task'].includes(normType) ? submissionMethod || undefined : undefined,
          bookSubmissionMethod: normType === 'book' && requestLocation === 'personal' ? (submissionMethod || undefined) : undefined,
          presentationTargetDate: normType === 'book' && requestLocation === 'personal' && submissionMethod === 'overview' ? (requestPresentationTargetDate || undefined) : undefined,
          isOnline: normType === 'talaqqi' ? requestIsOnline : undefined,
          source: normType === 'talaqqi' ? requestSource : undefined,
          ustadName: requestUstadName ? toTitleCase(requestUstadName) : undefined,
          subject: requestSubject ? toTitleCase(requestSubject) : undefined,
          objective: normType === 'talaqqi' ? requestObjective : undefined,
          materialOwnership: (requestFile && normType !== 'book') ? materialOwnership : undefined
        }
      });
      setSuccess("Your update request has been submitted for admin approval.");
      setIsRequestModalOpen(false);
      setSubmissionMethod(null);
      setRequestPresentationTargetDate('');
      // Reset form
      setItemTitle('');
      setItemAuthor('');
      setRequestSelectedCircleId('');
      setRequestSelectedModuleId('');
      setCompletionDate('');
      setTimeTaken('');
      setTaskCount(1);
      setDescription('');
      setIsRequestLoungeModule(false);
      setRequestLocation('lounge');
      setRequestCommunity('');
      setRequestHasCommunity(false);
      setRequestLink('');
      setRequestFile(null);
      setRequestDocumentOverview('');
      setMaterialOwnership('own');
      setRequestOverview('');
      setRequestSubject('');
      setIsCustomSubject(false);
      setRequestIsResearchPaper(false);
      setRequestIsSeries(false);
      setRequestSeriesCount(2);
      setRequestSeriesTitles('');
    } catch (err) {
      console.error("Submit request failed:", err);
      setError("Failed to submit request: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const matchedLearners = learners.filter(l => 
    searchTerm && l.isApproved && (l.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   l.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      const user = await authService.signIn(searchTerm, password);
      const profile = learners.find(l => l.id === user.uid);
      
      if (profile) {
        if (!profile.isApproved) {
          setError("Your account is pending admin approval. Please check back later.");
          await authService.signOut();
          return;
        }
        setActiveLearner(profile);
        setSearchTerm('');
        setPassword('');
      } else {
        setError("Profile not found in Firestore. Please contact admin.");
        await authService.signOut();
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid Wisdom Code or password.");
      } else if (err.code === 'auth/invalid-credential') {
        setError("Invalid credentials.");
      } else {
        setError("An error occurred during sign in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (regPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!regPhone.trim()) {
      setError("Phone number is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.signUp(regId, regPassword, regName, regPhone);
      setSuccess("Registration successful! Your profile is pending admin approval.");
      setRegName('');
      setRegId('');
      setRegPhone('');
      setRegPassword('');
      setConfirmPassword('');
      setShowRegPassword(false);
      setShowConfirmPassword(false);
      setTimeout(() => {
        setAuthMode('signin');
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This Wisdom Code is already registered.");
      } else {
        setError("Failed to register. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isFocusSubmitting, setIsFocusSubmitting] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [focusDomain, setFocusDomain] = useState<string>(APP_DOMAINS[0]?.type || 'book');
  const [focusBookTotalPages, setFocusBookTotalPages] = useState<string>('');
  const [focusTargetDomain, setFocusTargetDomain] = useState<string>('');
  const [focusTitle, setFocusTitle] = useState('');
  const [focusAuthor, setFocusAuthor] = useState('');
  const [focusEstimatedDuration, setFocusEstimatedDuration] = useState('');
  const [focusCommunity, setFocusCommunity] = useState('');
  const [focusHasCommunity, setFocusHasCommunity] = useState(false);
  const [focusLocation, setFocusLocation] = useState<'lounge' | 'personal'>('lounge');
  const [focusBookOverviewFormat, setFocusBookOverviewFormat] = useState<'written' | 'overview'>('written');
  const [focusPresentationTargetDate, setFocusPresentationTargetDate] = useState('');
  const [isLoungeModule, setIsLoungeModule] = useState(false);
  const [focusModuleId, setFocusModuleId] = useState<string | undefined>(undefined);
  const [focusLink, setFocusLink] = useState('');
  const [focusOverview, setFocusOverview] = useState('');
  const [focusIsResearchPaper, setFocusIsResearchPaper] = useState(false);
  const [focusIsSeries, setFocusIsSeries] = useState(false);
  const [focusSeriesCount, setFocusSeriesCount] = useState(2);
  const [focusSeriesTitles, setFocusSeriesTitles] = useState('');
  const [focusIsOnline, setFocusIsOnline] = useState(false);
  const [focusSource, setFocusSource] = useState('');
  const [focusUstadName, setFocusUstadName] = useState('');
  const [focusSubject, setFocusSubject] = useState('');
  const [focusObjective, setFocusObjective] = useState('');

  const [selectedCircle, setSelectedCircle] = useState<LoungeCircle | null>(null);
  const [selectedFocusModule, setSelectedFocusModule] = useState<LoungeModule | null>(null);

  useEffect(() => {
    if (!isFocusModalOpen) {
      setSelectedCircle(null);
      setSelectedFocusModule(null);
      setActiveBucketItemToRemoveId(null);
    }
  }, [isFocusModalOpen]);

  useEffect(() => {
    if (!isBucketModalOpen) {
      setBucketLibrarySearch('');
      setSelectedLibraryBook(null);
      setBucketItemLink('');
      setBucketItemOverview('');
      setBucketItemIsResearchPaper(false);
      setBucketItemIsSeries(false);
      setBucketItemSeriesCount(2);
      setBucketItemSeriesTitles('');
      setBucketItemIsOnline(false);
      setBucketItemSource('');
      setBucketItemUstadName('');
      setBucketItemHasCommunity(false);
      setBucketItemCommunity('');
      setBucketItemSubject('');
      setBucketItemObjective('');
    }
  }, [isBucketModalOpen]);

  useEffect(() => {
    if (!isRequestModalOpen) {
      setRequestSelectedCircleId('');
      setRequestSelectedModuleId('');
      setSubmissionMethod(null);
    }
  }, [isRequestModalOpen]);

  useEffect(() => {
    if (isFocusModalOpen || isRequestModalOpen) {
      const fetchCircles = async () => {
        setCirclesLoading(true);
        try {
          const data = await circleService.getCircles();
          setLoungeCircles(data);
          
          if (isFocusModalOpen && focusDomain === 'book' && focusLocation === 'lounge' && focusTitle) {
            const matchingCircle = data.find(c => 
              (c.bookName || c.title).toLowerCase() === focusTitle.toLowerCase() ||
              c.title.toLowerCase() === focusTitle.toLowerCase()
            );
            if (matchingCircle) {
              setSelectedCircle(matchingCircle);
            }
          }
        } catch (e) {
          console.error("Failed to load circles:", e);
        } finally {
          setCirclesLoading(false);
        }
      };
      fetchCircles();
    }
  }, [isFocusModalOpen, isRequestModalOpen]);

  const renderLocationSelection = () => (
    <div className="bg-brand-offwhite p-4 rounded-2xl border border-brand-border space-y-2">
      <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Location</label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name="focusLocation"
            value="lounge"
            checked={focusLocation === 'lounge'}
            onChange={() => setFocusLocation('lounge')}
            className="text-brand-brown focus:ring-brand-brown w-4 h-4"
          />
          <span className="text-sm text-brand-brown font-semibold">Inside the Lounge</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name="focusLocation"
            value="personal"
            checked={focusLocation === 'personal'}
            onChange={() => setFocusLocation('personal')}
            className="text-brand-brown focus:ring-brand-brown w-4 h-4"
          />
          <span className="text-sm text-brand-brown font-semibold">Personal (Outside)</span>
        </label>
      </div>
    </div>
  );

  useEffect(() => {
    if (pendingEnrollment && activeLearner) {
      setFocusDomain(pendingEnrollment.category);
      setFocusTargetDomain(pendingEnrollment.targetDomain || pendingEnrollment.category);
      setFocusTitle(pendingEnrollment.title);
      if (pendingEnrollment.speaker) setFocusAuthor(pendingEnrollment.speaker);
      setFocusLocation('lounge');
      setIsLoungeModule((pendingEnrollment as any).isLoungeModule || false);
      const mId = (pendingEnrollment as any).moduleId;
      setFocusModuleId(mId || undefined);

      let targetEndDate = pendingEnrollment.duration || '';
      if (mId) {
        const matchingModule = loungeModules.find(m => m.id === mId);
        if (matchingModule) {
          setSelectedFocusModule(matchingModule);
          if (matchingModule.endDate || matchingModule.estimatedEndDate) {
            targetEndDate = matchingModule.endDate || matchingModule.estimatedEndDate || targetEndDate;
          }
        }
      }
      if (targetEndDate) {
        setFocusEstimatedDuration(targetEndDate);
      }

      setIsFocusModalOpen(true);
      clearPendingEnrollment?.();
    }
  }, [pendingEnrollment, activeLearner, clearPendingEnrollment, loungeModules]);

  const handleUpdateFocus = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeLearner) return;

    setIsFocusSubmitting(true);
    try {
      const finalDomain = focusTargetDomain || focusDomain;
      const normDomain = finalDomain.endsWith('s') ? finalDomain.slice(0, -1) : finalDomain;
      
      let pagesCount: number | undefined = undefined;
      let pagesPerDay: number | undefined = undefined;
      if (normDomain === 'book' && focusBookTotalPages) {
        pagesCount = parseInt(focusBookTotalPages, 10);
        if (!isNaN(pagesCount) && pagesCount > 0 && focusEstimatedDuration) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const target = new Date(focusEstimatedDuration);
          target.setHours(0,0,0,0);
          const diffTime = target.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          pagesPerDay = diffDays > 0 ? Math.ceil(pagesCount / diffDays) : pagesCount;
        }
      }

      await requestService.submitRequest({
        learnerId: activeLearner.id,
        learnerName: activeLearner.fullName,
        type: normDomain,
        isFocus: true,
        details: {
          title: toTitleCase(focusTitle || APP_DOMAINS.find(d => d.type === finalDomain)?.label || normDomain),
          author: normDomain === 'presentation' ? activeLearner.fullName : toTitleCase(normDomain === 'talaqqi' ? focusUstadName : focusAuthor),
          estimatedDuration: focusEstimatedDuration,
          location: focusLocation,
          isLoungeModule: isLoungeModule,
          moduleId: focusModuleId,
          community: focusCommunity,
          link: normDomain === 'research papers/article' ? focusLink : undefined,
          overview: normDomain === 'research papers/article' ? focusOverview : undefined,
          isResearchPaper: normDomain === 'research papers/article' ? focusIsResearchPaper : undefined,
          isSeries: normDomain === 'research papers/article' ? focusIsSeries : undefined,
          seriesCount: (normDomain === 'research papers/article' && focusIsSeries) ? Math.max(2, focusSeriesCount) : undefined,
          seriesArticleTitles: (normDomain === 'research papers/article' && focusIsSeries) ? focusSeriesTitles.trim() : undefined,
          isOnline: normDomain === 'talaqqi' ? focusIsOnline : undefined,
          source: normDomain === 'talaqqi' ? focusSource : undefined,
          ustadName: focusUstadName ? toTitleCase(focusUstadName) : undefined,
          subject: focusSubject ? toTitleCase(focusSubject) : undefined,
          objective: normDomain === 'talaqqi' ? focusObjective : undefined,
          totalPages: pagesCount,
          averagePagesPerDay: pagesPerDay,
          bookSubmissionMethod: normDomain === 'book' && focusLocation === 'personal' ? focusBookOverviewFormat : undefined,
          presentationTargetDate: normDomain === 'book' && focusLocation === 'personal' && focusBookOverviewFormat === 'overview' ? focusPresentationTargetDate : undefined,
        }
      });
      setFocusTargetDomain('');
      setIsFocusModalOpen(false);
      setFocusTitle('');
      setFocusAuthor('');
      setFocusBookTotalPages('');
      setFocusCommunity('');
      setFocusHasCommunity(false);
      setFocusEstimatedDuration('');
      setFocusLocation('lounge');
      setFocusBookOverviewFormat('written');
      setFocusPresentationTargetDate('');
      setIsLoungeModule(false);
      setFocusModuleId(undefined);
      setFocusLink('');
      setFocusOverview('');
      setFocusIsResearchPaper(false);
      setFocusIsSeries(false);
      setFocusSeriesCount(2);
      setFocusSeriesTitles('');
      setSuccess("Focus approval request submitted!");
      if (activeBucketItemToRemoveId && activeLearner.bucketList) {
        const remainingBucket = activeLearner.bucketList.filter(item => item.id !== activeBucketItemToRemoveId);
        const { learnerService } = await import('../services/learnerService');
        await learnerService.updateLearner(activeLearner.id, { bucketList: remainingBucket });
        setActiveBucketItemToRemoveId(null);
      }
    } catch (err) {
      console.error("Focus submission failed:", err);
      setError("Failed to submit focus request. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsFocusSubmitting(false);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const handleAddToBucketList = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeLearner) return;

    let finalTitle = '';
    let finalAuthor = '';

    if (bucketItemDomain === 'book' && bucketIsFromLibrary) {
      if (!selectedLibraryBook) {
        setError("Please choose a book from the Library.");
        return;
      }
      finalTitle = selectedLibraryBook.title;
      finalAuthor = selectedLibraryBook.author || 'Unknown Author';
    } else {
      if (!bucketItemTitle.trim()) {
        setError("Please specify a valid Title.");
        return;
      }
      finalTitle = bucketItemTitle.trim();
      if (bucketItemDomain === 'presentation') {
        finalAuthor = activeLearner.fullName;
      } else if (bucketItemDomain === 'talaqqi') {
        finalAuthor = bucketItemUstadName.trim() || bucketItemAuthor.trim();
      } else {
        finalAuthor = bucketItemAuthor.trim();
      }
    }

    setIsBucketSubmitting(true);
    try {
      const newItem = {
        id: `bucket-${Date.now()}`,
        title: finalTitle,
        author: finalAuthor || undefined,
        domain: bucketItemDomain,
        notes: bucketItemNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
        
        // Distinct parameters based on domain
        link: bucketItemDomain === 'research papers/article' ? bucketItemLink.trim() || undefined : undefined,
        overview: bucketItemDomain === 'research papers/article' ? bucketItemOverview.trim() || undefined : undefined,
        isResearchPaper: bucketItemDomain === 'research papers/article' ? bucketItemIsResearchPaper : undefined,
        isSeries: bucketItemDomain === 'research papers/article' ? bucketItemIsSeries : undefined,
        seriesCount: (bucketItemDomain === 'research papers/article' && bucketItemIsSeries) ? Math.max(2, bucketItemSeriesCount) : undefined,
        seriesArticleTitles: (bucketItemDomain === 'research papers/article' && bucketItemIsSeries) ? bucketItemSeriesTitles.trim() : undefined,
        isOnline: bucketItemDomain === 'talaqqi' ? bucketItemIsOnline : undefined,
        source: (bucketItemDomain === 'talaqqi' && bucketItemIsOnline) ? bucketItemSource.trim() || undefined : undefined,
        ustadName: bucketItemDomain === 'talaqqi' ? bucketItemUstadName.trim() || undefined : undefined,
        hasCommunity: ['book', 'talaqqi', 'tafsir', 'seerah', 'dowra'].includes(bucketItemDomain) ? bucketItemHasCommunity : undefined,
        community: (['book', 'talaqqi', 'tafsir', 'seerah', 'dowra'].includes(bucketItemDomain) && bucketItemHasCommunity) ? bucketItemCommunity.trim() || undefined : undefined,
        subject: bucketItemDomain === 'talaqqi' ? bucketItemSubject.trim() || undefined : undefined,
        objective: bucketItemDomain === 'talaqqi' ? bucketItemObjective.trim() || undefined : undefined,
      };

      const updatedBucket = [...(activeLearner.bucketList || []), newItem];
      const { learnerService } = await import('../services/learnerService');
      await learnerService.updateLearner(activeLearner.id, { bucketList: updatedBucket });

      setBucketItemTitle('');
      setBucketItemAuthor('');
      setBucketItemDomain('book');
      setBucketItemNotes('');
      setSelectedLibraryBook(null);
      setBucketLibrarySearch('');
      setBucketItemLink('');
      setBucketItemOverview('');
      setBucketItemIsResearchPaper(false);
      setBucketItemIsSeries(false);
      setBucketItemSeriesCount(2);
      setBucketItemSeriesTitles('');
      setBucketItemIsOnline(false);
      setBucketItemSource('');
      setBucketItemUstadName('');
      setBucketItemHasCommunity(false);
      setBucketItemCommunity('');
      setBucketItemSubject('');
      setBucketItemObjective('');
      setIsBucketModalOpen(false);
      setSuccess("Added to your bucket list successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to add to bucket list:", err);
      setError("Failed to add item. " + (err instanceof Error ? err.message : String(err)));
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsBucketSubmitting(false);
    }
  };

  const handleRemoveFromBucketList = async (itemId: string) => {
    if (!activeLearner || !activeLearner.bucketList) return;
    try {
      const updatedBucket = activeLearner.bucketList.filter(item => item.id !== itemId);
      const { learnerService } = await import('../services/learnerService');
      await learnerService.updateLearner(activeLearner.id, { bucketList: updatedBucket });
      setSuccess("Removed from your bucket list.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to remove from bucket list:", err);
      setError("Failed to remove item. " + (err instanceof Error ? err.message : String(err)));
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleActivateBucketItem = (item: any) => {
    setFocusDomain(item.domain);
    setFocusTitle(item.title);
    setFocusAuthor(item.author || '');
    setFocusBookTotalPages(item.totalPages ? String(item.totalPages) : '');
    setFocusLocation('personal');
    setFocusHasCommunity(item.hasCommunity || false);
    setFocusCommunity(item.community || '');
    setIsLoungeModule(false);
    setFocusModuleId(undefined);
    setFocusLink(item.link || '');
    setFocusOverview(item.overview || '');
    setFocusIsResearchPaper(item.isResearchPaper || false);
    setFocusIsSeries((item as any).isSeries || false);
    setFocusSeriesCount((item as any).seriesCount || 2);
    setFocusSeriesTitles((item as any).seriesArticleTitles || '');
    setFocusIsOnline(item.isOnline || false);
    setFocusSource(item.source || '');
    setFocusUstadName(item.ustadName || item.author || '');
    setFocusSubject(item.subject || '');
    setFocusObjective(item.objective || '');

    setActiveBucketItemToRemoveId(item.id);
    setIsFocusModalOpen(true);
  };

  const handleUpdateAttendance = async (dateStr: string, status: 'attended' | 'missed' | undefined) => {
    if (!activeLearner || !currentFocusTracker) return;
    const currentAttendance = currentFocusTracker.sessionAttendance || {};
    // If clicking same status, clear it
    const newStatus = currentAttendance[dateStr] === status ? undefined : status;
    const newAttendance = { ...currentAttendance };
    if (newStatus === undefined) {
      delete newAttendance[dateStr];
    } else {
      newAttendance[dateStr] = newStatus;
    }
    
    const updatedFocuses = activeLearner.currentFocuses?.map(f => 
      f.id === currentFocusTracker.id 
        ? { ...f, sessionAttendance: newAttendance }
        : f
    ) || [];

    const { learnerService } = await import('../services/learnerService');
    await learnerService.updateLearner(activeLearner.id, { currentFocuses: updatedFocuses });
    
    // We update local state to reflect UI instantly
    const updatedFocus = updatedFocuses.find(f => f.id === currentFocusTracker.id);
    if (updatedFocus) setSelectedFocusTracker(updatedFocus);
  };

  const activeBadges = activeLearner ? getLearnerBadges(activeLearner) : [];

  const wisdomPoints = useMemo(() => {
    if (!activeLearner) return 0;
    return getOverallPoints(activeLearner);
  }, [activeLearner]);

  const statusProgress = useMemo(() => getStatusProgress(activeBadges.length), [activeBadges.length]);
  const currentStatus = statusProgress.current;

  const [upgradeData, setUpgradeData] = useState<{ previous: string, current: string, isAnimating: boolean } | null>(null);
  const [upgradeAnimationStep, setUpgradeAnimationStep] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (!activeLearner) return;

    const storageKey = `lastBadgeCount_${activeLearner.id}`;
    const prevBadgeCountStr = localStorage.getItem(storageKey);
    const currentBadgeCount = activeBadges.length;

    if (prevBadgeCountStr !== null) {
      const prevBadgeCount = parseInt(prevBadgeCountStr, 10);
      if (currentBadgeCount > prevBadgeCount) {
        const prevTier = getLearnerStatus(prevBadgeCount);
        const currentTier = getLearnerStatus(currentBadgeCount);

        // Check if the actual tier ID changed and it's higher
        if (prevTier.id !== currentTier.id && parseInt(currentTier.id) > parseInt(prevTier.id)) {
          setUpgradeData({ previous: prevTier.name, current: currentTier.name, isAnimating: true });
        }
      }
    }
    
    // Always update to current so we only show once
    localStorage.setItem(storageKey, currentBadgeCount.toString());
  }, [activeBadges.length, activeLearner?.id]);

  useEffect(() => {
    if (upgradeData?.isAnimating) {
      setUpgradeAnimationStep(0);
      try {
        playNotificationSound();
      } catch (e) {}
      const timer1 = setTimeout(() => setUpgradeAnimationStep(1), 2500);
      const timer2 = setTimeout(() => setUpgradeAnimationStep(2), 3500);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [upgradeData?.isAnimating]);

  const chartData = useMemo(() => {
    if (!activeLearner) return [];
    const data = APP_DOMAINS.map(domain => {
      const fullMark = domain.type === 'task' ? 50 : 15;
      return { subject: domain.label, A: getDomainValue(activeLearner, domain.type), fullMark };
    });
    return data;
  }, [activeLearner]);

  const activityData = useMemo(() => {
    if (!activeLearner) return [];
    const colors = ['#5A4633', '#8C7864', '#A69280', '#C4B4A4', '#DCCFC2', '#EBE5DB', '#E0D8C8'];
    const data: {name: string, value: number, color: string}[] = [];
    
    APP_DOMAINS.forEach((domain, index) => {
      data.push({
        name: domain.label,
        value: getDomainValue(activeLearner, domain.type),
        color: colors[index % colors.length]
      });
    });
    return data;
  }, [activeLearner]);

  const timelineActivities = useMemo(() => {
    if (!activeLearner) return [];

    const activities: any[] = [];
    const matchedRequestIds = new Set<string>();

    // 1. All pending and rejected requests are kept to show in-progress submission feedback
    const nonApprovedRequests = allLearnerRequests.filter(r => r.status !== 'approved' && !r.isLibrarySubmission);
    activities.push(...nonApprovedRequests);

    // 2. Gather approved requests (both focus and milestones) to match against actual profile data
    const approvedRequests = allLearnerRequests.filter(r => r.status === 'approved' && !r.isLibrarySubmission);

    // Helper to find and match can be exact or loose
    const findMatchingRequest = (type: string, titleToMatch: string, isFocusRequest = false) => {
      const normType = type.endsWith('s') ? type.slice(0, -1) : type;
      const found = approvedRequests.find(r => {
        if (matchedRequestIds.has(r.id)) return false;
        
        const rNormType = r.type.endsWith('s') ? r.type.slice(0, -1) : r.type;
        if (rNormType !== normType) return false;
        if (!!r.isFocus !== isFocusRequest) return false;
        
        const reqTitle = r.details?.title || '';
        return titleToMatch.toLowerCase().includes(reqTitle.toLowerCase()) || 
               reqTitle.toLowerCase().includes(titleToMatch.toLowerCase());
      });
      if (found) {
        matchedRequestIds.add(found.id);
      }
      return found;
    };

    // --- Active Focuses from learner's profile ---
    const activeFocuses = activeLearner.currentFocuses || [];
    activeFocuses.forEach((focus) => {
      const normFocusDomain = focus.domain.endsWith('s') ? focus.domain.slice(0, -1) : focus.domain;
      const req = findMatchingRequest(normFocusDomain, focus.title, true);
      if (req) {
        activities.push(req);
      } else {
        activities.push({
          id: focus.id ? `${focus.id}-focus` : `synth-focus-${focus.title}`,
          learnerId: activeLearner.id,
          learnerName: activeLearner.fullName,
          type: normFocusDomain,
          isFocus: true,
          status: 'approved',
          requestedAt: focus.createdAt || new Date().toISOString(),
          details: {
            title: focus.title,
            author: focus.author,
            estimatedDuration: focus.estimatedDuration,
            location: focus.location,
          }
        });
      }
    });

    // --- Books ---
    const books = activeLearner.booksCompleted || [];
    books.forEach((bookStr, index) => {
      const overviewMatch = bookStr.match(/\(Overview:\s*([^\)]+)\)/);
      let cleanBookStr = bookStr;
      let overviewText = '';
      if (overviewMatch) {
        cleanBookStr = bookStr.replace(overviewMatch[0], '').trim();
        overviewText = overviewMatch[1];
      }

      const match = cleanBookStr.match(/^(.+?)(?:\s*\(([^)]+)\))?$/);
      const title = match ? match[1].trim() : cleanBookStr;
      const durationOrDate = match && match[2] ? match[2].trim() : '';

      let parsedDate = activeLearner.joinedAt || new Date().toISOString();
      if (durationOrDate && !isNaN(Date.parse(durationOrDate))) {
        parsedDate = new Date(durationOrDate).toISOString();
      }

      const req = findMatchingRequest('book', title, false);
      if (req) {
        activities.push(req);
      } else {
        activities.push({
          id: `synth-book-${index}-${title}`,
          learnerId: activeLearner.id,
          learnerName: activeLearner.fullName,
          type: 'book',
          isFocus: false,
          status: 'approved',
          requestedAt: parsedDate,
          details: {
            title: title,
            duration: durationOrDate || 'Completed',
            completedAt: parsedDate,
            description: overviewText || undefined
          }
        });
      }
    });

    // --- Presentations ---
    const presentations = activeLearner.presentationsGiven || [];
    presentations.forEach((presStr, index) => {
      let title = presStr;
      let completedAtOrDate = '';
      let link: string | undefined = undefined;

      // Extract [Link: url] if exists
      const linkMatch = presStr.match(/\[Link:\s*([^\]]+)\]/);
      if (linkMatch) {
        link = linkMatch[1].trim();
        title = presStr.replace(/\[Link:\s*[^\]]+\]/g, '').trim();
      }

      const match = title.match(/^(.+?)(?:\s*\(([^)]+)\))?$/);
      if (match) {
        title = match[1].trim();
        completedAtOrDate = match[2] ? match[2].trim() : '';
      }

      let parsedDate = activeLearner.joinedAt || new Date().toISOString();
      if (completedAtOrDate && !isNaN(Date.parse(completedAtOrDate))) {
        parsedDate = new Date(completedAtOrDate).toISOString();
      }

      const req = findMatchingRequest('presentation', title, false);
      if (req) {
        activities.push(req);
      } else {
        activities.push({
          id: `synth-pres-${index}-${title}`,
          learnerId: activeLearner.id,
          learnerName: activeLearner.fullName,
          type: 'presentation',
          isFocus: false,
          status: 'approved',
          requestedAt: parsedDate,
          details: {
            title: title,
            completedAt: parsedDate,
            link: link
          }
        });
      }
    });

    // --- Modules (Tafsir, Seerah, Articles, Dowra) ---
    const moduleTypes = ['tafsir', 'seerah', 'research papers/article', 'dowra'];
    moduleTypes.forEach(type => {
      const items = getDomainItems(activeLearner, type);
      items.forEach((itemTitle, index) => {
        const overviewMatch = itemTitle.match(/\(Overview:\s*([^\)]+)\)/);
        let cleanItemTitle = itemTitle;
        let overviewText = '';
        if (overviewMatch) {
          cleanItemTitle = itemTitle.replace(overviewMatch[0], '').trim();
          overviewText = overviewMatch[1];
        }

        // Parse possible embedded date such as "Topic (2026-06-02)"
        const match = cleanItemTitle.match(/^(.+?)(?:\s*\(([^)]+)\))?$/);
        const title = match ? match[1].trim() : cleanItemTitle;
        const durationOrDate = match && match[2] ? match[2].trim() : '';

        let parsedDate = activeLearner.joinedAt || new Date().toISOString();
        if (durationOrDate && !isNaN(Date.parse(durationOrDate))) {
          parsedDate = new Date(durationOrDate).toISOString();
        }

        const req = findMatchingRequest(type, title, false);
        if (req) {
          activities.push(req);
        } else {
          activities.push({
            id: `synth-${type}-${index}-${itemTitle}`,
            learnerId: activeLearner.id,
            learnerName: activeLearner.fullName,
            type: type,
            isFocus: false,
            status: 'approved',
            requestedAt: parsedDate,
            details: {
              title: title,
              completedAt: parsedDate,
              description: overviewText || undefined
            }
          });
        }
      });
    });

    // --- Tasks ---
    const approvedTaskRequests = approvedRequests.filter(r => r.type === 'task' && !r.isFocus);
    const loggedTaskCount = approvedTaskRequests.reduce((sum, r) => sum + (r.details?.count || 1), 0);
    const actualTaskCount = activeLearner.tasksCompleted || 0;

    // Push matched approved task requests
    approvedTaskRequests.forEach(req => {
      matchedRequestIds.add(req.id);
      activities.push(req);
    });

    // Discrepancy Tasks
    if (actualTaskCount > loggedTaskCount) {
      const remainingTasks = actualTaskCount - loggedTaskCount;
      activities.push({
        id: `synth-tasks-remaining`,
        learnerId: activeLearner.id,
        learnerName: activeLearner.fullName,
        type: 'task',
        isFocus: false,
        status: 'approved',
        requestedAt: activeLearner.joinedAt || new Date().toISOString(),
        details: {
          title: 'Logged lounge action points',
          count: remainingTasks,
          completedAt: activeLearner.joinedAt || new Date().toISOString()
        }
      });
    }

    // Capture any approved requests that weren't matched above
    approvedRequests.forEach(req => {
      if (!matchedRequestIds.has(req.id)) {
        activities.push(req);
      }
    });

    // Ensure all activity IDs are strictly unique to avoid key collision
    const uniqueActivities: any[] = [];
    const seenIds = new Set<string>();
    activities.forEach((act, idx) => {
      let uniqueId = act.id;
      if (seenIds.has(uniqueId)) {
        uniqueId = `${act.id}-dup-${idx}`;
      }
      seenIds.add(uniqueId);
      uniqueActivities.push({
        ...act,
        id: uniqueId
      });
    });

    return uniqueActivities;
  }, [activeLearner, allLearnerRequests]);

  return (
    <div className="space-y-8">
      {activeLearner && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
          <AnimatePresence>
            {isChatOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="w-80 h-96 sm:w-96 sm:h-[500px]"
              >
                <ChatWidget
                  learnerId={activeLearner.id}
                  learnerName={activeLearner.fullName}
                  role="learner"
                  onClose={() => setIsChatOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-14 h-14 bg-brand-brown text-white rounded-full shadow-xl flex items-center justify-center hover:bg-brand-brown-dark transition-all transform hover:-translate-y-1 active:scale-95 pointer-events-auto relative"
            >
              <MessageSquare className="w-6 h-6" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse border-2 border-white">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Floating Premium Live Notification Toast */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-[9999] w-full max-w-sm bg-brand-brown text-brand-offwhite rounded-2xl shadow-2xl border border-brand-brown-light p-4 flex items-start gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="p-1 rounded-full bg-brand-beige/20 text-brand-beige">
                  <Bell className="w-4 h-4 animate-bounce" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-beige">Live Notification</span>
              </div>
              <h4 className="font-sans text-sm font-bold text-brand-offwhite">{activeToast.title}</h4>
              <p className="text-xs text-brand-offwhite/85 mt-1 leading-relaxed">{activeToast.body}</p>
            </div>
            <div className="pl-3 border-l border-brand-brown-light/30 self-center flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playNotificationSound();
                }}
                title="Play Chime"
                className="p-1.5 hover:bg-brand-brown-light/40 rounded-lg text-brand-offwhite/75 hover:text-brand-offwhite transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveToast(null)}
                className="p-1.5 hover:bg-brand-brown-light/40 rounded-lg text-brand-offwhite/75 hover:text-brand-offwhite transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Animation Overlay */}
      <AnimatePresence>
        {upgradeData?.isAnimating && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-brand-brown/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateX: 90 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0, shadow: 'none' }}
              transition={{ type: 'spring', damping: 25, stiffness: 100 }}
              className="w-full max-w-sm aspect-square bg-gradient-to-br from-brand-beige to-brand-white rounded-3xl shadow-[0_0_100px_rgba(255,215,0,0.2)] border border-brand-border overflow-hidden flex flex-col items-center justify-center text-center p-8 relative"
            >
              <button 
                onClick={() => setUpgradeData(null)}
                className="absolute top-4 right-4 p-2 hover:bg-brand-brown/10 rounded-full transition-colors text-brand-brown-light z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="relative w-full h-full flex flex-col items-center justify-center overflow-visible">
                <AnimatePresence mode="wait">
                  {upgradeAnimationStep === 0 && (
                     <motion.div 
                       key="previous"
                       initial={{ opacity: 0, y: 30 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -40, scale: 0.8, filter: 'blur(10px)' }}
                       transition={{ duration: 0.5 }}
                       className="flex flex-col items-center absolute inset-0 justify-center"
                     >
                       <span className="text-xs font-bold uppercase tracking-widest text-brand-brown-light mb-4">Previous Status</span>
                       <h3 className="font-sans text-3xl font-black text-brand-brown opacity-60 leading-tight px-4">{upgradeData.previous}</h3>
                     </motion.div>
                  )}
                  {upgradeAnimationStep >= 1 && (
                     <motion.div 
                       key="current"
                       initial={{ opacity: 0, y: 60, scale: 0.6 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       transition={{ type: "spring", bounce: 0.6, duration: 1.2 }}
                       className="flex flex-col items-center absolute inset-0 justify-center"
                     >
                       <motion.div
                         initial={{ rotate: -180, scale: 0 }}
                         animate={{ rotate: 0, scale: 1 }}
                         transition={{ type: 'spring', delay: 0.2, duration: 1 }}
                       >
                         <Trophy className="w-20 h-20 text-yellow-500 mb-6 drop-shadow-xl" />
                       </motion.div>
                       <span className="text-[11px] font-black uppercase tracking-[0.3em] text-green-600 mb-4 animate-pulse">Status Upgraded</span>
                       <h3 className="font-sans text-[2.5rem] font-black leading-none bg-clip-text text-transparent bg-gradient-to-r from-brand-brown-dark via-brand-brown to-amber-600 drop-shadow-sm px-2">{upgradeData.current}</h3>
                       
                       {upgradeAnimationStep === 2 && (
                         <motion.div
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           transition={{ duration: 1 }}
                           className="absolute inset-0 pointer-events-none"
                         >
                           <div className="absolute top-10 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                           <div className="absolute top-20 right-10 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                           <div className="absolute bottom-10 left-16 w-2.5 h-2.5 bg-yellow-500 rounded-full animate-bounce" />
                         </motion.div>
                       )}
                     </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!activeLearner ? (
        <div className="max-w-md mx-auto mt-12 bg-brand-white p-8 rounded-2xl shadow-sm border border-brand-border">
          {/* Sign In / Sign Up Selection */}
          <div className="flex bg-brand-beige p-1 rounded-xl mb-8 border border-brand-border h-12">
            <button 
              onClick={() => { setAuthMode('signin'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${authMode === 'signin' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode('signup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${authMode === 'signup' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="font-sans text-2xl font-bold mb-2 text-brand-text text-center">
            {authMode === 'signin' ? 'Welcome Back' : 'Enter The Lounge'}
          </h2>
          <p className="text-brand-brown-light mb-6 text-center text-sm font-medium">
            {authMode === 'signin' 
              ? 'Enter your details to view your progress.' 
              : 'Register your profile to start tracking your wisdom journey.'}
          </p>

          {authMode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">Name or Wisdom Code</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-brown-light w-4 h-4" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="e.g. Fatima"
                    className="w-full pl-10 pr-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm"
                    required
                  />
                  {showSuggestions && matchedLearners.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-brand-white border border-brand-border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {matchedLearners.map(l => (
                        <div 
                          key={l.id}
                          onClick={() => {
                            setSearchTerm(l.fullName);
                            setShowSuggestions(false);
                          }}
                          className="px-4 py-2 hover:bg-brand-bg-alt cursor-pointer border-b border-brand-border-light last:border-b-0 flex justify-between items-center overflow-hidden"
                        >
                          <span className="font-medium text-brand-text truncate flex-1">{l.fullName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm pr-10"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-brown-light hover:text-brand-brown transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-brand-brown text-brand-offwhite py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-brand-brown-dark transition-all shadow-md active:scale-[0.98] mt-2">
                Sign In
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-brand-beige/50 border border-brand-border/60 p-4 rounded-xl text-center shadow-sm">
                <p className="text-xs font-semibold text-brand-brown leading-relaxed">
                  Registration in The Wisdom Lounge is mandatory to set up a wisdom profile. If you haven't registered yet, get registered here:
                </p>
                <a 
                  href="https://forms.gle/314e1mcZPApnA3GTA" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  id="twl-reg-btn"
                  className="inline-flex items-center justify-center gap-1.5 mt-3 px-4 py-2.5 bg-brand-brown hover:bg-brand-brown-dark text-brand-offwhite text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Register Here
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-brown mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-brown mb-1">Phone Number (registered with TWL)</label>
                  <input 
                    type="tel" 
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-brand-brown mb-1">Wisdom Code</label>
                  <input 
                    type="text" 
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    placeholder="Create a unique code."
                    className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm"
                    required
                  />
                  <p className="text-[10px] text-brand-brown-light leading-relaxed mt-2 bg-brand-beige/50 p-3 rounded-md border border-brand-border/50">
                    <span className="font-bold text-brand-brown-130 uppercase tracking-widest block mb-1">Important:</span>
                    This Wisdom Code will be used as your unique identifier across The Wisdom Lounge. 
                    It must be kept completely secret and private. Do not share it with anyone else.
                    <span className="block mt-1 text-brown-200 font-semibold tracking-narrow lowercase">
                    It should IDEALLY include your name and a combination of numbers.
                    </span>
                    <span className="block mt-1 text-red-400 font-bold tracking-wide uppercase">
                    IT CANNOT BE CHANGED IN THE FUTURE.
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-brown mb-1">Create Password</label>
                  <div className="relative">
                    <input 
                      type={showRegPassword ? "text" : "password"} 
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm pr-10"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-brown-light hover:text-brand-brown transition-colors"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-brown mb-1">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm pr-10"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-brown-light hover:text-brand-brown transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full bg-brand-brown text-brand-offwhite py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-brand-brown-dark transition-all shadow-md active:scale-[0.98] mt-2">
                  Register
                </button>
              </form>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm font-medium text-center mt-4 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm font-medium text-center mt-4 bg-green-50 p-3 rounded-lg border border-green-100">{success}</p>
          )}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto space-y-8"
        >
          {activeLearner.isPaused && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-center gap-3">
              <span className="font-bold text-sm">
                {isAdmin 
                  ? "This profile is currently paused, but as an Administrator you have full editing and tracking overrides." 
                  : "Your profile is currently paused. You can view your progress, but editing is disabled."}
              </span>
            </div>
          )}

          {/* Header Stats */}
          <div 
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 p-6 sm:p-8 rounded-3xl border border-brand-border shrink-0 shadow-sm relative overflow-hidden transition-colors duration-1000"
            style={getBannerBgStyle(wisdomPoints)}
          >
            <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none">
              <Medal className="w-64 h-64 text-brand-brown" />
            </div>
            <div className="relative z-10 w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-brown-light flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Wisdom Score: {wisdomPoints}
                  </p>
                  <span className="bg-brand-brown text-brand-beige text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border border-brand-brown-light/20">
                    {currentStatus.name}
                  </span>
                </div>
                <h1 className="font-sans text-4xl sm:text-5xl font-bold text-brand-text mb-2 tracking-tight">{activeLearner.fullName}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="bg-brand-offwhite px-3 py-1 rounded-md text-sm font-mono text-brand-brown border border-brand-border-light shadow-sm">Wisdom Code: {activeLearner.id}</span>
                  {activeLearner.phoneNumber && (
                    <span className="bg-brand-offwhite px-3 py-1 rounded-md text-sm font-mono text-brand-brown border border-brand-border-light shadow-sm">Phone: {activeLearner.phoneNumber}</span>
                  )}
                  <span className="text-xs text-brand-brown-light font-medium bg-brand-bg-alt px-2 py-1 rounded border border-brand-border-light">Joined: {formatDateDDMMYYYY(activeLearner.joinedAt)}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {(!activeLearner.isPaused || isAdmin) && (
                  <button 
                    onClick={() => setIsRequestModalOpen(true)}
                    className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-brand-offwhite bg-brand-brown rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Submit Update
                  </button>
                )}
                <button 
                  onClick={() => setActiveLearner(null)}
                  className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-brand-brown border border-brand-border rounded-xl bg-brand-white shadow-sm hover:text-brand-brown-dark hover:bg-brand-offwhite active:scale-95 transition-all"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Sub Tab Navigation */}
          <div className="flex border-b border-brand-border pb-3 mb-6 gap-6">
            <button
              type="button"
                onClick={() => setActiveSubTab('dashboard')}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 relative cursor-pointer ${activeSubTab === 'dashboard' ? 'text-brand-brown font-black font-semibold' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
                {activeSubTab === 'dashboard' && (
                  <motion.div layoutId="active_sub_tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-brown" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('settings')}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 relative cursor-pointer ${activeSubTab === 'settings' ? 'text-brand-brown font-black font-semibold' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                <Settings className="w-4 h-4 animate-spin-slow" />
                <span>Settings</span>
                {activeSubTab === 'settings' && (
                  <motion.div layoutId="active_sub_tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-brown" />
                )}
              </button>
            </div>

          {/* Dashboard Tab Content wrapper */}
          {activeSubTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-brand-white border border-brand-border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-4">
                <h3 className="font-sans text-2xl font-bold text-brand-text flex items-center gap-2">
                  <Settings className="w-6 h-6 text-brand-brown animate-spin-slow" />
                  Wisdom Lounge Settings
                </h3>
                <p className="text-sm text-brand-brown-light max-w-xl">
                  Manage your personal preferences, notifications structure, and system integrations for the best learning experience.
                </p>
                <div className="h-px bg-brand-border-light" />
                
                {/* Public Profile Setting */}
                <div className="bg-brand-bg-alt border border-brand-border rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-2">
                    <h4 className="font-sans text-lg font-bold text-brand-text flex items-center gap-1.5">
                      <Eye className="w-5 h-5 text-brand-brown-light" />
                      Public Learnings Profile
                    </h4>
                    <p className="text-sm text-brand-brown-light leading-relaxed max-w-2xl">
                      Allow other learners to view the titles of items you've completed (e.g. books, tafsir modules) on the Leaderboard. Your learnings are private by default.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-brown-light">
                      {activeLearner.isProfilePublic ? 'Public' : 'Private'}
                    </span>
                    <button
                      onClick={async () => {
                        const newValue = !activeLearner.isProfilePublic;
                        const { learnerService } = await import('../services/learnerService');
                        await learnerService.updateLearner(activeLearner.id, { isProfilePublic: newValue });
                        // State will update automatically via Firebase listener, but we can do optimistic update if needed, though activeLearner is from props.
                        // We will call learnerService, and wait for snapshot.
                      }}
                      type="button"
                      role="switch"
                      aria-checked={activeLearner.isProfilePublic}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${activeLearner.isProfilePublic ? 'bg-green-500' : 'bg-brand-border'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${activeLearner.isProfilePublic ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                {/* Device Notifications Setup inside settings */}
                <div className="bg-brand-bg-alt border border-brand-border rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-[0.03] pointer-events-none">
                    <Bell className="w-40 h-40 text-brand-brown" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                        devicePermission === 'granted' ? 'bg-green-500 animate-pulse' :
                        devicePermission === 'denied' ? 'bg-red-400' : 'bg-amber-400 shadow-sm'
                      }`} />
                      <h4 className="font-sans text-lg font-bold text-brand-text flex items-center gap-1.5">
                        Device Notification Center
                      </h4>
                    </div>
                    <p className="text-sm text-brand-brown-light leading-relaxed max-w-2xl">
                      Stay updated instantly on your device! Receive native push alerts and chime sounds when admin approves your learning updates, or when timely goal reflection questions are prompted.
                    </p>
                    
                    {window.self !== window.top && devicePermission !== 'granted' && (
                      <p className="text-xs bg-amber-50 text-amber-800 border border-amber-200 p-2.5 rounded-xl font-medium mt-2">
                        💡 <strong>Iframe Notice:</strong> Inside this embedded workspace view, standard browser permission popups may be blocked. To enable native system alerts, click the <strong>"Open App in New Tab"</strong> button in your header and grant permissions there!
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 w-full md:w-auto shrink-0 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        playNotificationSound();
                        notificationService.notify(
                          "🛎️ Test Sound Activated!",
                          "Your device is successfully tuned for Wisdom Lounge auditory alerts."
                        );
                      }}
                      className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-brown border border-brand-border rounded-xl bg-brand-white hover:bg-brand-beige active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4 text-brand-brown-light" />
                      Play Chime Test
                    </button>

                    {devicePermission === 'granted' ? (
                      <div className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 rounded-xl flex items-center justify-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        System Push Active
                      </div>
                    ) : devicePermission === 'denied' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await notificationService.requestPermission();
                          if (result === 'denied') {
                            alert("Notifications are locked by your browser settings. To unlock them, tap the lock/settings icon next to your URL bar, allow 'Notifications', and reload the page.");
                          }
                        }}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-red-500" />
                        Alerts Blocked (Tap to Unlock)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await notificationService.requestPermission();
                          if (res === 'granted') {
                            notificationService.notify(
                              "🎉 Alerts Enabled!",
                              "Alhamdulillah! You will now receive system notifications on this device."
                            );
                          }
                        }}
                        className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-offwhite bg-brand-brown hover:bg-brand-brown-dark rounded-xl shadow hover:shadow-md hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Bell className="w-4 h-4" />
                        Enable Push Alerts
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Tab Content wrapper */}
          {activeSubTab === 'dashboard' && (
            <>
              {/* Status & Next Tier Progress Container */}
              <div className="bg-brand-white border border-brand-border rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                  
                  {/* CURRENT STATUS */}
                  <div className={`w-full flex items-center gap-5 border-brand-border ${statusProgress.next ? 'md:w-1/2 border-b md:border-b-0 md:border-r pb-8 md:pb-0 md:pr-8' : ''}`}>
                    <div className="w-16 h-16 bg-brand-beige rounded-full flex items-center justify-center shrink-0 border border-brand-border text-brand-brown">
                      <Medal className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-brown-light mb-1">Current Status</p>
                      <h4 className="font-sans text-2xl font-bold text-brand-text mb-2">{currentStatus.name}</h4>
                      <ul className="space-y-1">
                        {currentStatus.perks.map((perk, idx) => (
                          <li key={idx} className="text-xs font-medium text-brand-brown flex items-center gap-2 group/perk">
                            <span className="w-1.5 h-2 rounded-full bg-brand-brown shrink-0" />
                            {perk}
                            <div className="cursor-help text-brand-brown/40 hover:text-brand-brown transition-colors relative flex items-center">
                                <Info className="w-3 h-3" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-brand-text text-brand-beige text-xs px-2 py-1 rounded opacity-0 group-hover/perk:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                    Requires {currentStatus.requiredBadges} Badges
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-spacing-0 border-4 border-transparent border-t-brand-text" />
                                </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* NEXT TIER PROG */}
                  {statusProgress.next && (
                    <div className="w-full md:w-1/2">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-brown-light mb-1">Next Tier</p>
                          <h4 className="font-sans text-lg font-bold text-brand-text">{statusProgress.next.name}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-brand-brown">{statusProgress.badgesNeeded} Badge{statusProgress.badgesNeeded !== 1 ? 's' : ''} Needed</p>
                        </div>
                      </div>
                      <div className="h-3 bg-brand-beige border border-brand-border rounded-full overflow-hidden w-full relative mb-4">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${statusProgress.progressPercent}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-brand-brown"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-brown-light mb-2">Unlocks Perks</p>
                        <ul className="space-y-1">
                          {statusProgress.next.perks.map((perk, idx) => (
                            <li key={idx} className="text-xs font-medium text-brand-brown/70 flex items-center gap-2">
                               <span className="w-1 h-1 rounded-full bg-brand-brown/40 shrink-0" />
                               {perk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

          {/* Current Focus Banner */}
          <div className="bg-brand-brown p-6 sm:p-8 rounded-3xl shadow-sm border border-brand-brown overflow-hidden relative group">
            <div className="absolute -right-6 -top-6 opacity-5 sm:opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110">
               <BookOpen className="w-48 h-48 text-brand-beige" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 w-full space-y-6">
                <div className="flex justify-between items-center w-full">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-beige/50">Active Focuses</h3>
                  {(!activeLearner.isPaused || isAdmin) && (
                    <button 
                      onClick={() => {
                        setFocusDomain(APP_DOMAINS[0]?.type || 'book');
                        setFocusTargetDomain('');
                        setFocusTitle('');
                        setFocusAuthor('');
                        setIsFocusModalOpen(true);
                      }}
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-brown bg-brand-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all text-center"
                    >
                      Add Focus
                    </button>
                  )}
              </div>

              {/* Dynamic Focus Reminders & Checkpoints (Horizontal Slide Layout) */}
              {(reminders.filter(r => r.status === 'pending' || (r.status === 'declined' && !r.learnerRead)).length > 0 || reminders.filter(r => r.status === 'answered' || (r.status === 'declined' && r.learnerRead)).length > 0) && (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 sm:p-5 mb-6 text-brand-offwhite space-y-3 shadow-inner">
                  {/* Section Header with Navigation Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                    <div className="flex items-center gap-2.5 text-amber-300">
                      <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30 shrink-0">
                        <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-sans text-base sm:text-lg font-bold text-amber-200 leading-snug">
                          Progress Checks & Gentle Alerts
                        </h4>
                        <p className="text-[11px] text-brand-beige/70 font-medium">
                          Swipe or use arrows to review your pending updates
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full">
                        {reminders.filter(r => r.status === 'pending' || (r.status === 'declined' && !r.learnerRead)).length}{' '}
                        {reminders.filter(r => r.status === 'pending' || (r.status === 'declined' && !r.learnerRead)).length === 1 ? 'Alert' : 'Alerts'}
                      </span>
                      {reminders.filter(r => r.status === 'pending' || (r.status === 'declined' && !r.learnerRead)).length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (remindersScrollRef.current) {
                                remindersScrollRef.current.scrollBy({ left: -340, behavior: 'smooth' });
                              }
                            }}
                            className="p-1.5 bg-brand-brown/80 hover:bg-brand-brown border border-amber-500/30 rounded-lg text-amber-200 transition-all active:scale-95 shadow-sm"
                            title="Previous Alert"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (remindersScrollRef.current) {
                                remindersScrollRef.current.scrollBy({ left: 340, behavior: 'smooth' });
                              }
                            }}
                            className="p-1.5 bg-brand-brown/80 hover:bg-brand-brown border border-amber-500/30 rounded-lg text-amber-200 transition-all active:scale-95 shadow-sm"
                            title="Next Alert"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Scroll Track */}
                  {reminders.filter(r => r.status === 'pending' || (r.status === 'declined' && !r.learnerRead)).length > 0 && (
                    <div 
                      ref={remindersScrollRef}
                      className="flex overflow-x-auto gap-4 pb-3 pt-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none [&::-webkit-scrollbar]:hidden"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {reminders.filter(r => r.status === 'pending' || (r.status === 'declined' && !r.learnerRead)).map((reminder) => {
                        const isOverdue = isTargetDateExceeded(reminder.targetDate) || isTargetDateExceeded(reminder.newTargetDate);
                        return (
                          <div 
                            key={reminder.id} 
                            className={`w-[300px] sm:w-[360px] shrink-0 snap-start p-4 rounded-xl flex flex-col justify-between shadow-md space-y-3 transition-all ${
                              isOverdue 
                                ? 'bg-gradient-to-b from-red-950/95 via-red-900/90 to-brand-brown-dark/95 border-2 border-red-500/70 shadow-red-950/50 ring-1 ring-red-500/30 text-red-50' 
                                : 'bg-brand-brown-dark/95 border border-amber-500/30'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                {isOverdue ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border bg-red-600 text-white border-red-400 shadow-sm animate-pulse">
                                    <AlertTriangle className="w-3 h-3 text-yellow-300 shrink-0" /> Target Date Exceeded (-5 Wisdom Score)
                                  </span>
                                ) : (
                                  <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${reminder.status === 'declined' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-amber-500/20 text-yellow-250 border-amber-500/20'}`}>
                                    {reminder.status === 'declined' ? 'Admin Follow-up / Declined' : (reminder.type === 'deadline' ? 'Expected Completion Date Approaching' : 'Gentle Progress Check-In')}
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-brand-beige/50 shrink-0">
                                  {formatDateDDMMYYYY(reminder.createdAt)}
                                </span>
                              </div>

                              <p className="text-sm font-medium leading-relaxed font-sans text-brand-beige/95 italic">
                                "{reminder.questionText}"
                              </p>

                              {isOverdue && (
                                <div className="p-2.5 bg-red-950/90 border border-red-500/50 rounded-xl space-y-1 text-xs shadow-inner">
                                  <p className="text-red-200 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-300" /> Target Date Passed: {formatDateDDMMYYYY(reminder.newTargetDate || reminder.targetDate)}
                                  </p>
                                  <p className="text-red-100 text-[11px] leading-snug italic">
                                    Learning target date has expired. A -5 Wisdom Score deduction applies until target date is updated or completed.
                                  </p>
                                </div>
                              )}

                              {(() => {
                                if (reminder.focusDomain === 'book') {
                                  const focus = activeLearner.currentFocuses?.find(
                                    f => f.id === reminder.focusId || (f.title === reminder.focusTitle && f.domain === 'book')
                                  );
                                  if (focus && focus.totalPages) {
                                    const startDate = new Date(focus.createdAt);
                                    const targetDate = new Date(focus.estimatedDuration || reminder.targetDate);
                                    const now = new Date();
                                    
                                    startDate.setHours(0,0,0,0);
                                    targetDate.setHours(0,0,0,0);
                                    now.setHours(0,0,0,0);

                                    const totalDurationDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                    if (totalDurationDays > 0) {
                                      const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                      const progressRatio = Math.max(0, Math.min(1, daysPassed / totalDurationDays));
                                      const expectedPages = Math.round(progressRatio * focus.totalPages);
                                      
                                      return (
                                        <div className="mt-2.5 p-3 bg-brand-beige/10 border border-brand-beige/20 rounded-xl space-y-1 text-xs">
                                          <p className="text-amber-200 font-bold uppercase tracking-wider text-[10px]">📊 Page Tracking & Progress Plan</p>
                                          <p className="text-brand-beige/90 font-sans italic text-sm">
                                            By now you should be around <span className="text-amber-300 font-extrabold text-base not-italic">{expectedPages}</span> pages in (out of {focus.totalPages} total pages).
                                          </p>
                                          <p className="text-[10px] text-brand-beige/65">
                                            Plan started on {formatDateDDMMYYYY(focus.createdAt)} to complete by {formatDateDDMMYYYY(focus.estimatedDuration || reminder.targetDate)} ({totalDurationDays} days total)
                                          </p>
                                        </div>
                                      );
                                    }
                                  }
                                }
                                return null;
                              })()}

                              {reminder.status === 'declined' && reminder.adminMessage && (
                                <div className="mt-2 bg-red-900/30 border border-red-500/30 p-3 rounded-lg">
                                  <p className="text-xs text-red-200 font-semibold mb-1">Admin Message:</p>
                                  <p className="text-sm text-red-100 italic">"{reminder.adminMessage}"</p>
                                </div>
                              )}
                            </div>

                            {/* Quick Actions */}
                            {reminder.status === 'declined' ? (
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-500/15">
                                <button
                                  onClick={() => {
                                    import('../services/reminderService').then(({ reminderService }) => {
                                      reminderService.markAsRead(reminder.id, 'learner');
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-brand-white text-brand-brown hover:bg-brand-offwhite text-[10px] font-black uppercase tracking-wider rounded-lg shadow transition-all active:scale-95 flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" /> Acknowledge
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveReplyReminderId(reminder.id);
                                    setReplyType('text');
                                  }}
                                  className="px-3 py-1.5 bg-red-600/40 hover:bg-red-705 border border-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow transition-all active:scale-95"
                                >
                                  🤝 Reply to Admin
                                </button>
                              </div>
                            ) : activeReplyReminderId !== reminder.id ? (
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-500/15">
                                <button
                                  onClick={() => handleReminderResponse(reminder, 'on_track')}
                                  className="px-3 py-1.5 bg-brand-white text-brand-brown hover:bg-brand-offwhite text-[10px] font-black uppercase tracking-wider rounded-lg shadow transition-all active:scale-95"
                                >
                                  👍 On Track
                                </button>
                                <button
                                  onClick={() => handleReminderResponse(reminder, 'completed')}
                                  className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow border border-green-600 transition-all active:scale-95"
                                >
                                  🎉 I Finished!
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveReplyReminderId(reminder.id);
                                    setReplyType('date');
                                    setReplyDate(reminder.targetDate);
                                  }}
                                  className="px-3 py-1.5 bg-amber-600/50 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow border border-amber-500 transition-all active:scale-95"
                                >
                                  📅 Adjust Date
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveReplyReminderId(reminder.id);
                                    setReplyType('text');
                                  }}
                                  className="px-3 py-1.5 bg-red-600/40 hover:bg-red-705 border border-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow transition-all active:scale-95"
                                >
                                  🤝 Struggling / Need Support
                                </button>
                              </div>
                            ) : (
                              <div className="bg-brand-brown-dark/50 p-3 rounded-xl border border-brand-beige/15 space-y-3 mt-2">
                                {replyType === 'date' ? (
                                  <div className="space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-beige/70">
                                      Choose New Target Completion Date
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                      <input
                                        type="date"
                                        lang="en-GB"
                                        value={replyDate}
                                        onChange={(e) => setReplyDate(e.target.value)}
                                        className="px-3 py-2 bg-brand-brown text-brand-offwhite border border-brand-border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-beige flex-1 min-w-[130px]"
                                      />
                                      <button
                                        disabled={isReminderSubmitting}
                                        onClick={() => handleReminderResponse(reminder, 'rescheduled', undefined, replyDate)}
                                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all active:scale-95"
                                      >
                                        {isReminderSubmitting ? 'Saving...' : 'Confirm Date'}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveReplyReminderId(null);
                                          setReplyType(null);
                                        }}
                                        className="px-3 py-2 bg-brand-beige/10 hover:bg-brand-beige/25 text-brand-beige text-xs font-bold uppercase tracking-wider rounded-md transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-beige/70">
                                      What are you struggling with? Let us know in detail:
                                    </label>
                                    <textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder="e.g. Finding the concepts tricky, would love a practice session or some articles..."
                                      className="w-full h-20 p-3 bg-brand-brown text-brand-offwhite border border-brand-beige/20 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-beige resize-none text-brand-offwhite"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => {
                                          setActiveReplyReminderId(null);
                                          setReplyType(null);
                                          setReplyText('');
                                        }}
                                        className="px-3 py-2 bg-brand-beige/10 hover:bg-brand-beige/25 text-brand-beige text-xs font-bold uppercase tracking-wider rounded-md transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        disabled={isReminderSubmitting || !replyText.trim()}
                                        onClick={() => handleReminderResponse(reminder, 'struggling', replyText)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all active:scale-95 disabled:opacity-40"
                                      >
                                        {isReminderSubmitting ? 'Sending...' : 'Send Message to Admin'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Previous Reminders & Checkpoint History Drawer */}
                  {reminders.filter(r => r.status === 'answered' || (r.status === 'declined' && r.learnerRead)).length > 0 && (
                    <div className="pt-2 border-t border-amber-500/20 mt-3">
                      <button
                        type="button"
                        onClick={() => setShowPastReminders(!showPastReminders)}
                        className="text-xs font-bold text-amber-300/90 hover:text-amber-200 flex items-center gap-1.5 transition-colors py-1"
                      >
                        <span>{showPastReminders ? 'Hide Previous Reminders & History' : `View Previous Alerts & History (${reminders.filter(r => r.status === 'answered' || (r.status === 'declined' && r.learnerRead)).length})`}</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPastReminders ? 'rotate-90' : ''}`} />
                      </button>

                      {showPastReminders && (
                        <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                          {reminders.filter(r => r.status === 'answered' || (r.status === 'declined' && r.learnerRead)).map((pastR) => {
                            const wasOverdue = isTargetDateExceeded(pastR.targetDate) || isTargetDateExceeded(pastR.newTargetDate);
                            return (
                              <div 
                                key={pastR.id} 
                                className={`p-3 rounded-xl border text-xs space-y-2 ${wasOverdue ? 'bg-red-950/40 border-red-500/40 text-red-100' : 'bg-brand-brown-dark/70 border-brand-beige/15 text-brand-beige/90'}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${wasOverdue ? 'bg-red-600/90 text-white border-red-400 flex items-center gap-1' : 'bg-brand-beige/15 text-brand-beige border-brand-beige/20'}`}>
                                      {wasOverdue && <AlertTriangle className="w-2.5 h-2.5 text-yellow-300" />}
                                      {wasOverdue ? 'Target Exceeded (-5 Wisdom)' : 'Resolved Checkpoint'}
                                    </span>
                                    <span className="text-[10px] text-brand-beige/60 font-semibold">
                                      Focus: {pastR.focusTitle}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-brand-beige/50">
                                    {formatDateDDMMYYYY(pastR.respondedAt || pastR.createdAt)}
                                  </span>
                                </div>

                                <p className="font-sans italic text-xs text-brand-offwhite">
                                  "{pastR.questionText}"
                                </p>

                                {pastR.responseText && (
                                  <div className="p-2 bg-brand-brown/80 rounded-lg border border-brand-beige/10">
                                    <span className="text-[10px] font-bold text-amber-300/90 uppercase block mb-0.5">Your Response:</span>
                                    <p className="text-xs text-brand-beige/90">{pastR.responseText}</p>
                                  </div>
                                )}

                                {wasOverdue && (
                                  <p className="text-[10px] font-semibold text-red-300 flex items-center gap-1">
                                    <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
                                    Target date ({formatDateDDMMYYYY(pastR.newTargetDate || pastR.targetDate)}) was exceeded.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeLearner.currentFocuses && activeLearner.currentFocuses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeLearner.currentFocuses.map((focus) => {
                      const isFocusOverdue = isTargetDateExceeded(focus.estimatedDuration || focus.presentationTargetDate);
                      return (
                      <div 
                        key={focus.id || focus.title} 
                        className={`p-5 rounded-2xl border flex flex-col justify-between relative overflow-hidden pb-6 transition-all ${
                          isFocusOverdue 
                            ? 'bg-gradient-to-br from-red-950/90 via-red-900/50 to-brand-brown-dark/95 border-2 border-red-500/60 shadow-lg shadow-red-950/50 ring-2 ring-red-500/30 text-red-100' 
                            : 'bg-brand-brown-dark/30 border-brand-beige/10'
                        }`}
                      >
                        <div>
                          {(() => {
                            const { displayTitle } = getModuleDisplayAndBatch(focus.title);
                            return (
                              <>
                                <h4 className="font-sans text-xl sm:text-2xl font-bold text-brand-offwhite mb-2 leading-tight">
                                  {displayTitle}
                                </h4>
                                {focus.author && (
                                  <p className="text-sm text-brand-brown-light/80 italic mb-2">
                                    by {focus.author}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            {(() => {
                              const { batchName } = getModuleDisplayAndBatch(focus.title);
                              return batchName ? (
                                <p className="text-[10px] font-bold text-amber-200 bg-amber-500/20 inline-block px-2 py-1 rounded-md border border-amber-500/30 tracking-wider">
                                  Batch: {batchName}
                                </p>
                              ) : null;
                            })()}
                            {(() => {
                              const label = APP_DOMAINS.find(d => d.type === focus.domain)?.label || focus.domain;
                              const dLower = label.toLowerCase().trim();
                              
                              let displayLabel = label;
                              if (dLower === 'the exegesis of the noble quran' || dLower === 'surah nisaa') {
                                displayLabel = 'TAFSIR';
                              } else if (dLower === 'the legacy of the beloved ﷺ' || dLower === 'living like the beloved prophet_ﷺ' || dLower === 'living like the beloved prophet ﷺ' || dLower === 'living like the beloved prophet') {
                                displayLabel = 'SEERAH';
                              } else if (dLower === 'dowra e quran' || dLower === 'islamic year ١٤٤٧.ھ') {
                                displayLabel = 'QURAN';
                              }
                              
                              return (
                                <p className="text-[10px] font-medium text-brand-beige/80 bg-brand-beige/10 inline-block px-2 py-1 rounded-md border border-brand-beige/20 uppercase tracking-wider">
                                  {displayLabel}
                                </p>
                              );
                            })()}
                            {focus.domain === 'research papers/article' && (
                              <p className="text-[10px] font-bold text-amber-200 bg-amber-500/20 inline-block px-2 py-1 rounded-md border border-amber-500/30 tracking-wider uppercase">
                                {focus.isResearchPaper ? '📑 Research Paper' : '📰 Article Study'}
                                {focus.isSeries ? ` · 📚 Series (${focus.seriesCount || 2} Pieces)` : ''}
                              </p>
                            )}
                            {focus.estimatedDuration && (() => {
                              let displayVal = focus.estimatedDuration;
                              const dLower = displayVal.toLowerCase().trim();
                              
                              if (dLower === '2 months' && focus.domain === 'tafsir') displayVal = '2026-08-14';
                              else if (dLower === '2 months' && focus.domain === 'seerah') displayVal = '2026-08-14';
                              else if (dLower === '30 days') displayVal = '2026-07-14';
                              else if (dLower === '2 months') displayVal = '2026-08-14';

                              const isDateRegex = /^\d{4}-\d{2}-\d{2}$/;
                              const isOver = isTargetDateExceeded(displayVal);
                              return (
                              <p 
                                className={`text-[10px] font-medium inline-block px-2 py-1 rounded-md border tracking-wider cursor-help ${
                                  isOver 
                                    ? 'bg-red-600 text-white border-red-400 font-bold animate-pulse flex items-center gap-1' 
                                    : 'text-brand-beige/80 bg-brand-beige/10 border-brand-beige/20'
                                }`}
                                title={isDateRegex.test(displayVal) && !isNaN(new Date(displayVal).getTime()) ? formatDateFull(displayVal) : ""}
                              >
                                  {isOver && <AlertTriangle className="w-3 h-3 text-yellow-300" />}
                                  {(isDateRegex.test(displayVal) && !isNaN(new Date(displayVal).getTime()))
                                    ? (isOver ? `Overdue Target: ${formatDateDDMMYYYY(displayVal)}` : `Target: ${formatDateDDMMYYYY(displayVal)}`)
                                    : `Target: ${displayVal}`}
                                </p>
                              );
                            })()}
                            {focus.location === 'personal' && (
                              <p className="text-[10px] font-medium text-amber-200/90 bg-amber-500/20 inline-block px-2 py-1 rounded-md border border-amber-500/30 tracking-wider">
                                Personal (Needs overview)
                              </p>
                            )}
                            {focus.domain === 'task' && focus.estimatedDuration && (() => {
                              if (/^\d{4}-\d{2}-\d{2}$/.test(focus.estimatedDuration)) {
                                const targetDate = new Date(focus.estimatedDuration);
                                if (!isNaN(targetDate.getTime())) {
                                  const today = new Date();
                                  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
                                  const targetMs = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                                  const diffDays = Math.ceil((targetMs - todayMs) / (1000 * 60 * 60 * 24));
                                  if (diffDays >= 0 && diffDays <= 3) {
                                    return (
                                      <p className="text-[10px] font-bold text-red-700 bg-red-100 dark:text-red-100 dark:bg-red-600/80 inline-block px-2 py-1 rounded-md border border-red-500/30 tracking-wider animate-pulse flex items-center gap-1">
                                        ⚠️ Due Soon
                                      </p>
                                    );
                                  }
                                }
                              }
                              return null;
                            })()}
                          </div>

                          {isFocusOverdue && (
                            <div className="mt-3 p-2.5 bg-red-950/90 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs text-red-100 shadow-sm">
                              <TrendingDown className="w-4 h-4 text-red-300 shrink-0" />
                              <div>
                                <span className="font-bold text-red-200 uppercase tracking-wider text-[10px] block">-5 Wisdom Score Penalty Active</span>
                                <span className="text-[11px] text-red-100/90">Target date has expired. Complete focus or update target date to clear score deduction!</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
                          {(!activeLearner.isPaused || isAdmin) && (
                            <>
                              <button 
                                onClick={async () => {
                                  const remaining = activeLearner.currentFocuses?.filter(f => f.id !== focus.id) || [];
                                  const { learnerService } = await import('../services/learnerService');
                                  await learnerService.updateLearner(activeLearner.id, { currentFocuses: remaining });
                                  if (focus.id) {
                                    try {
                                      await requestService.deleteRequest(focus.id);
                                      await reminderService.deleteRemindersByFocusId(focus.id);
                                      await reminderService.addReminder({
                                        learnerId: activeLearner.id,
                                        learnerName: activeLearner.fullName,
                                        focusId: focus.id || 'abandoned-' + Date.now(),
                                        focusTitle: focus.title,
                                        focusDomain: focus.domain,
                                        targetDate: focus.estimatedDuration || '',
                                        createdAt: new Date().toISOString(),
                                        type: 'abandon',
                                        status: 'answered',
                                        questionText: `This focus has been abandoned by the learner.`,
                                        responseText: `${activeLearner.fullName} abandoned the focus on "${focus.title}" (${(focus.domain || 'focus').toUpperCase()}).`,
                                        adminRead: false,
                                        learnerRead: true
                                      });
                                    } catch (err) {
                                      console.error("Failed to delete focus and notify admin:", err);
                                    }
                                  }
                                }}
                                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-brown-light bg-brand-white rounded-lg shadow hover:bg-brand-offwhite hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex justify-center items-center gap-1 border border-brand-border"
                              >
                                Abandon
                              </button>
                              {(focus.isLoungeModule === true || (focus.isLoungeModule === undefined && focus.location === 'lounge' && ['seerah', 'tafsir', 'dowra'].includes(focus.domain))) && (
                                <button 
                                  onClick={() => {
                                    setSelectedFocusTracker(focus);
                                    setTrackerMonth(new Date());
                                    setIsTrackerModalOpen(true);
                                  }}
                                  className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-white bg-indigo-600/90 rounded-lg shadow hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all border border-indigo-600 flex justify-center items-center gap-1"
                                >
                                  <Calendar className="w-3 h-3" />
                                  Tracker
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setRequestType(focus.domain);
                                  
                                  if (focus.domain === 'talaqqi') {
                                    setRequestSubject(focus.title);
                                    setRequestUstadName(focus.author || '');
                                  } else {
                                    setItemTitle(focus.title);
                                    setItemAuthor(focus.author || '');
                                  }

                                  const loc = focus.location || 'personal';
                                  setRequestLocation(loc);
                                  if (loc === 'lounge') {
                                    if (focus.domain === 'book') {
                                      setRequestSelectedCircleId(focus.moduleId || '');
                                    } else if (['tafsir', 'seerah', 'dowra'].includes(focus.domain)) {
                                      setRequestSelectedModuleId(focus.moduleId || '');
                                    }
                                  }
                                  
                                  setCompletionDate(new Date().toISOString().split('T')[0]);
                                  setIsRequestModalOpen(true);
                                }}
                                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-white bg-green-700/80 rounded-lg shadow hover:bg-green-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all border border-green-600 flex justify-center items-center gap-1"
                              >
                                Mark Complete
                              </button>
                            </>
                          )}
                        </div>
                        {(() => {
                          if (!focus.createdAt || !focus.estimatedDuration) return null;
                          let displayVal = focus.estimatedDuration;
                          const dLower = displayVal.toLowerCase().trim();
                          if (dLower === '2 months' && focus.domain === 'tafsir') displayVal = '2026-08-14';
                          else if (dLower === '2 months' && focus.domain === 'seerah') displayVal = '2026-08-14';
                          else if (dLower === '30 days') displayVal = '2026-07-14';
                          else if (dLower === '2 months') displayVal = '2026-08-14';
                          
                          const isDateRegex = /^\d{4}-\d{2}-\d{2}$/;
                          if (isDateRegex.test(displayVal)) {
                            const targetMs = new Date(displayVal).getTime();
                            const startMs = new Date(focus.createdAt).getTime();
                            if (!isNaN(targetMs) && !isNaN(startMs)) {
                              const nowMs = new Date().getTime();
                              let progress = 0;
                              if (nowMs >= targetMs) progress = 100;
                              else if (nowMs <= startMs) progress = 0;
                              else progress = ((nowMs - startMs) / (targetMs - startMs)) * 100;
                              
                              return (
                                <div className="absolute bottom-0 left-0 w-full h-3 bg-brand-beige/20">
                                  <div className="h-full bg-brand-beige transition-all duration-1000 rounded-r-md" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}></div>
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <div className="py-2">
                    <h4 className="font-sans text-2xl text-brand-beige border-b border-brand-beige/20 border-dashed pb-1 inline-block">
                      No active focuses. Establish your path!
                    </h4>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bucket List Section */}
          <div className="bg-brand-white p-6 sm:p-8 rounded-3xl border border-brand-border shadow-sm mt-8 relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="font-sans text-2xl font-bold text-brand-text flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                  <span>My Bucket List</span>
                </h3>
                <p className="text-brand-brown-light text-xs mt-1 font-medium">Future learning books, presentations, courses, and modules you want to conquer next.</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setBucketItemTitle('');
                  setBucketItemAuthor('');
                  setBucketItemDomain('book');
                  setBucketItemNotes('');
                  setIsBucketModalOpen(true);
                }}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-white bg-brand-brown rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all text-center shrink-0 cursor-pointer"
              >
                + Add To Bucket List
              </button>
            </div>

            {activeLearner.bucketList && activeLearner.bucketList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLearner.bucketList.map((item) => {
                  const domainObj = APP_DOMAINS.find(d => d.type === item.domain);
                  const domainLabel = domainObj ? domainObj.label : item.domain;
                  
                  return (
                    <div 
                      key={item.id} 
                      className="bg-brand-offwhite/40 hover:bg-brand-offwhite/80 p-5 rounded-2xl border border-brand-border-light transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="font-sans text-lg font-bold text-brand-text leading-tight">
                            {item.title}
                          </h4>
                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-brown-light bg-brand-beige/25 px-2 py-1 rounded border border-brand-border">
                            {domainLabel}
                          </span>
                        </div>

                        {item.author && (
                          <p className="text-xs text-brand-brown-light italic mb-3">
                            by {item.author}
                          </p>
                        )}

                        {item.notes && (
                          <div className="mt-2 bg-white/50 border border-brand-border-light/60 p-3 rounded-xl">
                            <span className="text-[9px] font-black text-brand-brown-light uppercase tracking-wider block mb-1">Notes / Why I want to study:</span>
                            <p className="text-xs text-brand-brown/85 font-medium leading-relaxed italic">
                              "{item.notes}"
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-brand-border-light/40 w-full">
                        <button
                          type="button"
                          onClick={() => handleActivateBucketItem(item)}
                          className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-white bg-brand-brown hover:bg-brand-brown-dark rounded-lg shadow-xs transition-all flex justify-center items-center gap-1 cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          Activate Focus
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromBucketList(item.id)}
                          className="px-3 py-1.5 text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex justify-center items-center gap-1 cursor-pointer"
                          title="Remove from Bucket List"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-brand-border/60 rounded-2xl bg-brand-offwhite/10">
                <p className="text-brand-brown-light text-sm font-medium">Your learning bucket list is currently empty.</p>
                <p className="text-brand-brown-light/60 text-xs mt-1">Dream big! Put classical texts, upcoming research projects, or target Islamic books on your bucket list.</p>
              </div>
            )}
          </div>

          {/* Pending Approvals */}
          {pendingRequests.length > 0 && (
            <div className="bg-brand-white border-2 border-dashed border-orange-200 p-8 rounded-[2rem] shadow-[0_20px_50px_-20px_rgba(249,115,22,0.1)] space-y-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-sans text-lg font-bold text-orange-950">Pending Approval</h4>
                  <p className="text-orange-700/80 text-xs font-medium uppercase tracking-wider">The wisdom lounge is reviewing your progress</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 relative z-10">
                {pendingRequests.map(req => {
                  const domain = APP_DOMAINS.find(d => d.type === req.type);
                  const domainLabel = domain ? domain.label : req.type;
                  
                  return (
                    <div key={req.id} className="bg-orange-50/50 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-orange-100 text-[10px] font-black uppercase tracking-widest text-orange-800 flex items-center gap-2 shadow-sm transition-all hover:bg-orange-100">
                      <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span>
                      {domainLabel}: {toTitleCase(req.details.title) || `${req.details.count} Completed`} {req.details.author ? `by ${toTitleCase(req.details.author)}` : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-brand-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-brand-border group transition-all hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-4 mb-8 pb-5 border-b border-brand-border-light">
                <div className="w-12 h-12 bg-brand-beige rounded-2xl flex items-center justify-center text-brand-brown shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-sans text-2xl font-bold text-brand-text">Wisdom Balance</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-brown-light opacity-60">Domains & Modules overview</p>
                </div>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                    <PolarGrid stroke="#EBE5DB" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#5A4633', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }} />
                    <Radar
                      name={activeLearner.fullName}
                      dataKey="A"
                      stroke="#5A4633"
                      strokeWidth={2}
                      fill="#5A4633"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-brand-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-brand-border group transition-all hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-4 mb-8 pb-5 border-b border-brand-border-light">
                <div className="w-12 h-12 bg-brand-beige rounded-2xl flex items-center justify-center text-brand-brown shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-sans text-2xl font-bold text-brand-text">Activity Distribution</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-brown-light opacity-60">Contribution breakdown</p>
                </div>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#5A4633', fontSize: 11, fontWeight: 600 }} width={120} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(235, 229, 219, 0.4)', radius: 12 }} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -10px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif', padding: '12px 16px' }} 
                    />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={25}>
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Activity Momentum Feed (Boundary card removed, integrated full screen element) */}
          <div className="mt-12 relative w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans text-2xl font-bold text-brand-text flex items-center gap-2">
                    Momentum Timeline
                    {timelineActivities.some(r => r.status === 'approved' && !r.isFocus) && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500 text-brand-offwhite text-[9px] font-black uppercase tracking-widest animate-[bounce_1.5s_infinite]">
                        Active
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-brown-light opacity-60">
                    Your real-time horizontal linear progression log of module milestones & accomplishments.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <span className="text-xs font-bold text-brand-brown-light bg-brand-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-brand-border-light shadow-sm flex items-center gap-1.5 font-mono">
                  <Activity className="w-3.5 h-3.5 text-brand-brown" />
                  {timelineActivities.filter(r => r.status === 'approved' && !r.isFocus).length} Accomplishments
                </span>
              </div>
            </div>

            {timelineActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-brand-brown-light bg-brand-white p-8 rounded-[2rem] border border-brand-border mx-2">
                <div className="w-16 h-16 bg-brand-bg-alt rounded-full flex items-center justify-center mb-4 border border-brand-border-light">
                  <Sparkles className="w-8 h-8 text-brand-brown-light opacity-65" />
                </div>
                <h4 className="font-sans italic text-lg font-bold text-brand-text mb-1">Your Momentum Feed is Quiet</h4>
                <p className="text-xs max-w-md opacity-75">
                  When you submit updates for tasks, presentations, or books, they will display on this interactive layout to map your spiritual and intellectual progress!
                </p>
              </div>
            ) : (
              <div className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden py-4">
                {/* Visual fading overlays on both ends across the full screen width */}
                <div className="absolute left-0 top-0 bottom-0 w-24 md:w-56 bg-gradient-to-r from-brand-bg via-brand-bg/95 to-transparent pointer-events-none z-20" />
                <div className="absolute right-0 top-0 bottom-0 w-24 md:w-56 bg-gradient-to-l from-brand-bg via-brand-bg/95 to-transparent pointer-events-none z-20" />

                {/* Horizontal Scrolling Track Container */}
                <div className="overflow-x-auto relative scrollbar-none scroll-smooth snap-x snap-mandatory min-h-[350px]">
                  {/* Inner Container to hold scrollable nodes and scale connection line correctly */}
                  <div className="flex gap-8 pb-10 pt-16 px-[25vw] relative min-w-max">
                    {/* Master Thick Horizontal Connection Line spanning the entire scrollable content area in bright orange */}
                    <div className="absolute left-[calc(25vw+144px)] md:left-[calc(25vw+160px)] right-[calc(25vw+144px)] md:right-[calc(25vw+160px)] top-[72px] -translate-y-1/2 h-2 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0 shadow-[0_0_12px_rgba(249,115,22,0.4)] pointer-events-none z-10" />

                    {[...timelineActivities]
                    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
                    .map((act, index, arr) => {
                      const domainInfo = APP_DOMAINS.find(d => d.type === act.type);
                      const domainLabel = domainInfo ? domainInfo.label : act.type;
                      const isApproved = act.status === 'approved';
                      const isPending = act.status === 'pending';
                      const isRejected = act.status === 'rejected';

                      // Determine if this is an active focus or a completed one
                      const isActiveFocus = act.isFocus && activeLearner.currentFocuses?.some(f => {
                        const fNorm = f.domain.endsWith('s') ? f.domain.slice(0, -1) : f.domain;
                        const actNorm = act.type.endsWith('s') ? act.type.slice(0, -1) : act.type;
                        return f.id === act.id || 
                          f.id + "-focus" === act.id ||
                          act.id.startsWith(f.id + "-dup-") ||
                          (f.title.toLowerCase().trim() === act.details?.title?.toLowerCase().trim() && fNorm === actNorm);
                      });

                      // Determine formatted date of completion
                      const dateObj = act.details?.completedAt || act.requestedAt;
                      const completionDate = formatDateDDMMYYYY(dateObj);

                      // Determine study domains or points value
                      let pts = 2; // Baseline focus init size
                      if (act.isFocus) {
                        pts = 2;
                      } else if (act.type === 'book') {
                        pts = 5;
                      } else if (act.type === 'presentation') {
                        pts = 10;
                      } else if (act.type === 'task') {
                        pts = act.details?.count || 1;
                      } else if (['seerah', 'research papers/article', 'tafsir', 'dowra'].includes(act.type)) {
                        if (act.type === 'research papers/article') {
                          const base = act.details?.isResearchPaper ? 30 : 15;
                          const pieces = act.details?.isSeries ? Math.max(2, Number(act.details?.seriesCount) || 2) : 1;
                          pts = base * pieces;
                        } else {
                          pts = 15;
                        }
                      }

                      // Define icon theme parameters
                      let iconBg = "bg-brand-bg-alt text-brand-brown border-brand-border-light";
                      let iconEl = <Sparkles className="w-5 h-5" />;

                      if (act.type === 'book') {
                        iconBg = "bg-emerald-50 text-emerald-800 border-emerald-100";
                        iconEl = <BookOpen className="w-5 h-5" />;
                      } else if (act.type === 'presentation') {
                        iconBg = "bg-indigo-50 text-indigo-800 border-indigo-100";
                        iconEl = <Mic className="w-5 h-5" />;
                      } else if (act.type === 'task') {
                        iconBg = "bg-blue-50 text-blue-800 border-blue-100";
                        iconEl = <CheckCircle2 className="w-5 h-5" />;
                      } else if (['seerah', 'research papers/article', 'tafsir', 'dowra'].includes(act.type)) {
                        iconBg = "bg-amber-50 text-amber-800 border-amber-100";
                        iconEl = <Medal className="w-5 h-5" />;
                      }

                      return (
                        <motion.div
                          key={act.id}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.4 }}
                          className="flex-none w-72 md:w-80 flex flex-col items-center relative pt-10 snap-start"
                        >
                          {/* Chronological Vertical Thread Peg/Connector */}
                          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-brand-white shadow-sm z-30 transition-all ${
                            act.isFocus
                              ? (isApproved 
                                  ? (isActiveFocus 
                                      ? 'bg-indigo-600 ring-4 ring-indigo-500/30 ring-offset-1 scale-110' 
                                      : 'bg-indigo-400 opacity-60') 
                                  : isPending 
                                  ? 'bg-amber-500 ring-4 ring-amber-500/25 animate-pulse' 
                                  : 'bg-rose-500 ring-4 ring-rose-500/25')
                              : (isApproved 
                                  ? 'bg-emerald-500 ring-4 ring-emerald-500/25' 
                                  : isPending 
                                  ? 'bg-amber-500 ring-4 ring-amber-500/25 animate-pulse' 
                                  : 'bg-rose-500 ring-4 ring-rose-500/25')
                          }`} />

                          {/* Peg to hanging card link helper */}
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-dashed border-l border-dashed border-brand-border/60 z-20" />

                          {/* Suspended Timeline Card */}
                          <div className={`w-full p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[190px] text-left hover:scale-[1.01] hover:shadow-md ${
                            act.isFocus
                              ? (isApproved 
                                  ? (isActiveFocus 
                                      ? 'bg-indigo-50/15 border-indigo-200/30 hover:border-indigo-400/50' 
                                      : 'bg-indigo-50/5 border-indigo-200/20 opacity-70') 
                                  : isPending
                                  ? 'bg-amber-50/10 border-amber-500/15 hover:border-amber-500/25'
                                  : 'bg-rose-50/10 border-rose-500/15 hover:border-rose-500/25')
                              : (isApproved 
                                  ? 'bg-emerald-50/10 border-emerald-600/10 hover:border-emerald-600/25' 
                                  : isPending
                                  ? 'bg-amber-50/10 border-amber-500/15 hover:border-amber-500/25'
                                  : 'bg-rose-50/10 border-rose-500/15 hover:border-rose-500/25')
                          }`}>
                            <div className="space-y-3">
                              {/* Header Meta Tag & Points Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border font-mono truncate max-w-[150px] ${
                                  act.isFocus
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200/40'
                                    : 'bg-brand-bg-header text-brand-brown-light border border-brand-border-light'
                                }`}>
                                  {act.isFocus 
                                    ? (isActiveFocus ? 'ACTIVE FOCUS' : 'ACHIEVED FOCUS') 
                                    : act.type === 'book' 
                                    ? 'Study Milestone' 
                                    : act.type === 'presentation' 
                                    ? 'Knowledge Share' 
                                    : act.type === 'task' 
                                    ? 'Action Task' 
                                    : `${domainLabel} Milestone`}
                                </span>
                                <div className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  act.isFocus
                                    ? (isApproved 
                                        ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/40' 
                                        : 'bg-brand-bg-alt text-brand-brown-light/60 border border-brand-border-light')
                                    : (isApproved 
                                        ? 'bg-amber-100 text-amber-850 border border-amber-200/50' 
                                        : 'bg-brand-bg-alt text-brand-brown-light/60 border border-brand-border-light')
                                }`}>
                                  <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                  {act.isFocus 
                                    ? (isApproved ? `+${pts} pts (Init)` : `+${pts} pending`)
                                    : (isApproved ? `+${pts} pts` : `+${pts} pending`)}
                                </div>
                              </div>

                              {/* Title Info */}
                              <div className="space-y-1">
                                <h4 className="font-sans text-sm font-bold text-brand-text leading-tight line-clamp-2">
                                  {act.isFocus ? (
                                    <>
                                      {act.type === 'book' && `${isActiveFocus ? 'Active Focus Book Study' : 'Achieved Focus Book Study'}: "${toTitleCase(act.details?.title)}"`}
                                      {act.type === 'presentation' && `${isActiveFocus ? 'Active Focus Presentation' : 'Achieved Focus Presentation'}: "${toTitleCase(act.details?.title)}"`}
                                      {act.type === 'task' && `${isActiveFocus ? 'Active Focus Service Task' : 'Achieved Focus Service Task'}: "${toTitleCase(act.details?.title || 'Action items')}"`}
                                      {!['book', 'presentation', 'task'].includes(act.type) && `${isActiveFocus ? `Active Focus ${act.type === 'research papers/article' ? (act.details?.isResearchPaper ? 'Research Paper' : 'Article Study') : domainLabel}` : `Achieved Focus ${act.type === 'research papers/article' ? (act.details?.isResearchPaper ? 'Research Paper' : 'Article Study') : domainLabel}`}: "${toTitleCase(act.details?.title || act.type)}"`}
                                    </>
                                  ) : (
                                    <>
                                      {act.type === 'book' && `Completed Book: "${toTitleCase(act.details?.title)}"`}
                                      {act.type === 'presentation' && `Delivered Presentation: "${toTitleCase(act.details?.title)}"`}
                                      {act.type === 'task' && `Logged Task Points: "${toTitleCase(act.details?.title || 'Action items')}"`}
                                      {!['book', 'presentation', 'task'].includes(act.type) && `Completed ${act.type === 'research papers/article' ? (act.details?.isResearchPaper ? 'Research Paper' : 'Article Study') : domainLabel}: "${toTitleCase(act.details?.title || act.type)}"`}
                                    </>
                                  )}
                                </h4>
                                {act.details?.author && (
                                  <p className="text-[11px] text-brand-brown-light italic leading-snug line-clamp-1 py-0.5">
                                    by {toTitleCase(act.details.author)}
                                  </p>
                                )}
                                {act.details?.description && (
                                  <p className="text-[11px] text-brand-brown-light/85 italic leading-snug line-clamp-1 py-0.5 mt-0.5">
                                    "{act.details.description}"
                                  </p>
                                )}
                                {(act.details?.link || act.details?.fileLink) && (
                                  <div className="flex flex-wrap gap-2 pt-1.5 mt-1">
                                    {act.details?.link && (
                                      <a
                                        href={act.details.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-red-650 hover:bg-red-700 transition-colors rounded-lg shadow-sm"
                                      >
                                        <span>Watch/View</span>
                                        <span className="text-xs">🔗</span>
                                      </a>
                                    )}
                                    {act.details?.fileLink && (
                                      <a
                                        href={act.details.fileLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-offwhite bg-brand-brown hover:bg-brand-brown/90 rounded-lg shadow-sm transition-colors"
                                      >
                                        <span>Document</span>
                                        <span className="text-xs">📄</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                                {isRejected && act.rejectionReason && (
                                  <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-700">
                                    <span className="font-bold text-[9px] uppercase tracking-wider block mb-0.5">Admin Note:</span>
                                    <p className="text-xs italic">{act.rejectionReason}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Tail holding Date of Completion & Visual Status */}
                            <div className="pt-3 mt-3 border-t border-brand-border-light flex items-center justify-between gap-2">
                              <div className="inline-flex flex-col">
                                <span className="text-[8px] font-extrabold uppercase tracking-widest text-brand-brown-light opacity-50">
                                  {act.isFocus ? "Target Completion" : "Date of Completion"}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-brand-brown shrink-0 mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-brand-brown-light" />
                                  {(() => {
                                    if (act.isFocus && act.details?.estimatedDuration) {
                                      let dVal = act.details.estimatedDuration;
                                      const dLower = dVal.toLowerCase().trim();
                                      if (dLower === '2 months' && act.type === 'tafsir') dVal = '2026-08-14';
                                      else if (dLower === '2 months' && act.type === 'seerah') dVal = '2026-08-14';
                                      else if (dLower === '30 days') dVal = '2026-07-14';
                                      else if (dLower === '2 months') dVal = '2026-08-14';
                                      
                                      const isDateRegex = /^\d{4}-\d{2}-\d{2}$/;
                                      if (isDateRegex.test(dVal) && !isNaN(new Date(dVal).getTime())) {
                                        return formatDateDDMMYYYY(dVal);
                                      }
                                      return dVal;
                                    }
                                    return completionDate;
                                  })()}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isApproved && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCelebrationCardData({
                                        learnerName: activeLearner?.fullName || 'Learner',
                                        focusTitle: act.details?.title || domainLabel,
                                        domain: domainLabel,
                                        type: act.type,
                                        pointsEarned: pts,
                                        completedDate: act.details?.completedAt || act.requestedAt,
                                        summaryNotes: act.details?.description || 'Milestone achieved with dedication and excellence!',
                                        adminComment: 'Official milestone recorded in Lounge Records'
                                      });
                                      setIsCelebrationCardOpen(true);
                                    }}
                                    className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-sm flex items-center gap-1"
                                    title="View Celebration Card"
                                  >
                                    <Sparkles className="w-2.5 h-2.5 text-amber-700" /> Card
                                  </button>
                                )}
                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border shrink-0 ${
                                  act.isFocus
                                    ? (isApproved 
                                        ? (isActiveFocus ? 'bg-indigo-100/60 text-indigo-700 border-indigo-200/50' : 'bg-indigo-100/30 text-indigo-500/80 border-indigo-200/20') 
                                        : isPending 
                                        ? 'bg-amber-100/60 text-amber-700 border-amber-200/50' 
                                        : 'bg-rose-100/60 text-rose-700 border-rose-250/50')
                                    : (isApproved 
                                        ? 'bg-emerald-550/10 text-emerald-700 border-emerald-500/20' 
                                        : isPending
                                        ? 'bg-amber-550/10 text-amber-700 border-amber-500/20'
                                        : 'bg-rose-550/10 text-rose-700 border-rose-500/20')
                                }`}>
                                  {act.isFocus 
                                    ? (isApproved ? (isActiveFocus ? 'In Progress' : 'Completed') : isPending ? 'Focus In Review' : 'Cancelled')
                                    : (isApproved ? 'Logged' : isPending ? 'In Review' : 'TBD')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-brand-border mt-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-brand-border-light">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-brown/10 rounded-xl text-brand-brown">
                  <Medal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-sans text-xl font-bold text-brand-text">Wisdom Badges Directory</h3>
                  <p className="text-xs text-brand-brown-light font-medium">Track earned honors, scholarly milestones, and lounge achievements</p>
                </div>
              </div>

              {/* Directory Progress Summary Card */}
              <div className="bg-brand-bg-alt p-3.5 rounded-xl border border-brand-border-light flex flex-col sm:flex-row sm:items-center gap-3 min-w-[260px]">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-brand-brown mb-1.5">
                    <span>Directory Completion</span>
                    <span className="font-mono text-brand-brown-dark">{activeBadges.length} / {ALL_BADGES.length} Unlocked</span>
                  </div>
                  <div className="w-full bg-brand-border-light/50 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-brand-brown to-amber-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((activeBadges.length / ALL_BADGES.length) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right sm:border-l sm:border-brand-border-light sm:pl-3">
                  <span className="text-lg font-black font-mono text-brand-brown">
                    {Math.round((activeBadges.length / ALL_BADGES.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 -mx-1 px-1 scrollbar-none">
              {[
                { key: 'All', title: '✨ All Badges' },
                { key: 'Elite', title: '🌌 Elite' },
                { key: 'Modules', title: '🏛️ Modules' },
                { key: 'Guided Studies', title: '👥 Guided Studies' },
                { key: 'Articles', title: '✍️ Articles' },
                { key: 'Research Papers', title: '📑 Research' },
                { key: 'Books', title: '📖 Books' },
                { key: 'Presentations', title: '🗣️ Sessions' },
                { key: 'Tasks', title: '✅ Service Tasks' },
              ].map((cat) => {
                const isSelected = badgeCategoryFilter === cat.key;
                const count = cat.key === 'All' 
                  ? ALL_BADGES.length 
                  : ALL_BADGES.filter(b => b.category === cat.key).length;
                const earned = cat.key === 'All'
                  ? activeBadges.length
                  : ALL_BADGES.filter(b => b.category === cat.key && activeBadges.some(ab => ab.id === b.id)).length;

                return (
                  <button
                    key={cat.key}
                    onClick={() => setBadgeCategoryFilter(cat.key)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-brown text-brand-offwhite shadow-sm'
                        : 'bg-brand-bg-alt text-brand-brown-light hover:bg-brand-beige/60 border border-brand-border-light'
                    }`}
                  >
                    <span>{cat.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-brand-brown/10 text-brand-brown'
                    }`}>
                      {earned}/{count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Badge Category Sections */}
            <div className="space-y-8 pt-2">
              {[
                { key: 'Elite', title: '🌌 Elite Credentials' },
                { key: 'Modules', title: '🏛️ Lounge Modules (Tafsir, Seerah & Dowra)' },
                { key: 'Guided Studies', title: '👥 Guided Studies' },
                { key: 'Articles', title: '✍️ Articles Study' },
                { key: 'Research Papers', title: '📑 Scholarly Research Papers' },
                { key: 'Books', title: '📖 Book Completion Journey' },
                { key: 'Presentations', title: '🗣️ Sessions / Presentations & Speeches' },
                { key: 'Tasks', title: '✅ Service Tasks' },
              ]
              .filter(cat => badgeCategoryFilter === 'All' || badgeCategoryFilter === cat.key)
              .map((categoryInfo) => {
                const categoryBadges = ALL_BADGES.filter(b => b.category === categoryInfo.key);
                if (categoryBadges.length === 0) return null;
                const earnedCount = categoryBadges.filter(b => activeBadges.some(ab => ab.id === b.id)).length;
                const catPercent = Math.round((earnedCount / categoryBadges.length) * 100);
                
                return (
                  <div key={categoryInfo.key} className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border-light pb-2.5">
                      <h4 className="font-sans text-sm font-bold text-brand-brown flex items-center gap-2 uppercase tracking-wide">
                        <span>{categoryInfo.title}</span>
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-brand-bg-alt h-1.5 rounded-full overflow-hidden border border-brand-border-light">
                          <div 
                            className="bg-brand-brown h-full rounded-full transition-all duration-300"
                            style={{ width: `${catPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-brand-brown-light">
                          {earnedCount} / {categoryBadges.length} earned ({catPercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {categoryBadges.map((badge) => {
                        const isEarned = activeBadges.some((b) => b.id === badge.id);
                        return (
                          <div 
                            key={badge.id} 
                            tabIndex={0}
                            className={`flex flex-col items-center bg-brand-bg-alt p-4 rounded-xl border text-center transition-all group relative outline-none h-full justify-between ${
                              isEarned 
                                ? 'border-emerald-600/30 bg-emerald-500/5 shadow-sm md:hover:-translate-y-1 md:hover:shadow-md ring-1 ring-emerald-500/20' 
                                : 'border-brand-border-light/60 opacity-60 md:hover:opacity-100 grayscale hover:grayscale-0 cursor-pointer'
                            }`}
                          >
                            {/* Unlocked / Locked status pill */}
                            <div className="w-full flex justify-end mb-1">
                              {isEarned ? (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Earned
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Locked
                                </span>
                              )}
                            </div>

                            <span className={`text-4xl my-2 transition-transform duration-300 group-hover:scale-110 drop-shadow-sm ${!isEarned && 'opacity-50'}`}>
                              {badge.icon}
                            </span>
                            <span className="font-bold text-brand-brown text-sm leading-tight">{badge.name}</span>
                            <span className="text-xs text-brand-brown-light mt-1 mb-2 leading-relaxed">{badge.description}</span>
                            
                            {/* Mobile inline requirement tag */}
                            {!isEarned && (
                              <div className="mt-auto pt-2 border-t border-brand-border-light/50 w-full text-left">
                                <span className="text-[9px] font-mono uppercase tracking-wider font-extrabold text-brand-brown/70 block mb-0.5">
                                  Requirement:
                                </span>
                                <span className="text-[10px] text-brand-brown-light leading-snug block line-clamp-2">
                                  {badge.requirement}
                                </span>
                              </div>
                            )}
                            
                            {/* Desktop Hover Tooltip */}
                            {!isEarned && (
                              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-[105%] mb-2 bg-brand-text text-brand-beige text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none w-[150%] max-w-[200px] z-10 transition-opacity shadow-xl">
                                <p className="font-bold text-[10px] uppercase tracking-widest text-brand-brown-light mb-1">Requirement</p>
                                <p>{badge.requirement}</p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-spacing-0 border-4 border-transparent border-t-brand-text" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Lists */}
          <div className="space-y-4 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 pb-2">
              <div>
                <h3 className="font-sans text-2xl font-bold text-brand-text flex items-center gap-3">
                  Detailed Activities
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-brown-light opacity-60">
                  Total completed domain entries & verified milestones breakdown
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const latestApproved = timelineActivities.find(r => r.status === 'approved');
                    setCelebrationCardData({
                      learnerName: activeLearner?.fullName || 'Learner',
                      focusTitle: latestApproved?.details?.title || 'Active Learning Focus',
                      domain: latestApproved?.type ? (APP_DOMAINS.find(d => d.type === latestApproved.type)?.label || latestApproved.type) : 'Islamic Studies',
                      type: latestApproved?.type || 'book',
                      pointsEarned: 100,
                      completedDate: latestApproved?.details?.completedAt || latestApproved?.requestedAt || new Date().toISOString(),
                      summaryNotes: latestApproved?.details?.description || 'Dedication to knowledge and continuous reflection in study circles.',
                      adminComment: 'Verified milestone achievement recorded in Lounge Records'
                    });
                    setIsCelebrationCardOpen(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-stone-950 font-black uppercase tracking-wider text-[11px] px-3.5 py-2 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 border border-amber-400 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>🎉 Celebration Card</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {APP_DOMAINS.map((domain) => {
                let items: string[] = [];
                if (domain.type === 'task') {
                  const approvedTaskReqs = allLearnerRequests.filter(r => r.type === 'task' && r.status === 'approved' && !r.isFocus);
                  const loggedTaskCount = approvedTaskReqs.reduce((sum, r) => sum + (r.details?.count || 1), 0);
                  const actualTaskCount = activeLearner.tasksCompleted || 0;
                  
                  items = approvedTaskReqs.map(r => {
                    const title = r.details?.title || 'Action Items';
                    const count = r.details?.count || 1;
                    const date = r.details?.completedAt ? ` (${formatDateDDMMYYYY(r.details.completedAt)})` : '';
                    return `${title} - ${count} task${count > 1 ? 's' : ''}${date}`;
                  });

                  if (actualTaskCount > loggedTaskCount) {
                    const diff = actualTaskCount - loggedTaskCount;
                    items.push(`Legacy Tasks - ${diff} task${diff > 1 ? 's' : ''}`);
                  }
                } else {
                  items = getDomainItems(activeLearner, domain.type);
                }

                return (
                  <ListCard 
                    key={`domain-list-${domain.type}`}
                    title={`Completed ${domain.label}`} 
                    items={items as string[]} 
                    emptyText={`No ${domain.label.toLowerCase()} completed yet.`} 
                  />
                );
              })}
            </div>
          </div>
          </>
          )}

          {/* Submission Modal */}
          <AnimatePresence>
            {isRequestModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-brand-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col"
                >
                  <div className="px-6 py-4 bg-brand-beige border-b border-brand-border flex items-center justify-between shrink-0">
                    <h3 className="font-sans text-xl font-bold text-brand-text">Submit Learning Update</h3>
                    <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-brand-border rounded-full transition-colors">
                      <X className="w-5 h-5 text-brand-brown" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmitRequest} className="p-6 space-y-5 overflow-y-auto flex-1">
                    
                    {/* Sub-categorized Domain Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light">
                          Select Domain
                        </label>
                        <span className="text-[10px] text-brand-brown-light/70 font-semibold">
                          Choose a category below
                        </span>
                      </div>

                      {/* 1st Category: Modules */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/70 flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3 text-amber-700" /> Modules
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Structured Islamic courses</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: 'tafsir', label: 'Tafsir' },
                            { type: 'seerah', label: 'Seerah' },
                            { type: 'dowra', label: 'Dowra e Quran' }
                          ].map(domain => {
                            const isSelected = requestType === domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setRequestType(domain.type);
                                  setIsRequestLoungeModule(requestLocation === 'lounge');
                                  setRequestSelectedModuleId('');
                                  setRequestSelectedCircleId('');
                                  setItemTitle('');
                                  setItemAuthor('');
                                }}
                                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } active:scale-98`}
                              >
                                <span className="leading-tight truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2nd Category: Circles */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200/70 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-emerald-700" /> Circles
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Reading & guided cohorts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { type: 'book', label: 'Books' },
                            { type: 'talaqqi', label: 'Guided Studies' }
                          ].map(domain => {
                            const isSelected = requestType === domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setRequestType(domain.type);
                                  setIsRequestLoungeModule(false);
                                  setRequestSelectedModuleId('');
                                  setRequestSelectedCircleId('');
                                  setItemTitle('');
                                  setItemAuthor('');
                                }}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } active:scale-98`}
                              >
                                <span className="leading-tight truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3rd Category: Others */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-sky-900 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200/70 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-sky-700" /> Others
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Independent learning tasks</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: 'presentation', label: 'Presentations' },
                            { type: 'task', label: 'Tasks' },
                            { type: 'research papers/article', label: 'Research Paper / Article' }
                          ].map(domain => {
                            const isSelected = requestType === domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setRequestType(domain.type);
                                  setIsRequestLoungeModule(false);
                                  setRequestSelectedModuleId('');
                                  setRequestSelectedCircleId('');
                                  setItemTitle('');
                                  setItemAuthor('');
                                }}
                                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } active:scale-98`}
                              >
                                <span className="leading-tight text-[11px] truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Location selector (except for task domain) */}
                    {!isTaskLike && (
                      <div>
                        <div className="bg-brand-offwhite p-3.5 rounded-2xl border border-brand-border space-y-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Learning Location</label>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRequestLocation('lounge');
                              }}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                                requestLocation === 'lounge'
                                  ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                  : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                requestLocation === 'lounge' ? 'border-brand-offwhite bg-amber-400' : 'border-brand-brown-light/40'
                              }`} />
                              <div>
                                <div className="text-xs font-bold leading-tight">Inside the Lounge</div>
                                <div className="text-[10px] opacity-80 mt-0.5">Cohorts, modules & circles</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestLocation('personal');
                                setRequestSelectedCircleId('');
                                setRequestSelectedModuleId('');
                                setIsRequestLoungeModule(false);
                              }}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                                requestLocation === 'personal'
                                  ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                  : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                requestLocation === 'personal' ? 'border-brand-offwhite bg-amber-400' : 'border-brand-brown-light/40'
                              }`} />
                              <div>
                                <div className="text-xs font-bold leading-tight">Personal Study (Outside)</div>
                                <div className="text-[10px] opacity-80 mt-0.5">Self-paced independent study</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ========================================================================= */}
                    {/* INSIDE THE LOUNGE MODE - UNIFIED CARD SELECTION FOR ALL DOMAINS */}
                    {/* ========================================================================= */}
                    {requestLocation === 'lounge' && !isTaskLike && (
                      <div className="space-y-4">
                        {/* 1. MODULES (Tafsir, Seerah, Dowra e Quran) */}
                        {['tafsir', 'seerah', 'dowra'].includes(requestType) && (
                          <div>
                            {selectedRequestModule ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 bg-green-50/50 border border-green-200 rounded-2xl flex flex-col space-y-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                                      <CheckCircle2 className="w-5 h-5 text-green-700" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">Selected Lounge Module</span>
                                      <h4 className="font-sans text-base font-bold text-brand-text mt-0.5 truncate">{selectedRequestModule.title} {selectedRequestModule.batch ? `(${selectedRequestModule.batch})` : ''}</h4>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRequestSelectedModuleId('');
                                      setItemTitle('');
                                      setItemAuthor('');
                                      setTimeTaken('');
                                    }}
                                    className="px-3 py-1.5 border border-brand-border hover:bg-brand-offwhite text-brand-brown rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                                  >
                                    Change
                                  </button>
                                </div>

                                <div className="bg-brand-white/80 p-4 rounded-xl border border-brand-border-light space-y-2 text-xs text-brand-brown">
                                  <p className="font-medium text-brand-text">
                                    📖 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Module / Batch:</span> {selectedRequestModule.batch || selectedRequestModule.title}
                                  </p>
                                  {selectedRequestModule.speaker && (
                                    <p className="font-medium text-brand-text">
                                      🎓 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Instructor:</span> {selectedRequestModule.speaker}
                                    </p>
                                  )}
                                  {selectedRequestModule.orientationDate && (
                                    <p className="font-medium">
                                      🗓️ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Orientation:</span> {formatDateDDMMYYYY(selectedRequestModule.orientationDate)}
                                    </p>
                                  )}
                                  {(selectedRequestModule.endDate || selectedRequestModule.estimatedEndDate) && (
                                    <p className="font-medium">
                                      ⏳ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Target / End Date:</span> {formatDateDDMMYYYY(selectedRequestModule.endDate || selectedRequestModule.estimatedEndDate || '')}
                                    </p>
                                  )}
                                </div>

                                <p className="text-[11px] text-green-800 leading-relaxed font-semibold">
                                  ✓ Selected! Fill in your completion date and notes below to submit your update for this module.
                                </p>
                              </motion.div>
                            ) : (
                              <div className="space-y-3">
                                <div className="border-b border-brand-border pb-2">
                                  <h4 className="font-sans text-base font-bold text-brand-text">Choose a Past {APP_DOMAINS.find(d => d.type === requestType)?.label || 'Module'} to Submit</h4>
                                  <p className="text-xs text-brand-brown-light mt-1">
                                    Select the completed past module you finished inside the Wisdom Lounge.
                                  </p>
                                </div>

                                {loungeModules.filter(m => m.category === requestType && m.status === 'past').length === 0 ? (
                                  <div className="p-6 bg-brand-offwhite rounded-2xl border border-dashed border-brand-border text-center">
                                    <p className="text-xs text-brand-brown font-bold">No past {APP_DOMAINS.find(d => d.type === requestType)?.label || 'Module'} modules found.</p>
                                    <p className="text-[11px] text-brand-brown-light mt-1">Only completed past modules can be submitted. Please select "Personal Study (Outside)" if you completed this independently.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                                    {loungeModules
                                      .filter(m => m.category === requestType && m.status === 'past')
                                      .map((module) => (
                                        <div 
                                          key={module.id} 
                                          className="p-4 bg-brand-white border border-brand-border rounded-2xl flex flex-col justify-between gap-3 shadow-xs transition-all hover:border-brand-brown/50"
                                        >
                                          <div>
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100/80 text-amber-900 border border-amber-200/80 rounded">
                                                {APP_DOMAINS.find(d => d.type === module.category)?.label || module.category}
                                              </span>
                                              <span className="text-[9px] font-bold text-brand-brown-light/80 bg-brand-offwhite px-2 py-0.5 rounded border border-brand-border">
                                                PAST MODULE
                                              </span>
                                            </div>

                                            <h5 className="font-sans font-bold text-brand-text text-sm mt-1.5 leading-tight">
                                              {module.title} {module.batch ? `(${module.batch})` : ''}
                                            </h5>
                                            
                                            {module.speaker && (
                                              <p className="text-xs text-brand-brown font-extrabold mt-1">
                                                Instructor: <span className="text-brand-text">{module.speaker}</span>
                                              </p>
                                            )}
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRequestSelectedModuleId(module.id);
                                              setItemTitle(module.batch || module.title);
                                              setItemAuthor(module.speaker || '');
                                              setTimeTaken(module.duration || '2 Months');
                                            }}
                                            className="w-full py-2 px-3 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                                          >
                                            Select Module <ArrowRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. CIRCLES: BOOKS */}
                        {requestType === 'book' && (
                          <div>
                            {selectedRequestCircle ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 bg-green-50/50 border border-green-200 rounded-2xl flex flex-col space-y-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                                      <CheckCircle2 className="w-5 h-5 text-green-700" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">Selected Lounge Circle</span>
                                      <h4 className="font-sans text-base font-bold text-brand-text mt-0.5 truncate">{selectedRequestCircle.title}</h4>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRequestSelectedCircleId('');
                                      setItemTitle('');
                                      setItemAuthor('');
                                    }}
                                    className="px-3 py-1.5 border border-brand-border hover:bg-brand-offwhite text-brand-brown rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                                  >
                                    Change
                                  </button>
                                </div>

                                <div className="bg-brand-white/80 p-4 rounded-xl border border-brand-border-light space-y-2 text-xs text-brand-brown">
                                  {selectedRequestCircle.bookName && (
                                    <p className="font-medium text-brand-text">
                                      📖 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Book Name:</span> {selectedRequestCircle.bookName}
                                    </p>
                                  )}
                                  <p className="font-medium text-brand-text">
                                    🎓 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Moderator / Host:</span> {selectedRequestCircle.moderator}
                                  </p>
                                  {selectedRequestCircle.subject && (
                                    <p className="font-medium text-emerald-800">
                                      🏷️ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Subject:</span> {selectedRequestCircle.subject}
                                    </p>
                                  )}
                                </div>

                                <p className="text-[11px] text-green-800 leading-relaxed font-semibold">
                                  ✓ Selected! Fill in your completion details below to submit your update for this study circle book.
                                </p>
                              </motion.div>
                            ) : (
                              <div className="space-y-3">
                                <div className="border-b border-brand-border pb-2">
                                  <h4 className="font-sans text-base font-bold text-brand-text">Choose a Past Study Circle Book to Submit</h4>
                                  <p className="text-xs text-brand-brown-light mt-1">
                                    Select the past book circle you completed inside the Wisdom Lounge.
                                  </p>
                                </div>

                                {circlesLoading ? (
                                  <div className="flex flex-col items-center justify-center py-8 opacity-65">
                                    <Activity className="w-6 h-6 text-brand-brown animate-spin mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-brand-brown-light">Loading study circles...</span>
                                  </div>
                                ) : loungeCircles.filter(c => c.category === 'Book Reading' && c.status === 'past').length === 0 ? (
                                  <div className="p-6 bg-brand-offwhite rounded-xl border border-dashed border-brand-border text-center">
                                    <p className="text-xs text-brand-brown-light font-bold">No past book circles found.</p>
                                    <p className="text-[11px] text-brand-brown-light mt-1">Only completed past circles can be submitted. Please select "Personal Study" if you read this independently.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                                    {loungeCircles
                                      .filter(c => c.category === 'Book Reading' && c.status === 'past')
                                      .map((circle) => (
                                        <div 
                                          key={circle.id} 
                                          className="p-4 bg-brand-white border border-brand-border rounded-2xl flex flex-col justify-between gap-3 shadow-xs transition-all hover:border-brand-brown/50"
                                        >
                                          <div>
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 rounded">
                                                {circle.category || 'Study Circle'}
                                              </span>
                                              <span className="text-[9px] font-bold text-brand-brown-light/60">
                                                PAST CIRCLE
                                              </span>
                                            </div>

                                            <h5 className="font-sans font-bold text-brand-text text-sm mt-1.5 leading-tight">{circle.title}</h5>
                                            {circle.bookName && (
                                              <p className="text-xs text-brand-brown font-extrabold mt-1">
                                                Book: <span className="text-brand-text">{circle.bookName}</span>{circle.bookAuthor ? ` (by ${circle.bookAuthor})` : ''}
                                              </p>
                                            )}
                                            {circle.subject && (
                                              <p className="text-[11px] text-emerald-800 font-extrabold mt-0.5">
                                                Subject: <span className="text-emerald-950 font-semibold">{circle.subject}</span>
                                              </p>
                                            )}
                                            <p className="text-[11px] text-brand-brown-light font-bold mt-0.5">
                                              Host: {circle.moderator} | Schedule: {circle.schedule}
                                            </p>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRequestSelectedCircleId(circle.id);
                                              setItemTitle(circle.bookName || circle.title);
                                              setItemAuthor(circle.bookAuthor || circle.moderator || '');
                                              if (circle.subject) setRequestSubject(circle.subject);
                                            }}
                                            className="w-full py-2 px-3 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                                          >
                                            Select Circle <ArrowRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. CIRCLES: GUIDED STUDIES (Talaqqi) */}
                        {requestType === 'talaqqi' && (
                          <div>
                            {selectedRequestCircle ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 bg-green-50/50 border border-green-200 rounded-2xl flex flex-col space-y-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                                      <CheckCircle2 className="w-5 h-5 text-green-700" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">Selected Guided Study Circle</span>
                                      <h4 className="font-sans text-base font-bold text-brand-text mt-0.5 truncate">{selectedRequestCircle.title}</h4>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRequestSelectedCircleId('');
                                      setItemTitle('');
                                      setRequestUstadName('');
                                    }}
                                    className="px-3 py-1.5 border border-brand-border hover:bg-brand-offwhite text-brand-brown rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                                  >
                                    Change
                                  </button>
                                </div>

                                <div className="bg-brand-white/80 p-4 rounded-xl border border-brand-border-light space-y-2 text-xs text-brand-brown">
                                  {selectedRequestCircle.bookName && (
                                    <p className="font-medium text-brand-text">
                                      📖 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Course / Topic:</span> {selectedRequestCircle.bookName}
                                    </p>
                                  )}
                                  <p className="font-medium text-brand-text">
                                    🎓 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Moderator / Teacher:</span> {selectedRequestCircle.moderator}
                                  </p>
                                  {selectedRequestCircle.subject && (
                                    <p className="font-medium text-brand-text">
                                      🏷️ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Subject:</span> {selectedRequestCircle.subject}
                                    </p>
                                  )}
                                </div>

                                <p className="text-[11px] text-green-800 leading-relaxed font-semibold">
                                  ✓ Selected! Fill in your completion details below to submit your update for this guided study circle.
                                </p>
                              </motion.div>
                            ) : (
                              <div className="space-y-3">
                                <div className="border-b border-brand-border pb-2">
                                  <h4 className="font-sans text-base font-bold text-brand-text">Choose a Past Guided Study Circle to Submit</h4>
                                  <p className="text-xs text-brand-brown-light mt-1">
                                    Select the past guided study cohort you completed inside the Wisdom Lounge.
                                  </p>
                                </div>

                                {circlesLoading ? (
                                  <div className="flex flex-col items-center justify-center py-8 opacity-65">
                                    <Activity className="w-6 h-6 text-brand-brown animate-spin mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-brand-brown-light">Loading guided study circles...</span>
                                  </div>
                                ) : loungeCircles.filter(c => c.category !== 'Book Reading' && c.status === 'past').length === 0 ? (
                                  <div className="p-6 bg-brand-offwhite rounded-xl border border-dashed border-brand-border text-center">
                                    <p className="text-xs text-brand-brown-light font-bold">No past guided study circles found.</p>
                                    <p className="text-[11px] text-brand-brown-light mt-1">Only completed past circles can be submitted. Please select "Personal Study (Outside)" if you studied independently.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                                    {loungeCircles
                                      .filter(c => c.category !== 'Book Reading' && c.status === 'past')
                                      .map((circle) => (
                                        <div 
                                          key={circle.id} 
                                          className="p-4 bg-brand-white border border-brand-border rounded-2xl flex flex-col justify-between gap-3 shadow-xs transition-all hover:border-brand-brown/50"
                                        >
                                          <div>
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100/80 text-emerald-900 border border-emerald-200/80 rounded">
                                                {circle.category || 'Guided Study'}
                                              </span>
                                              <span className="text-[9px] font-bold text-brand-brown-light/60">
                                                PAST CIRCLE
                                              </span>
                                            </div>

                                            <h5 className="font-sans font-bold text-brand-text text-sm mt-1.5 leading-tight">{circle.title}</h5>
                                            {circle.bookName && (
                                              <p className="text-xs text-brand-brown font-extrabold mt-1">
                                                Course: <span className="text-brand-text">{circle.bookName}</span>
                                              </p>
                                            )}
                                            {circle.subject && (
                                              <p className="text-[11px] text-emerald-800 font-extrabold mt-0.5">
                                                Subject: <span className="text-emerald-950 font-semibold">{circle.subject}</span>
                                              </p>
                                            )}
                                            <p className="text-[11px] text-brand-brown-light font-bold mt-0.5">
                                              Host: {circle.moderator} | Schedule: {circle.schedule}
                                            </p>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRequestSelectedCircleId(circle.id);
                                              setItemTitle(circle.bookName || circle.title);
                                              setRequestUstadName(circle.moderator || circle.bookAuthor || '');
                                              if (circle.subject) setRequestSubject(circle.subject);
                                            }}
                                            className="w-full py-2 px-3 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                                          >
                                            Select Circle <ArrowRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. OTHERS (Research Paper / Article, Presentation) */}
                        {requestType === 'research papers/article' && (
                          <div className="p-5 bg-brand-white border border-brand-border rounded-2xl space-y-4 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-brand-border/60 pb-3">
                              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center border border-sky-200">
                                <FileText className="w-4 h-4 text-sky-800" />
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-sky-900 block">Lounge Scholarly Initiative</span>
                                <h4 className="font-sans text-sm font-bold text-brand-text">Research Paper or Article Update</h4>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                                Title / Topic <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                placeholder="e.g. History of Fiqh or Islamic Financial Ethics"
                                className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>

                            {/* Series vs Single Selection */}
                            <div className="bg-brand-offwhite p-3.5 rounded-xl border border-brand-border space-y-2.5">
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-text">
                                Publication Structure
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRequestIsSeries(false)}
                                  className={`p-2.5 rounded-xl border text-left transition-all ${
                                    !requestIsSeries 
                                      ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm font-bold' 
                                      : 'bg-brand-white hover:bg-brand-beige text-brand-brown border-brand-border'
                                  }`}
                                >
                                  <div className="text-xs font-bold">📄 Single Piece</div>
                                  <div className="text-[10px] opacity-80 mt-0.5">Standalone article / paper</div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRequestIsSeries(true)}
                                  className={`p-2.5 rounded-xl border text-left transition-all ${
                                    requestIsSeries 
                                      ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm font-bold' 
                                      : 'bg-brand-white hover:bg-brand-beige text-brand-brown border-brand-border'
                                  }`}
                                >
                                  <div className="text-xs font-bold">📚 Article Series</div>
                                  <div className="text-[10px] opacity-80 mt-0.5">Multiple related parts</div>
                                </button>
                              </div>

                              {requestIsSeries && (
                                <div className="mt-2 pt-2 border-t border-brand-border/60 space-y-2.5 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-950">
                                      Pieces in Series <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md border border-amber-300">
                                      +{(requestIsResearchPaper ? 30 : 15) * Math.max(2, requestSeriesCount)} Pts Total
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    min={2}
                                    max={100}
                                    required={requestIsSeries}
                                    value={requestSeriesCount}
                                    onChange={(e) => setRequestSeriesCount(Math.max(2, parseInt(e.target.value) || 2))}
                                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-brand-offwhite border border-brand-border rounded-xl">
                              <input
                                id="requestIsResearchPaperLounge"
                                type="checkbox"
                                checked={requestIsResearchPaper}
                                onChange={(e) => setRequestIsResearchPaper(e.target.checked)}
                                className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown mt-0.5 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <label htmlFor="requestIsResearchPaperLounge" className="text-xs font-bold uppercase tracking-wide text-brand-text cursor-pointer select-none">
                                  Academic Research Paper (30 pts)
                                </label>
                                <span className="text-[10px] text-brand-brown-light leading-relaxed mt-0.5">
                                  Check this option if your work matches a full academic research paper rather than a brief article.
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {requestType === 'presentation' && (
                          <div className="p-5 bg-brand-white border border-brand-border rounded-2xl space-y-4 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-brand-border/60 pb-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200">
                                <Sparkles className="w-4 h-4 text-amber-800" />
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 block">Lounge Session</span>
                                <h4 className="font-sans text-sm font-bold text-brand-text">Knowledge Sharing Presentation</h4>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                                Presentation Topic / Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                placeholder="e.g. Overview of Imam al-Ghazali's Epistemology"
                                className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                                Presentation / Recording Link <span className="text-[10px] lowercase italic font-normal">(optional)</span>
                              </label>
                              <input
                                type="url"
                                value={requestLink}
                                onChange={(e) => setRequestLink(e.target.value)}
                                placeholder="e.g. https://youtube.com/... or https://drive.google.com/..."
                                className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========================================================================= */}
                    {/* PERSONAL STUDY (OUTSIDE) & TASKS MODE */}
                    {/* ========================================================================= */}
                    {(requestLocation === 'personal' || isTaskLike) && (
                      <div className="space-y-4">
                        {requestType === 'research papers/article' ? (
                          <>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                Title / Topic <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                placeholder="e.g. History of Fiqh or Islamic Financial Ethics"
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>

                            {/* Series vs Single Selection */}
                            <div className="bg-brand-bg-alt/80 p-4 rounded-2xl border border-brand-border/80 space-y-3">
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-text">
                                Article Structure
                              </label>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  onClick={() => setRequestIsSeries(false)}
                                  className={`p-3 rounded-xl border text-left transition-all ${
                                    !requestIsSeries 
                                      ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm font-bold' 
                                      : 'bg-brand-offwhite hover:bg-brand-brown/10 text-brand-brown border-brand-border'
                                  }`}
                                >
                                  <div className="text-xs font-bold flex items-center gap-1.5">
                                    📄 Single Piece
                                  </div>
                                  <div className="text-[10px] opacity-80 mt-0.5">Standalone article / paper</div>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setRequestIsSeries(true)}
                                  className={`p-3 rounded-xl border text-left transition-all ${
                                    requestIsSeries 
                                      ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm font-bold' 
                                      : 'bg-brand-offwhite hover:bg-brand-brown/10 text-brand-brown border-brand-border'
                                  }`}
                                >
                                  <div className="text-xs font-bold flex items-center gap-1.5">
                                    📚 Article Series
                                  </div>
                                  <div className="text-[10px] opacity-80 mt-0.5">Multiple related parts</div>
                                </button>
                              </div>

                              {requestIsSeries && (
                                <div className="mt-3 pt-3 border-t border-brand-border/60 space-y-3 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-950">
                                        Number of Article Pieces <span className="text-red-500">*</span>
                                      </label>
                                      <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md border border-amber-300">
                                        +{(requestIsResearchPaper ? 30 : 15) * Math.max(2, requestSeriesCount)} Pts Total
                                      </span>
                                    </div>
                                    <input
                                      type="number"
                                      min={2}
                                      max={100}
                                      required={requestIsSeries}
                                      value={requestSeriesCount}
                                      onChange={(e) => setRequestSeriesCount(Math.max(2, parseInt(e.target.value) || 2))}
                                      className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                    <p className="text-[10px] text-amber-800/90 mt-1">
                                      * Completing a series scales your score! Each piece adds +{requestIsResearchPaper ? 30 : 15} points.
                                    </p>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1">
                                      Titles / Names of Articles in Series (Optional)
                                    </label>
                                    <textarea
                                      value={requestSeriesTitles}
                                      onChange={(e) => setRequestSeriesTitles(e.target.value)}
                                      placeholder="e.g. Part 1: Foundations, Part 2: Analysis, Part 3: Modern Applications"
                                      rows={2}
                                      className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-xs text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4 my-2">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                  Online Link (If available)
                                </label>
                                <input
                                  type="url"
                                  value={requestLink}
                                  onChange={(e) => setRequestLink(e.target.value)}
                                  placeholder="e.g. https://example.com/scholarly-article"
                                  className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                />
                              </div>
                              <div className="flex items-start gap-3 p-3.5 bg-brand-bg-alt/70 border border-brand-border/60 rounded-xl">
                                <input
                                  id="requestIsResearchPaper"
                                  type="checkbox"
                                  checked={requestIsResearchPaper}
                                  onChange={(e) => setRequestIsResearchPaper(e.target.checked)}
                                  className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown mt-0.5 cursor-pointer"
                                />
                                <div className="flex flex-col">
                                  <label htmlFor="requestIsResearchPaper" className="text-xs font-bold uppercase tracking-wide text-brand-text cursor-pointer select-none">
                                    This is a Scholarly Research Paper
                                  </label>
                                  <span className="text-[10px] text-brand-brown-light leading-relaxed mt-0.5">
                                    Check this option if your work matches a full academic research paper rather than a brief article. Research papers grant more score (30 pts vs 15 pts per piece).
                                  </span>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : ['tafsir', 'seerah', 'dowra'].includes(requestType) ? (
                          <>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                Course Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                placeholder="e.g. Tafsir of Surah Nisaa"
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                Author / Teacher <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={itemAuthor}
                                onChange={(e) => setItemAuthor(e.target.value)}
                                placeholder="e.g. Dr. Mustafa Khattab"
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-brand-offwhite border border-brand-border rounded-xl">
                              <input
                                id="requestHasCommunity"
                                type="checkbox"
                                checked={requestHasCommunity}
                                onChange={(e) => {
                                  setRequestHasCommunity(e.target.checked);
                                  if (!e.target.checked) setRequestCommunity('');
                                }}
                                className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown"
                              />
                              <label htmlFor="requestHasCommunity" className="text-sm font-semibold text-brand-brown-light cursor-pointer select-none">
                                Studied as part of a Study Circle / Community?
                              </label>
                            </div>
                            {requestHasCommunity && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="overflow-hidden"
                              >
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                  Circle / Community Name
                                </label>
                                <input
                                  type="text"
                                  value={requestCommunity}
                                  onChange={(e) => setRequestCommunity(e.target.value)}
                                  placeholder="e.g. AlMaghrib Institute"
                                  className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                />
                              </motion.div>
                            )}
                          </>
                        ) : requestType === 'talaqqi' ? (
                          <>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Course Title <span className="text-red-500">*</span></label>
                              <input type="text" value={itemTitle} onChange={e => setItemTitle(e.target.value)} required className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium" placeholder="e.g. Fiqh, Hadith, Arabic..." />
                            </div>
                            <div className="flex items-center gap-3 p-3.5 bg-brand-bg-alt/70 border border-brand-border/60 rounded-xl">
                              <input
                                id="requestIsOnline"
                                type="checkbox"
                                checked={requestIsOnline}
                                onChange={(e) => setRequestIsOnline(e.target.checked)}
                                className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown mt-0.5"
                              />
                              <div className="flex flex-col">
                                <label htmlFor="requestIsOnline" className="text-xs font-bold uppercase tracking-wide text-brand-text cursor-pointer select-none">
                                  Pursued Online?
                                </label>
                              </div>
                            </div>
                            {requestIsOnline && (
                               <div>
                                 <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Source / Link</label>
                                 <input type="text" value={requestSource} onChange={e => setRequestSource(e.target.value)} required={requestIsOnline} className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown" placeholder="e.g. YouTube channel link, Zoom ID etc." />
                               </div>
                            )}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Name of Ustad <span className="text-red-500">*</span></label>
                              <input type="text" value={requestUstadName} onChange={e => setRequestUstadName(e.target.value)} required className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium" placeholder="e.g. Ustadh Majed Mahmoud" />
                            </div>
                            <div className="flex items-center gap-3 p-3.5 bg-brand-bg-alt/70 border border-brand-border/60 rounded-xl">
                              <input
                                id="requestHasCommunity"
                                type="checkbox"
                                checked={requestHasCommunity}
                                onChange={(e) => setRequestHasCommunity(e.target.checked)}
                                className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown mt-0.5"
                              />
                              <div className="flex flex-col">
                                <label htmlFor="requestHasCommunity" className="text-xs font-bold uppercase tracking-wide text-brand-text cursor-pointer select-none">
                                  Pursued under a circle / community
                                </label>
                              </div>
                            </div>
                            {requestHasCommunity && (
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Community / Circle Name</label>
                                <input type="text" value={requestCommunity} onChange={e => setRequestCommunity(e.target.value)} required={requestHasCommunity} className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown" placeholder="e.g. AlMaghrib Institute" />
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Objective / Reason for pursuing <span className="text-red-500">*</span></label>
                              <input type="text" value={requestObjective} onChange={e => setRequestObjective(e.target.value)} required className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium" placeholder="Why are you studying this?" />
                            </div>
                          </>
                        ) : isTaskLike ? (
                          <>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Number of Tasks <span className="text-red-500">*</span></label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={taskCount}
                                onChange={(e) => setTaskCount(parseInt(e.target.value) || 1)}
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Task Description <span className="text-red-500">*</span></label>
                              <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Briefly describe the tasks you've completed for this module..."
                                rows={3}
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown resize-none font-medium"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                {requestType === 'book' ? 'Book Title' : activeDomain ? `${activeDomain.label} Title` : 'Title'} <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={itemTitle}
                                onChange={(e) => setItemTitle(e.target.value)}
                                placeholder={`e.g. ${requestType === 'book' ? 'The Clear Quran' : 'Presentation Topic'}`}
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                                list="archive-books"
                              />
                              <datalist id="archive-books">
                                {archiveBooks.map(book => (
                                  <option key={book.id} value={book.title} />
                                ))}
                              </datalist>
                            </div>
                            {requestType === 'book' && (
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                  Author / Editor <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={itemAuthor}
                                  onChange={(e) => setItemAuthor(e.target.value)}
                                  placeholder="e.g. Dr. Mustafa Khattab"
                                  className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                                  list="archive-authors"
                                />
                                <datalist id="archive-authors">
                                  {archiveAuthors.map(author => (
                                    <option key={author} value={author} />
                                  ))}
                                </datalist>
                                <div className="flex items-center gap-2 p-3 bg-brand-offwhite border border-brand-border rounded-xl mt-3">
                                  <input
                                    id="requestBookHasCommunity"
                                    type="checkbox"
                                    checked={requestHasCommunity}
                                    onChange={(e) => {
                                      setRequestHasCommunity(e.target.checked);
                                      if (!e.target.checked) setRequestCommunity('');
                                    }}
                                    className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown"
                                  />
                                  <label htmlFor="requestBookHasCommunity" className="text-sm font-semibold text-brand-brown-light cursor-pointer select-none">
                                    Was this read as part of a Study Circle / Community?
                                  </label>
                                </div>
                                {requestHasCommunity && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="overflow-hidden mt-3"
                                  >
                                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                      Circle / Community Name
                                    </label>
                                    <input
                                      type="text"
                                      value={requestCommunity}
                                      onChange={(e) => setRequestCommunity(e.target.value)}
                                      placeholder="e.g. AlMaghrib Institute"
                                      className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                                    />
                                  </motion.div>
                                )}
                              </div>
                            )}
                            {requestType === 'presentation' && (
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                  Online Presentation / Recording Link <span className="text-[10px] lowercase italic font-normal">(optional, e.g. YouTube, Google Drive, Canva)</span>
                                </label>
                                <input
                                  type="url"
                                  value={requestLink}
                                  onChange={(e) => setRequestLink(e.target.value)}
                                  placeholder="e.g. https://youtube.com/... or https://drive.google.com/..."
                                  className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Completion Date and Time Taken */}
                    {!hideExtraFields && (
                      <>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Completion Date</label>
                            <input
                              type="date"
                              lang="en-GB"
                              required
                              value={completionDate}
                              onChange={(e) => setCompletionDate(e.target.value)}
                              className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Time Taken</label>
                            <input
                              type="text"
                              required={!isRequestLoungeModule}
                              value={timeTaken}
                              onChange={(e) => setTimeTaken(e.target.value)}
                              readOnly={isRequestLoungeModule}
                              placeholder="e.g. 2 weeks"
                              className={`w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown ${isRequestLoungeModule ? 'opacity-70 cursor-not-allowed' : ''}`}
                            />
                          </div>
                        </div>

                        {!isTaskLike && requestType !== 'research papers/article' && (
                          <div className="mt-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                              Description <span className="text-[10px] lowercase italic font-normal">(optional)</span>
                            </label>
                            <textarea
                              id="form-request-description"
                              value={requestOverview}
                              onChange={(e) => setRequestOverview(e.target.value)}
                              placeholder="Provide a brief description, key takeaways, reflections or summaries..."
                              rows={3}
                              className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown resize-none"
                            />
                          </div>
                        )}

                        {!isTaskLike && (
                          <div className="pt-2 border-t border-brand-border/40 mt-4">
                            {!['tafsir', 'seerah', 'dowra', 'talaqqi'].includes(requestType) && (
                              <>
                                <div className="mb-4">
                                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Subject</label>
                                  <select
                                    value={isCustomSubject ? 'Other' : requestSubject}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'Other') {
                                        setIsCustomSubject(true);
                                        setRequestSubject('');
                                      } else {
                                        setIsCustomSubject(false);
                                        setRequestSubject(val);
                                      }
                                    }}
                                    required
                                    className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                  >
                                    <option value="">Select a subject</option>
                                    {Array.from(new Set([...SUBJECTS, ...allApprovedSubjects])).map((subject) => (
                                      <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                    <option value="Other">Other (recommend a subject)</option>
                                  </select>
                                </div>
                                {isCustomSubject && (
                                  <div className="mb-4">
                                     <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Specify Subject</label>
                                     <input
                                       type="text"
                                       value={requestSubject}
                                       onChange={(e) => setRequestSubject(e.target.value)}
                                       required
                                       className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                       placeholder="Enter your recommended subject"
                                      />
                                  </div>
                                )}
                              </>
                            )}
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2 mt-4">
                              {requestType === 'research papers/article'
                                ? 'Upload Article / Research Paper PDF or Study Notes (Optional, +1 pts)'
                                : requestType === 'book'
                                ? 'Upload Book PDF or Study Notes (Optional, +1 pts)'
                                : requestType === 'presentation'
                                ? 'Upload Presentation Slides / Document (Optional, +1 pts)'
                                : 'Upload Notes / PDF / Presentation / Document (Optional, +1 pts)'}
                            </label>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 px-4 py-2 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-brand-offwhite transition-colors bg-brand-white shadow-sm">
                                <Upload className="w-4 h-4 text-brand-brown" />
                                <span>{requestFile ? 'Change File' : 'Select File'}</span>
                                <input type="file" onChange={(e) => setRequestFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx" />
                              </label>
                              {requestFile && <span className="text-xs text-brand-brown-light font-medium truncate max-w-[200px]">{requestFile.name}</span>}
                            </div>
                            <p className="text-[10px] text-brand-brown-light mt-1.5 leading-relaxed">
                              {requestType === 'research papers/article' ? (
                                <span className="bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-md inline-block font-medium">
                                  💡 <strong>What to upload:</strong> You can upload either the <strong>original Article / Research Paper PDF</strong> itself or your <strong>own study notes, summary, or analysis document</strong>.
                                </span>
                              ) : (
                                'If uploaded, document will be submitted to the Central Library for points.'
                              )}
                            </p>
                            {requestFile && (
                              <div className="mt-3 space-y-3">
                                {requestType !== 'book' && (
                                  <div className="bg-brand-beige/30 p-3.5 rounded-xl border border-brand-border/40 space-y-2">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-brown">Material Attribution</label>
                                    <p className="text-[10px] text-brand-brown-light font-medium leading-tight">
                                      {requestType === 'research papers/article'
                                        ? "Is this file your own prepared summary/notes or the original author's paper/article PDF?"
                                        : "Is this uploaded file your own prepared material (e.g. your notes, outlines, powerpoints) or is it someone else's work (e.g. classical book, third-party article)?"}
                                    </p>
                                    <div className="flex flex-wrap gap-4 pt-1">
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="materialOwnership"
                                          value="own"
                                          checked={materialOwnership === 'own'}
                                          onChange={() => setMaterialOwnership('own')}
                                          className="text-brand-brown focus:ring-brand-brown focus:ring-offset-0 w-3.5 h-3.5"
                                        />
                                        <span className="text-xs font-semibold text-brand-brown">
                                          {requestType === 'research papers/article' ? 'My Own Notes / Writeup' : 'My Own Material'}
                                        </span>
                                      </label>
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="materialOwnership"
                                          value="someone_else"
                                          checked={materialOwnership === 'someone_else'}
                                          onChange={() => setMaterialOwnership('someone_else')}
                                          className="text-brand-brown focus:ring-brand-brown focus:ring-offset-0 w-3.5 h-3.5"
                                        />
                                        <span className="text-xs font-semibold text-brand-brown">
                                          {requestType === 'research papers/article' ? "Original Paper / Article PDF" : "Someone Else's Material"}
                                        </span>
                                      </label>
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Description</label>
                                  <textarea 
                                    value={requestDocumentOverview} 
                                    onChange={e => setRequestDocumentOverview(e.target.value)} 
                                    required 
                                    rows={3} 
                                    className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown resize-none" 
                                    placeholder={
                                      requestType === 'research papers/article'
                                        ? 'e.g., Attached is the published research paper PDF / my personal key takeaways outline...'
                                        : 'Provide a brief description of the document you are uploading...'
                                    } 
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {requestLocation === 'personal' && !isTaskLike && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-brand-beige border border-brand-border rounded-xl p-4 text-sm text-brand-brown"
                          >
                            <p className="font-bold uppercase tracking-wider text-[10px] mb-2 text-brand-brown-light">Requirement for Personal Study</p>
                            <div className="leading-relaxed space-y-3">
                              {requestType === 'book' && (
                                <>
                                  <p>Since this goal is being pursued independently, you will be required to share a meaningful overview of the book after completion. The purpose of this is to encourage sincerity, reflection, and genuine understanding rather than passive reading.</p>
                                  <p>You may fulfill this by either:</p>
                                  <ul className="list-disc pl-5 space-y-1">
                                    <li>Conducting a lounge session <em className="text-xs text-brand-brown-light">(recommended, as it may grant additional lounge perks such as reduced module fees and similar benefits)</em>, or</li>
                                    <li>Submitting a detailed written reflection or summary document.</li>
                                  </ul>
                                  <p>Your overview should ideally include key lessons, reflections, important insights, and practical takeaways from the book.</p>
                                  <div className="space-y-3 pt-4 mt-4 border-t border-brand-border/40">
                                    <h4 className="text-sm font-bold text-brand-text">How would you like to present this completed goal?</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <button
                                        type="button"
                                        onClick={() => setSubmissionMethod('overview')}
                                        className={`p-2.5 rounded-xl border transition-colors text-left group ${submissionMethod === 'overview' ? 'bg-brand-brown text-brand-offwhite border-brand-brown' : 'bg-brand-offwhite hover:bg-brand-brown hover:text-brand-offwhite text-brand-brown border-brand-border'}`}
                                      >
                                        <div className="font-bold uppercase tracking-wider text-[11px] mb-1 group-hover:text-amber-200">Lounge Session</div>
                                        <div className="text-[10px] opacity-80 leading-snug">Present book insights in a lounge session.</div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSubmissionMethod('written')}
                                        className={`p-2.5 rounded-xl border transition-colors text-left group ${submissionMethod === 'written' ? 'bg-brand-brown text-brand-offwhite border-brand-brown' : 'bg-brand-offwhite hover:bg-brand-brown hover:text-brand-offwhite text-brand-brown border-brand-border'}`}
                                      >
                                        <div className="font-bold uppercase tracking-wider text-[11px] mb-1 group-hover:text-amber-200">Written Reflection</div>
                                        <div className="text-[10px] opacity-80 leading-snug">Submit a written reflection or summary.</div>
                                      </button>
                                    </div>

                                    {submissionMethod === 'overview' && (
                                      <div className="pt-2.5 animate-fadeIn">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                          Target Presentation Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="date"
                                          lang="en-GB"
                                          required
                                          value={requestPresentationTargetDate}
                                          onChange={(e) => setRequestPresentationTargetDate(e.target.value)}
                                          className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                              {['tafsir', 'seerah', 'research papers/article', 'dowra', 'presentation', 'talaqqi'].includes(requestType) && (
                                <>
                                  <p>Since these goals are being pursued independently, you will be expected to share your learnings with the lounge after completion or throughout your progress.</p>
                                  <p>This may be done through:</p>
                                  <ul className="list-disc pl-5 space-y-1">
                                    <li>A lounge session <em className="text-xs text-brand-brown-light">(recommended, as it may grant additional lounge perks such as reduced module fees and similar benefits)</em>, or</li>
                                    <li>A written reflection, notes document, or learning summary.</li>
                                  </ul>
                                  <p>The aim is to strengthen understanding, reflection, and beneficial sharing of knowledge within the community.</p>
                                  <div className="space-y-3 pt-4 mt-4 border-t border-brand-border/40">
                                    <h4 className="text-sm font-bold text-brand-text">How would you like to present this completed goal?</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <button
                                        type="button"
                                        onClick={() => setSubmissionMethod('overview')}
                                        className={`p-2.5 rounded-xl border transition-colors text-left group ${submissionMethod === 'overview' ? 'bg-brand-brown text-brand-offwhite border-brand-brown' : 'bg-brand-offwhite hover:bg-brand-brown hover:text-brand-offwhite text-brand-brown border-brand-border'}`}
                                      >
                                        <div className="font-bold uppercase tracking-wider text-[11px] mb-1 group-hover:text-amber-200">Lounge Session</div>
                                        <div className="text-[10px] opacity-80 leading-snug">Present learning insights in a lounge session.</div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSubmissionMethod('written')}
                                        className={`p-2.5 rounded-xl border transition-colors text-left group ${submissionMethod === 'written' ? 'bg-brand-brown text-brand-offwhite border-brand-brown' : 'bg-brand-offwhite hover:bg-brand-brown hover:text-brand-offwhite text-brand-brown border-brand-border'}`}
                                      >
                                        <div className="font-bold uppercase tracking-wider text-[11px] mb-1 group-hover:text-amber-200">Written Reflection</div>
                                        <div className="text-[10px] opacity-80 leading-snug">Submit a written report or notes document.</div>
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                              <p className="text-[10px] font-medium text-brand-brown/70 pt-2 mt-2 border-t border-brand-border/30">* Required to choose at least one.</p>
                            </div>
                          </motion.div>
                        )}

                        {!isTaskLike && (
                          <div className="bg-brand-beige/30 p-3 rounded-lg border border-brand-border-light text-center mt-2">
                            <p className="text-[10px] text-brand-brown-light leading-relaxed">
                              <span className="font-bold uppercase tracking-wider text-brand-brown block mb-0.5">Privacy Notice</span>
                              Your learnings are currently <strong className="text-brand-brown">{activeLearner.isProfilePublic ? 'PUBLIC' : 'PRIVATE'}</strong> on the Leaderboard. 
                              You can change this anytime from your Settings tab.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsRequestModalOpen(false)}
                        className="flex-1 px-6 py-3 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest text-brand-brown hover:bg-brand-offwhite active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      {!hideSubmitButton && (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-2 px-6 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? 'Submitting...' : (
                            <>
                              <Send className="w-4 h-4" />
                              Submit Request
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Current Focus Modal */}
          <AnimatePresence>
            {isFocusModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-brand-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col"
                >
                  <div className="px-6 py-4 bg-brand-beige border-b border-brand-border flex items-center justify-between shrink-0">
                    <h3 className="font-sans text-xl font-bold text-brand-text">Set Learning Focus</h3>
                    <button onClick={() => setIsFocusModalOpen(false)} className="p-2 hover:bg-brand-border rounded-full transition-colors">
                      <X className="w-5 h-5 text-brand-brown" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleUpdateFocus} className="p-6 space-y-5 overflow-y-auto flex-1">
                    
                    {/* Sub-categorized Domain Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light">
                          Select Focus Domain
                        </label>
                        <span className="text-[10px] text-brand-brown-light/70 font-semibold">
                          Choose a category below
                        </span>
                      </div>

                      {/* 1st Category: Modules */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/70 flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3 text-amber-700" /> Modules
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Structured Islamic courses</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: 'tafsir', label: 'Tafsir' },
                            { type: 'seerah', label: 'Seerah' },
                            { type: 'dowra', label: 'Dowra e Quran' }
                          ].map(domain => {
                            const isSelected = focusDomain === domain.type;
                            const isDisabled = isLoungeModule && focusDomain !== domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setFocusDomain(domain.type);
                                  setFocusTargetDomain('');
                                  setSelectedCircle(null);
                                  setSelectedFocusModule(null);
                                  setFocusModuleId(undefined);
                                  setIsLoungeModule(false);
                                  setFocusTitle('');
                                  setFocusAuthor('');
                                  setFocusEstimatedDuration('');
                                }}
                                disabled={isDisabled}
                                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } ${isDisabled ? 'opacity-35 cursor-not-allowed' : 'active:scale-98'}`}
                              >
                                <span className="leading-tight truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2nd Category: Circles */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200/70 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-emerald-700" /> Circles
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Reading & guided cohorts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { type: 'book', label: 'Books' },
                            { type: 'talaqqi', label: 'Guided Studies' }
                          ].map(domain => {
                            const isSelected = focusDomain === domain.type;
                            const isDisabled = isLoungeModule && focusDomain !== domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setFocusDomain(domain.type);
                                  setFocusTargetDomain('');
                                  setSelectedCircle(null);
                                  setSelectedFocusModule(null);
                                  setFocusModuleId(undefined);
                                  setIsLoungeModule(false);
                                  setFocusTitle('');
                                  setFocusAuthor('');
                                  setFocusEstimatedDuration('');
                                }}
                                disabled={isDisabled}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } ${isDisabled ? 'opacity-35 cursor-not-allowed' : 'active:scale-98'}`}
                              >
                                <span className="leading-tight truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3rd Category: Others */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-sky-900 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200/70 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-sky-700" /> Others
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Independent learning tasks</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: 'presentation', label: 'Presentations' },
                            { type: 'task', label: 'Tasks' },
                            { type: 'research papers/article', label: 'Research Paper / Article' }
                          ].map(domain => {
                            const isSelected = focusDomain === domain.type;
                            const isDisabled = isLoungeModule && focusDomain !== domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setFocusDomain(domain.type);
                                  setFocusTargetDomain('');
                                  setSelectedCircle(null);
                                  setSelectedFocusModule(null);
                                  setFocusModuleId(undefined);
                                  setIsLoungeModule(false);
                                  setFocusTitle('');
                                  setFocusAuthor('');
                                  setFocusEstimatedDuration('');
                                }}
                                disabled={isDisabled}
                                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } ${isDisabled ? 'opacity-35 cursor-not-allowed' : 'active:scale-98'}`}
                              >
                                <span className="leading-tight text-[11px] truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Location Mode Selector */}
                    <div>
                      <div className="bg-brand-offwhite p-3.5 rounded-2xl border border-brand-border space-y-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Learning Location</label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setFocusLocation('lounge');
                            }}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                              focusLocation === 'lounge'
                                ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              focusLocation === 'lounge' ? 'border-brand-offwhite bg-amber-400' : 'border-brand-brown-light/40'
                            }`} />
                            <div>
                              <div className="text-xs font-bold leading-tight">Inside the Lounge</div>
                              <div className="text-[10px] opacity-80 mt-0.5">Cohorts, modules & circles</div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFocusLocation('personal');
                              setSelectedCircle(null);
                              setSelectedFocusModule(null);
                              setFocusModuleId(undefined);
                              setIsLoungeModule(false);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                              focusLocation === 'personal'
                                ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              focusLocation === 'personal' ? 'border-brand-offwhite bg-amber-400' : 'border-brand-brown-light/40'
                            }`} />
                            <div>
                              <div className="text-xs font-bold leading-tight">Personal (Outside)</div>
                              <div className="text-[10px] opacity-80 mt-0.5">Self-paced independent study</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* INSIDE THE LOUNGE MODE - UNIFIED CARD LAYOUT FOR ALL DOMAINS */}
                    {/* ========================================================================= */}
                    {focusLocation === 'lounge' && (
                      <div className="space-y-4">
                        {/* 1. MODULES (Tafsir, Seerah, Dowra e Quran) */}
                        {['tafsir', 'seerah', 'dowra'].includes(focusDomain) && (
                          <div>
                            {selectedFocusModule ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 bg-green-50/50 border border-green-200 rounded-2xl flex flex-col space-y-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                                      <CheckCircle2 className="w-5 h-5 text-green-700" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">Selected Lounge Module</span>
                                      <h4 className="font-sans text-base font-bold text-brand-text mt-0.5 truncate">{selectedFocusModule.title} {selectedFocusModule.batch ? `(${selectedFocusModule.batch})` : ''}</h4>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedFocusModule(null);
                                      setFocusModuleId(undefined);
                                      setFocusTitle('');
                                      setFocusAuthor('');
                                      setFocusEstimatedDuration('');
                                      setIsLoungeModule(false);
                                    }}
                                    className="px-3 py-1.5 border border-brand-border hover:bg-brand-offwhite text-brand-brown rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                                  >
                                    Change
                                  </button>
                                </div>

                                <div className="bg-brand-white/80 p-4 rounded-xl border border-brand-border-light space-y-2 text-xs text-brand-brown">
                                  <p className="font-medium text-brand-text">
                                    📖 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Module / Batch:</span> {selectedFocusModule.batch || selectedFocusModule.title}
                                  </p>
                                  {selectedFocusModule.speaker && (
                                    <p className="font-medium text-brand-text">
                                      🎓 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Instructor:</span> {selectedFocusModule.speaker}
                                    </p>
                                  )}
                                  {selectedFocusModule.orientationDate && (
                                    <p className="font-medium">
                                      🗓️ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Starts / Orientation:</span> {formatDateDDMMYYYY(selectedFocusModule.orientationDate)}
                                    </p>
                                  )}
                                  {(selectedFocusModule.endDate || selectedFocusModule.estimatedEndDate) && (
                                    <p className="font-medium cursor-help" title={formatDateFull(selectedFocusModule.endDate || selectedFocusModule.estimatedEndDate || '')}>
                                      ⏳ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Est. End Date:</span> {formatDateDDMMYYYY(selectedFocusModule.endDate || selectedFocusModule.estimatedEndDate || '')}
                                    </p>
                                  )}
                                  {selectedFocusModule.fee && (
                                    <p className="font-medium">
                                      💳 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Registration / Fee:</span> {selectedFocusModule.fee}
                                    </p>
                                  )}
                                </div>

                                <p className="text-[11px] text-green-800 leading-relaxed font-semibold">
                                  ✓ Ready! Click the "Update Focus" button at the bottom of the modal to submit your request to study this {APP_DOMAINS.find(d => d.type === focusDomain)?.label || 'Module'} inside the Wisdom Lounge.
                                </p>
                              </motion.div>
                            ) : (
                              <div className="space-y-3">
                                <div className="border-b border-brand-border pb-2">
                                  <h4 className="font-sans text-base font-bold text-brand-text">Choose an Ongoing {APP_DOMAINS.find(d => d.type === focusDomain)?.label || 'Module'} to Join</h4>
                                  <p className="text-xs text-brand-brown-light mt-1">
                                    Modules inside the Lounge are structured cohort courses. Select an active module to prefill and join.
                                  </p>
                                </div>

                                {loungeModules.filter(m => m.category === focusDomain && m.status !== 'past').length === 0 ? (
                                  <div className="p-6 bg-brand-offwhite rounded-2xl border border-dashed border-brand-border text-center">
                                    <p className="text-xs text-brand-brown font-bold">No active or upcoming {APP_DOMAINS.find(d => d.type === focusDomain)?.label || 'Module'} modules found.</p>
                                    <p className="text-[11px] text-brand-brown-light mt-1">Please select "Personal (Outside)" if you are studying this topic independently.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {loungeModules
                                      .filter(m => m.category === focusDomain && m.status !== 'past')
                                      .map((module) => {
                                        const isAlreadyJoined = activeLearner?.currentFocuses?.some(f => 
                                          (f.moduleId && f.moduleId === module.id) || 
                                          f.title.toLowerCase() === (module.batch || module.title).toLowerCase()
                                        );

                                        return (
                                          <div 
                                            key={module.id} 
                                            className={`p-4 bg-brand-white border border-brand-border rounded-2xl flex flex-col justify-between gap-3 shadow-xs transition-all ${
                                              isAlreadyJoined 
                                                ? 'opacity-65 bg-brand-offwhite/80 border-dashed' 
                                                : 'hover:border-brand-brown/50'
                                            }`}
                                          >
                                            <div>
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100/80 text-amber-900 border border-amber-200/80 rounded">
                                                  {APP_DOMAINS.find(d => d.type === module.category)?.label || module.category}
                                                </span>
                                                <span className="text-[9px] font-bold text-brand-brown-light/80 bg-brand-offwhite px-2 py-0.5 rounded border border-brand-border">
                                                  {module.status.toUpperCase()}
                                                </span>
                                              </div>

                                              <h5 className="font-sans font-bold text-brand-text text-sm mt-1.5 leading-tight">
                                                {module.title} {module.batch ? `(${module.batch})` : ''}
                                              </h5>
                                              
                                              {module.speaker && (
                                                <p className="text-xs text-brand-brown font-extrabold mt-1">
                                                  Instructor: <span className="text-brand-text">{module.speaker}</span>
                                                </p>
                                              )}
                                              
                                              <div className="text-[11px] text-brand-brown-light font-medium mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                                {module.orientationDate && (
                                                  <span>🗓️ Starts: {formatDateDDMMYYYY(module.orientationDate)}</span>
                                                )}
                                                {(module.endDate || module.estimatedEndDate) && (
                                                  <span>⏳ Est. End: {formatDateDDMMYYYY(module.endDate || module.estimatedEndDate || '')}</span>
                                                )}
                                                {module.fee && (
                                                  <span>💳 Fee: {module.fee}</span>
                                                )}
                                              </div>
                                            </div>

                                            {isAlreadyJoined ? (
                                              <div className="w-full text-center py-2 px-3 bg-green-50 text-green-700 text-xs font-black uppercase tracking-wider rounded-xl border border-green-200 border-dashed select-none">
                                                Already Joined ✓
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedFocusModule(module);
                                                  setFocusModuleId(module.id);
                                                  setFocusTitle(module.batch || module.title);
                                                  setFocusAuthor(module.speaker || '');
                                                  setIsLoungeModule(true);
                                                  const targetDate = module.endDate || module.estimatedEndDate || '';
                                                  if (targetDate) {
                                                    setFocusEstimatedDuration(targetDate);
                                                  }
                                                }}
                                                className="w-full py-2 px-3 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                                              >
                                                Select Module <ArrowRight className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. CIRCLES: BOOKS */}
                        {focusDomain === 'book' && (
                          <div>
                            {selectedCircle ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 bg-green-50/50 border border-green-200 rounded-2xl flex flex-col space-y-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                                      <CheckCircle2 className="w-5 h-5 text-green-700" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">Selected Lounge Circle</span>
                                      <h4 className="font-sans text-base font-bold text-brand-text mt-0.5 truncate">{selectedCircle.title}</h4>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCircle(null);
                                      setFocusTitle('');
                                      setFocusAuthor('');
                                      setFocusEstimatedDuration('');
                                    }}
                                    className="px-3 py-1.5 border border-brand-border hover:bg-brand-offwhite text-brand-brown rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                                  >
                                    Change
                                  </button>
                                </div>

                                <div className="bg-brand-white/80 p-4 rounded-xl border border-brand-border-light space-y-2 text-xs text-brand-brown">
                                  {selectedCircle.bookName && (
                                    <p className="font-medium text-brand-text">
                                      📖 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Book Name:</span> {selectedCircle.bookName}
                                    </p>
                                  )}
                                  <p className="font-medium text-brand-text">
                                    🎓 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Moderator:</span> {selectedCircle.moderator}
                                  </p>
                                  <p className="font-medium">
                                    📅 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Schedule:</span> {selectedCircle.schedule}
                                  </p>
                                  {selectedCircle.duration && (
                                    <p className="font-medium cursor-help" title={formatDateFull(selectedCircle.duration)}>
                                      ⏳ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Target Date:</span> {formatDateDDMMYYYY(selectedCircle.duration)}
                                    </p>
                                  )}
                                  {selectedCircle.startDate && (
                                    <p className="font-medium">
                                      🗓️ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Starts:</span> {formatDateDDMMYYYY(selectedCircle.startDate)}
                                    </p>
                                  )}
                                </div>

                                {/* Book Reading Tracking inside Lounge */}
                                <div className="p-4 bg-brand-white/90 border border-brand-border rounded-xl space-y-3">
                                  <div className="flex items-center gap-2 text-brand-brown">
                                    <span>📚</span>
                                    <h5 className="text-xs font-bold uppercase tracking-wider">Book Page Tracking</h5>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                                      Total Pages in Book <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      required
                                      min="1"
                                      value={focusBookTotalPages}
                                      onChange={(e) => setFocusBookTotalPages(e.target.value)}
                                      placeholder="e.g. 350"
                                      className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                                    />
                                  </div>
                                  {focusBookTotalPages && focusEstimatedDuration && (() => {
                                    const pages = parseInt(focusBookTotalPages, 10);
                                    if (isNaN(pages) || pages <= 0) return null;
                                    const today = new Date();
                                    today.setHours(0,0,0,0);
                                    const target = new Date(focusEstimatedDuration);
                                    target.setHours(0,0,0,0);
                                    const diffTime = target.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    const pagesPerDay = diffDays > 0 ? Math.ceil(pages / diffDays) : pages;
                                    return (
                                      <div className="bg-brand-beige/40 p-3 rounded-lg border border-brand-border/60 text-xs space-y-1">
                                        <p className="text-brand-brown font-semibold">
                                          📅 <strong>Time Remaining:</strong> {diffDays > 0 ? `${diffDays} days` : 'Today'} (Target: {new Date(focusEstimatedDuration).toLocaleDateString()})
                                        </p>
                                        <p className="text-brand-brown font-semibold">
                                          📖 <strong>Average Pages Daily:</strong> <span className="text-amber-700 font-extrabold text-sm">{pagesPerDay}</span> pages/day
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>

                                <p className="text-[11px] text-green-800 leading-relaxed font-semibold">
                                  ✓ Ready! Click the "Update Focus" button at the bottom of the modal to submit your request to study this book inside the Wisdom Lounge.
                                </p>
                              </motion.div>
                            ) : (
                              <div className="space-y-3">
                                <div className="border-b border-brand-border pb-2">
                                  <h4 className="font-sans text-base font-bold text-brand-text">Choose an Ongoing Circle to Join</h4>
                                  <p className="text-xs text-brand-brown-light mt-1">
                                    Book reading inside the Lounge must be registered by joining one of our active study circles. Select a group to prefill.
                                  </p>
                                </div>

                                {circlesLoading ? (
                                  <div className="flex flex-col items-center justify-center py-8 opacity-65">
                                    <Activity className="w-6 h-6 text-brand-brown animate-spin mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-brand-brown-light">Loading study circles...</span>
                                  </div>
                                ) : loungeCircles.filter(c => c.status !== 'past' && c.category === 'Book Reading').length === 0 ? (
                                  <div className="p-6 bg-brand-offwhite rounded-xl border border-dashed border-brand-border text-center">
                                    <p className="text-xs text-brand-brown-light font-bold">No active study circles found.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {loungeCircles
                                      .filter(c => c.status !== 'past' && c.category === 'Book Reading')
                                      .map((circle) => {
                                        const bookNameOrTitle = circle.bookName || circle.title;
                                        const isAlreadyJoined = activeLearner?.currentFocuses?.some(f => 
                                          f.title.toLowerCase() === bookNameOrTitle.toLowerCase()
                                        );

                                        return (
                                          <div 
                                            key={circle.id} 
                                            className={`p-4 bg-brand-white border border-brand-border rounded-2xl flex flex-col justify-between gap-3 shadow-xs transition-all ${
                                              isAlreadyJoined 
                                                ? 'opacity-65 bg-brand-offwhite/80 border-dashed' 
                                                : 'hover:border-brand-brown/50'
                                            }`}
                                          >
                                            <div>
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 rounded">
                                                  {circle.category || 'Study Circle'}
                                                </span>
                                                <span className="text-[9px] font-bold text-brand-brown-light/60">
                                                  {circle.format || 'Onsite'}
                                                </span>
                                              </div>

                                              <h5 className="font-sans font-bold text-brand-text text-sm mt-1.5 leading-tight">{circle.title}</h5>
                                              {circle.bookName && (
                                                <p className="text-xs text-brand-brown font-extrabold mt-1">
                                                  Book: <span className="text-brand-text">{circle.bookName}</span>{circle.bookAuthor ? ` (by ${circle.bookAuthor})` : ''}
                                                </p>
                                              )}
                                              {circle.subject && (
                                                <p className="text-[11px] text-emerald-800 font-extrabold mt-0.5">
                                                  Subject: <span className="text-emerald-950 font-semibold">{circle.subject}</span>
                                                </p>
                                              )}
                                              <p className="text-[11px] text-brand-brown-light font-bold mt-0.5">
                                                Host: {circle.moderator} | Schedule: {circle.schedule}
                                                {circle.startDate ? ` | Starts: ${formatDateDDMMYYYY(circle.startDate)}` : ''}
                                              </p>
                                            </div>

                                            {isAlreadyJoined ? (
                                              <div className="w-full text-center py-2 px-3 bg-green-50 text-green-700 text-xs font-black uppercase tracking-wider rounded-xl border border-green-200 border-dashed select-none">
                                                Already Joined ✓
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedCircle(circle);
                                                  setFocusTitle(circle.bookName || circle.title);
                                                  setFocusAuthor(circle.bookAuthor || (focusDomain === 'book' ? '' : circle.moderator) || '');
                                                  
                                                  if (circle.duration) {
                                                    setFocusEstimatedDuration(circle.duration);
                                                  } else {
                                                    const d = new Date();
                                                    d.setMonth(d.getMonth() + 2);
                                                    const yyyymmdd = d.toISOString().split('T')[0];
                                                    setFocusEstimatedDuration(yyyymmdd);
                                                  }
                                                }}
                                                className="w-full py-2 px-3 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                                              >
                                                Select Circle <ArrowRight className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. CIRCLES: GUIDED STUDIES (Talaqqi) */}
                        {focusDomain === 'talaqqi' && (
                          <div>
                            {selectedCircle ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-5 bg-green-50/50 border border-green-200 rounded-2xl flex flex-col space-y-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                                      <CheckCircle2 className="w-5 h-5 text-green-700" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">Selected Guided Study Circle</span>
                                      <h4 className="font-sans text-base font-bold text-brand-text mt-0.5 truncate">{selectedCircle.title}</h4>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCircle(null);
                                      setFocusModuleId(undefined);
                                      setFocusTitle('');
                                      setFocusAuthor('');
                                      setFocusEstimatedDuration('');
                                    }}
                                    className="px-3 py-1.5 border border-brand-border hover:bg-brand-offwhite text-brand-brown rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
                                  >
                                    Change
                                  </button>
                                </div>

                                <div className="bg-brand-white/80 p-4 rounded-xl border border-brand-border-light space-y-2 text-xs text-brand-brown">
                                  {selectedCircle.bookName && (
                                    <p className="font-medium text-brand-text">
                                      📖 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Course / Topic:</span> {selectedCircle.bookName}
                                    </p>
                                  )}
                                  <p className="font-medium text-brand-text">
                                    🎓 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Moderator / Teacher:</span> {selectedCircle.moderator}
                                  </p>
                                  {selectedCircle.subject && (
                                    <p className="font-medium text-brand-text">
                                      🏷️ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Subject:</span> {selectedCircle.subject}
                                    </p>
                                  )}
                                  <p className="font-medium">
                                    📅 <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Schedule:</span> {selectedCircle.schedule}
                                  </p>
                                  {selectedCircle.duration && (
                                    <p className="font-medium cursor-help" title={formatDateFull(selectedCircle.duration)}>
                                      ⏳ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Target Date:</span> {formatDateDDMMYYYY(selectedCircle.duration)}
                                    </p>
                                  )}
                                  {selectedCircle.startDate && (
                                    <p className="font-medium">
                                      🗓️ <span className="font-extrabold uppercase text-[10px] text-brand-brown-light tracking-wider">Starts:</span> {formatDateDDMMYYYY(selectedCircle.startDate)}
                                    </p>
                                  )}
                                </div>

                                <p className="text-[11px] text-green-800 leading-relaxed font-semibold">
                                  ✓ Ready! Click the "Update Focus" button at the bottom of the modal to submit your request to join this Guided Study circle inside the Wisdom Lounge.
                                </p>
                              </motion.div>
                            ) : (
                              <div className="space-y-3">
                                <div className="border-b border-brand-border pb-2">
                                  <h4 className="font-sans text-base font-bold text-brand-text">Choose an Ongoing Guided Study Circle to Join</h4>
                                  <p className="text-xs text-brand-brown-light mt-1">
                                    Guided studies inside the Lounge are structured cohorts led by teachers and moderators. Select an active circle to join.
                                  </p>
                                </div>

                                {circlesLoading ? (
                                  <div className="flex flex-col items-center justify-center py-8 opacity-65">
                                    <Activity className="w-6 h-6 text-brand-brown animate-spin mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-brand-brown-light">Loading guided study circles...</span>
                                  </div>
                                ) : loungeCircles.filter(c => c.status !== 'past' && c.category !== 'Book Reading').length === 0 ? (
                                  <div className="p-6 bg-brand-offwhite rounded-xl border border-dashed border-brand-border text-center">
                                    <p className="text-xs text-brand-brown-light font-bold">No active guided study circles found.</p>
                                    <p className="text-[11px] text-brand-brown-light/70 mt-1">Please select "Personal (Outside)" to log independent guided study.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {loungeCircles
                                      .filter(c => c.status !== 'past' && c.category !== 'Book Reading')
                                      .map((circle) => {
                                        const isAlreadyJoined = activeLearner?.currentFocuses?.some(f => 
                                          f.title.toLowerCase() === (circle.bookName || circle.title).toLowerCase()
                                        );

                                        return (
                                          <div 
                                            key={circle.id} 
                                            className={`p-4 bg-brand-white border border-brand-border rounded-2xl flex flex-col justify-between gap-3 shadow-xs transition-all ${
                                              isAlreadyJoined 
                                                ? 'opacity-65 bg-brand-offwhite/80 border-dashed' 
                                                : 'hover:border-brand-brown/50'
                                            }`}
                                          >
                                            <div>
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100/80 text-emerald-900 border border-emerald-200/80 rounded">
                                                  {circle.category || 'Guided Study'}
                                                </span>
                                                <span className="text-[9px] font-bold text-brand-brown-light/60">
                                                  {circle.format || 'Inside the Lounge'}
                                                </span>
                                              </div>

                                              <h5 className="font-sans font-bold text-brand-text text-sm mt-1.5 leading-tight">{circle.title}</h5>
                                              {circle.bookName && (
                                                <p className="text-xs text-brand-brown font-extrabold mt-1">
                                                  Course: <span className="text-brand-text">{circle.bookName}</span>
                                                </p>
                                              )}
                                              {circle.subject && (
                                                <p className="text-[11px] text-emerald-800 font-extrabold mt-0.5">
                                                  Subject: <span className="text-emerald-950 font-semibold">{circle.subject}</span>
                                                </p>
                                              )}
                                              <p className="text-[11px] text-brand-brown-light font-bold mt-0.5">
                                                Host: {circle.moderator} | Schedule: {circle.schedule}
                                                {circle.startDate ? ` | Starts: ${formatDateDDMMYYYY(circle.startDate)}` : ''}
                                              </p>
                                            </div>

                                            {isAlreadyJoined ? (
                                              <div className="w-full text-center py-2 px-3 bg-green-50 text-green-700 text-xs font-black uppercase tracking-wider rounded-xl border border-green-200 border-dashed select-none">
                                                Already Joined ✓
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedCircle(circle);
                                                  setFocusModuleId(circle.id);
                                                  setFocusTitle(circle.bookName || circle.title);
                                                  setFocusAuthor(circle.moderator || circle.bookAuthor || '');
                                                  if (circle.duration) {
                                                    setFocusEstimatedDuration(circle.duration);
                                                  } else {
                                                    const d = new Date();
                                                    d.setMonth(d.getMonth() + 2);
                                                    const yyyymmdd = d.toISOString().split('T')[0];
                                                    setFocusEstimatedDuration(yyyymmdd);
                                                  }
                                                }}
                                                className="w-full py-2 px-3 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                                              >
                                                Select Circle <ArrowRight className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4. OTHERS (Presentations, Tasks, Research Paper / Article) */}
                        {focusDomain === 'research papers/article' && (
                          <div className="p-5 bg-brand-white border border-brand-border rounded-2xl space-y-4 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-brand-border/60 pb-3">
                              <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center border border-sky-200">
                                <FileText className="w-4 h-4 text-sky-800" />
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-sky-900 block">Lounge Scholarly Initiative</span>
                                <h4 className="font-sans text-sm font-bold text-brand-text">Research Paper or Article</h4>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                                Title / Topic <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={focusTitle}
                                onChange={(e) => setFocusTitle(e.target.value)}
                                placeholder="e.g. History of Fiqh or Islamic Financial Ethics"
                                className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>

                            {/* Series vs Single Selection */}
                            <div className="bg-brand-offwhite p-3.5 rounded-xl border border-brand-border space-y-2.5">
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-text">
                                Publication Structure
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFocusIsSeries(false)}
                                  className={`p-2.5 rounded-xl border text-left transition-all ${
                                    !focusIsSeries 
                                      ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm font-bold' 
                                      : 'bg-brand-white hover:bg-brand-beige text-brand-brown border-brand-border'
                                  }`}
                                >
                                  <div className="text-xs font-bold">📄 Single Piece</div>
                                  <div className="text-[10px] opacity-80 mt-0.5">Standalone article / paper</div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFocusIsSeries(true)}
                                  className={`p-2.5 rounded-xl border text-left transition-all ${
                                    focusIsSeries 
                                      ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm font-bold' 
                                      : 'bg-brand-white hover:bg-brand-beige text-brand-brown border-brand-border'
                                  }`}
                                >
                                  <div className="text-xs font-bold">📚 Article Series</div>
                                  <div className="text-[10px] opacity-80 mt-0.5">Multiple related parts</div>
                                </button>
                              </div>

                              {focusIsSeries && (
                                <div className="mt-2 pt-2 border-t border-brand-border/60 space-y-2.5 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-950">
                                      Pieces in Series <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md border border-amber-300">
                                      +{(focusIsResearchPaper ? 30 : 15) * Math.max(2, focusSeriesCount)} Pts Total
                                    </span>
                                  </div>
                                  <input
                                    type="number"
                                    min={2}
                                    max={100}
                                    required={focusIsSeries}
                                    value={focusSeriesCount}
                                    onChange={(e) => setFocusSeriesCount(Math.max(2, parseInt(e.target.value) || 2))}
                                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-brand-offwhite border border-brand-border rounded-xl">
                              <input
                                id="focusIsResearchPaperLounge"
                                type="checkbox"
                                checked={focusIsResearchPaper}
                                onChange={(e) => setFocusIsResearchPaper(e.target.checked)}
                                className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown mt-0.5 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <label htmlFor="focusIsResearchPaperLounge" className="text-xs font-bold uppercase tracking-wide text-brand-text cursor-pointer select-none">
                                  Academic Research Paper (30 pts)
                                </label>
                                <span className="text-[10px] text-brand-brown-light leading-relaxed mt-0.5">
                                  Full scholarly paper rather than an article.
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {focusDomain === 'presentation' && (
                          <div className="p-5 bg-brand-white border border-brand-border rounded-2xl space-y-4 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-brand-border/60 pb-3">
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200">
                                <Sparkles className="w-4 h-4 text-amber-800" />
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 block">Lounge Session</span>
                                <h4 className="font-sans text-sm font-bold text-brand-text">Knowledge Sharing Presentation</h4>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                                Presentation Topic / Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={focusTitle}
                                onChange={(e) => setFocusTitle(e.target.value)}
                                placeholder="e.g. Overview of Imam al-Ghazali's Epistemology"
                                className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>
                          </div>
                        )}

                        {focusDomain === 'task' && (
                          <div className="p-5 bg-brand-white border border-brand-border rounded-2xl space-y-4 shadow-xs">
                            <div className="flex items-center gap-2 border-b border-brand-border/60 pb-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 block">Lounge Initiative</span>
                                <h4 className="font-sans text-sm font-bold text-brand-text">Wisdom Lounge Community Task</h4>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                                Task Focus / Description <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={focusTitle}
                                onChange={(e) => setFocusTitle(e.target.value)}
                                placeholder="e.g. Assisting with Lounge library indexing or event organizing"
                                className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========================================================================= */}
                    {/* PERSONAL (OUTSIDE) MODE */}
                    {/* ========================================================================= */}
                    {focusLocation === 'personal' && (
                      <div className="space-y-4">
                        {/* Domain Specific inputs for personal mode */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Specific Title or Subject <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={focusTitle}
                            onChange={(e) => setFocusTitle(e.target.value)}
                            placeholder={`e.g. ${focusDomain === 'book' ? 'The Clear Quran' : focusDomain === 'talaqqi' ? 'Aqeedah Essentials' : 'Focus Topic'}`}
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                          />
                        </div>

                        {['book', 'tafsir', 'seerah', 'dowra', 'talaqqi'].includes(focusDomain) && (
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                              {focusDomain === 'book' ? 'Author / Editor' : 'Teacher / Ustadh'}
                            </label>
                            <input
                              type="text"
                              value={focusAuthor}
                              onChange={(e) => setFocusAuthor(e.target.value)}
                              placeholder="e.g. Dr. Mustafa Khattab / Shaykh Yasir Qadhi"
                              className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                            />
                          </div>
                        )}

                        {focusDomain === 'book' && (
                          <div className="p-4 bg-brand-beige/50 border border-brand-border/60 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-brand-brown">
                              <span>📚</span>
                              <h4 className="text-xs font-bold uppercase tracking-wider">Book Reading Tracking</h4>
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                                Total Pages in Book <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={focusBookTotalPages}
                                onChange={(e) => setFocusBookTotalPages(e.target.value)}
                                placeholder="e.g. 350"
                                className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 p-3 bg-brand-offwhite border border-brand-border rounded-xl">
                          <input
                            id="focusHasCommunityPersonal"
                            type="checkbox"
                            checked={focusHasCommunity}
                            onChange={(e) => {
                              setFocusHasCommunity(e.target.checked);
                              if (!e.target.checked) setFocusCommunity('');
                            }}
                            className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown"
                          />
                          <label htmlFor="focusHasCommunityPersonal" className="text-xs font-semibold text-brand-brown cursor-pointer select-none">
                            Studied as part of an external Study Circle / Community?
                          </label>
                        </div>

                        {focusHasCommunity && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="overflow-hidden"
                          >
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1.5">
                              Circle / Community Name
                            </label>
                            <input
                              type="text"
                              value={focusCommunity}
                              onChange={(e) => setFocusCommunity(e.target.value)}
                              placeholder="e.g. AlMaghrib Institute"
                              className="w-full px-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-medium"
                            />
                          </motion.div>
                        )}

                        {/* Requirement for Personal Study Note */}
                        <div className="bg-brand-beige/70 border border-brand-border rounded-xl p-4 text-xs text-brand-brown space-y-2">
                          <p className="font-bold uppercase tracking-wider text-[10px] text-brand-brown-light">Requirement for Personal Study</p>
                          <p>Since this goal is pursued independently, you will be requested to share an overview or reflection upon completion (via a lounge session or written notes).</p>
                        </div>
                      </div>
                    )}

                    {/* Target Date Picker */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light">
                          Target Date
                        </label>
                        {focusLocation === 'lounge' && (selectedFocusModule || selectedCircle) && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                            Auto-synced with Lounge Schedule
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        lang="en-GB"
                        required
                        value={focusEstimatedDuration}
                        onChange={(e) => setFocusEstimatedDuration(e.target.value)}
                        className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown font-mono"
                      />
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="pt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsFocusModalOpen(false)}
                        className={`${
                          focusLocation === 'lounge' && 
                          ['tafsir', 'seerah', 'dowra', 'book', 'talaqqi'].includes(focusDomain) && 
                          !selectedFocusModule && !selectedCircle
                            ? 'w-full'
                            : 'flex-1'
                        } px-6 py-3 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest text-brand-brown hover:bg-brand-offwhite active:scale-95 transition-all`}
                      >
                        Cancel
                      </button>

                      {!(
                        focusLocation === 'lounge' && 
                        ['tafsir', 'seerah', 'dowra', 'book', 'talaqqi'].includes(focusDomain) && 
                        !selectedFocusModule && !selectedCircle
                      ) && (
                        <button
                          type="submit"
                          disabled={isFocusSubmitting}
                          className="flex-2 px-6 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isFocusSubmitting ? 'Updating...' : (
                            <>
                              <Send className="w-4 h-4" />
                              Update Focus
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Add to Bucket List Modal */}
          <AnimatePresence>
            {isBucketModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-brand-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col"
                >
                  <div className="px-6 py-4 bg-brand-beige border-b border-brand-border flex items-center justify-between shrink-0">
                    <h3 className="font-sans text-xl font-bold text-brand-text flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                      <span>Add to Bucket List</span>
                    </h3>
                    <button onClick={() => setIsBucketModalOpen(false)} className="p-2 hover:bg-brand-border rounded-full transition-colors cursor-pointer">
                      <X className="w-5 h-5 text-brand-brown" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddToBucketList} className="p-6 space-y-5 overflow-y-auto flex-1">
                    
                    {/* Sub-categorized Domain Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light">
                          Select Domain
                        </label>
                        <span className="text-[10px] text-brand-brown-light/70 font-semibold">
                          Choose a category below
                        </span>
                      </div>

                      {/* 1st Category: Modules */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200/70 flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3 text-amber-700" /> Modules
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Structured Islamic courses</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: 'tafsir', label: 'Tafsir' },
                            { type: 'seerah', label: 'Seerah' },
                            { type: 'dowra', label: 'Dowra e Quran' }
                          ].map(domain => {
                            const isSelected = bucketItemDomain === domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setBucketItemDomain(domain.type);
                                  setBucketItemTitle('');
                                  setBucketItemAuthor('');
                                }}
                                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } active:scale-98`}
                              >
                                <span className="leading-tight truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2nd Category: Circles */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200/70 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-emerald-700" /> Circles
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Reading & guided cohorts</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { type: 'book', label: 'Books' },
                            { type: 'talaqqi', label: 'Guided Studies' }
                          ].map(domain => {
                            const isSelected = bucketItemDomain === domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setBucketItemDomain(domain.type);
                                  setBucketItemTitle('');
                                  setBucketItemAuthor('');
                                }}
                                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } active:scale-98`}
                              >
                                <span className="leading-tight truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3rd Category: Others */}
                      <div className="bg-brand-offwhite p-3 rounded-2xl border border-brand-border/80 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-sky-900 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200/70 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-sky-700" /> Others
                          </span>
                          <span className="text-[10px] text-brand-brown-light/70 font-medium">Independent learning tasks</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: 'presentation', label: 'Presentations' },
                            { type: 'task', label: 'Tasks' },
                            { type: 'research papers/article', label: 'Research Paper / Article' }
                          ].map(domain => {
                            const isSelected = bucketItemDomain === domain.type;
                            return (
                              <button
                                key={domain.type}
                                type="button"
                                onClick={() => {
                                  setBucketItemDomain(domain.type);
                                  setBucketItemTitle('');
                                  setBucketItemAuthor('');
                                }}
                                className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm'
                                    : 'bg-brand-white text-brand-brown border-brand-border hover:border-brand-brown/40 hover:bg-brand-beige/20'
                                } active:scale-98`}
                              >
                                <span className="leading-tight text-[11px] truncate">{domain.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Domain Specific Input Fields */}
                    {bucketItemDomain === 'book' && (
                      <div className="space-y-4">
                        {/* Source Selection (From Library vs Manual) */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Book Source</label>
                          <div className="grid grid-cols-2 gap-2 bg-brand-offwhite p-1.5 rounded-xl border border-brand-border">
                            <button
                              type="button"
                              onClick={() => {
                                setBucketIsFromLibrary(true);
                                setBucketItemTitle('');
                                setBucketItemAuthor('');
                                setSelectedLibraryBook(null);
                              }}
                              className={`py-2 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1.5 ${bucketIsFromLibrary ? 'bg-brand-brown text-brand-offwhite shadow-sm' : 'text-brand-brown hover:bg-brand-beige/50'}`}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Choose from Library
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBucketIsFromLibrary(false);
                                setSelectedLibraryBook(null);
                                setBucketItemTitle('');
                                setBucketItemAuthor('');
                              }}
                              className={`py-2 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex justify-center items-center gap-1.5 ${!bucketIsFromLibrary ? 'bg-brand-brown text-brand-offwhite shadow-sm' : 'text-brand-brown hover:bg-brand-beige/50'}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Enter Manually
                            </button>
                          </div>
                        </div>

                        {/* From Library Selection */}
                        {bucketIsFromLibrary ? (
                          <div className="space-y-3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light">Select from Wisdom Archive</label>
                            
                            {!selectedLibraryBook ? (
                              <div className="space-y-3">
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={bucketLibrarySearch}
                                    onChange={(e) => setBucketLibrarySearch(e.target.value)}
                                    placeholder="Search archive books or authors..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                                  />
                                  <Search className="w-4 h-4 text-brand-brown-light absolute left-3.5 top-3.5" />
                                </div>

                                <div className="border border-brand-border rounded-xl bg-brand-offwhite max-h-48 overflow-y-auto divide-y divide-brand-border/60">
                                  {archiveBooks.filter(book => 
                                    !bucketLibrarySearch ||
                                    book.title.toLowerCase().includes(bucketLibrarySearch.toLowerCase()) ||
                                    book.author.toLowerCase().includes(bucketLibrarySearch.toLowerCase())
                                  ).length > 0 ? (
                                    archiveBooks.filter(book => 
                                      !bucketLibrarySearch ||
                                      book.title.toLowerCase().includes(bucketLibrarySearch.toLowerCase()) ||
                                      book.author.toLowerCase().includes(bucketLibrarySearch.toLowerCase())
                                    ).map((book) => (
                                      <button
                                        key={book.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedLibraryBook(book);
                                          setBucketItemTitle(book.title);
                                          setBucketItemAuthor(book.author);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-brand-beige/40 transition-colors flex flex-col cursor-pointer"
                                      >
                                        <span className="text-sm font-semibold text-brand-text leading-tight">{book.title}</span>
                                        <span className="text-xs text-brand-brown-light italic mt-0.5">by {book.author}</span>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="p-4 text-center text-xs text-brand-brown-light">
                                      No matching archive books found. Try typing custom details in "Enter Manually" tab.
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4">
                                <div className="flex gap-2.5">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Linked Archive Book</span>
                                    <h4 className="font-sans text-base font-bold text-brand-text leading-tight mt-0.5">{selectedLibraryBook.title}</h4>
                                    <p className="text-xs text-brand-brown-light italic mt-1">by {selectedLibraryBook.author}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLibraryBook(null);
                                    setBucketItemTitle('');
                                    setBucketItemAuthor('');
                                  }}
                                  className="text-xs font-bold text-red-600 hover:text-red-700 underline shrink-0 cursor-pointer"
                                >
                                  Change Book
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Manual Entry Mode */
                          <div className="space-y-4">
                            {/* Title */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                Book Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={bucketItemTitle}
                                onChange={(e) => setBucketItemTitle(e.target.value)}
                                placeholder="e.g. Riyadus Saliheen..."
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                              />
                            </div>

                            {/* Author input with suggestions */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                                Author / Scholar <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                list="archive-authors"
                                required
                                value={bucketItemAuthor}
                                onChange={(e) => setBucketItemAuthor(e.target.value)}
                                placeholder="e.g. Imam an-Nawawi, Ibn al-Qayyim..."
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                              />
                              <datalist id="archive-authors">
                                {archiveAuthors.map(author => (
                                  <option key={author} value={author} />
                                ))}
                              </datalist>
                            </div>
                          </div>
                        )}

                        {/* Circle/Community studies toggle */}
                        <div className="space-y-3 pt-2">
                          <label className="flex items-center gap-3.5 bg-brand-offwhite/40 hover:bg-brand-offwhite p-4 rounded-2xl border border-brand-border-light cursor-pointer transition-colors">
                            <input 
                              type="checkbox"
                              checked={bucketItemHasCommunity}
                              onChange={(e) => setBucketItemHasCommunity(e.target.checked)}
                              className="w-4.5 h-4.5 rounded border-brand-border text-brand-brown focus:ring-brand-brown cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-black uppercase text-brand-text block">Studied with a Circle / Community?</span>
                              <span className="text-[10px] text-brand-brown-light leading-normal block mt-0.5">Toggle if this is a group study plan.</span>
                            </div>
                          </label>

                          {bucketItemHasCommunity && (
                            <motion.div 
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-brand-beige/20 p-4 rounded-2xl border border-brand-border/40"
                            >
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Circle / Community Name <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                required={bucketItemHasCommunity}
                                value={bucketItemCommunity}
                                onChange={(e) => setBucketItemCommunity(e.target.value)}
                                placeholder="e.g. Fajr Study Circle"
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}

                    {bucketItemDomain === 'research papers/article' && (
                      <div className="space-y-4">
                        {/* Title / Topic */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Title / Topic <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bucketItemTitle}
                            onChange={(e) => setBucketItemTitle(e.target.value)}
                            placeholder="e.g. Islamic Finance and Modern Waqf Structures..."
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>

                        {/* Series vs Single Selection */}
                        <div className="bg-brand-bg-alt/80 p-4 rounded-2xl border border-brand-border/80 space-y-3">
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-text">
                            Article Structure
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setBucketItemIsSeries(false)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                !bucketItemIsSeries 
                                  ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm font-bold' 
                                  : 'bg-brand-offwhite hover:bg-brand-brown/10 text-brand-brown border-brand-border'
                              }`}
                            >
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                📄 Single Piece
                              </div>
                              <div className="text-[10px] opacity-80 mt-0.5">Standalone article / paper</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setBucketItemIsSeries(true)}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                bucketItemIsSeries 
                                  ? 'bg-brand-brown text-brand-offwhite border-brand-brown shadow-sm font-bold' 
                                  : 'bg-brand-offwhite hover:bg-brand-brown/10 text-brand-brown border-brand-border'
                              }`}
                            >
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                📚 Article Series
                              </div>
                              <div className="text-[10px] opacity-80 mt-0.5">Multiple related parts</div>
                            </button>
                          </div>

                          {bucketItemIsSeries && (
                            <div className="mt-3 pt-3 border-t border-brand-border/60 space-y-3 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-950">
                                    Number of Article Pieces <span className="text-red-500">*</span>
                                  </label>
                                  <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-md border border-amber-300">
                                    +{(bucketItemIsResearchPaper ? 30 : 15) * Math.max(2, bucketItemSeriesCount)} Pts Total
                                  </span>
                                </div>
                                <input
                                  type="number"
                                  min={2}
                                  max={100}
                                  required={bucketItemIsSeries}
                                  value={bucketItemSeriesCount}
                                  onChange={(e) => setBucketItemSeriesCount(Math.max(2, parseInt(e.target.value) || 2))}
                                  className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <p className="text-[10px] text-amber-800/90 mt-1">
                                  * Completing a series scales your score! Each piece adds +{bucketItemIsResearchPaper ? 30 : 15} points.
                                </p>
                              </div>

                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1">
                                  Titles / Names of Articles in Series (Optional)
                                </label>
                                <textarea
                                  value={bucketItemSeriesTitles}
                                  onChange={(e) => setBucketItemSeriesTitles(e.target.value)}
                                  placeholder="e.g. Part 1: Foundations, Part 2: Analysis, Part 3: Modern Applications"
                                  rows={2}
                                  className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-xs text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                />
                                <p className="text-[10px] text-amber-800/80 mt-0.5">
                                  Optionally list the names of all articles in this series.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Online Link */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Online Link (Optional)
                          </label>
                          <input
                            type="url"
                            value={bucketItemLink}
                            onChange={(e) => setBucketItemLink(e.target.value)}
                            placeholder="e.g. https://example.com/paper.pdf"
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>

                        {/* Description / Learnings */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Description / What You Seek To Learn (Optional)
                          </label>
                          <textarea
                            value={bucketItemOverview}
                            onChange={(e) => setBucketItemOverview(e.target.value)}
                            placeholder="Brief description of the research paper or article..."
                            rows={3}
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium resize-none"
                          />
                        </div>

                        {/* Is Scholarly Research Paper */}
                        <label className="flex items-center gap-3.5 bg-brand-offwhite/40 hover:bg-brand-offwhite p-4 rounded-2xl border border-brand-border-light cursor-pointer transition-colors">
                          <input 
                            type="checkbox"
                            checked={bucketItemIsResearchPaper}
                            onChange={(e) => setBucketItemIsResearchPaper(e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-brand-border text-brand-brown focus:ring-brand-brown cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-black uppercase text-brand-text block">Is Scholarly Research Paper?</span>
                            <span className="text-[10px] text-brand-brown-light leading-normal block mt-0.5">Toggle if this is an academic research paper (worth 30 points per piece on completion).</span>
                          </div>
                        </label>
                      </div>
                    )}

                    {bucketItemDomain === 'talaqqi' && (
                      <div className="space-y-4">
                        {/* Course Title */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Course / Book Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bucketItemTitle}
                            onChange={(e) => setBucketItemTitle(e.target.value)}
                            placeholder="e.g. Sharh Al-Aqeedah Al-Wasitiyyah"
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>

                        {/* Name of Ustad */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Name of Ustad / Teacher <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bucketItemUstadName}
                            onChange={(e) => setBucketItemUstadName(e.target.value)}
                            placeholder="e.g. Sheikh Bilal Ismail"
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>

                        {/* Online Toggle */}
                        <label className="flex items-center gap-3.5 bg-brand-offwhite/40 hover:bg-brand-offwhite p-4 rounded-2xl border border-brand-border-light cursor-pointer transition-colors">
                          <input 
                            type="checkbox"
                            checked={bucketItemIsOnline}
                            onChange={(e) => setBucketItemIsOnline(e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-brand-border text-brand-brown focus:ring-brand-brown cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-black uppercase text-brand-text block">Pursuing Online?</span>
                            <span className="text-[10px] text-brand-brown-light leading-normal block mt-0.5">Toggle if this course is studied through online materials.</span>
                          </div>
                        </label>

                        {/* Online Source URL */}
                        {bucketItemIsOnline && (
                          <motion.div 
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-brand-beige/20 p-4 rounded-2xl border border-brand-border/40"
                          >
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Source / Link <span className="text-red-500">*</span></label>
                            <input 
                              type="text"
                              required={bucketItemIsOnline}
                              value={bucketItemSource}
                              onChange={(e) => setBucketItemSource(e.target.value)}
                              placeholder="e.g. YouTube Playlist, AMAU Academy link..."
                              className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                            />
                          </motion.div>
                        )}

                        {/* Specific Subject */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Specific Subject (Optional)
                          </label>
                          <input
                            type="text"
                            value={bucketItemSubject}
                            onChange={(e) => setBucketItemSubject(e.target.value)}
                            placeholder="e.g. Aqidah, Fiqh, Hadith, Arabic..."
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>

                        {/* Learning Objective */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Learning Objective (Optional)
                          </label>
                          <input
                            type="text"
                            value={bucketItemObjective}
                            onChange={(e) => setBucketItemObjective(e.target.value)}
                            placeholder="e.g. Master the foundational chapters of Aqidah..."
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>

                        {/* Study Circle Toggle */}
                        <div className="space-y-3 pt-2">
                          <label className="flex items-center gap-3.5 bg-brand-offwhite/40 hover:bg-brand-offwhite p-4 rounded-2xl border border-brand-border-light cursor-pointer transition-colors">
                            <input 
                              type="checkbox"
                              checked={bucketItemHasCommunity}
                              onChange={(e) => setBucketItemHasCommunity(e.target.checked)}
                              className="w-4.5 h-4.5 rounded border-brand-border text-brand-brown focus:ring-brand-brown cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-black uppercase text-brand-text block">Studied with a Circle / Community?</span>
                              <span className="text-[10px] text-brand-brown-light leading-normal block mt-0.5">Toggle if this is a group study plan.</span>
                            </div>
                          </label>

                          {bucketItemHasCommunity && (
                            <motion.div 
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-brand-beige/20 p-4 rounded-2xl border border-brand-border/40"
                            >
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Circle / Community Name <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                required={bucketItemHasCommunity}
                                value={bucketItemCommunity}
                                onChange={(e) => setBucketItemCommunity(e.target.value)}
                                placeholder="e.g. Fajr Study Circle"
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}

                    {['tafsir', 'seerah', 'dowra'].includes(bucketItemDomain) && (
                      <div className="space-y-4">
                        {/* Course Title */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Course / Book Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bucketItemTitle}
                            onChange={(e) => setBucketItemTitle(e.target.value)}
                            placeholder="e.g. Tafsir of Juz Amma, Seerah of Prophet Muhammad..."
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>

                        {/* Author / Teacher */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Author / Scholar / Teacher <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bucketItemAuthor}
                            onChange={(e) => setBucketItemAuthor(e.target.value)}
                            placeholder="e.g. Dr. Yasir Qadhi"
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>

                        {/* Study Circle Toggle */}
                        <div className="space-y-3 pt-2">
                          <label className="flex items-center gap-3.5 bg-brand-offwhite/40 hover:bg-brand-offwhite p-4 rounded-2xl border border-brand-border-light cursor-pointer transition-colors">
                            <input 
                              type="checkbox"
                              checked={bucketItemHasCommunity}
                              onChange={(e) => setBucketItemHasCommunity(e.target.checked)}
                              className="w-4.5 h-4.5 rounded border-brand-border text-brand-brown focus:ring-brand-brown cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-black uppercase text-brand-text block">Studied with a Circle / Community?</span>
                              <span className="text-[10px] text-brand-brown-light leading-normal block mt-0.5">Toggle if this is a group study plan.</span>
                            </div>
                          </label>

                          {bucketItemHasCommunity && (
                            <motion.div 
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-brand-beige/20 p-4 rounded-2xl border border-brand-border/40"
                            >
                              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Circle / Community Name <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                required={bucketItemHasCommunity}
                                value={bucketItemCommunity}
                                onChange={(e) => setBucketItemCommunity(e.target.value)}
                                placeholder="e.g. Fajr Study Circle"
                                className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}

                    {bucketItemDomain === 'task' && (
                      <div className="space-y-4">
                        {/* Task Title */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Current Task Focus / Description <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bucketItemTitle}
                            onChange={(e) => setBucketItemTitle(e.target.value)}
                            placeholder="e.g. Memorize Surah Al-Mulk, Review Arabic verbs..."
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {bucketItemDomain === 'presentation' && (
                      <div className="space-y-4">
                        {/* Topic / Title */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            Presentation Title / Topic <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={bucketItemTitle}
                            onChange={(e) => setBucketItemTitle(e.target.value)}
                            placeholder="e.g. Islamic Endowments (Waqf) in the 21st Century"
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Custom Notes */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                        Notes / Why you want to study this (Optional)
                      </label>
                      <textarea
                        value={bucketItemNotes}
                        onChange={(e) => setBucketItemNotes(e.target.value)}
                        placeholder="e.g. To strengthen my daily connection with hadith, prepare for a class..."
                        rows={3}
                        className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown resize-none text-brand-text font-medium"
                      />
                    </div>

                    {/* Buttons */}
                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsBucketModalOpen(false)}
                        className="flex-1 px-6 py-3 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest text-brand-brown hover:bg-brand-offwhite active:scale-95 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isBucketSubmitting || isBucketFormInvalid}
                        className="flex-1 px-6 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isBucketSubmitting ? 'Adding...' : (
                          <>
                            <Send className="w-4 h-4" />
                            Add To Bucket List
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Tracker Modal */}
          {isTrackerModalOpen && selectedFocusTracker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-brand-brown-dark/60 backdrop-blur-sm"
                onClick={() => setIsTrackerModalOpen(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-brand-white rounded-3xl overflow-hidden shadow-2xl border border-brand-border flex flex-col max-h-[80vh]"
              >
                <div className="p-6 bg-brand-beige border-b border-brand-border">
                  <div className="flex justify-between items-start mb-2">
                     <div>
                       <h3 className="font-sans text-xl font-bold text-brand-text leading-tight">Session Tracker</h3>
                       <p className="text-brand-brown-light text-xs mt-1">
                         <span className="font-bold text-brand-brown">{currentFocusTracker?.title}</span>
                       </p>
                     </div>
                     <button 
                       onClick={() => setIsTrackerModalOpen(false)}
                       className="p-2 text-brand-brown-light hover:text-brand-brown rounded-full hover:bg-brand-brown/10 transition-colors"
                     >
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                 </div>
                 
                 <div className="p-4 overflow-y-auto bg-brand-offwhite flex-1 space-y-3">
                   {(() => {
                     const matchingModule = loungeModules.find(m => {
                       if (currentFocusTracker?.moduleId && m.id === currentFocusTracker.moduleId) {
                         return true;
                       }
                       const fTitle = currentFocusTracker?.title?.toLowerCase() || '';
                       const mTitle = m.title.toLowerCase();
                       const mBatch = m.batch.toLowerCase();
                       return fTitle === mTitle || 
                              fTitle === mBatch || 
                              fTitle.includes(mTitle) || 
                              fTitle.includes(mBatch) ||
                              mTitle.includes(fTitle) ||
                              mBatch.includes(fTitle);
                     });

                    const ORIENTATION_DATE = matchingModule?.orientationDate || '2026-06-14';
                    const sessionMap: Record<string, number> = {};

                    if (matchingModule?.sessionDates && matchingModule.sessionDates.length > 0) {
                      matchingModule.sessionDates.forEach((dateStr, index) => {
                        sessionMap[dateStr] = index + 1;
                      });
                    } else {
                      // Automatic calculation fallback
                      const TRACKER_CONFIG = {
                        ORIENTATION_DATE,
                        SESSION_DAYS: [1, 3], // Mon, Wed
                        DURATION_MONTHS: 2
                      };
                      const startArr = TRACKER_CONFIG.ORIENTATION_DATE.split('-');
                      const startUTC = new Date(Date.UTC(parseInt(startArr[0]), parseInt(startArr[1]) - 1, parseInt(startArr[2])));
                      const endUTC = new Date(Date.UTC(parseInt(startArr[0]), parseInt(startArr[1]) - 1 + TRACKER_CONFIG.DURATION_MONTHS, parseInt(startArr[2])));
                      
                      let sessionCounter = 1;
                      const tempDate = new Date(startUTC);
                      tempDate.setUTCDate(tempDate.getUTCDate() + 1); // Start counting sessions from the day AFTER orientation
                      while (tempDate <= endUTC) {
                        if (TRACKER_CONFIG.SESSION_DAYS.includes(tempDate.getUTCDay())) {
                          sessionMap[tempDate.toISOString().split('T')[0]] = sessionCounter++;
                        }
                        tempDate.setUTCDate(tempDate.getUTCDate() + 1);
                      }
                    }

                    const year = trackerMonth.getFullYear();
                    const month = trackerMonth.getMonth();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const firstDayOfMonth = new Date(year, month, 1).getDay();
                    
                    const days = [];
                    for (let i = 0; i < firstDayOfMonth; i++) {
                      days.push(null);
                    }
                    for (let i = 1; i <= daysInMonth; i++) {
                      days.push(i);
                    }

                    return (
                      <div className="flex flex-col h-full space-y-4">
                        <div className="flex items-center justify-between">
                          <button 
                            type="button"
                            onClick={() => setTrackerMonth(new Date(year, month - 1, 1))}
                            className="p-1 hover:bg-brand-brown/10 rounded-full text-brand-brown-light hover:text-brand-brown transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <span className="font-sans font-bold text-lg text-brand-text">
                            {trackerMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>
                          <button 
                            type="button"
                            onClick={() => setTrackerMonth(new Date(year, month + 1, 1))}
                            className="p-1 hover:bg-brand-brown/10 rounded-full text-brand-brown-light hover:text-brand-brown transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-[10px] font-black uppercase text-brand-brown-light py-2">
                              {day}
                            </div>
                          ))}
                          {days.map((day, idx) => {
                            if (day === null) {
                              return <div key={`empty-${idx}`} className="h-10" />
                            }
                            
                            const d = new Date(Date.UTC(year, month, day));
                            const dateStr = d.toISOString().split('T')[0];
                            const status = currentFocusTracker?.sessionAttendance?.[dateStr];
                            const isAttended = status === 'attended';
                            const isMissed = status === 'missed';
                            
                            const sessionNum = sessionMap[dateStr];
                            const isSessionDate = !!sessionNum;
                            const isOrientationDay = dateStr === ORIENTATION_DATE;
                            
                            const isClickable = isSessionDate || isOrientationDay || isAdmin;

                            return (
                              <div key={day} className="relative flex flex-col items-center">
                                <button
                                  type="button"
                                  disabled={!isClickable}
                                  onClick={() => {
                                    if (isClickable) {
                                      handleUpdateAttendance(dateStr, isAttended ? 'missed' : isMissed ? undefined : 'attended');
                                    }
                                  }}
                                  className={`w-full h-11 rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all leading-none ${
                                    isAttended ? 'bg-green-500 text-white shadow-sm font-bold' : 
                                    isMissed ? 'bg-red-500 text-white shadow-sm font-bold' : 
                                    isSessionDate || isOrientationDay ? 'bg-brand-beige text-brand-brown font-bold border-2 border-brand-brown/40 hover:bg-brand-brown/10 hover:border-brand-brown cursor-pointer' : 
                                    isAdmin ? 'bg-brand-white text-brand-text border border-brand-border hover:border-brand-brown hover:bg-brand-brown/5 cursor-pointer' :
                                    'bg-brand-offwhite/50 text-brand-brown-light/40 border border-brand-border-light/40 cursor-not-allowed'
                                  }`}
                                >
                                  <span>{day}</span>
                                  {isOrientationDay && <span className="text-[8px] uppercase tracking-tighter opacity-80 mt-1">Orient</span>}
                                  {isSessionDate && <span className="text-[9px] font-mono opacity-80 mt-1">S{sessionNum}</span>}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-brand-brown-light justify-center border-t border-brand-border">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span>Attended</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span>Missed</span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            <div className="w-3 h-3 rounded-md bg-brand-beige border-2 border-brand-brown/40" />
                            <span>Expected Session</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="p-4 bg-brand-white border-t border-brand-border">
                  <button 
                    onClick={() => setIsTrackerModalOpen(false)}
                    className="w-full px-4 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}

      {/* Global Floating Toast Alerts */}
      <AnimatePresence>
        {(success || error) && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-brand-white border border-brand-border rounded-2xl shadow-xl overflow-hidden p-4 flex gap-3 items-start"
          >
            {success ? (
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                <Info className="w-5 h-5 text-red-600" />
              </div>
            )}
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-brown-light">{success ? 'Alhamdulillah Success' : 'Error Notice'}</p>
              <p className="text-xs font-semibold text-brand-text leading-relaxed mt-1">{success || error}</p>
            </div>
            <button 
              onClick={() => { setSuccess(null); setError(null); }}
              className="text-brand-brown-light hover:text-brand-brown p-1 hover:bg-brand-bg-alt rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Card Modal */}
      {isCelebrationCardOpen && (
        <CelebrationCardModal
          isOpen={isCelebrationCardOpen}
          onClose={() => setIsCelebrationCardOpen(false)}
          data={celebrationCardData}
        />
      )}
    </div>
  );
}

function StatsCard({ title, value, icon, variant = 'default' }: { title: string, value: number | string, icon: ReactNode, key?: string, variant?: 'default' | 'primary' | 'secondary' }) {
  const bgStyles = {
    default: 'bg-brand-beige border-brand-border',
    primary: 'bg-brand-brown text-brand-offwhite border-brand-brown',
    secondary: 'bg-brand-white border-brand-brown/10'
  };

  const titleStyles = {
    default: 'text-brand-brown-light',
    primary: 'text-brand-beige/70',
    secondary: 'text-brand-brown/40'
  };

  const valueStyles = {
    default: 'text-brand-brown',
    primary: 'text-brand-offwhite',
    secondary: 'text-brand-brown'
  };

  const iconStyles = {
    default: 'text-brand-brown opacity-5',
    primary: 'text-brand-beige opacity-10',
    secondary: 'text-brand-brown opacity-[0.03]'
  };

  return (
    <div className={`${bgStyles[variant]} p-6 sm:p-8 rounded-[2rem] border shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col items-start relative overflow-hidden h-40 justify-center transition-all hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-1 group`}>
      <div className={`absolute -right-6 -bottom-6 ${iconStyles[variant]} scale-[2.5] transition-transform duration-700 group-hover:scale-[3] group-hover:-rotate-12`}>
        {icon}
      </div>
      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${titleStyles[variant]} mb-2 relative z-10 break-words w-full`}>{title}</p>
      <div className="flex items-baseline gap-1 relative z-10">
        <p className={`text-4xl sm:text-5xl font-sans font-black ${valueStyles[variant]} leading-none`}>{value}</p>
        {typeof value === 'number' && <span className={`text-xs font-bold ${titleStyles[variant]} mb-1 opacity-60`}>pts</span>}
      </div>
    </div>
  );
}

function ListCard({ title, items, emptyText }: { title: string, items: string[], emptyText: string, key?: string }) {
  return (
    <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-brand-border flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-brand-border-light">
        <h3 className="font-sans text-xl font-bold text-brand-text">{title}</h3>
        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-bold shrink-0">
          {items.length} {items.length === 1 ? 'completed' : 'completed'}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-brand-brown-light text-sm italic">{emptyText}</p>
      ) : (
        <ul className="space-y-3 flex-1 overflow-y-auto max-h-60 pr-2">
          {items.map((item, i) => {
            const linkMatch = item.match(/\[Link:\s*([^\]]+)\]/);
            const overviewMatch = item.match(/\(Overview:\s*([^\)]+)\)/);
            
            let cleanItem = item;
            let linkUrl = '';
            if (linkMatch) {
              cleanItem = cleanItem.replace(linkMatch[0], '').trim();
              linkUrl = linkMatch[1];
            }
            
            let overviewText = '';
            if (overviewMatch) {
              cleanItem = cleanItem.replace(overviewMatch[0], '').trim();
              overviewText = overviewMatch[1];
            }
            // Clean trailing dashes or spaces
            cleanItem = cleanItem.replace(/\s*-\s*$/, '').trim();

            return (
              <li key={i} className="flex flex-col bg-brand-bg-alt p-3 rounded-lg border border-brand-border-light text-sm gap-1.5">
                <span className="text-brand-text font-medium">{toTitleCase(cleanItem)}</span>
                {linkUrl && (
                  <div className="text-xs">
                    <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[10px]">Link: </span>
                    <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">{linkUrl}</a>
                  </div>
                )}
                {overviewText && (
                  <div className="text-xs text-brand-brown/80 bg-brand-white/75 p-2 rounded border border-brand-border-light italic">
                    <span className="font-bold not-italic block text-brand-brown-light text-[9px] uppercase tracking-wider mb-0.5">Description</span>
                    "{overviewText}"
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}