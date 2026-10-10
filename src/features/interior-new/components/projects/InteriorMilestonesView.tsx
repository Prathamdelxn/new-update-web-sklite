'use client';

// Port of interior-os-frontend's projects/[projectId]/milestones/page.tsx.
// Permission gating (useProjectPermissions) and useConfirm dialog are not
// present in sky-lite-web; actions are always shown and deletions use
// window.confirm instead.

import React, { useEffect, useState } from 'react';
import { Milestone, Calendar, AlertTriangle, CheckCircle, Clock, Loader2, CalendarRange, Trash2, Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';

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

  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create Milestone Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

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

  useEffect(() => {
    if (projectId) {
      fetchMilestones();
    }
  }, [projectId]);

  const handleDeleteMilestone = async (milestoneId: string, milestoneName: string) => {
    if (!window.confirm(`Are you sure you want to delete milestone "${milestoneName}"?`)) {
      return;
    }

    try {
      setDeletingId(milestoneId);
      const res = await interiorProjectService.deleteMilestone(projectId, milestoneId);
      if (res?.success) {
        toast.success(`Milestone "${milestoneName}" was removed.`);
        setMilestones((prev) => prev.filter((m) => m._id !== milestoneId));
      } else {
        toast.error(res?.message || 'Could not delete milestone.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete milestone.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDueDate) {
      toast.error('Milestone name and target date are required.');
      return;
    }

    try {
      setCreating(true);
      const res = await interiorProjectService.createMilestone(projectId, {
        name: newName.trim(),
        dueDate: newDueDate,
        linkedTasks: [],
      });

      if (res?.success) {
        toast.success(`Milestone "${newName.trim()}" added successfully.`);
        setShowCreateModal(false);
        setNewName('');
        setNewDueDate('');
        fetchMilestones();
      } else {
        toast.error(res?.message || 'Failed to create milestone.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create milestone.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Milestones & Key Targets</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Track major targets, deliverables, and timeline milestones.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
        >
          <Plus size={14} />
          <span>New Milestone</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        </div>
      ) : milestones.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 rounded-2xl border border-slate-200 bg-white">
          <Milestone className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700 text-sm">No Milestones Found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Mark activities as &quot;Milestone Activity&quot; when creating or editing activities in the WBS tab, or click &quot;New Milestone&quot; above.
          </p>
        </Card>
      ) : (
        <Card className="p-6 md:p-8 rounded-2xl border border-slate-200 bg-white shadow-xs max-w-4xl">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Visual Timeline Gantt</h3>
              <p className="text-xs text-slate-500 mt-0.5">Chronological milestone sequence across project execution</p>
            </div>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {milestones.length} Milestone{milestones.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="relative border-l-2 border-slate-200 pl-6 ml-3 space-y-7 py-2">
            {milestones.map((m) => {
              const isAchieved = m.status === 'achieved' || m.progress === 100;
              const isDelayed = m.status === 'delayed';
              const isDeleting = deletingId === m._id;

              return (
                <div key={m._id} className="relative group">
                  {/* Dot */}
                  <div
                    className={cn(
                      'absolute -left-[32px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition-transform group-hover:scale-125 shadow-2xs',
                      isAchieved
                        ? 'border-emerald-500 bg-emerald-500'
                        : isDelayed
                        ? 'border-rose-500 bg-rose-500'
                        : 'border-blue-600 bg-blue-600'
                    )}
                  />

                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Milestone size={14} className="text-blue-600 shrink-0" />
                        <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border',
                            isAchieved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isDelayed
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          )}
                        >
                          {isAchieved ? 'Achieved' : isDelayed ? 'Delayed' : 'Planned'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteMilestone(m._id, m.name)}
                          disabled={isDeleting}
                          title="Delete Milestone"
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                        Target Date: {m.dueDate ? new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                      </span>
                    </div>

                    {m.linkedTasks && m.linkedTasks.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mr-1">
                          Linked Tasks:
                        </span>
                        {m.linkedTasks.map((task: any) => (
                          <span
                            key={task._id}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
                              task.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through opacity-80'
                                : 'bg-white text-slate-700 border-slate-200 shadow-2xs'
                            )}
                          >
                            {task.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Create Milestone Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Milestone size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Create New Milestone</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Milestone Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kitchen Cabinetry Handover"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {creating && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Milestone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
