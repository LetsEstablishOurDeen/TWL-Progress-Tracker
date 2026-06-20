import React, { useState } from 'react';
import { Learner } from '../types';
import { ChatWidget } from './Messaging';
import { MessageSquare, Search } from 'lucide-react';

export function AdminMessaging({ learners, unreadCounts }: { learners: Learner[], unreadCounts: Record<string, number> }) {
  const [activeLearnerId, setActiveLearnerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activeLearner = learners.find(l => l.id === activeLearnerId);
  const sortedLearners = [...learners].sort((a, b) => {
    // Sort by unread messages first
    const unreadA = unreadCounts[a.id] || 0;
    const unreadB = unreadCounts[b.id] || 0;
    if (unreadA !== unreadB) return unreadB - unreadA;
    return a.fullName.localeCompare(b.fullName);
  });

  const filteredLearners = sortedLearners.filter(l => 
    l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.id.includes(searchTerm)
  );

  return (
    <div className="flex h-[600px] bg-brand-white rounded-2xl border border-brand-border overflow-hidden">
      {/* Sidebar list of learners */}
      <div className="w-1/3 border-r border-brand-border flex flex-col bg-brand-bg-alt">
        <div className="p-4 border-b border-brand-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-brown-light" />
            <input 
              type="text" 
              placeholder="Search learners..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-brand-brown"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredLearners.map(learner => {
            const hasUnread = (unreadCounts[learner.id] || 0) > 0;
            return (
              <button
                key={learner.id}
                onClick={() => setActiveLearnerId(learner.id)}
                className={`w-full p-4 flex items-center justify-between border-b border-brand-border hover:bg-brand-brown/5 transition-colors text-left ${activeLearnerId === learner.id ? 'bg-brand-brown/10' : ''}`}
              >
                <div>
                  <h4 className={`font-bold text-sm ${hasUnread ? 'text-brand-text' : 'text-brand-text/80'}`}>{learner.fullName}</h4>
                  <span className="text-[10px] font-mono text-brand-brown-light">{learner.id}</span>
                </div>
                {hasUnread && (
                  <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center font-bold rounded-full">
                    {unreadCounts[learner.id]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 bg-brand-bg relative">
        {activeLearner ? (
          <ChatWidget 
            learnerId={activeLearner.id} 
            learnerName={activeLearner.fullName} 
            role="admin" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-brand-brown-light/60">
            <MessageSquare className="w-12 h-12 mb-4" />
            <p className="text-lg font-serif">Select a learner to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
