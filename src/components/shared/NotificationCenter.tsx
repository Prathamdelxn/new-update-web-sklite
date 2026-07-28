'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle2, AlertTriangle, FileText, Briefcase, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  _id: string;
  type: 'issue' | 'boq' | 'budget' | 'project' | 'risk' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  href?: string;
}

const typeConfig = {
  issue: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  boq: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  budget: { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  project: { icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  risk: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  general: { icon: Bell, color: 'text-slate-600', bg: 'bg-gray-50 border-gray-200' },
};

export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {} finally {
      setMarkingAll(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-slate-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div>
                <p className="text-sm font-bold text-gray-900">Notifications</p>
                {unread > 0 && <p className="text-[10px] text-blue-600 font-semibold">{unread} unread</p>}
              </div>
              <div className="flex items-center space-x-2">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={markingAll}
                    className="flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    <span>Mark all read</span>
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-gray-900 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-10 px-4 text-center">
                  <Bell className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-slate-500">You're all caught up!</p>
                  <p className="text-[10px] text-slate-400 mt-1">No new notifications.</p>
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = typeConfig[n.type] || typeConfig.general;
                  return (
                    <button
                      key={n._id}
                      onClick={() => markRead(n._id)}
                      className={cn(
                        'w-full flex items-start space-x-3 px-4 py-3 border-b border-gray-50 last:border-0 text-left transition-colors',
                        n.isRead ? 'hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50'
                      )}
                    >
                      <div className={cn('p-2 rounded-xl border shrink-0 mt-0.5', cfg.bg)}>
                        <cfg.icon className={cn('w-3.5 h-3.5', cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-semibold truncate', n.isRead ? 'text-gray-700' : 'text-gray-900')}>{n.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
