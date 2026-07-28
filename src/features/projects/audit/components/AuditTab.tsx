'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Clock, User, ArrowLeft, ArrowRight,
  PlusCircle, Pencil, RefreshCw, UserPlus, UserMinus, AlertCircle,
  AlertTriangle, Trash2, Wrench, Hammer, Coins, XCircle, Folder, Users
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency } from '@/lib/utils';

interface AuditTrailEntry {
  id: string;
  action: string;
  details: string;
  userName: string;
  userRole?: string | null;
  timestamp: string;
}

interface AuditTabProps {
  project: any;
}

const ITEMS_PER_PAGE = 10;

const ACTION_META: Record<string, { icon: React.ElementType; color: string; dotColor: string; label: string; category: string }> = {
  // Project-level
  Create:         { icon: PlusCircle,     color: 'text-blue-700 bg-blue-50 border-blue-200', dotColor: 'bg-blue-500 ring-blue-100', label: 'Created',          category: 'project' },
  Update:         { icon: Pencil,         color: 'text-blue-700 bg-blue-50 border-blue-200', dotColor: 'bg-blue-500 ring-blue-100', label: 'Updated',          category: 'project' },
  StatusChange:   { icon: RefreshCw,      color: 'text-blue-700 bg-blue-50 border-blue-200', dotColor: 'bg-blue-500 ring-blue-100', label: 'Status Changed',   category: 'project' },
  // Members
  MemberAdded:    { icon: UserPlus,       color: 'text-sky-700 bg-sky-50 border-sky-200', dotColor: 'bg-sky-500 ring-sky-100', label: 'Member Added',     category: 'members' },
  MemberRemoved:  { icon: UserMinus,      color: 'text-amber-700 bg-amber-50 border-amber-200', dotColor: 'bg-amber-500 ring-amber-100', label: 'Member Removed',   category: 'members' },
  // Issues
  IssueAdded:     { icon: AlertCircle,    color: 'text-red-700 bg-red-50 border-red-200', dotColor: 'bg-red-500 ring-red-100', label: 'Issue Raised',     category: 'issues'  },
  IssueUpdated:   { icon: AlertTriangle,  color: 'text-orange-700 bg-orange-50 border-orange-200', dotColor: 'bg-orange-500 ring-orange-100', label: 'Issue Updated',    category: 'issues'  },
  IssueDeleted:   { icon: Trash2,         color: 'text-red-700 bg-red-50 border-red-200', dotColor: 'bg-red-500 ring-red-100', label: 'Issue Deleted',    category: 'issues'  },
  // Snags
  SnagAdded:      { icon: Wrench,         color: 'text-orange-700 bg-orange-50 border-orange-200', dotColor: 'bg-orange-500 ring-orange-100', label: 'Snag Reported',    category: 'snags'   },
  SnagUpdated:    { icon: Hammer,         color: 'text-amber-700 bg-amber-50 border-amber-200', dotColor: 'bg-amber-500 ring-amber-100', label: 'Snag Updated',     category: 'snags'   },
  SnagDeleted:    { icon: Trash2,         color: 'text-red-700 bg-red-50 border-red-200', dotColor: 'bg-red-500 ring-red-100', label: 'Snag Deleted',     category: 'snags'   },
  // Risks
  RiskAdded:      { icon: AlertTriangle,  color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dotColor: 'bg-yellow-500 ring-yellow-100', label: 'Risk Logged',      category: 'risks'   },
  RiskUpdated:    { icon: AlertTriangle,  color: 'text-amber-700 bg-amber-50 border-amber-200', dotColor: 'bg-amber-500 ring-amber-100', label: 'Risk Updated',     category: 'risks'   },
  RiskDeleted:    { icon: Trash2,         color: 'text-red-700 bg-red-50 border-red-200', dotColor: 'bg-red-500 ring-red-100', label: 'Risk Deleted',     category: 'risks'   },
  // Budget
  BudgetPending:  { icon: Clock,          color: 'text-amber-700 bg-amber-50 border-amber-200', dotColor: 'bg-amber-500 ring-amber-100', label: 'Budget Requested', category: 'finance' },
  BudgetApproved: { icon: Coins,          color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dotColor: 'bg-emerald-500 ring-emerald-100', label: 'Budget Approved',  category: 'finance' },
  BudgetRejected: { icon: XCircle,        color: 'text-red-700 bg-red-50 border-red-200', dotColor: 'bg-red-500 ring-red-100', label: 'Budget Rejected',  category: 'finance' },
};

const FILTERS = [
  { key: 'all',     label: 'All',     icon: History },
  { key: 'project', label: 'Project', icon: Folder },
  { key: 'issues',  label: 'Issues',  icon: AlertCircle },
  { key: 'snags',   label: 'Snags',   icon: Wrench },
  { key: 'risks',   label: 'Risks',   icon: AlertTriangle },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'finance', label: 'Finance', icon: Coins },
];

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}



function buildAuditLog(project: any) {
  const entries: AuditTrailEntry[] = [];

  // From auditTrail
  (project?.auditTrail || []).forEach((a: any) => {
    entries.push({
      id: `audit-${a._id || Math.random()}`,
      action: a.action || 'Update',
      details: a.details,
      userName: a.userName || 'System',
      userRole: a.userRole,
      timestamp: a.timestamp || a.createdAt,
    });
  });

  // From budgetHistory
  (project?.budgetHistory || []).forEach((b: any) => {
    const actionKey =
      b.approvalStatus === 'Approved' ? 'BudgetApproved' :
      b.approvalStatus === 'Rejected' ? 'BudgetRejected' : 'BudgetPending';

    entries.push({
      id: `budget-${b._id || Math.random()}`,
      action: actionKey,
      details: `${formatCurrency(Number(b.amount), project?.currency || '$')} — ${b.reason}`,
      userName: b.updatedByName || 'System',
      userRole: null,
      timestamp: b.timestamp || b.createdAt,
    });
  });

  // Sort newest first
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const AuditTab: React.FC<AuditTabProps> = ({ project }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState('all');

  const allEntries = useMemo(() => buildAuditLog(project), [project]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return allEntries;
    return allEntries.filter(e => {
      const meta = ACTION_META[e.action] || ACTION_META.Update;
      return meta?.category === activeFilter;
    });
  }, [allEntries, activeFilter]);

  const totalByCategory = useMemo(() => {
    const counts: Record<string, number> = { project: 0, issues: 0, snags: 0, risks: 0, members: 0, finance: 0 };
    allEntries.forEach(e => {
      const cat = (ACTION_META[e.action] || ACTION_META.Update)?.category;
      if (cat && counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    return counts;
  }, [allEntries]);

  // Adjust pagination when filters change
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Group page entries by date
  const grouped = useMemo(() => {
    const groups: Record<string, AuditTrailEntry[]> = {};
    paginatedLogs.forEach(e => {
      const dateKey = formatDate(e.timestamp);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [paginatedLogs]);

  return (
    <div className="space-y-6 px-1 sm:px-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            Project Audit Trail
          </h3>
          <p className="text-sm text-slate-500 mt-1">Immutable transaction ledger and execution history.</p>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-xl border text-slate-600 self-start sm:self-auto shrink-0">
          Total Logs: <span className="font-black text-slate-900">{allEntries.length}</span>
        </div>
      </div>

      {/* Stats Cards Row (matching mobile stats row) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-gray-200" gradient>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Total Events</p>
          <p className="text-2xl font-black text-blue-600">{allEntries.length}</p>
        </GlassCard>
        <GlassCard className="p-4 border-gray-200" gradient>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Issues</p>
          <p className="text-2xl font-black text-red-600">{totalByCategory.issues}</p>
        </GlassCard>
        <GlassCard className="p-4 border-gray-200" gradient>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Snags</p>
          <p className="text-2xl font-black text-orange-600">{totalByCategory.snags}</p>
        </GlassCard>
        <GlassCard className="p-4 border-gray-200" gradient>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Finance</p>
          <p className="text-2xl font-black text-emerald-600">{totalByCategory.finance}</p>
        </GlassCard>
      </div>

      {/* Filter chips with counts (matching mobile filters) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          const count = f.key === 'all' ? allEntries.length : totalByCategory[f.key];
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => {
                setActiveFilter(f.key);
                setCurrentPage(1);
              }}
              className={cn(
                'flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0',
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350 hover:text-slate-900'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{f.label}</span>
              {count > 0 && (
                <span className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none',
                  isActive ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-600'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {totalItems === 0 ? (
        <GlassCard className="py-24 text-center border-gray-200" gradient>
          <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">No activity logs recorded yet.</p>
          <p className="text-slate-400 text-xs mt-1">Changes and executions will appear here automatically.</p>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {/* Timeline Wrapper grouped by date */}
          <div className="relative pl-6 sm:pl-8 before:absolute before:top-4 before:bottom-4 before:left-2 sm:before:left-3 before:w-[2px] before:bg-slate-200">
            <AnimatePresence mode="popLayout">
              {Object.entries(grouped).map(([dateKey, entries]) => (
                <div key={dateKey} className="space-y-4">
                  {/* Date separator header (matching mobile) */}
                  <div className="flex items-center space-x-3 my-4 -ml-4 relative z-10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 border border-slate-150 rounded-lg">
                      {dateKey}
                    </span>
                  </div>

                  {entries.map((log, index) => {
                    const meta = ACTION_META[log.action] || ACTION_META.Update;
                    const ActionIcon = meta.icon;
                    const timestamp = log.timestamp;
                    const formattedTime = timestamp
                      ? new Date(timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'TBD';

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ duration: 0.25, delay: index * 0.04 }}
                        className="relative mb-6 last:mb-0 group"
                      >
                        {/* Dot Spine indicator */}
                        <div className={cn(
                          "absolute -left-[30px] sm:-left-[37px] top-1.5 w-4 h-4 rounded-full ring-4 transition-all group-hover:scale-110",
                          meta.dotColor
                        )} />

                        {/* Card Content */}
                        <GlassCard className="p-4 sm:p-5 border-gray-200 hover:border-blue-500/30 transition-all shadow-sm" gradient>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                "px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0",
                                meta.color
                              )}>
                                <ActionIcon className="w-3.5 h-3.5" />
                                {meta.label}
                              </span>
                              
                              {/* User tag */}
                              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-semibold truncate">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-slate-800 font-bold truncate max-w-[100px] sm:max-w-none">
                                  {log.userName}
                                </span>
                                {log.userRole && (
                                  <span className="text-[9px] uppercase tracking-wider text-slate-400 border border-slate-100 bg-slate-50 px-1.5 py-0.5 rounded shrink-0">
                                    {log.userRole}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              {formattedTime}
                            </div>
                          </div>

                          {/* Log details */}
                          <p className="text-xs sm:text-sm text-gray-800 mt-3 font-medium leading-relaxed">
                            {log.details}
                          </p>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              
              <span className="text-xs font-semibold text-slate-500">
                Page <span className="font-black text-slate-900">{currentPage}</span> of <span className="font-black text-slate-900">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
