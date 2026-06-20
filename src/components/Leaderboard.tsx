import { useState, useMemo } from 'react';
import { Learner } from '../types';
import { Trophy, Medal, Award, BookOpen, Mic, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MODULES, ISLAMIC_BOOKS, APP_DOMAINS } from '../constants';
import { EditRequest } from '../types';
import { getOverallPoints, getDomainValue, getModulePoints } from '../utils';
import { getLearnerBadges } from '../lib/badges';
import { getLearnerStatus, STATUS_TIERS, getLeaderboardRowStyle } from '../lib/status';

type Category = 'overall' | EditRequest['type'];

const getDomainItemsForLeaderboard = (learner: Learner, type: string) => {
  const getCleanTitles = (items: string[]) => items.map(item => {
    if (item.toLowerCase().includes('research papers/article')) return 'Research Paper / Article';
    let clean = item;
    clean = clean.replace(/^\[Article\]\s*/i, '');
    clean = clean.replace(/^\[Research Paper\]\s*/i, '');
    const match = clean.match(/^(.+?)(?:\s*\([^)]+\))?$/);
    return match ? match[1].trim() : clean;
  });

  let items: string[] = [];
  if (type === 'book') items = learner.booksCompleted || [];
  else if (type === 'presentation') items = learner.presentationsGiven || [];
  else if (type === 'task') items = []; // Tasks don't have explicit names
  else {
    const saveKey = type === 'research papers/article' ? 'articles' : type;
    items = learner.moduleItems?.[saveKey] || [];
  }

  // Fallbacks for older records that just had the boolean flag set
  if (items.length === 0) {
    if (type === 'dowra' && learner.completedDawraEQuran) items = ['Dawra-e-Quran'];
    if (type === 'tafsir' && learner.completedTafsirModule) items = ['Tafsir Module'];
    if (type === 'seerah' && learner.completedSeerahModule) items = ['Seerah Module'];
    if (type === 'research papers/article' && learner.completedArticlesModule) items = ['Research Paper / Article'];
  }

  return getCleanTitles(items); 
};

export function Leaderboard({ learners }: { learners: Learner[] }) {
  const [activeCategory, setActiveCategory] = useState<Category>('overall');
  const [expandedLearnerId, setExpandedLearnerId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const sortedLearners = useMemo(() => {
    return [...learners].sort((a, b) => {
      if (activeCategory === 'overall') return getOverallPoints(b) - getOverallPoints(a);
      return getDomainValue(b, activeCategory) - getDomainValue(a, activeCategory);
    }).slice(0, 10);
  }, [learners, activeCategory]);

  const getScore = (learner: Learner) => {
    if (activeCategory === 'overall') return getOverallPoints(learner);
    return getDomainValue(learner, activeCategory);
  };

  const getCategoryLabel = () => {
    if (activeCategory === 'overall') return 'Points';
    const domain = APP_DOMAINS.find(d => d.type === activeCategory);
    return domain ? domain.label : activeCategory;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl font-bold text-brand-text flex items-center gap-3">
          <Trophy className="text-yellow-500 w-8 h-8" />
          Leaderboard
          <div className="relative group cursor-help ml-2">
            <Info className="w-4 h-4 text-brand-brown-light opacity-30 hover:opacity-100 transition-opacity" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 hidden group-hover:block w-64 p-4 bg-brand-white border border-brand-border rounded-xl shadow-xl z-30">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-brand-brown mb-2 border-b border-brand-border-light pb-1">Recommended Reading</h5>
              <ul className="space-y-1">
                {ISLAMIC_BOOKS.map(book => (
                  <li key={book} className="text-[10px] text-brand-brown-light flex items-center gap-2">
                    <span className="w-1 h-1 bg-brand-brown rounded-full shrink-0"></span>
                    {book}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-brown-light">Top performers of The Wisdom Lounge.</p>
      </div>

      {/* Category Tabs right above the board */}
      <div className="w-full overflow-x-auto no-scrollbar pb-1">
        <div className="flex bg-brand-beige p-1 rounded-xl shadow-sm border border-brand-border min-w-max gap-1">
          <button 
            onClick={() => setActiveCategory('overall')}
            className={`flex-none px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeCategory === 'overall' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
          >
            Overall
          </button>
          {APP_DOMAINS.map(domain => (
            <button 
              key={domain.type}
              onClick={() => setActiveCategory(domain.type)}
              className={`flex-none px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeCategory === domain.type ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
            >
              {domain.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-brand-white rounded-3xl shadow-sm border border-brand-border overflow-hidden">
        {sortedLearners.length === 0 ? (
          <div className="p-20 text-center text-brand-brown-light italic flex flex-col items-center gap-4">
            <SearchIcon className="w-12 h-12 opacity-10" />
            <p>No active learners in this module yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-border-light">
            {sortedLearners.map((learner, index) => (
              <motion.div 
                key={learner.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col hover:bg-brand-bg-alt transition-colors"
                title={
                  activeCategory === 'books' ? (learner.booksCompleted || []).join('\n') :
                  activeCategory === 'presentations' ? (learner.presentationsGiven || []).join('\n') :
                  activeCategory === 'overall' ? `Books: ${(learner.booksCompleted || []).length}\nPresentations: ${(learner.presentationsGiven || []).length}\nTasks: ${learner.tasksCompleted || 0}` : undefined
                }
              >
                <div 
                  onClick={() => {
                    setExpandedLearnerId(prev => prev === learner.id ? null : learner.id);
                    setSelectedDomain(null);
                  }}
                  className="flex items-center justify-between p-4 sm:p-6 cursor-pointer"
                >
                  <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold font-serif text-base sm:text-xl shadow-sm border-2 shrink-0 ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-700' : 
                      index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-400' : 
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-800' : 
                      'bg-brand-beige text-brand-text border-brand-border'
                    }`}>
                      {index === 0 ? <Trophy className="w-5 h-5 sm:w-6 sm:h-6" /> : index === 1 ? <Medal className="w-5 h-5 sm:w-6 sm:h-6" /> : index === 2 ? <Award className="w-5 h-5 sm:w-6 sm:h-6" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif text-sm sm:text-lg font-bold text-brand-text flex flex-wrap items-center gap-1.5 sm:gap-3">
                        <span className="truncate max-w-[120px] sm:max-w-[240px]">{learner.fullName}</span>
                        <span className="text-[8px] sm:text-[9px] bg-brand-brown/10 text-brand-brown px-1.5 sm:px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-brand-brown/20 shrink-0">
                          {getLearnerStatus(getLearnerBadges(learner).length).name}
                        </span>
                        {index === 0 && <span className="text-[8px] sm:text-[9px] bg-yellow-100 text-yellow-700 px-1.5 sm:px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-yellow-200 shrink-0">Champion</span>}
                      </div>
                      {learner.enrolledModules && learner.enrolledModules.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {learner.enrolledModules.slice(0, 2).map(mid => {
                            const mod = MODULES.find(m => m.id === mid) || MODULES.flatMap(m => 'subOptions' in m ? m.subOptions || [] : []).find(s => s.id === mid);
                            return (
                              <span key={mid} className="text-[8px] font-black uppercase tracking-tight text-brand-brown-light bg-brand-offwhite px-1.5 py-0.5 rounded border border-brand-border-light">
                                {mod?.label || mid}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-2">
                    <div className="flex items-center gap-2 sm:gap-3 bg-brand-beige/30 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-brand-border-light group-hover/card:bg-brand-white group-hover/card:shadow-md transition-all">
                      <div className="text-right">
                        <p className="text-base sm:text-2xl font-serif font-black text-brand-brown leading-none">{getScore(learner)}</p>
                        <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-brand-brown-light mt-1">{getCategoryLabel()}</p>
                      </div>
                      {(() => {
                        if (activeCategory === 'overall') return <Award className="w-4 h-4 sm:w-5 sm:h-5 text-brand-brown-light opacity-50" />;
                        const domain = APP_DOMAINS.find(d => d.type === activeCategory);
                        const Icon = { BookOpen, Mic, CheckCircle2 }[domain?.icon as any] as any || BookOpen;
                        return <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-brown-light opacity-50" />;
                      })()}
                    </div>
                    {expandedLearnerId === learner.id ? (
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-brand-brown-light" />
                    ) : (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-brand-brown-light" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedLearnerId === learner.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-brand-beige/20"
                    >
                      <div className="p-4 sm:px-6 sm:py-5 border-t border-brand-border-light flex flex-col items-center w-full">
                        {selectedDomain ? (
                          <div className="w-full max-w-2xl mx-auto">
                            <button 
                              onClick={() => setSelectedDomain(null)}
                              className="text-[10px] font-bold uppercase tracking-wider text-brand-brown-light hover:text-brand-brown mb-4 flex items-center gap-1 bg-brand-white px-3 py-1.5 rounded-lg border border-brand-border-light shadow-sm transition-all active:scale-95"
                            >
                              ← Back
                            </button>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-brown-light mb-3">
                              {APP_DOMAINS.find(d => d.type === selectedDomain)?.label}
                            </h4>
                            <ul className="space-y-2">
                              {getDomainItemsForLeaderboard(learner, selectedDomain).map((item, idx) => {
                                const title = typeof item === 'string' ? item : item['title'] || '';
                                return (
                                  <li key={idx} className="text-sm font-medium text-brand-text bg-brand-white p-3 sm:p-4 rounded-xl border border-brand-border shadow-sm flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-brand-brown/40 rounded-full shrink-0 mt-1.5"></span>
                                    <span>{title}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-brown-light mb-4 text-center w-full">Domain Highlights</h4>
                            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 w-full">
                              {APP_DOMAINS.map(domain => {
                                const count = getDomainValue(learner, domain.type);
                                if (count <= 0) return null;
                                const pts = getModulePoints(learner, domain.type);
                                
                                let emoji = '📖';
                                if (domain.type === 'book') emoji = '📖';
                                else if (domain.type === 'presentation') emoji = '🎤';
                                else if (domain.type === 'task') emoji = '✅';
                                else if (domain.type === 'tafsir') emoji = '🕌';
                                else if (domain.type === 'seerah') emoji = '📜';
                                else if (domain.type === 'research papers/article') emoji = '📑';
                                else if (domain.type === 'dowra') emoji = '🕋';
                                
                                const hasItems = getDomainItemsForLeaderboard(learner, domain.type).length > 0;
                                const isClickable = Boolean(learner.isProfilePublic && hasItems);

                                return (
                                  <div 
                                    key={domain.type} 
                                    onClick={() => {
                                      if (isClickable) {
                                        setSelectedDomain(domain.type);
                                      }
                                    }}
                                    className={`bg-brand-white p-3 rounded-2xl border border-brand-border shadow-sm flex flex-col items-center justify-center text-center aspect-square w-24 sm:w-28 transition-colors ${isClickable ? 'hover:bg-brand-brown/5 cursor-pointer hover:border-brand-brown/30 relative' : 'opacity-90'}`}
                                  >
                                    <span className="text-2xl sm:text-3xl mb-1.5">{emoji}</span>
                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-brand-brown-light leading-tight line-clamp-2 px-1">{domain.label}</span>
                                    <span className="text-base sm:text-lg font-serif font-black text-brand-text leading-none mt-2">{count}</span>
                                    <span className="text-[8.5px] sm:text-[9.5px] font-bold text-brand-brown/70 leading-none mt-1">{pts} points</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mt-12 bg-transparent">
        <div className="mb-6">
            <h2 className="font-serif text-2xl font-bold text-brand-text flex items-center gap-2">
               Status Progression Path
            </h2>
            <p className="text-sm font-medium text-brand-brown-light mt-1">
              Explore the 10 tiers of wisdom and their exclusive perks. Unlocked by collecting badges.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-brand-border shadow-sm">
            <table className="w-full text-left bg-brand-white overflow-hidden table-fixed sm:table-auto">
              <thead className="bg-brand-beige border-b border-brand-border">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-brand-brown w-[30%] sm:w-1/3">Status Tier</th>
                  <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-brand-brown w-[25%] sm:w-32 border-x border-brand-border text-center">
                    <span className="hidden sm:inline">Requirement</span>
                    <span className="sm:hidden">Req.</span>
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest text-brand-brown w-[45%] sm:auto">Unlocked Perks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border text-[11px] sm:text-sm">
                {STATUS_TIERS.map((tier, index) => {
                  const { rowBg, badgeBg, badgeText, bulletColor } = getLeaderboardRowStyle(tier.requiredBadges, index, STATUS_TIERS.length);
                  
                  return (
                    <tr 
                      key={tier.id} 
                      style={{ backgroundColor: rowBg }}
                      className="hover:brightness-95 transition-all"
                    >
                      <td className="px-3 sm:px-4 py-4 font-serif font-bold text-brand-text sm:whitespace-nowrap break-words">
                        {tier.name}
                      </td>
                      <td className="px-3 sm:px-4 py-4 text-center border-x border-brand-border/30">
                        <span 
                          style={{ backgroundColor: badgeBg, color: badgeText, borderColor: `${badgeText}20` }}
                          className="inline-flex items-center justify-center px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest border"
                        >
                          {tier.requiredBadges} Badge{tier.requiredBadges !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-4">
                        <ul className="space-y-1">
                          {tier.perks.map((perk, idx) => (
                             <li key={idx} className="flex items-start gap-1 sm:gap-2 text-brand-brown/85 font-medium text-[10px] sm:text-sm leading-snug">
                                <span 
                                  style={{ backgroundColor: bulletColor }}
                                  className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0 mt-1.5 sm:mt-2" 
                                />
                                <span>{perk}</span>
                             </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
