import { useState, useEffect, useMemo } from 'react';
import { LogEntry } from '../types';
import { logService } from '../services/logService';
import { Search, Filter, Clock, User, Activity, AlertCircle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = logService.subscribeToLogs((fetchedLogs) => {
      setLogs(fetchedLogs);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Format date helper
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Human-readable relative time helper
  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  // Extract unique action types for filter dropdown
  const uniqueActionTypes = useMemo(() => {
    const types = new Set<string>();
    logs.forEach(log => {
      if (log.action) types.add(log.action);
    });
    return Array.from(types).sort();
  }, [logs]);

  // Filter logs based on search query and action dropdown
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        (log.learnerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.learnerId || '').includes(searchTerm) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = selectedActionType === 'all' || log.action === selectedActionType;
      
      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, selectedActionType]);

  // Badge style resolver
  const getActionBadgeStyle = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('approve')) {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    if (actionLower.includes('reject') || actionLower.includes('delete') || actionLower.includes('remove')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (actionLower.includes('submit') || actionLower.includes('request')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (actionLower.includes('register')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (actionLower.includes('join') || actionLower.includes('enroll')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-sans text-2xl font-bold text-brand-text flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-brown" />
            Learner Activity Logs
          </h2>
          <p className="text-sm text-brand-brown-light mt-1">
            Real-time auditable stream of learner requests, enrollments, registrations, and admin decisions.
          </p>
        </div>
        
        <div className="text-xs bg-brand-beige px-3 py-1.5 rounded-xl border border-brand-border text-brand-brown font-semibold flex items-center gap-1.5 self-stretch md:self-auto justify-center">
          <Clock className="w-3.5 h-3.5" />
          <span>Active Session Tracker</span>
        </div>
      </div>

      {/* Control Panel: Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-brand-bg-alt p-4 rounded-2xl border border-brand-border shadow-sm">
        <div className="relative md:col-span-7">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-brown-light w-4 h-4" />
          <input
            type="text"
            placeholder="Search logs by Learner, Wisdom Code, action, details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm transition-all text-brand-text"
          />
        </div>

        <div className="relative md:col-span-3 flex items-center">
          <Filter className="absolute left-3 text-brand-brown-light w-4 h-4" />
          <select
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-brand-white border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown shadow-sm text-brand-text appearance-none cursor-pointer"
          >
            <option value="all">All Actions</option>
            {uniqueActionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setSearchTerm('');
            setSelectedActionType('all');
          }}
          className="md:col-span-2 px-4 py-2.5 bg-brand-white hover:bg-brand-beige text-brand-brown-light hover:text-brand-brown rounded-xl text-xs font-bold uppercase tracking-wider border border-brand-border transition-all flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Logs Display */}
      {isLoading ? (
        <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-brown animate-spin" />
          <p className="text-sm text-brand-brown-light">Loading audit trail...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-brand-white p-16 text-center rounded-2xl border border-brand-border flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 text-brand-border" />
          <h3 className="font-semibold text-brand-text">No activity logs found</h3>
          <p className="text-xs text-brand-brown-light max-w-sm">
            We couldn't find any log records matching your search query or filter criteria. Try adjusting your parameters.
          </p>
        </div>
      ) : (
        <div className="bg-brand-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg-header text-[10px] font-bold uppercase tracking-wider text-brand-brown-light border-b border-brand-border">
                  <th className="px-6 py-4 w-48">Time / Date</th>
                  <th className="px-6 py-4 w-56">Learner</th>
                  <th className="px-6 py-4 w-44">Action</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-brand-border-light">
                <AnimatePresence initial={false}>
                  {filteredLogs.map((log) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="hover:bg-brand-bg-alt/50 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-brand-text text-xs">
                            {formatTime(log.timestamp)}
                          </span>
                          <span className="text-[10px] text-brand-brown-light font-mono mt-0.5">
                            {formatDate(log.timestamp)}
                          </span>
                          <span className="text-[9px] text-brand-brown/50 font-semibold uppercase mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {getRelativeTime(log.timestamp)}
                          </span>
                        </div>
                      </td>

                      {/* Learner Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-beige flex items-center justify-center text-brand-brown font-bold text-xs shrink-0">
                            {log.learnerName ? log.learnerName.charAt(0) : <User className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-brand-text truncate text-xs">
                              {log.learnerName || 'Unknown Learner'}
                            </span>
                            <span className="text-[10px] text-brand-brown-light font-mono mt-0.5">
                              {log.learnerId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action Type Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getActionBadgeStyle(log.action)}`}>
                          {log.action.toLowerCase().includes('approve') && <CheckCircle2 className="w-3 h-3" />}
                          {log.action.toLowerCase().includes('reject') && <XCircle className="w-3 h-3" />}
                          {log.action}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="px-6 py-4 text-brand-text font-medium leading-relaxed max-w-md truncate md:whitespace-normal">
                        {log.details}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-brand-bg-header border-t border-brand-border flex justify-between items-center text-xs text-brand-brown-light font-medium">
            <span>Showing {filteredLogs.length} of {logs.length} log events</span>
            <span>Refreshes automatically in real-time</span>
          </div>
        </div>
      )}
    </div>
  );
}
