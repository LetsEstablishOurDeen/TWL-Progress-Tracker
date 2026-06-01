import { useState, useEffect, FormEvent } from 'react';
import { Learner } from '../types';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { APP_DOMAINS, ISLAMIC_BOOKS } from '../constants';

interface ManageLearnerModalProps {
  learner: Learner | null;
  onClose: () => void;
  onSave: (data: Partial<Learner> | Omit<Learner, 'joinedAt'>) => void;
}

export function ManageLearnerModal({ learner, onClose, onSave }: ManageLearnerModalProps) {
  const [fullName, setFullName] = useState(learner?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(learner?.id || '');
  const [password, setPassword] = useState(learner?.password || '');
  const [isApproved, setIsApproved] = useState(learner?.isApproved ?? true);
  
  const [booksCompleted, setBooksCompleted] = useState<string[]>(learner?.booksCompleted || []);
  const [presentationsGiven, setPresentationsGiven] = useState<string[]>(learner?.presentationsGiven || []);
  const [tasksCompleted, setTasksCompleted] = useState(learner?.tasksCompleted || 0);

  const [completedTafsirModule, setCompletedTafsirModule] = useState(learner?.completedTafsirModule || false);
  const [completedSeerahModule, setCompletedSeerahModule] = useState(learner?.completedSeerahModule || false);
  const [completedDawraEQuran, setCompletedDawraEQuran] = useState(learner?.completedDawraEQuran || false);
  
  const [newBook, setNewBook] = useState('');
  const [newPresentation, setNewPresentation] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = {
      fullName,
      id: phoneNumber,
      password,
      isApproved,
      booksCompleted,
      presentationsGiven,
      tasksCompleted,
      completedTafsirModule,
      completedSeerahModule,
      completedDawraEQuran,
      ...(learner ? {} : { joinedAt: new Date().toISOString() })
    };
    onSave(data);
  };

  const addField = (list: string[], setList: (l: string[]) => void, value: string, setValue: (v: string) => void) => {
    if (!value.trim()) return;
    setList([...list, value.trim()]);
    setValue('');
  };

  const removeField = (list: string[], setList: (l: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-brown/40 backdrop-blur-sm">
      <div className="bg-brand-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-brand-border overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-brand-beige border-b border-brand-border flex items-center justify-between shrink-0">
          <h3 className="font-serif text-xl font-bold text-brand-text">
            {learner ? 'Edit Learner Profile' : 'Enroll New Learner'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-brand-border rounded-full transition-colors">
            <X className="w-5 h-5 text-brand-brown" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1">Wisdom Code</label>
              <input
                type="text"
                required
                disabled={!!learner}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown disabled:opacity-50 text-brand-text font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1">Password</label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1">Status</label>
              <select
                value={isApproved ? 'true' : 'false'}
                onChange={(e) => setIsApproved(e.target.value === 'true')}
                className="w-full px-4 py-2 bg-brand-offwhite border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown text-brand-text font-medium"
              >
                <option value="true">Authorized</option>
                <option value="false">Pending Approval</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-brand-border-light">
            <h4 className="text-sm font-bold uppercase tracking-wider text-brand-brown">Core Progress</h4>
            
            {/* Books */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light">Books Completed</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="islamic-books"
                  value={newBook}
                  onChange={(e) => setNewBook(e.target.value)}
                  placeholder="Enter book title..."
                  className="flex-1 px-4 py-2 bg-brand-offwhite border border-brand-border rounded-xl text-sm"
                />
                <datalist id="islamic-books">
                  {ISLAMIC_BOOKS.map(b => <option key={b} value={b} />)}
                </datalist>
                <button
                  type="button"
                  onClick={() => addField(booksCompleted, setBooksCompleted, newBook, setNewBook)}
                  className="p-2 bg-brand-beige text-brand-brown rounded-xl hover:bg-brand-border transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {booksCompleted.map((book, i) => (
                  <span key={i} className="flex items-center gap-2 bg-brand-bg-alt px-3 py-1.5 rounded-lg border border-brand-border-light text-xs font-medium text-brand-brown">
                    {book}
                    <button type="button" onClick={() => removeField(booksCompleted, setBooksCompleted, i)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Presentations */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light">Presentations Given</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPresentation}
                  onChange={(e) => setNewPresentation(e.target.value)}
                  placeholder="Enter presentation topic..."
                  className="flex-1 px-4 py-2 bg-brand-offwhite border border-brand-border rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => addField(presentationsGiven, setPresentationsGiven, newPresentation, setNewPresentation)}
                  className="p-2 bg-brand-beige text-brand-brown rounded-xl hover:bg-brand-border transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {presentationsGiven.map((p, i) => (
                  <span key={i} className="flex items-center gap-2 bg-brand-bg-alt px-3 py-1.5 rounded-lg border border-brand-border-light text-xs font-medium text-brand-brown">
                    {p}
                    <button type="button" onClick={() => removeField(presentationsGiven, setPresentationsGiven, i)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-brown-light mb-1">Total Tasks Completed</label>
              <input
                type="number"
                min="0"
                value={tasksCompleted}
                onChange={(e) => setTasksCompleted(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-brand-offwhite border border-brand-border rounded-xl text-sm"
              />
            </div>

            {/* Special Modules */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-brown mt-6 mb-4">Special Modules</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:bg-brand-offwhite transition-colors bg-brand-white">
                  <input
                    type="checkbox"
                    checked={completedTafsirModule}
                    onChange={(e) => setCompletedTafsirModule(e.target.checked)}
                    className="w-4 h-4 text-brand-brown border-brand-border-light rounded focus:ring-brand-brown"
                  />
                  <span className="text-sm font-bold text-brand-text">Tafsir Module Completed</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:bg-brand-offwhite transition-colors bg-brand-white">
                  <input
                    type="checkbox"
                    checked={completedSeerahModule}
                    onChange={(e) => setCompletedSeerahModule(e.target.checked)}
                    className="w-4 h-4 text-brand-brown border-brand-border-light rounded focus:ring-brand-brown"
                  />
                  <span className="text-sm font-bold text-brand-text">Seerah Module Completed</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:bg-brand-offwhite transition-colors bg-brand-white md:col-span-2">
                  <input
                    type="checkbox"
                    checked={completedDawraEQuran}
                    onChange={(e) => setCompletedDawraEQuran(e.target.checked)}
                    className="w-4 h-4 text-brand-brown border-brand-border-light rounded focus:ring-brand-brown"
                  />
                  <span className="text-sm font-bold text-brand-text">Dowra e Quran Completed (Highest Rank)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-brand-border rounded-xl text-xs font-bold uppercase tracking-widest text-brand-brown hover:bg-brand-offwhite active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 px-6 py-3 bg-brand-brown text-brand-offwhite rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {learner ? 'Save Changes' : 'Enroll Learner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
