import React, { useState, useEffect } from 'react';
import { BookOpen, Medal, Flame, Bell, Calendar, Clock, DollarSign, ArrowRight, Zap, Info, Users, CreditCard, Moon, Cloud, MapPin, Megaphone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Learner } from '../types';
import { getLearnerBadges } from '../lib/badges';
import { getLearnerStatus } from '../lib/status';
import { noticeService, Notice } from '../services/noticeService';

export const LOUNGE_MODULES = [
  {
    id: 1,
    status: 'ongoing',
    title: 'Tafsir',
    tag: 'The Exegesis Of The Noble Quran',
    batch: 'Surah Nisaa',
    synopsis: 'Diving deep into the architecture of justice, society, and divine law-exploring the balance between rights, duties, and accountability in this world and the next.',
    timeline: 'Orientation on June 14th',
    sessions: 'Bi-weekly',
    duration: '2 Months',
    time: 'Night time',
    enrollment: 'Open',
    enrollmentFee: 'PKR 1000',
    fee: 'PKR 500/mo',
    icon: <Moon className="w-6 h-6" />,
    color: 'amber',
    speaker: 'Sana Amjad',
    location: 'Inside the Lounge',
    category: 'tafsir',
  },

  {
    id: 2,
    status: 'upcoming',
    title: 'Seerah',
    tag: 'The Legacy Of The Beloved ﷺ',
    batch: 'living like the beloved prophet ﷺ',
    collab: "Mindful Muslims",
    synopsis: 'Focusing on the Fiqh-us-Seerah.',
    timeline: 'TBD',
    sessions: 'TBD',
    duration: 'TBD',
    time: 'TBD',
    enrollment: 'TBD',
    enrollmentFee: 'TBD',
    fee: 'TBD',
    icon: <Cloud className="w-6 h-6" />,
    color: 'green',
    speaker: 'Sadia Nouman',
    location: 'Inside the Lounge',
    category: 'seerah',
  },

  {
    id: 3,
    status: 'past',
    title: 'Dowra e Quran',
    batch: 'Islamic Year ١٤٤٧.ھ',
    synopsis: 'An intensive study through the entire Quran, understanding brief meanings and overarching themes of every Surah with Khalid Mehmood Abbasi.',
    timeline: 'Ramadhan 2026',
    sessions: 'N/A',
    duration: 'Whole Month',
    time: 'Whole Day',
    enrollment: 'Closed',
    enrollmentFee: 'N/A',
    fee: 'N/A',
    icon: <Medal className="w-6 h-6" />,
    color: 'blue',
    speaker: 'Khalid Mehmood Abbasi',
    location: 'Inside the Lounge',
    category: 'dowra',
  }
];

export function LoungeUpdates({ 
  onEnroll, 
  activeLearner, 
  onLoginRequest 
}: { 
  onEnroll?: (module: typeof LOUNGE_MODULES[0]) => void;
  activeLearner?: Learner | null;
  onLoginRequest?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'modules' | 'general'>('modules');

  const [enrollmentModule, setEnrollmentModule] = useState<typeof LOUNGE_MODULES[0] | null>(null);
  
  const [generalUpdates, setGeneralUpdates] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'general' && noticesLoading) {
      const fetchNotices = async () => {
        try {
          const notices = await noticeService.getNotices();
          setGeneralUpdates(notices);
        } catch (error) {
          console.error("Failed to fetch notices", error);
        } finally {
          setNoticesLoading(false);
        }
      };
      fetchNotices();
    }
  }, [activeTab]);

  // Calculate discount percentage based on active learner status
  const badgeCount = activeLearner ? getLearnerBadges(activeLearner).length : 0;
  const statusTier = activeLearner ? getLearnerStatus(badgeCount) : null;
  
  let discountPercent = 0;
  if (statusTier) {
    if (statusTier.id === '3') discountPercent = 5;
    else if (statusTier.id === '4') discountPercent = 10;
    else if (statusTier.id === '5') discountPercent = 15;
    else if (statusTier.id === '6') discountPercent = 20;
    else if (statusTier.id === '7') discountPercent = 30;
    else if (statusTier.id === '8') discountPercent = 40;
    else if (statusTier.id === '9') discountPercent = 50;
    else if (statusTier.id === '10') discountPercent = 100;
  }

  // Utility to parse and calculate discounted fee string
  const calculateDiscountedFee = (feeString: string, discount: number) => {
    if (discount <= 0) return null;
    const match = feeString.match(/\d+/);
    if (!match) return null;
    const originalAmount = parseFloat(match[0]);
    if (isNaN(originalAmount) || originalAmount <= 0) return null;
    
    if (discount >= 100) {
      return "Free";
    }
    const finalAmount = Math.max(0, originalAmount - (originalAmount * discount) / 100);
    return feeString.replace(match[0], Math.round(finalAmount).toString());
  };

  const upcomingModules = LOUNGE_MODULES.filter(m => m.status === 'upcoming');
  const ongoingModules = LOUNGE_MODULES.filter(m => m.status === 'ongoing');
  const pastModules = LOUNGE_MODULES.filter(m => m.status === 'past');

  const renderModuleCard = (module: typeof LOUNGE_MODULES[0]) => {
    let colorStyles = '';
    let badgeStyles = '';
    let iconBg = '';
    
    if (module.color === 'blue') {
      colorStyles = 'focus:ring-blue-500';
      badgeStyles = 'bg-blue-100 text-blue-800 border-blue-200';
      iconBg = 'bg-blue-50 text-blue-600 shadow-blue-100';
    } else if (module.color === 'amber') {
      colorStyles = 'focus:ring-amber-500';
      badgeStyles = 'bg-amber-100 text-amber-800 border-amber-200';
      iconBg = 'bg-amber-50 text-amber-600 shadow-amber-100';
    } else {
      colorStyles = 'focus:ring-rose-500';
      badgeStyles = 'bg-rose-100 text-rose-800 border-rose-200';
      iconBg = 'bg-rose-50 text-rose-600 shadow-rose-100';
    }

    const isEnrolled = activeLearner?.currentFocuses?.some(f => f.title === module.title || f.title === module.batch);
    const isEnrollmentOpen = module.enrollment === 'Open';
    const discountedEnrollmentFee = calculateDiscountedFee(module.enrollmentFee, discountPercent);
    const discountedMonthlyFee = calculateDiscountedFee(module.fee, discountPercent);

    return (
      <div key={module.id} className="bg-brand-white p-6 rounded-3xl shadow-sm border border-brand-border hover:shadow-md transition-all group flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${iconBg}`}>
              {module.icon}
            </div>
            <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${badgeStyles}`}>
              {module.status === 'ongoing' ? 'Ongoing' : module.status === 'upcoming' ? 'Upcoming' : 'Past'}
            </div>
          </div>
          <div className="flex flex-col gap-1 mb-3">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-text leading-tight group-hover:text-brand-brown transition-colors">
              {module.title}
            </h3>
            {('tag' in module) && module.tag && (
              <p className="text-xs font-bold uppercase tracking-wider text-brand-brown-light/80">
                {module.tag as string}
              </p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {module.batch && (
              <div className="text-[11px] font-extrabold text-brand-white bg-brand-brown inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-brand-brown uppercase tracking-wider shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-beige shrink-0" />
                <span>Batch: {module.batch}</span>
              </div>
            )}
            
            {'collab' in module && module.collab && (
              <div className="text-[11px] font-extrabold text-brand-brown bg-brand-beige/50 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-brand-border uppercase tracking-wider shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-brown-light shrink-0" />
                <span>A Collaboration with: {module.collab as React.ReactNode}</span>
              </div>
            )}
          </div>
          
          {discountPercent > 0 && (discountedEnrollmentFee || discountedMonthlyFee) && (
            <div className="mb-4 px-3 py-1.5 bg-green-50/70 border border-green-200/60 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold text-green-800">
              <Zap className="w-3.5 h-3.5 text-green-600 animate-pulse" />
              <span>
                <strong>{statusTier?.name}</strong>: <strong>{discountPercent}% Off</strong> Applied!
              </span>
            </div>
          )}

          <p className="text-sm font-medium text-brand-brown-light leading-relaxed mb-6">
            {module.synopsis}
          </p>
          
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-8 bg-brand-bg-alt p-4 rounded-2xl border border-brand-border-light">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Timeline</span>
                <span className="text-xs font-bold text-brand-text">{module.timeline}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Duration</span>
                <span className="text-xs font-bold text-brand-text truncate">{module.duration}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Speaker</span>
                <span className="text-xs font-bold text-brand-text truncate">{module.speaker}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Location</span>
                <span className="text-xs font-bold text-brand-text truncate">{module.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Sessions</span>
                <span className="text-xs font-bold text-brand-text truncate">{module.sessions}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Time</span>
                <span className="text-xs font-bold text-brand-text truncate">{module.time}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Enrollment Fee</span>
                <div className="text-xs font-bold text-brand-text truncate">
                  {discountedEnrollmentFee ? (
                    <span className="flex items-center gap-1 flex-wrap">
                      <span className="line-through text-brand-brown-light/40 font-normal">{module.enrollmentFee}</span>
                      <span className="text-brand-brown font-extrabold">{discountedEnrollmentFee}</span>
                    </span>
                  ) : (
                    <span>{module.enrollmentFee}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Monthly Fee</span>
                <div className="text-xs font-bold text-brand-text truncate">
                  {discountedMonthlyFee ? (
                    <span className="flex items-center gap-1 flex-wrap">
                      <span className="line-through text-brand-brown-light/40 font-normal">{module.fee}</span>
                      <span className="text-brand-brown font-extrabold">{discountedMonthlyFee}</span>
                    </span>
                  ) : (
                    <span>{module.fee}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <button 
          disabled={!isEnrollmentOpen || isEnrolled}
          onClick={() => setEnrollmentModule(module)}
          className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border shadow-sm ${
            isEnrolled
              ? 'bg-green-700 text-brand-white border-green-800 cursor-not-allowed shadow-none'
              : isEnrollmentOpen 
                ? 'bg-brand-brown text-brand-white hover:bg-brand-brown-dark hover:shadow border-brand-brown' 
                : 'bg-brand-bg-alt text-brand-brown-light border-brand-border-light cursor-not-allowed'
          }`}
        >
          {isEnrolled ? (
            'Enrolled'
          ) : isEnrollmentOpen ? (
            <>Enroll Now <ArrowRight className="w-4 h-4" /></>
          ) : (
            'Enrollment Closed'
          )}
        </button>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      <div className="bg-brand-brown p-8 md:p-12 rounded-3xl shadow-sm border border-brand-brown overflow-hidden relative group">
        <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transition-transform duration-700 group-hover:scale-110 -translate-y-1/4 translate-x-1/4">
           <Bell className="w-96 h-96 text-brand-beige" />
        </div>
        <div className="relative z-10 w-full flex flex-col items-center text-center max-w-3xl mx-auto gap-4 text-brand-offwhite">
          <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight">Wisdom Lounge Updates</h2>
          <p className="text-brand-beige/80 text-sm md:text-base font-medium leading-relaxed">
            Stay informed about upcoming modules, events, and important general announcements. Enroll in new sessions or check out the latest news.
          </p>
        </div>
      </div>

      <div className="flex bg-brand-beige/50 p-1.5 rounded-2xl border border-brand-border h-16 w-full max-w-md mx-auto mb-8 shadow-sm">
        <button 
          onClick={() => setActiveTab('modules')}
          className={`flex-1 rounded-xl text-sm font-bold uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-brand-brown focus:ring-offset-2 focus:ring-offset-brand-bg relative ${activeTab === 'modules' ? 'bg-brand-brown text-brand-white shadow' : 'text-brand-brown-light hover:text-brand-brown hover:bg-brand-offwhite/50'}`}
        >
          Modules
        </button>
        <button 
          onClick={() => setActiveTab('general')}
          className={`flex-1 rounded-xl text-sm font-bold uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-brand-brown focus:ring-offset-2 focus:ring-offset-brand-bg relative ${activeTab === 'general' ? 'bg-brand-brown text-brand-white shadow' : 'text-brand-brown-light hover:text-brand-brown hover:bg-brand-offwhite/50'}`}
        >
          General
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'modules' ? (
          <motion.div
            key="modules"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-12"
          >
            {/* Ongoing Modules */}
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-brand-border pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-brand-brown">Ongoing Modules</h2>
                  <p className="text-brand-brown-light text-sm mt-1">Currently active modules. Enrollment is closed.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ongoingModules.map(renderModuleCard)}
              </div>
            </div>

            {/* Upcoming Modules */}
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-brand-border pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-brand-brown">Upcoming Modules</h2>
                  <p className="text-brand-brown-light text-sm mt-1">Enrollment is open for the following upcoming modules.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingModules.map(renderModuleCard)}
              </div>
            </div>

            {/* Past Modules */}
            {pastModules.length > 0 && (
              <div className="opacity-75">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-brand-border pb-4 gap-4">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-brand-brown">Past Modules</h2>
                    <p className="text-brand-brown-light text-sm mt-1">Modules that have previously concluded.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastModules.map(renderModuleCard)}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="general"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="max-w-4xl mx-auto space-y-6"
          >
             <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-brand-border pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-brand-brown">General Noticeboard</h2>
                  <p className="text-brand-brown-light text-sm mt-1">Important updates and information for all learners.</p>
                </div>
              </div>

            <div className="space-y-4">
              {noticesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                  <Loader2 className="w-8 h-8 text-brand-brown animate-spin mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest text-brand-brown-light">Loading Notices...</p>
                </div>
              ) : generalUpdates.length === 0 ? (
                 <div className="bg-brand-bg-alt p-8 rounded-3xl border border-brand-border text-center">
                   <p className="text-brand-brown-light text-sm font-medium">No general updates at this moment.</p>
                 </div>
              ) : (
                generalUpdates.map((update) => {
                  let Icon = Megaphone;
                  if (update.iconType === 'megaphone') Icon = Megaphone;
                  else if (update.iconType === 'info') Icon = Info;
                  else if (update.iconType === 'flame') Icon = Flame;
                  else if (update.iconType === 'bell') Icon = Bell;
                  else if (update.iconType === 'calendar') Icon = Calendar;

                  return (
                    <div key={update.id} className="bg-brand-white p-6 md:p-8 rounded-3xl border border-brand-border shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
                      <div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center border ${update.iconBg} ${update.iconBorder}`}>
                        <Icon className={`w-6 h-6 ${update.iconBg.replace('bg-', 'text-').replace('-50', '-600').replace('-100', '-600')}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                           <h3 className="font-serif text-xl font-bold text-brand-text">{update.title}</h3>
                           <span className="text-xs font-mono font-medium text-brand-brown-light px-3 py-1 bg-brand-bg-alt rounded-md border border-brand-border-light whitespace-nowrap">{update.date}</span>
                        </div>
                        <p className="text-brand-brown-light text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                          {update.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enrollment Confirmation Modal */}
      <AnimatePresence>
        {enrollmentModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-white w-full max-w-md rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col"
            >
              <div className="px-6 py-6 text-center pt-8">
                <div className="w-16 h-16 bg-brand-beige text-brand-brown rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {enrollmentModule.icon}
                </div>
                {!activeLearner ? (
                  <>
                    <h3 className="font-serif text-2xl font-bold text-brand-text mb-2">Login Required</h3>
                    <p className="text-brand-brown-light text-sm">
                      Please log in or create a Wisdom Profile to enroll in <span className="font-bold text-brand-text">{enrollmentModule.title}</span>.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-serif text-2xl font-bold text-brand-text mb-2">Confirm Enrollment</h3>
                    <p className="text-brand-brown-light text-sm mb-4">
                      You are about to set <span className="font-bold text-brand-text">{enrollmentModule.title}</span> as an active focus on your Learner Dashboard.
                    </p>
                    
                    {discountPercent > 0 && (calculateDiscountedFee(enrollmentModule.enrollmentFee, discountPercent) || calculateDiscountedFee(enrollmentModule.fee, discountPercent)) && (
                      <div className="bg-green-50/50 border border-green-100/60 rounded-2xl p-4 text-left space-y-2 mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-800">
                          <Zap className="w-4 h-4 text-green-600 animate-pulse" />
                          <span>Status Discount Perks ({statusTier?.name})</span>
                        </div>
                        <p className="text-xs text-green-700/90 leading-relaxed">
                          Alhamdulillah! Your dedication has earned you <strong>{discountPercent}% off</strong> standard fees:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-green-100/60 font-semibold text-brand-text">
                          <div>
                            <span className="block text-green-700/80 uppercase font-black tracking-widest text-[9px] mb-0.5">Enrollment Fee</span>
                            <div className="flex items-center gap-1.5">
                              {calculateDiscountedFee(enrollmentModule.enrollmentFee, discountPercent) ? (
                                <>
                                  <span className="line-through text-brand-brown-light/40 font-normal">{enrollmentModule.enrollmentFee}</span>
                                  <span className="text-brand-brown font-extrabold">
                                    {calculateDiscountedFee(enrollmentModule.enrollmentFee, discountPercent)}
                                  </span>
                                </>
                              ) : (
                                <span>{enrollmentModule.enrollmentFee}</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="block text-green-700/80 uppercase font-black tracking-widest text-[9px] mb-0.5">Monthly Fee</span>
                            <div className="flex items-center gap-1.5">
                              {calculateDiscountedFee(enrollmentModule.fee, discountPercent) ? (
                                <>
                                  <span className="line-through text-brand-brown-light/40 font-normal">{enrollmentModule.fee}</span>
                                  <span className="text-brand-brown font-extrabold">
                                    {calculateDiscountedFee(enrollmentModule.fee, discountPercent)}
                                  </span>
                                </>
                              ) : (
                                <span>{enrollmentModule.fee}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-6 bg-brand-offwhite border-t border-brand-border flex gap-3">
                 <button 
                  onClick={() => setEnrollmentModule(null)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-brown-light hover:text-brand-brown hover:bg-brand-beige transition-all"
                >
                  Cancel
                </button>
                {!activeLearner ? (
                  <button 
                    onClick={() => {
                      if (onLoginRequest) onLoginRequest();
                      setEnrollmentModule(null);
                    }}
                    className="flex-1 py-3 px-4 bg-brand-brown text-brand-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-brown-dark shadow hover:shadow-md transition-all border border-brand-brown"
                  >
                    Login / Create Profile
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (onEnroll) {
                        onEnroll(enrollmentModule);
                      }
                      setEnrollmentModule(null);
                    }}
                    className="flex-1 py-3 px-4 bg-brand-brown text-brand-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-brown-dark shadow hover:shadow-md transition-all border border-brand-brown"
                  >
                    Confirm & Go
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

