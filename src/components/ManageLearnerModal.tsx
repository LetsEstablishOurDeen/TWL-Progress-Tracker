import { useState, useEffect, FormEvent } from 'react';
import { Learner } from '../types';
import { X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

export function ManageLearnerModal({
  learner,
  onClose,
  onSave
}: {
  learner: Learner | null,
  onClose: () => void,
  onSave: (data: Partial<Learner>) => void
}) {
  const [formData, setFormData] = useState({
    id: '',
    fullName: '',
    password: '',
    isApproved: true,
    booksCompleted: [''],
    presentationsGiven: [''],
    tasksCompleted: 0
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (learner) {
      setFormData({
        id: learner.id,
        fullName: learner.fullName,
        password: learner.password || '',
        isApproved: learner.isApproved,
        booksCompleted: learner.booksCompleted.length > 0 ? learner.booksCompleted : [''],
        presentationsGiven: learner.presentationsGiven.length > 0 ? learner.presentationsGiven : [''],
        tasksCompleted: learner.tasksCompleted
      });
    }
  }, [learner]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: formData.id,
      fullName: formData.fullName,
      password: formData.password,
      isApproved: formData.isApproved,
      booksCompleted: formData.booksCompleted.filter(b => b.trim() !== ''),
      presentationsGiven: formData.presentationsGiven.filter(p => p.trim() !== ''),
      tasksCompleted: Number(formData.tasksCompleted)
    });
  };

  const handleArrayChange = (field: 'booksCompleted' | 'presentationsGiven', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field: 'booksCompleted' | 'presentationsGiven') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (field: 'booksCompleted' | 'presentationsGiven', index: number) => {
    const newArray = [...formData[field]];
    newArray.splice(index, 1);
    setFormData({ ...formData, [field]: newArray.length > 0 ? newArray : [''] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-text/30 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-brand-white rounded-2xl shadow-2xl border border-brand-border w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-brand-border bg-brand-bg-header shrink-0">
          <h2 className="font-serif text-xl font-bold text-brand-text">
            {learner ? 'Edit Profile' : 'Enroll New Learner'}
          </h2>
          <button onClick={onClose} className="p-2 text-brand-brown-light hover:bg-brand-border-light rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="learner-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-3 py-2 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1">Phone Number (ID)</label>
                <input 
                  type="text" 
                  value={formData.id}
                  onChange={e => setFormData({...formData, id: e.target.value})}
                  className="w-full px-3 py-2 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown disabled:opacity-50"
                  required
                  disabled={!!learner}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown pr-10"
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
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">Approval Status</label>
                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={formData.isApproved}
                    onChange={e => setFormData({...formData, isApproved: e.target.checked})}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 bg-gray-200 rounded-full pr-1 flex items-center transition-colors ${formData.isApproved ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${formData.isApproved ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  <span className="ml-3 text-sm text-brand-text font-medium">{formData.isApproved ? 'Approved' : 'Pending Approval'}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Tasks Completed</label>
              <input 
                type="number" 
                min="0"
                value={formData.tasksCompleted}
                onChange={e => setFormData({...formData, tasksCompleted: parseInt(e.target.value) || 0})}
                className="w-32 px-3 py-2 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
              />
            </div>

            <div className="border-t border-brand-border-light pt-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-brand-brown-light">Completed Books</label>
                <button type="button" onClick={() => addArrayItem('booksCompleted')} className="text-xs flex items-center text-brand-brown bg-brand-beige px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider hover:bg-brand-border transition-colors">
                  <Plus className="w-3 h-3 mr-1 font-bold" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.booksCompleted.map((book, idx) => (
                  <div key={`book-${idx}`} className="flex space-x-2">
                    <input 
                      type="text" 
                      value={book}
                      onChange={e => handleArrayChange('booksCompleted', idx, e.target.value)}
                      placeholder="Book title"
                      className="flex-1 px-3 py-2 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                    />
                    <button type="button" onClick={() => removeArrayItem('booksCompleted', idx)} className="p-2 text-brand-brown-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-brand-border-light pt-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-brand-brown-light">Presentations</label>
                <button type="button" onClick={() => addArrayItem('presentationsGiven')} className="text-xs flex items-center text-brand-brown bg-brand-beige px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider hover:bg-brand-border transition-colors">
                  <Plus className="w-3 h-3 mr-1 font-bold" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.presentationsGiven.map((pres, idx) => (
                  <div key={`pres-${idx}`} className="flex space-x-2">
                    <input 
                      type="text" 
                      value={pres}
                      onChange={e => handleArrayChange('presentationsGiven', idx, e.target.value)}
                      placeholder="Presentation topic"
                      className="flex-1 px-3 py-2 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown"
                    />
                    <button type="button" onClick={() => removeArrayItem('presentationsGiven', idx)} className="p-2 text-brand-brown-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-brand-border bg-brand-bg-header flex justify-end space-x-3 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-brown-light border border-brand-border rounded-lg bg-brand-white shadow-sm hover:text-brand-brown transition-all">
            Cancel
          </button>
          <button type="submit" form="learner-form" className="px-5 py-2.5 bg-brand-brown text-brand-offwhite rounded-xl shadow-md font-bold text-xs uppercase tracking-wider hover:bg-brand-brown-dark transition-all">
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
