import { useState, useMemo, ReactNode, useEffect } from 'react';
import { Learner, EditRequest, FocusReminder } from '../types';
import { Plus, Edit2, Trash2, Search, CheckCircle2, BarChart3, Users as UsersIcon, BookOpen, Mic, Bell, Check, X, Calendar, AlertTriangle, MessageSquare, Database, RefreshCw, Folder, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { ManageLearnerModal } from './ManageLearnerModal';
import { requestService } from '../services/requestService';
import { reminderService } from '../services/reminderService';
import { learnerService } from '../services/learnerService';
import { motion, AnimatePresence } from 'motion/react';
import { APP_DOMAINS } from '../constants';
import { getOverallPoints, getDomainValue, toTitleCase } from '../utils';
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
  Pie,
  LineChart,
  Line
} from 'recharts';

import { AdminNoticeboard } from './AdminNoticeboard';
import { AdminCircles } from './AdminCircles';

import { messageService } from '../services/messageService';
import { AdminMessaging } from './AdminMessaging';

export function AdminDashboard({ 
  learners, 
  onAdd, 
  onApprove,
  onRemove, 
  onUpdate,
  onViewProfile,
  initialTab,
  pendingCircleItem
}: { 
  learners: Learner[], 
  onAdd: (l: Omit<Learner, 'joinedAt'>) => void,
  onApprove: (id: string) => void,
  onRemove: (id: string) => void,
  onUpdate: (id: string, l: Partial<Learner>) => void,
  onViewProfile: (id: string) => void,
  initialTab?: 'all' | 'pending' | 'reports' | 'updates' | 'reminders' | 'notices' | 'circles' | 'messages',
  pendingCircleItem?: any | null
}) {
  const pendingCount = learners.filter(l => !l.isApproved).length;
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reports' | 'updates' | 'reminders' | 'notices' | 'circles' | 'messages'>(initialTab || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [reminders, setReminders] = useState<FocusReminder[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<Record<string, number>>({});
  const totalUnreadMessages: number = Object.values(unreadMessages).reduce((a: number, b: number) => a + b, 0) as number;

  useEffect(() => {
    const unsub = messageService.subscribeToUnreadAdminMessages((counts: Record<string, number>) => {
      setUnreadMessages(counts);
    });
    return () => unsub();
  }, []);

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedSuccess(false);
    try {
      await learnerService.seedDefaultLearners();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    const unsubscribe = requestService.subscribeToRequests((allRequests) => {
      setRequests(allRequests.filter(r => r.status === 'pending'));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = reminderService.subscribeToAllReminders((allReminders) => {
      setReminders(allReminders);
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
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (name: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const filteredLearners = learners.filter(l => {
    const matchesSearch = l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || l.id.includes(searchTerm);
    const matchesTab = activeTab === 'all' ? true : activeTab === 'pending' ? !l.isApproved : true;
    return matchesSearch && matchesTab;
  });

  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  const handleApproveRequest = async (request: EditRequest) => {
    if (processingRequests.has(request.id)) return;
    setProcessingRequests(prev => new Set(prev).add(request.id));

    try {
      await learnerService.updateLearnerWithTransaction(request.learnerId, (learner) => {
        let updates: Partial<Learner> = {};
        const reqType = request.type.endsWith('s') ? request.type.slice(0, -1) : request.type;

        if (request.isFocus) {
          const currentFocuses = learner.currentFocuses || [];
          updates = {
            currentFocuses: [
              ...currentFocuses,
              {
                id: request.id,
                domain: reqType,
                title: request.details.title || 'Untitled Focus',
                author: request.details.author,
                createdAt: new Date().toISOString(),
                estimatedDuration: request.details.estimatedDuration,
                location: request.details.location,
                isLoungeModule: request.details.isLoungeModule,
                isResearchPaper: request.details.isResearchPaper
              }
            ]
          };
        } else if (request.isLibrarySubmission) {
          updates = {
            librarySubmissionsCount: (learner.librarySubmissionsCount || 0) + 1
          };
        } else if (reqType === 'book') {
          let displayTitle = request.details.author ? `${request.details.title} by ${request.details.author}` : request.details.title;
          if (request.details.hasFile) displayTitle += ' [Document Uploaded]';
          const overviewText = request.details.documentOverview || request.details.overview || request.details.description;
          if (overviewText) {
            displayTitle += ` (Overview: ${overviewText})`;
          }
          updates = { 
            booksCompleted: [...(learner.booksCompleted || []), `${displayTitle} (${request.details.duration || 'Completed'})`] 
          };
        } else if (reqType === 'presentation') {
          updates = { 
            presentationsGiven: [...(learner.presentationsGiven || []), `${request.details.title} (${request.details.completedAt || new Date().toISOString().split('T')[0]})`] 
          };
        } else if (reqType === 'task') {
          updates = { 
            tasksCompleted: (learner.tasksCompleted || 0) + (request.details.count || 1) 
          };
        } else {
          // Handle module-based domains
          const currentStats = learner.moduleStats || {};
          const currentItems = learner.moduleItems || {};
          const saveKey = reqType === 'research papers/article' ? 'articles' : reqType;
          
          let displayTitle = request.details.author ? `${request.details.title} by ${request.details.author}` : request.details.title;
          if (reqType === 'research papers/article') {
            const prefix = request.details.isResearchPaper ? '[Research Paper] ' : '[Article] ';
            displayTitle = prefix + displayTitle;
            if (request.details.hasFile) {
              displayTitle += ' [Document Uploaded]';
            }
            if (request.details.link) {
              displayTitle += ` [Link: ${request.details.link}]`;
            }
            if (request.details.overview) {
              displayTitle += ` (Overview: ${request.details.overview})`;
            }
          }
          
          updates = {
            moduleStats: {
              ...currentStats,
              [saveKey]: (currentStats[saveKey] || 0) + (request.details.count || 1)
            },
            moduleItems: {
              ...currentItems,
              [saveKey]: [...(currentItems[saveKey] || []), displayTitle || 'Completed Module Item']
            }
          };

          if (reqType === 'dowra') updates.completedDawraEQuran = true;
          if (reqType === 'tafsir') updates.completedTafsirModule = true;
          if (reqType === 'seerah') updates.completedSeerahModule = true;
          if (reqType === 'research papers/article') updates.completedArticlesModule = true;
        }
        
        // Always check if this completion matches an active focus and remove it
        if (!request.isFocus && learner.currentFocuses) {
          const removedFocuses: any[] = [];
          const remainingFocuses = learner.currentFocuses.filter(
            f => {
              const fNorm = f.domain.endsWith('s') ? f.domain.slice(0, -1) : f.domain;
              const rNorm = request.type.endsWith('s') ? request.type.slice(0, -1) : request.type;
              const isMatch = f.title.toLowerCase().trim() === request.details.title?.toLowerCase().trim() && fNorm === rNorm;
              if (isMatch) {
                removedFocuses.push(f);
              }
              return !isMatch;
            }
          );
          if (remainingFocuses.length !== learner.currentFocuses.length) {
            updates.currentFocuses = remainingFocuses;
            // Clean up completed focus from edit_requests and reminders
            // We use setTimeout here so it runs outside the transaction
            setTimeout(() => {
              for (const focus of removedFocuses) {
                if (focus.id) {
                  try {
                    requestService.deleteRequest(focus.id);
                    reminderService.deleteRemindersByFocusId(focus.id);
                  } catch (err) {
                    console.error("Failed to delete completed focus from database:", err);
                  }
                }
              }
            }, 0);
          }
        }
        return updates;
      });
      await requestService.updateRequestStatus(request.id, 'approved', request.learnerName, (request as any).docPath);
    } catch (err) {
      console.error("Failed to approve request:", err);
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleRejectRequest = async (request: EditRequest) => {
    try {
      if (request.details?.fileLink) {
        try {
          const { driveService, extractFileId } = await import('../services/driveService');
          const fileId = extractFileId(request.details.fileLink);
          if (fileId) {
            await driveService.deleteFile(fileId);
          }
        } catch (err) {
          console.warn("Could not delete associated Google Drive file on request rejection:", err);
        }
      }
      await requestService.updateRequestStatus(request.id, 'rejected', request.learnerName, (request as any).docPath);
    } catch (err) {
      console.error("Failed to reject request:", err);
    }
  };

  const reportingData = useMemo(() => {
    const totalByDomain: Record<string, number> = {};
    const colors = ['#5A4633', '#8C7864', '#A69280', '#C4B4A4', '#DCCFC2', '#EBE5DB', '#E0D8C8'];
    
    const contribData = APP_DOMAINS.map((domain, index) => {
      const value = learners.reduce((acc, l) => acc + getDomainValue(l, domain.type), 0);
      totalByDomain[domain.type] = value;
      return { name: domain.label, value, color: colors[index % colors.length] };
    });

    const topLearners = [...learners]
      .map(l => ({
        name: l.fullName,
        points: getOverallPoints(l)
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    const growthMap: Record<string, { label: string; count: number, timestamp: number }> = {};
    
    learners.forEach(l => {
      if (!l.joinedAt) return;
      const d = new Date(l.joinedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      if (!growthMap[key]) {
        growthMap[key] = { label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }), count: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
      }
      growthMap[key].count += 1;
    });

    let runningTotal = 0;
    const growthData = Object.values(growthMap)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(entry => {
        runningTotal += entry.count;
        return {
          date: entry.label,
          total: runningTotal,
          newSigns: entry.count
        };
      });

    return { contribData, topLearners, totalByDomain, growthData };
  }, [learners]);

  const handleEdit = (learner: Learner) => {
    setEditingLearner(learner);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingLearner(null);
    setIsModalOpen(true);
  };

  const activeRemindersCount = useMemo(() => {
    return reminders.filter(r => (r.status === 'answered' && !r.adminRead) || (r.type === 'deadline' && r.status === 'pending')).length;
  }, [reminders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-text">Admin Center</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-brown-light mt-1">
            Lounge Management ({learners.length} learners)
          </p>
        </div>
        <div className="flex bg-brand-brown rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 divide-x divide-brand-brown-dark">
          <button 
            onClick={handleAddNew}
            className="text-brand-offwhite px-6 py-3 font-bold uppercase tracking-wider text-xs hover:bg-brand-brown-dark flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Learner</span>
          </button>
          <button
            onClick={() => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(learners, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute('href', dataStr);
              downloadAnchorNode.setAttribute('download', `learners_data_${new Date().toISOString().split('T')[0]}.json`);
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
            className="text-brand-offwhite px-4 py-3 hover:bg-brand-brown-dark flex items-center justify-center"
            title="Download Data (JSON)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
          </button>
        </div>
      </div>

      {learners.length === 0 && (
        <div className="bg-amber-50/50 border border-amber-200/85 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6 max-w-3xl mx-auto my-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 border border-amber-200 shadow-sm">
              <Database className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-2xl font-bold text-brand-text leading-tight">Database Recovery Mode</h3>
              <p className="text-sm text-brand-brown-light leading-relaxed">
                It looks like the <strong>learners</strong> collection in your Firestore database is currently empty (or has been recently deleted). 
                To quickly restore your application data and populated workspaces, you can seed the database with standard demonstration profiles.
              </p>
            </div>
          </div>

          <div className="bg-brand-white p-5 rounded-2xl shadow-inner border border-brand-border-light space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-brown">This will automatically recreate:</h4>
            <ul className="text-xs text-brand-brown-light leading-relaxed space-y-2 list-disc list-inside">
              <li>Three authorized/unauthorized sample Learners with realistic stats, completed books, and progress logs.</li>
              <li>Pre-approved test submission accomplishments in the Momentum feed tracker.</li>
              <li>A study focus reminder showing active study status metrics and deadlines.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-2">
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all flex items-center justify-center space-x-2 border ${
                seedSuccess 
                  ? 'bg-green-600 border-green-500 text-white hover:bg-green-700' 
                  : 'bg-amber-600 border-amber-500 hover:bg-amber-700 text-brand-offwhite'
              } disabled:opacity-50`}
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Seeding Records...</span>
                </>
              ) : seedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Seeded Successfully!</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Restore & Seed Database</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

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
            <div className="flex flex-wrap bg-brand-beige p-1 rounded-xl border border-brand-border h-auto min-h-10 gap-1 sm:gap-0">
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 md:py-0 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 ${activeTab === 'all' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                All Learners
              </button>
              <button 
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-1.5 md:py-0 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'pending' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Pending
                {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-1.5 md:py-0 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'reports' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Reports
              </button>
              <button 
                onClick={() => setActiveTab('updates')}
                className={`px-4 py-1.5 md:py-0 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'updates' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Updates
                {requests.length > 0 && <span className="bg-brand-brown text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{requests.length}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('reminders')}
                className={`px-4 py-1.5 md:py-0 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'reminders' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Focus Alerts
                {activeRemindersCount > 0 && <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center justify-center font-black animate-pulse">{activeRemindersCount}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('notices')}
                className={`px-4 py-1.5 md:py-0 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'notices' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Noticeboard
              </button>
              <button 
                onClick={() => setActiveTab('circles')}
                className={`px-4 py-1.5 md:py-0 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'circles' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Circles
              </button>
              <button 
                onClick={() => setActiveTab('messages')}
                className={`px-4 py-1.5 md:py-0 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 flex items-center gap-2 ${activeTab === 'messages' ? 'bg-brand-white text-brand-brown shadow-sm' : 'text-brand-brown-light hover:text-brand-brown'}`}
              >
                Messages
                {totalUnreadMessages > 0 && <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-pulse">{totalUnreadMessages}</span>}
              </button>
            </div>
            {activeTab !== 'reports' && activeTab !== 'updates' && activeTab !== 'reminders' && activeTab !== 'notices' && activeTab !== 'circles' && activeTab !== 'messages' && (
              <div className="relative w-full sm:max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-brown-light w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search by Wisdom Code or Name..."
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
              {APP_DOMAINS.map(domain => {
                const Icon = { BookOpen, Mic, CheckCircle2 }[domain.icon as any] as any || BookOpen;
                return (
                  <StatItem 
                    key={domain.id}
                    label={domain.label} 
                    value={reportingData.totalByDomain[domain.type] || 0} 
                    icon={<Icon className="w-4 h-4" />} 
                    color="bg-brand-brown" 
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-brand-white p-6 rounded-xl border border-brand-border shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-brown mb-6 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Lounge Activity
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

            <div className="bg-brand-white p-6 rounded-xl border border-brand-border shadow-sm mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-brown mb-6 flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                Lounge Growth Over Time
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportingData.growthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBE5DB" />
                    <XAxis dataKey="date" tick={{ fill: '#5A4633', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#5A4633', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #EBE5DB' }}
                    />
                    <Line type="monotone" dataKey="total" name="Total Members" stroke="#5A4633" strokeWidth={3} dot={{ fill: '#5A4633', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : activeTab === 'updates' ? ( // UPDATE_TAB_MARKER
          <div className="p-6 space-y-4 bg-brand-bg-alt min-h-[400px]">
             {(() => {
               // Group requests by learner
               const grouped: Record<string, EditRequest[]> = {};
               requests.forEach(req => {
                 const name = req.learnerName || 'Unknown Learner';
                 if (!grouped[name]) {
                   grouped[name] = [];
                 }
                 grouped[name].push(req);
               });

               return requests.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-brand-brown-light">
                   <Bell className="w-12 h-12 mb-4 opacity-20" />
                   <p className="font-medium italic">No pending update requests.</p>
                 </div>
               ) : (
                 <div className="space-y-4 w-full">
                   <div className="flex items-center justify-between px-1 mb-2">
                     <span className="text-xs font-bold uppercase tracking-wider text-brand-brown-light flex items-center gap-2">
                       <Database className="w-3.5 h-3.5" />
                       Database Folder Views (Grouped by LearnerName)
                     </span>
                     <span className="text-xs text-brand-brown-light italic">
                       {Object.keys(grouped).length} Active Folder{Object.keys(grouped).length !== 1 ? 's' : ''}
                     </span>
                   </div>
                   
                   {Object.entries(grouped).map(([learnerName, learnerReqs]) => {
                     const isCollapsed = collapsedFolders[learnerName] ?? false;
                     const folderPath = `edit_requests/${learnerName.trim().replace(/\s+/g, '_').toLowerCase()}/requests/`;
                     
                     return (
                       <div 
                         key={learnerName} 
                         className="bg-brand-white rounded-2xl border border-brand-border/60 shadow-sm overflow-hidden"
                       >
                         {/* Folder Header */}
                         <div 
                           onClick={() => toggleFolder(learnerName)}
                           className="bg-brand-white hover:bg-brand-beige/20 px-5 py-4 flex items-center justify-between border-b border-brand-border/40 cursor-pointer select-none transition-colors"
                         >
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/50">
                               {isCollapsed ? (
                                 <Folder className="w-5.5 h-5.5 fill-amber-100" />
                               ) : (
                                 <FolderOpen className="w-5.5 h-5.5 fill-amber-100" />
                               )}
                             </div>
                             <div>
                               <div className="flex items-center gap-2">
                                 <h4 className="font-serif font-bold text-brand-text text-base">{learnerName}</h4>
                                 <span className="px-2 py-0.5 bg-brand-beige text-brand-brown rounded-full text-[10px] font-bold">
                                   {learnerReqs.length} request{learnerReqs.length !== 1 ? 's' : ''}
                                 </span>
                               </div>
                               <p className="text-[10px] font-mono text-brand-brown-light">
                                 Path: <span className="text-brand-brown/85 font-semibold font-sans">{folderPath}</span>
                               </p>
                             </div>
                           </div>
                           
                           <div className="w-8 h-8 rounded-lg hover:bg-brand-beige/40 flex items-center justify-center text-brand-brown-light transition-colors">
                             {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                           </div>
                         </div>

                         {/* Folder Content */}
                         {!isCollapsed && (
                           <div className="p-4 bg-brand-bg-alt/30 border-t border-brand-border/25 space-y-4">
                             {learnerReqs.map(req => (
                               <motion.div 
                                 layout
                                 key={req.id} 
                                 className="bg-brand-white p-5 rounded-xl border border-brand-border-light shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
                               >
                                 <div className="flex items-start gap-4 flex-1">
                                    {(() => {
                                       const domain = APP_DOMAINS.find(d => d.type === req.type);
                                       const Icon = { BookOpen, Mic, CheckCircle2 }[domain?.icon as any] as any || BookOpen;
                                       return (
                                         <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-brand-beige text-brand-brown border border-brand-border/40">
                                           <Icon className="w-5.5 h-5.5" />
                                         </div>
                                       );
                                    })()}
                                    <div>
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[10px] font-semibold text-brand-brown bg-brand-beige/50 px-2 py-0.5 rounded-full uppercase tracking-wider">{req.type}</span>
                                        <span className="text-[10px] font-mono text-brand-brown-light/80">ID: {req.id}</span>
                                      </div>
                                      <p className="text-sm text-brand-brown">
                                        {req.isFocus ? 'Requested to start focusing on: ' : 'Requested to add: '}
                                        <span className="font-bold text-brand-text">
                                          {req.type === 'task' && !req.isFocus 
                                            ? `${req.details.count} Completion(s)` 
                                            : req.details.title}
                                          {req.details.author && <span className="text-brand-brown-light font-normal italic"> by {req.details.author}</span>}
                                        </span>
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {!req.isFocus && req.type !== 'task' && (
                                          <p className="text-xs text-brand-brown-light flex items-center gap-2">
                                            <span>Completed: {req.details.completedAt}</span>
                                            <span className="w-1 h-1 bg-brand-border rounded-full"></span>
                                            <span>Duration: {req.details.duration}</span>
                                          </p>
                                        )}
                                        {req.isFocus && (
                                          <p className="text-xs text-brand-brown-light flex items-center gap-2">
                                            <span>Target: {req.details.estimatedDuration ? new Date(req.details.estimatedDuration).toLocaleDateString() : 'unknown'}</span>
                                            <span className="w-1 h-1 bg-brand-border rounded-full"></span>
                                            <span>Location: {req.details.location === 'personal' ? 'Personal (Outside)' : 'Inside Lounge'}</span>
                                          </p>
                                        )}
                                      </div>
                                      {req.type === 'task' && req.details.description && (
                                        <p className="text-xs text-brand-brown-light mt-1 italic">"{req.details.description}"</p>
                                      )}
                                      {req.details.link && (
                                        <p className="text-xs text-brand-brown mt-1.5 flex items-center gap-1.5">
                                          <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[10px]">Online Link:</span>
                                          <a href={req.details.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">{req.details.link}</a>
                                        </p>
                                      )}
                                      {req.details.overview && (
                                        <div className="text-xs text-brand-brown mt-1.5 bg-brand-beige/30 p-2.5 rounded-lg border border-brand-border/60 max-w-md">
                                          <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[10px] block mb-1">Brief Overview / Summary</span>
                                          <p className="italic">"{req.details.overview}"</p>
                                        </div>
                                      )}
                                      {req.details.hasFile && (
                                        <div className="text-xs text-brand-brown mt-1.5 bg-brand-beige/30 p-2.5 rounded-lg border border-brand-border/60 max-w-md">
                                          <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[10px] block mb-1">Uploaded Document (Requires Approval For +1 pt)</span>
                                          {req.details.fileLink && (
                                            <a href={req.details.fileLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all mb-2 inline-block">View Document</a>
                                          )}
                                          {req.details.documentOverview && (
                                            <div>
                                              <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[9px] block mb-0.5">Document Overview:</span>
                                              <p className="italic">"{req.details.documentOverview}"</p>
                                            </div>
                                          )}
                                          {req.details.language && (
                                            <div className="mt-2 pt-2 border-t border-brand-border/40">
                                              <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[9px] block mb-0.5">Selected Languages:</span>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {req.details.language.split(',').map((lang: string) => (
                                                  <span key={lang.trim()} className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                                    {lang.trim()}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {req.details.materialOwnership && (
                                            <div className="mt-2 pt-2 border-t border-brand-border/40">
                                              <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[9px] block mb-0.5">Material Attribution:</span>
                                              <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${req.details.materialOwnership === 'own' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {req.details.materialOwnership === 'own' ? "Uploader's Own Material" : "Someone Else's Material"}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {req.type === 'talaqqi' && (
                                        <div className="text-xs text-brand-brown mt-1.5 space-y-1 bg-brand-beige/30 p-2.5 rounded-lg border border-brand-border/60 max-w-md">
                                          {req.details.subject && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Subject:</span> {toTitleCase(req.details.subject)}</div>}
                                          {req.details.ustadName && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Ustad:</span> {toTitleCase(req.details.ustadName)}</div>}
                                          {req.details.isOnline !== undefined && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Mode:</span> {req.details.isOnline ? 'Online' : 'Offline'}</div>}
                                          {req.details.source && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Source:</span> <span className="break-all">{req.details.source}</span></div>}
                                          {req.details.community && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Community:</span> {req.details.community}</div>}
                                          {req.details.objective && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Objective:</span> {req.details.objective}</div>}
                                        </div>
                                      )}
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                                    <button 
                                      onClick={() => handleApproveRequest(req)}
                                      disabled={processingRequests.has(req.id)}
                                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-green-700 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <Check className="w-4 h-4" />
                                      {processingRequests.has(req.id) ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button 
                                      onClick={() => handleRejectRequest(req)}
                                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-offwhite text-red-600 border border-red-100 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-50 active:scale-95 transition-all"
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
                     );
                   })}
                 </div>
               );
             })()}
             {false && requests.length === 0 ? (
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
                        {(() => {
                           const domain = APP_DOMAINS.find(d => d.type === req.type);
                           const Icon = { BookOpen, Mic, CheckCircle2 }[domain?.icon as any] as any || BookOpen;
                           const colors = { book: 'bg-blue-50 text-blue-600', presentation: 'bg-purple-50 text-purple-600', task: 'bg-green-50 text-green-600' };
                           return (
                             <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[req.type] || 'bg-brand-beige text-brand-brown'}`}>
                               <Icon className="w-6 h-6" />
                             </div>
                           );
                        })()}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-serif font-bold text-brand-text">{req.learnerName}</h4>
                            <span className="text-[10px] font-mono text-brand-brown-light">Wisdom Code: {req.learnerId}</span>
                          </div>
                          <p className="text-sm text-brand-brown">
                            {req.isFocus ? 'Requested to start focusing on: ' : 'Requested to add: '}
                            <span className="font-bold">
                              {req.type === 'task' && !req.isFocus 
                                ? `${req.details.count} Completion(s)` 
                                : toTitleCase(req.details.title)}
                              {req.details.author && <span className="text-brand-brown-light font-normal italic"> by {toTitleCase(req.details.author)}</span>}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {!req.isFocus && req.type !== 'task' && (
                              <p className="text-xs text-brand-brown-light flex items-center gap-2">
                                <span>Completed: {req.details.completedAt}</span>
                                <span className="w-1 h-1 bg-brand-border rounded-full"></span>
                                <span>Duration: {req.details.duration}</span>
                              </p>
                            )}
                            {req.isFocus && (
                              <p className="text-xs text-brand-brown-light flex items-center gap-2">
                                <span>Target: {req.details.estimatedDuration ? new Date(req.details.estimatedDuration).toLocaleDateString() : 'unknown'}</span>
                                <span className="w-1 h-1 bg-brand-border rounded-full"></span>
                                <span>Location: {req.details.location === 'personal' ? 'Personal (Outside)' : 'Inside Lounge'}</span>
                              </p>
                            )}
                          </div>
                          {req.type === 'task' && req.details.description && (
                            <p className="text-xs text-brand-brown-light mt-1 italic">"{req.details.description}"</p>
                          )}
                          {req.details.link && (
                            <p className="text-xs text-brand-brown mt-1.5 flex items-center gap-1.5">
                              <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[10px]">Online Link:</span>
                              <a href={req.details.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">{req.details.link}</a>
                            </p>
                          )}
                          {req.details.overview && (
                            <div className="text-xs text-brand-brown mt-1.5 bg-brand-beige/30 p-2.5 rounded-lg border border-brand-border/60 max-w-md">
                              <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[10px] block mb-1">Brief Overview / Summary</span>
                              <p className="italic">"{req.details.overview}"</p>
                            </div>
                          )}
                          {req.details.hasFile && (
                            <div className="text-xs text-brand-brown mt-1.5 bg-brand-beige/30 p-2.5 rounded-lg border border-brand-border/60 max-w-md">
                              <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[10px] block mb-1">Uploaded Document (Requires Approval For +1 pt)</span>
                              {req.details.fileLink && (
                                <a href={req.details.fileLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all mb-2 inline-block">View Document</a>
                              )}
                              {req.details.documentOverview && (
                                <div>
                                  <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[9px] block mb-0.5">Document Overview:</span>
                                  <p className="italic">"{req.details.documentOverview}"</p>
                                </div>
                              )}
                              {req.details.language && (
                                <div className="mt-2 pt-2 border-t border-brand-border/40">
                                  <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[9px] block mb-0.5">Selected Languages:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {req.details.language.split(',').map((lang: string) => (
                                      <span key={lang.trim()} className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                        {lang.trim()}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {req.details.materialOwnership && (
                                <div className="mt-2 pt-2 border-t border-brand-border/40">
                                  <span className="font-bold text-brand-brown-light uppercase tracking-wider text-[9px] block mb-0.5">Material Attribution:</span>
                                  <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${req.details.materialOwnership === 'own' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {req.details.materialOwnership === 'own' ? "Uploader's Own Material" : "Someone Else's Material"}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {req.type === 'talaqqi' && (
                            <div className="text-xs text-brand-brown mt-1.5 space-y-1 bg-brand-beige/30 p-2.5 rounded-lg border border-brand-border/60 max-w-md">
                              {req.details.subject && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Subject:</span> {toTitleCase(req.details.subject)}</div>}
                              {req.details.ustadName && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Ustad:</span> {toTitleCase(req.details.ustadName)}</div>}
                              {req.details.isOnline !== undefined && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Mode:</span> {req.details.isOnline ? 'Online' : 'Offline'}</div>}
                              {req.details.source && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Source:</span> <span className="break-all">{req.details.source}</span></div>}
                              {req.details.community && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Community:</span> {req.details.community}</div>}
                              {req.details.objective && <div className="flex gap-2"><span className="font-bold text-brand-brown-light uppercase tracking-wider">Objective:</span> {req.details.objective}</div>}
                            </div>
                          )}
                        </div>
                     </div>
                     <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                          onClick={() => handleApproveRequest(req)}
                          disabled={processingRequests.has(req.id)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-green-700 shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="w-4 h-4" />
                          {processingRequests.has(req.id) ? 'Approving...' : 'Approve'}
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
        ) : activeTab === 'reminders' ? (
          <div className="p-6 space-y-6 bg-brand-bg-alt min-h-[400px]">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border pb-4">
               <div>
                 <h3 className="font-serif text-2xl font-bold text-brand-brown">Learning Focus Alerts</h3>
                 <p className="text-sm text-brand-brown-light">Track approaching completion dates, periodic progress checkpoints, and individual member assistance requests.</p>
               </div>
               <button
                 onClick={async () => {
                   // Mark all answered alerts as read
                   const unreadAnswered = reminders.filter(r => r.status === 'answered' && !r.adminRead);
                   for (const r of unreadAnswered) {
                     await reminderService.markAsRead(r.id, 'admin');
                   }
                 }}
                 className="px-4 py-2 bg-brand-brown text-brand-offwhite rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-brand-brown-dark transition-colors shrink-0 shadow-sm"
               >
                 Mark All Answered as Read
               </button>
             </div>

             {reminders.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-brand-brown-light">
                 <Bell className="w-12 h-12 mb-4 opacity-25" />
                 <p className="font-medium italic text-base">No focus alerts or reminders recorded yet.</p>
                 <p className="text-xs text-brand-brown-light/65 mt-1">Reminders generate automatically as learners progress.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {reminders
                   .sort((a, b) => b.updatedAt - a.updatedAt)
                   .map(reminder => {
                     const isAnswered = reminder.status === 'answered';
                     const isRead = reminder.adminRead;
                     const responseType = reminder.responseType;
                     
                     let statusBg = "bg-gray-150 border-gray-300 text-gray-700";
                     let statusText = "Pending Learner Response";
                     if (isAnswered) {
                       if (responseType === 'struggling') {
                         statusBg = "bg-red-50 text-red-700 border-red-200 text-[10px]";
                         statusText = "🚨 Struggling / Needs Support";
                       } else if (responseType === 'completed') {
                         statusBg = "bg-green-50 text-green-700 border-green-200 text-[10px]";
                         statusText = "🎉 Finished Focus";
                       } else if (responseType === 'rescheduled') {
                         statusBg = "bg-blue-50 text-blue-700 border-blue-200 text-[10px]";
                         statusText = "📅 Adjusted Expected Date";
                       } else {
                         statusBg = "bg-amber-50 text-amber-805 border-amber-200 text-[10px]";
                         statusText = "👍 On Track";
                       }
                     } else if (reminder.type === 'deadline') {
                       statusBg = "bg-orange-50 text-orange-700 border-orange-200 text-[10px]";
                       statusText = "⚠️ Expected Completion Date Near";
                     }

                     return (
                       <div 
                         key={reminder.id}
                         className={`p-5 rounded-2xl border ${isAnswered && !isRead ? 'bg-amber-50/20 border-amber-300 shadow-md' : 'bg-brand-white border-brand-border shadow-sm'} flex flex-col md:flex-row md:items-start justify-between gap-6 transition-all`}
                       >
                         <div className="flex items-start gap-4 flex-1">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${reminder.type === 'deadline' ? 'bg-orange-100 text-orange-600' : 'bg-brand-beige text-brand-brown'}`}>
                             {reminder.type === 'deadline' ? <Calendar className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                           </div>
                           <div className="space-y-2 flex-1">
                             <div className="flex flex-wrap items-center gap-2">
                               <h4 className="font-bold text-brand-text text-base leading-snug">{reminder.learnerName}</h4>
                               <span className="text-[10px] font-mono text-brand-brown-light px-2 py-0.5 bg-brand-bg-alt border border-brand-border-light rounded">Code: {reminder.learnerId}</span>
                               <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBg}`}>
                                 {statusText}
                               </span>
                             </div>

                             <div className="text-sm text-brand-brown">
                               <p className="font-semibold text-xs text-brand-brown-light uppercase tracking-wider mb-1">
                                 Learning Focus Reference
                               </p>
                               <p className="font-medium text-brand-text">
                                 [{reminder.focusDomain.toUpperCase()}] <span className="font-bold">{reminder.focusTitle}</span>
                               </p>
                             </div>

                             <div className="text-sm bg-brand-bg-alt/50 border border-brand-border-light p-3 rounded-xl">
                               <p className="text-xs text-brand-brown-light/80 italic font-mono mb-1">Question sent to learner:</p>
                               <p className="text-brand-brown font-serif italic text-sm">"{reminder.questionText}"</p>
                             </div>

                             {isAnswered && (
                               <div className="text-sm bg-brand-beige/25 border border-brand-border/40 p-3 rounded-xl">
                                 <p className="text-xs text-brand-brown-light/85 font-semibold mb-1">Learner Response:</p>
                                 <p className="text-brand-brown font-medium italic text-sm">
                                   "{reminder.responseText}"
                                 </p>
                                 {reminder.newTargetDate && (
                                   <p className="text-xs text-blue-700 font-semibold mt-2">
                                      Rescheduled expected completion: {new Date(reminder.newTargetDate).toLocaleDateString()}
                                   </p>
                                 )}
                               </div>
                             )}
                           </div>
                         </div>

                         <div className="flex flex-row md:flex-col items-end justify-between md:justify-start gap-3 shrink-0 w-full md:w-auto border-t md:border-t-0 border-brand-border-light pt-3 md:pt-0">
                           <span className="text-[10px] font-mono text-brand-brown-light">
                             Sent: {new Date(reminder.createdAt).toLocaleDateString()}
                           </span>
                           {isAnswered && !isRead && (
                             <button
                               onClick={() => reminderService.markAsRead(reminder.id, 'admin')}
                               className="px-4 py-2 bg-brand-white hover:bg-green-50 border border-brand-border hover:border-green-300 text-brand-brown hover:text-green-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                             >
                               <Check className="w-3.5 h-3.5" />
                               Acknowledge
                             </button>
                           )}
                           {isAnswered && isRead && (
                             <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 flex items-center gap-1 bg-green-50 border border-green-100 px-2 py-0.5 rounded">
                               <Check className="w-3 h-3" /> Acknowledged
                             </span>
                           )}
                         </div>
                       </div>
                     );
                   })}
               </div>
             )}
          </div>
        ) : activeTab === 'notices' ? (
          <AdminNoticeboard />
        ) : activeTab === 'circles' ? (
          <AdminCircles pendingCircleItem={pendingCircleItem} />
        ) : activeTab === 'messages' ? (
          <div className="p-6">
            <AdminMessaging learners={learners} unreadCounts={unreadMessages} />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-brand-brown-light border-b border-brand-border-light bg-brand-white">
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Wisdom Code</th>
                <th className="px-6 py-4 font-bold">Full Name</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
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
                      <div>{learner.fullName}</div>
                      {learner.phoneNumber && (
                        <div className="text-xs text-brand-brown-light font-mono mt-0.5">{learner.phoneNumber}</div>
                      )}
                      {!learner.isApproved && <span className="mt-1 inline-block bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm">New Request</span>}
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
                        onClick={() => onViewProfile(learner.id)}
                        className="text-brand-brown hover:text-brand-text transition-colors p-2 rounded-full hover:bg-brand-beige inline-flex items-center"
                        title="View Profile"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
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
          onSave={async (data) => {
            if (editingLearner) {
              const oldFocuses = editingLearner.currentFocuses || [];
              const newFocuses = data.currentFocuses || [];
              const removedFocuses = oldFocuses.filter(
                (oldF) => !newFocuses.some((newF: any) => newF.id === oldF.id)
              );

              onUpdate(editingLearner.id, data);

              // Process focus deletion from database
              for (const focus of removedFocuses) {
                if (focus.id) {
                  try {
                    await requestService.deleteRequest(focus.id);
                    await reminderService.deleteRemindersByFocusId(focus.id);
                  } catch (err) {
                    console.error("Failed to delete focus from admin edit:", err);
                  }
                }
              }
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

function StatItem({ label, value, icon, color }: { label: string, value: number, icon: ReactNode, color: string, key?: string }) {
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
