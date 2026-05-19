import { useState } from 'react';
import { Learner } from '../types';
import { Trophy, Medal, Award } from 'lucide-react';
import { motion } from 'motion/react';

type Category = 'overall' | 'books' | 'presentations' | 'tasks';

export function Leaderboard({ learners }: { learners: Learner[] }) {
  const [activeCategory, setActiveCategory] = useState<Category>('overall');

  const getMagnitudeScore = (learner: Learner) => {
    // Magnitude ratio based on weights assigned to each contribution type
    return (learner.booksCompleted.length * 5) + (learner.presentationsGiven.length * 10) + learner.tasksCompleted;
  };

  const getSortedLearners = () => {
    return [...learners].sort((a, b) => {
      if (activeCategory === 'overall') return getMagnitudeScore(b) - getMagnitudeScore(a);
      if (activeCategory === 'books') return b.booksCompleted.length - a.booksCompleted.length;
      if (activeCategory === 'presentations') return b.presentationsGiven.length - a.presentationsGiven.length;
      return b.tasksCompleted - a.tasksCompleted;
    }).slice(0, 10); // Show top 10
  };

  const sortedLearners = getSortedLearners();

  const getScore = (learner: Learner) => {
    if (activeCategory === 'overall') return getMagnitudeScore(learner);
    if (activeCategory === 'books') return learner.booksCompleted.length;
    if (activeCategory === 'presentations') return learner.presentationsGiven.length;
    return learner.tasksCompleted;
  };

  const getCategoryLabel = () => {
    if (activeCategory === 'overall') return 'Points';
    if (activeCategory === 'books') return 'Books Read';
    if (activeCategory === 'presentations') return 'Presentations';
    return 'Tasks Finished';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-brand-text flex items-center gap-3">
            <Trophy className="text-yellow-500 w-8 h-8" />
            Leaderboard
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-brown-light mt-2">Top performers in The Wisdom Lounge</p>
        </div>
        
        <div className="flex bg-brand-beige p-1 rounded-xl shadow-sm border border-brand-border">
          <button 
            onClick={() => setActiveCategory('overall')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeCategory === 'overall' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
          >
            Overall
          </button>
          <button 
            onClick={() => setActiveCategory('books')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeCategory === 'books' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
          >
            Books
          </button>
          <button 
            onClick={() => setActiveCategory('presentations')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeCategory === 'presentations' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
          >
            Presentations
          </button>
          <button 
            onClick={() => setActiveCategory('tasks')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeCategory === 'tasks' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
          >
            Tasks
          </button>
        </div>
      </div>

      <div className="bg-brand-white rounded-2xl shadow-sm border border-brand-border overflow-hidden">
        {sortedLearners.length === 0 ? (
          <div className="p-12 text-center text-brand-brown-light italic">
            No active learners in this category yet.
          </div>
        ) : (
          <div className="divide-y divide-brand-border-light">
            {sortedLearners.map((learner, index) => (
              <motion.div 
                key={learner.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 hover:bg-brand-bg-alt transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-serif text-lg shadow-sm border ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-700' : 
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white border-slate-600' : 
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-white border-orange-800' : 
                    'bg-brand-beige text-brand-text border-brand-border'
                  }`}>
                    {index === 0 ? <Trophy className="w-5 h-5" /> : index === 1 ? <Medal className="w-5 h-5" /> : index === 2 ? <Award className="w-5 h-5" /> : index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-brand-text flex items-center gap-2">
                      {learner.fullName}
                      {index === 0 && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-yellow-200">Champion</span>}
                    </div>
                    <div className="text-xs text-brand-brown-light font-mono opacity-60">{learner.id}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xl font-bold text-brand-brown">{getScore(learner)}</span>
                  <span className="text-xs font-bold uppercase text-brand-brown-light">{getCategoryLabel()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
