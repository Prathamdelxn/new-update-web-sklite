'use client';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { CONSTRUCTION_PROJECTS_KEY, fetchConstructionProjects } from '@/features/projects/contexts/ProjectContext';
import { tr } from '@/i18n';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  TrendingUp,
  Plus,
  RefreshCw,
  Loader2,
  Bug,
  ChevronRight,
  Clock,
  Flag,
  Calendar,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useAuth } from '@/providers/AuthContext';
import { canCreateProjects } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function ConstructionDashboardSkeleton() {
  return (
    <div className="space-y-8 min-h-full font-sans animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200/80 rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-slate-200/60 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-slate-200/80 rounded-lg" />
          <div className="h-9 w-24 bg-slate-200/80 rounded-lg" />
        </div>
      </div>

      <div className="space-y-8">
        {/* KPI Cards Row Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-none">
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 w-20 bg-slate-200/80 rounded" />
                <div className="w-6 h-6 rounded-lg bg-slate-100" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <div className="h-6 w-10 bg-slate-200/90 rounded" />
                <div className="h-4 w-12 bg-slate-200/60 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Progress & Health Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div className="h-5 w-36 bg-slate-200/90 rounded-md" />
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-slate-200/60 rounded-md" />
                <div className="h-4 w-20 bg-slate-200/60 rounded-md" />
              </div>
            </div>
            <div className="h-[280px] w-full bg-slate-50 border border-slate-100 rounded-xl" />
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
            <div className="h-5 w-32 bg-slate-200/90 rounded-md mb-6" />
            <div className="w-36 h-36 mx-auto rounded-full border-8 border-slate-100 flex items-center justify-center my-4" />
          </div>
        </div>

        {/* Secondary 2-Card Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
              <div className="h-5 w-36 bg-slate-200/90 rounded-md mb-4" />
              <div className="h-[200px] bg-slate-50 border border-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const NO_PROJECTS: any[] = [];

export const OverviewDashboard = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState<'All' | 'Month' | 'Week'>('All');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const queryClient = useQueryClient();
  const enabled = !authLoading && isAuthenticated;

  // Cached: returning to the dashboard shows the last numbers instantly and refreshes in the
  // background; switching the project filter keeps the old numbers until the new ones arrive.
  const dashQuery = useQuery({
    queryKey: ['construction-dashboard', selectedProjectId],
    queryFn: async () => {
      const queryParam = selectedProjectId && selectedProjectId !== 'all' ? `?projectId=${selectedProjectId}` : '';
      return (await api.get(`/dashboard${queryParam}`)).data ?? null;
    },
    enabled,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
  // Same cache entry as the Projects page, so opening Projects from here is instant
  const projQuery = useQuery({
    queryKey: CONSTRUCTION_PROJECTS_KEY,
    queryFn: () => fetchConstructionProjects(queryClient),
    enabled,
    staleTime: 30 * 1000,
  });

  const data: any = dashQuery.data ?? null;
  const allProjects: any[] = projQuery.data ?? NO_PROJECTS;
  const loading = authLoading || (isAuthenticated && dashQuery.isPending);
  const refreshing = dashQuery.isFetching && !dashQuery.isPending;

  const fetchDashboard = useCallback(async () => {
    await Promise.all([dashQuery.refetch(), projQuery.refetch()]);
  }, [dashQuery, projQuery]);

  // Derived Backend Stats
  const ps = useMemo(
    () => data?.projectStats || { total: allProjects.length || 0, statusCounts: {} },
    [data, allProjects]
  );
  const ts = useMemo(
    () => data?.taskStats || { total: 0, completed: 0, overdue: 0, dueToday: 0, dueTodayList: [] },
    [data]
  );
  const rs = useMemo(
    () => data?.riskStats || { total: 0, statusCounts: {}, criticalRisks: [] },
    [data]
  );
  const snags = useMemo(() => data?.snagStats || { total: 0, open: 0, resolved: 0, recentSnags: [] }, [data]);

  // Live Project Milestones
  const projectMilestones = useMemo(
    () => (Array.isArray(data?.milestones) ? data.milestones : []),
    [data]
  );

  // Critical Risks & Open Punch List Snags
  const siteIssuesAndRisks = useMemo(() => {
    const criticals = (rs.criticalRisks || []).map((r: any) => ({
      id: `risk-${r.title}-${r.projectId}`,
      title: r.title,
      type: 'risk' as const,
      badgeText: r.status === 'Critical' ? 'Critical Risk' : `${r.impact || 'High'} Impact`,
      badgeStyle:
        r.status === 'Critical'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-amber-50 text-amber-700 border-amber-200',
      projectName: r.projectName,
      projectId: r.projectId,
      link: r.projectId ? `/construction-dashboard/projects/${r.projectId}/risks` : '/construction-dashboard/projects',
    }));

    const snagsList = (snags.recentSnags || []).map((s: any) => ({
      id: `snag-${s._id || s.title}`,
      title: s.title,
      type: 'snag' as const,
      badgeText: `Snag · ${s.priority || 'Medium'}`,
      badgeStyle:
        s.priority === 'Critical' || s.priority === 'High'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-purple-50 text-purple-700 border-purple-200',
      projectName: s.projectName,
      projectId: s.projectId,
      link: s.projectId ? `/construction-dashboard/projects/${s.projectId}/snags` : '/construction-dashboard/projects',
    }));

    return [...criticals, ...snagsList].slice(0, 5);
  }, [rs, snags]);

  // Trajectory chart data for AreaChart
  const activeTrajectoryList = useMemo(() => {
    const list = data?.trajectory?.[activeTimeRange.toLowerCase()] || [];
    if (list.length > 0) return list;
    if (activeTimeRange === 'Month') {
      return [
        { label: 'W1', delivered: 0, planned: 0 },
        { label: 'W2', delivered: 0, planned: 0 },
        { label: 'W3', delivered: 0, planned: 0 },
        { label: 'W4', delivered: 0, planned: 0 },
      ];
    }
    if (activeTimeRange === 'Week') {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => ({
        label: d,
        delivered: 0,
        planned: 0,
      }));
    }
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const res = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      res.push({ label: monthNames[d.getMonth()], delivered: 0, planned: 0 });
    }
    return res;
  }, [data, activeTimeRange]);

  // Project statuses (Project model enum) grouped into the dashboard's buckets.
  // Counting only the bucket names missed projects in e.g. "Initialized" / "Ongoing".
  const statusGroups = useMemo(() => {
    const groupOf = (status: string) => {
      if (['Planning', 'Initialized'].includes(status)) return 'Planning';
      if (['Completed', 'Handover Completed'].includes(status)) return 'Completed';
      if (status === 'On Hold') return 'On Hold';
      if (status === 'Cancelled') return 'Cancelled';
      return 'In Progress'; // Ongoing, Execution, Site Survey, snagging & handover stages…
    };
    const groups: Record<string, number> = {};
    Object.entries(ps.statusCounts || {}).forEach(([status, count]) => {
      const g = groupOf(status);
      groups[g] = (groups[g] || 0) + (Number(count) || 0);
    });
    return groups;
  }, [ps]);

  // Project Health Donut chart slices
  const healthSlices = useMemo(() => {
    const raw = [
      { name: 'In Progress', value: statusGroups['In Progress'] || 0, color: '#2563EB' },
      { name: 'Planning', value: statusGroups['Planning'] || 0, color: '#D97706' },
      { name: 'Completed', value: statusGroups['Completed'] || 0, color: '#16A34A' },
      { name: 'On Hold', value: statusGroups['On Hold'] || 0, color: '#64748B' },
      { name: 'Cancelled', value: statusGroups['Cancelled'] || 0, color: '#DC2626' },
    ].filter((s) => s.value > 0);

    // Grey placeholder ring only (never listed in the legend)
    return raw.length > 0 ? raw : [{ name: 'No Projects', value: 1, color: '#E2E8F0', placeholder: true }];
  }, [statusGroups]);

  const healthTotal = ps.total || allProjects.length || 0;

  const userFirstName =
    (user as any)?.firstName ||
    user?.name?.split(' ')[0] ||
    'there';

  const canCreate = canCreateProjects(user);

  // Real context under each KPI (these were fixed labels: "Live", "Delivered", …)
  const completedPct = healthTotal > 0 ? Math.round(((statusGroups['Completed'] || 0) / healthTotal) * 100) : 0;
  const openRisks = Math.max(0, (rs.total || 0) - (rs.statusCounts?.Resolved || 0));

  // Real progress (work done) per project from the dashboard API; the list is the fallback
  const topProjects: { _id: string; name: string; progress: number }[] = (
    Array.isArray(data?.projectProgress) && data.projectProgress.length > 0
      ? data.projectProgress
      : allProjects.map((p: any) => ({ _id: p._id, name: p.name, progress: Number(p.progress) || 0 }))
  ).slice(0, 4);

  // 4 KPI cards (Styled matching the KPI Stat Strip)
  const kpiCards = [
    {
      title: 'Active Projects',
      value: statusGroups['In Progress'] || 0,
      badge: tr("{{n}} total", { n: healthTotal }),
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-100',
      valueColor: 'text-blue-600',
      iconBoxColor: 'bg-blue-50 text-blue-600 border border-blue-100',
      hoverBorder: 'hover:border-blue-300',
      icon: FolderKanban,
      link: '/construction-dashboard/projects',
    },
    {
      title: 'Completed Projects',
      value: statusGroups['Completed'] || 0,
      badge: healthTotal > 0 ? tr("{{n}}% of portfolio", { n: completedPct }) : tr("None yet"),
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-100',
      valueColor: 'text-emerald-600',
      iconBoxColor: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      hoverBorder: 'hover:border-emerald-300',
      icon: CheckCircle2,
      link: '/construction-dashboard/projects',
    },
    {
      title: 'Open Snags',
      value: snags.open || 0,
      badge: tr("{{n}} resolved", { n: snags.resolved || 0 }),
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-100',
      valueColor: 'text-rose-600',
      iconBoxColor: 'bg-rose-50 text-rose-600 border border-rose-100',
      hoverBorder: 'hover:border-rose-300',
      icon: Bug,
      link: '/construction-dashboard/projects',
    },
    {
      title: 'Critical Risks',
      value: rs.statusCounts?.Critical || 0, // only risks actually marked Critical
      badge: tr("{{n}} open risks", { n: openRisks }),
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-100',
      valueColor: 'text-amber-600',
      iconBoxColor: 'bg-amber-50 text-amber-600 border border-amber-100',
      hoverBorder: 'hover:border-amber-300',
      icon: AlertTriangle,
      link: '/construction-dashboard/projects',
    },
  ];

  if (loading) {
    return <ConstructionDashboardSkeleton />;
  }

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {tr("Good ")}{getGreeting()}, {tr(userFirstName)}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {tr("Here's the live status of your construction portfolio today.")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Project Selector Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all shadow-xs"
          >
            <option value="all">{tr("All Projects (")}{allProjects.length})</option>
            {allProjects.map((p: any) => (
              <option key={p._id} value={p._id}>
                {tr(p.name)} {p.code ? `(${p.code})` : ''}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard()}
            disabled={refreshing}
            className="border-slate-200/80 hover:bg-slate-50 text-slate-700 shadow-xs"
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 me-1.5" />
            )}
            {tr("Refresh")}
          </Button>

         
        </div>
      </div>

      <div className="space-y-4">
        {/* KPI Cards Row (4 cards) */}
       
        {/* ── KPI Stat Strip (Construction Dashboard Card Tabs) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <Link
              key={kpi.title}
              href={kpi.link}
              className={cn(
                'bg-white rounded-xl border border-slate-300 p-3 transition-all cursor-pointer block group shadow-none',
                kpi.hoverBorder
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">
                  {tr(kpi.title)}
                </span>
                <div
                  className={cn(
                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                    kpi.iconBoxColor
                  )}
                >
                  <kpi.icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={cn('text-xl font-bold tabular-nums', kpi.valueColor)}>
                  {tr(kpi.value)}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                    kpi.badgeColor
                  )}
                >
                  {tr(kpi.badge)}
                </span>
              </div>
            </Link>
          ))}
        </div>


        {/* Progress & Health Row (2:1 Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Trend Area Chart */}
          <div className="lg:col-span-2">
            <Card className="bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">{tr("Project Timeline & Progress")}</CardTitle>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                    {(['All', 'Month', 'Week'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTimeRange(t)}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer',
                          activeTimeRange === t
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-500 hover:text-slate-900'
                        )}
                      >
                        {t === 'All' ? tr("6 months") : t === 'Month' ? tr("This month") : tr("This week")}
                      </button>
                    ))}
                  </div>

                  <span className="flex items-center gap-1.5 hidden sm:inline-flex">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    {tr("Planned")}
                  </span>
                  <span className="flex items-center gap-1.5 hidden sm:inline-flex">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    {tr("Actual")}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {allProjects.length === 0 || !activeTrajectoryList.some((t: any) => (t.delivered || 0) > 0 || (t.planned || 0) > 0) ? (
                  <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <TrendingUp className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">{tr("No project activity recorded yet")}</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {tr("Create a project and schedule work tasks or milestones to begin tracking planned vs actual delivery trends.")}
                    </p>
                  </div>
                ) : (
                  <div className="h-[280px] outline-none focus:outline-none [&_*]:outline-none">
                    <ResponsiveContainer width="100%" height="100%" debounce={300}>
                      <AreaChart
                        style={{ outline: 'none' }}
                        data={activeTrajectoryList}
                        margin={{ top: 10, right: 10, bottom: 5, left: -20 }}
                      >
                        <defs>
                          <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16A34A" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 12, fill: '#64748B' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: '#64748B' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#0F172A',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="planned"
                          name="Planned Target"
                          stroke="#2563EB"
                          fill="url(#plannedGradient)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="delivered"
                          name="Actual Scope"
                          stroke="#16A34A"
                          fill="url(#actualGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Project Health Donut */}
          <div>
            <Card className="h-full bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">{tr("Project Health")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-[200px] outline-none focus:outline-none [&_*]:outline-none">
                  <ResponsiveContainer width="100%" height="100%" debounce={300}>
                    <PieChart style={{ outline: 'none' }}>
                      <Pie
                        data={healthSlices}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive={healthTotal > 0}
                      >
                        {healthSlices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-900">{tr(healthTotal)}</span>
                    <span className="text-[11px] text-slate-500">
                      {healthTotal === 1 ? tr("Project") : tr("Projects")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  {healthTotal === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">
                      {tr("No active projects in this workspace")}
                    </p>
                  ) : (
                    healthSlices.filter((item) => !('placeholder' in item)).map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-slate-500 text-xs">{tr(item.name)}</span>
                        </span>
                        <span className="font-semibold text-xs text-slate-900">{tr(item.value)}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Secondary Row: Top Projects & Attention Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Top Projects Portfolio */}
          <div>
            <Card className="h-full bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-700" />
                  {tr("Top Projects")}
                </CardTitle>
                <Link
                  href="/construction-dashboard/projects"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  {tr("View all ")}<ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="pt-2">
                {topProjects.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <FolderKanban className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs text-slate-500">{tr("No active projects yet")}</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {topProjects.map((project) => {
                      const progress = project.progress;
                      return (
                        <div key={project._id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800 truncate max-w-[180px]">
                              {tr(project.name)}
                            </span>
                            <span className="font-semibold text-slate-500">{tr(progress)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                backgroundColor:
                                  progress >= 80
                                    ? '#16A34A'
                                    : progress >= 40
                                    ? '#2563EB'
                                    : '#D97706',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Card 2: Attention Items & Schedule */}
          <div>
            <Card className="h-full bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {tr("Attention Required & Scheduled Items")}
                </CardTitle>
                <span className="text-xs text-slate-500">
                  {ts.dueTodayList?.length || 0}{tr(" pending today")}
                </span>
              </CardHeader>
              <CardContent className="pt-2">
                {!ts.dueTodayList || ts.dueTodayList.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-medium text-slate-800">
                      {tr("All deliverables on schedule")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {tr("No overdue tasks or critical roadblocks requiring immediate intervention.")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {ts.dueTodayList.slice(0, 4).map((task: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-xs font-medium text-slate-800 truncate">
                            {task.title || task.name || tr("Scheduled deliverable")}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0 ms-2">
                          {tr("Due today")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Site Delivery & Quality Resolution Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Key Project Milestones */}
          <div>
            <Card className="h-full bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-blue-600" />
                  {tr("Site Delivery Milestones")}
                </CardTitle>
                <Link
                  href="/construction-dashboard/projects"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  {tr("View projects ")}<ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="pt-2">
                {projectMilestones.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Flag className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-medium text-slate-800">{tr("No project milestones scheduled")}</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      {tr("Define milestone deliverables in your project workspaces to track phased construction progress.")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {projectMilestones.slice(0, 4).map((m: any, idx: number) => {
                      const isCompleted = m.status === 'Completed' || m.progress === 100;
                      const isInProgress = m.status === 'In Progress' || (m.progress > 0 && m.progress < 100);
                      const formattedDate = m.dueDate
                        ? new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : null;

                      return (
                        <div key={m._id || idx} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50/70 transition-all space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{tr(m.name)}</p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{tr(m.projectName)}</p>
                            </div>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border',
                                isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isInProgress
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              )}
                            >
                              {m.status || (isCompleted ? tr("Completed") : tr("Pending"))}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>
                                {m.totalTasks > 0 ? tr("{{value}} of {{totalTasks}} tasks", { value: m.completedTasks || 0, totalTasks: m.totalTasks }) : tr("{{value}}% complete", { value: m.progress || 0 })}
                              </span>
                              {formattedDate && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  {tr(formattedDate)}
                                </span>
                              )}
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  isCompleted ? 'bg-emerald-600' : isInProgress ? 'bg-blue-600' : 'bg-slate-300'
                                )}
                                style={{ width: `${Math.min(100, m.progress || 0)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Card 2: Site Issues & Quality Watch */}
          <div>
            <Card className="h-full bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  {tr("Site Risks & Snags Watch")}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-medium">
                    {snags.open || 0}{tr(" Snags")}
                  </span>
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                    {rs.criticalRisks?.length || 0}{tr(" High impact")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {siteIssuesAndRisks.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500" />
                    <p className="text-sm font-medium text-slate-800">{tr("Job sites operating smoothly")}</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      {tr("Zero critical risks or unresolved snags reported across your active construction portfolio.")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {siteIssuesAndRisks.map((item: any) => (
                      <Link
                        key={item.id}
                        href={item.link}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.type === 'risk' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Bug className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {tr(item.title)}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {tr(item.projectName)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ms-2">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', item.badgeStyle)}>
                            {tr(item.badgeText)}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal for creating a project */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchDashboard}
      />
    </div>
  );
};
