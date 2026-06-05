import { useState, FormEvent, ReactNode, useMemo, useEffect } from 'react';
import { Learner, EditRequest, FocusReminder } from '../types';
import { 
  BookOpen, Mic, CheckCircle2, Search, Medal, Eye, EyeOff, 
  LayoutDashboard, BarChart3, Plus, X, Clock, Send, Info, Lock,
  Bell, Calendar, HelpCircle, Flame, Activity, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLearnerBadges, ALL_BADGES } from '../lib/badges';
import { getLearnerStatus, getStatusProgress } from '../lib/status';
import { requestService } from '../services/requestService';
import { reminderService } from '../services/reminderService';
import { authService } from '../lib/auth';
import { MODULES, APP_DOMAINS } from '../constants';
import { getOverallPoints, getDomainValue } from '../utils';
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
  if (mod.type === 'articles' && learner.completedArticlesModule && items.length === 0) items = ['Articles (Completed)'];

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

export function LearnerDashboard({ 
  learners, 
  onRegister,
  activeLearner,
  setActiveLearner,
  pendingEnrollment
}: { 
  learners: Learner[], 
  onRegister: (data: Omit<Learner, 'joinedAt'>) => void,
  activeLearner: Learner | null,
  setActiveLearner: (learner: Learner | null) => void,
  pendingEnrollment?: { title: string, category: string, duration?: string, speaker?: string } | null
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
  const [requestType, setRequestType] = useState<EditRequest['type']>(APP_DOMAINS[0]?.type || 'book');
  
  const [pendingRequests, setPendingRequests] = useState<EditRequest[]>([]);
  const [reminders, setReminders] = useState<FocusReminder[]>([]);
  const [allLearnerRequests, setAllLearnerRequests] = useState<EditRequest[]>([]);

  // Reminder Response State
  const [activeReplyReminderId, setActiveReplyReminderId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyDate, setReplyDate] = useState('');
  const [replyType, setReplyType] = useState<'text' | 'date' | null>(null);
  const [isReminderSubmitting, setIsReminderSubmitting] = useState(false);

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
  const [itemTitle, setItemTitle] = useState('');
  const [itemAuthor, setItemAuthor] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [timeTaken, setTimeTaken] = useState('');
  const [taskCount, setTaskCount] = useState(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeDomain = useMemo(() => APP_DOMAINS.find(d => d.type === requestType), [requestType]);
  const isTaskLike = requestType === 'task';

  useEffect(() => {
    if (activeLearner) {
      const unsubscribe = requestService.subscribeToRequests((allRequests) => {
        const userReqs = allRequests.filter(r => r.learnerId === activeLearner.id);
        const pending = userReqs.filter(r => r.status === 'pending');
        setPendingRequests(pending);
        setAllLearnerRequests(userReqs);
      });
      return () => unsubscribe();
    }
  }, [activeLearner]);

  useEffect(() => {
    if (activeLearner) {
      reminderService.checkAndGenerateReminders(
        activeLearner.id,
        activeLearner.fullName,
        activeLearner.currentFocuses || []
      );

      const unsubscribe = reminderService.subscribeToLearnerReminders(activeLearner.id, (allReminders) => {
        setReminders(allReminders);
      });
      return () => unsubscribe();
    }
  }, [activeLearner, activeLearner?.currentFocuses]);

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeLearner) return;

    setIsSubmitting(true);
    try {
      const normType = requestType.endsWith('s') ? requestType.slice(0, -1) : requestType;
      await requestService.submitRequest({
        learnerId: activeLearner.id,
        learnerName: activeLearner.fullName,
        type: normType,
        details: {
          title: itemTitle,
          author: itemAuthor,
          completedAt: completionDate,
          duration: timeTaken,
          count: taskCount,
          description: description
        }
      });
      setSuccess("Your update request has been submitted for admin approval.");
      setIsRequestModalOpen(false);
      // Reset form
      setItemTitle('');
      setItemAuthor('');
      setCompletionDate('');
      setTimeTaken('');
      setTaskCount(1);
      setDescription('');
    } catch (err) {
      setError("Failed to submit request. Please try again.");
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
  const [focusTitle, setFocusTitle] = useState('');
  const [focusAuthor, setFocusAuthor] = useState('');
  const [focusEstimatedDuration, setFocusEstimatedDuration] = useState('');
  const [focusCommunity, setFocusCommunity] = useState('');
  const [focusLocation, setFocusLocation] = useState<'lounge' | 'personal'>('lounge');
  const [isLoungeModule, setIsLoungeModule] = useState(false);

  useEffect(() => {
    if (pendingEnrollment && activeLearner) {
      setFocusDomain(pendingEnrollment.category);
      setFocusTitle(pendingEnrollment.title);
      if (pendingEnrollment.duration) setFocusEstimatedDuration(pendingEnrollment.duration);
      if (pendingEnrollment.speaker) setFocusAuthor(pendingEnrollment.speaker);
      setFocusLocation('lounge');
      setIsLoungeModule(true);
      setIsFocusModalOpen(true);
    }
  }, [pendingEnrollment, activeLearner]);

  const handleUpdateFocus = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeLearner) return;

    setIsFocusSubmitting(true);
    try {
      const normDomain = focusDomain.endsWith('s') ? focusDomain.slice(0, -1) : focusDomain;
      await requestService.submitRequest({
        learnerId: activeLearner.id,
        learnerName: activeLearner.fullName,
        type: normDomain,
        isFocus: true,
        details: {
          title: focusTitle,
          author: focusAuthor,
          estimatedDuration: focusEstimatedDuration,
          location: focusLocation,
          community: focusCommunity
        }
      });
      setIsFocusModalOpen(false);
      setFocusTitle('');
      setFocusAuthor('');
      setFocusCommunity('');
      setFocusEstimatedDuration('');
      setFocusLocation('lounge');
      setIsLoungeModule(false);
      setSuccess("Focus approval request submitted!");
    } catch (err) {
      setError("Failed to submit focus request.");
    } finally {
      setIsFocusSubmitting(false);
      setTimeout(() => setSuccess(null), 5000);
    }
  };

  const activeBadges = activeLearner ? getLearnerBadges(activeLearner) : [];

  const wisdomPoints = useMemo(() => {
    if (!activeLearner) return 0;
    return getOverallPoints(activeLearner);
  }, [activeLearner]);

  const statusProgress = useMemo(() => getStatusProgress(activeBadges.length), [activeBadges.length]);
  const currentStatus = statusProgress.current;

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
    const nonApprovedRequests = allLearnerRequests.filter(r => r.status !== 'approved');
    activities.push(...nonApprovedRequests);

    // 2. Gather approved requests (both focus and milestones) to match against actual profile data
    const approvedRequests = allLearnerRequests.filter(r => r.status === 'approved');

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
          id: focus.id || `synth-focus-${focus.title}`,
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
      const match = bookStr.match(/^(.+?)(?:\s*\(([^)]+)\))?$/);
      const title = match ? match[1].trim() : bookStr;
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
            completedAt: parsedDate
          }
        });
      }
    });

    // --- Presentations ---
    const presentations = activeLearner.presentationsGiven || [];
    presentations.forEach((presStr, index) => {
      const match = presStr.match(/^(.+?)(?:\s*\(([^)]+)\))?$/);
      const title = match ? match[1].trim() : presStr;
      const completedAtOrDate = match && match[2] ? match[2].trim() : '';

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
            completedAt: parsedDate
          }
        });
      }
    });

    // --- Modules (Tafsir, Seerah, Articles, Dowra) ---
    const moduleTypes = ['tafsir', 'seerah', 'articles', 'dowra'];
    moduleTypes.forEach(type => {
      const items = getDomainItems(activeLearner, type);
      items.forEach((itemTitle, index) => {
        // Parse possible embedded date such as "Topic (2026-06-02)"
        const match = itemTitle.match(/^(.+?)(?:\s*\(([^)]+)\))?$/);
        const title = match ? match[1].trim() : itemTitle;
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
              title: itemTitle,
              completedAt: parsedDate
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

    return activities;
  }, [activeLearner, allLearnerRequests]);

  return (
    <div className="space-y-8">
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

          <h2 className="font-serif text-2xl font-bold mb-2 text-brand-text text-center">
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
          {/* Header Stats */}
          <div 
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 p-6 sm:p-8 rounded-3xl border border-brand-border shrink-0 shadow-sm relative overflow-hidden transition-colors duration-1000"
            style={{
              backgroundColor: `hsl(35, ${Math.min(100, 30 + (wisdomPoints * 1.5))}%, ${Math.max(60, 93 - (wisdomPoints * 0.4))}%)`
            }}
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
                  <span className="text-xs text-brand-brown-light font-medium bg-brand-bg-alt px-2 py-1 rounded border border-brand-border-light">Joined: {new Date(activeLearner.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setIsRequestModalOpen(true)}
                  className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-brand-offwhite bg-brand-brown rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Submit Update
                </button>
                <button 
                  onClick={() => setActiveLearner(null)}
                  className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-brand-brown border border-brand-border rounded-xl bg-brand-white shadow-sm hover:text-brand-brown-dark hover:bg-brand-offwhite active:scale-95 transition-all"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Next Tier Progress */}
          {statusProgress.next && (
            <div className="bg-brand-white border border-brand-border rounded-3xl p-6 mb-4 shadow-sm flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-brown-light mb-1">Next Tier Unlocks</p>
                    <h4 className="font-serif text-xl font-bold text-brand-text">{statusProgress.next.name}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-brown">{statusProgress.badgesNeeded} Badge{statusProgress.badgesNeeded !== 1 ? 's' : ''} Needed</p>
                  </div>
                </div>
                <div className="h-3 bg-brand-beige border border-brand-border rounded-full overflow-hidden w-full relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${statusProgress.progressPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-brand-brown"
                  />
                </div>
              </div>
              <div className="hidden md:block w-px h-16 bg-brand-border shrink-0" />
              <div className="shrink-0 w-full md:w-auto">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-brown-light mb-2">Upcoming Perks</p>
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

          {/* Status/Perk Banner */}
          <div className="bg-brand-white border border-brand-border rounded-2xl p-4 sm:p-6 mb-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shadow-sm">
            <div className="w-12 h-12 bg-brand-beige rounded-full flex items-center justify-center shrink-0 border border-brand-border text-brand-brown">
              <Medal className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-serif text-lg font-bold text-brand-text">Status Perks Unlocked</h4>
              <ul className="mt-2 space-y-1">
                {currentStatus.perks.map((perk, idx) => (
                  <li key={idx} className="text-sm font-medium text-brand-brown-light flex items-center gap-2 group/perk">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-brown shrink-0" />
                    {perk}
                    <div className="cursor-help text-brand-brown/40 hover:text-brand-brown transition-colors relative flex items-center">
                        <Info className="w-3.5 h-3.5" />
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

          {/* Current Focus Banner */}
          <div className="bg-brand-brown p-6 sm:p-8 rounded-3xl shadow-sm border border-brand-brown overflow-hidden relative group">
            <div className="absolute -right-6 -top-6 opacity-5 sm:opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110">
               <BookOpen className="w-48 h-48 text-brand-beige" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 w-full space-y-6">
                <div className="flex justify-between items-center w-full">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-beige/50">Active Focuses</h3>
                  <button 
                    onClick={() => {
                      setFocusDomain(APP_DOMAINS[0]?.type);
                      setFocusTitle('');
                      setFocusAuthor('');
                      setIsFocusModalOpen(true);
                    }}
                    className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-brown bg-brand-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all text-center"
                  >
                    Add Focus
                </button>
              </div>

              {/* Dynamic Focus Reminders & Checkpoints */}
              {reminders.filter(r => r.status === 'pending').length > 0 && (
                <div className="bg-amber-50/10 border border-amber-500/30 rounded-2xl p-5 mb-6 text-brand-offwhite space-y-4">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Bell className="w-5 h-5 animate-bounce" />
                    <h4 className="font-serif text-lg font-bold">Progress Checks & Gentle Alerts</h4>
                  </div>
                  <div className="space-y-4 divide-y divide-brand-beige/10">
                    {reminders.filter(r => r.status === 'pending').map((reminder) => (
                      <div key={reminder.id} className="pt-4 first:pt-0 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <span className="inline-block bg-amber-500/20 text-yellow-250 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-amber-500/20">
                              {reminder.type === 'deadline' ? 'Expected Completion Date Approaching' : 'Gentle Progress Check-In'}
                            </span>
                            <p className="text-sm font-medium leading-relaxed font-serif text-brand-beige/95 italic">
                              "{reminder.questionText}"
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-brand-beige/50 shrink-0">
                            {new Date(reminder.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Quick Actions */}
                        {activeReplyReminderId !== reminder.id ? (
                          <div className="flex flex-wrap gap-2 pt-1">
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
                          <div className="bg-brand-brown-dark/50 p-4 rounded-xl border border-brand-beige/15 space-y-3">
                            {replyType === 'date' ? (
                              <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-beige/70">
                                  Choose New Target Completion Date
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="date"
                                    value={replyDate}
                                    onChange={(e) => setReplyDate(e.target.value)}
                                    className="px-3 py-2 bg-brand-brown text-brand-offwhite border border-brand-border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-beige"
                                  />
                                  <button
                                    disabled={isReminderSubmitting}
                                    onClick={() => handleReminderResponse(reminder, 'rescheduled', undefined, replyDate)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all active:scale-95"
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
                    ))}
                  </div>
                </div>
              )}

              {activeLearner.currentFocuses && activeLearner.currentFocuses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeLearner.currentFocuses.map((focus) => (
                      <div key={focus.id || focus.title} className="bg-brand-brown-dark/30 p-5 rounded-2xl border border-brand-beige/10 flex flex-col justify-between">
                        <div>
                          <h4 className="font-serif text-xl sm:text-2xl font-bold text-brand-offwhite mb-2 leading-tight">
                            {focus.title}
                          </h4>
                          {focus.author && (
                            <p className="text-sm text-brand-brown-light/80 italic mb-3">
                              by {focus.author}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <p className="text-[10px] font-medium text-brand-beige/80 bg-brand-beige/10 inline-block px-2 py-1 rounded-md border border-brand-beige/20 uppercase tracking-wider">
                              {APP_DOMAINS.find(d => d.type === focus.domain)?.label || focus.domain}
                            </p>
                            {focus.estimatedDuration && (
                              <p className="text-[10px] font-medium text-brand-beige/80 bg-brand-beige/10 inline-block px-2 py-1 rounded-md border border-brand-beige/20 tracking-wider">
                                Target: {new Date(focus.estimatedDuration).toLocaleDateString()}
                              </p>
                            )}
                            {focus.location === 'personal' && (
                              <p className="text-[10px] font-medium text-amber-200/90 bg-amber-500/20 inline-block px-2 py-1 rounded-md border border-amber-500/30 tracking-wider">
                                Personal (Needs overview)
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <button 
                            onClick={async () => {
                              const remaining = activeLearner.currentFocuses?.filter(f => f.id !== focus.id) || [];
                              const { learnerService } = await import('../services/learnerService');
                              await learnerService.updateLearner(activeLearner.id, { currentFocuses: remaining });
                              if (focus.id) {
                                try {
                                  await requestService.deleteRequest(focus.id);
                                  await reminderService.deleteRemindersByFocusId(focus.id);
                                } catch (err) {
                                  console.error("Failed to delete focus from database:", err);
                                }
                              }
                            }}
                            className="w-full sm:w-auto px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-brown-light bg-brand-white rounded-lg shadow hover:bg-brand-offwhite hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex justify-center items-center gap-1 border border-brand-border"
                          >
                            Abandon
                          </button>
                          <button 
                            onClick={() => {
                              setRequestType(focus.domain);
                              setItemTitle(focus.title);
                              setItemAuthor(focus.author || '');
                              setCompletionDate(new Date().toISOString().split('T')[0]);
                              setIsRequestModalOpen(true);
                            }}
                            className="w-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-white bg-green-700/80 rounded-lg shadow hover:bg-green-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all border border-green-600 flex justify-center items-center gap-1 flex-1"
                          >
                            Mark Complete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2">
                    <h4 className="font-serif text-2xl text-brand-beige border-b border-brand-beige/20 border-dashed pb-1 inline-block">
                      No active focuses. Establish your path!
                    </h4>
                  </div>
                )}
              </div>
            </div>
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
                  <h4 className="font-serif text-lg font-bold text-orange-950">Pending Approval</h4>
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
                      {domainLabel}: {req.details.title || `${req.details.count} Completed`} {req.details.author ? `by ${req.details.author}` : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Cards Section */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold text-brand-text mb-4 px-2">Core Domains</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 pr-[45px]">
              {APP_DOMAINS.filter(d => ['book', 'presentation', 'task'].includes(d.type)).map((domain, idx) => {
                const Icon = { BookOpen, Mic, CheckCircle2 }[domain.icon as any] as any || BookOpen;
                return (
                  <StatsCard 
                    key={`domain-${domain.id}`}
                    title={`Completed ${domain.label}`} 
                    value={getDomainValue(activeLearner, domain.type)} 
                    icon={<Icon className="w-6 h-6 text-brand-brown" />}
                    variant={idx === 0 ? "primary" : idx === 1 ? "secondary" : "default"}
                  />
                );
              })}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-brand-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-brand-border group transition-all hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-4 mb-8 pb-5 border-b border-brand-border-light">
                <div className="w-12 h-12 bg-brand-beige rounded-2xl flex items-center justify-center text-brand-brown shadow-sm group-hover:scale-110 transition-transform duration-500">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-brand-text">Wisdom Balance</h3>
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
                  <h3 className="font-serif text-2xl font-bold text-brand-text">Activity Distribution</h3>
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
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -10px rgba(0,0,0,0.1)', fontFamily: 'serif', padding: '12px 16px' }} 
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
                  <h3 className="font-serif text-2xl font-bold text-brand-text flex items-center gap-2">
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
              <div className="flex items-center gap-2 self-start sm:self-center">
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
                <h4 className="font-serif italic text-lg font-bold text-brand-text mb-1">Your Momentum Feed is Quiet</h4>
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
                <div className="overflow-x-auto flex gap-8 pb-10 pt-16 px-[25vw] relative scrollbar-none scroll-smooth snap-x snap-mandatory min-h-[350px]">
                  {/* Master Thick Horizontal Connection Line spanning the entire scrollable content area in bright orange */}
                  <div className="absolute left-0 right-0 top-[72px] -translate-y-1/2 h-1.5 bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0 pointer-events-none z-10" />

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
                          (f.title.toLowerCase().trim() === act.details?.title?.toLowerCase().trim() && fNorm === actNorm);
                      });

                      // Determine formatted date of completion
                      const dateObj = act.details?.completedAt || act.requestedAt;
                      const completionDate = new Date(dateObj).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      });

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
                      } else if (['seerah', 'articles', 'tafsir', 'dowra'].includes(act.type)) {
                        pts = 15;
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
                      } else if (['seerah', 'articles', 'tafsir', 'dowra'].includes(act.type)) {
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
                                <h4 className="font-serif text-sm font-bold text-brand-text leading-tight line-clamp-2">
                                  {act.isFocus ? (
                                    <>
                                      {act.type === 'book' && `${isActiveFocus ? 'Active Focus Book Study' : 'Achieved Focus Book Study'}: "${act.details?.title}"`}
                                      {act.type === 'presentation' && `${isActiveFocus ? 'Active Focus Presentation' : 'Achieved Focus Presentation'}: "${act.details?.title}"`}
                                      {act.type === 'task' && `${isActiveFocus ? 'Active Focus Service Task' : 'Achieved Focus Service Task'}: "${act.details?.title || 'Action items'}"`}
                                      {!['book', 'presentation', 'task'].includes(act.type) && `${isActiveFocus ? `Active Focus ${domainLabel}` : `Achieved Focus ${domainLabel}`}: "${act.details?.title || act.type}"`}
                                    </>
                                  ) : (
                                    <>
                                      {act.type === 'book' && `Completed Book: "${act.details?.title}"`}
                                      {act.type === 'presentation' && `Delivered Presentation: "${act.details?.title}"`}
                                      {act.type === 'task' && `Logged Task Points: "${act.details?.title || 'Action items'}"`}
                                      {!['book', 'presentation', 'task'].includes(act.type) && `Completed ${domainLabel === 'Articles' ? 'Article Study' : domainLabel}: "${act.details?.title || act.type}"`}
                                    </>
                                  )}
                                </h4>
                                {act.details?.author && (
                                  <p className="text-[11px] text-brand-brown-light italic leading-snug line-clamp-1 py-0.5">
                                    by {act.details.author}
                                  </p>
                                )}
                                {act.details?.description && (
                                  <p className="text-[11px] text-brand-brown-light/85 italic leading-snug line-clamp-1 py-0.5 mt-0.5">
                                    "{act.details.description}"
                                  </p>
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
                                  {act.isFocus && act.details?.estimatedDuration 
                                    ? new Date(act.details.estimatedDuration).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                    : completionDate}
                                </span>
                              </div>

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
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-brand-border mt-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-border-light justify-between">
              <div className="flex items-center gap-3">
                <Medal className="text-brand-brown w-6 h-6" />
                <h3 className="font-serif text-xl font-bold text-brand-text">Wisdom Badges Directory</h3>
              </div>
              <span className="text-sm font-bold text-brand-brown-light bg-brand-bg-alt px-3 py-1 rounded-full border border-brand-border-light">
                {activeBadges.length} / {ALL_BADGES.length} Unlocked
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {ALL_BADGES.map((badge) => {
                const isEarned = activeBadges.some((b) => b.id === badge.id);
                return (
                  <div 
                    key={badge.id} 
                    tabIndex={0}
                    className={`flex flex-col items-center bg-brand-bg-alt p-4 rounded-xl border text-center transition-all group relative outline-none ${
                      isEarned 
                        ? 'border-brand-brown/20 shadow-sm md:hover:-translate-y-1 md:hover:shadow-md' 
                        : 'border-brand-border-light/50 opacity-60 md:hover:opacity-100 grayscale hover:grayscale-0 cursor-pointer'
                    }`}
                  >
                    <span className={`text-4xl mb-3 drop-shadow-sm ${!isEarned && 'opacity-50'}`}>{badge.icon}</span>
                    <span className="font-bold text-brand-brown text-sm">{badge.name}</span>
                    <span className="text-xs text-brand-brown-light mt-1 mb-2 leading-relaxed">{badge.description}</span>
                    
                    {!isEarned && (
                      <div className="mt-auto pt-2 border-t border-brand-border-light/50 w-full flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider font-black text-brand-brown/50">
                        <Lock className="w-3 h-3" />
                        Locked
                      </div>
                    )}
                    
                    {!isEarned && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-[105%] mb-2 bg-brand-text text-brand-beige text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 pointer-events-none w-[150%] max-w-[200px] z-10 transition-opacity shadow-xl">
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

          {/* Detailed Lists */}
          <div className="space-y-4 mt-8">
            <h3 className="font-serif text-2xl font-bold text-brand-text px-2">Detailed Activities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {APP_DOMAINS.map((domain) => {
                const items = getDomainItems(activeLearner, domain.type);
                if (domain.type === 'task') return null; // Tasks are numeric, don't show list
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
                    <h3 className="font-serif text-xl font-bold text-brand-text">Submit Learning Update</h3>
                    <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-brand-border rounded-full transition-colors">
                      <X className="w-5 h-5 text-brand-brown" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmitRequest} className="p-6 space-y-5 overflow-y-auto flex-1">
                    
                    {/* Domain Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Category (Domain)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-brand-offwhite p-2 rounded-xl border border-brand-border">
                        {APP_DOMAINS.map(domain => (
                          <button
                            key={domain.type}
                            type="button"
                            onClick={() => setRequestType(domain.type)}
                            className={`relative w-full py-2.5 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all z-10 active:scale-95 ${requestType === domain.type ? 'text-brand-offwhite' : 'text-brand-brown-light hover:text-brand-brown'}`}
                          >
                            {requestType === domain.type && (
                              <motion.div
                                layoutId="segmented-control-bg"
                                className="absolute inset-0 bg-brand-brown rounded-lg shadow-md"
                                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                              />
                            )}
                            <span className="relative z-10 block truncate">{domain.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Fields based on Domain */}
                    {['tafsir', 'seerah', 'articles'].includes(requestType) ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            {requestType === 'articles' ? 'Article Title / Topic' : 'Batch Name'}
                          </label>
                          <input
                            type="text"
                            required
                            value={itemTitle}
                            onChange={(e) => setItemTitle(e.target.value)}
                            placeholder={requestType === 'articles' ? "e.g. History of Fiqh" : "e.g. Batch 2024"}
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                          />
                        </div>
                        {['seerah', 'tafsir'].includes(requestType) && (
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2 mt-4">
                              Author / Editor
                            </label>
                            <input
                              type="text"
                              required
                              value={itemAuthor}
                              onChange={(e) => setItemAuthor(e.target.value)}
                              placeholder="e.g. Dr. Mustafa Khattab"
                              className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                            />
                          </div>
                        )}
                      </>
                    ) : requestType === 'dowra' ? (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Year of Dowra Quran</label>
                        <input
                          type="text"
                          required
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          placeholder="e.g. 2023"
                          className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                        />
                      </div>
                    ) : !isTaskLike ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            {activeDomain ? `${activeDomain.label} Title` : 'Title'}
                          </label>
                          <input
                            type="text"
                            required
                            value={itemTitle}
                            onChange={(e) => setItemTitle(e.target.value)}
                            placeholder={`e.g. ${activeDomain?.label === 'Books' ? 'The Clear Quran' : 'Presentation Topic'}`}
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                          />
                        </div>

                        {['book', 'seerah', 'tafsir'].includes(requestType) && (
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2 mt-4">
                              author / Editor
                            </label>
                            <input
                              type="text"
                              required
                              value={itemAuthor}
                              onChange={(e) => setItemAuthor(e.target.value)}
                              placeholder="e.g. Dr. Mustafa Khattab"
                              className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Completion Date</label>
                            <input
                              type="date"
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
                              required
                              value={timeTaken}
                              onChange={(e) => setTimeTaken(e.target.value)}
                              placeholder="e.g. 2 weeks"
                              className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Number of Tasks</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={taskCount}
                            onChange={(e) => setTaskCount(parseInt(e.target.value))}
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Task Description</label>
                          <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe the tasks you've completed for this module..."
                            rows={3}
                            className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown resize-none"
                          />
                        </div>
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
                    <h3 className="font-serif text-xl font-bold text-brand-text">Set Learning Focus</h3>
                    <button onClick={() => setIsFocusModalOpen(false)} className="p-2 hover:bg-brand-border rounded-full transition-colors">
                      <X className="w-5 h-5 text-brand-brown" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleUpdateFocus} className="p-6 space-y-5 overflow-y-auto flex-1">
                    
                    {/* Domain Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Category (Domain)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-brand-offwhite p-2 rounded-xl border border-brand-border">
                        {APP_DOMAINS.map(domain => (
                          <button
                            key={domain.type}
                            type="button"
                            onClick={() => setFocusDomain(domain.type)}
                            className={`relative w-full py-2.5 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all z-10 active:scale-95 ${focusDomain === domain.type ? 'text-brand-offwhite' : 'text-brand-brown-light hover:text-brand-brown'}`}
                          >
                            {focusDomain === domain.type && (
                              <motion.div
                                layoutId="focus-segmented-control-bg"
                                className="absolute inset-0 bg-brand-brown rounded-lg shadow-md"
                                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                              />
                            )}
                            <span className="relative z-10 block truncate">{domain.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Fields based on Domain */}
                    {['tafsir', 'seerah', 'dowra'].includes(focusDomain) && (
                      <div className="flex items-center gap-2 mt-4 bg-brand-offwhite p-3 rounded-xl border border-brand-border">
                        <input
                          type="checkbox"
                          id="isLoungeModule"
                          checked={isLoungeModule}
                          onChange={(e) => {
                            setIsLoungeModule(e.target.checked);
                            if (e.target.checked) setFocusLocation('lounge');
                          }}
                          className="w-4 h-4 text-brand-brown rounded border-brand-border focus:ring-brand-brown"
                        />
                        <label htmlFor="isLoungeModule" className="text-sm font-bold text-brand-text cursor-pointer">
                          Link to an ongoing/upcoming Lounge Module
                        </label>
                      </div>
                    )}

                    {['tafsir', 'seerah', 'articles', 'dowra'].includes(focusDomain) ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                            {focusDomain === 'articles' ? 'Article Title / Topic' : 'Batch Name / Module Title'}
                          </label>
                          <input
                            type="text"
                            required={!isLoungeModule}
                            value={focusTitle}
                            onChange={(e) => setFocusTitle(e.target.value)}
                            readOnly={isLoungeModule}
                            placeholder={focusDomain === 'articles' ? "e.g. History of Fiqh" : "e.g. Batch 2024"}
                            className={`w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown ${isLoungeModule ? 'opacity-70 cursor-not-allowed' : ''}`}
                          />
                        </div>
                        {['seerah', 'tafsir', 'dowra'].includes(focusDomain) && (
                          <div>
                            {isLoungeModule ? (
                              <>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2 mt-4">
                                  Speaker
                                </label>
                                <select
                                  required
                                  value={focusAuthor}
                                  onChange={(e) => setFocusAuthor(e.target.value)}
                                  className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                >
                                  <option value="">Select a Speaker</option>
                                  <option value="Sana Amjad">Sana Amjad</option>
                                </select>
                              </>
                            ) : (
                              <>
                                <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2 mt-4">
                                  Author / Teacher
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={focusAuthor}
                                  onChange={(e) => setFocusAuthor(e.target.value)}
                                  placeholder="e.g. Dr. Mustafa Khattab"
                                  className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                />
                                {focusLocation === 'personal' && (
                                  <>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2 mt-4">
                                      Circle / Community (If it's a course)
                                    </label>
                                    <input
                                      type="text"
                                      value={focusCommunity}
                                      onChange={(e) => setFocusCommunity(e.target.value)}
                                      placeholder="e.g. AlMaghrib Institute"
                                      className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                                    />
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : focusDomain === 'dowra' ? (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Year of Dowra Quran</label>
                        <input
                          type="text"
                          required
                          value={focusTitle}
                          onChange={(e) => setFocusTitle(e.target.value)}
                          placeholder="e.g. 2023"
                          className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                        />
                      </div>
                    ) : focusDomain === 'task' ? (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Current Task Focus / Description</label>
                        <input
                          type="text"
                          required
                          value={focusTitle}
                          onChange={(e) => setFocusTitle(e.target.value)}
                          placeholder="e.g. Helping with Event Logistics"
                          className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                          Specific Title or Subject
                        </label>
                        <input
                          type="text"
                          required
                          value={focusTitle}
                          onChange={(e) => setFocusTitle(e.target.value)}
                          placeholder={`e.g. ${APP_DOMAINS.find(d => d.type === focusDomain)?.label === 'Books' ? 'The Clear Quran' : 'Focus Topic'}`}
                          className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                        />
                      </div>
                    )}

                    {['book'].includes(focusDomain) && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2 mt-4">
                          Author / Editor
                        </label>
                        <input
                          type="text"
                          required
                          value={focusAuthor}
                          onChange={(e) => setFocusAuthor(e.target.value)}
                          placeholder="e.g. Dr. Mustafa Khattab"
                          className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">
                        Duration
                      </label>
                      <input
                        type="text"
                        required={!isLoungeModule}
                        value={focusEstimatedDuration}
                        onChange={(e) => setFocusEstimatedDuration(e.target.value)}
                        readOnly={isLoungeModule}
                        placeholder="e.g. 2 Months"
                        className={`w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown ${isLoungeModule ? 'opacity-70 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Location</label>
                      <div className="flex gap-4">
                        <label className={`flex items-center gap-2 ${isLoungeModule ? 'cursor-not-allowed opacity-100' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name="focusLocation"
                            value="lounge"
                            checked={focusLocation === 'lounge'}
                            onChange={() => setFocusLocation('lounge')}
                            disabled={isLoungeModule}
                            className="text-brand-brown focus:ring-brand-brown"
                          />
                          <span className="text-sm text-brand-brown font-medium">Inside the Lounge</span>
                        </label>
                        <label className={`flex items-center gap-2 ${isLoungeModule ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name="focusLocation"
                            value="personal"
                            checked={focusLocation === 'personal'}
                            onChange={() => setFocusLocation('personal')}
                            disabled={isLoungeModule}
                            className="text-brand-brown focus:ring-brand-brown"
                          />
                          <span className="text-sm text-brand-brown font-medium">Personal (Outside)</span>
                        </label>
                      </div>
                    </div>

                    {focusLocation === 'personal' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-brand-beige border border-brand-border rounded-xl p-4 text-sm text-brand-brown"
                      >
                        <p className="font-bold uppercase tracking-wider text-[10px] mb-2 text-brand-brown-light">Requirement for Personal Study</p>
                        <div className="leading-relaxed space-y-3">
                          {focusDomain === 'book' && (
                            <>
                              <p>Since this goal is being pursued independently, you will be required to share a meaningful overview of the book after completion. The purpose of this is to encourage sincerity, reflection, and genuine understanding rather than passive reading.</p>
                              <p>You may fulfill this by either:</p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Conducting a lounge session <em className="text-xs text-brand-brown-light">(recommended, as it may grant additional lounge perks such as reduced module fees and similar benefits)</em>, or</li>
                                <li>Submitting a detailed written reflection or summary document.</li>
                              </ul>
                              <p>Your overview should ideally include key lessons, reflections, important insights, and practical takeaways from the book.</p>
                            </>
                          )}
                          {focusDomain === 'presentation' && (
                            <>
                              <p>Since this goal is being pursued independently, you will be expected to share your completed presentation within the lounge. This may be done through:</p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>A live lounge presentation/session <em className="text-xs text-brand-brown-light">(recommended, as it may grant additional lounge perks such as reduced module fees and similar benefits)</em>, or</li>
                                <li>A well-structured written document or presentation file.</li>
                              </ul>
                              <p>The objective is to encourage beneficial knowledge-sharing and meaningful contribution to the learning environment.</p>
                            </>
                          )}
                          {focusDomain === 'task' && (
                            <>
                              <p>Since this goal is being pursued independently, you will be required to submit a clear and detailed overview of the completed task or project.</p>
                              <p>You may fulfill this by either:</p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>Conducting a brief lounge session <em className="text-xs text-brand-brown-light">(recommended, as it may grant additional lounge perks such as reduced module fees and similar benefits)</em>, or</li>
                                <li>Submitting a detailed written overview.</li>
                              </ul>
                              <p>Your submission should briefly explain:</p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>What was completed</li>
                                <li>The process or effort involved</li>
                                <li>Key outcomes, reflections, or lessons learned</li>
                              </ul>
                              <p>This helps maintain accountability, consistency, and purposeful progress.</p>
                            </>
                          )}
                          {['dowra', 'tafsir', 'seerah', 'articles'].includes(focusDomain) && (
                            <>
                              <p>Since these goals are being pursued independently, you will be expected to share your learnings with the lounge after completion or throughout your progress.</p>
                              <p>This may be done through:</p>
                              <ul className="list-disc pl-5 space-y-1">
                                <li>A lounge session <em className="text-xs text-brand-brown-light">(recommended, as it may grant additional lounge perks such as reduced module fees and similar benefits)</em>, or</li>
                                <li>A written reflection, notes document, or learning summary.</li>
                              </ul>
                              <p>The aim is to strengthen understanding, reflection, and beneficial sharing of knowledge within the community.</p>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsFocusModalOpen(false)}
                        className="flex-1 px-6 py-3 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest text-brand-brown hover:bg-brand-offwhite active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
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
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
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
        <p className={`text-4xl sm:text-5xl font-serif font-black ${valueStyles[variant]} leading-none`}>{value}</p>
        {typeof value === 'number' && <span className={`text-xs font-bold ${titleStyles[variant]} mb-1 opacity-60`}>pts</span>}
      </div>
    </div>
  );
}

function ListCard({ title, items, emptyText }: { title: string, items: string[], emptyText: string, key?: string }) {
  return (
    <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-brand-border flex flex-col h-full">
      <h3 className="font-serif text-xl font-bold text-brand-text mb-4 pb-3 border-b border-brand-border-light">{title}</h3>
      {items.length === 0 ? (
        <p className="text-brand-brown-light text-sm italic">{emptyText}</p>
      ) : (
        <ul className="space-y-3 flex-1 overflow-y-auto max-h-60 pr-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start bg-brand-bg-alt p-3 rounded-lg border border-brand-border-light text-sm">
              <span className="text-brand-text font-medium">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}