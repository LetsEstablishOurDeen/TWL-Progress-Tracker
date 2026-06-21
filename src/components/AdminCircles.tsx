import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Users, Clock, Tag, Edit } from 'lucide-react';
import { LoungeCircle, circleService } from '../services/circleService';
import { SUBJECTS } from '../constants';

export function AdminCircles({ pendingCircleItem }: { pendingCircleItem?: any }) {
  const [circles, setCircles] = useState<LoungeCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingCircle, setEditingCircle] = useState<LoungeCircle | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moderator, setModerator] = useState('');
  const [schedule, setSchedule] = useState('');
  const [category, setCategory] = useState('Book Reading');
  const [format, setFormat] = useState('Onsite');
  const [joinLink, setJoinLink] = useState('');
  const [duration, setDuration] = useState('Ongoing');
  const [methodology, setMethodology] = useState('Live Book Reading');
  const [bookName, setBookName] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [subject, setSubject] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [status, setStatus] = useState<'ongoing' | 'upcoming' | 'past'>('ongoing');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchCircles();
    if (pendingCircleItem) {
      setIsAdding(true);
      setTitle(`Reading: ${pendingCircleItem.name}`);
      if (pendingCircleItem.overview) {
        setDescription(pendingCircleItem.overview);
      }
      if (pendingCircleItem.author) {
        setBookAuthor(pendingCircleItem.author);
      }
      setBookName(pendingCircleItem.name);
      setJoinLink(pendingCircleItem.webViewLink);
      setCategory('Book Reading');
      if (pendingCircleItem.subject) {
        setSubject(pendingCircleItem.subject);
        if (!SUBJECTS.includes(pendingCircleItem.subject)) {
          setIsCustomSubject(true);
        }
      }
      setStatus('upcoming');
    }
  }, [pendingCircleItem]);

  const fetchCircles = async () => {
    try {
      const data = await circleService.getCircles();
      setCircles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInit = (circle: LoungeCircle) => {
    setEditingCircle(circle);
    setTitle(circle.title || '');
    setDescription(circle.description || '');
    setModerator(circle.moderator || '');
    setSchedule(circle.schedule || '');
    setCategory(circle.category || 'Book Reading');
    setFormat(circle.format || 'Onsite');
    setJoinLink(circle.joinLink || '');
    setDuration(circle.duration || 'Ongoing');
    setMethodology(circle.methodology || 'Live Book Reading');
    setBookName(circle.bookName || '');
    setBookAuthor(circle.bookAuthor || '');
    setStartDate(circle.startDate || '');
    setStatus(circle.status || 'ongoing');
    
    if (circle.subject) {
      if (SUBJECTS.includes(circle.subject)) {
        setSubject(circle.subject);
        setIsCustomSubject(false);
      } else {
        setSubject(circle.subject);
        setIsCustomSubject(true);
      }
    } else {
      setSubject('');
      setIsCustomSubject(false);
    }

    setIsAdding(true);
    // Smooth scroll to the form at the top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !moderator || !schedule) return;

    const data: Omit<LoungeCircle, 'id'> = {
      title,
      description,
      moderator,
      schedule,
      category,
      format,
      joinLink: joinLink.trim() || undefined,
      duration: duration.trim() || undefined,
      methodology: methodology.trim() || undefined,
      bookName: bookName.trim() || undefined,
      bookAuthor: bookAuthor.trim() || undefined,
      startDate: startDate.trim() || undefined,
      subject: subject.trim() || undefined,
      status: status,
      createdAt: editingCircle ? editingCircle.createdAt : Date.now()
    };

    if (editingCircle) {
      await circleService.updateCircle(editingCircle.id, data);
    } else {
      await circleService.addCircle(data);
    }

    setIsAdding(false);
    setEditingCircle(null);
    setTitle('');
    setDescription('');
    setModerator('');
    setSchedule('');
    setCategory('Book Reading');
    setFormat('Onsite');
    setJoinLink('');
    setDuration('Ongoing');
    setMethodology('Live Book Reading');
    setBookName('');
    setBookAuthor('');
    setStartDate('');
    setSubject('');
    setStatus('ongoing');
    setIsCustomSubject(false);
    fetchCircles();
  };

  const handleDelete = async (id: string) => {
    await circleService.deleteCircle(id);
    setDeleteConfirmId(null);
    fetchCircles();
  };

  const toggleAddingForm = () => {
    if (isAdding) {
      setIsAdding(false);
      setEditingCircle(null);
      setTitle('');
      setDescription('');
      setModerator('');
      setSchedule('');
      setCategory('Book Reading');
      setFormat('Onsite');
      setJoinLink('');
      setDuration('Ongoing');
      setMethodology('Live Book Reading');
      setBookName('');
      setBookAuthor('');
      setStartDate('');
      setSubject('');
      setStatus('ongoing');
      setIsCustomSubject(false);
    } else {
      setIsAdding(true);
    }
  };

  if (loading) {
     return <div className="p-8 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-brand-brown" /></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl font-bold text-brand-text">Manage Ongoing Lounge Circles</h2>
        <button
          onClick={toggleAddingForm}
          className="bg-brand-brown text-white px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-brand-brown-dark transition-colors"
        >
          {isAdding ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Ongoing Circle</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-brand-offwhite p-6 rounded-2xl border border-brand-border mb-8 space-y-4">
          <h3 className="font-serif text-lg font-bold text-brand-text mb-2">
            {editingCircle ? 'Edit Lounge Circle Details' : 'Add New Lounge Circle'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Circle Title</label>
              <input
                type="text"
                placeholder="e.g. Classical Arabic Grammar Lab"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Moderator / Host</label>
              <input
                type="text"
                placeholder="e.g. Sister Zara"
                required
                value={moderator}
                onChange={e => setModerator(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Description</label>
            <textarea
              placeholder="Provide a description of what is read, discussed, or practiced inside this study circle..."
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Timings / Schedule</label>
              <input
                type="text"
                placeholder="e.g. Fridays after Maghrib"
                required
                value={schedule}
                onChange={e => setSchedule(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              >
                <option value="Book Reading">Book Reading</option>
                <option value="Language Practice">Language Practice</option>
                <option value="Memorization">Memorization</option>
                <option value="Peer Discussion">Peer Discussion</option>
                <option value="Reflective Discourse">Reflective Discourse</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              >
                <option value="Onsite">Onsite</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid (Onsite & Online)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              >
                <option value="ongoing">Ongoing</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Join Link (Optional)</label>
              <input
                type="url"
                placeholder="e.g. WhatsApp group, Google Meet, or Discord link"
                value={joinLink}
                onChange={e => setJoinLink(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Target Date (Optional)</label>
              <input
                type="date"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Methodology (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Live reading, discussion"
                value={methodology}
                onChange={e => setMethodology(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Starting Date (Optional)</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Book Name / Text Covered (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Ar-Raheeq Al-Makhtum"
                value={bookName}
                onChange={e => setBookName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Book Author / Writer (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Safiur Rahman Mubarakpuri"
                value={bookAuthor}
                onChange={e => setBookAuthor(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-brand-brown-light mb-1.5">Book Subject / Focus (Optional)</label>
              <select
                value={isCustomSubject ? 'Other' : subject}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    setIsCustomSubject(true);
                    setSubject('');
                  } else {
                    setIsCustomSubject(false);
                    setSubject(val);
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
              >
                <option value="">Select a subject</option>
                {SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
                <option value="Other">Other</option>
              </select>
              {isCustomSubject && (
                <input
                  type="text"
                  placeholder="Specify custom subject"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full mt-2 px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown text-sm"
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-green-700 text-white rounded-xl font-bold tracking-wider hover:bg-green-800 transition-colors"
          >
            {editingCircle ? 'Save Circle Changes' : 'Create Ongoing Circle'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {circles.map(circle => (
           <div key={circle.id} className="bg-white p-6 rounded-2xl border border-brand-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div className="space-y-2 flex-1">
               <div className="flex items-center gap-2 flex-wrap">
                 <h3 className="font-serif text-lg font-bold text-brand-text">{circle.title}</h3>
                 <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-beige text-brand-brown px-2 py-0.5 rounded border border-brand-border/40">
                   {circle.category}
                 </span>
                 <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                   {circle.format || 'Onsite'}
                 </span>
                 {circle.joinLink && (
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                     With Link
                   </span>
                 )}
               </div>
               <p className="text-xs text-brand-brown-light max-w-2xl whitespace-pre-wrap">{circle.description}</p>
               <div className="flex flex-wrap gap-4 text-xs font-semibold text-brand-brown-light font-sans">
                 <span className="flex items-center gap-1">
                   <Users className="w-3.5 h-3.5" /> Host: {circle.moderator}
                 </span>
                 {circle.bookName && (
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                     Book: {circle.bookName}{circle.bookAuthor ? ` by ${circle.bookAuthor}` : ''}
                   </span>
                 )}
                 {circle.subject && (
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                     Subject: {circle.subject}
                   </span>
                 )}
                 <span className="flex items-center gap-1">
                   <Clock className="w-3.5 h-3.5" /> {circle.schedule}
                 </span>
                 {circle.duration && (
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                     Duration: {circle.duration}
                   </span>
                 )}
                 {circle.startDate && (
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-200">
                     Starts: {circle.startDate}
                   </span>
                 )}
                 {circle.methodology && (
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                     Method: {circle.methodology}
                   </span>
                 )}
                 {circle.joinLink && (
                   <span className="flex items-center gap-1 text-teal-700 max-w-xs truncate">
                     Link: <a href={circle.joinLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-teal-900 truncate">{circle.joinLink}</a>
                   </span>
                 )}
               </div>
             </div>
             
             <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
               <button 
                 onClick={() => handleEditInit(circle)} 
                 className="text-brand-brown hover:bg-brand-offwhite p-2 rounded-lg transition-colors border border-brand-border/40"
                 title="Edit Circle"
               >
                 <Edit className="w-4 h-4" />
               </button>

               {deleteConfirmId === circle.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleDelete(circle.id)} className="text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                      Confirm
                    </button>
                    <button onClick={() => setDeleteConfirmId(null)} className="text-[10px] font-bold uppercase tracking-wider bg-brand-border text-brand-brown px-3 py-1.5 rounded-lg hover:bg-brand-border/80 transition-colors">
                      Cancel
                    </button>
                  </div>
               ) : (
                  <button onClick={() => setDeleteConfirmId(circle.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0" title="Delete Circle">
                    <Trash2 className="w-4 h-4" />
                  </button>
               )}
             </div>
           </div>
        ))}
        {circles.length === 0 && !isAdding && (
          <p className="text-center text-brand-brown-light p-8 border border-dashed rounded-2xl">No ongoing circles configured yet.</p>
        )}
      </div>
    </div>
  );
}
