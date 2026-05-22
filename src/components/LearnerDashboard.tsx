import { useState, FormEvent, ReactNode, useMemo, useEffect } from 'react';
import { Learner, EditRequest } from '../types';
import { 
  BookOpen, Mic, CheckCircle2, Search, Medal, Eye, EyeOff, 
  LayoutDashboard, BarChart3, Plus, X, Clock, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLearnerBadges } from '../lib/badges';
import { requestService } from '../services/requestService';
import { authService } from '../lib/auth';
import { MODULES, APP_DOMAINS } from '../constants';
import { getOverallPoints, getDomainValue } from '../utils';

// Safely aggregates module items including sub-options
const getModuleItems = (learner: any, mod: any) => {
  let items = learner.moduleItems?.[mod.id] || [];
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
  setActiveLearner
}: { 
  learners: Learner[], 
  onRegister: (data: Omit<Learner, 'joinedAt'>) => void,
  activeLearner: Learner | null,
  setActiveLearner: (learner: Learner | null) => void
}) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [searchTerm, setSearchTerm] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration specific state
  const [regName, setRegName] = useState('');
  const [regId, setRegId] = useState('');
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

  // Form State
  const [itemTitle, setItemTitle] = useState('');
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
        const learnerRequests = allRequests.filter(r => r.learnerId === activeLearner.id && r.status === 'pending');
        setPendingRequests(learnerRequests);
      });
      return () => unsubscribe();
    }
  }, [activeLearner]);

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeLearner) return;

    setIsSubmitting(true);
    try {
      await requestService.submitRequest({
        learnerId: activeLearner.id,
        learnerName: activeLearner.fullName,
        type: requestType,
        details: {
          title: itemTitle,
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
        setError("Invalid ID or password.");
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

    setIsSubmitting(true);
    try {
      await authService.signUp(regId, regPassword, regName);
      setSuccess("Registration successful! Your profile is pending admin approval.");
      setRegName('');
      setRegId('');
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
        setError("This ID (Phone Number) is already registered.");
      } else {
        setError("Failed to register. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeBadges = activeLearner ? getLearnerBadges(activeLearner) : [];

  const wisdomPoints = useMemo(() => {
    if (!activeLearner) return 0;
    return getOverallPoints(activeLearner);
  }, [activeLearner]);

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
            {authMode === 'signin' ? 'Welcome Back' : 'Join the Community'}
          </h2>
          <p className="text-brand-brown-light mb-6 text-center text-sm font-medium">
            {authMode === 'signin' 
              ? 'Enter your details to view your progress.' 
              : 'Register your profile to start tracking your wisdom journey.'}
          </p>

          {authMode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">Name or ID</label>
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
                    placeholder="e.g. Alex or 555-0101"
                    className="w-full pl-10 pr-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm"
                    required
                  />
                  {showSuggestions && matchedLearners.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-brand-white border border-brand-border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {matchedLearners.map(l => (
                        <div 
                          key={l.id}
                          onClick={() => {
                            setSearchTerm(l.id);
                            setShowSuggestions(false);
                          }}
                          className="px-4 py-2 hover:bg-brand-bg-alt cursor-pointer border-b border-brand-border-light last:border-b-0 flex justify-between items-center overflow-hidden"
                        >
                          <span className="font-medium text-brand-text truncate flex-1 mr-2">{l.fullName}</span>
                          <span className="text-xs font-mono text-brand-brown-light shrink-0">{l.id}</span>
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
                  placeholder="e.g. Alex Miller"
                  className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-brown mb-1">Phone Number (ID)</label>
                <input 
                  type="text" 
                  value={regId}
                  onChange={(e) => setRegId(e.target.value)}
                  placeholder="e.g. 555-0101"
                  className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm"
                  required
                />
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-brand-beige p-6 sm:p-8 rounded-3xl border border-brand-border shrink-0 shadow-sm">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-brown-light mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Wisdom Points: {wisdomPoints}
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-brand-text mb-2">{activeLearner.fullName}</h1>
              <div className="flex items-center gap-3">
                <span className="bg-brand-offwhite px-3 py-1 rounded-md text-sm font-mono text-brand-brown border border-brand-border-light shadow-sm">ID: {activeLearner.id}</span>
                <span className="text-xs text-brand-brown-light font-medium bg-brand-bg-alt px-2 py-1 rounded border border-brand-border-light">Joined: {new Date(activeLearner.joinedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
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
                      {domainLabel}: {req.details.title || `${req.details.count} Completed`}
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

          {/* Journey Section */}
          <div className="bg-brand-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-brand-border">
            <div className="flex items-center gap-4 mb-12 pb-5 border-b border-brand-border-light">
              <div className="w-12 h-12 bg-brand-beige rounded-2xl flex items-center justify-center text-brand-brown shadow-sm">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-brand-text">Your Learning Journey</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-brown-light opacity-60">Path of Wisdom</p>
              </div>
            </div>
            
            <div className="relative pl-4 sm:pl-8 space-y-12 before:absolute before:inset-0 before:ml-6 sm:before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand-brown/5 before:via-brand-brown/20 before:to-brand-brown/5">
              {APP_DOMAINS.map((domain, index) => {
                const value = getDomainValue(activeLearner, domain.type);
                const fullMark = domain.type === 'task' ? 50 : 15;
                const progress = Math.min(100, Math.max(0, (value / fullMark) * 100));
                const Icon = { BookOpen, Mic, CheckCircle2 }[domain.icon as any] as any || BookOpen;
                // Alternate left/right for medium+ screens
                const isEven = index % 2 === 0;

                return (
                  <div key={domain.type} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group border-none">
                    {/* Node/Circle */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-brand-white bg-brand-beige shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-[-16px] sm:left-[-8px] md:left-1/2 md:-translate-x-1/2 z-10 transition-transform duration-500 group-hover:scale-110">
                      <Icon className="w-4 h-4 text-brand-brown" />
                    </div>

                    {/* Content Card */}
                    <div className="w-full pl-8 md:pl-0 md:w-5/12 ml-6 md:ml-0">
                      <div className={`bg-brand-bg-alt p-5 sm:p-6 rounded-2xl border border-brand-border-light shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:bg-brand-white ${isEven ? 'md:text-right' : ''}`}>
                        <h4 className="font-serif text-lg font-bold text-brand-text mb-1">{domain.label}</h4>
                        <p className="text-xs text-brand-brown-light font-medium mb-4">{value} / {fullMark} Completed</p>
                        
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-brand-border rounded-full overflow-hidden flex">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="bg-brand-brown h-full rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Badges */}
          {activeBadges.length > 0 && (
            <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-brand-border">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-border-light">
                <Medal className="text-brand-brown w-6 h-6" />
                <h3 className="font-serif text-xl font-bold text-brand-text">Earned Badges</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {activeBadges.map(badge => (
                  <div key={badge.id} className="flex flex-col items-center bg-brand-bg-alt p-4 rounded-xl border border-brand-border-light text-center transition-transform hover:-translate-y-1 hover:shadow-md">
                    <span className="text-4xl mb-3 drop-shadow-sm">{badge.icon}</span>
                    <span className="font-bold text-brand-brown text-sm">{badge.name}</span>
                    <span className="text-xs text-brand-brown-light mt-1">{badge.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  className="bg-brand-white w-full max-w-lg rounded-3xl shadow-2xl border border-brand-border overflow-hidden"
                >
                  <div className="px-6 py-4 bg-brand-beige border-b border-brand-border flex items-center justify-between">
                    <h3 className="font-serif text-xl font-bold text-brand-text">Submit Learning Update</h3>
                    <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-brand-border rounded-full transition-colors">
                      <X className="w-5 h-5 text-brand-brown" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmitRequest} className="p-6 space-y-5">
                    
                    {/* Domain Selection */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Category (Domain)</label>
                      <div className="flex bg-brand-offwhite p-1 rounded-xl border border-brand-border relative overflow-x-auto no-scrollbar w-full">
                        <div className="flex min-w-max md:w-full">
                          {APP_DOMAINS.map(domain => (
                            <button
                              key={domain.type}
                              type="button"
                              onClick={() => setRequestType(domain.type)}
                              className={`relative flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all z-10 active:scale-95 whitespace-nowrap ${requestType === domain.type ? 'text-brand-offwhite' : 'text-brand-brown-light hover:text-brand-brown'}`}
                            >
                              {requestType === domain.type && (
                                <motion.div
                                  layoutId="segmented-control-bg"
                                  className="absolute inset-0 bg-brand-brown rounded-lg shadow-md"
                                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                                />
                              )}
                              <span className="relative z-10">{domain.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Fields based on Domain */}
                    {['tafsir', 'seerah'].includes(requestType) ? (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Batch Name</label>
                        <input
                          type="text"
                          required
                          value={itemTitle}
                          onChange={(e) => setItemTitle(e.target.value)}
                          placeholder="e.g. Batch 2024"
                          className="w-full px-4 py-3 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                        />
                      </div>
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
                        <div className="grid grid-cols-2 gap-4">
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