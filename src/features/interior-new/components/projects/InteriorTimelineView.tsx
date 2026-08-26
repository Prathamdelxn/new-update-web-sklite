'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Loader2, ChevronRight, ChevronDown, Calendar, Flag, AlignLeft, Package } from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';
import { Card } from '@/components/interior/ui';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays, format, min, max, startOfWeek, endOfWeek, parseISO, isToday } from 'date-fns';

interface InteriorTimelineViewProps {
  projectId: string;
}

const UNASSIGNED_WBS_ID = 'unassigned-wbs';

export default function InteriorTimelineView({ projectId }: InteriorTimelineViewProps) {
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [wbsPackages, setWbsPackages] = useState<any[]>([]);
  const [expandedWbs, setExpandedWbs] = useState<Set<string>>(new Set());
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const didInitExpansion = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [msRes, tasksRes, wbsRes] = await Promise.all([
          interiorProjectService.getMilestones(projectId),
          interiorProjectService.getTasks(projectId),
          interiorProjectService.getWbs(projectId),
        ]);

        if (msRes.success && msRes.data) {
          setMilestones(msRes.data);
        }
        if (tasksRes.success && tasksRes.data) {
          setTasks(tasksRes.data);
        }
        if (wbsRes.success && wbsRes.data) {
          const packages: any[] = [];
          const extractPackages = (node: any) => {
            if (node.type === 'package') packages.push(node);
            if (node.floors) node.floors.forEach(extractPackages);
            if (node.zones) node.zones.forEach(extractPackages);
            if (node.areas) node.areas.forEach(extractPackages);
            if (node.packages) node.packages.forEach(extractPackages);
          };
          wbsRes.data.forEach(extractPackages);
          setWbsPackages(packages);
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
    const newSet = new Set(expandedWbs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedWbs(newSet);
  };

  const toggleMilestone = (key: string) => {
    const newSet = new Set(expandedMilestones);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setExpandedMilestones(newSet);
  };

  const { minDate, maxDate, totalDays, dates, timelineData } = useMemo(() => {
    if (milestones.length === 0 && tasks.length === 0) {
      return { minDate: new Date(), maxDate: new Date(), totalDays: 0, dates: [], timelineData: [] };
    }

    let allDates: Date[] = [];
    milestones.forEach(m => {
      if (m.dueDate) {
        const d = new Date(m.dueDate);
        if (!isNaN(d.getTime())) allDates.push(d);
      }
    });
    tasks.forEach(t => {
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (!isNaN(d.getTime())) allDates.push(d);
      }
      if (t.endDate) {
        const d = new Date(t.endDate);
        if (!isNaN(d.getTime())) allDates.push(d);
      }
    });

    if (allDates.length === 0) {
      allDates = [new Date()];
    }

    // Add padding to the timeline (1 week before, 2 weeks after)
    const minD = addDays(startOfWeek(min(allDates)), -7);
    const maxD = addDays(endOfWeek(max(allDates)), 14);
    
    const totalDays = differenceInDays(maxD, minD) + 1;
    
    const dates = Array.from({ length: totalDays }).map((_, i) => addDays(minD, i));

    // ── WBS -> Milestone -> Task grouping ──
    // Tasks are the only records carrying both a WBS package ref (packageId)
    // and a milestone ref (via milestone.linkedTasks), so grouping has to
    // bridge WBS -> tasks -> milestones rather than reading a direct
    // WBS<->Milestone relationship (none exists in the data model).
    const getPackageId = (t: any) => {
      const p = t.packageId;
      if (!p) return null;
      return typeof p === 'string' ? p : (p._id || p.id)?.toString() || null;
    };

    const packageMeta = new Map<string, { name: string; trade?: string }>();
    wbsPackages.forEach(pkg => {
      packageMeta.set((pkg.id || pkg._id).toString(), { name: pkg.name, trade: pkg.trade });
    });
    tasks.forEach(t => {
      const pid = getPackageId(t);
      const p = t.packageId;
      if (pid && p && typeof p !== 'string' && !packageMeta.has(pid)) {
        packageMeta.set(pid, { name: p.name, trade: p.trade });
      }
    });

    const tasksByPackage = new Map<string, any[]>();
    tasks.forEach(t => {
      const pid = getPackageId(t) || UNASSIGNED_WBS_ID;
      if (!tasksByPackage.has(pid)) tasksByPackage.set(pid, []);
      tasksByPackage.get(pid)!.push(t);
    });

    // Group a package's tasks into milestone sub-rows (+ a catch-all for
    // tasks in this package that aren't linked to any milestone).
    const seenMilestoneIds = new Set<string>();
    const buildMilestoneGroups = (wbsId: string, taskList: any[]) => {
      const claimed = new Set<string>();
      const groups = milestones
        .map(m => {
          const linkedTaskIds = (m.linkedTasks || []).map((lt: any) => typeof lt === 'string' ? lt : lt._id?.toString() || lt.toString());
          const mTasks = taskList.filter(t => linkedTaskIds.includes(t._id.toString()));
          mTasks.forEach(t => claimed.add(t._id.toString()));
          if (mTasks.length > 0) seenMilestoneIds.add(m._id);
          return { ...m, _key: `${wbsId}::${m._id}`, isMilestone: true, tasks: mTasks };
        })
        .filter(mg => mg.tasks.length > 0);

      const unlinkedTasks = taskList.filter(t => !claimed.has(t._id.toString()));
      if (unlinkedTasks.length > 0) {
        groups.push({
          _id: `${wbsId}::unlinked`,
          _key: `${wbsId}::unlinked`,
          name: 'Unscheduled / General Tasks',
          dueDate: null,
          status: 'planned',
          isMilestone: true,
          tasks: unlinkedTasks,
        } as any);
      }
      return groups;
    };

    const wbsIds = [
      ...wbsPackages.map(p => (p.id || p._id).toString()).filter(id => tasksByPackage.has(id)),
      ...Array.from(tasksByPackage.keys()).filter(id => id !== UNASSIGNED_WBS_ID && !packageMeta.has(id)),
    ];

    const data = wbsIds.map(wbsId => {
      const taskList = tasksByPackage.get(wbsId) || [];
      const meta = packageMeta.get(wbsId);
      return {
        _id: wbsId,
        name: meta?.name || 'Package',
        trade: meta?.trade,
        milestoneGroups: buildMilestoneGroups(wbsId, taskList),
      };
    });

    // Milestones with zero linked tasks anywhere still deserve a visible
    // due-date row, so they fall back into the "Unassigned" WBS bucket.
    const orphanMilestones = milestones.filter(m => !seenMilestoneIds.has(m._id));
    const unassignedTasks = tasksByPackage.get(UNASSIGNED_WBS_ID) || [];
    if (unassignedTasks.length > 0 || orphanMilestones.length > 0) {
      const milestoneGroups = buildMilestoneGroups(UNASSIGNED_WBS_ID, unassignedTasks);
      orphanMilestones.forEach(m => {
        milestoneGroups.push({ ...m, _key: `${UNASSIGNED_WBS_ID}::${m._id}`, isMilestone: true, tasks: [] });
      });
      if (milestoneGroups.length > 0) {
        data.push({
          _id: UNASSIGNED_WBS_ID,
          name: 'Unassigned WBS Package',
          trade: undefined,
          milestoneGroups,
        });
      }
    }

    return { minDate: minD, maxDate: maxD, totalDays, dates, timelineData: data };
  }, [milestones, tasks, wbsPackages]);

  // Expand everything on first successful load; leave user's manual
  // collapse/expand choices alone afterwards.
  useEffect(() => {
    if (loading || didInitExpansion.current || timelineData.length === 0) return;
    setExpandedWbs(new Set(timelineData.map((w: any) => w._id)));
    const allKeys = new Set<string>();
    timelineData.forEach((w: any) => w.milestoneGroups.forEach((mg: any) => allKeys.add(mg._key)));
    setExpandedMilestones(allKeys);
    didInitExpansion.current = true;
  }, [loading, timelineData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  const DAY_WIDTH = 40; // pixels per day

  return (
    <div className="p-6 lg:p-8 flex flex-col h-[85vh] min-h-[700px]">
      <div className="mb-6 shrink-0">
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Project Timeline</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
          View WBS packages, their milestones, and associated tasks on a Gantt chart.
        </p>
      </div>

      {timelineData.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-[hsl(var(--border))]">
          <Calendar className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold">No Timeline Data</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Create tasks and milestones in the Execution tabs to see them here.
          </p>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden border border-[hsl(var(--border))] rounded-xl shadow-sm bg-[hsl(var(--card))] isolate">
          
          {/* Main vertical scroll container */}
          <div className="flex-1 overflow-auto relative bg-[hsl(var(--background))] scrollbar-thin">
            <div className="min-w-max flex flex-col relative">
              
              {/* Vertical Grid Lines (Background) */}
              <div className="absolute top-[57px] bottom-0 z-0 pointer-events-none flex" style={{ left: '400px', width: `${totalDays * DAY_WIDTH}px` }}>
                {dates.map((date, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "border-r border-[hsl(var(--border))] shrink-0 h-full",
                      isToday(date) ? "bg-[hsl(var(--primary))] opacity-10" : ""
                    )} 
                    style={{ width: `${DAY_WIDTH}px` }} 
                  />
                ))}
              </div>

              {/* Header Row */}
              <div className="flex h-[57px] sticky top-0 z-30">
                {/* Left Header */}
                <div className="w-[400px] shrink-0 sticky left-0 z-40 bg-[hsl(var(--card))] border-r border-b border-[hsl(var(--border))] flex items-center px-4 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                  <div className="flex-1">WBS / Milestone / Task</div>
                  <div className="w-[70px] text-center">Start</div>
                  <div className="w-[70px] text-center">End</div>
                </div>
                {/* Right Header */}
                <div className="flex flex-col bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]" style={{ width: `${totalDays * DAY_WIDTH}px` }}>
                  {/* Months Row */}
                  <div className="flex h-7 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    {(() => {
                      const months: { label: string; days: number }[] = [];
                      let currentMonth = '';
                      let currentCount = 0;
                      dates.forEach(d => {
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
                          className="border-r border-[hsl(var(--border))] flex items-center overflow-hidden"
                          style={{ width: `${m.days * DAY_WIDTH}px` }}
                        >
                          <span className="sticky left-0 px-3 text-[10px] font-bold text-[hsl(var(--primary))] uppercase tracking-wider whitespace-nowrap">
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
                      return (
                        <div 
                          key={i} 
                          className={cn(
                            "border-r border-[hsl(var(--border))] shrink-0 flex items-center justify-center text-[10px]",
                            today ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold" :
                            date.getDay() === 0 || date.getDay() === 6 ? "bg-[hsl(var(--muted)/0.3)] font-semibold text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"
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
              <div className="flex flex-col z-10 pb-12">
                {timelineData.map((w: any) => {
                  const isWbsExpanded = expandedWbs.has(w._id);
                  return (
                    <div key={w._id} className="flex flex-col">
                      {/* WBS Row */}
                      <div className="flex h-[40px] border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.3)] transition-colors group/wbsrow">
                        {/* Left Cell */}
                        <div
                          className="w-[400px] shrink-0 sticky left-0 z-20 bg-[hsl(var(--muted)/0.2)] group-hover/wbsrow:bg-[hsl(var(--muted)/0.3)] border-r border-[hsl(var(--border))] shadow-[2px_0_10px_rgba(0,0,0,0.05)] cursor-pointer transition-colors"
                          onClick={() => toggleWbs(w._id)}
                        >
                          <div className="flex items-center px-4 w-full h-full">
                            <div className="flex-1 flex items-center gap-2 overflow-hidden">
                              <button className="p-0.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded">
                                {isWbsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                              <Package className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              <span className="text-xs font-black text-[hsl(var(--foreground))] uppercase tracking-wide truncate">{w.name}</span>
                              {w.trade && (
                                <span className="px-1.5 py-0.5 text-[9px] uppercase font-mono rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] shrink-0">
                                  {w.trade}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Right Cell */}
                        <div className="bg-[hsl(var(--muted)/0.1)]" style={{ width: `${totalDays * DAY_WIDTH}px` }} />
                      </div>

                      {/* Milestone Rows */}
                      {isWbsExpanded && w.milestoneGroups.map((m: any) => {
                        const isExpanded = expandedMilestones.has(m._key);
                        return (
                          <div key={m._key} className="flex flex-col">
                            {/* Milestone Row */}
                            <div className="flex h-[40px] border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.1)] transition-colors group/row">
                              {/* Left Cell */}
                              <div
                                className="w-[400px] shrink-0 sticky left-0 z-20 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] shadow-[2px_0_10px_rgba(0,0,0,0.05)] cursor-pointer"
                                onClick={() => toggleMilestone(m._key)}
                              >
                                <div className="flex items-center px-4 pl-8 w-full h-full group-hover/row:bg-[hsl(var(--muted)/0.3)] transition-colors">
                                  <div className="flex-1 flex items-center gap-2 overflow-hidden">
                                    <button className="p-0.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded">
                                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                    <Flag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span className="text-xs font-bold text-[hsl(var(--foreground))] truncate">{m.name}</span>
                                  </div>
                                  <div className="w-[140px] text-right text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">
                                    {m.dueDate ? `Due: ${format(new Date(m.dueDate), 'MMM dd, yyyy')}` : ''}
                                  </div>
                                </div>
                              </div>
                              {/* Right Cell */}
                              <div className="relative bg-[hsl(var(--muted)/0.05)]" style={{ width: `${totalDays * DAY_WIDTH}px` }}>
                                {m.dueDate && (
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center group"
                                    style={{ left: `${differenceInDays(new Date(m.dueDate), minDate) * DAY_WIDTH}px` }}
                                  >
                                    <div className="w-4 h-4 bg-amber-500 rounded-sm rotate-45 flex items-center justify-center shadow-sm z-10">
                                      <div className="w-2 h-2 bg-amber-100 rounded-sm" />
                                    </div>
                                    {/* Milestone Tooltip */}
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                      {m.name}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Task Rows */}
                            {isExpanded && m.tasks.map((t: any) => {
                              const hasDates = t.startDate && t.endDate;
                              let left = 0;
                              let width = 0;
                              if (hasDates) {
                                left = differenceInDays(new Date(t.startDate), minDate) * DAY_WIDTH;
                                width = (differenceInDays(new Date(t.endDate), new Date(t.startDate)) + 1) * DAY_WIDTH;
                              }

                              let bgClass = "bg-blue-500";
                              if (t.status === 'completed') bgClass = "bg-emerald-500";
                              if (t.status === 'in_progress') bgClass = "bg-amber-500";

                              return (
                                <div key={t._id} className="flex h-[40px] border-b border-[hsl(var(--border))/0.5] group/taskrow">
                                  {/* Left Cell */}
                                  <div className="w-[400px] shrink-0 sticky left-0 z-20 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center px-4 pl-14 w-full h-full group-hover/taskrow:bg-[hsl(var(--muted)/0.3)] transition-colors">
                                      <div className="flex-1 flex items-center gap-2 overflow-hidden">
                                        <AlignLeft className="w-3 h-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                                        <span className="text-xs text-[hsl(var(--foreground))] truncate" title={t.name}>{t.name}</span>
                                      </div>
                                      <div className="w-[70px] text-center text-[10px] text-[hsl(var(--muted-foreground))]">
                                        {t.startDate ? format(new Date(t.startDate), 'MMM dd') : '-'}
                                      </div>
                                      <div className="w-[70px] text-center text-[10px] text-[hsl(var(--muted-foreground))]">
                                        {t.endDate ? format(new Date(t.endDate), 'MMM dd') : '-'}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Right Cell */}
                                  <div className="relative group-hover/taskrow:bg-[hsl(var(--muted)/0.1)] transition-colors" style={{ width: `${totalDays * DAY_WIDTH}px` }}>
                                    {hasDates && (
                                      <div
                                        className={cn("absolute top-1/2 -translate-y-1/2 h-6 rounded-md shadow-sm opacity-90 hover:opacity-100 transition-opacity cursor-pointer border border-white/20", bgClass)}
                                        style={{ left: `${left}px`, width: `${Math.max(width, DAY_WIDTH)}px` }}
                                        title={`${t.name} (${t.progress || 0}%)`}
                                      >
                                        {width > 50 && (
                                          <span className="text-[10px] font-semibold text-white truncate px-2 leading-6 block">
                                            {t.name}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
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
