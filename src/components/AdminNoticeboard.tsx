import React, { useState, useEffect } from 'react';
import { Megaphone, Info, Flame, Bell, Calendar, Plus, Trash2, Loader2 } from 'lucide-react';
import { Notice, noticeService } from '../services/noticeService';

export function AdminNoticeboard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [iconType, setIconType] = useState('megaphone');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const data = await noticeService.getNotices();
      setNotices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title || !content) return;
    
    let iconBg = 'bg-blue-50';
    let iconBorder = 'border-blue-100';
    
    if (iconType === 'megaphone') { iconBg = 'bg-amber-50'; iconBorder = 'border-amber-100'; }
    else if (iconType === 'flame') { iconBg = 'bg-rose-50'; iconBorder = 'border-rose-100'; }
    else if (iconType === 'bell') { iconBg = 'bg-indigo-50'; iconBorder = 'border-indigo-100'; }
    else if (iconType === 'calendar') { iconBg = 'bg-emerald-50'; iconBorder = 'border-emerald-100'; }
    
    const d = new Date();
    const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

    await noticeService.addNotice({
      title,
      content,
      date: dateStr,
      iconBg,
      iconBorder,
      iconType,
      createdAt: Date.now()
    });

    setIsAdding(false);
    setTitle('');
    setContent('');
    setIconType('megaphone');
    fetchNotices();
  };

  const handleDelete = async (id: string) => {
    await noticeService.deleteNotice(id);
    setDeleteConfirmId(null);
    fetchNotices();
  };

  if (loading) {
     return <div className="p-8 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-brand-brown" /></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl font-bold text-brand-text">Manage Noticeboard</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-brand-brown text-white px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-brand-brown-dark transition-colors"
        >
          {isAdding ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Notice</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-brand-offwhite p-6 rounded-2xl border border-brand-border mb-8 space-y-4">
          <input
            type="text"
            placeholder="Notice Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown"
          />
          <textarea
            placeholder="Notice Content..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-brown"
          />
          <div>
            <label className="block text-xs font-bold uppercase text-brand-brown-light mb-2">Icon Type</label>
            <div className="flex gap-4">
              {['megaphone', 'info', 'flame', 'bell', 'calendar'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setIconType(t)}
                  className={`p-3 rounded-xl border ${iconType === t ? 'border-brand-brown bg-brand-brown/10' : 'border-brand-border bg-white'} transition-colors`}
                >
                  <span className="capitalize text-sm font-semibold text-brand-text">{t}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!title || !content}
            className="w-full py-3 bg-green-700 text-white rounded-xl font-bold tracking-wider hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            Post Notice
          </button>
        </div>
      )}

      <div className="space-y-4">
        {notices.map(notice => (
           <div key={notice.id} className="bg-white p-6 rounded-2xl border border-brand-border flex justify-between items-start gap-4">
             <div>
               <h3 className="font-serif text-lg font-bold">{notice.title}</h3>
               <span className="text-xs text-brand-brown-light">{notice.date}</span>
               <p className="text-sm mt-2">{notice.content}</p>
             </div>
             {deleteConfirmId === notice.id ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(notice.id)} className="text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                    Confirm
                  </button>
                  <button onClick={() => setDeleteConfirmId(null)} className="text-[10px] font-bold uppercase tracking-wider bg-brand-border text-brand-brown px-3 py-1.5 rounded-lg hover:bg-brand-border/80 transition-colors">
                    Cancel
                  </button>
                </div>
             ) : (
                <button onClick={() => setDeleteConfirmId(notice.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
             )}
           </div>
        ))}
        {notices.length === 0 && !isAdding && (
          <p className="text-center text-brand-brown-light p-8 border border-dashed rounded-2xl">No notices yet.</p>
        )}
      </div>
    </div>
  );
}
