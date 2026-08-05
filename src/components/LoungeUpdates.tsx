import React, { useState, useEffect } from 'react';
import { BookOpen, Medal, Flame, Bell, Calendar, Clock, DollarSign, ArrowRight, Zap, Info, Users, CreditCard, Moon, Cloud, MapPin, Megaphone, Loader2, ExternalLink, ChevronLeft, ChevronRight, Grid, List, AlertTriangle, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Learner } from '../types';
import { getLearnerBadges } from '../lib/badges';
import { getLearnerStatus } from '../lib/status';
import { noticeService, Notice } from '../services/noticeService';
import { circleService, LoungeCircle } from '../services/circleService';
import { moduleService, LoungeModule } from '../services/moduleService';
import { formatDateDDMMYYYY, formatDateFull } from '../utils';

export function LoungeUpdates({ 
  onEnroll, 
  onJoinCircle,
  activeLearner, 
  onLoginRequest,
  initialTab = 'schedule'
}: { 
  onEnroll?: (module: LoungeModule) => void;
  onJoinCircle?: (circle: LoungeCircle) => void;
  activeLearner?: Learner | null;
  onLoginRequest?: () => void;
  initialTab?: 'modules' | 'circles' | 'schedule' | 'general';
}) {
  const [activeTab, setActiveTab] = useState<'modules' | 'circles' | 'schedule' | 'general'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [modules, setModules] = useState<LoungeModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  const [enrollmentModule, setEnrollmentModule] = useState<LoungeModule | null>(null);
  
  const [generalUpdates, setGeneralUpdates] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);

  const [circles, setCircles] = useState<LoungeCircle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(true);

  // Lounge Schedule states
  const [scheduleYear, setScheduleYear] = useState<number>(2026);
  const [scheduleMonth, setScheduleMonth] = useState<number>(6); // Default: July (6)
  const [scheduleViewType, setScheduleViewType] = useState<'calendar' | 'agenda'>('calendar');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'modules' | 'circles'>('all');
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<number | null>(18); // Default to 18th for July 2026
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null); // For details modal

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Map circle recurring days
  const doesCircleOccurOnDay = (scheduleStr: string, dayOfWeek: number) => {
    const s = (scheduleStr || '').toLowerCase();
    const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    const targetDayName = dayNamesList[dayOfWeek];
    if (s.includes(`every ${targetDayName}`) || s.includes(`${targetDayName}s`)) {
      return true;
    }
    
    if (s.includes('every friday') && dayOfWeek === 5) return true;
    if (s.includes('every monday') && dayOfWeek === 1) return true;
    if (s.includes('every tuesday') && dayOfWeek === 2) return true;
    if (s.includes('every wednesday') && dayOfWeek === 3) return true;
    if (s.includes('every thursday') && dayOfWeek === 4) return true;
    if (s.includes('every saturday') && dayOfWeek === 6) return true;
    if (s.includes('every sunday') && dayOfWeek === 0) return true;

    if (s.includes('mondays & thursdays') && (dayOfWeek === 1 || dayOfWeek === 4)) return true;
    if (s.includes('tuesdays & thursdays') && (dayOfWeek === 2 || dayOfWeek === 4)) return true;
    if (s.includes('wednesdays & fridays') && (dayOfWeek === 3 || dayOfWeek === 5)) return true;
    if (s.includes('mon & thu') && (dayOfWeek === 1 || dayOfWeek === 4)) return true;
    if (s.includes('tue & thu') && (dayOfWeek === 2 || dayOfWeek === 4)) return true;
    
    if (s.includes(targetDayName)) return true;
    
    return false;
  };

  // Get all events for the current selected month
  const getEventsForMonth = () => {
    const eventsList: any[] = [];
    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const totalDays = getDaysInMonth(scheduleYear, scheduleMonth);

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${scheduleYear}-${String(scheduleMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(scheduleYear, scheduleMonth, d).getDay();

      // 1. Modules
      modules.forEach(mod => {
        // Module session
        if (mod.sessionDates && mod.sessionDates.includes(dateStr)) {
          eventsList.push({
            id: `mod-session-${mod.id}-${dateStr}`,
            day: d,
            date: dateStr,
            type: 'module_session',
            title: `${mod.title} Class`,
            subtitle: `Batch: ${mod.batch}`,
            time: mod.time || 'N/A',
            color: mod.color || 'amber',
            icon: 'book',
            speaker: mod.speaker,
            location: mod.location || 'Inside the Lounge',
            refObj: mod,
            detail: `Weekly module session: "${mod.title}" covering the batch "${mod.batch}". Hosted by ${mod.speaker}.`
          });
        }
        // Module orientation
        if (mod.orientationDate === dateStr) {
          eventsList.push({
            id: `mod-orient-${mod.id}-${dateStr}`,
            day: d,
            date: dateStr,
            type: 'module_orientation',
            title: `${mod.title} Orientation`,
            subtitle: `Introduction Session`,
            time: mod.time || 'N/A',
            color: mod.color || 'amber',
            icon: 'info',
            speaker: mod.speaker,
            location: mod.location || 'Inside the Lounge',
            refObj: mod,
            detail: `Introductory orientation session for "${mod.title}" (${mod.batch}) with ${mod.speaker}.`
          });
        }
      });

      // 2. Circles
      circles.forEach(circle => {
        // Check launch date
        if (circle.startDate === dateStr) {
          eventsList.push({
            id: `circle-launch-${circle.id}-${dateStr}`,
            day: d,
            date: dateStr,
            type: 'circle_launch',
            title: `Circle Launch: ${circle.title}`,
            subtitle: `First Gathering`,
            time: circle.schedule || 'N/A',
            color: 'rose',
            icon: 'zap',
            speaker: circle.moderator,
            location: circle.format || 'Onsite',
            refObj: circle,
            detail: `Inaugural launch session of "${circle.title}" hosted by ${circle.moderator}. Methodology: ${circle.methodology || 'N/A'}`
          });
        }

        // Check recurring weekly dates
        if (circle.status !== 'past') {
          const isStarted = !circle.startDate || (dateStr >= circle.startDate);
          
          if (isStarted && doesCircleOccurOnDay(circle.schedule, dayOfWeek)) {
            const isLaunchDay = circle.startDate === dateStr;
            if (!isLaunchDay) {
              eventsList.push({
                id: `circle-session-${circle.id}-${dateStr}`,
                day: d,
                date: dateStr,
                type: 'circle_session',
                title: `${circle.title}`,
                subtitle: `Study & Reflection Circle`,
                time: circle.schedule || 'N/A',
                color: 'violet',
                icon: 'users',
                speaker: circle.moderator,
                location: circle.format || 'Onsite',
                refObj: circle,
                detail: `Weekly collective study assembly for "${circle.title}". Category: ${circle.category || 'Reading Circle'}. Methodology: ${circle.methodology || 'N/A'}`
              });
            }
          }
        }
      });
    }

    return eventsList;
  };

  const allEventsForMonth = getEventsForMonth();

  // Apply filters to events
  const filteredEvents = allEventsForMonth.filter(event => {
    if (scheduleFilter === 'all') return true;
    if (scheduleFilter === 'modules') return event.type.startsWith('module_');
    if (scheduleFilter === 'circles') return event.type.startsWith('circle_');
    return true;
  });

  const handlePrevMonth = () => {
    if (scheduleMonth === 0) {
      setScheduleMonth(11);
      setScheduleYear(prev => prev - 1);
    } else {
      setScheduleMonth(prev => prev - 1);
    }
    setSelectedScheduleDay(null);
  };

  const handleNextMonth = () => {
    if (scheduleMonth === 11) {
      setScheduleMonth(0);
      setScheduleYear(prev => prev + 1);
    } else {
      setScheduleMonth(prev => prev + 1);
    }
    setSelectedScheduleDay(null);
  };

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
    } else if (activeTab === 'circles' && circlesLoading) {
      const fetchCircles = async () => {
        try {
          const data = await circleService.getCircles();
          setCircles(data);
        } catch (error) {
          console.error("Failed to fetch circles", error);
        } finally {
          setCirclesLoading(false);
        }
      };
      fetchCircles();
    } else if (activeTab === 'modules' && modulesLoading) {
      const fetchModules = async () => {
        try {
          const data = await moduleService.getModules();
          setModules(data);
        } catch (error) {
          console.error("Failed to fetch modules", error);
        } finally {
          setModulesLoading(false);
        }
      };
      fetchModules();
    } else if (activeTab === 'schedule') {
      if (modulesLoading) {
        const fetchModules = async () => {
          try {
            const data = await moduleService.getModules();
            setModules(data);
          } catch (error) {
            console.error("Failed to fetch modules", error);
          } finally {
            setModulesLoading(false);
          }
        };
        fetchModules();
      }
      if (circlesLoading) {
        const fetchCircles = async () => {
          try {
            const data = await circleService.getCircles();
            setCircles(data);
          } catch (error) {
            console.error("Failed to fetch circles", error);
          } finally {
            setCirclesLoading(false);
          }
        };
        fetchCircles();
      }
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

  const upcomingModules = modules.filter(m => m.status === 'upcoming');
  const ongoingModules = modules.filter(m => m.status === 'ongoing');
  const pastModules = modules.filter(m => m.status === 'past');

  const renderModuleCard = (module: LoungeModule) => {
    let colorStyles = '';
    let badgeStyles = '';
    let iconBg = '';
    
    if (module.color === 'blue' || module.color === 'sky') {
      colorStyles = 'focus:ring-blue-500';
      badgeStyles = 'bg-blue-100 text-blue-800 border-blue-200';
      iconBg = 'bg-blue-50 text-blue-600 shadow-blue-100';
    } else if (module.color === 'amber') {
      colorStyles = 'focus:ring-amber-500';
      badgeStyles = 'bg-amber-100 text-amber-800 border-amber-200';
      iconBg = 'bg-amber-50 text-amber-600 shadow-amber-100';
    } else if (module.color === 'green') {
      colorStyles = 'focus:ring-green-500';
      badgeStyles = 'bg-green-100 text-green-800 border-green-200';
      iconBg = 'bg-green-50 text-green-600 shadow-green-100';
    } else if (module.color === 'purple') {
      colorStyles = 'focus:ring-purple-500';
      badgeStyles = 'bg-purple-100 text-purple-800 border-purple-200';
      iconBg = 'bg-purple-50 text-purple-600 shadow-purple-100';
    } else {
      colorStyles = 'focus:ring-rose-500';
      badgeStyles = 'bg-rose-100 text-rose-800 border-rose-200';
      iconBg = 'bg-rose-50 text-rose-600 shadow-rose-100';
    }

    let icon = <BookOpen className="w-6 h-6" />;
    if (module.category === 'tafsir') icon = <Moon className="w-6 h-6" />;
    else if (module.category === 'seerah') icon = <Cloud className="w-6 h-6" />;
    else if (module.category === 'dowra') icon = <Medal className="w-6 h-6" />;

    const isEnrolled = activeLearner?.currentFocuses?.some(f => {
      // Check by module ID first if available
      if ((f as any).moduleId && (f as any).moduleId === module.id) return true;
      
      if (!f.title) return false;
      const fTitle = f.title.toLowerCase().trim();
      return (module.title && fTitle === module.title.toLowerCase().trim()) || 
             (module.batch && fTitle === module.batch.toLowerCase().trim());
    });

    // Calculate effective discount for enrollment fee
    const loungeDiscountEnrollmentVal = (module.hasLoungeDiscountEnrollment && module.loungeDiscountEnrollment) ? module.loungeDiscountEnrollment : 0;
    const effectiveEnrollmentDiscount = Math.max(discountPercent, loungeDiscountEnrollmentVal);
    const discountedEnrollmentFee = calculateDiscountedFee(module.enrollmentFee, effectiveEnrollmentDiscount);
    const isLoungeDiscountAppliedEnrollment = loungeDiscountEnrollmentVal > 0 && loungeDiscountEnrollmentVal >= discountPercent;

    // Calculate effective discount for monthly fee
    const loungeDiscountMonthlyVal = (module.hasLoungeDiscountMonthly && module.loungeDiscountMonthly) ? module.loungeDiscountMonthly : 0;
    const effectiveMonthlyDiscount = Math.max(discountPercent, loungeDiscountMonthlyVal);
    const discountedMonthlyFee = calculateDiscountedFee(module.fee, effectiveMonthlyDiscount);
    const isLoungeDiscountAppliedMonthly = loungeDiscountMonthlyVal > 0 && loungeDiscountMonthlyVal >= discountPercent;

    const statusDiscountUsedForEnrollment = !isLoungeDiscountAppliedEnrollment && discountedEnrollmentFee;
    const statusDiscountUsedForMonthly = !isLoungeDiscountAppliedMonthly && discountedMonthlyFee;
    const showStatusDiscountBadge = discountPercent > 0 && (statusDiscountUsedForEnrollment || statusDiscountUsedForMonthly);

    const isEnrollmentOpen = module.isEnrollmentOpen || module.enrollment === 'Open';

    return (
      <div key={module.id} className="bg-brand-white p-6 rounded-3xl shadow-sm border border-brand-border hover:shadow-md transition-all group flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${iconBg}`}>
              {icon}
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
            
            {module.collaboratorTag && (
              <div className="text-[11px] font-extrabold text-brand-brown bg-brand-beige/50 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-brand-border uppercase tracking-wider shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-brown-light shrink-0" />
                <span>{module.collaboratorTag}</span>
              </div>
            )}
          </div>
          
          {showStatusDiscountBadge && (
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
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">
                  Enrollment Fee
                </span>
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
                {isLoungeDiscountAppliedEnrollment ? (
                  <span className="text-[9px] font-black uppercase tracking-wider text-red-600 mt-0.5">Lounge Discount</span>
                ) : statusDiscountUsedForEnrollment ? (
                  <span className="text-[9px] font-black uppercase tracking-wider text-green-600 mt-0.5">Status Discount</span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-brown/60 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">
                  Monthly Fee
                </span>
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
                {isLoungeDiscountAppliedMonthly ? (
                  <span className="text-[9px] font-black uppercase tracking-wider text-red-600 mt-0.5">Lounge Discount</span>
                ) : statusDiscountUsedForMonthly ? (
                  <span className="text-[9px] font-black uppercase tracking-wider text-green-600 mt-0.5">Status Discount</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <button 
          disabled={!isEnrollmentOpen || isEnrolled || activeLearner?.isPaused}
          onClick={() => setEnrollmentModule(module)}
          className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border shadow-sm ${
            activeLearner?.isPaused
              ? 'bg-amber-100 text-amber-800 border-amber-200 cursor-not-allowed'
              : isEnrolled
                ? 'bg-green-700 text-brand-white border-green-800 cursor-not-allowed shadow-none'
                : isEnrollmentOpen
                  ? 'bg-brand-brown text-brand-white hover:bg-brand-brown-dark hover:shadow border-brand-brown' 
                  : 'bg-brand-bg-alt text-brand-brown-light border-brand-border-light cursor-not-allowed'
          }`}
        >
          {activeLearner?.isPaused ? (
            'Profile Paused'
          ) : isEnrolled ? (
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

  // Pre-calculate for the modal if present
  let modalDiscountedEnrollmentFee: string | null = null;
  let modalDiscountedMonthlyFee: string | null = null;
  let modalShowStatusDiscountBadge = false;

  if (enrollmentModule) {
    const loungeDiscountEnrollmentVal = (enrollmentModule.hasLoungeDiscountEnrollment && enrollmentModule.loungeDiscountEnrollment) ? enrollmentModule.loungeDiscountEnrollment : 0;
    const effectiveEnrollmentDiscount = Math.max(discountPercent, loungeDiscountEnrollmentVal);
    modalDiscountedEnrollmentFee = calculateDiscountedFee(enrollmentModule.enrollmentFee, effectiveEnrollmentDiscount);
    const isLoungeDiscountAppliedEnrollment = loungeDiscountEnrollmentVal > 0 && loungeDiscountEnrollmentVal >= discountPercent;

    const loungeDiscountMonthlyVal = (enrollmentModule.hasLoungeDiscountMonthly && enrollmentModule.loungeDiscountMonthly) ? enrollmentModule.loungeDiscountMonthly : 0;
    const effectiveMonthlyDiscount = Math.max(discountPercent, loungeDiscountMonthlyVal);
    modalDiscountedMonthlyFee = calculateDiscountedFee(enrollmentModule.fee, effectiveMonthlyDiscount);
    const isLoungeDiscountAppliedMonthly = loungeDiscountMonthlyVal > 0 && loungeDiscountMonthlyVal >= discountPercent;

    const statusDiscountUsedForEnrollment = !isLoungeDiscountAppliedEnrollment && modalDiscountedEnrollmentFee;
    const statusDiscountUsedForMonthly = !isLoungeDiscountAppliedMonthly && modalDiscountedMonthlyFee;
    modalShowStatusDiscountBadge = discountPercent > 0 && (statusDiscountUsedForEnrollment || statusDiscountUsedForMonthly) ? true : false;
  }

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

      <div className="flex bg-brand-beige/50 p-1.5 rounded-2xl border border-brand-border h-16 w-full max-w-2xl mx-auto mb-8 shadow-sm">
        <button 
          onClick={() => setActiveTab('modules')}
          className={`flex-1 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider md:tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-brand-brown focus:ring-offset-2 focus:ring-offset-brand-bg relative ${activeTab === 'modules' ? 'bg-brand-brown text-brand-white shadow' : 'text-brand-brown-light hover:text-brand-brown hover:bg-brand-offwhite/50'}`}
        >
          Modules
        </button>
        <button 
          onClick={() => setActiveTab('circles')}
          className={`flex-1 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider md:tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-brand-brown focus:ring-offset-2 focus:ring-offset-brand-bg relative ${activeTab === 'circles' ? 'bg-brand-brown text-brand-white shadow' : 'text-brand-brown-light hover:text-brand-brown hover:bg-brand-offwhite/50'}`}
        >
          Circles
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider md:tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-brand-brown focus:ring-offset-2 focus:ring-offset-brand-bg relative ${activeTab === 'schedule' ? 'bg-brand-brown text-brand-white shadow' : 'text-brand-brown-light hover:text-brand-brown hover:bg-brand-offwhite/50'}`}
        >
          Schedule
        </button>
        <button 
          onClick={() => setActiveTab('general')}
          className={`flex-1 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider md:tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-brand-brown focus:ring-offset-2 focus:ring-offset-brand-bg relative ${activeTab === 'general' ? 'bg-brand-brown text-brand-white shadow' : 'text-brand-brown-light hover:text-brand-brown hover:bg-brand-offwhite/50'}`}
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
            {modulesLoading ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <Loader2 className="w-8 h-8 text-brand-brown animate-spin mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-brand-brown-light">Loading Modules...</p>
              </div>
            ) : (
              <>
                {/* Ongoing Modules */}
                {ongoingModules.length > 0 && (
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
                )}

                {/* Upcoming Modules */}
                {upcomingModules.length > 0 && (
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
                )}

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

                {ongoingModules.length === 0 && upcomingModules.length === 0 && pastModules.length === 0 && (
                  <div className="bg-brand-bg-alt p-8 rounded-3xl border border-brand-border text-center">
                    <p className="text-brand-brown-light text-sm font-medium">No modules listed at this moment.</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : activeTab === 'circles' ? (
          <motion.div
            key="circles"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="space-y-12 animate-in duration-200"
          >
            <div>
              {/* Ongoing Circles */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-brand-border pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-brand-brown">Ongoing Study & Reflection Circles</h2>
                  <p className="text-brand-brown-light text-sm mt-1">Informal study assemblies, reading circles, and peer discussion groups held inside the Wisdom Lounge.</p>
                </div>
              </div>

              {circlesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                  <Loader2 className="w-8 h-8 text-brand-brown animate-spin mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest text-brand-brown-light">Loading Circles...</p>
                </div>
              ) : circles.filter(c => !c.status || c.status === 'ongoing').length === 0 ? (
                <div className="bg-brand-bg-alt p-8 rounded-3xl border border-brand-border text-center">
                  <p className="text-brand-brown-light text-sm font-medium">No ongoing circles listed at this moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {circles.filter(c => !c.status || c.status === 'ongoing').map((circle) => {
                    const bookNameOrTitle = circle.bookName || circle.title;
                    const isJoined = activeLearner?.currentFocuses?.some(f => 
                      f.title.toLowerCase() === bookNameOrTitle.toLowerCase()
                    );

                    const handleJoinCircleClick = () => {
                      if (!activeLearner) {
                        if (onLoginRequest) {
                          onLoginRequest();
                        }
                        return;
                      }
                      if (onJoinCircle) {
                        onJoinCircle(circle);
                      }
                    };

                    return (
                      <div key={circle.id} className={`p-6 rounded-3xl shadow-sm border transition-all group flex flex-col justify-between ${
                        isJoined 
                          ? 'bg-brand-offwhite/65 border-brand-border border-dashed opacity-75' 
                          : 'bg-brand-white border-brand-border hover:shadow-md'
                      }`}>
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-brand-beige text-brand-brown">
                                <Users className="w-6 h-6" />
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border bg-amber-50 text-amber-800 border-amber-200 text-right">
                                  {circle.category || 'Study Circle'}
                                </span>
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-right">
                                  {circle.format || 'Onsite'}
                                </span>
                                {circle.subject && (
                                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-right">
                                    {circle.subject}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1 mb-3">
                              <h3 className="font-serif text-xl font-bold text-brand-text leading-tight group-hover:text-brand-brown transition-colors">
                                {circle.title}
                              </h3>
                              <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-brown-light/80">
                                Moderator / Host: {circle.moderator}
                              </p>
                            </div>
                            
                            <p className="text-sm font-medium text-brand-brown-light leading-relaxed mb-6 whitespace-pre-wrap">
                              {circle.description}
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="bg-brand-bg-alt p-4 rounded-2xl border border-brand-border-light space-y-3 text-xs font-bold text-brand-text">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[10px] text-brand-brown-light/70 text-left">Schedule</span>
                                  <span className="text-[11px] font-bold text-brand-text truncate leading-none mt-0.5">{circle.schedule}</span>
                                </div>
                              </div>

                              {circle.bookName && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <BookOpen className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Book / Text Covered</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{circle.bookName}{circle.bookAuthor ? ` (by ${circle.bookAuthor})` : ''}</span>
                                  </div>
                                </div>
                              )}

                              {circle.duration && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <Calendar className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Target Date</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{formatDateDDMMYYYY(circle.duration)}</span>
                                  </div>
                                </div>
                              )}

                              {circle.startDate && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <Clock className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Starting Date</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{formatDateDDMMYYYY(circle.startDate)}</span>
                                  </div>
                                </div>
                              )}

                              {circle.methodology && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <BookOpen className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">How it's done / Method</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{circle.methodology}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {isJoined ? (
                              <div className="space-y-2">
                                <div className="w-full py-2.5 px-4 bg-green-50 border border-green-200 text-green-800 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm">
                                  Active Focus Set ✓
                                </div>
                                {circle.joinLink && (
                                  <a
                                    href={circle.joinLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2.5 px-4 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                  >
                                    Go to Community Link <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <button
                                disabled={activeLearner?.isPaused}
                                onClick={handleJoinCircleClick}
                                className={`w-full py-3 px-4 text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 ${activeLearner?.isPaused ? 'bg-amber-500/50 cursor-not-allowed' : 'bg-brand-brown hover:bg-brand-brown-dark'}`}
                              >
                                {activeLearner?.isPaused ? 'Profile Paused' : (
                                  <>Join Circle & Set Active Focus <ArrowRight className="w-4 h-4" /></>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Circles */}
            {circles.filter(c => c.status === 'upcoming').length > 0 && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-brand-border pb-4 gap-4">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-brand-brown">Upcoming Circles</h2>
                    <p className="text-brand-brown-light text-sm mt-1">Get ready for these upcoming study circles.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {circles.filter(c => c.status === 'upcoming').map((circle) => {
                    const bookNameOrTitle = circle.bookName || circle.title;
                    const isJoined = activeLearner?.currentFocuses?.some(f => 
                      f.title.toLowerCase() === bookNameOrTitle.toLowerCase()
                    );

                    const handleJoinCircleClick = () => {
                      if (!activeLearner) {
                        if (onLoginRequest) {
                          onLoginRequest();
                        }
                        return;
                      }
                      if (onJoinCircle) {
                        onJoinCircle(circle);
                      }
                    };

                    return (
                      <div key={circle.id} className={`p-6 rounded-3xl shadow-sm border transition-all group flex flex-col justify-between ${
                        isJoined 
                          ? 'bg-brand-offwhite/65 border-brand-border border-dashed opacity-75' 
                          : 'bg-brand-white border-brand-border hover:shadow-md'
                      }`}>
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-brand-beige text-brand-brown">
                                <Users className="w-6 h-6" />
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border bg-amber-50 text-amber-800 border-amber-200 text-right">
                                  {circle.category || 'Study Circle'}
                                </span>
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-right">
                                  {circle.format || 'Onsite'}
                                </span>
                                {circle.subject && (
                                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-right">
                                    {circle.subject}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1 mb-3">
                              <h3 className="font-serif text-xl font-bold text-brand-text leading-tight group-hover:text-brand-brown transition-colors">
                                {circle.title}
                              </h3>
                              <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-brown-light/80">
                                Moderator / Host: {circle.moderator}
                              </p>
                            </div>
                            
                            <p className="text-sm font-medium text-brand-brown-light leading-relaxed mb-6 whitespace-pre-wrap">
                              {circle.description}
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="bg-brand-bg-alt p-4 rounded-2xl border border-brand-border-light space-y-3 text-xs font-bold text-brand-text">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[10px] text-brand-brown-light/70 text-left">Schedule</span>
                                  <span className="text-[11px] font-bold text-brand-text truncate leading-none mt-0.5">{circle.schedule}</span>
                                </div>
                              </div>

                              {circle.bookName && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <BookOpen className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Book / Text Covered</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{circle.bookName}{circle.bookAuthor ? ` (by ${circle.bookAuthor})` : ''}</span>
                                  </div>
                                </div>
                              )}

                              {circle.duration && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <Calendar className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Target Date</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{formatDateDDMMYYYY(circle.duration)}</span>
                                  </div>
                                </div>
                              )}

                              {circle.startDate && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <Clock className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Starting Date</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{formatDateDDMMYYYY(circle.startDate)}</span>
                                  </div>
                                </div>
                              )}

                              {circle.methodology && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <BookOpen className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">How it's done / Method</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{circle.methodology}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {isJoined ? (
                              <div className="space-y-2">
                                <div className="w-full py-2.5 px-4 bg-green-50 border border-green-200 text-green-800 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm">
                                  Active Focus Set ✓
                                </div>
                                {circle.joinLink && (
                                  <a
                                    href={circle.joinLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2.5 px-4 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                  >
                                    Go to Community Link <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <button
                                disabled={activeLearner?.isPaused}
                                onClick={handleJoinCircleClick}
                                className={`w-full py-3 px-4 text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 ${activeLearner?.isPaused ? 'bg-amber-500/50 cursor-not-allowed' : 'bg-brand-brown hover:bg-brand-brown-dark'}`}
                              >
                                {activeLearner?.isPaused ? 'Profile Paused' : (
                                  <>Join Circle & Set Active Focus <ArrowRight className="w-4 h-4" /></>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Circles */}
            {circles.filter(c => c.status === 'past').length > 0 && (
              <div className="opacity-75">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-brand-border pb-4 gap-4">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-brand-brown">Past Circles</h2>
                    <p className="text-brand-brown-light text-sm mt-1">Study circles that have successfully concluded.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {circles.filter(c => c.status === 'past').map((circle) => {
                    const bookNameOrTitle = circle.bookName || circle.title;
                    const isJoined = activeLearner?.currentFocuses?.some(f => 
                      f.title.toLowerCase() === bookNameOrTitle.toLowerCase()
                    );

                    const handleJoinCircleClick = () => {
                      if (!activeLearner) {
                        if (onLoginRequest) {
                          onLoginRequest();
                        }
                        return;
                      }
                      if (onJoinCircle) {
                        onJoinCircle(circle);
                      }
                    };

                    return (
                      <div key={circle.id} className={`p-6 rounded-3xl shadow-sm border transition-all group flex flex-col justify-between ${
                        isJoined 
                          ? 'bg-brand-offwhite/65 border-brand-border border-dashed opacity-75' 
                          : 'bg-brand-white border-brand-border hover:shadow-md'
                      }`}>
                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm bg-brand-beige text-brand-brown">
                                <Users className="w-6 h-6" />
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border bg-amber-50 text-amber-800 border-amber-200 text-right">
                                  {circle.category || 'Study Circle'}
                                </span>
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-right">
                                  {circle.format || 'Onsite'}
                                </span>
                                {circle.subject && (
                                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-right">
                                    {circle.subject}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-1 mb-3">
                              <h3 className="font-serif text-xl font-bold text-brand-text leading-tight group-hover:text-brand-brown transition-colors">
                                {circle.title}
                              </h3>
                              <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-brown-light/80">
                                Moderator / Host: {circle.moderator}
                              </p>
                            </div>
                            
                            <p className="text-sm font-medium text-brand-brown-light leading-relaxed mb-6 whitespace-pre-wrap">
                              {circle.description}
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="bg-brand-bg-alt p-4 rounded-2xl border border-brand-border-light space-y-3 text-xs font-bold text-brand-text">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[10px] text-brand-brown-light/70 text-left">Schedule</span>
                                  <span className="text-[11px] font-bold text-brand-text truncate leading-none mt-0.5">{circle.schedule}</span>
                                </div>
                              </div>

                              {circle.bookName && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <BookOpen className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Book / Text Covered</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{circle.bookName}{circle.bookAuthor ? ` (by ${circle.bookAuthor})` : ''}</span>
                                  </div>
                                </div>
                              )}

                              {circle.duration && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <Calendar className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Target Date</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{formatDateDDMMYYYY(circle.duration)}</span>
                                  </div>
                                </div>
                              )}

                              {circle.startDate && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <Clock className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">Starting Date</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{formatDateDDMMYYYY(circle.startDate)}</span>
                                  </div>
                                </div>
                              )}

                              {circle.methodology && (
                                <div className="flex items-center gap-2 border-t border-brand-border/30 pt-2">
                                  <BookOpen className="w-4 h-4 text-brand-brown/60 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown-light/70 text-left">How it's done / Method</span>
                                    <span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{circle.methodology}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {circle.completedLearners && circle.completedLearners.length > 0 && (
                              <div className="border-t border-brand-border/20 pt-3">
                                <span className="text-[10px] font-black uppercase tracking-wider text-brand-brown-light/80 block mb-2">🎓 Completed Readers ({circle.completedLearners.length})</span>
                                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                  {circle.completedLearners.map((cl, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs bg-brand-bg-alt/50 px-2.5 py-1.5 rounded-lg border border-brand-border-light/40">
                                      <span className="font-semibold text-brand-text truncate max-w-[130px]">{cl.name}</span>
                                      <span className="text-[10px] text-brand-brown-light font-mono">{formatDateDDMMYYYY(cl.date)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isJoined ? (
                              <div className="space-y-2">
                                <div className="w-full py-2.5 px-4 bg-green-50 border border-green-200 text-green-800 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm">
                                  Active Focus Set ✓
                                </div>
                                {circle.joinLink && (
                                  <a
                                    href={circle.joinLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2.5 px-4 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                  >
                                    Go to Community Link <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <button
                                disabled={activeLearner?.isPaused}
                                onClick={handleJoinCircleClick}
                                className={`w-full py-3 px-4 text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 ${activeLearner?.isPaused ? 'bg-amber-500/50 cursor-not-allowed' : 'bg-brand-brown hover:bg-brand-brown-dark'}`}
                              >
                                {activeLearner?.isPaused ? 'Profile Paused' : (
                                  <>Join Circle & Set Active Focus <ArrowRight className="w-4 h-4" /></>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </motion.div>
        ) : activeTab === 'schedule' ? (
          <motion.div
            key="schedule"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full space-y-8"
          >
            {/* Header / Nav Card */}
            <div className="bg-brand-white p-6 md:p-8 rounded-3xl border border-brand-border shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-brand-border-light/60">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-brand-brown">Lounge Schedule</h2>
                  <p className="text-brand-brown-light text-sm mt-1">
                    Synchronized dates of all modules and schedules of all circles in one visual calendar.
                  </p>
                </div>
                
                {/* Month Selector */}
                <div className="flex items-center gap-4 bg-brand-bg-alt px-4 py-2 rounded-2xl border border-brand-border self-start md:self-center shadow-inner">
                  <button 
                    onClick={handlePrevMonth} 
                    className="p-1 hover:bg-brand-beige/50 rounded-lg text-brand-brown transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-serif font-bold text-brand-text text-base md:text-lg min-w-[140px] text-center">
                    {monthNames[scheduleMonth]} {scheduleYear}
                  </span>
                  <button 
                    onClick={handleNextMonth} 
                    className="p-1 hover:bg-brand-beige/50 rounded-lg text-brand-brown transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filters & Views Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
                {/* Filter Selector */}
                <div className="flex bg-brand-bg-alt/75 p-1 rounded-xl border border-brand-border-light">
                  <button
                    onClick={() => { setScheduleFilter('all'); setSelectedScheduleDay(null); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${scheduleFilter === 'all' ? 'bg-brand-brown text-brand-white shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
                  >
                    All Events
                  </button>
                  <button
                    onClick={() => { setScheduleFilter('modules'); setSelectedScheduleDay(null); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${scheduleFilter === 'modules' ? 'bg-brand-brown text-brand-white shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Modules
                  </button>
                  <button
                    onClick={() => { setScheduleFilter('circles'); setSelectedScheduleDay(null); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${scheduleFilter === 'circles' ? 'bg-brand-brown text-brand-white shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                    Circles
                  </button>
                </div>

                {/* View Selector */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setScheduleViewType('calendar')}
                    className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${scheduleViewType === 'calendar' ? 'bg-brand-brown border-brand-brown text-brand-white shadow-sm' : 'bg-brand-white border-brand-border text-brand-brown-light hover:bg-brand-bg-alt'}`}
                  >
                    <Grid className="w-4 h-4" />
                    <span>Calendar Grid</span>
                  </button>
                  <button
                    onClick={() => setScheduleViewType('agenda')}
                    className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${scheduleViewType === 'agenda' ? 'bg-brand-brown border-brand-brown text-brand-white shadow-sm' : 'bg-brand-white border-brand-border text-brand-brown-light hover:bg-brand-bg-alt'}`}
                  >
                    <List className="w-4 h-4" />
                    <span>Agenda Timeline</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Core Schedule Body */}
            {scheduleViewType === 'calendar' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Month Grid */}
                <div className="lg:col-span-8 bg-brand-white p-6 rounded-3xl border border-brand-border shadow-sm">
                  {/* Calendar Grid Header */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] md:text-xs uppercase tracking-widest text-brand-brown-light/80 mb-4 pb-2 border-b border-brand-border-light">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells */}
                    {(() => {
                      const getFirstDayOfWeek = (y: number, m: number) => new Date(y, m, 1).getDay();
                      const startDayOfWeek = getFirstDayOfWeek(scheduleYear, scheduleMonth);
                      return Array.from({ length: startDayOfWeek }).map((_, idx) => (
                        <div key={`offset-${idx}`} className="bg-brand-bg-alt/25 rounded-2xl min-h-[64px] sm:min-h-[84px] opacity-40"></div>
                      ));
                    })()}

                    {/* Days Cells */}
                    {(() => {
                      const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
                      const daysCount = getDaysInMonth(scheduleYear, scheduleMonth);
                      return Array.from({ length: daysCount }).map((_, idx) => {
                        const d = idx + 1;
                        const dateStr = `${scheduleYear}-${String(scheduleMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dayEvents = filteredEvents.filter(e => e.day === d);
                        const isToday = scheduleYear === 2026 && scheduleMonth === 6 && d === 18;
                        const isSelected = selectedScheduleDay === d;

                        return (
                          <button
                            key={`day-${d}`}
                            onClick={() => setSelectedScheduleDay(isSelected ? null : d)}
                            className={`rounded-2xl p-2 min-h-[64px] sm:min-h-[84px] transition-all flex flex-col justify-between items-start border text-left relative group ${
                              isSelected 
                                ? 'border-brand-brown bg-brand-beige/25 ring-2 ring-brand-brown' 
                                : isToday
                                  ? 'border-amber-400 bg-amber-50/20'
                                  : 'border-brand-border bg-brand-white hover:bg-brand-bg-alt/40 hover:border-brand-brown-light/30'
                            }`}
                          >
                            {/* Day Number */}
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-xs md:text-sm font-bold ${
                                isSelected 
                                  ? 'text-brand-brown' 
                                  : isToday 
                                    ? 'text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-lg text-[10px] font-black' 
                                    : 'text-brand-text'
                              }`}>
                                {d}
                              </span>
                              {isToday && !isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                              )}
                            </div>

                             {/* Event Indicators */}
                             {scheduleFilter !== 'modules' && (
                               <div className="flex flex-wrap gap-1 mt-2 w-full">
                                 {dayEvents.map((evt) => {
                                   let dotColor = 'bg-amber-500';
                                   if (evt.type === 'module_orientation') dotColor = 'bg-orange-400';
                                   else if (evt.type === 'circle_launch') dotColor = 'bg-rose-500';
                                   else if (evt.type === 'circle_session') dotColor = 'bg-indigo-500';
                                   
                                   return (
                                     <span 
                                       key={evt.id} 
                                       className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                                       title={evt.title}
                                     ></span>
                                   );
                                 })}
                               </div>
                             )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Day Details Side Panel */}
                <div className="lg:col-span-4 bg-brand-white p-6 rounded-3xl border border-brand-border shadow-sm self-stretch flex flex-col">
                  {selectedScheduleDay ? (
                    (() => {
                      const selectedDateStr = `${scheduleYear}-${String(scheduleMonth + 1).padStart(2, '0')}-${String(selectedScheduleDay).padStart(2, '0')}`;
                      const dayEvents = filteredEvents.filter(e => e.day === selectedScheduleDay);

                      return (
                        <div className="flex flex-col h-full justify-between">
                          <div className="space-y-4">
                            <div className="pb-3 border-b border-brand-border-light/60">
                              <span className="text-[10px] font-black uppercase tracking-wider text-brand-brown-light/80 block">Selected Date</span>
                              <h3 className="font-serif text-lg font-bold text-brand-brown">
                                {formatDateFull(selectedDateStr)}
                              </h3>
                            </div>

                            {dayEvents.length === 0 ? (
                              <div className="bg-brand-bg-alt/50 p-6 rounded-2xl border border-dashed border-brand-border/60 text-center py-12">
                                <CalendarDays className="w-8 h-8 text-brand-brown-light/40 mx-auto mb-2" />
                                <p className="text-brand-brown-light text-xs font-medium">
                                  No events scheduled for this day.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                                {dayEvents.map((evt) => {
                                  const isModule = evt.type.startsWith('module_');
                                  return (
                                    <div 
                                      key={evt.id} 
                                      className={`p-4 rounded-2xl border transition-all hover:shadow-sm bg-brand-bg-alt/30 ${
                                        isModule ? 'border-amber-100 hover:border-amber-200' : 'border-indigo-100 hover:border-indigo-200'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                                          evt.type === 'module_session' ? 'bg-amber-100 text-amber-800' :
                                          evt.type === 'module_orientation' ? 'bg-orange-100 text-orange-800' :
                                          evt.type === 'circle_launch' ? 'bg-rose-100 text-rose-800' :
                                          'bg-indigo-100 text-indigo-800'
                                        }`}>
                                          {evt.type === 'module_session' ? 'Class' :
                                           evt.type === 'module_orientation' ? 'Orientation' :
                                           evt.type === 'circle_launch' ? 'Launch' : 'Circle'}
                                        </span>
                                        <span className="text-[10px] font-medium font-mono text-brand-brown-light">{evt.time}</span>
                                      </div>
                                      <h4 className="font-serif font-bold text-brand-text leading-snug mb-1">
                                        {evt.title}
                                      </h4>
                                      <p className="text-[10px] font-extrabold text-brand-brown-light/80 uppercase tracking-wide mb-3">
                                        {isModule ? `Instructor: ${evt.speaker}` : `Host: ${evt.speaker}`}
                                      </p>
                                      <button
                                        onClick={() => setSelectedEvent(evt)}
                                        className="w-full py-1.5 px-3 bg-brand-white border border-brand-border text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-brand-brown hover:text-brand-white transition-all text-center"
                                      >
                                        View Details & Register
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="mt-6 pt-4 border-t border-brand-border-light/60 text-[10px] font-medium text-brand-brown-light/70 text-center leading-relaxed">
                            Click any day in the calendar grid to explore and filter that day's events.
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16 my-auto">
                      <CalendarDays className="w-12 h-12 text-brand-brown/30 mb-3" />
                      <h4 className="font-serif font-bold text-brand-text text-base">Select a Day</h4>
                      <p className="text-brand-brown-light text-xs max-w-[200px] mt-1">
                        Select any highlighted day on the calendar to view scheduled assemblies.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Agenda Timeline View */
              <div className="bg-brand-white p-6 md:p-8 rounded-3xl border border-brand-border shadow-sm max-w-4xl mx-auto space-y-6">
                {filteredEvents.length === 0 ? (
                  <div className="bg-brand-bg-alt p-12 rounded-3xl border border-dashed border-brand-border text-center py-16">
                    <Calendar className="w-12 h-12 text-brand-brown-light/30 mx-auto mb-4" />
                    <h3 className="text-lg font-serif font-bold text-brand-brown mb-1">No Scheduled Events</h3>
                    <p className="text-brand-brown-light text-sm max-w-md mx-auto mb-6">
                      There are no matching events scheduled in {monthNames[scheduleMonth]} {scheduleYear} for your selected filters.
                    </p>
                    <button
                      onClick={handleNextMonth}
                      className="px-4 py-2 bg-brand-brown text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-brand-brown-dark transition-colors"
                    >
                      View Next Month
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 relative before:absolute before:top-0 before:bottom-0 before:left-[45px] sm:before:left-[60px] before:w-[2px] before:bg-brand-border-light/50">
                    {(() => {
                      // Group by day
                      const groupedByDay: { [key: number]: any[] } = {};
                      filteredEvents.forEach(evt => {
                        if (!groupedByDay[evt.day]) groupedByDay[evt.day] = [];
                        groupedByDay[evt.day].push(evt);
                      });

                      const sortedDays = Object.keys(groupedByDay).map(Number).sort((a, b) => a - b);

                      return sortedDays.map((d) => {
                        const dayEvents = groupedByDay[d];
                        const dateStr = `${scheduleYear}-${String(scheduleMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dayName = new Date(scheduleYear, scheduleMonth, d).toLocaleDateString('en-US', { weekday: 'short' });

                        return (
                          <div key={`agenda-day-${d}`} className="flex gap-6 md:gap-8 items-start relative group">
                            {/* Date Badge */}
                            <div className="flex flex-col items-center justify-center w-[90px] shrink-0 bg-brand-beige/20 border border-brand-border rounded-2xl p-2.5 z-10 shadow-sm">
                              <span className="text-2xl font-serif font-bold text-brand-brown leading-none">{d}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-brand-brown-light mt-1">{dayName}</span>
                            </div>

                            {/* Events List for that day */}
                            <div className="flex-1 space-y-4">
                              {dayEvents.map((evt) => {
                                const isModule = evt.type.startsWith('module_');
                                return (
                                  <div 
                                    key={evt.id} 
                                    className="bg-brand-white p-5 rounded-2xl border border-brand-border-light shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                                          evt.type === 'module_session' ? 'bg-amber-100 text-amber-800' :
                                          evt.type === 'module_orientation' ? 'bg-orange-100 text-orange-800' :
                                          evt.type === 'circle_launch' ? 'bg-rose-100 text-rose-800' :
                                          'bg-indigo-100 text-indigo-800'
                                        }`}>
                                          {evt.type === 'module_session' ? 'Class' :
                                           evt.type === 'module_orientation' ? 'Orientation' :
                                           evt.type === 'circle_launch' ? 'Launch' : 'Circle'}
                                        </span>
                                        <span className="text-[10px] font-medium font-mono text-brand-brown-light">{evt.time}</span>
                                      </div>
                                      
                                      <h4 className="font-serif font-bold text-xl text-brand-text leading-tight">
                                        {evt.title}
                                      </h4>
                                      
                                      <p className="text-xs text-brand-brown-light leading-relaxed max-w-xl">
                                        {evt.detail}
                                      </p>
                                    </div>

                                    <div className="flex sm:flex-col items-stretch sm:items-end justify-between sm:justify-center gap-2 md:border-l border-brand-border-light/40 md:pl-6 shrink-0">
                                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-brand-brown-light text-left sm:text-right">
                                        {isModule ? `Instructor: ${evt.speaker}` : `Host: ${evt.speaker}`}
                                      </span>
                                      <button
                                        onClick={() => setSelectedEvent(evt)}
                                        className="py-1.5 px-4 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
                                      >
                                        Details & Register
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
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
                           <span className="text-xs font-mono font-medium text-brand-brown-light px-3 py-1 bg-brand-bg-alt rounded-md border border-brand-border-light whitespace-nowrap">{formatDateDDMMYYYY(update.date)}</span>
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
                    
                    {modalShowStatusDiscountBadge && (
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
                              {modalDiscountedEnrollmentFee ? (
                                <>
                                  <span className="line-through text-brand-brown-light/40 font-normal">{enrollmentModule.enrollmentFee}</span>
                                  <span className="text-brand-brown font-extrabold">
                                    {modalDiscountedEnrollmentFee}
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
                              {modalDiscountedMonthlyFee ? (
                                <>
                                  <span className="line-through text-brand-brown-light/40 font-normal">{enrollmentModule.fee}</span>
                                  <span className="text-brand-brown font-extrabold">
                                    {modalDiscountedMonthlyFee}
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

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-white w-full max-w-lg rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col"
            >
              {/* Color Header Banner */}
              <div className={`p-6 text-brand-white ${
                selectedEvent.type === 'module_session' ? 'bg-amber-600' :
                selectedEvent.type === 'module_orientation' ? 'bg-orange-500' :
                selectedEvent.type === 'circle_launch' ? 'bg-rose-500' : 'bg-indigo-600'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-white/20 text-white">
                    {selectedEvent.type === 'module_session' ? 'Class Session' :
                     selectedEvent.type === 'module_orientation' ? 'Course Orientation' :
                     selectedEvent.type === 'circle_launch' ? 'Circle Launch' : 'Study Circle'}
                  </span>
                  <span className="text-xs font-mono font-semibold">{selectedEvent.time}</span>
                </div>
                <h3 className="font-serif text-2xl font-bold leading-tight">{selectedEvent.title}</h3>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div className="space-y-4 text-sm">
                  {/* Speaker & Location Row */}
                  <div className="grid grid-cols-2 gap-4 bg-brand-bg-alt p-4 rounded-2xl border border-brand-border-light">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-brown-light/70 block">Host / Speaker</span>
                      <span className="font-serif text-base font-bold text-brand-brown block mt-0.5">{selectedEvent.speaker}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-brown-light/70 block">Location</span>
                      <span className="font-serif text-base font-bold text-brand-brown block mt-0.5">{selectedEvent.location}</span>
                    </div>
                  </div>

                  {/* Date and details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-brown-light">
                      <Calendar className="w-4 h-4 text-brand-brown/60 shrink-0" />
                      <span>Date: {formatDateFull(selectedEvent.date)}</span>
                    </div>
                    {selectedEvent.refObj.batch && (
                      <div className="flex items-center gap-2 text-xs font-bold text-brand-brown-light">
                        <BookOpen className="w-4 h-4 text-brand-brown/60 shrink-0" />
                        <span>Batch / Target Group: {selectedEvent.refObj.batch}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-brand-brown-light text-sm leading-relaxed whitespace-pre-wrap bg-brand-beige/10 p-4 rounded-2xl border border-brand-border-light/40">
                    {selectedEvent.detail}
                  </p>
                </div>

                {/* Actions / Buttons */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="py-2.5 px-5 bg-brand-bg-alt hover:bg-brand-beige/40 text-brand-brown text-xs font-bold uppercase tracking-widest rounded-xl transition-colors border border-brand-border"
                  >
                    Close
                  </button>

                  {/* Interactive Action: Enroll / Join */}
                  {(() => {
                    const isModule = selectedEvent.type.startsWith('module_');
                    if (isModule) {
                      const mod = selectedEvent.refObj;
                      const isEnrolled = activeLearner?.currentFocuses?.some(f => f.isLoungeModule && f.moduleId === mod.id);
                      const isEnrollmentOpen = mod.isEnrollmentOpen || mod.enrollment === 'Open';

                      if (isEnrolled) {
                        return (
                          <div className="py-2.5 px-5 bg-green-50 border border-green-200 text-green-800 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-sm">
                            Enrolled ✓
                          </div>
                        );
                      }
                      
                      return (
                        <button
                          disabled={!isEnrollmentOpen || activeLearner?.isPaused}
                          onClick={() => {
                            setSelectedEvent(null);
                            setEnrollmentModule(mod);
                          }}
                          className={`py-2.5 px-5 text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm ${
                            !isEnrollmentOpen || activeLearner?.isPaused
                              ? 'bg-amber-500/50 cursor-not-allowed'
                              : 'bg-brand-brown hover:bg-brand-brown-dark'
                          }`}
                        >
                          {activeLearner?.isPaused ? 'Profile Paused' : !isEnrollmentOpen ? 'Enrollment Closed' : 'Enroll in Module'}
                        </button>
                      );
                    } else {
                      const circle = selectedEvent.refObj;
                      const bookNameOrTitle = circle.bookName || circle.title;
                      const isJoined = activeLearner?.currentFocuses?.some(f => 
                        f.title.toLowerCase() === bookNameOrTitle.toLowerCase()
                      );

                      if (isJoined) {
                        return (
                          <div className="flex gap-2">
                            <div className="py-2.5 px-4 bg-green-50 border border-green-200 text-green-800 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-sm">
                              Joined ✓
                            </div>
                            {circle.joinLink && (
                              <a
                                href={circle.joinLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2.5 px-4 bg-brand-brown hover:bg-brand-brown-dark text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                Link <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      }

                      return (
                        <button
                          disabled={activeLearner?.isPaused}
                          onClick={() => {
                            setSelectedEvent(null);
                            if (!activeLearner) {
                              if (onLoginRequest) onLoginRequest();
                              return;
                            }
                            if (onJoinCircle) onJoinCircle(circle);
                          }}
                          className={`py-2.5 px-5 text-brand-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm ${
                            activeLearner?.isPaused
                              ? 'bg-amber-500/50 cursor-not-allowed'
                              : 'bg-brand-brown hover:bg-brand-brown-dark'
                          }`}
                        >
                          {activeLearner?.isPaused ? 'Profile Paused' : 'Join Circle'}
                        </button>
                      );
                    }
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

