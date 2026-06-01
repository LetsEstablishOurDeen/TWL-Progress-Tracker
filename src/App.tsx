import { useState, useEffect } from 'react';
import { useLearners } from './store';
import { Learner } from './types';
import { Users, Library, Trophy, LogIn, LogOut } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { LearnerDashboard } from './components/LearnerDashboard';
import { Leaderboard } from './components/Leaderboard';

import { authService } from './lib/auth';

type ViewMode = 'learner' | 'admin' | 'leaderboard';

const ADMIN_EMAIL = 'araizhasan00@gmail.com';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('wisdom_lounge_view_mode') as ViewMode) || 'learner';
  });
  const { learners, addLearner, approveLearner, removeLearner, updateLearner } = useLearners();

  useEffect(() => {
    localStorage.setItem('wisdom_lounge_view_mode', viewMode);
  }, [viewMode]);
  const [user, setUser] = useState<any>(null);
  const [activeLearner, setActiveLearner] = useState<Learner | null>(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((u) => {
      setUser(u);
      if (!u) {
        setActiveLearner(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle Learner profile link
  useEffect(() => {
    const savedLearnerId = activeLearner?.id || localStorage.getItem('wisdom_lounge_learner_id');
    if (savedLearnerId && learners.length > 0) {
        const profile = learners.find(l => l.id === savedLearnerId);
        if (profile && profile.isApproved) {
            setActiveLearner(profile);
        } else if (profile && !profile.isApproved) {
            localStorage.removeItem('wisdom_lounge_learner_id');
        }
    }
  }, [user, learners]);

  useEffect(() => {
    if (activeLearner) {
        localStorage.setItem('wisdom_lounge_learner_id', activeLearner.id);
    } else {
        localStorage.removeItem('wisdom_lounge_learner_id');
    }
  }, [activeLearner]);

  const handleAdminSignIn = async () => {
    try {
      await authService.adminSignIn();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    if (viewMode === 'admin') setViewMode('learner');
  };

  const isAdmin = user?.email === ADMIN_EMAIL;
  const pendingRequests = learners.filter(l => !l.isApproved).length;
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen font-sans bg-brand-main-bg">
      <nav className="bg-brand-white border-b border-brand-brown/10 px-4 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div 
              className="flex items-center space-x-3 cursor-pointer" 
              onClick={() => setViewMode('learner')}
            >
              <div className="w-10 h-10 bg-brand-brown rounded-full flex items-center justify-center text-brand-offwhite">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-5 h-5"
                >
                  <path d="M6 22V10c0-3.3137 2.6863-6 6-6s6 2.6863 6 6v12" />
                  <path d="M3 22h18" />
                  <path d="M15 14v.01" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold tracking-tight text-brand-text leading-none">The Wisdom Profile</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-brown-light mt-0.5">By The Wisdom Lounge</span>
              </div>
            </div>
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-200 animate-pulse">
                Offline
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex space-x-1 sm:space-x-2 items-center bg-brand-beige/30 p-1 rounded-xl border border-brand-border h-12">
              <button 
                onClick={() => setViewMode('learner')}
                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${viewMode === 'learner' ? 'bg-brand-brown text-brand-offwhite shadow-md' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Learner
              </button>
              <button 
                onClick={() => setViewMode('leaderboard')}
                className={`px-4 py-2 flex items-center space-x-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${viewMode === 'leaderboard' ? 'bg-brand-brown text-brand-offwhite shadow-md' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden md:inline">Leaderboard</span>
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setViewMode('admin')}
                  className={`px-4 py-2 flex items-center space-x-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all relative ${viewMode === 'admin' ? 'bg-brand-brown text-brand-offwhite shadow-md' : 'text-brand-brown-light hover:text-brand-brown'}`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden md:inline">Admin</span>
                  {pendingRequests > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-brand-white font-bold animate-bounce shadow-md">
                      {pendingRequests}
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="h-8 w-[1px] bg-brand-border hidden lg:block" />

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:block text-right">
                  <p className="text-[10px] uppercase font-bold text-brand-brown-light leading-none">
                    {isAdmin ? 'Admin' : 'Guest'}
                  </p>
                  <p className="text-xs font-semibold text-brand-brown">{user.email}</p>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-2.5 text-brand-brown-light hover:text-red-500 transition-colors bg-brand-offwhite rounded-xl border border-brand-border"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleAdminSignIn}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-beige text-brand-brown rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-brand-border transition-all shadow-sm border border-brand-border"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-100px)]">
        {viewMode === 'admin' && (
          isAdmin ? (
            <AdminDashboard 
              learners={learners} 
              onAdd={addLearner} 
              onApprove={approveLearner}
              onRemove={removeLearner} 
              onUpdate={updateLearner} 
            />
          ) : (
            <div className="max-w-md mx-auto mt-20 text-center bg-brand-white p-12 rounded-3xl shadow-xl border border-brand-border">
              <div className="w-16 h-16 bg-brand-beige rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-brand-brown" />
              </div>
              <h2 className="font-serif text-3xl font-bold text-brand-text mb-4">Admin Access Required</h2>
              <p className="text-brand-brown-light mb-8">This section is restricted to registered Wisdom Lounge administrators. Please sign in with your authorized Google account.</p>
              <button 
                onClick={handleAdminSignIn}
                className="w-full bg-brand-brown text-brand-offwhite py-4 rounded-xl font-bold uppercase tracking-wider shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Sign in as Admin
              </button>
            </div>
          )
        )}
        {viewMode === 'learner' && (
          <LearnerDashboard 
            learners={learners} 
            onRegister={addLearner}
            activeLearner={activeLearner}
            setActiveLearner={setActiveLearner}
          />
        )}
        {viewMode === 'leaderboard' && (
          <Leaderboard learners={learners} />
        )}
      </main>
    </div>
  );
}
