'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, ChevronRight, ChevronDown, Calendar, Flag, AlignLeft } from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';
import { Card } from '@/components/interior/ui';
import { cn } from '@/lib/utils';
import { addDays, differenceInDays, format, min, max, startOfWeek, endOfWeek, parseISO, isToday } from 'date-fns';

interface InteriorTimelineViewProps {
  projectId: string;
}

export default function InteriorTimelineView({ projectId }: InteriorTimelineViewProps) {
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [msRes, tasksRes] = await Promise.all([
          interiorProjectService.getMilestones(projectId),
          interiorProjectService.getTasks(projectId),
        ]);
        
        if (msRes.success && msRes.data) {
          setMilestones(msRes.data);
          setExpandedMilestones(new Set(msRes.data.map((m: any) => m._id)));
        }
        if (tasksRes.success && tasksRes.data) {
          setTasks(tasksRes.data);
        }
      } catch (err) {
        console.error('Failed to load timeline data', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (projectId) fetchData();
  }, [projectId]);

  const toggleMilestone = (id: string) => {
    const newSet = new Set(expandedMilestones);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
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

    // Group tasks by milestone
    const data = milestones.map(m => {
      // Find tasks linked to this milestone
      // We assume linkedTasks is an array of IDs or objects
      const linkedTaskIds = (m.linkedTasks || []).map((lt: any) => typeof lt === 'string' ? lt : lt._id?.toString() || lt.toString());
      
      const mTasks = tasks.filter(t => linkedTaskIds.includes(t._id.toString()));
      
      return {
        ...m,
        isMilestone: true,
        tasks: mTasks
      };
    });

    // Find tasks without milestones
    const allLinkedTaskIds = new Set();
    milestones.forEach(m => {
      (m.linkedTasks || []).forEach((lt: any) => {
        allLinkedTaskIds.add(typeof lt === 'string' ? lt : lt._id?.toString() || lt.toString());
      });
    });

    const unlinkedTasks = tasks.filter(t => !allLinkedTaskIds.has(t._id.toString()));
    
    if (unlinkedTasks.length > 0) {
      data.push({
        _id: 'unlinked',
        name: 'Unscheduled / General Tasks',
        dueDate: null,
        status: 'planned',
        isMilestone: true,
        tasks: unlinkedTasks
      });
      setExpandedMilestones(prev => new Set(prev).add('unlinked'));
    }

    return { minDate: minD, maxDate: maxD, totalDays, dates, timelineData: data };
  }, [milestones, tasks]);

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
          View milestones and their associated tasks on a Gantt chart.
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
          <div className="flex-1 overflow-auto flex scrollbar-thin relative bg-[hsl(var(--background))]">
            
            {/* Left Panel: Data Table (Sticky horizontally) */}
            <div className="w-[400px] shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] sticky left-0 z-20 flex flex-col shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
              {/* Header (Sticky vertically) */}
              <div className="h-[57px] min-h-[57px] max-h-[57px] shrink-0 box-border border-b border-[hsl(var(--border))] flex items-center bg-[hsl(var(--muted)/0.9)] backdrop-blur sticky top-0 z-30 px-4 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                <div className="flex-1">Milestone / Task Name</div>
                <div className="w-[70px] text-center">Start</div>
                <div className="w-[70px] text-center">End</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col relative z-10">
                {timelineData.map((m: any) => {
                  const isExpanded = expandedMilestones.has(m._id);
                  return (
                    <div key={m._id} className="border-b border-[hsl(var(--border))] shrink-0">
                      {/* Milestone Row */}
                      <div 
                        className="flex items-center px-4 h-[40px] min-h-[40px] max-h-[40px] shrink-0 box-border bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)] cursor-pointer transition-colors"
                        onClick={() => toggleMilestone(m._id)}
                      >
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

                      {/* Task Rows */}
                      {isExpanded && m.tasks.map((t: any) => (
                        <div key={t._id} className="flex items-center px-4 pl-10 h-[40px] min-h-[40px] max-h-[40px] shrink-0 box-border border-t border-[hsl(var(--border))/0.5] hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
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
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Gantt Chart (Scrolls horizontally) */}
            <div className="flex flex-col relative z-10" style={{ width: `${totalDays * DAY_WIDTH}px`, minWidth: `${totalDays * DAY_WIDTH}px` }}>
              
              {/* Timeline Header (Months + Days) (Sticky vertically) */}
              <div className="sticky top-0 z-20 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] h-[57px] min-h-[57px] max-h-[57px] shrink-0 box-border flex flex-col">
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

              {/* Timeline Body (Grid + Bars) */}
              <div className="relative flex-1">
                {/* Vertical Grid Lines */}
                <div className="absolute inset-0 flex pointer-events-none opacity-20">
                  {dates.map((date, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "border-r border-[hsl(var(--border))] shrink-0 h-full",
                        isToday(date) ? "bg-[hsl(var(--primary))] opacity-20" : ""
                      )} 
                      style={{ width: `${DAY_WIDTH}px` }} 
                    />
                  ))}
                </div>

                {/* Rows Content */}
                {timelineData.map((m: any) => {
                  const isExpanded = expandedMilestones.has(m._id);
                  return (
                    <div key={m._id} className="relative z-10 border-b border-[hsl(var(--border))] shrink-0">
                      {/* Milestone Row */}
                      <div className="h-[40px] min-h-[40px] max-h-[40px] shrink-0 box-border relative bg-[hsl(var(--muted)/0.1)]">
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

                      {/* Task Rows */}
                      {isExpanded && m.tasks.map((t: any) => {
                        const hasDates = t.startDate && t.endDate;
                        let left = 0;
                        let width = 0;
                        if (hasDates) {
                          left = differenceInDays(new Date(t.startDate), minDate) * DAY_WIDTH;
                          width = (differenceInDays(new Date(t.endDate), new Date(t.startDate)) + 1) * DAY_WIDTH;
                        }

                        // Determine bar color based on status
                        let bgClass = "bg-blue-500";
                        if (t.status === 'completed') bgClass = "bg-emerald-500";
                        if (t.status === 'in_progress') bgClass = "bg-amber-500";

                        return (
                          <div key={t._id} className="h-[40px] min-h-[40px] max-h-[40px] shrink-0 box-border border-t border-[hsl(var(--border))/0.5] relative hover:bg-[hsl(var(--muted)/0.2)] transition-colors">
                            {hasDates && (
                              <div 
                                className={cn("absolute top-1/2 -translate-y-1/2 h-6 rounded-md shadow-sm opacity-90 hover:opacity-100 transition-opacity cursor-pointer border border-white/20", bgClass)}
                                style={{ left: `${left}px`, width: `${Math.max(width, DAY_WIDTH)}px` }}
                                title={`${t.name} (${t.progress}%)`}
                              >
                                {width > 50 && (
                                  <span className="text-[10px] font-semibold text-white truncate px-2 leading-6 block">
                                    {t.name}
                                  </span>
                                )}
                              </div>
                            )}
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
