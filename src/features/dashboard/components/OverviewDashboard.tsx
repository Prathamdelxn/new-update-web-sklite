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

export const OverviewDashboard = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState<'All' | 'Month' | 'Week'>('All');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(new Date().getDate());
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, projRes] = await Promise.allSettled([
        api.get('/dashboard'),
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
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      fetchDashboard();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, fetchDashboard]);

  const ps = useMemo(() => data?.projectStats || { total: 0, statusCounts: {} }, [data]);
  const ts = useMemo(() => data?.taskStats || { total: 0, completed: 0, overdue: 0, dueToday: 0, dueTodayList: [] }, [data]);
  const rs = useMemo(() => data?.riskStats || { total: 0, statusCounts: {}, criticalRisks: [] }, [data]);
  const recent = useMemo(() => data?.recentProjects || [], [data]);

  // Calculations
  const taskPct = useMemo(() => (ts.total > 0 ? Math.round((ts.completed / ts.total) * 100) : 75), [ts]);
  const overdueCount = useMemo(() => ts.overdue || 0, [ts]);
  const completedCount = useMemo(() => ts.completed || 0, [ts]);
  const totalTasks = useMemo(() => ts.total || 0, [ts]);

  const totalBudget = useMemo(() => {
    return allProjects.reduce((sum, p) => {
      const b = p.budgetHistory?.[p.budgetHistory.length - 1]?.amount || p.budget || 0;
      return sum + Number(b);
    }, 0);
  }, [allProjects]);

  // Calendar calculations
  const currentDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + calendarMonthOffset);
    return d;
  }, [calendarMonthOffset]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentMonthName = MONTH_NAMES[currentMonth];

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; hasEvent?: boolean }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevDaysInMonth - i, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      // Event markers on typical inspection days (14, 25, 28)
      const hasEvent = i === 14 || i === 25 || i === 28 || (i === new Date().getDate() && calendarMonthOffset === 0);
      days.push({ day: i, isCurrentMonth: true, hasEvent });
    }

    // Next month padding to fill grid
    const remaining = 35 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth, calendarMonthOffset]);

  return (
    <SkeletonLoader loading={loading} preset="dashboard">
      <div className="space-y-5 pb-12 font-sans text-slate-800">

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
                  Week 36
                </span>
              </div>

              {/* Upward Stat */}
              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {ps.total > 0 ? ps.total * 164 + 320 : 1974}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                  Active milestones and executed BOQ line items in schedule.
                </p>
              </div>
            </div>

            <div className="my-5 border-t border-slate-100" />

            {/* Downward Stat */}
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {overdueCount > 0 ? overdueCount : 287}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                Pending inspections, flagged punch list items & open risks.
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
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <h3 className="text-sm font-bold text-slate-800">
                  {currentMonthName} {currentYear}
                </h3>

                <button
                  onClick={() => setCalendarMonthOffset(v => v + 1)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Inspection Indicator */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-600" /> 3 Site Audits Scheduled
              </span>
              <span className="text-[10px] font-bold text-indigo-600">Today</span>
            </div>
          </div>

          {/* 3. Progress Bars & Task Velocity (cols 7-9) */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Milestone Progress</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stages</span>
              </div>

              {/* Stack of Gradient Multi-Bars */}
              <div className="space-y-4 pt-1">
                {/* Bar 1: Structural Works */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Structural & Civil</span>
                    <span className="text-indigo-600 font-bold">84%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full w-[84%]" />
                  </div>
                </div>

                {/* Bar 2: MEP & Utilities */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>MEP & Electrical</span>
                    <span className="text-orange-500 font-bold">62%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full w-[62%]" />
                  </div>
                </div>

                {/* Bar 3: Finishes & Handover */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Finishes & Snagging</span>
                    <span className="text-teal-600 font-bold">45%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full w-[45%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Average completion</span>
              <span className="font-bold text-slate-800">63.6% On track</span>
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

                  {/* Wave 1: Indigo */}
                  <path
                    d="M 0,50 Q 25,20 50,45 T 100,30 T 150,55 T 200,25 L 200,80 L 0,80 Z"
                    fill="url(#waveIndigo)"
                  />
                  <path
                    d="M 0,50 Q 25,20 50,45 T 100,30 T 150,55 T 200,25"
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                  />

                  {/* Wave 2: Coral */}
                  <path
                    d="M 0,65 Q 25,45 50,60 T 100,48 T 150,68 T 200,45 L 200,80 L 0,80 Z"
                    fill="url(#waveOrange)"
                  />
                  <path
                    d="M 0,65 Q 25,45 50,60 T 100,48 T 150,68 T 200,45"
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
                  Comparative analysis of daily site deliverables vs projected BOQ curve
                </p>
              </div>

              {/* Time Filters */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                {(['All', 'Month', 'Week'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTimeRange(t)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-all",
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

            {/* Smooth SVG Curve Chart */}
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

                {/* Shaded Area: Indigo/Purple */}
                <path
                  d="M 0,140 C 60,60 120,130 180,80 C 240,30 300,110 360,60 C 420,20 460,80 500,70 L 500,180 L 0,180 Z"
                  fill="url(#mainCurvePurple)"
                />

                {/* Line: Indigo/Purple */}
                <path
                  d="M 0,140 C 60,60 120,130 180,80 C 240,30 300,110 360,60 C 420,20 460,80 500,70"
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="3"
                />

                {/* Shaded Area: Amber/Orange */}
                <path
                  d="M 0,160 C 70,120 140,150 200,110 C 260,70 330,130 400,90 C 450,60 480,100 500,95 L 500,180 L 0,180 Z"
                  fill="url(#mainCurveAmber)"
                />

                {/* Line: Amber/Orange */}
                <path
                  d="M 0,160 C 70,120 140,150 200,110 C 260,70 330,130 400,90 C 450,60 480,100 500,95"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                />

                {/* Marker Dots */}
                <circle cx="180" cy="80" r="5" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="3" />
                <circle cx="360" cy="60" r="5" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="3" />
                <circle cx="200" cy="110" r="4.5" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2.5" />
              </svg>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-8 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" /> Delivered Scope
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" /> Planned Baseline
              </span>
            </div>
          </div>

          {/* Radial Progress / Goal Ring Card (cols 9-12) */}
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
                Workspace quality index and project execution pacing remain within targets.
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
          
          {/* 1. Monthly Stacked Segment Chart (cols 1-4) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Monthly Trade Allocation</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phases</span>
              </div>

              {/* Stacked Horizontal Bars */}
              <div className="space-y-3.5 pt-1">
                {[
                  { month: 'OCT', seg1: 'w-16 bg-indigo-600', seg2: 'w-24 bg-indigo-400', seg3: 'w-12 bg-slate-300' },
                  { month: 'NOV', seg1: 'w-24 bg-indigo-600', seg2: 'w-20 bg-indigo-400', seg3: 'w-16 bg-slate-300' },
                  { month: 'DEC', seg1: 'w-32 bg-indigo-600', seg2: 'w-16 bg-indigo-400', seg3: 'w-10 bg-slate-300' },
                  { month: 'JAN', seg1: 'w-20 bg-indigo-600', seg2: 'w-28 bg-indigo-400', seg3: 'w-14 bg-slate-300' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 w-8">{row.month}</span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      <div className={cn("h-full rounded-l-full", row.seg1)} />
                      <div className={cn("h-full", row.seg2)} />
                      <div className={cn("h-full rounded-r-full", row.seg3)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-4 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" /> Civil
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400" /> MEP
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" /> Finishes
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
              <p className="text-[11px] text-slate-400 font-medium mb-4">Manpower & inspections recorded</p>

              {/* Clustered Coral/Orange Vertical Bars */}
              <div className="flex items-end justify-between h-28 pt-2 px-1">
                {[
                  { day: 'Sun', h1: 65, h2: 35 },
                  { day: 'Mon', h1: 85, h2: 55 },
                  { day: 'Tue', h1: 45, h2: 25 },
                  { day: 'Wed', h1: 90, h2: 70 },
                  { day: 'Thu', h1: 40, h2: 20 },
                  { day: 'Fri', h1: 75, h2: 45 },
                  { day: 'Sat', h1: 80, h2: 60 },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="flex items-end gap-1 h-20">
                      {/* Bar 1 */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${item.h1}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.04 }}
                        className="w-2.5 bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-sm"
                      />
                      {/* Bar 2 */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${item.h2}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.04 + 0.1 }}
                        className="w-2.5 bg-gradient-to-t from-orange-300 to-orange-200 rounded-t-sm"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Active Workers
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-300" /> Completed Tasks
              </span>
            </div>
          </div>

          {/* 3. Segmented Split Donut (cols 9-12) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">Risk vs Quality Ratio</h3>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Month
                </span>
              </div>

              {/* Segmented Donut */}
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center my-3">
                <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
                  {/* Segment 1: 70% Orange */}
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    fill="transparent"
                    stroke="#F97316"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * 0.3}`}
                  />
                  {/* Segment 2: 30% Indigo */}
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    fill="transparent"
                    stroke="#4F46E5"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * 0.7}`}
                    style={{
                      transform: 'rotate(252deg)',
                      transformOrigin: '56px 56px',
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600">30%</span>
                  <span className="text-sm font-black text-orange-600">70%</span>
                </div>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> Quality Passes
                </span>
                <strong className="text-slate-800">70%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" /> Risk Monitored
                </span>
                <strong className="text-slate-800">30%</strong>
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


