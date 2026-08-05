import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Calendar, Edit2, Clock, X } from 'lucide-react';
import { LoungeModule, moduleService } from '../services/moduleService';
import { formatDateDDMMYYYY } from '../utils';

export function AdminModules() {
  const [modules, setModules] = useState<LoungeModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingModule, setEditingModule] = useState<LoungeModule | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [collaboratorTag, setCollaboratorTag] = useState('');
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const [hasLoungeDiscountEnrollment, setHasLoungeDiscountEnrollment] = useState(false);
  const [loungeDiscountEnrollment, setLoungeDiscountEnrollment] = useState('');
  const [hasLoungeDiscountMonthly, setHasLoungeDiscountMonthly] = useState(false);
  const [loungeDiscountMonthly, setLoungeDiscountMonthly] = useState('');
  const [batch, setBatch] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [timeline, setTimeline] = useState('');
  const [sessions, setSessions] = useState('');
  const [duration, setDuration] = useState('');
  const [time, setTime] = useState('');
  const [enrollment, setEnrollment] = useState('');
  const [enrollmentFee, setEnrollmentFee] = useState('');
  const [fee, setFee] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [location, setLocation] = useState('Inside the Lounge');
  const [category, setCategory] = useState('tafsir');
  const [color, setColor] = useState('amber');
  const [status, setStatus] = useState<'ongoing' | 'upcoming' | 'past'>('ongoing');
  const [orientationDate, setOrientationDate] = useState('');
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [newSessionDate, setNewSessionDate] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const data = await moduleService.getModules();
      setModules(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInit = (mod: LoungeModule) => {
    setEditingModule(mod);
    setTitle(mod.title || '');
    setTag(mod.tag || '');
    setCollaboratorTag(mod.collaboratorTag || '');
    setIsEnrollmentOpen(mod.isEnrollmentOpen || false);
    setHasLoungeDiscountEnrollment(mod.hasLoungeDiscountEnrollment || false);
    setLoungeDiscountEnrollment(mod.loungeDiscountEnrollment ? String(mod.loungeDiscountEnrollment) : '');
    setHasLoungeDiscountMonthly(mod.hasLoungeDiscountMonthly || false);
    setLoungeDiscountMonthly(mod.loungeDiscountMonthly ? String(mod.loungeDiscountMonthly) : '');
    setBatch(mod.batch || '');
    setSynopsis(mod.synopsis || '');
    setTimeline(mod.timeline || '');
    setSessions(mod.sessions || '');
    setDuration(mod.duration || '');
    setTime(mod.time || '');
    setEnrollment(mod.enrollment || '');
    setEnrollmentFee(mod.enrollmentFee || '');
    setFee(mod.fee || '');
    setSpeaker(mod.speaker || '');
    setLocation(mod.location || 'Inside the Lounge');
    setCategory(mod.category || 'tafsir');
    setColor(mod.color || 'amber');
    setStatus(mod.status || 'ongoing');
    setOrientationDate(mod.orientationDate || '');
    setSessionDates(mod.sessionDates || []);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !batch || !speaker) return;

    // Sort session dates ascending before saving
    const sortedSessionDates = [...sessionDates].sort((a, b) => a.localeCompare(b));

    const data: Omit<LoungeModule, 'id'> = {
      title,
      tag,
      collaboratorTag,
      isEnrollmentOpen,
      hasLoungeDiscountEnrollment,
      loungeDiscountEnrollment: loungeDiscountEnrollment ? parseFloat(loungeDiscountEnrollment) : 0,
      hasLoungeDiscountMonthly,
      loungeDiscountMonthly: loungeDiscountMonthly ? parseFloat(loungeDiscountMonthly) : 0,
      batch,
      synopsis,
      timeline,
      sessions,
      duration,
      time,
      enrollment,
      enrollmentFee,
      fee,
      speaker,
      location,
      category,
      color,
      status,
      orientationDate: orientationDate || undefined,
      sessionDates: sortedSessionDates,
      createdAt: editingModule ? editingModule.createdAt : Date.now()
    };

    try {
      if (editingModule) {
        await moduleService.updateModule(editingModule.id, data);
      } else {
        await moduleService.addModule(data);
      }

      setIsAdding(false);
      setEditingModule(null);
      resetForm();
      fetchModules();
    } catch (err) {
      console.error("Failed to save module:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await moduleService.deleteModule(id);
      setDeleteConfirmId(null);
      fetchModules();
    } catch (err) {
      console.error("Failed to delete module:", err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTag('');
    setCollaboratorTag('');
    setIsEnrollmentOpen(false);
    setHasLoungeDiscountEnrollment(false);
    setLoungeDiscountEnrollment('');
    setHasLoungeDiscountMonthly(false);
    setLoungeDiscountMonthly('');
    setBatch('');
    setSynopsis('');
    setTimeline('');
    setSessions('');
    setDuration('');
    setTime('');
    setEnrollment('');
    setEnrollmentFee('');
    setFee('');
    setSpeaker('');
    setLocation('Inside the Lounge');
    setCategory('tafsir');
    setColor('amber');
    setStatus('ongoing');
    setOrientationDate('');
    setSessionDates([]);
    setNewSessionDate('');
  };

  const addSessionDate = () => {
    if (!newSessionDate) return;
    if (sessionDates.includes(newSessionDate)) {
      setNewSessionDate('');
      return;
    }
    setSessionDates([...sessionDates, newSessionDate]);
    setNewSessionDate('');
  };

  const removeSessionDate = (idx: number) => {
    setSessionDates(sessionDates.filter((_, i) => i !== idx));
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-brown animate-spin" />
        <p className="text-brand-brown-light italic font-medium">Loading Lounge Modules...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-brand-text">Lounge Modules</h2>
          <p className="text-sm text-brand-brown-light">Define ongoing, upcoming, and past modules, configure fees, timelines, and assign individual session dates.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-brown text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow hover:bg-brand-brown-light transition-colors active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Module
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-brand-bg-header border border-brand-border rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-brand-border">
            <h3 className="font-serif text-lg font-bold text-brand-text">
              {editingModule ? 'Edit Lounge Module' : 'Create New Lounge Module'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingModule(null);
                resetForm();
              }}
              className="text-brand-brown-light hover:text-brand-brown font-bold text-sm uppercase"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Module Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tafsir, Seerah"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Subtitle / Tagline</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. The Exegesis Of The Noble Quran"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Collaborator Tagline</label>
              <input
                type="text"
                value={collaboratorTag}
                onChange={(e) => setCollaboratorTag(e.target.value)}
                placeholder="e.g. A Collaboration With Mindful Muslims"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Enrollment Toggle</label>
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={isEnrollmentOpen}
                  onChange={(e) => setIsEnrollmentOpen(e.target.checked)}
                  className="w-5 h-5 accent-brand-brown"
                />
                <span className="text-sm text-brand-text">Enrollment is {isEnrollmentOpen ? 'Open' : 'Closed'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Lounge Discount (Enrollment)</label>
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={hasLoungeDiscountEnrollment}
                      onChange={(e) => setHasLoungeDiscountEnrollment(e.target.checked)}
                      className="w-5 h-5 accent-brand-brown"
                    />
                    <span className="text-sm text-brand-text">Enable Enrollment Discount</span>
                  </div>
                  {hasLoungeDiscountEnrollment && (
                    <input
                      type="number"
                      value={loungeDiscountEnrollment}
                      onChange={(e) => setLoungeDiscountEnrollment(e.target.value)}
                      placeholder="Discount Percentage (e.g. 20)"
                      className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Lounge Discount (Monthly)</label>
                <div className="flex flex-col gap-3 py-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={hasLoungeDiscountMonthly}
                      onChange={(e) => setHasLoungeDiscountMonthly(e.target.checked)}
                      className="w-5 h-5 accent-brand-brown"
                    />
                    <span className="text-sm text-brand-text">Enable Monthly Discount</span>
                  </div>
                  {hasLoungeDiscountMonthly && (
                    <input
                      type="number"
                      value={loungeDiscountMonthly}
                      onChange={(e) => setLoungeDiscountMonthly(e.target.value)}
                      placeholder="Discount Percentage (e.g. 20)"
                      className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Batch / Topic *</label>
              <input
                type="text"
                required
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="e.g. Surah Nisaa, Life in Makkah"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Synopsis / Description</label>
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="Brief introduction or overview of the module content and goals..."
                rows={3}
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Speaker / Instructor *</label>
              <input
                type="text"
                required
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                placeholder="e.g. Sana Amjad"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Inside the Lounge, Zoom"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Timeline Label</label>
              <input
                type="text"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="e.g. Orientation on June 14th"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Sessions Frequency</label>
              <input
                type="text"
                value={sessions}
                onChange={(e) => setSessions(e.target.value)}
                placeholder="e.g. Bi-weekly, Weekly"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Duration</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2 Months, 12 Sessions"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Session Timing</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. Night time, 8:00 PM"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Enrollment Status</label>
              <input
                type="text"
                value={enrollment}
                onChange={(e) => setEnrollment(e.target.value)}
                placeholder="e.g. Open, TBD, Closed"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">One-time Enrollment Fee</label>
              <input
                type="text"
                value={enrollmentFee}
                onChange={(e) => setEnrollmentFee(e.target.value)}
                placeholder="e.g. PKR 1000, N/A"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Monthly Fee</label>
              <input
                type="text"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="e.g. PKR 500/mo, Free"
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Category Key *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              >
                <option value="tafsir">Tafsir</option>
                <option value="seerah">Seerah</option>
                <option value="dowra">Dowra e Quran</option>
                <option value="hadith">Hadith</option>
                <option value="arabic">Arabic</option>
                <option value="articles">Articles</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Color Palette Theme</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              >
                <option value="amber">Amber/Orange (Tafsir)</option>
                <option value="green">Green (Seerah)</option>
                <option value="blue">Blue (Dowra)</option>
                <option value="purple">Purple</option>
                <option value="rose">Rose</option>
                <option value="sky">Sky Blue</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown"
              >
                <option value="ongoing">Ongoing</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>

            <div className="space-y-2 col-span-1">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Orientation Date</label>
              <input
                type="date"
                lang="en-GB"
                value={orientationDate}
                onChange={(e) => setOrientationDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown font-mono"
              />
            </div>

            {/* Individual Session Dates configuration */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">Assign Individual Sessions Dates</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  lang="en-GB"
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="flex-1 px-4 py-2 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-brown font-mono"
                />
                <button
                  type="button"
                  onClick={addSessionDate}
                  className="px-4 py-2 bg-brand-brown hover:bg-brand-brown-light text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                >
                  Add Date
                </button>
              </div>
            </div>
          </div>

          {/* Session dates list display */}
          {sessionDates.length > 0 && (
            <div className="space-y-2 border-t border-brand-border/40 pt-4">
              <span className="block text-xs font-black uppercase tracking-wider text-brand-brown-light">
                Assigned Session Dates ({sessionDates.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {[...sessionDates]
                  .sort((a, b) => a.localeCompare(b))
                  .map((date, idx) => (
                    <div
                      key={date}
                      className="flex items-center gap-1.5 bg-brand-beige border border-brand-border text-brand-brown px-3 py-1 rounded-full text-xs font-mono font-bold"
                    >
                      <span>S{idx + 1}: {formatDateDDMMYYYY(date)}</span>
                      <button
                        type="button"
                        onClick={() => removeSessionDate(idx)}
                        className="text-brand-brown-light hover:text-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-brand-border flex gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-brown text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow hover:bg-brand-brown-light active:scale-95 transition-all"
            >
              {editingModule ? 'Save Changes' : 'Create Module'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingModule(null);
                resetForm();
              }}
              className="px-6 py-2.5 bg-brand-white border border-brand-border text-brand-brown-light font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-brand-beige transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Grid of existing modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className={`bg-brand-white border border-brand-border rounded-2xl p-5 shadow-sm space-y-4 hover:shadow transition-shadow flex flex-col justify-between`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    mod.status === 'ongoing' ? 'bg-amber-100 border-amber-300 text-amber-800' :
                    mod.status === 'upcoming' ? 'bg-green-100 border-green-300 text-green-800' :
                    'bg-gray-100 border-gray-300 text-gray-800'
                  }`}>
                    {mod.status}
                  </span>
                  <span className="ml-2 inline-block px-2 py-0.5 rounded bg-brand-beige border border-brand-border text-[10px] text-brand-brown font-mono font-bold capitalize">
                    {mod.category}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditInit(mod)}
                    className="p-1.5 text-brand-brown-light hover:text-brand-brown hover:bg-brand-beige rounded-lg transition-colors"
                    title="Edit module"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(mod.id)}
                    className="p-1.5 text-brand-brown-light hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete module"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-serif text-lg font-bold text-brand-text leading-tight">{mod.title}</h4>
                <p className="text-xs text-brand-brown font-semibold italic mt-0.5">{mod.batch}</p>
                {mod.tag && <p className="text-xs text-brand-brown-light/80 mt-1 font-medium">{mod.tag}</p>}
              </div>

              {mod.synopsis && (
                <p className="text-xs text-brand-brown-light leading-relaxed font-serif italic line-clamp-3">
                  "{mod.synopsis}"
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-brand-text/95">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-brown-light" />
                  <span className="truncate" title={mod.timeline}>{mod.timeline || 'TBD'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-brown-light" />
                  <span className="truncate">{mod.time || 'TBD'}</span>
                </div>
                <div className="col-span-2 text-[11px] font-semibold text-brand-brown-light">
                  Instructor: <span className="text-brand-brown">{mod.speaker}</span>
                </div>
                {mod.orientationDate && (
                  <div className="col-span-2 text-[10px] font-mono text-brand-brown-light/80 bg-brand-beige/50 px-2 py-1 rounded">
                    Orientation: <span className="font-bold">{formatDateDDMMYYYY(mod.orientationDate)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-brand-border/40 pt-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-brown-light font-bold uppercase tracking-wide">Sessions Assigned</span>
                <span className="font-bold text-brand-brown font-mono bg-brand-beige px-2 py-0.5 rounded-full">
                  {mod.sessionDates?.length || 0}
                </span>
              </div>

              {deleteConfirmId === mod.id ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <p className="text-xs text-red-800 font-semibold text-center">Delete this module? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(mod.id)}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 py-1.5 bg-white border border-red-200 text-red-800 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {modules.length === 0 && (
          <div className="col-span-full bg-brand-bg-header border border-brand-border rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 text-brand-border mx-auto mb-3" />
            <h4 className="font-serif font-bold text-brand-text mb-1">No Modules Found</h4>
            <p className="text-xs text-brand-brown-light max-w-sm mx-auto">Click "Add Module" at the top to create your first Lounge Module and assign dates.</p>
          </div>
        )}
      </div>
    </div>
  );
}
