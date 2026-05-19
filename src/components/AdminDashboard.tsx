import { useState, useMemo, ReactNode, useEffect } from 'react';
import { Learner, EditRequest } from '../types';
import { Plus, Edit2, Trash2, Search, CheckCircle2, BarChart3, Users as UsersIcon, BookOpen, Mic, Bell, Check, X } from 'lucide-react';
import { ManageLearnerModal } from './ManageLearnerModal';
import { requestService } from '../services/requestService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

export function AdminDashboard({ 
  learners, 
  onAdd, 
  onApprove,
  onRemove, 
  onUpdate 
}: { 
  learners: Learner[], 
  onAdd: (l: Omit<Learner, 'joinedAt'>) => void,
  onApprove: (id: string) => void,
  onRemove: (id: string) => void,
  onUpdate: (id: string, l: Partial<Learner>) => void
}) {
  const pendingCount = learners.filter(l => !l.isApproved).length;
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reports' | 'updates'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<EditRequest[]>([]);

  useEffect(() => {
    const unsubscribe = requestService.subscribeToRequests((allRequests) => {
      setRequests(allRequests.filter(r => r.status === 'pending'));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (pendingCount > 0 && activeTab === 'all') {
      setActiveTab('pending');
    } else if (requests.length > 0 && activeTab === 'all') {
      setActiveTab('updates');
    }
  }, [pendingCount, requests.length]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [learnerToDelete, setLearnerToDelete] = useState<string | null>(null);

  const filteredLearners = learners.filter(l => {
    const matchesSearch = l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || l.id.includes(searchTerm);
    const matchesTab = activeTab === 'all' ? true : activeTab === 'pending' ? !l.isApproved : true;
    return matchesSearch && matchesTab;
  });

  const handleApproveRequest = async (request: EditRequest) => {
    const learner = learners.find(l => l.id === request.learnerId);
    if (!learner) return;

    let updates: Partial<Learner> = {};

    if (request.type === 'book') {
      updates = { 
        booksCompleted: [...learner.booksCompleted, `${request.details.title} (${request.details.duration})`] 
      };
    } else if (request.type === 'presentation') {
      updates = { 
        presentationsGiven: [...learner.presentationsGiven, `${request.details.title} (${request.details.completedAt})`] 
      };
    } else if (request.type === 'task') {
      updates = { 
        tasksCompleted: (learner.tasksCompleted || 0) + (request.details.count || 0) 
      };
    }

    try {
      await onUpdate(learner.id, updates);
      await requestService.updateRequestStatus(request.id, 'approved');
      // Optionally delete or keep history. For now, let's just keep as approved.
    } catch (err) {
      console.error("Failed to approve request:", err);
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await requestService.updateRequestStatus(id, 'rejected');
    } catch (err) {
      console.error("Failed to reject request:", err);
    }
  };

  const reportingData = useMemo(() => {
    const totalBooks = learners.reduce((acc, l) => acc + l.booksCompleted.length, 0);
    const totalPresentations = learners.reduce((acc, l) => acc + l.presentationsGiven.length, 0);
    const totalTasks = learners.reduce((acc, l) => acc + l.tasksCompleted, 0);

    const contribData = [
      { name: 'Books', value: totalBooks, color: '#5A4633' },
      { name: 'Presentations', value: totalPresentations, color: '#8C7864' },
      { name: 'Tasks', value: totalTasks, color: '#A69280' }
    ];

    const topLearners = [...learners]
      .map(l => ({
        name: l.fullName,
        points: (l.booksCompleted.length * 5) + (l.presentationsGiven.length * 10) + l.tasksCompleted
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    return { contribData, topLearners, totalBooks, totalPresentations, totalTasks };
  }, [learners]);

  const handleEdit = (learner: Learner) => {
    setEditingLearner(learner);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingLearner(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-text">Admin Center</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-brown-light mt-1">
            Community Management ({learners.length} learners)
          </p>
        </div>
        <button 
          onClick={handleAddNew}
          className="bg-brand-brown text-brand-offwhite px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg hover:shadow-xl hover:bg-brand-brown-dark transition-all flex items-center space-x-2 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Enroll New Learner</span>
        </button>
      </div>

      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 animate-pulse border border-red-200 shadow-inner">
              <UsersIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-red-950 text-lg leading-tight mb-0.5">New Registrations Pending</h4>
              <p className="text-red-700/80 text-sm font-medium">There are {pendingCount} learners waiting for your approval.</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('pending')}
            className="whitespace-nowrap bg-red-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md hover:bg-red-700 hover:shadow-lg active:scale-95 transition-all"
          >
            Review Requests Now
          </button>
        </div>
      )}

      <div className="bg-brand-white rounded-2xl shadow-sm border border-brand-border overflow-hidden flex flex-col">
        <div className="p-4 border-b border-brand-border bg-brand-bg-header flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex bg-brand-beige p-1 rounded-xl border border-brand-border h-10">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${activeTab === 'all' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                All Learners
              </button>
              <button 
                onClick={() => setActiveTab('pending')}
                className={`px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'pending' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Pending
                {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={`px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'reports' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Reports
              </button>
              <button 
                onClick={() => setActiveTab('updates')}
                className={`px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'updates' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Updates
                {requests.length > 0 && <span className="bg-brand-brown text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{requests.length}</span>}
              </button>
            </div>
            {activeTab !== 'reports' && activeTab !== 'updates' && (
              <div className="relative w-full sm:max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-brown-light w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search by ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-brand-offwhite border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm"
                />
              </div>
            )}
        </div>

        {activeTab === 'reports' ? (
          <div className="p-6 space-y-8 bg-brand-bg-alt">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatItem label="Active Members" value={learners.filter(l => l.isApproved).length} icon={<UsersIcon className="w-4 h-4" />} color="bg-brand-brown" />
              <StatItem label="Books Read" value={reportingData.totalBooks} icon={<BookOpen className="w-4 h-4" />} color="bg-brand-brown" />
              <StatItem label="Presentations" value={reportingData.totalPresentations} icon={<Mic className="w-4 h-4" />} color="bg-brand-brown" />
              <StatItem label="Tasks Done" value={reportingData.totalTasks} icon={<CheckCircle2 className="w-4 h-4" />} color="bg-brand-brown" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-brand-white p-6 rounded-xl border border-brand-border shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-brown mb-6 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Community Activity
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportingData.contribData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE5DB" />
                      <XAxis dataKey="name" tick={{ fill: '#5A4633', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#5A4633', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #EBE5DB' }}
                        cursor={{ fill: '#F5F2ED' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {reportingData.contribData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-brand-white p-6 rounded-xl border border-brand-border shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-brown mb-6">Top Contributors (Total Points)</h3>
                <div className="space-y-4">
                  {reportingData.topLearners.map((learner, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-brand-bg-alt rounded-lg border border-brand-border-light">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-beige flex items-center justify-center text-xs font-bold text-brand-brown">{i + 1}</span>
                        <span className="font-medium text-brand-text">{learner.name}</span>
                      </div>
                      <span className="font-serif font-bold text-brand-brown">{learner.points} pts</span>
                    </div>
                  ))}
                  {reportingData.topLearners.length === 0 && (
                    <p className="text-sm text-brand-brown-light italic">No activity data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'updates' ? (
          <div className="p-6 space-y-4 bg-brand-bg-alt min-h-[400px]">
             {requests.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-brand-brown-light">
                 <Bell className="w-12 h-12 mb-4 opacity-20" />
                 <p className="font-medium italic">No pending update requests.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 gap-4">
                 {requests.map(req => (
                   <motion.div 
                     layout
                     key={req.id} 
                     className="bg-brand-white p-5 rounded-2xl border border-brand-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
                   >
                     <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${req.type === 'book' ? 'bg-blue-50 text-blue-600' : req.type === 'presentation' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>
                          {req.type === 'book' ? <BookOpen className="w-6 h-6" /> : req.type === 'presentation' ? <Mic className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-serif font-bold text-brand-text">{req.learnerName}</h4>
                            <span className="text-[10px] font-mono text-brand-brown-light">ID: {req.learnerId}</span>
                          </div>
                          <p className="text-sm text-brand-brown">
                            Requested to add: <span className="font-bold">{req.type === 'task' ? `${req.details.count} Completion(s)` : req.details.title}</span>
                          </p>
                          {req.type !== 'task' && (
                            <p className="text-xs text-brand-brown-light mt-1 flex items-center gap-3">
                              <span>Completed: {req.details.completedAt}</span>
                              <span className="w-1 h-1 bg-brand-border rounded-full"></span>
                              <span>Duration: {req.details.duration}</span>
                            </p>
                          )}
                          {req.type === 'task' && req.details.description && (
                            <p className="text-xs text-brand-brown-light mt-1 italic">"{req.details.description}"</p>
                          )}
                        </div>
                     </div>
                     <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                          onClick={() => handleApproveRequest(req)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-green-700 shadow-md active:scale-95 transition-all"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(req.id)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-offwhite text-red-600 border border-red-100 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-50 active:scale-95 transition-all"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                     </div>
                   </motion.div>
                 ))}
               </div>
             )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-brand-brown-light border-b border-brand-border-light bg-brand-white">
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Learner ID</th>
                <th className="px-6 py-4 font-bold">Full Name</th>
                <th className="px-6 py-4 font-bold text-center">Books</th>
                <th className="px-6 py-4 font-bold text-center">Tasks</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-10 h-10 text-brand-border" />
                      <p className="text-brand-brown-light italic font-medium">No matching learners found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLearners.map(learner => (
                  <tr key={learner.id} className={`border-b border-brand-border-light hover:bg-brand-bg-alt transition-colors ${!learner.isApproved ? 'bg-red-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      {learner.isApproved ? (
                        <span className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold uppercase tracking-widest bg-green-50 px-2 py-1 rounded-full border border-green-100">
                          <CheckCircle2 className="w-3 h-3" />
                          Authorized
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] text-red-600 font-black uppercase tracking-widest animate-pulse bg-red-100 px-2 py-1 rounded-full border border-red-200 shadow-sm">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-brand-brown text-sm font-semibold">{learner.id}</td>
                    <td className="px-6 py-4 font-medium text-brand-text">
                      {learner.fullName}
                      {!learner.isApproved && <span className="ml-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm">New Request</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="bg-brand-beige px-3 py-1 rounded-full font-serif text-brand-text inline-block min-w-[32px]">{learner.booksCompleted.length}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="bg-brand-brown text-white px-3 py-1 rounded-full font-serif inline-block min-w-[32px]">{learner.tasksCompleted}</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                      {!learner.isApproved && (
                        <button 
                          onClick={() => onApprove(learner.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-sm hover:bg-green-700 transition-all"
                        >
                          Approve
                        </button>
                      )}
                      <button 
                        onClick={() => handleEdit(learner)}
                        className="text-brand-brown-light font-bold text-xs uppercase hover:text-brand-brown transition-colors tracking-wider"
                        title="Edit Profile"
                      >
                        Edit
                      </button>
                      {learnerToDelete === learner.id ? (
                        <div className="inline-flex items-center space-x-2 ml-2">
                          <span className="text-xs text-brand-text/70 italic mr-1">Del?</span>
                          <button 
                            onClick={() => {
                              onRemove(learner.id);
                              setLearnerToDelete(null);
                            }}
                            className="text-red-600 font-bold text-xs uppercase hover:text-red-700 cursor-pointer"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={() => setLearnerToDelete(null)}
                            className="text-brand-brown-light font-bold text-xs uppercase hover:text-brand-brown cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setLearnerToDelete(learner.id)}
                          className="text-red-500/70 font-bold text-xs uppercase hover:text-red-600 ml-2"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {isModalOpen && (
        <ManageLearnerModal 
          learner={editingLearner}
          onClose={() => setIsModalOpen(false)}
          onSave={(data) => {
            if (editingLearner) {
              onUpdate(editingLearner.id, data);
            } else {
              onAdd(data as Omit<Learner, 'joinedAt'>);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function StatItem({ label, value, icon, color }: { label: string, value: number, icon: ReactNode, color: string }) {
  return (
    <div className="bg-brand-white p-4 rounded-xl border border-brand-border shadow-sm flex items-center gap-4">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-brown-light leading-none mb-1">{label}</p>
        <p className="text-xl font-serif font-bold text-brand-text">{value}</p>
      </div>
    </div>
  );
}
