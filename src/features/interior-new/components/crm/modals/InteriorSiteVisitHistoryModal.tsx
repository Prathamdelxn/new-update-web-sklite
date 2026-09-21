'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, History, Calendar, Clock, User, MapPin, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteriorSiteVisitHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: any[];
  users: any[];
  leadName?: string;
  leadLocation?: string;
  onReschedule?: () => void;
  isReadOnly?: boolean;
}

export function InteriorSiteVisitHistoryModal({
  isOpen,
  onClose,
  activities = [],
  users = [],
  leadName,
  leadLocation,
  onReschedule,
  isReadOnly = false,
}: InteriorSiteVisitHistoryModalProps) {
  if (!isOpen) return null;

  // Helper to resolve user names
  const getUserDisplayName = (userRef: any) => {
    if (!userRef) return 'Assigned Member';
    const uId = typeof userRef === 'object' ? userRef._id || userRef.id || userRef.clerkUserId : userRef;
    const matched = users.find((u) => u._id === uId || u.id === uId || u.clerkUserId === uId);
    if (matched) {
      return matched.fullName || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.name || 'Team Member';
    }
    if (typeof userRef === 'object') {
      return userRef.fullName || `${userRef.firstName || ''} ${userRef.lastName || ''}`.trim() || userRef.name || 'Team Member';
    }
    return 'Team Member';
  };

  // Filter and sort all true site visit schedule appointments
  const siteVisits = React.useMemo(() => {
    const list = (activities || [])
      .filter(
        (a) =>
          a.type === 'Site Visit' &&
          a.scheduledDate &&
          !a.remarks?.toLowerCase().includes('recorded full measurements') &&
          !a.remarks?.toLowerCase().includes('updated site measurements') &&
          !a.remarks?.toLowerCase().includes('completed site visit survey')
      )
      .sort((a, b) => {
        const timeA = new Date(a.scheduledDate || a.createdAt).getTime();
        const timeB = new Date(b.scheduledDate || b.createdAt).getTime();
        return timeB - timeA;
      });

    const seen = new Set<string>();
    const distinct: any[] = [];
    for (const a of list) {
      const timeKey = new Date(a.scheduledDate).toISOString().slice(0, 16);
      if (!seen.has(timeKey)) {
        seen.add(timeKey);
        distinct.push(a);
      }
    }
    return distinct;
  }, [activities]);

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-5 sm:p-7 shadow-2xl z-[70] max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shrink-0">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                  Previous Site Visit Schedules
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  {siteVisits.length} {siteVisits.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-0.5" title={leadName ? `Site history for ${leadName}` : ''}>
                Full schedule history, assigned site members, and instructions {leadName ? `for ${leadName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Timeline Content List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          {siteVisits.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center bg-[hsl(var(--muted)/0.2)] border border-dashed border-[hsl(var(--border))] rounded-2xl">
              <Calendar className="w-10 h-10 text-[hsl(var(--muted-foreground))] opacity-40 mb-2" />
              <p className="text-sm font-bold text-[hsl(var(--foreground))]">No Previous Site Visit Records</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 max-w-sm">
                When site visits are scheduled or rescheduled, the full audit trail and previous dates will appear here.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-[hsl(var(--border))] ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-4">
              {siteVisits.map((item, idx) => {
                const assignedName = getUserDisplayName(item.user);
                const isItemPending = item.status === 'Pending';
                const isOverdue = Boolean(
                  isItemPending &&
                    item.scheduledDate &&
                    new Date(item.scheduledDate).getTime() < Date.now()
                );
                const isLatest = idx === 0;

                return (
                  <div key={item._id || idx} className="relative group">
                    {/* Bullet node on timeline */}
                    <div
                      className={cn(
                        "absolute -left-[1.35rem] sm:-left-[1.85rem] top-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[hsl(var(--card))] flex items-center justify-center",
                        isLatest
                          ? isOverdue
                            ? "bg-rose-500"
                            : "bg-purple-600"
                          : "bg-slate-400 dark:bg-slate-600"
                      )}
                    />

                    {/* Schedule Card */}
                    <div
                      className={cn(
                        "border rounded-2xl p-4 transition-all space-y-3",
                        isLatest
                          ? isOverdue
                            ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/30"
                            : "bg-purple-500/[0.04] hover:bg-purple-500/[0.08] border-purple-500/30"
                          : "bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.5)] border-[hsl(var(--border))]"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[hsl(var(--border)/0.6)]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="p-1 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                            <MapPin size={12} className={isLatest ? "text-purple-600" : "text-[hsl(var(--muted-foreground))]"} />
                          </span>
                          <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                            {isLatest ? 'Current / Latest Schedule' : `Previous Schedule #${siteVisits.length - idx}`}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                              isOverdue
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : item.status === 'Completed'
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : isLatest
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                            )}
                          >
                            {isOverdue
                              ? 'Overdue'
                              : item.status === 'Completed'
                              ? 'Survey Completed'
                              : isLatest
                              ? 'Active Schedule'
                              : 'Archived / Past'}
                          </span>
                        </div>

                        {item.scheduledDate && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--foreground))] font-bold">
                            <Clock size={12} className={isOverdue ? "text-rose-500" : "text-purple-600"} />
                            <span>
                              {new Date(item.scheduledDate).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Instructions / Notes */}
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                          <MessageSquare size={11} className="text-purple-600" /> Instructions / Site Notes:
                        </p>
                        <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {item.remarks || 'No specific instructions entered.'}
                        </p>
                      </div>

                      {/* Footer Metadata */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-blue-500" /> Assigned: <strong className="text-[hsl(var(--foreground))]">{assignedName}</strong>
                        </span>
                        {item.createdAt && (
                          <span>
                            Logged on: {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Showing all site survey appointments.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
            {!isReadOnly && onReschedule && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReschedule();
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Calendar size={13} /> Reschedule Site Visit
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
