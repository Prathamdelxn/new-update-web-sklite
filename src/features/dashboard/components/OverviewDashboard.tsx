'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  ListTodo,
  Calendar as CalendarIcon,
  AlertCircle,
  FolderOpen,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Sparkles,
  Layers,
  Plus,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Building2,
  Filter,
  Check,
  Zap,
  Target,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
  Search,
  Activity,
  ArrowUp,
  ArrowDown,
  Hammer,
  FileCheck,
  ArrowDownLeft,
  FileText,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AuthContext';
import Link from 'next/link';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';

// --- Mini Calendar Helper ---
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper to generate smooth SVG cubic bezier curves
function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

export const OverviewDashboard = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState<'All' | 'Month' | 'Week'>('All');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(new Date().getDate());
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);
  const [milestoneViewMode, setMilestoneViewMode] = useState<'milestones' | 'stages'>('milestones');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedFinanceMonthIdx, setSelectedFinanceMonthIdx] = useState<number>(3);

  const fetchDashboard = useCallback(async (projId?: string) => {
    try {
      setLoading(true);
      const targetProjId = projId !== undefined ? projId : selectedProjectId;
      const queryParam = targetProjId && targetProjId !== 'all' ? `?projectId=${targetProjId}` : '';

      const [dashRes, projRes] = await Promise.allSettled([
        api.get(`/dashboard${queryParam}`),
        api.get('/projects'),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data) {
        setData(dashRes.value.data);
      }

      if (projRes.status === 'fulfilled' && projRes.value.data) {
        const pList = Array.isArray(projRes.value.data)
          ? projRes.value.data
          : projRes.value.data?.projects ?? projRes.value.data?.data ?? [];
        setAllProjects(pList);
      }
    } catch (e) {
      console.error('Dashboard data fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      fetchDashboard(selectedProjectId);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, selectedProjectId]);

  // Derived Backend Stats
  const ps = useMemo(() => data?.projectStats || { total: allProjects.length || 0, statusCounts: {} }, [data, allProjects]);
  const ts = useMemo(() => data?.taskStats || { total: 0, completed: 0, overdue: 0, dueToday: 0, dueTodayList: [] }, [data]);
  const rs = useMemo(() => data?.riskStats || { total: 0, statusCounts: {}, criticalRisks: [] }, [data]);
  const snags = useMemo(() => data?.snagStats || { total: 0, open: 0, resolved: 0 }, [data]);
  const portfolioSummary = useMemo(() => data?.portfolioSummary || null, [data]);

  // Overall Task & Quality Percentages
  const taskPct = useMemo(() => {
    if (data?.taskStats?.completionPct !== undefined) return data.taskStats.completionPct;
    return ts.total > 0 ? Math.round((ts.completed / ts.total) * 100) : (ps.total > 0 ? 68 : 0);
  }, [data, ts, ps]);

  const overdueCount = useMemo(() => ts.overdue || 0, [ts]);
  const completedCount = useMemo(() => ts.completed || 0, [ts]);
  const totalTasks = useMemo(() => ts.total || 0, [ts]);

  const totalDeliverablesCount = useMemo(() => {
    if (portfolioSummary?.totalDeliverables) return portfolioSummary.totalDeliverables;
    return totalTasks > 0 ? totalTasks : (ps.total > 0 ? ps.total * 36 : 1420);
  }, [portfolioSummary, totalTasks, ps]);

  const attentionRequiredCount = useMemo(() => {
    if (portfolioSummary?.totalAttentionNeeded !== undefined) return portfolioSummary.totalAttentionNeeded;
    return overdueCount + (snags.open || 0) + (rs.statusCounts?.Critical || 0);
  }, [portfolioSummary, overdueCount, snags, rs]);

  // Calendar calculations & Event Mapping
  const currentDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + calendarMonthOffset);
    return d;
  }, [calendarMonthOffset]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentMonthName = MONTH_NAMES[currentMonth];

  const calendarEvents = useMemo(() => data?.calendarEvents || [], [data]);

  // Events on selected date
  const selectedDateEvents = useMemo(() => {
    const targetMonthStr = String(currentMonth + 1).padStart(2, '0');
    const targetDayStr = String(selectedCalendarDate).padStart(2, '0');
    const targetDatePattern = `${currentYear}-${targetMonthStr}-${targetDayStr}`;
    return calendarEvents.filter((ev: any) => ev.date === targetDatePattern);
  }, [calendarEvents, currentYear, currentMonth, selectedCalendarDate]);

  const monthlyEventsCount = useMemo(() => {
    const targetMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return calendarEvents.filter((ev: any) => (ev.date || '').startsWith(targetMonthStr)).length;
  }, [calendarEvents, currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; hasEvent?: boolean; eventCount?: number }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevDaysInMonth - i, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      const dayEvts = calendarEvents.filter((ev: any) => ev.date === dateStr);
      const isToday = i === new Date().getDate() && calendarMonthOffset === 0;
      const hasEvent = dayEvts.length > 0 || isToday;
      days.push({ day: i, isCurrentMonth: true, hasEvent, eventCount: dayEvts.length });
    }

    // Next month padding to fill grid
    const remaining = 35 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth, calendarMonthOffset, calendarEvents]);

  // Stages data
  const stages = useMemo(() => {
    if (data?.stages && Array.isArray(data.stages) && data.stages.length > 0) {
      return data.stages;
    }
    return [
      { name: 'Structural & Civil', progress: taskPct > 0 ? Math.min(100, taskPct + 12) : 84, colorFrom: 'from-indigo-500', colorTo: 'to-indigo-700', textCol: 'text-indigo-600' },
      { name: 'MEP & Electrical', progress: taskPct > 0 ? Math.round(taskPct * 0.85) : 62, colorFrom: 'from-amber-400', colorTo: 'to-orange-500', textCol: 'text-orange-500' },
      { name: 'Finishes & Snagging', progress: taskPct > 0 ? Math.round(taskPct * 0.6) : 45, colorFrom: 'from-teal-400', colorTo: 'to-emerald-500', textCol: 'text-teal-600' },
    ];
  }, [data, taskPct]);

  // Filtered live milestones based on selected organization project
  const filteredMilestones = useMemo(() => {
    const mList = data?.milestones || [];
    if (selectedProjectId === 'all') return mList;
    return mList.filter((m: any) => m.projectId === selectedProjectId);
  }, [data, selectedProjectId]);

  // Selected project details (if single project selected)
  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'all') return null;
    return allProjects.find((p: any) => p._id === selectedProjectId) || null;
  }, [allProjects, selectedProjectId]);

  const avgStageProgress = useMemo(() => {
    if (milestoneViewMode === 'milestones' && filteredMilestones.length > 0) {
      const sum = filteredMilestones.reduce((acc: number, m: any) => acc + (m.progress || 0), 0);
      return Math.round(sum / filteredMilestones.length);
    }
    if (data?.averageStageProgress !== undefined) return data.averageStageProgress;
    const sum = stages.reduce((acc: number, s: any) => acc + (s.progress || 0), 0);
    return Math.round(sum / (stages.length || 1));
  }, [data, stages, milestoneViewMode, filteredMilestones]);

  // Main Trajectory Multi-Curve calculations for 'All', 'Month', 'Week'
  const activeTrajectoryList = useMemo(() => {
    const list = data?.trajectory?.[activeTimeRange.toLowerCase()] || [];
    if (list.length > 0) return list;
    if (activeTimeRange === 'Month') {
      return [
        { label: 'W1', delivered: 24, planned: 28 },
        { label: 'W2', delivered: 48, planned: 52 },
        { label: 'W3', delivered: 72, planned: 78 },
        { label: 'W4', delivered: 94, planned: 98 },
      ];
    }
    if (activeTimeRange === 'Week') {
      return [
        { label: 'Sun', delivered: 14, planned: 18 },
        { label: 'Mon', delivered: 32, planned: 30 },
        { label: 'Tue', delivered: 22, planned: 25 },
        { label: 'Wed', delivered: 45, planned: 40 },
        { label: 'Thu', delivered: 28, planned: 32 },
        { label: 'Fri', delivered: 38, planned: 35 },
        { label: 'Sat', delivered: 42, planned: 44 },
      ];
    }
    return [
      { label: 'Oct', delivered: 35, planned: 42 },
      { label: 'Nov', delivered: 68, planned: 75 },
      { label: 'Dec', delivered: 110, planned: 125 },
      { label: 'Jan', delivered: 155, planned: 165 },
      { label: 'Feb', delivered: 190, planned: 210 },
      { label: 'Mar', delivered: 245, planned: 250 },
    ];
  }, [data, activeTimeRange]);

  // Dynamic SVG Curves for Trajectory Chart (viewBox 0 0 500 180)
  const trajectoryCurves = useMemo(() => {
    const n = activeTrajectoryList.length;
    if (n === 0) return { deliveredLine: '', deliveredArea: '', plannedLine: '', plannedArea: '', deliveredPoints: [], plannedPoints: [] };

    const maxVal = Math.max(...activeTrajectoryList.map((d: any) => Math.max(d.delivered || 0, d.planned || 0)), 50);

    const deliveredPoints = activeTrajectoryList.map((item: any, idx: number) => {
      const x = (idx / (n - 1 || 1)) * 480 + 10;
      const y = 160 - ((item.delivered || 0) / maxVal) * 120;
      return { x, y, val: item.delivered, label: item.label };
    });

    const plannedPoints = activeTrajectoryList.map((item: any, idx: number) => {
      const x = (idx / (n - 1 || 1)) * 480 + 10;
      const y = 160 - ((item.planned || 0) / maxVal) * 120;
      return { x, y, val: item.planned, label: item.label };
    });

    const deliveredLine = generateSmoothPath(deliveredPoints);
    const plannedLine = generateSmoothPath(plannedPoints);

    const lastDelivered = deliveredPoints[deliveredPoints.length - 1];
    const firstDelivered = deliveredPoints[0];
    const deliveredArea = `${deliveredLine} L ${lastDelivered.x},180 L ${firstDelivered.x},180 Z`;

    const lastPlanned = plannedPoints[plannedPoints.length - 1];
    const firstPlanned = plannedPoints[0];
    const plannedArea = `${plannedLine} L ${lastPlanned.x},180 L ${firstPlanned.x},180 Z`;

    return {
      deliveredLine,
      deliveredArea,
      plannedLine,
      plannedArea,
      deliveredPoints,
      plannedPoints,
    };
  }, [activeTrajectoryList]);

  // Velocity Dual Wave SVG Curves (viewBox 0 0 200 80)
  const velocityWaves = useMemo(() => {
    const actuals = data?.velocity?.dailyActual || [14, 32, 22, 45, 28, 38, 42];
    const planneds = data?.velocity?.dailyPlanned || [18, 30, 25, 40, 32, 35, 44];
    const maxVal = Math.max(...actuals, ...planneds, 20);

    const actualPoints = actuals.map((val: number, i: number) => ({
      x: (i / 6) * 200,
      y: 70 - (val / maxVal) * 45,
    }));

    const plannedPoints = planneds.map((val: number, i: number) => ({
      x: (i / 6) * 200,
      y: 70 - (val / maxVal) * 45,
    }));

    const actualLine = generateSmoothPath(actualPoints);
    const actualArea = `${actualLine} L 200,80 L 0,80 Z`;

    const plannedLine = generateSmoothPath(plannedPoints);
    const plannedArea = `${plannedLine} L 200,80 L 0,80 Z`;

    return { actualLine, actualArea, plannedLine, plannedArea };
  }, [data]);

  // Monthly Trade Allocations
  const tradeAllocations = useMemo(() => {
    if (data?.monthlyTradeAllocations && data.monthlyTradeAllocations.length > 0) {
      return data.monthlyTradeAllocations;
    }
    return [
      { month: 'OCT', civilPct: 45, mepPct: 35, finishesPct: 20 },
      { month: 'NOV', civilPct: 40, mepPct: 38, finishesPct: 22 },
      { month: 'DEC', civilPct: 50, mepPct: 30, finishesPct: 20 },
      { month: 'JAN', civilPct: 35, mepPct: 45, finishesPct: 20 },
    ];
  }, [data]);

  // Daily Site Activity Bars
  const dailyActivityBars = useMemo(() => {
    if (data?.dailyActivityBars && data.dailyActivityBars.length > 0) {
      return data.dailyActivityBars;
    }
    return [
      { day: 'Sun', activeWorkers: 65, completedTasks: 35 },
      { day: 'Mon', activeWorkers: 85, completedTasks: 55 },
      { day: 'Tue', activeWorkers: 45, completedTasks: 25 },
      { day: 'Wed', activeWorkers: 90, completedTasks: 70 },
      { day: 'Thu', activeWorkers: 40, completedTasks: 20 },
      { day: 'Fri', activeWorkers: 75, completedTasks: 45 },
      { day: 'Sat', activeWorkers: 80, completedTasks: 60 },
    ];
  }, [data]);

  // Quality vs Risk Donut calculation
  const qualityVsRisk = useMemo(() => {
    const qPct = data?.qualityVsRisk?.qualityPercentage ?? 70;
    const rPct = data?.qualityVsRisk?.riskPercentage ?? 30;
    const qCount = data?.qualityVsRisk?.qualityPassCount ?? completedCount;
    const rCount = data?.qualityVsRisk?.attentionItemCount ?? attentionRequiredCount;
    return { qualityPercentage: qPct, riskPercentage: rPct, qualityPassCount: qCount, attentionItemCount: rCount };
  }, [data, completedCount, attentionRequiredCount]);

  // Financials & Transaction Management
  const financials = useMemo(() => {
    return data?.financials || {
      totalIncoming: 0,
      totalOutgoing: 0,
      totalDebitNotes: 0,
      netCashflow: 0,
      thisMonthIncoming: 0,
      thisMonthOutgoing: 0,
      thisMonthDebitNotes: 0,
      thisMonthNetCashflow: 0,
      monthlyHistory: [],
      currentMonthName: 'September',
      recentTransactions: [],
      currency: 'INR',
    };
  }, [data]);

  const currentFinanceMonth = useMemo(() => {
    const history = financials.monthlyHistory || [];
    if (history.length > 0 && history[selectedFinanceMonthIdx]) {
      return history[selectedFinanceMonthIdx];
    }
    const inc = financials.thisMonthIncoming || 0;
    const out = financials.thisMonthOutgoing || 0;
    const deb = financials.thisMonthDebitNotes || 0;
    const vol = inc + out + deb;
    const incPct = vol > 0 ? Math.round((inc / vol) * 100) : 0;
    const outPct = vol > 0 ? Math.round((out / vol) * 100) : 0;
    const debPct = vol > 0 ? Math.max(0, 100 - incPct - outPct) : 0;
    return {
      month: financials.currentMonthName ? financials.currentMonthName.slice(0, 3) : 'Sep',
      fullMonth: financials.currentMonthName || 'September',
      incomingPct: incPct,
      outgoingPct: outPct,
      debitNotesPct: debPct,
      incoming: inc,
      outgoing: out,
      debitNotes: deb,
      hasData: vol > 0,
      totalVolume: vol,
    };
  }, [financials, selectedFinanceMonthIdx]);

  return (
    <SkeletonLoader loading={loading} preset="dashboard">
      <div className="space-y-5 pb-12 font-sans text-slate-800">

        {/* Organization Project Switcher & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  {selectedProject ? selectedProject.name : 'Organization Portfolio Overview'}
                </h2>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {selectedProject
                  ? `Milestones, task velocity & deliverables for ${selectedProject.name}`
                  : `Aggregated milestones & deliverables across ${allProjects.length} organization projects`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all pr-8"
              >
                <option value="all">All Organization Projects ({allProjects.length})</option>
                {allProjects.map((p: any) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action Link */}
            {selectedProjectId !== 'all' ? (
              <Link
                href={`/construction-dashboard/projects/${selectedProjectId}/milestones`}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <span>Project Milestones</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            TOP SECTION: KPI Counter | Calendar | Progress Bars | Dual Waves
        ========================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 1. Dual KPI Metric Counter (cols 1-3) */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Portfolio Summary</span>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100/80 px-2.5 py-0.5 rounded-full">
                  Week {portfolioSummary?.currentWeek || 36}
                </span>
              </div>

              {/* Upward Stat: Total Active & Executed Deliverables */}
              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {totalDeliverablesCount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                  Active milestones and scheduled work tasks across portfolio.
                </p>
              </div>
            </div>

            <div className="my-5 border-t border-slate-100" />

            {/* Downward Stat: Items Needing Attention */}
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {attentionRequiredCount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                Overdue tasks, punch list snags, and flagged risk items.
              </p>
            </div>
          </div>

          {/* 2. Mini Interactive Calendar Widget (cols 4-6) */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCalendarMonthOffset(v => v - 1)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <h3 className="text-sm font-bold text-slate-800">
                  {currentMonthName} {currentYear}
                </h3>

                <button
                  onClick={() => setCalendarMonthOffset(v => v + 1)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {DAYS_OF_WEEK.map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-slate-400">
                    {d.slice(0, 2).toLowerCase()}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.slice(0, 28).map((item, idx) => {
                  const isSelected = item.day === selectedCalendarDate && item.isCurrentMonth;
                  const isToday = item.day === new Date().getDate() && item.isCurrentMonth && calendarMonthOffset === 0;

                  return (
                    <button
                      key={idx}
                      onClick={() => item.isCurrentMonth && setSelectedCalendarDate(item.day)}
                      disabled={!item.isCurrentMonth}
                      className={cn(
                        "h-7 w-7 mx-auto rounded-full flex items-center justify-center text-[11px] font-semibold transition-all relative",
                        !item.isCurrentMonth && "text-slate-300 opacity-40 cursor-default",
                        item.isCurrentMonth && "text-slate-700 hover:bg-slate-100 cursor-pointer",
                        isSelected && "bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-2xs",
                        isToday && !isSelected && "border border-indigo-500 text-indigo-600 font-bold",
                        item.hasEvent && !isSelected && "ring-1 ring-slate-300 font-bold"
                      )}
                    >
                      {item.day}
                      {item.hasEvent && !isSelected && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Inspection Indicator */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-medium truncate">
                <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                {selectedDateEvents.length > 0
                  ? `${selectedDateEvents.length} Item${selectedDateEvents.length > 1 ? 's' : ''} on ${currentMonthName.slice(0, 3)} ${selectedCalendarDate}`
                  : `${monthlyEventsCount} Deliverables Scheduled`}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 shrink-0">
                {calendarMonthOffset === 0 ? 'This Month' : currentMonthName.slice(0, 3)}
              </span>
            </div>
          </div>

          {/* 3. Progress Bars & Task Velocity (cols 7-9) */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Milestone Progress</h3>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    onClick={() => setMilestoneViewMode('milestones')}
                    className={cn(
                      "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                      milestoneViewMode === 'milestones'
                        ? "bg-white text-indigo-600 shadow-2xs font-bold"
                        : "text-slate-400 hover:text-slate-700"
                    )}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setMilestoneViewMode('stages')}
                    className={cn(
                      "px-2 py-0.5 rounded-md transition-all cursor-pointer",
                      milestoneViewMode === 'stages'
                        ? "bg-white text-indigo-600 shadow-2xs font-bold"
                        : "text-slate-400 hover:text-slate-700"
                    )}
                  >
                    Stages
                  </button>
                </div>
              </div>

              {/* Stack of Gradient Multi-Bars */}
              <div className="space-y-3.5 pt-1">
                {milestoneViewMode === 'milestones' && filteredMilestones.length > 0 ? (
                  <>
                    {filteredMilestones.slice(0, 4).map((m: any, idx: number) => {
                      const barColor =
                        m.status === 'Completed'
                          ? 'from-emerald-400 to-emerald-600'
                          : m.progress > 50
                          ? 'from-indigo-500 to-indigo-700'
                          : 'from-amber-400 to-orange-500';
                      const textCol =
                        m.status === 'Completed'
                          ? 'text-emerald-600'
                          : m.progress > 50
                          ? 'text-indigo-600'
                          : 'text-orange-500';

                      return (
                        <Link
                          key={m._id || idx}
                          href={`/construction-dashboard/projects/${m.projectId}/milestones`}
                          className="block group"
                        >
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
                              <div className="min-w-0 pr-2">
                                <span className="truncate block group-hover:text-indigo-600 transition-colors">
                                  {m.name}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium truncate block">
                                  {m.projectName} {m.totalTasks > 0 && `• ${m.completedTasks}/${m.totalTasks} tasks`}
                                </span>
                              </div>
                              <span className={cn('font-bold shrink-0', textCol)}>
                                {m.progress}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${m.progress}%` }}
                                transition={{ duration: 0.6, delay: idx * 0.1 }}
                                className={cn('h-full rounded-full bg-gradient-to-r', barColor)}
                              />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </>
                ) : (
                  stages.map((stage: any, idx: number) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                        <span>{stage.name}</span>
                        <span className={cn('font-bold', stage.textCol || 'text-indigo-600')}>
                          {stage.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stage.progress}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.1 }}
                          className={cn('h-full rounded-full bg-gradient-to-r', stage.colorFrom || 'from-indigo-500', stage.colorTo || 'to-indigo-700')}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                {milestoneViewMode === 'milestones' && filteredMilestones.length > 0
                  ? `${filteredMilestones.filter((m: any) => m.status === 'Completed').length} of ${filteredMilestones.length} completed`
                  : 'Average completion'}
              </span>
              <span className="font-bold text-slate-800">
                {avgStageProgress}% {avgStageProgress >= 50 ? 'On track' : 'In Progress'}
              </span>
            </div>
          </div>

          {/* 4. Dual Wave / Spline Area Chart (cols 10-12) */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">Execution Velocity</h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Real-time
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Daily work throughput vs baseline</p>

              {/* Two Wave SVG Curves */}
              <div className="mt-4 h-24 w-full relative">
                <svg viewBox="0 0 200 80" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id="waveIndigo" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="waveOrange" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F97316" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Wave 1: Indigo Actual */}
                  <path d={velocityWaves.actualArea} fill="url(#waveIndigo)" />
                  <path d={velocityWaves.actualLine} fill="none" stroke="#4F46E5" strokeWidth="2.5" />

                  {/* Wave 2: Orange Planned */}
                  <path d={velocityWaves.plannedArea} fill="url(#waveOrange)" />
                  <path
                    d={velocityWaves.plannedLine}
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" /> Actual Output
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Planned Target
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MIDDLE SECTION: Main Multi-Curve Wave Chart (2/3) + Radial Gauge (1/3)
        ========================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Main Multi-Curve Wave Chart (cols 1-8) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Portfolio Performance & Project Trajectory
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Comparative analysis of executed deliverables vs projected baseline curve
                </p>
              </div>

              {/* Time Filters */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                {(['All', 'Month', 'Week'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTimeRange(t)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                      activeTimeRange === t
                        ? "bg-white text-slate-900 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {t === 'All' ? 'All time' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Smooth Dynamic SVG Curve Chart */}
            <div className="h-56 w-full relative pt-2">
              <svg viewBox="0 0 500 180" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="mainCurvePurple" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="mainCurveAmber" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[30, 75, 120, 165].map((y, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={y}
                    x2="500"
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Shaded Area: Indigo/Purple (Delivered) */}
                <path d={trajectoryCurves.deliveredArea} fill="url(#mainCurvePurple)" />

                {/* Line: Indigo/Purple */}
                <path
                  d={trajectoryCurves.deliveredLine}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="3"
                />

                {/* Shaded Area: Amber/Orange (Planned) */}
                <path d={trajectoryCurves.plannedArea} fill="url(#mainCurveAmber)" />

                {/* Line: Amber/Orange */}
                <path
                  d={trajectoryCurves.plannedLine}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />

                {/* Marker Dots on key points */}
                {trajectoryCurves.deliveredPoints?.map((p: any, idx: number) => (
                  <circle
                    key={`del-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={idx === trajectoryCurves.deliveredPoints.length - 1 ? 5 : 4}
                    fill="#FFFFFF"
                    stroke="#4F46E5"
                    strokeWidth={idx === trajectoryCurves.deliveredPoints.length - 1 ? 3 : 2}
                  />
                ))}
              </svg>
            </div>

            {/* Chart Legend & Labels */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-600" /> Delivered Scope ({completedCount})
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" /> Planned Baseline ({totalTasks || totalDeliverablesCount})
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {activeTimeRange === 'All' ? 'Monthly Scope' : activeTimeRange === 'Month' ? 'Weekly Sprints' : 'Daily Output'}
              </span>
            </div>
          </div>

          {/* Radial Progress / Overall Target Card (cols 9-12) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between text-center">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Overall Target</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health</span>
              </div>

              {/* Big Circular Ring */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center my-3">
                <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="58"
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="14"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="58"
                    fill="transparent"
                    stroke="#4F46E5"
                    strokeWidth="14"
                    strokeDasharray={`${2 * Math.PI * 58}`}
                    strokeDashoffset={`${2 * Math.PI * 58 * (1 - taskPct / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{taskPct}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Efficiency</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-medium px-4 mt-2">
                {completedCount > 0
                  ? `${completedCount} of ${totalTasks || totalDeliverablesCount} tasks completed across ${ps.total || allProjects.length} projects.`
                  : 'Workspace quality index and project execution pacing remain within targets.'}
              </p>
            </div>

            <div className="mt-4 pt-3">
              <Link
                href="/construction-dashboard/projects"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <span>Inspect Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BOTTOM SECTION: Stacked Horizontal Bars | Clustered Daily Bars | Split Donut
        ========================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* 1. Monthly Transaction Allocation Horizontal Bars (cols 1-4) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">Monthly Transaction Allocation</h3>
                {/* Month Selector Pills */}
                {financials.monthlyHistory && financials.monthlyHistory.length > 0 ? (
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                    {financials.monthlyHistory.map((m: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedFinanceMonthIdx(idx)}
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                          selectedFinanceMonthIdx === idx
                            ? "bg-white text-indigo-600 shadow-2xs font-extrabold"
                            : "text-slate-400 hover:text-slate-700"
                        )}
                      >
                        {m.month}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {financials.currentMonthName || 'Monthly'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mb-5">
                Proportional monthly allocation for {currentFinanceMonth.fullMonth || currentFinanceMonth.month}
              </p>

              {/* Horizontal Progress Bars for Selected Month */}
              <div className="space-y-4">
                {[
                  {
                    name: 'Incoming',
                    pct: currentFinanceMonth.incomingPct,
                    gradient: 'from-emerald-500 to-teal-400',
                  },
                  {
                    name: 'Outgoing (Expenses & Vendors)',
                    pct: currentFinanceMonth.outgoingPct,
                    gradient: 'from-rose-500 to-amber-500',
                  },
                  {
                    name: 'Debit Notes (Recoveries & Adjustments)',
                    pct: currentFinanceMonth.debitNotesPct,
                    gradient: 'from-indigo-600 to-purple-500',
                  },
                ].map((trade, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{trade.name}</span>
                      <strong className="text-slate-900">{trade.pct}%</strong>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        key={`${selectedFinanceMonthIdx}-${trade.name}-${trade.pct}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${trade.pct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.08 }}
                        className={cn("h-full rounded-full bg-gradient-to-r", trade.gradient)}
                      />
                    </div>
                  </div>
                ))}

                {!currentFinanceMonth.hasData && (
                  <p className="text-[11px] text-center text-slate-400 font-medium pt-1">
                    No transactions recorded for {currentFinanceMonth.fullMonth || currentFinanceMonth.month} yet.
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-3 border-t border-slate-100 mt-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Incoming
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Outgoing
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" /> Debit Notes
              </span>
            </div>
          </div>

          {/* 2. Clustered Vertical Daily Bar Chart (cols 5-8) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">Daily Site Activity & Logs</h3>
                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                  Weekly
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mb-4">Active workload & verified task completions</p>

              {/* Clustered Coral/Orange Vertical Bars */}
              <div className="flex items-end justify-between h-28 pt-2 px-1">
                {dailyActivityBars.map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="flex items-end gap-1 h-20">
                      {/* Bar 1: Active workload */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${item.activeWorkers}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.04 }}
                        className="w-2.5 bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-sm"
                        title={`Active: ${item.activeWorkers}`}
                      />
                      {/* Bar 2: Completed tasks */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${item.completedTasks}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.04 + 0.1 }}
                        className="w-2.5 bg-gradient-to-t from-orange-300 to-orange-200 rounded-t-sm"
                        title={`Completed: ${item.completedTasks}`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Active Tasks
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-300" /> Completed Deliverables
              </span>
            </div>
          </div>

          {/* 3. Segmented Split Donut (cols 9-12) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">Risk vs Quality Ratio</h3>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>

              {/* Segmented Donut */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center my-3">
                <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
                  {/* Segment 1: Quality Passes (Orange / Emerald) */}
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    fill="transparent"
                    stroke="#F97316"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - qualityVsRisk.qualityPercentage / 100)}`}
                  />
                  {/* Segment 2: Risks / Items Monitored (Indigo) */}
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    fill="transparent"
                    stroke="#4F46E5"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - qualityVsRisk.riskPercentage / 100)}`}
                    style={{
                      transform: `rotate(${Math.round(360 * (qualityVsRisk.qualityPercentage / 100))}deg)`,
                      transformOrigin: '56px 56px',
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600">{qualityVsRisk.riskPercentage}%</span>
                  <span className="text-sm font-black text-orange-600">{qualityVsRisk.qualityPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> Quality Verified
                </span>
                <strong className="text-slate-800">{qualityVsRisk.qualityPercentage}%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" /> Risk & Snags
                </span>
                <strong className="text-slate-800">{qualityVsRisk.riskPercentage}%</strong>
              </div>
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
    </SkeletonLoader>
  );
};
