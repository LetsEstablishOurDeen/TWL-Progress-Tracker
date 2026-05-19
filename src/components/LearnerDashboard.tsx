import { useState, FormEvent, ReactNode, useMemo, useEffect } from 'react';
import { Learner, EditRequest } from '../types';
import { BookOpen, Mic, CheckCircle2, Search, Medal, Eye, EyeOff, LayoutDashboard, BarChart3, Plus, X, Clock, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLearnerBadges } from '../lib/badges';
import { requestService } from '../services/requestService';
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

export function LearnerDashboard({ learners, onRegister }: { learners: Learner[], onRegister: (data: Omit<Learner, 'joinedAt'>) => void }) {
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
  const [activeLearner, setActiveLearner] = useState<Learner | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<'book' | 'presentation' | 'task'>('book');
  const [pendingRequests, setPendingRequests] = useState<EditRequest[]>([]);

  // Form State
  const [bookTitle, setBookTitle] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [timeTaken, setTimeTaken] = useState('');
  const [taskCount, setTaskCount] = useState(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          title: bookTitle,
          completedAt: completionDate,
          duration: timeTaken,
          count: taskCount,
          description: description
        }
      });
      setSuccess("Your update request has been submitted for admin approval.");
      setIsRequestModalOpen(false);
      // Reset form
      setBookTitle('');
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

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const found = learners.find(l => l.id.toLowerCase() === searchTerm.toLowerCase() || l.fullName.toLowerCase() === searchTerm.toLowerCase());
    
    if (found) {
      if (found.password === password) {
        if (!found.isApproved) {
          setError("Your account is pending admin approval. Please check back later.");
          return;
        }
        setActiveLearner(found);
        setSearchTerm('');
        setPassword('');
      } else {
        setError("Incorrect password.");
      }
    } else {
      setError("Learner not found. Make sure you are registered and approved.");
    }
  };

  const handleSignUp = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Check if passwords match
    if (regPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Check if ID already exists
    if (learners.find(l => l.id === regId)) {
      setError("A learner with this Phone Number already exists.");
      return;
    }

    onRegister({
      id: regId,
      fullName: regName,
      password: regPassword,
      isApproved: false,
      booksCompleted: [],
      presentationsGiven: [],
      tasksCompleted: 0
    });

    setSuccess("Registration successful! Your profile is pending admin approval.");
    setRegName('');
    setRegId('');
    setRegPassword('');
    setConfirmPassword('');
    setShowRegPassword(false);
    setShowConfirmPassword(false);
    // Optionally switch to signin
    setTimeout(() => {
      setAuthMode('signin');
      setSuccess(null);
    }, 3000);
  };

  const activeBadges = activeLearner ? getLearnerBadges(activeLearner) : [];

  const chartData = useMemo(() => {
    if (!activeLearner) return [];
    return [
      { subject: 'Books', A: activeLearner.booksCompleted.length, fullMark: 15 },
      { subject: 'Presentations', A: activeLearner.presentationsGiven.length, fullMark: 10 },
      { subject: 'Tasks', A: activeLearner.tasksCompleted, fullMark: 50 },
    ];
  }, [activeLearner]);

  const activityData = useMemo(() => {
    if (!activeLearner) return [];
    return [
      { name: 'Books', value: activeLearner.booksCompleted.length, color: '#5A4633' },
      { name: 'Presentations', value: activeLearner.presentationsGiven.length, color: '#8C7864' },
      { name: 'Tasks', value: activeLearner.tasksCompleted, color: '#A69280' }
    ];
  }, [activeLearner]);

  return (
    <div className="space-y-8">
      {!activeLearner ? (
        <div className="max-w-md mx-auto mt-12 bg-brand-white p-8 rounded-2xl shadow-sm border border-brand-border">
          <div className="flex bg-brand-beige p-1 rounded-xl mb-8 border border-brand-border">
            <button 
              onClick={() => { setAuthMode('signin'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${authMode === 'signin' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthMode('signup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${authMode === 'signup' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
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
                          className="px-4 py-2 hover:bg-brand-bg-alt cursor-pointer border-b border-brand-border-light last:border-b-0 flex justify-between items-center"
                        >
                          <span className="font-medium text-brand-text">{l.fullName}</span>
                          <span className="text-xs font-mono text-brand-brown-light">{l.id}</span>
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
              <button type="submit" className="w-full bg-brand-brown text-brand-offwhite py-3 rounded-xl font-medium hover:bg-brand-brown-dark transition-all shadow-md mt-2">
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
              <button type="submit" className="w-full bg-brand-brown text-brand-offwhite py-3 rounded-xl font-medium hover:bg-brand-brown-dark transition-all shadow-md mt-2">
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
          className="max-w-5xl mx-auto space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-brand-beige p-6 sm:p-8 rounded-3xl border border-brand-border shrink-0 shadow-sm">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-brown-light mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Wisdom Points: {(activeLearner.booksCompleted.length * 5) + (activeLearner.presentationsGiven.length * 10) + activeLearner.tasksCompleted}
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
                className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-brand-offwhite bg-brand-brown rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Submit Update
              </button>
              <button 
                onClick={() => setActiveLearner(null)}
                className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-brand-brown border border-brand-border rounded-xl bg-brand-white shadow-sm hover:text-brand-brown-dark hover:bg-brand-offwhite transition-all"
              >
                Sign out
              </button>
            </div>
          </div>

          {pendingRequests.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-orange-950">Pending Approval</h4>
                  <p className="text-orange-700/80 text-xs">Admin is reviewing your recent submissions.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-white/80 px-3 py-2 rounded-lg border border-orange-100 text-[10px] font-bold uppercase tracking-wider text-orange-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                    {req.type === 'book' ? `Book: ${req.details.title}` : req.type === 'presentation' ? `Presentation: ${req.details.title}` : `${req.details.count} Tasks`}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard 
              title="Books Completed" 
              value={activeLearner.booksCompleted.length} 
              icon={<BookOpen className="w-6 h-6 text-brand-brown" />} 
            />
            <StatsCard 
              title="Presentations" 
              value={activeLearner.presentationsGiven.length} 
              icon={<Mic className="w-6 h-6 text-brand-brown" />} 
            />
            <StatsCard 
              title="Tasks Completed" 
              value={activeLearner.tasksCompleted} 
              icon={<CheckCircle2 className="w-6 h-6 text-brand-brown" />} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-brand-border">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-border-light">
                <LayoutDashboard className="text-brand-brown w-6 h-6" />
                <h3 className="font-serif text-xl font-bold text-brand-text">Wisdom Balance</h3>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#EBE5DB" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#5A4633', fontSize: 12, fontWeight: 600 }} />
                    <Radar
                      name={activeLearner.fullName}
                      dataKey="A"
                      stroke="#5A4633"
                      fill="#5A4633"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-brand-border">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-border-light">
                <BarChart3 className="text-brand-brown w-6 h-6" />
                <h3 className="font-serif text-xl font-bold text-brand-text">Activity Distribution</h3>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#5A4633', fontSize: 12, fontWeight: 500 }} width={100} />
                    <Tooltip cursor={{ fill: '#F5F2ED' }} contentStyle={{ borderRadius: '12px', border: '1px solid #EBE5DB', fontFamily: 'serif' }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <ListCard title="Actively Completed Books" items={activeLearner.booksCompleted} emptyText="No books completed yet." />
            <ListCard title="Presentations Given" items={activeLearner.presentationsGiven} emptyText="No presentations given yet." />
          </div>

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
                    <h3 className="font-serif text-xl font-bold text-brand-text">Submit Completion</h3>
                    <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-brand-border rounded-full transition-colors">
                      <X className="w-5 h-5 text-brand-brown" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
                    <div className="flex bg-brand-offwhite p-1 rounded-xl border border-brand-border">
                      {(['book', 'presentation', 'task'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setRequestType(type)}
                          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${requestType === type ? 'bg-brand-brown text-brand-offwhite shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {requestType === 'book' || requestType === 'presentation' ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">{requestType === 'book' ? 'Book Title' : 'Presentation Topic'}</label>
                          <input
                            type="text"
                            required
                            value={bookTitle}
                            onChange={(e) => setBookTitle(e.target.value)}
                            placeholder={requestType === 'book' ? "e.g. The Republic by Plato" : "e.g. Stoicism in Modern Life"}
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
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-2">Activities Description</label>
                          <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Briefly describe the tasks you've completed..."
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
                        className="flex-1 px-6 py-3 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest text-brand-brown hover:bg-brand-offwhite transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-2 px-6 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

function StatsCard({ title, value, icon }: { title: string, value: number | string, icon: ReactNode }) {

  return (
    <div className="bg-brand-beige p-6 rounded-2xl border border-brand-border shadow-sm flex flex-col items-start relative overflow-hidden h-32 justify-center">
      <div className="absolute -right-4 -bottom-4 text-brand-brown opacity-5 scale-150">
        {icon}
      </div>
      <p className="text-xs font-bold uppercase text-brand-brown-light mb-1 relative z-10">{title}</p>
      <p className="text-4xl font-serif font-bold text-brand-brown relative z-10">{value}</p>
    </div>
  );
}

function ListCard({ title, items, emptyText }: { title: string, items: string[], emptyText: string }) {
  return (
    <div className="bg-brand-white p-6 rounded-2xl shadow-sm border border-brand-border flex flex-col">
      <h3 className="font-serif text-xl font-bold text-brand-text mb-4 pb-3 border-b border-brand-border-light">{title}</h3>
      {items.length === 0 ? (
        <p className="text-brand-brown-light text-sm italic">{emptyText}</p>
      ) : (
        <ul className="space-y-3 flex-1">
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
