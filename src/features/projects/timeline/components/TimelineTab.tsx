'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2, GanttChart, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle2, Circle, CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface TimelineTabProps {
  projectId: string;
}

const STATUS_COLORS: Record<string, { bar: string; fill: string; text: string; border: string }> = {
  'Completed':   { bar: 'bg-emerald-500', fill: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-400' },
  'In Progress': { bar: 'bg-blue-500',    fill: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-400'   },
  'Pending':     { bar: 'bg-slate-400',   fill: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-300'  },
  'On Hold':     { bar: 'bg-amber-400',   fill: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-400'  },
};

const STATUS_DOT: Record<string, string> = {
  'Completed':   'bg-emerald-500',
  'In Progress': 'bg-blue-500',
  'Pending':     'bg-slate-400',
  'On Hold':     'bg-amber-400',
};

const MILESTONE_H = 56;
const TASK_H      = 40;
const DAY_W       = 28;
const MONTH_ROW   = 32;
const DAY_ROW     = 26;
const LABEL_W     = 224;

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('default', { day: 'numeric', month: 'short' });
}

function monthLabel(d: Date): string {
  return d.toLocaleString('default', { month: 'short', year: '2-digit' });
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ projectId }) => {
  const [milestones, setMilestones]   = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    api.get(`/projects/${projectId}/milestones`)
      .then(r => setMilestones(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load milestones'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Loading state handled by Skeleton wrapper

  // Normalise milestone dates and attach per-task dates
  const normalized = milestones.map(m => {
    let barStart = m.createdAt ? startOfDay(new Date(m.createdAt)) : startOfDay(new Date());
    let barEnd = m.dueDate ? startOfDay(new Date(m.dueDate)) : addDays(barStart, 30);

    const tasks = (Array.isArray(m.tasks) ? m.tasks : []).map((t: any) => {
      const tStart = t.startDate ? startOfDay(new Date(t.startDate)) : barStart;
      const tEnd   = (t.dueDate || t.endDate) ? startOfDay(new Date(t.dueDate || t.endDate)) : barEnd;
      return { ...t, tStart, tEnd };
    });

    if (tasks.length > 0) {
      let minT: Date | null = null;
      let maxT: Date | null = null;
      tasks.forEach((t: any) => {
        if (t.startDate) {
          const s = startOfDay(new Date(t.startDate));
          if (!minT || s < minT) minT = s;
        }
        if (t.endDate || t.dueDate) {
          const e = startOfDay(new Date(t.endDate || t.dueDate));
          if (!maxT || e > maxT) maxT = e;
        }
      });
      if (minT) barStart = minT;
      if (maxT) barEnd = maxT;
    }

    return { ...m, label: m.name || m.title || 'Untitled', barStart, barEnd, tasks };
  });

  if (normalized.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-gray-200 rounded-3xl">
        <div className="p-6 rounded-full bg-gray-100 mb-6">
          <GanttChart className="w-12 h-12 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No timeline data yet</h3>
        <p className="text-slate-500 max-w-xs">Add milestones with dates to visualize your project timeline.</p>
      </div>
    );
  }

  const today = startOfDay(new Date());

  // Range covers milestone bars AND individual task bars
  const allDates = normalized.flatMap(m => [
    m.barStart, m.barEnd,
    ...m.tasks.flatMap((t: any) => [t.tStart, t.tEnd]),
  ]);
  const rangeStart = allDates.reduce((a, b) => (a < b ? a : b));
  const rangeEnd   = allDates.reduce((a, b) => (a > b ? a : b));
  const viewStart  = addDays(rangeStart, -4);
  const viewEnd    = addDays(rangeEnd, 6);
  const totalDays  = diffDays(viewStart, viewEnd) + 1;
  const todayOff   = diffDays(viewStart, today);
  const totalW     = totalDays * DAY_W;

  // Month header segments
  const months: { label: string; span: number }[] = [];
  {
    let cur = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
    while (cur <= viewEnd) {
      const ms = cur < viewStart ? viewStart : cur;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const me = next > viewEnd ? viewEnd : addDays(next, -1);
      months.push({ label: monthLabel(cur), span: diffDays(ms, me) + 1 });
      cur = next;
    }
  }

  // Day cells array (used for day-row header and weekend shading)
  const days = Array.from({ length: totalDays }, (_, i) => addDays(viewStart, i));

  const scroll = (dir: -1 | 1) =>
    scrollRef.current?.scrollBy({ left: dir * DAY_W * 7, behavior: 'smooth' });

  const scrollToToday = () => {
    if (!scrollRef.current) return;
    const x = Math.max(0, todayOff * DAY_W - scrollRef.current.clientWidth / 2);
    scrollRef.current.scrollTo({ left: x, behavior: 'smooth' });
  };

  const todayInRange = todayOff >= 0 && todayOff < totalDays;

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-6">
        {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Project Timeline</h3>
          <p className="text-sm text-slate-500 mt-1">Click a milestone row to expand its tasks.</p>
        </div>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn('w-2.5 h-2.5 rounded-full', c.bar)} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{s}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-3 bg-red-500 rounded-full" />
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Today</span>
          </div>
        </div>
      </div>

      {/* Scroll controls */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => scroll(-1)}
          className="p-2 rounded-xl bg-white border border-gray-200 text-slate-500 hover:text-gray-900 hover:bg-gray-50 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {todayInRange && (
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100 transition-all"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Today
          </button>
        )}
        <button
          onClick={() => scroll(1)}
          className="p-2 rounded-xl bg-white border border-gray-200 text-slate-500 hover:text-gray-900 hover:bg-gray-50 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Gantt grid */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex">

          {/* ── Label column ── */}
          <div style={{ width: LABEL_W }} className="shrink-0 border-r border-gray-200 bg-gray-50">

            {/* Header spacer (matches two header rows) */}
            <div
              style={{ height: MONTH_ROW + DAY_ROW }}
              className="border-b border-gray-200 flex items-end px-4 pb-1.5 bg-gray-50"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Milestone / Task</span>
            </div>

            {normalized.map((m, i) => {
              const rowKey   = m._id || String(i);
              const expanded = expandedIds.has(rowKey);
              const hasTasks = m.tasks.length > 0;
              const c        = STATUS_COLORS[m.status] || STATUS_COLORS['Pending'];
              const dotColor = STATUS_DOT[m.status] || STATUS_DOT['Pending'];
              const done     = m.tasks.filter((t: any) => t.isCompleted).length;

              return (
                <div key={rowKey}>
                  {/* Milestone label row */}
                  <div
                    onClick={() => hasTasks && toggleExpand(rowKey)}
                    style={{ height: MILESTONE_H }}
                    className={cn(
                      'flex items-center gap-2 px-3 border-b border-gray-100',
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60',
                      hasTasks ? 'cursor-pointer hover:bg-blue-50/40 transition-colors' : ''
                    )}
                  >
                    <ChevronDown className={cn(
                      'w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200',
                      hasTasks ? 'opacity-100' : 'opacity-0',
                      expanded ? 'rotate-0' : '-rotate-90'
                    )} />
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotColor)} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate leading-tight">{m.label}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        {fmtShort(m.barStart)} → {fmtShort(m.barEnd)}
                      </p>
                      {hasTasks && (
                        <p className={cn('text-[9px] font-bold mt-0.5', c.text)}>
                          {done}/{m.tasks.length} tasks · {m.status || 'Pending'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Task label rows */}
                  {expanded && m.tasks.map((task: any, ti: number) => (
                    <div
                      key={task._id || ti}
                      style={{ height: TASK_H }}
                      className={cn(
                        'flex items-center gap-2 pl-9 pr-3 border-b border-gray-100',
                        i % 2 === 0 ? 'bg-blue-50/20' : 'bg-blue-50/30'
                      )}
                    >
                      {task.isCompleted
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        : <Circle className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                      }
                      <div className="min-w-0">
                        <p className={cn(
                          'text-[10px] font-semibold truncate',
                          task.isCompleted ? 'text-emerald-600 line-through' : 'text-slate-600'
                        )}>
                          {task.title || task.name || 'Task'}
                        </p>
                        {(task.startDate || task.dueDate || task.endDate) && (
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {fmtShort(task.tStart)} → {fmtShort(task.tEnd)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* ── Scrollable chart ── */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div style={{ width: totalW, position: 'relative' }}>

              {/* Month header row */}
              <div className="flex border-b border-gray-200 bg-gray-50" style={{ height: MONTH_ROW, width: totalW }}>
                {months.map((mo, i) => (
                  <div
                    key={i}
                    className="border-r border-gray-200 flex items-center px-2 shrink-0"
                    style={{ width: mo.span * DAY_W }}
                  >
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{mo.label}</span>
                  </div>
                ))}
              </div>

              {/* Day-number row */}
              <div className="flex border-b border-gray-200" style={{ height: DAY_ROW, width: totalW }}>
                {days.map((d, di) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isToday   = di === todayOff;
                  return (
                    <div
                      key={di}
                      style={{ width: DAY_W }}
                      className={cn(
                        'shrink-0 flex items-center justify-center border-r text-[10px] font-bold',
                        isToday   ? 'bg-red-500 text-white border-red-400' :
                        isWeekend ? 'bg-gray-100 text-slate-400 border-gray-200' :
                                    'bg-white text-slate-400 border-gray-100'
                      )}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>

              {/* Data rows */}
              {normalized.map((m, mi) => {
                const rowKey   = m._id || String(mi);
                const expanded = expandedIds.has(rowKey);
                const isEven   = mi % 2 === 0;
                const c        = STATUS_COLORS[m.status] || STATUS_COLORS['Pending'];

                const barLeft  = Math.max(0, diffDays(viewStart, m.barStart)) * DAY_W;
                const barDays  = Math.max(1, diffDays(m.barStart, m.barEnd) + 1);
                const barW     = barDays * DAY_W;

                const done  = m.tasks.filter((t: any) => t.isCompleted).length;
                const total = m.tasks.length;
                const pct   = total > 0
                  ? Math.round((done / total) * 100)
                  : (m.status === 'Completed' ? 100 : 0);

                return (
                  <div key={rowKey}>

                    {/* Milestone row */}
                    <div
                      className={cn('relative border-b border-gray-100', isEven ? 'bg-white' : 'bg-gray-50/40')}
                      style={{ height: MILESTONE_H, width: totalW }}
                    >
                      {/* Weekend shading */}
                      {days.map((d, di) =>
                        (d.getDay() === 0 || d.getDay() === 6)
                          ? <div key={di} className="absolute top-0 bottom-0 bg-gray-100/50" style={{ left: di * DAY_W, width: DAY_W }} />
                          : null
                      )}

                      {/* Today line */}
                      {todayInRange && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-400/70 z-10"
                          style={{ left: todayOff * DAY_W + DAY_W / 2 }}
                        />
                      )}

                      {/* Milestone bar */}
                      <div
                        className={cn('absolute rounded-xl border overflow-hidden z-20 flex items-center', c.fill, c.border)}
                        style={{ left: barLeft, width: barW, top: 10, height: 36 }}
                        title={`${m.label}: ${fmtShort(m.barStart)} – ${fmtShort(m.barEnd)} (${pct}%)`}
                      >
                        {/* Progress fill */}
                        <div
                          className={cn('absolute left-0 top-0 bottom-0 rounded-xl', c.bar)}
                          style={{ width: `${pct}%`, opacity: 0.5 }}
                        />
                        {barW >= 56 && (
                          <span className={cn('relative px-2.5 text-[9px] font-black uppercase tracking-wide truncate flex-1', c.text)}>
                            {m.label}
                          </span>
                        )}
                        {pct > 0 && barW >= 80 && (
                          <span className={cn('relative px-2 text-[9px] font-black shrink-0', c.text)}>{pct}%</span>
                        )}
                      </div>

                      {/* Due-date tick mark */}
                      <div
                        className={cn('absolute top-2 bottom-2 w-0.5 z-30 rounded-full opacity-80', c.bar)}
                        style={{ left: barLeft + barW - 1 }}
                        title={`Due: ${fmtShort(m.barEnd)}`}
                      />
                    </div>

                    {/* Task rows */}
                    {expanded && m.tasks.map((task: any, ti: number) => {
                      const tLeft = Math.max(0, diffDays(viewStart, task.tStart)) * DAY_W;
                      const tDays = Math.max(1, diffDays(task.tStart, task.tEnd) + 1);
                      const tW    = tDays * DAY_W;

                      return (
                        <div
                          key={task._id || ti}
                          className={cn('relative border-b border-gray-100', isEven ? 'bg-blue-50/20' : 'bg-blue-50/30')}
                          style={{ height: TASK_H, width: totalW }}
                        >
                          {days.map((d, di) =>
                            (d.getDay() === 0 || d.getDay() === 6)
                              ? <div key={di} className="absolute top-0 bottom-0 bg-gray-100/40" style={{ left: di * DAY_W, width: DAY_W }} />
                              : null
                          )}

                          {todayInRange && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-red-400/50 z-10"
                              style={{ left: todayOff * DAY_W + DAY_W / 2 }}
                            />
                          )}

                          <div
                            className={cn(
                              'absolute z-20 rounded-lg border flex items-center px-2 overflow-hidden',
                              task.isCompleted
                                ? 'bg-emerald-500 border-emerald-600'
                                : 'bg-white border-blue-300'
                            )}
                            style={{ left: tLeft, width: Math.max(DAY_W, tW), top: 8, height: 24 }}
                            title={`${task.title || task.name}: ${fmtShort(task.tStart)} – ${fmtShort(task.tEnd)}`}
                          >
                            <span className={cn(
                              'text-[9px] font-bold truncate',
                              task.isCompleted ? 'text-white' : 'text-blue-600'
                            )}>
                              {tW >= 48 ? (task.title || task.name || 'Task') : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Status summary */}
      <div className="mt-8">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Milestone Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', count: milestones.length, text: 'text-blue-500' },
            { label: 'Done', count: milestones.filter(m => m.status === 'Completed').length, text: 'text-emerald-500' },
            { label: 'Active', count: milestones.filter(m => m.status === 'In Progress').length, text: 'text-indigo-500' },
            { label: 'Pending', count: milestones.filter(m => m.status === 'Pending').length, text: 'text-slate-400' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
              <p className={cn('text-2xl font-black', s.text)}>{s.count}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SkeletonLoader>
  );
};
