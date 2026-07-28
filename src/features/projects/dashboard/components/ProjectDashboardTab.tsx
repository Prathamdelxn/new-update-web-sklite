'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Users, DollarSign, TrendingUp, AlertCircle, ShieldAlert,
  CheckCircle2, Clock, MessageSquare, FileText, Map, Package,
  ChevronRight, Activity, Building2, Zap,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';

interface ProjectDashboardTabProps {
  projectId: string;
}

const statusBadgeColor: Record<string, string> = {
  'Initialized':         'bg-blue-100 text-blue-700 border-blue-200',
  'Planning':            'bg-purple-100 text-purple-700 border-purple-200',
  'Site Survey':         'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Ongoing':             'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Under Snagging':      'bg-amber-100 text-amber-700 border-amber-200',
  'Snagging Completed':  'bg-orange-100 text-orange-700 border-orange-200',
  'Completed':           'bg-green-100 text-green-700 border-green-200',
  'Pending Handover':    'bg-violet-100 text-violet-700 border-violet-200',
  'Handover Rejected':   'bg-rose-100 text-rose-700 border-rose-200',
  'Handover Completed':  'bg-teal-100 text-teal-700 border-teal-200',
  'On Hold':             'bg-gray-100 text-slate-600 border-gray-200',
  'Cancelled':           'bg-red-100 text-red-700 border-red-200',
};

const STATUS_PROGRESS: Record<string, number> = {
  'Initialized': 5, 'Planning': 15, 'Site Survey': 25, 'Ongoing': 50,
  'Under Snagging': 75, 'Snagging Completed': 90, 'Completed': 100,
  'Pending Handover': 95, 'Handover Rejected': 90, 'Handover Completed': 100,
  'On Hold': 40, 'Cancelled': 0,
};

export const ProjectDashboardTab: React.FC<ProjectDashboardTabProps> = ({ projectId }) => {
  const { project } = useProjectContext();
  const router = useRouter();

  const [stats, setStats] = useState({
    milestones: { total: 0, completed: 0 },
    issues: { total: 0, open: 0 },
    risks: { total: 0, active: 0 },
    loading: true,
  });

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      try {
        const [mRes, iRes, rRes] = await Promise.allSettled([
          api.get(`/projects/${projectId}/milestones`),
          api.get(`/projects/${projectId}/issues`),
          api.get(`/projects/${projectId}/risks`),
        ]);

        const milestones: any[] = mRes.status === 'fulfilled'
          ? (Array.isArray(mRes.value.data) ? mRes.value.data : mRes.value.data?.milestones ?? [])
          : [];
        const issues: any[] = iRes.status === 'fulfilled'
          ? (Array.isArray(iRes.value.data) ? iRes.value.data : iRes.value.data?.issues ?? [])
          : [];
        const risks: any[] = rRes.status === 'fulfilled'
          ? (Array.isArray(rRes.value.data) ? rRes.value.data : rRes.value.data?.risks ?? [])
          : [];

        setStats({
          milestones: {
            total: milestones.length,
            completed: milestones.filter((m: any) => m.status === 'Completed').length,
          },
          issues: {
            total: issues.length,
            open: issues.filter((i: any) => i.status !== 'Resolved' && i.status !== 'Closed').length,
          },
          risks: {
            total: risks.length,
            active: risks.filter((r: any) => r.status === 'Active' || r.status === 'Critical').length,
          },
          loading: false,
        });
      } catch {
        setStats(s => ({ ...s, loading: false }));
      }
    };
    load();
  }, [projectId]);

  if (!project) return null;

  const currentBudget = project.budgetHistory?.[project.budgetHistory.length - 1]?.amount || 0;
  const progress = STATUS_PROGRESS[project.status as string] ?? 10;
  const startDate = project.startDate ? new Date(project.startDate) : null;
  const endDate = project.endDate ? new Date(project.endDate) : null;
  const now = new Date();
  const totalDays = startDate && endDate ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)) : null;
  const elapsedDays = startDate ? Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / 86400000)) : null;
  const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86400000) : null;
  const timeProgress = totalDays && elapsedDays !== null ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0;

  const recentActivity = ((project as any).auditTrail || []).slice(-5).reverse();

  const quickLinks = [
    { label: 'Chat', icon: MessageSquare, tab: 'chat', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Milestones', icon: CheckCircle2, tab: 'milestones', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: 'Issues', icon: AlertCircle, tab: 'issues', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Documents', icon: FileText, tab: 'documents', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { label: 'Plans', icon: Map, tab: 'plans', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { label: 'Materials', icon: Package, tab: 'materials', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Project Hero */}
      <GlassCard className="p-6 border-gray-200" gradient>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-black text-gray-900">{project.name}</h2>
                <span className={cn(
                  'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border',
                  statusBadgeColor[project.status] || 'bg-blue-100 text-blue-700 border-blue-200'
                )}>
                  {project.status}
                </span>
                {project.projectType && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border bg-gray-100 text-slate-600 border-gray-200">
                    {project.projectType}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 max-w-xl">
                {project.description || 'No description provided.'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-gray-900">{formatCurrency(currentBudget, project.currency || '$')}</p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Overall Progress</span>
            <span className="text-gray-900">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                (project.status as string) === 'Completed' || (project.status as string) === 'Handover Completed' ? 'bg-emerald-500' :
                (project.status as string) === 'Cancelled' ? 'bg-red-400' :
                'bg-gradient-to-r from-blue-600 to-blue-400'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </GlassCard>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Milestones */}
        <button
          onClick={() => router.push(`/projects/${projectId}/milestones`)}
          className="text-left"
        >
          <GlassCard className="p-5 border-gray-200 hover:border-blue-500/50 transition-all cursor-pointer h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              {!stats.loading && (
                <span className="text-xs font-bold text-blue-600">
                  {stats.milestones.completed}/{stats.milestones.total}
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">
              {stats.loading ? '—' : `${stats.milestones.total === 0 ? 0 : Math.round((stats.milestones.completed / stats.milestones.total) * 100)}%`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Milestones Done</p>
          </GlassCard>
        </button>

        {/* Issues */}
        <button
          onClick={() => router.push(`/projects/${projectId}/issues`)}
          className="text-left"
        >
          <GlassCard className="p-5 border-gray-200 hover:border-amber-500/50 transition-all cursor-pointer h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              {!stats.loading && stats.issues.open > 0 && (
                <span className="text-xs font-bold text-amber-600">{stats.issues.open} open</span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">{stats.loading ? '—' : stats.issues.total}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Issues & Snags</p>
          </GlassCard>
        </button>

        {/* Risks */}
        <button
          onClick={() => router.push(`/projects/${projectId}/risks`)}
          className="text-left"
        >
          <GlassCard className="p-5 border-gray-200 hover:border-rose-500/50 transition-all cursor-pointer h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              {!stats.loading && stats.risks.active > 0 && (
                <span className="text-xs font-bold text-rose-600">{stats.risks.active} active</span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">{stats.loading ? '—' : stats.risks.total}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Risks Logged</p>
          </GlassCard>
        </button>

        {/* Team */}
        <button
          onClick={() => router.push(`/projects/${projectId}/details`)}
          className="text-left"
        >
          <GlassCard className="p-5 border-gray-200 hover:border-purple-500/50 transition-all cursor-pointer h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900">{project.members?.length || 0}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Team Members</p>
          </GlassCard>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline & Info */}
        <div className="space-y-4">
          <GlassCard className="p-5 border-gray-200" gradient>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200">
                <Calendar className="w-4 h-4 text-cyan-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Timeline</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Start</span>
                <span className="font-bold text-gray-900">
                  {startDate ? startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">End</span>
                <span className={cn('font-bold', daysRemaining !== null && daysRemaining < 0 ? 'text-red-600' : 'text-gray-900')}>
                  {endDate ? endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                </span>
              </div>
              {daysRemaining !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Days Remaining</span>
                  <span className={cn('font-bold', daysRemaining < 0 ? 'text-red-600' : daysRemaining < 14 ? 'text-amber-600' : 'text-emerald-600')}>
                    {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : `${daysRemaining} days`}
                  </span>
                </div>
              )}
              {totalDays && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Time Elapsed</span>
                    <span>{timeProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', timeProgress > 90 ? 'bg-red-400' : timeProgress > 70 ? 'bg-amber-400' : 'bg-cyan-500')}
                      style={{ width: `${timeProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Priority & Type */}
          <GlassCard className="p-5 border-gray-200">
            <div className="space-y-3">

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Type</span>
                <span className="font-bold text-gray-900">{project.projectType || 'Construction'}</span>
              </div>
              {(project as any).clientName && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Client</span>
                  <span className="font-bold text-gray-900 truncate max-w-[120px]">{(project as any).clientName}</span>
                </div>
              )}
              {currentBudget > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Budget</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(currentBudget, project.currency || '$')}</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Team Members */}
          {(project.members?.length ?? 0) > 0 && (
            <GlassCard className="p-5 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-900">Team</h4>
                <button
                  onClick={() => router.push(`/projects/${projectId}/details`)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-500"
                >
                  Manage
                </button>
              </div>
              <div className="space-y-2">
                {project.members?.slice(0, 5).map((member: any, i: number) => {
                  const u = member.user || member;
                  const name = u.name || member.name || 'Member';
                  return (
                    <div key={u._id || i} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700 shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-700 truncate">{name}</span>
                    </div>
                  );
                })}
                {(project.members?.length ?? 0) > 5 && (
                  <p className="text-[10px] text-slate-400 italic">+{(project.members?.length ?? 0) - 5} more</p>
                )}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Quick Links + Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Navigation */}
          <GlassCard className="p-5 border-gray-200" gradient>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Quick Access</h4>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quickLinks.map(({ label, icon: Icon, tab, color }) => (
                <button
                  key={tab}
                  onClick={() => router.push(`/projects/${projectId}/${tab}`)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98]',
                    color
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard className="p-5 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-50 border border-gray-200">
                  <Activity className="w-4 h-4 text-slate-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Recent Activity</h4>
              </div>
              <button
                onClick={() => router.push(`/projects/${projectId}/audit`)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-500"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((entry: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">
                      {(entry.userName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 line-clamp-1">
                        <span className="font-bold">{entry.userName}</span>{' '}
                        <span className="text-slate-500">{entry.details}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Budget Summary */}
          {currentBudget > 0 && (
            <GlassCard className="p-5 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Budget Overview</h4>
                </div>
                <button
                  onClick={() => router.push(`/projects/${projectId}/budget`)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-500"
                >
                  Details <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-black text-gray-900">{formatCurrency(currentBudget, project.currency || '$')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {project.budgetHistory?.length || 0} revision{(project.budgetHistory?.length || 0) !== 1 ? 's' : ''} recorded
                  </p>
                </div>
                {(project.budgetHistory?.length ?? 0) >= 2 && (() => {
                  const prev = project.budgetHistory![project.budgetHistory!.length - 2].amount;
                  const diff = currentBudget - prev;
                  const pct = prev !== 0 ? ((diff / prev) * 100).toFixed(1) : '0';
                  return (
                    <div className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border',
                      diff >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                    )}>
                      <TrendingUp className="w-3.5 h-3.5" />
                      {diff >= 0 ? '+' : ''}{pct}%
                    </div>
                  );
                })()}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
