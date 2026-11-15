'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Clock, User, ArrowLeft, ArrowRight,
  PlusCircle, Pencil, RefreshCw, UserPlus, UserMinus, AlertCircle,
  AlertTriangle, Trash2, Wrench, Hammer, Coins, XCircle, Folder, Users,
  Search, Calendar, X
} from 'lucide-react';
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

const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
  bg,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  bg: string;
  sub?: string;
}) => (
  <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 flex items-center gap-3.5 min-w-0 transition-colors duration-200 hover:border-blue-200 shadow-none">
    <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border', bg)}>
      <Icon className={cn('w-5 h-5', accent)} />
    </div>
    <div className="min-w-0">
      <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{value}</div>
      <div className="text-xs text-slate-500 font-medium truncate">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">{sub}</div>}
    </div>
  </div>
);

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

function formatClockTime(ts: string) {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

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
  if (!ts) return 'Unknown Date';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'Unknown Date';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
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
  const [searchQuery, setSearchQuery] = useState('');

  const allEntries = useMemo(() => buildAuditLog(project), [project]);

  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      if (activeFilter !== 'all') {
        const meta = ACTION_META[e.action] || ACTION_META.Update;
        if (meta?.category !== activeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const detailsMatch = e.details?.toLowerCase().includes(q);
        const userMatch = e.userName?.toLowerCase().includes(q);
        const actionMatch = e.action?.toLowerCase().includes(q);
        const roleMatch = e.userRole?.toLowerCase().includes(q);
        if (!detailsMatch && !userMatch && !actionMatch && !roleMatch) return false;
      }
      return true;
    });
  }, [allEntries, activeFilter, searchQuery]);

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
    <div className="space-y-4 sm:space-y-5">
      {/* ── Header Info ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3.5 shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Project Audit Trail</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Immutable activity ledger and project execution history</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/60 text-slate-700">
            Total Logs: <span className="font-bold text-slate-900">{allEntries.length}</span>
          </span>
        </div>
      </div>

      {/* ── Stats Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Events"
          value={allEntries.length}
          icon={History}
          accent="text-blue-600"
          bg="bg-blue-50 border-blue-100"
          sub="immutable ledger entries"
        />
        <StatCard
          label="Issues Logged"
          value={totalByCategory.issues}
          icon={AlertCircle}
          accent="text-amber-600"
          bg="bg-amber-50 border-amber-100"
          sub="issue lifecycle events"
        />
        <StatCard
          label="Snags Recorded"
          value={totalByCategory.snags}
          icon={Wrench}
          accent="text-purple-600"
          bg="bg-purple-50 border-purple-100"
          sub="defect & punch actions"
        />
        <StatCard
          label="Financial Actions"
          value={totalByCategory.finance}
          icon={Coins}
          accent="text-emerald-600"
          bg="bg-emerald-50 border-emerald-100"
          sub="budget requests & approvals"
        />
      </div>

      {/* ── Filter chips & Search Toolbar ── */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-none">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide select-none flex-1 min-w-0">
          {FILTERS.map(f => {
            const isActive = activeFilter === f.key;
            const count = f.key === 'all' ? allEntries.length : totalByCategory[f.key];
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setActiveFilter(f.key);
                  setCurrentPage(1);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer select-none',
                  isActive
                    ? 'bg-blue-600 text-white shadow-none'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-slate-400")} />
                <span>{f.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[200px] sm:min-w-[240px] shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search audit trail..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="py-20 text-center bg-white border border-slate-200/80 rounded-xl shadow-none p-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">No activity logs found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No logs match "${searchQuery}". Try clearing your search.`
              : 'Changes, status transitions, and execution records will automatically appear here.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timeline Wrapper grouped by date */}
          <div className="relative pl-6 sm:pl-8 before:absolute before:top-4 before:bottom-4 before:left-2 sm:before:left-3 before:w-[2px] before:bg-slate-200">
            <AnimatePresence mode="popLayout">
              {Object.entries(grouped).map(([dateKey, entries]) => (
                <div key={dateKey} className="space-y-4">
                  {/* Date separator header */}
                  <div className="flex items-center gap-3 my-4 -ml-6 sm:-ml-8 relative z-10">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider shadow-none">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{dateKey}</span>
                    </div>
                    <div className="flex-1 h-px bg-slate-200/80" />
                  </div>

                  {entries.map((log, index) => {
                    const meta = ACTION_META[log.action] || ACTION_META.Update;
                    const ActionIcon = meta.icon;

                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="relative mb-4 last:mb-0 group"
                      >
                        {/* Dot Spine indicator */}
                        <div className={cn(
                          "absolute -left-[30px] sm:-left-[37px] top-4 w-4 h-4 rounded-full border-2 border-white ring-2 ring-slate-200 transition-transform group-hover:scale-125 z-10",
                          meta.dotColor
                        )} />

                        {/* Card Content */}
                        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-none hover:border-blue-300 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                "px-2.5 py-1 rounded-md border text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0",
                                meta.color
                              )}>
                                <ActionIcon className="w-3.5 h-3.5" />
                                {meta.label}
                              </span>
                              
                              {/* User tag with initials avatar */}
                              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {getInitials(log.userName)}
                                </div>
                                <span className="font-bold text-slate-900 truncate">
                                  {log.userName}
                                </span>
                                {log.userRole && (
                                  <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded shrink-0">
                                    {log.userRole}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium shrink-0 self-end sm:self-auto">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatClockTime(log.timestamp)}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">{formatTime(log.timestamp)}</span>
                            </div>
                          </div>

                          {/* Log details */}
                          <p className="text-xs sm:text-sm text-slate-700 mt-2.5 font-normal leading-relaxed">
                            {log.details}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 bg-white border border-slate-200/80 rounded-xl p-3 shadow-none">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              
              <span className="text-xs font-medium text-slate-500">
                Page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
                <span className="hidden sm:inline text-slate-400 ml-1.5">({totalItems} entries)</span>
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
