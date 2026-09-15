'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Enterprise Audit Management
// Clean, corporate audit ledger table with live search, filters, export,
// and comprehensive change diff inspection modal.
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  Clock,
  Users,
  AlertTriangle,
  Lock,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  FileText,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  FolderKanban,
  FileSpreadsheet,
  Globe,
  Copy,
  Check,
  Activity,
  Building2,
  DollarSign,
  TrendingUp,
  FileCode,
} from 'lucide-react';
import { Card, CardContent, Button, Input } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';
import {
  interiorAuditService,
  AuditLogItem,
  AuditStats,
  AuditUser,
} from '@/services/interiorAudit.service';

// ── Action Visual Configuration ──────────────────────────────────────────────
const ACTION_THEMES: Record<
  string,
  { label: string; badgeClass: string; dotClass: string; icon: React.ElementType; color: string }
> = {
  create: {
    label: 'Created',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    dotClass: 'bg-emerald-500',
    icon: CheckCircle2,
    color: '#10b981',
  },
  update: {
    label: 'Updated',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
    dotClass: 'bg-blue-500',
    icon: RefreshCw,
    color: '#3b82f6',
  },
  delete: {
    label: 'Deleted',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    dotClass: 'bg-rose-500',
    icon: AlertTriangle,
    color: '#f43f5e',
  },
  approve: {
    label: 'Approved',
    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
    dotClass: 'bg-teal-500',
    icon: CheckCircle2,
    color: '#14b8a6',
  },
  reject: {
    label: 'Rejected',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    dotClass: 'bg-amber-500',
    icon: XCircle,
    color: '#f59e0b',
  },
  login: {
    label: 'Login Session',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
    dotClass: 'bg-purple-500',
    icon: LogIn,
    color: '#a855f7',
  },
  logout: {
    label: 'Logout',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25',
    dotClass: 'bg-slate-500',
    icon: LogOut,
    color: '#64748b',
  },
  export: {
    label: 'Data Export',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
    dotClass: 'bg-cyan-500',
    icon: FileSpreadsheet,
    color: '#06b6d4',
  },
  upload: {
    label: 'File Upload',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
    dotClass: 'bg-indigo-500',
    icon: Layers,
    color: '#6366f1',
  },
  download: {
    label: 'File Download',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
    dotClass: 'bg-sky-500',
    icon: Download,
    color: '#0ea5e9',
  },
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  Project: FolderKanban,
  Task: Layers,
  User: Users,
  Authentication: Lock,
  CRM: Users,
  Quotation: DollarSign,
  BOQ: FileSpreadsheet,
  Milestone: Clock,
  Procurement: Building2,
  Drawing: FileText,
  Financials: DollarSign,
};

const QUICK_SEGMENTS = [
  { id: 'all', label: 'All Activities' },
  { id: 'Project', label: 'Projects', entity: 'Project' },
  { id: 'CRM', label: 'CRM & Quotes', entity: 'CRM' },
  { id: 'User', label: 'Users & Roles', entity: 'User' },
  { id: 'Authentication', label: 'Auth & Logins', entity: 'Authentication' },
  { id: 'delete', label: 'Deletions', action: 'delete' },
];

export default function InteriorAuditManagementView() {
  const toast = useToast();
  const { isOrgAdmin, currentUser } = usePermissions();

  // State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Pagination & Filters
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Helper to generate smart pagination range with ellipsis
  const paginationRange = useMemo<(number | string)[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  }, [page, totalPages]);

  const [activeSegment, setActiveSegment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('All Modules');
  const [dateRange, setDateRange] = useState<string>('all');

  // Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'diff' | 'security' | 'json'>('overview');
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(
    async (isManualRefresh = false) => {
      if (currentUser && !isOrgAdmin) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        const params: Record<string, any> = {
          page,
          limit,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (selectedAction !== 'all') params.action = selectedAction;
        if (selectedEntity !== 'All Modules') params.entity = selectedEntity;

        if (dateRange === 'today') {
          const today = new Date().toISOString().split('T')[0];
          params.startDate = today;
        } else if (dateRange === '7days') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          params.startDate = d.toISOString().split('T')[0];
        } else if (dateRange === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          params.startDate = d.toISOString().split('T')[0];
        }

        const res = await interiorAuditService.getAuditLogs(params);

        if (res.success && res.data) {
          setLogs(res.data.logs || []);
          setStats(res.data.stats || null);
          setTotalCount(res.data.meta?.total || 0);
          setTotalPages(res.data.meta?.totalPages || 1);
        }
      } catch (err: any) {
        console.error('Failed to fetch audit logs:', err);
        toast.error('Unable to load audit logs. Please check connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUser, isOrgAdmin, page, limit, searchTerm, selectedAction, selectedEntity, dateRange, toast]
  );

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  if (currentUser && !isOrgAdmin) {
    return (
      <div className="p-12 text-center bg-card rounded-2xl border border-border">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground">Access Restricted</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Only administrators have permission to view the audit management section.
        </p>
      </div>
    );
  }

  // Handle Quick Segment Switch
  const handleSegmentChange = (seg: (typeof QUICK_SEGMENTS)[number]) => {
    setActiveSegment(seg.id);
    setPage(1);
    if (seg.id === 'all') {
      setSelectedEntity('All Modules');
      setSelectedAction('all');
    } else if (seg.entity) {
      setSelectedEntity(seg.entity);
      setSelectedAction('all');
    } else if (seg.action) {
      setSelectedAction(seg.action);
      setSelectedEntity('All Modules');
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.info('No audit records available to export.');
      return;
    }

    try {
      const headers = ['Event ID', 'Date & Time', 'Action', 'Module', 'Entity Name', 'Description', 'Actor Name', 'Actor Email', 'IP Address'];
      const rows = logs.map((log) => {
        const actor = typeof log.userId === 'object' && log.userId ? (log.userId as AuditUser) : null;
        const actorName = actor ? `${actor.firstName} ${actor.lastName}` : 'System Automation';
        const actorEmail = actor ? actor.email : 'system@interioros.local';

        return [
          `"${log._id}"`,
          `"${new Date(log.createdAt).toLocaleString()}"`,
          `"${log.action.toUpperCase()}"`,
          `"${log.entity}"`,
          `"${(log.entityName || '').replace(/"/g, '""')}"`,
          `"${(log.description || '').replace(/"/g, '""')}"`,
          `"${actorName.replace(/"/g, '""')}"`,
          `"${actorEmail}"`,
          `"${log.ipAddress || 'Internal'}"`,
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `audit_trail_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Audit log export downloaded successfully.');
    } catch (e) {
      toast.error('Failed to generate export file.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="interior-os-theme p-4 lg:p-6 space-y-4 gradient-mesh min-h-full">
      {/* ── Executive Header Ribbon ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-2.5">
            Audit Management
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
              {totalCount} events logged
            </span>
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Complete organizational activity records, privilege monitoring, state change diffs, and access history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAuditLogs(true)}
            disabled={refreshing || loading}
            className="gap-1.5 h-8.5 text-xs bg-[hsl(var(--card))] shadow-xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            <span>Sync</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 h-8.5 text-xs shadow-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Quick Segment Filter Bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {QUICK_SEGMENTS.map((seg) => {
          const isActive = activeSegment === seg.id;
          return (
            <button
              key={seg.id}
              onClick={() => handleSegmentChange(seg)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                isActive
                  ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))] shadow-xs'
                  : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground)/0.3)]'
              )}
            >
              {seg.label}
            </button>
          );
        })}
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Input
                placeholder="Search description, actor, module, entity or IP..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                icon={<Search className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
                className="bg-[hsl(var(--background))] h-9 rounded-lg text-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Action Type Dropdown */}
            <div className="md:col-span-2">
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setActiveSegment('custom');
                  setPage(1);
                }}
                className="w-full h-9 px-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              >
                <option value="all">All Actions</option>
                <option value="create">Created</option>
                <option value="update">Updated</option>
                <option value="delete">Deleted</option>
                <option value="approve">Approved</option>
                <option value="reject">Rejected</option>
                <option value="login">User Login</option>
                <option value="export">Data Export</option>
              </select>
            </div>

            {/* Module Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setActiveSegment('custom');
                  setPage(1);
                }}
                className="w-full h-9 px-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              >
                <option value="All Modules">All Target Modules</option>
                <option value="Project">Project Config</option>
                <option value="Task">Tasks & WBS</option>
                <option value="User">User Accounts</option>
                <option value="Authentication">Security & Auth</option>
                <option value="CRM">CRM & Pipeline</option>
                <option value="Quotation">Quotations & Pricing</option>
                <option value="BOQ">BOQ Estimations</option>
                <option value="Milestone">Milestones</option>
                <option value="Procurement">Procurement & POs</option>
              </select>
            </div>

            {/* Date Preset */}
            <div className="md:col-span-2">
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 px-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table Ledger View ────────────────────────────────────────────────── */}
      {loading ? (
        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl shadow-xs">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-7 h-7 text-[hsl(var(--primary))] animate-spin mb-3" />
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Querying Audit Ledger...</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Synchronizing cryptographically sequenced events
            </p>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl shadow-xs">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center mb-3 border border-[hsl(var(--border))]">
              <ShieldCheck className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No audit records found</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mt-1">
              No matching activity events match your active filters or search terms.
            </p>
            {(searchTerm || selectedAction !== 'all' || selectedEntity !== 'All Modules' || dateRange !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg font-semibold text-xs h-8"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedAction('all');
                  setSelectedEntity('All Modules');
                  setDateRange('all');
                  setActiveSegment('all');
                  setPage(1);
                }}
              >
                Reset All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ── UNIFIED TABLE & PAGINATION CONTAINER ────────────────────────────── */
        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor / User</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4">Origin / Device</th>
                  <th className="py-3 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {logs.map((log) => {
                  const actionCfg = ACTION_THEMES[log.action] || {
                    label: log.action,
                    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                    dotClass: 'bg-slate-500',
                    icon: Layers,
                    color: '#94a3b8',
                  };
                  const ActionIcon = actionCfg.icon;

                  const EntityIcon = ENTITY_ICONS[log.entity] || FolderKanban;

                  const actor = typeof log.userId === 'object' && log.userId ? (log.userId as AuditUser) : null;
                  const actorName = actor ? `${actor.firstName} ${actor.lastName}` : 'System Automation';
                  const actorEmail = actor ? actor.email : 'system@interioros.local';

                  const dateObj = new Date(log.createdAt);
                  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                  return (
                    <tr
                      key={log._id}
                      onClick={() => {
                        setSelectedLog(log);
                        setModalTab('overview');
                      }}
                      className="hover:bg-[hsl(var(--accent)/0.4)] transition-colors group cursor-pointer"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-[hsl(var(--foreground))] text-xs">{formattedDate}</div>
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">{formattedTime}</div>
                      </td>

                      {/* Actor Profile */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                            {actorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[hsl(var(--foreground))] truncate max-w-[140px]">
                              {actorName}
                            </div>
                            <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate max-w-[140px]">
                              {actorEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs',
                            actionCfg.badgeClass
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', actionCfg.dotClass)} />
                          <ActionIcon className="w-3 h-3" />
                          <span>{actionCfg.label}</span>
                        </span>
                      </td>

                      {/* Module & Target Entity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">
                            <EntityIcon className="w-3 h-3" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-[hsl(var(--foreground))] block">{log.entity}</span>
                            {log.entityName && (
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate max-w-[130px] block">
                                {log.entityName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4">
                        <p className="text-xs text-[hsl(var(--foreground))] line-clamp-1 max-w-[340px] font-medium">
                          {log.description || `${log.action} performed on ${log.entity}`}
                        </p>
                      </td>

                      {/* IP & Origin */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                          <Globe className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                          <span>{log.ipAddress || '127.0.0.1'}</span>
                        </div>
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 rounded-md text-[11px] font-bold gap-1 shadow-2xs bg-[hsl(var(--card))] group-hover:border-[hsl(var(--primary))]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                            setModalTab('overview');
                          }}
                        >
                          <Eye className="w-3 h-3 text-[hsl(var(--primary))]" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Integrated Pagination Footer */}
          <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: Range and Rows per Page */}
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                Showing <strong className="text-[hsl(var(--foreground))]">{(page - 1) * limit + 1}</strong> –{' '}
                <strong className="text-[hsl(var(--foreground))]">{Math.min(page * limit, totalCount)}</strong> of{' '}
                <strong className="text-[hsl(var(--foreground))]">{totalCount}</strong> records
              </p>

              <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 px-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-bold text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right: Page Buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              {/* First Page */}
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                title="First Page"
                className="w-7 h-7 rounded-md flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Prev Page */}
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                title="Previous Page"
                className="w-7 h-7 rounded-md flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Pills */}
              {paginationRange.map((item: number | string, index: number) => {
                if (item === '...') {
                  return (
                    <span
                      key={`ellipsis-${index}`}
                      className="w-7 h-7 flex items-center justify-center text-[11px] font-bold text-[hsl(var(--muted-foreground))]"
                    >
                      ...
                    </span>
                  );
                }

                const pageNum = Number(item);
                const isActive = page === pageNum;

                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'min-w-[28px] h-7 px-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer border',
                      isActive
                        ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-2xs'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                title="Next Page"
                className="w-7 h-7 rounded-md flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                title="Last Page"
                className="w-7 h-7 rounded-md flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Granular Audit Inspector Modal / Drawer ─────────────────────────── */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-[hsl(var(--card-foreground))]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                      <span>Audit Ledger Inspector</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                        #{selectedLog._id.slice(-6)}
                      </span>
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Recorded on {new Date(selectedLog.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2))}
                    className="h-8.5 rounded-xl text-xs font-bold gap-1.5"
                  >
                    {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
                  </Button>

                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center gap-2 px-6 pt-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <button
                  onClick={() => setModalTab('overview')}
                  className={cn(
                    'pb-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-[1px]',
                    modalTab === 'overview'
                      ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Overview & Actor</span>
                </button>

                <button
                  onClick={() => setModalTab('diff')}
                  className={cn(
                    'pb-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-[1px]',
                    modalTab === 'diff'
                      ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  )}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>State Changes Diff</span>
                </button>

                <button
                  onClick={() => setModalTab('security')}
                  className={cn(
                    'pb-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-[1px]',
                    modalTab === 'security'
                      ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Security & Network</span>
                </button>

                <button
                  onClick={() => setModalTab('json')}
                  className={cn(
                    'pb-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-[1px]',
                    modalTab === 'json'
                      ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                      : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  )}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Raw Payload</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {modalTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Overview Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-[hsl(var(--accent)/0.5)] border border-[hsl(var(--border))] text-xs">
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                          Action Code
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] uppercase text-sm mt-0.5 block">
                          {selectedLog.action}
                        </span>
                      </div>
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                          Target Module
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] text-sm mt-0.5 block">
                          {selectedLog.entity}
                        </span>
                      </div>
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                          Entity Identifier
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] text-sm mt-0.5 block truncate">
                          {selectedLog.entityName || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                          IP Origin
                        </span>
                        <span className="font-mono font-bold text-[hsl(var(--foreground))] text-xs mt-0.5 block">
                          {selectedLog.ipAddress || 'Internal Network'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                          Timestamp
                        </span>
                        <span className="font-medium text-[hsl(var(--foreground))] text-xs mt-0.5 block">
                          {new Date(selectedLog.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                          Object ID
                        </span>
                        <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 block truncate">
                          {selectedLog.entityId || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Actor Details Card */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Authenticated Actor
                      </h4>
                      <div className="p-4 rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] text-white flex items-center justify-center font-bold text-base shadow-xs">
                            {typeof selectedLog.userId === 'object' && selectedLog.userId
                              ? (selectedLog.userId as AuditUser).firstName.charAt(0).toUpperCase()
                              : 'S'}
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-[hsl(var(--foreground))]">
                              {typeof selectedLog.userId === 'object' && selectedLog.userId
                                ? `${(selectedLog.userId as AuditUser).firstName} ${(selectedLog.userId as AuditUser).lastName}`
                                : 'System Automated Service'}
                            </h5>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                              {typeof selectedLog.userId === 'object' && selectedLog.userId
                                ? (selectedLog.userId as AuditUser).email
                                : 'system@interioros.local'}
                            </p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))]">
                          Role: {(selectedLog.userId as AuditUser)?.systemRole || 'org_admin'}
                        </span>
                      </div>
                    </div>

                    {/* Description Card */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        Event Narrative
                      </h4>
                      <div className="p-4 rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-sm font-semibold text-[hsl(var(--foreground))]">
                        {selectedLog.description}
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'diff' && (
                  <div className="space-y-4">
                    {selectedLog.changes?.before || selectedLog.changes?.after ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Previous State (Before)
                          </span>
                          <pre className="text-xs font-mono p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-[hsl(var(--foreground))] overflow-x-auto max-h-80">
                            {selectedLog.changes.before
                              ? JSON.stringify(selectedLog.changes.before, null, 2)
                              : '// No previous state recorded (New entity)'}
                          </pre>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Updated State (After)
                          </span>
                          <pre className="text-xs font-mono p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-[hsl(var(--foreground))] overflow-x-auto max-h-80">
                            {selectedLog.changes.after
                              ? JSON.stringify(selectedLog.changes.after, null, 2)
                              : '// No updated state payload'}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 text-center text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--accent)/0.5)] rounded-2xl border border-[hsl(var(--border))]">
                        No field mutation diffs recorded for this specific event type.
                      </div>
                    )}
                  </div>
                )}

                {modalTab === 'security' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] space-y-3 text-xs">
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))] font-bold uppercase text-[10px] tracking-wider block">
                          Client User Agent
                        </span>
                        <p className="font-mono text-xs text-[hsl(var(--foreground))] mt-1 break-all bg-[hsl(var(--accent)/0.5)] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                          {selectedLog.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <span className="text-[hsl(var(--muted-foreground))] font-bold uppercase text-[10px] tracking-wider block">
                            Network Address (IP)
                          </span>
                          <span className="font-mono font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 block">
                            {selectedLog.ipAddress || '127.0.0.1 (Loopback)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[hsl(var(--muted-foreground))] font-bold uppercase text-[10px] tracking-wider block">
                            Organization Tenant ID
                          </span>
                          <span className="font-mono text-xs text-[hsl(var(--foreground))] mt-0.5 block truncate">
                            {selectedLog.organizationId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'json' && (
                  <pre className="text-xs font-mono p-4 rounded-2xl bg-black/5 dark:bg-black/40 border border-[hsl(var(--border))] text-[hsl(var(--foreground))] overflow-x-auto max-h-96">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center justify-between">
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                  SHA256 Encrypted Audit Trail
                </span>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="rounded-xl px-5 font-bold"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
