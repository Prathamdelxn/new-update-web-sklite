'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  Calendar,
  FolderTree,
  CheckCircle2,
  Clock,
  Circle,
  Package,
  Layers,
  Sparkles,
  User,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';
import { Card } from '@/components/interior/ui';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays, format, min, max, startOfWeek, endOfWeek, isToday, isValid } from 'date-fns';

interface InteriorTimelineViewProps {
  projectId: string;
}

const UNASSIGNED_WBS_ID = 'unassigned-wbs';

// Helper to gather all descendant node IDs of a WBS root node
const getAllDescendantIds = (node: any): string[] => {
  const ids: string[] = [];
  const collect = (curr: any) => {
    if (!curr) return;
    const currId = String(curr.id || curr._id || '');
    if (currId) ids.push(currId);
    if (Array.isArray(curr.floors)) curr.floors.forEach(collect);
    if (Array.isArray(curr.zones)) curr.zones.forEach(collect);
    if (Array.isArray(curr.areas)) curr.areas.forEach(collect);
    if (Array.isArray(curr.packages)) curr.packages.forEach(collect);
    if (Array.isArray(curr.children)) curr.children.forEach(collect);
  };
  collect(node);
  return ids;
};

// Normalize task status to 3 industry standard pipeline stages
const normalizeStatus = (st: string): 'completed' | 'in_progress' | 'todo' => {
  if (st === 'completed') return 'completed';
  if (st === 'in_progress' || st === 'in_review') return 'in_progress';
  return 'todo';
};

const statusBadges: Record<'completed' | 'in_progress' | 'todo', { label: string; bg: string; text: string; dot: string; barBg: string }> = {
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    barBg: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    barBg: 'bg-blue-600 hover:bg-blue-700 border-blue-700',
  },
  todo: {
    label: 'To Do',
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    barBg: 'bg-slate-400 hover:bg-slate-500 border-slate-500',
  },
};

export default function InteriorTimelineView({ projectId }: InteriorTimelineViewProps) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [wbsRootNodes, setWbsRootNodes] = useState<any[]>([]);
  const [expandedWbs, setExpandedWbs] = useState<Set<string>>(new Set());
  const didInitExpansion = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tasksRes, wbsRes] = await Promise.all([
          interiorProjectService.getTasks(projectId),
          interiorProjectService.getWbs(projectId),
        ]);

        if (tasksRes?.success && tasksRes?.data) {
          setTasks(tasksRes.data);
        }
        if (wbsRes?.success && wbsRes?.data) {
          setWbsRootNodes(wbsRes.data);
        }
      } catch (err) {
        console.error('Failed to load timeline data', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchData();
  }, [projectId]);

  const toggleWbs = (id: string) => {
    setExpandedWbs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedWbs(new Set(timelineData.map((w) => w._id)));
  };

  const collapseAll = () => {
    setExpandedWbs(new Set());
  };

  const DAY_WIDTH = 44; // pixels per day

  const { minDate, maxDate, totalDays, dates, timelineData, totalTasksCount } = useMemo(() => {
    if (wbsRootNodes.length === 0 && tasks.length === 0) {
      const today = new Date();
      return {
        minDate: today,
        maxDate: today,
        totalDays: 0,
        dates: [],
        timelineData: [],
        totalTasksCount: 0,
      };
    }

    let allDates: Date[] = [];

    // Helper to safely parse dates
    const collectDate = (dateVal: any) => {
      if (!dateVal) return;
      const d = new Date(dateVal);
      if (isValid(d) && !isNaN(d.getTime())) {
        allDates.push(d);
      }
    };

    // Collect dates from tasks
    tasks.forEach((t) => {
      collectDate(t.startDate);
      collectDate(t.endDate);
      collectDate(t.createdAt);
    });

    // Collect dates from WBS nodes
    wbsRootNodes.forEach((w) => {
      collectDate(w.startDate);
      collectDate(w.endDate);
    });

    if (allDates.length === 0) {
      allDates = [new Date()];
    }

    // Add padding to the timeline (7 days before min, 14 days after max)
    const minD = addDays(startOfWeek(min(allDates)), -7);
    const maxD = addDays(endOfWeek(max(allDates)), 14);
    const totalDays = differenceInDays(maxD, minD) + 1;
    const dates = Array.from({ length: totalDays }).map((_, i) => addDays(minD, i));

    // ── Build WBS -> Tasks 2-Level Grouping ──
    const claimedTaskIds = new Set<string>();

    const groupedWbs = wbsRootNodes.map((rootNode) => {
      const wbsId = String(rootNode.id || rootNode._id || '');
      const descendantIds = getAllDescendantIds(rootNode);
      const descendantSet = new Set(descendantIds);

      // Match tasks belonging to this WBS node or any of its children
      const matchingTasks = tasks.filter((t) => {
        const pId = String(t.packageId?._id || t.packageId?.id || t.packageId || '');
        return descendantSet.has(pId);
      });

      matchingTasks.forEach((t) => claimedTaskIds.add(String(t._id)));

      // Compute earliest start and latest end for the WBS summary bar
      let wbsStart = rootNode.startDate ? new Date(rootNode.startDate) : null;
      let wbsEnd = rootNode.endDate ? new Date(rootNode.endDate) : null;

      matchingTasks.forEach((t) => {
        if (t.startDate) {
          const sd = new Date(t.startDate);
          if (isValid(sd) && (!wbsStart || sd < wbsStart)) wbsStart = sd;
        }
        if (t.endDate) {
          const ed = new Date(t.endDate);
          if (isValid(ed) && (!wbsEnd || ed > wbsEnd)) wbsEnd = ed;
        }
      });

      const completedCount = matchingTasks.filter((t) => normalizeStatus(t.status) === 'completed').length;
      const progress = matchingTasks.length > 0 ? Math.round((completedCount / matchingTasks.length) * 100) : (rootNode.progress || 0);

      return {
        _id: wbsId,
        name: rootNode.name || 'WBS Element',
        trade: rootNode.trade,
        startDate: wbsStart,
        endDate: wbsEnd,
        progress,
        tasks: matchingTasks,
      };
    });

    // Handle any orphaned / unassigned tasks that don't map to existing WBS elements
    const unassignedTasks = tasks.filter((t) => !claimedTaskIds.has(String(t._id)));
    if (unassignedTasks.length > 0) {
      let unassignedStart: Date | null = null;
      let unassignedEnd: Date | null = null;

      unassignedTasks.forEach((t) => {
        if (t.startDate) {
          const sd = new Date(t.startDate);
          if (isValid(sd) && (!unassignedStart || sd < unassignedStart)) unassignedStart = sd;
        }
        if (t.endDate) {
          const ed = new Date(t.endDate);
          if (isValid(ed) && (!unassignedEnd || ed > unassignedEnd)) unassignedEnd = ed;
        }
      });

      const completedCount = unassignedTasks.filter((t) => normalizeStatus(t.status) === 'completed').length;
      const progress = Math.round((completedCount / unassignedTasks.length) * 100);

      groupedWbs.push({
        _id: UNASSIGNED_WBS_ID,
        name: 'General / Unassigned Activities',
        trade: undefined,
        startDate: unassignedStart,
        endDate: unassignedEnd,
        progress,
        tasks: unassignedTasks,
      });
    }

    return {
      minDate: minD,
      maxDate: maxD,
      totalDays,
      dates,
      timelineData: groupedWbs,
      totalTasksCount: tasks.length,
    };
  }, [wbsRootNodes, tasks]);

  // Expand all WBS groups on first load
  useEffect(() => {
    if (loading || didInitExpansion.current || timelineData.length === 0) return;
    setExpandedWbs(new Set(timelineData.map((w) => w._id)));
    didInitExpansion.current = true;
  }, [loading, timelineData]);

  // Scroll to Today
  const scrollToToday = () => {
    if (!scrollContainerRef.current) return;
    const todayIndex = differenceInDays(new Date(), minDate);
    if (todayIndex >= 0 && todayIndex < totalDays) {
      const scrollPos = todayIndex * DAY_WIDTH - 200;
      scrollContainerRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs text-slate-400 font-medium">Loading project Gantt chart...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 flex flex-col h-[calc(100vh-140px)] min-h-[700px] max-w-full">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Timeline & Gantt</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {timelineData.length} WBS • {totalTasksCount} Activit{totalTasksCount !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Work Breakdown Structure & Activity schedule visualization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={scrollToToday}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Today</span>
          </button>

          <button
            onClick={expandedWbs.size === timelineData.length ? collapseAll : expandAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            {expandedWbs.size === timelineData.length ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Expand All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {timelineData.length === 0 ? (
        <Card className="p-16 text-center border border-dashed border-slate-200 bg-white rounded-2xl shadow-xs">
          <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No WBS & Activities Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create WBS packages and actionable activities in the WBS tab to see your visual timeline schedule.
          </p>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden border border-slate-200 rounded-2xl shadow-xs bg-white isolate">
          {/* Main Scroll Container */}
          <div ref={scrollContainerRef} className="flex-1 overflow-auto relative bg-white select-none">
            <div className="min-w-max flex flex-col relative">
              
              {/* Vertical Grid Lines (Background) */}
              <div
                className="absolute top-[57px] bottom-0 z-0 pointer-events-none flex"
                style={{ left: '440px', width: `${totalDays * DAY_WIDTH}px` }}
              >
                {dates.map((date, i) => {
                  const today = isToday(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'border-r border-slate-100 shrink-0 h-full relative',
                        isWeekend ? 'bg-slate-50/70' : '',
                        today ? 'bg-blue-50/40' : ''
                      )}
                      style={{ width: `${DAY_WIDTH}px` }}
                    >
                      {today && (
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-blue-500/80 z-20 shadow-xs" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Header Row */}
              <div className="flex h-[57px] sticky top-0 z-30 shadow-2xs">
                {/* Left Tree Header */}
                <div className="w-[440px] shrink-0 sticky left-0 z-40 bg-slate-50 border-r border-b border-slate-200 flex items-center px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider shadow-xs">
                  <div className="flex-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>WBS Element / Activity</span>
                  </div>
                  <div className="w-[85px] text-center">Start</div>
                  <div className="w-[85px] text-center">End</div>
                </div>

                {/* Right Timeline Date Header */}
                <div
                  className="flex flex-col bg-slate-50 border-b border-slate-200"
                  style={{ width: `${totalDays * DAY_WIDTH}px` }}
                >
                  {/* Months Row */}
                  <div className="flex h-7 border-b border-slate-200 bg-slate-100/70">
                    {(() => {
                      const months: { label: string; days: number }[] = [];
                      let currentMonth = '';
                      let currentCount = 0;
                      dates.forEach((d) => {
                        const m = format(d, 'MMMM yyyy');
                        if (m !== currentMonth) {
                          if (currentMonth) months.push({ label: currentMonth, days: currentCount });
                          currentMonth = m;
                          currentCount = 1;
                        } else {
                          currentCount++;
                        }
                      });
                      if (currentMonth) months.push({ label: currentMonth, days: currentCount });

                      return months.map((m, i) => (
                        <div
                          key={i}
                          className="border-r border-slate-200 flex items-center overflow-hidden"
                          style={{ width: `${m.days * DAY_WIDTH}px` }}
                        >
                          <span className="sticky left-0 px-3 text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                            {m.label}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Days Row */}
                  <div className="flex h-7">
                    {dates.map((date, i) => {
                      const today = isToday(date);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'border-r border-slate-200 shrink-0 flex items-center justify-center text-[10px]',
                            today
                              ? 'bg-blue-600 text-white font-bold'
                              : isWeekend
                              ? 'bg-slate-200/50 font-semibold text-slate-600'
                              : 'text-slate-500'
                          )}
                          style={{ width: `${DAY_WIDTH}px` }}
                        >
                          {format(date, 'dd')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Body Rows */}
              <div className="flex flex-col z-10 pb-16">
                {timelineData.map((wbs) => {
                  const isWbsExpanded = expandedWbs.has(wbs._id);
                  const hasTasks = wbs.tasks.length > 0;

                  // WBS summary bar coordinates
                  const hasWbsDates = Boolean(wbs.startDate && wbs.endDate && isValid(wbs.startDate) && isValid(wbs.endDate));
                  let wbsLeft = 0;
                  let wbsWidth = 0;
                  if (hasWbsDates && wbs.startDate && wbs.endDate) {
                    wbsLeft = differenceInDays(wbs.startDate, minDate) * DAY_WIDTH;
                    wbsWidth = (differenceInDays(wbs.endDate, wbs.startDate) + 1) * DAY_WIDTH;
                  }

                  return (
                    <div key={wbs._id} className="flex flex-col">
                      {/* =========================================================
                          1. TOP-LEVEL WBS ROW
                         ========================================================= */}
                      <div className="flex h-[44px] border-b border-slate-200 bg-slate-50/80 hover:bg-slate-100/70 transition-colors group/wbsrow">
                        {/* Left Cell (Tree Node) */}
                        <div
                          className="w-[440px] shrink-0 sticky left-0 z-20 bg-slate-50/90 group-hover/wbsrow:bg-slate-100/90 border-r border-slate-200 shadow-xs cursor-pointer transition-colors"
                          onClick={() => toggleWbs(wbs._id)}
                        >
                          <div className="flex items-center px-4 w-full h-full">
                            <div className="flex-1 flex items-center gap-2 overflow-hidden">
                              <button
                                type="button"
                                className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                              >
                                {isWbsExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-500" />
                                )}
                              </button>

                              <FolderTree className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="text-xs font-bold text-slate-900 tracking-tight truncate" title={wbs.name}>
                                {wbs.name}
                              </span>

                              {wbs.trade && (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                  {wbs.trade}
                                </span>
                              )}

                              <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-auto mr-2">
                                ({wbs.tasks.length} task{wbs.tasks.length !== 1 ? 's' : ''})
                              </span>
                            </div>

                            <div className="w-[85px] text-center text-[10px] font-semibold text-slate-600">
                              {wbs.startDate ? format(wbs.startDate, 'MMM dd') : '—'}
                            </div>
                            <div className="w-[85px] text-center text-[10px] font-semibold text-slate-600">
                              {wbs.endDate ? format(wbs.endDate, 'MMM dd') : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Right Gantt Bar Cell (WBS Summary Bar) */}
                        <div
                          className="relative bg-slate-50/30 group-hover/wbsrow:bg-slate-100/40 transition-colors"
                          style={{ width: `${totalDays * DAY_WIDTH}px` }}
                        >
                          {hasWbsDates && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md shadow-xs bg-slate-800 text-white flex items-center justify-between px-2 text-[10px] font-bold border border-slate-900 transition-all hover:brightness-110 cursor-pointer"
                              style={{
                                left: `${Math.max(0, wbsLeft)}px`,
                                width: `${Math.max(DAY_WIDTH, wbsWidth)}px`,
                              }}
                              title={`WBS: ${wbs.name} (${wbs.progress}% complete)`}
                            >
                              <span className="truncate pr-1">
                                {wbs.name}
                              </span>
                              <span className="text-[9px] text-blue-300 font-mono shrink-0">
                                {wbs.progress}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* =========================================================
                          2. DIRECT ACTIVITIES / TASKS UNDER WBS
                         ========================================================= */}
                      {isWbsExpanded && (
                        <>
                          {wbs.tasks.length === 0 ? (
                            <div className="flex h-[36px] border-b border-slate-100 bg-white">
                              <div className="w-[440px] shrink-0 sticky left-0 z-20 bg-white border-r border-slate-100 pl-12 pr-4 flex items-center text-xs text-slate-400 italic">
                                No activities inside this WBS element yet.
                              </div>
                              <div style={{ width: `${totalDays * DAY_WIDTH}px` }} />
                            </div>
                          ) : (
                            wbs.tasks.map((task: any) => {
                              const normStatus = normalizeStatus(task.status);
                              const badge = statusBadges[normStatus];

                              const taskStart = task.startDate ? new Date(task.startDate) : null;
                              const taskEnd = task.endDate ? new Date(task.endDate) : taskStart;
                              const hasDates = taskStart && taskEnd && isValid(taskStart) && isValid(taskEnd);

                              let taskLeft = 0;
                              let taskWidth = 0;
                              if (hasDates) {
                                taskLeft = differenceInDays(taskStart, minDate) * DAY_WIDTH;
                                taskWidth = (differenceInDays(taskEnd, taskStart) + 1) * DAY_WIDTH;
                              }

                              const assigneeName =
                                task.assignees && task.assignees.length > 0
                                  ? `${task.assignees[0].firstName || ''} ${task.assignees[0].lastName || ''}`.trim()
                                  : null;

                              return (
                                <div
                                  key={task._id}
                                  className="flex h-[40px] border-b border-slate-100 hover:bg-blue-50/30 transition-colors group/taskrow"
                                >
                                  {/* Left Cell (Task Name & Dates) */}
                                  <div className="w-[440px] shrink-0 sticky left-0 z-20 bg-white group-hover/taskrow:bg-slate-50/90 border-r border-slate-200 shadow-2xs transition-colors">
                                    <div className="flex items-center px-4 pl-10 w-full h-full">
                                      <div className="flex-1 flex items-center gap-2 overflow-hidden">
                                        {normStatus === 'completed' ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        ) : normStatus === 'in_progress' ? (
                                          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        ) : (
                                          <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        )}

                                        <span
                                          className={cn(
                                            'text-xs font-medium text-slate-800 truncate',
                                            normStatus === 'completed' ? 'line-through text-slate-400' : ''
                                          )}
                                          title={task.name}
                                        >
                                          {task.name}
                                        </span>

                                        <span
                                          className={cn(
                                            'px-1.5 py-0.2 text-[9px] font-bold rounded-full uppercase border shrink-0',
                                            badge.bg,
                                            badge.text
                                          )}
                                        >
                                          {badge.label}
                                        </span>
                                      </div>

                                      <div className="w-[85px] text-center text-[10px] text-slate-500">
                                        {taskStart ? format(taskStart, 'MMM dd') : '—'}
                                      </div>
                                      <div className="w-[85px] text-center text-[10px] text-slate-500">
                                        {taskEnd ? format(taskEnd, 'MMM dd') : '—'}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Cell (Interactive Gantt Task Bar) */}
                                  <div
                                    className="relative bg-transparent group-hover/taskrow:bg-blue-50/20 transition-colors"
                                    style={{ width: `${totalDays * DAY_WIDTH}px` }}
                                  >
                                    {hasDates && (
                                      <div
                                        className={cn(
                                          'absolute top-1/2 -translate-y-1/2 h-6 rounded-md shadow-xs text-white flex items-center px-2.5 text-[11px] font-medium border transition-transform hover:scale-102 hover:shadow-md cursor-pointer',
                                          badge.barBg
                                        )}
                                        style={{
                                          left: `${Math.max(0, taskLeft)}px`,
                                          width: `${Math.max(DAY_WIDTH, taskWidth)}px`,
                                        }}
                                        title={`${task.name} • ${badge.label} • ${taskStart ? format(taskStart, 'MMM dd') : ''} - ${taskEnd ? format(taskEnd, 'MMM dd') : ''}`}
                                      >
                                        <span className="truncate pr-1 text-[10px] font-semibold">
                                          {task.name}
                                        </span>
                                        {assigneeName && taskWidth > 120 && (
                                          <span className="ml-auto text-[9px] bg-black/20 px-1.5 py-0.5 rounded text-white/90 truncate max-w-[90px]">
                                            {assigneeName}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
