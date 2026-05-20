import { useState, useMemo } from 'react';
import { Learner } from '../types';
import { Trophy, Medal, Award, BookOpen, Mic, CheckCircle2, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { MODULES, ISLAMIC_BOOKS, APP_DOMAINS } from '../constants';
import { EditRequest } from '../types';
import { getOverallPoints, getDomainValue } from '../utils';

type Category = 'overall' | EditRequest['type'];

export function Leaderboard({ learners }: { learners: Learner[] }) {
  const [activeCategory, setActiveCategory] = useState<Category>('overall');

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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-brown-light mt-2">Top performers across our community</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Category Tabs */}
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar">
            <div className="flex bg-brand-beige p-1 rounded-xl shadow-sm border border-brand-border min-w-max">
              <button 
                onClick={() => setActiveCategory('overall')}
                className={`flex-none px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeCategory === 'overall' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Overall
              </button>
              {APP_DOMAINS.map(domain => (
                <button 
                  key={domain.type}
                  onClick={() => setActiveCategory(domain.type)}
                  className={`flex-none px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeCategory === domain.type ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
                >
                  {domain.label}
                </button>
              ))}
            </div>
          </div>
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
                className="flex items-center justify-between p-6 hover:bg-brand-bg-alt transition-colors"
                title={
                  activeCategory === 'books' ? learner.booksCompleted.join('\n') :
                  activeCategory === 'presentations' ? learner.presentationsGiven.join('\n') :
                  activeCategory === 'overall' ? `Books: ${learner.booksCompleted.length}\nPresentations: ${learner.presentationsGiven.length}\nTasks: ${learner.tasksCompleted}` : undefined
                }
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold font-serif text-xl shadow-sm border-2 ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-700' : 
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-400' : 
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-800' : 
                    'bg-brand-beige text-brand-text border-brand-border'
                  }`}>
                    {index === 0 ? <Trophy className="w-6 h-6" /> : index === 1 ? <Medal className="w-6 h-6" /> : index === 2 ? <Award className="w-6 h-6" /> : index + 1}
                  </div>
                  <div>
                    <div className="font-serif text-lg font-bold text-brand-text flex items-center gap-3">
                      {learner.fullName}
                      {index === 0 && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-yellow-200">Champion</span>}
                    </div>
                    {learner.enrolledModules && learner.enrolledModules.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {learner.enrolledModules.slice(0, 2).map(mid => {
                          const mod = MODULES.find(m => m.id === mid) || MODULES.flatMap(m => 'subOptions' in m ? m.subOptions || [] : []).find(s => s.id === mid);
                          return (
                            <span key={mid} className="text-[8px] font-black uppercase tracking-tighter text-brand-brown-light bg-brand-offwhite px-1.5 py-0.5 rounded border border-brand-border-light">
                              {mod?.label || mid}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-brand-beige/30 px-5 py-3 rounded-2xl border border-brand-border-light group cursor-help transition-all hover:bg-brand-white hover:shadow-md">
                  <div className="text-right">
                    <p className="text-2xl font-serif font-black text-brand-brown leading-none">{getScore(learner)}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-brand-brown-light mt-1">{getCategoryLabel()}</p>
                  </div>
                  {(() => {
                    if (activeCategory === 'overall') return <Award className="w-5 h-5 text-brand-brown-light opacity-40 group-hover:opacity-100 transition-opacity" />;
                    const domain = APP_DOMAINS.find(d => d.type === activeCategory);
                    const Icon = { BookOpen, Mic, CheckCircle2 }[domain?.icon as any] as any || BookOpen;
                    return <Icon className="w-5 h-5 text-brand-brown-light opacity-40 group-hover:opacity-100 transition-opacity" />;
                  })()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
