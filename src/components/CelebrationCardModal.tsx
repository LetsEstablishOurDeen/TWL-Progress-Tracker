import React, { useState } from 'react';
import { 
  X, Share2, Sparkles, Trophy, Award, CheckCircle2, 
  RefreshCw, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDateDDMMYYYY } from '../utils';
import { noticeService } from '../services/noticeService';

export interface CelebrationCardData {
  learnerName: string;
  focusTitle: string;
  domain?: string;
  type?: 'book' | 'audio' | 'project' | 'task' | string;
  pointsEarned?: number;
  completedDate?: string;
  targetDate?: string;
  totalPages?: number;
  summaryNotes?: string;
  adminComment?: string;
  badgeEarned?: string;
}

interface CelebrationCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: CelebrationCardData;
  isBetaAdminPreview?: boolean;
}

const defaultCardData: CelebrationCardData = {
  learnerName: 'Tariq Ibn Ziyad',
  focusTitle: 'Ar-Raheeq Al-Makhtum (The Sealed Nectar)',
  domain: 'Islamic History',
  type: 'book',
  pointsEarned: 100,
  completedDate: new Date().toISOString(),
  targetDate: '2026-08-01',
  totalPages: 385,
  summaryNotes: 'Completed the entire detailed account of the Treaty of Hudaybiyyah and Conquest of Makkah. Deeply inspiring analysis of patience and strategic diplomacy.',
  adminComment: 'Outstanding perseverance and thorough reflection notes! Keep rising!',
  badgeEarned: 'Master Reader'
};

export const CelebrationCardModal: React.FC<CelebrationCardModalProps> = ({
  isOpen,
  onClose,
  data = defaultCardData,
  isBetaAdminPreview = false
}) => {
  const [isPostingToLounge, setIsPostingToLounge] = useState(false);
  const [postedSuccess, setPostedSuccess] = useState(false);

  // Editable fields for Beta Admin testing mode
  const [editableData, setEditableData] = useState<CelebrationCardData>({
    ...defaultCardData,
    ...data
  });

  const card = isBetaAdminPreview ? editableData : { ...defaultCardData, ...data };

  // Post announcement to Lounge Noticeboard
  const handleShareToLounge = async () => {
    try {
      setIsPostingToLounge(true);
      await noticeService.addNotice({
        title: `🎉 Milestone Celebration: ${card.learnerName} completed ${card.focusTitle}`,
        content: `Congratulations to ${card.learnerName} for successfully completing their focus "${card.focusTitle}" (${card.domain || 'General'}) and earning +${card.pointsEarned || 100} Wisdom Points!\n\nReflection Note: "${card.summaryNotes || 'Verified completion by Mentor'}"`,
        date: formatDateDDMMYYYY(new Date()),
        iconBg: 'bg-amber-100 text-amber-800',
        iconBorder: 'border-amber-300',
        iconType: 'award',
        createdAt: Date.now()
      });
      setPostedSuccess(true);
      setTimeout(() => setPostedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to post celebration to lounge:', err);
    } finally {
      setIsPostingToLounge(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-amber-50/95 border border-amber-200/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-stone-800 space-y-6 my-8"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-amber-700 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold font-sans text-amber-950 flex items-center gap-2">
                  Learner Celebration Card
                  {isBetaAdminPreview && (
                    <span className="px-2 py-0.5 bg-amber-200/80 border border-amber-300 text-amber-900 text-[10px] font-mono font-black uppercase rounded-md">
                      Beta Mode
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-600">
                  Verified milestone achievement card for study circles and lounge announcements
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-amber-200/50 text-stone-500 hover:text-stone-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Editable Controls for Beta Admin Preview */}
          {isBetaAdminPreview && (
            <div className="p-4 bg-white/80 border border-amber-200 rounded-xl space-y-3 text-xs shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-700" /> Beta Customizer (Test Different Content)
                </span>
                <button
                  type="button"
                  onClick={() => setEditableData(defaultCardData)}
                  className="text-[10px] text-amber-700 font-semibold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Sample Data
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">Learner Name</label>
                  <input
                    type="text"
                    value={editableData.learnerName}
                    onChange={(e) => setEditableData({ ...editableData, learnerName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">Focus Title</label>
                  <input
                    type="text"
                    value={editableData.focusTitle}
                    onChange={(e) => setEditableData({ ...editableData, focusTitle: e.target.value })}
                    className="w-full px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">Domain / Subject</label>
                  <input
                    type="text"
                    value={editableData.domain}
                    onChange={(e) => setEditableData({ ...editableData, domain: e.target.value })}
                    className="w-full px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">Wisdom Points Earned</label>
                  <input
                    type="number"
                    value={editableData.pointsEarned}
                    onChange={(e) => setEditableData({ ...editableData, pointsEarned: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-600 mb-1">Learner Reflection / Summary</label>
                <input
                  type="text"
                  value={editableData.summaryNotes}
                  onChange={(e) => setEditableData({ ...editableData, summaryNotes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          )}

          {/* LIGHT THEME CELEBRATION CARD */}
          <div className="flex justify-center">
            <div 
              className="w-full max-w-md bg-gradient-to-b from-white via-amber-50/50 to-orange-50/60 border-2 border-amber-300 p-6 rounded-2xl shadow-xl space-y-5 text-stone-800 relative overflow-hidden"
              style={{
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 15px 35px rgba(217, 119, 6, 0.12), 0 3px 10px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Warm Light Ambient Glows */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-200/40 rounded-full blur-2xl pointer-events-none" />

              {/* Top Banner & Seal */}
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white font-bold shadow-md">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-sans font-black tracking-widest text-amber-800 uppercase block">
                      OFFICIAL VERIFIED MILESTONE
                    </span>
                    <span className="text-xs font-sans text-stone-500 font-medium">
                      The Wisdom Lounge
                    </span>
                  </div>
                </div>

                <div className="px-2.5 py-1 bg-amber-100/80 border border-amber-300 rounded-lg text-right">
                  <span className="text-[9px] font-mono font-bold text-amber-900 block">
                    {formatDateDDMMYYYY(card.completedDate || new Date().toISOString())}
                  </span>
                  <span className="text-[8px] font-sans uppercase font-extrabold text-amber-700 tracking-wider">
                    VERIFIED
                  </span>
                </div>
              </div>

              {/* Learner Info */}
              <div className="flex items-center gap-3.5 py-1">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-b from-amber-100 to-amber-200 border border-amber-300 text-amber-900 text-lg font-sans font-black shadow-inner">
                  {card.learnerName?.charAt(0) || 'L'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-stone-900 font-sans tracking-wide truncate">
                    {card.learnerName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-sans text-amber-800 mt-0.5">
                    <span className="px-2 py-0.5 bg-amber-100 rounded-md border border-amber-300 font-semibold text-[11px] text-amber-900">
                      {card.domain || 'Islamic Studies'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Focus Completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Focus Details Box */}
              <div className="bg-white/90 border border-amber-200/90 p-4 rounded-xl space-y-3 relative shadow-sm">
                <div className="space-y-1">
                  <span className="text-[9px] font-sans font-bold text-amber-800 uppercase tracking-wider block">
                    Focus Title
                  </span>
                  <p className="text-base font-bold text-stone-900 font-sans leading-snug">
                    "{card.focusTitle}"
                  </p>
                </div>

                {card.summaryNotes && (
                  <div className="pt-2 border-t border-amber-100">
                    <span className="text-[9px] font-sans font-bold text-stone-500 uppercase tracking-wider block mb-0.5">
                      Learner Reflection
                    </span>
                    <p className="text-xs text-stone-700 italic font-sans leading-relaxed">
                      "{card.summaryNotes}"
                    </p>
                  </div>
                )}

                {card.totalPages && card.totalPages > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-sans text-stone-600 pt-1 border-t border-amber-100">
                    <span>Volume Completed:</span>
                    <span className="font-bold text-amber-900 font-mono">{card.totalPages} Total Pages</span>
                  </div>
                )}
              </div>

              {/* Wisdom Points & Seal */}
              <div className="flex items-center justify-between bg-gradient-to-r from-amber-100/80 via-amber-50 to-amber-100/80 border border-amber-300 p-3 rounded-xl">
                <div className="flex items-center gap-2 font-sans">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                      Wisdom Points Awarded
                    </span>
                    <span className="text-base font-black text-amber-900 font-mono">
                      +{card.pointsEarned || 100} Points
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-200/80 border border-amber-300 rounded-lg text-[10px] font-sans font-bold text-amber-900 uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Level Up
                </div>
              </div>

              {/* Stamp Watermark Footer */}
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-[9px] font-sans text-stone-500">
                <span>Verified by Platform Admin</span>
                <span className="font-mono uppercase tracking-widest text-amber-800 font-bold">
                  Lounge Verified Milestone
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-200/80">
            <button
              type="button"
              disabled={isPostingToLounge || postedSuccess}
              onClick={handleShareToLounge}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              {isPostingToLounge ? 'Posting...' : postedSuccess ? '✓ Shared to Lounge Noticeboard!' : 'Post Card to Lounge'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
