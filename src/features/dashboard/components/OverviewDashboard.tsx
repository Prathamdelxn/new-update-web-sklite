'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  ListTodo,
  Calendar,
  AlertCircle,
  FolderOpen,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { motion } from 'framer-motion';
import { useAuth } from '@/providers/AuthContext';
import Link from 'next/link';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

const STATUS_META: Record<string, { color: string; bg: string }> = {
  Ongoing:              { color: '#2563EB', bg: 'bg-blue-50 text-blue-600 border-blue-100' },
  Planning:             { color: '#7C3AED', bg: 'bg-purple-50 text-purple-600 border-purple-100' },
  Completed:            { color: '#16A34A', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  'On Hold':            { color: '#D97706', bg: 'bg-amber-50 text-amber-600 border-amber-100' },
  Cancelled:            { color: '#DC2626', bg: 'bg-red-50 text-red-600 border-red-100' },
  Initialized:          { color: '#64748B', bg: 'bg-slate-50 text-slate-600 border-slate-100' },
  'Site Survey':        { color: '#0891B2', bg: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  'Under Snagging':     { color: '#EA580C', bg: 'bg-orange-50 text-orange-600 border-orange-100' },
  'Snagging Completed': { color: '#16A34A', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  'Pending Handover':   { color: '#7C3AED', bg: 'bg-purple-50 text-purple-600 border-purple-100' },
  'Handover Rejected':  { color: '#DC2626', bg: 'bg-red-50 text-red-600 border-red-100' },
  'Handover Completed': { color: '#16A34A', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
};

const RISK_META: Record<string, { color: string; bg: string }> = {
  Critical: { color: '#DC2626', bg: 'bg-red-50 text-red-600 border-red-100' },
  Active:   { color: '#D97706', bg: 'bg-amber-50 text-amber-600 border-amber-100' },
  Monitored:{ color: '#2563EB', bg: 'bg-blue-50 text-blue-600 border-blue-100' },
  Resolved: { color: '#16A34A', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
};

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

interface SvgDonutProps {
  total: number;
  label: string;
  slices: Array<{ value: number; color: string }>;
}

const SvgDonut: React.FC<SvgDonutProps> = ({ total, label, slices }) => {
  const radius = 50;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth;
  const circumference = normalizedRadius * 2 * Math.PI;

  let accumulated = 0;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg width="100%" height="100%" viewBox="0 0 100 100" className="-rotate-90">
        <circle
          stroke="#E2E8F0"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {total > 0 &&
          slices.map((slice, idx) => {
            if (slice.value <= 0) return null;
            const strokeDashoffset = circumference - (slice.value / total) * circumference;
            const rotation = (accumulated / total) * 360;
            accumulated += slice.value;

            return (
              <circle
                key={idx}
                stroke={slice.color}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{
                  strokeDashoffset,
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: '50px 50px',
                }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-500"
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-extrabold text-gray-900 leading-none">{total}</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</span>
      </div>
    </div>
  );
};

export const OverviewDashboard = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      console.log("dashboard",res);
      if (res.data) {
        setData(res.data);
      }
    } catch (e) {
      console.error('Web dashboard fetch error', e);
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

  const taskPct = useMemo(() => (ts.total > 0 ? Math.round((ts.completed / ts.total) * 100) : 0), [ts]);

  const barData = useMemo(() => {
    return Object.entries(ps.statusCounts)
      .filter(([, v]) => (v as number) > 0)
      .map(([label, value]) => ({
        label,
        value: value as number,
        color: STATUS_META[label]?.color || '#94A3B8',
      }));
  }, [ps]);

  const maxBarValue = useMemo(() => {
    if (barData.length === 0) return 1;
    return Math.max(...barData.map((d) => d.value), 1);
  }, [barData]);

  const taskPie = useMemo(() => {
    return [
      { value: ts.completed, color: '#2563EB', label: 'Completed' },
      { value: Math.max(ts.total - ts.completed, 0), color: '#E2E8F0', label: 'Remaining' },
    ];
  }, [ts]);

  const riskPie = useMemo(() => {
    return Object.entries(rs.statusCounts)
      .filter(([, v]) => (v as number) > 0)
      .map(([label, value]) => ({
        value: value as number,
        color: RISK_META[label]?.color || '#94A3B8',
        label,
      }));
  }, [rs]);

  return (
    <SkeletonLoader loading={loading} preset="dashboard">
      <div className="space-y-5 xl:space-y-6">
      {/* Welcome Greeting Header */}
      <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 rounded-2xl p-4 md:p-5">
        <div className="space-y-1">

          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Good {getTimeOfDay()}, {user?.name?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-xs text-slate-500">
            Here is your live construction project intelligence overview.
          </p>
        </div>
        <div className="hidden md:block pr-4">
          <div className="text-sm font-extrabold text-slate-700">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Summary Tiles Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50/60 border-blue-100 hover:border-blue-300', label: 'Projects', value: ps.total },
          { icon: ListTodo, color: 'text-purple-600', bg: 'bg-purple-50/60 border-purple-100 hover:border-purple-300', label: 'Tasks', value: ts.total },
          { icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50/60 border-amber-100 hover:border-amber-300', label: 'Due Today', value: ts.dueToday },
          { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50/60 border-red-100 hover:border-red-300', label: 'Overdue', value: ts.overdue },
        ].map((tile, i) => (
          <GlassCard key={i} className={cn('p-3.5 flex items-center space-x-3 border transition-all hover:-translate-y-0.5 duration-300', tile.bg)} gradient>
            <div className={cn('p-2 rounded-xl bg-white shadow-sm', tile.color)}>
              <tile.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">{tile.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{tile.label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        
        {/* Task Progress Bar Card */}
        {ts.total > 0 && (
          <GlassCard className="p-4.5 xl:p-5 border-slate-200/60 flex flex-col justify-between" gradient>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm xl:text-base font-bold text-slate-900">Task Progress</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-0.5">Execution Status</p>
                </div>
                <span className="text-base font-extrabold text-blue-600">{taskPct}%</span>
              </div>

              <div className="h-2 w-full bg-slate-100 border border-slate-200/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${taskPct}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
              {[
                { color: 'bg-blue-600', label: 'Done', val: ts.completed },
                { color: 'bg-red-500', label: 'Overdue', val: ts.overdue },
                { color: 'bg-amber-500', label: 'Today', val: ts.dueToday },
              ].map((dot, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-1">
                    <span className={cn('w-1.5 h-1.5 rounded-full', dot.color)} />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{dot.label}</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 mt-0.5">{dot.val}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Projects By Status Bar Chart */}
        {barData.length > 0 && (
          <GlassCard className="p-4.5 xl:p-5 border-slate-200/60 flex flex-col justify-between" gradient>
            <div>
              <h3 className="text-sm xl:text-base font-bold text-slate-900">Projects by Status</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-0.5">Workspace Pipeline</p>
            </div>

            <div className="flex items-end justify-between h-28 pt-2 px-1">
              {barData.map((item, idx) => {
                const heightPct = (item.value / maxBarValue) * 100;
                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-full flex-1 group relative mx-0.5">
                    {/* Hover Value Badge */}
                    <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-black px-1 py-0.5 rounded shadow-lg pointer-events-none z-10">
                      {item.value}
                    </div>
                    {/* Animated Bar Wrapper */}
                    <div className="w-4 md:w-5 flex items-end h-16 mb-1.5">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className="w-full rounded-t-md cursor-pointer transition-colors"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                    {/* Label */}
                    <span className="text-[8px] font-bold text-slate-400 truncate w-10 text-center">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Task Completion Donut */}
        {ts.total > 0 && (
          <GlassCard className="p-4.5 xl:p-5 border-slate-200/60" gradient>
            <div className="mb-3">
              <h3 className="text-sm xl:text-base font-bold text-slate-900">Task Completion</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-0.5">Efficiency Ratio</p>
            </div>

            <div className="flex items-center space-x-4">
              <SvgDonut total={ts.total} label="Tasks" slices={taskPie} />
              
              <div className="flex-1 space-y-1.5">
                {[
                  { color: 'bg-blue-600', name: 'Completed', val: ts.completed },
                  { color: 'bg-slate-200', name: 'Remaining', val: Math.max(0, ts.total - ts.completed) },
                  { color: 'bg-red-500', name: 'Overdue', val: ts.overdue },
                  { color: 'bg-amber-500', name: 'Due Today', val: ts.dueToday },
                ].map((leg, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', leg.color)} />
                      <span className="text-slate-500 truncate max-w-[80px]">{leg.name}</span>
                    </div>
                    <span className="text-slate-900 font-extrabold">{leg.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Risk Overview Donut */}
        {rs.total > 0 && (
          <GlassCard className="p-4.5 xl:p-5 border-slate-200/60" gradient>
            <div className="mb-3">
              <h3 className="text-sm xl:text-base font-bold text-slate-900">Risk Overview</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-0.5">Threat Distribution</p>
            </div>

            <div className="flex items-center space-x-4">
              <SvgDonut total={rs.total} label="Risks" slices={riskPie} />
              
              <div className="flex-1 space-y-1.5">
                {Object.entries(rs.statusCounts).map(([label, value]) => {
                  const val = value as number;
                  const dotColor = RISK_META[label]?.color || '#94A3B8';
                  return (
                    <div key={label} className="flex items-center justify-between text-[11px] font-semibold">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        <span className="text-slate-500">{label}</span>
                      </div>
                      <span className="text-slate-900 font-extrabold">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        )}
         <GlassCard className="p-4.5 xl:p-5 border-slate-200/60 flex flex-col justify-between" gradient>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4.5 h-4.5 text-slate-700" />
                <h4 className="text-sm xl:text-base font-bold text-slate-900">Recent Projects</h4>
              </div>
              <Link href="/projects" className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors flex items-center space-x-0.5">
                <span>All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
              {recent.map((p: any, i: number) => (
                <Link key={p._id} href={`/projects/${p._id}`} className="py-1.5 flex items-center justify-between group cursor-pointer">
                  <div className="min-w-0 pr-2">
                    <p className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{p.name}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {p.endDate ? `Due ${new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No end date'}
                    </p>
                  </div>
                  <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border shrink-0', STATUS_META[p.status]?.bg || 'bg-slate-50 border-slate-200 text-slate-500')}>
                    {p.status}
                  </span>
                </Link>
              ))}
              {recent.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-[11px] font-medium">
                  No projects in this workspace yet.
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

     

      {/* Fallback States (Empty Workspace / Everything Clear) */}
      {ps.total === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-100 rounded-3xl">
          <FolderOpen className="w-16 h-16 text-slate-300" />
          <h3 className="text-xl font-bold text-slate-800 mt-4">No projects yet</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-xs">
            Start by creating your first construction project from the project panel.
          </p>
          <Link href="/projects" className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-500 transition-colors">
            Go to Projects
          </Link>
        </div>
      )}

      {ps.total > 0 && ts.dueTodayList.length === 0 && rs.criticalRisks.length === 0 && (
        <div className="flex items-center space-x-4 p-6 bg-emerald-50/70 border border-emerald-100 rounded-3xl">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <h5 className="text-sm font-bold text-slate-900">Everything looks good</h5>
            <p className="text-xs text-slate-500 mt-0.5">
              No critical risks or urgent milestone tasks require immediate attention today.
            </p>
          </div>
        </div>
      )}
      </div>
    </SkeletonLoader>
  );
};
