'use client';

// Port of interior-os-frontend's projects/[projectId]/milestones/page.tsx.
// Permission gating (useProjectPermissions) and useConfirm dialog are not
// present in sky-lite-web; actions are always shown and deletions use
// window.confirm instead.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Milestone, Calendar, AlertTriangle, CheckCircle, Clock, Plus, X, Loader2, CalendarRange, Trash2 } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';

interface InteriorMilestonesViewProps {
  projectId: string;
}

const statusConfig: Record<string, { label: string; color: string; Icon: any }> = {
  planned: { label: 'Planned', color: 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', Icon: Calendar },
  achieved: { label: 'Achieved', color: 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400', Icon: CheckCircle },
  delayed: { label: 'Delayed Slip', color: 'text-red-600 border-red-200 bg-red-50 dark:bg-red-500/10 dark:text-red-400', Icon: AlertTriangle },
};

export default function InteriorMilestonesView({ projectId }: InteriorMilestonesViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false);
  const [creatingMilestone, setCreatingMilestone] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [isDelayDialogOpen, setIsDelayDialogOpen] = useState(false);
  const [loggingDelay, setLoggingDelay] = useState(false);
  const [delayForm, setDelayForm] = useState({ reason: '', impactDays: '', newDate: '' });

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getMilestones(projectId);
      setMilestones(res?.success && res?.data ? res.data : []);
    } catch (err) {
      console.warn('Failed to load milestones', err);
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const res = await interiorProjectService.getTasks(projectId);
      setTasks(res?.success && res?.data ? res.data : []);
    } catch (err) {
      console.warn('Failed to load tasks', err);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchMilestones();
      fetchTasks();
    }
  }, [projectId]);

  const handleOpenMilestoneDialog = () => {
    setMilestoneName('');
    setMilestoneDueDate('');
    setSelectedTaskIds([]);
    setIsMilestoneDialogOpen(true);
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingMilestone(true);
      await interiorProjectService.createMilestone(projectId, {
        name: milestoneName,
        dueDate: milestoneDueDate || new Date().toISOString(),
        linkedTasks: selectedTaskIds,
      });
      setIsMilestoneDialogOpen(false);
      setMilestoneName('');
      setMilestoneDueDate('');
      setSelectedTaskIds([]);
      fetchMilestones();
    } catch (err) {
      console.error('Create milestone failed', err);
      toast.error('Failed to create milestone');
    } finally {
      setCreatingMilestone(false);
    }
  };

  const handleOpenDelayDialog = (milestone: any) => {
    setSelectedMilestone(milestone);
    const parsedDate = milestone.dueDate ? new Date(milestone.dueDate) : new Date();
    const currentDueDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    currentDueDate.setDate(currentDueDate.getDate() + 7);
    const suggestedStr = currentDueDate.toISOString().split('T')[0];

    setDelayForm({ reason: '', impactDays: '7', newDate: suggestedStr });
    setIsDelayDialogOpen(true);
  };

  const handleLogDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoggingDelay(true);
      await interiorProjectService.logMilestoneDelay(projectId, selectedMilestone._id, {
        reason: delayForm.reason,
        impactDays: parseInt(delayForm.impactDays) || 1,
        originalDate: selectedMilestone.dueDate,
        newDate: delayForm.newDate,
      });
      setIsDelayDialogOpen(false);
      fetchMilestones();
    } catch (err) {
      console.error('Failed to log milestone delay', err);
      toast.error('Failed to log delay');
    } finally {
      setLoggingDelay(false);
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    try {
      setMilestones((prev) => prev.map((m) => (m._id === milestoneId ? { ...m, status: 'achieved' } : m)));
      await interiorProjectService.updateMilestone(projectId, milestoneId, { status: 'achieved' });
    } catch (err) {
      console.error('Failed to complete milestone', err);
      fetchMilestones();
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    const ok = await confirm({
      title: 'Delete Milestone',
      message: 'Are you sure you want to delete this milestone? Any delay logs associated with it will be permanently deleted.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await interiorProjectService.deleteMilestone(projectId, milestoneId);
      toast.success('Milestone deleted successfully');
      fetchMilestones();
    } catch (err) {
      toast.error('Failed to delete milestone');
      console.error('Failed to delete milestone', err);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Milestones & Key Targets</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Log milestone delays and trace timeline slips.</p>
        </div>
        <Button onClick={handleOpenMilestoneDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            {milestones.map((milestone) => {
              const config = statusConfig[milestone.status] || statusConfig.planned;
              return (
                <Card key={milestone._id} className="hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--primary))] shrink-0 mt-0.5">
                        <Milestone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">{milestone.name}</h4>
                        <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-2">
                          <CalendarRange className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                          Target: {new Date(milestone.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>

                        {milestone.linkedTasks && milestone.linkedTasks.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-[hsl(var(--border))] pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider block">
                                Linked Tasks ({milestone.linkedTasks.filter((t: any) => t.status === 'completed').length}/{milestone.linkedTasks.length})
                              </span>
                              <span className="text-[11px] font-bold text-[hsl(var(--primary))]">
                                {milestone.progress !== undefined ? `${milestone.progress}%` : `${Math.round((milestone.linkedTasks.filter((t: any) => t.status === 'completed').length / milestone.linkedTasks.length) * 100)}%`}
                              </span>
                            </div>

                            <div className="w-full max-w-md h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-300',
                                  milestone.status === 'achieved' || milestone.progress === 100 ? 'bg-emerald-500' : 'bg-[hsl(var(--primary))]'
                                )}
                                style={{ width: `${milestone.progress ?? Math.round((milestone.linkedTasks.filter((t: any) => t.status === 'completed').length / milestone.linkedTasks.length) * 100)}%` }}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-1.5 max-w-md mt-2">
                              {milestone.linkedTasks.map((task: any) => {
                                const isTaskCompleted = task.status === 'completed';
                                return (
                                  <div
                                    key={task._id}
                                    className={cn(
                                      'flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md border text-[11px]',
                                      isTaskCompleted
                                        ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-950/10 dark:border-emerald-900/30'
                                        : 'bg-[hsl(var(--muted)/0.2)] border-[hsl(var(--border))]'
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        'font-medium truncate max-w-[200px] sm:max-w-xs',
                                        isTaskCompleted ? 'line-through text-[hsl(var(--muted-foreground))] font-normal' : 'text-[hsl(var(--foreground))]'
                                      )}
                                    >
                                      {task.name}
                                    </span>
                                    <span
                                      className={cn(
                                        'px-1.5 py-0.2 text-[9px] font-semibold uppercase rounded-full border shrink-0',
                                        task.status === 'completed'
                                          ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/50'
                                          : task.status === 'in_progress'
                                          ? 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/50'
                                          : 'text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] bg-[hsl(var(--muted))]'
                                      )}
                                    >
                                      {task.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                      <span className={cn('px-2.5 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1', config.color)}>
                        <config.Icon className="w-3.5 h-3.5" />
                        {config.label}
                      </span>
                      {milestone.status !== 'achieved' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleCompleteMilestone(milestone._id)}>
                            Mark Done
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleOpenDelayDialog(milestone)}>
                            Log Delay
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 border-red-200"
                        title="Delete Milestone"
                        onClick={() => handleDeleteMilestone(milestone._id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>

                  {milestone.delays && milestone.delays.length > 0 && (
                    <div className="bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))] px-5 py-3 text-xs space-y-2">
                      <span className="font-bold text-[hsl(var(--foreground))]">Delay Incident Logged</span>
                      {milestone.delays.map((delay: any) => (
                        <div key={delay._id || Math.random().toString()} className="flex items-start gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                          <Clock className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-[hsl(var(--foreground))]">{delay.reason}</p>
                            <p className="text-[10px] mt-0.5">
                              Pushed by <span className="font-semibold text-red-500">+{delay.impactDays} days</span> from {new Date(delay.originalDate).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card className="p-5 flex flex-col space-y-4">
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Visual Timeline Gantt</h3>
            <div className="relative border-l border-[hsl(var(--border))] pl-4 ml-2 space-y-8 py-2">
              {milestones.map((m) => (
                <div key={m._id} className="relative">
                  <div
                    className={cn(
                      'absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border bg-white flex items-center justify-center',
                      m.status === 'achieved' ? 'border-emerald-500 bg-emerald-500' : m.status === 'delayed' ? 'border-red-500 bg-red-500' : 'border-blue-500'
                    )}
                  />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">{m.name}</h4>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {new Date(m.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {isMilestoneDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Add Key Project Milestone</h3>
                <button onClick={() => setIsMilestoneDialogOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateMilestone}>
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Milestone Name</label>
                    <Input required placeholder="e.g. Mechanical Inspection Checkoff" value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Target Due Date</label>
                    <Input required type="date" value={milestoneDueDate} onChange={(e) => setMilestoneDueDate(e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] block">Link Tasks (All must be completed to achieve milestone)</label>
                    {loadingTasks ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading tasks...
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="text-xs text-[hsl(var(--muted-foreground))] italic p-3 border border-dashed border-[hsl(var(--border))] rounded-lg">
                        No tasks found in this project. Create some tasks first.
                      </div>
                    ) : (
                      <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))] max-h-[160px] overflow-y-auto bg-[hsl(var(--background))]">
                        {tasks.map((task) => {
                          const isChecked = selectedTaskIds.includes(task._id);
                          return (
                            <label key={task._id} className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] select-none transition-colors duration-150">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTaskIds((prev) => [...prev, task._id]);
                                  } else {
                                    setSelectedTaskIds((prev) => prev.filter((id) => id !== task._id));
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[hsl(var(--foreground))] truncate">{task.name}</p>
                                <span
                                  className={cn(
                                    'inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded-full uppercase mt-0.5 border',
                                    task.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                                      : task.status === 'in_progress'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                                  )}
                                >
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsMilestoneDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingMilestone}>
                    {creatingMilestone && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Add Milestone
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDelayDialogOpen && selectedMilestone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Log Timeline Delay Slip</h3>
                <button onClick={() => setIsDelayDialogOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogDelay}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-950/40">
                    <span className="text-[10px] uppercase font-bold text-red-500">Selected Milestone</span>
                    <p className="text-xs font-bold text-red-700 dark:text-red-400">{selectedMilestone.name}</p>
                    <p className="text-[10px] text-red-600 dark:text-red-500/80">
                      Original target date: {new Date(selectedMilestone.dueDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Delay Slip Reason</label>
                    <Input
                      required
                      placeholder="e.g. Subcontractor workforce shortage"
                      value={delayForm.reason}
                      onChange={(e) => setDelayForm({ ...delayForm, reason: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Impact Days</label>
                      <Input
                        required
                        type="number"
                        min="1"
                        value={delayForm.impactDays}
                        onChange={(e) => setDelayForm({ ...delayForm, impactDays: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">New Target Date</label>
                      <Input required type="date" value={delayForm.newDate} onChange={(e) => setDelayForm({ ...delayForm, newDate: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsDelayDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loggingDelay}>
                    {loggingDelay && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Log Delay Slip
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
