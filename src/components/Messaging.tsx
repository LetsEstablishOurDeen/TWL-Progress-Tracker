import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Loader2 } from 'lucide-react';
import { Message, messageService } from '../services/messageService';
import { motion, AnimatePresence } from 'motion/react';

export function ChatWidget({ learnerId, learnerName, role, onClose }: { learnerId: string, learnerName: string, role: 'admin' | 'learner', onClose?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = messageService.subscribeToLearnerMessages(learnerId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // Mark as read when viewing
      messageService.markAsRead(learnerId, role);
    });
    return () => unsub();
  }, [learnerId, role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const currentText = text;
    setText('');
    await messageService.sendMessage(learnerId, role, currentText);
  };

  return (
    <div className="flex flex-col h-full bg-brand-white border border-brand-border rounded-xl shadow-xl overflow-hidden pointer-events-auto">
      <div className="bg-brand-brown text-white p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-bold">{role === 'admin' ? `Chat with ${learnerName}` : 'Admin Support'}</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-bg-alt">
        {loading ? (
          <div className="flex items-center justify-center h-full text-brand-brown/50">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-brand-brown-light gap-2 opacity-60">
            <MessageSquare className="w-8 h-8" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender === role;
            const showTail = i === messages.length - 1 || messages[i + 1].sender !== msg.sender;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[80%] px-4 py-2.5 text-sm ${isMe ? 'bg-brand-brown text-white rounded-2xl rounded-br-none shadow-sm' : 'bg-white border border-brand-border text-brand-text rounded-2xl rounded-bl-none shadow-sm'}`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[10px] text-brand-brown-light mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t border-brand-border flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-brand-bg-alt border border-brand-border rounded-full text-sm focus:outline-none focus:border-brand-brown focus:ring-1 focus:ring-brand-brown transition-all"
        />
        <button 
          type="submit"
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full bg-brand-brown text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-brown-dark transition-colors active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
