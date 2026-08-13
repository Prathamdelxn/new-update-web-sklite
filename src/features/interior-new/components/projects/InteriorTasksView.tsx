'use client';

// Port of interior-os-frontend's projects/[projectId]/tasks/page.tsx (Task Kanban).
// The source board is not drag-and-drop based (columns are click-through via the
// task detail drawer's status switcher), so no DnD library substitution was needed.
// Permission gating (useProjectPermissions) and useConfirm dialog are not present
// in sky-lite-web; actions are always shown and deletions use window.confirm.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Plus,
  X,
  MessageSquare,
  Calendar,
  Layers,
  Loader2,
  CalendarDays,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';

interface InteriorTasksViewProps {
  projectId: string;
}

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'border-t-slate-400 bg-slate-500/5' },
  { id: 'todo', title: 'Todo', color: 'border-t-blue-500 bg-blue-500/5' },
  { id: 'in_progress', title: 'In Progress', color: 'border-t-amber-500 bg-amber-500/5' },
  { id: 'in_review', title: 'In Review', color: 'border-t-indigo-500 bg-indigo-500/5' },
  { id: 'completed', title: 'Completed', color: 'border-t-emerald-500 bg-emerald-500/5' },
];

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
  medium: { label: 'Medium', color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
  high: { label: 'High', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
  critical: { label: 'Critical', color: 'text-red-600 bg-red-50 dark:bg-red-500/10 animate-pulse' },
};

export default function InteriorTasksView({ projectId }: InteriorTasksViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [tasks, setTasks] = useState<any[]>([]);
  const [wbsPackages, setWbsPackages] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todo');

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskData, setEditTaskData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    assigneeId: '',
    startDate: '',
    endDate: '',
    progress: 0,
  });

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    packageId: '',
    priority: 'medium',
    startDate: '',
    endDate: '',
    assigneeId: '',
    milestoneId: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [taskRes, wbsRes, memberRes, milestoneRes] = await Promise.allSettled([
        interiorProjectService.getTasks(projectId),
        interiorProjectService.getWbs(projectId),
        interiorProjectService.getProjectMembers(projectId),
        interiorProjectService.getMilestones(projectId),
      ]);

      if (taskRes.status === 'fulfilled' && taskRes.value?.success && taskRes.value.data) {
        setTasks(taskRes.value.data);
      } else {
        setTasks([]);
      }

      let packages: any[] = [];
      if (wbsRes.status === 'fulfilled' && wbsRes.value?.success && wbsRes.value.data) {
        const extractPackages = (node: any) => {
          if (node.type === 'package') packages.push(node);
          if (node.floors) node.floors.forEach(extractPackages);
          if (node.zones) node.zones.forEach(extractPackages);
          if (node.areas) node.areas.forEach(extractPackages);
          if (node.packages) node.packages.forEach(extractPackages);
        };
        wbsRes.value.data.forEach(extractPackages);
      }
      setWbsPackages(packages);

      if (memberRes.status === 'fulfilled' && memberRes.value?.success) {
        setProjectMembers(memberRes.value.data || []);
      } else {
        setProjectMembers([]);
      }

      if (milestoneRes.status === 'fulfilled' && milestoneRes.value?.success) {
        setMilestones(milestoneRes.value.data || []);
      } else {
        setMilestones([]);
      }
    } catch (err) {
      console.warn('Error fetching tasks data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingTask(true);
      const payload = {
        name: formData.name,
        packageId: formData.packageId,
        priority: formData.priority,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        assignees: formData.assigneeId ? [formData.assigneeId] : [],
        description: formData.description,
      };

      const res = await interiorProjectService.createTask(projectId, payload);
      
      // If a milestone was selected, link this new task to it
      if (formData.milestoneId && res?.success && res?.data?._id) {
        const selectedMilestone = milestones.find(m => m._id === formData.milestoneId);
        if (selectedMilestone) {
          const currentLinks = (selectedMilestone.linkedTasks || []).map((t: any) => typeof t === 'string' ? t : t._id);
          await interiorProjectService.updateMilestone(projectId, selectedMilestone._id, {
            linkedTasks: [...currentLinks, res.data._id]
          });
        }
      }

      setIsTaskDialogOpen(false);
      setFormData({ name: '', packageId: '', priority: 'medium', startDate: '', endDate: '', assigneeId: '', milestoneId: '', description: '' });
      fetchData();
    } catch (err) {
      console.error('Create task failed', err);
      toast.error('Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus, progress: newStatus === 'completed' ? 100 : t.progress } : t)));
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask((prev: any) => ({ ...prev, status: newStatus, progress: newStatus === 'completed' ? 100 : prev.progress }));
      }
      await interiorProjectService.updateTask(projectId, taskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status', err);
      fetchData();
    }
  };

  const handleSelectTask = async (task: any) => {
    setSelectedTask(task);
    setIsEditingTask(false);
    setEditTaskData({
      name: task.name || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      assigneeId: task.assignees?.[0]?._id || '',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
      progress: task.progress || 0,
    });
    try {
      const res = await interiorProjectService.getTaskComments(projectId, task._id);
      setComments(res?.success && res?.data ? res.data : []);
    } catch (err) {
      console.warn('Failed to load comments', err);
      setComments([]);
    }
  };

  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: editTaskData.name,
        description: editTaskData.description,
        priority: editTaskData.priority,
        assignees: editTaskData.assigneeId ? [editTaskData.assigneeId] : [],
        startDate: editTaskData.startDate || undefined,
        endDate: editTaskData.endDate || undefined,
        progress: Number(editTaskData.progress) || 0,
      };

      const res = await interiorProjectService.updateTask(projectId, selectedTask._id, payload);
      if (res?.success && res?.data) {
        toast.success('Task updated successfully!');
        setSelectedTask(res.data);
        setIsEditingTask(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to save edited task', err);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    const ok = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This will remove all associated logs and comments.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await interiorProjectService.deleteTask(projectId, selectedTask._id);
      toast.success('Task deleted successfully!');
      setSelectedTask(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete task', err);
      toast.error('Failed to delete task');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setPostingComment(true);
      const res = await interiorProjectService.createTaskComment(projectId, selectedTask._id, { content: newComment });
      if (res?.success && res?.data) {
        setComments((prev) => [...prev, res.data]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Post comment failed', err);
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 relative overflow-hidden min-h-[85vh]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Tasks</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Track installation progress by WBS packages</p>
        </div>
        <Button onClick={() => setIsTaskDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : (
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-4 overflow-x-auto">
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveTab(col.id)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2',
                    activeTab === col.id ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  )}
                >
                  {col.title}
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px]',
                    activeTab === col.id ? 'bg-white/20 text-white' : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'
                  )}>
                    {colTasks.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tasks.filter(t => t.status === activeTab).map((task) => {
              const priority = priorityConfig[task.priority] || priorityConfig.medium;
              const assignee = task.assignees?.[0];
              return (
                <motion.div
                  key={task._id}
                  layoutId={task._id}
                  className="p-5 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-sm cursor-pointer hover:border-[hsl(var(--primary)/0.3)] hover:shadow-md transition-all space-y-4 group"
                  onClick={() => handleSelectTask(task)}
                >
                  <div className="flex items-start justify-between">
                    <span className={cn('px-2 py-1 text-[10px] font-bold rounded-md uppercase', priority.color)}>{priority.label}</span>
                    <span className="text-[11px] font-mono font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md">{task.packageId?.trade ? `#${task.packageId.trade}` : ''}</span>
                  </div>
                  <h4 className="text-base font-semibold text-[hsl(var(--foreground))] line-clamp-2 leading-snug group-hover:text-[hsl(var(--primary))] transition-colors">
                    {task.name}
                  </h4>
                  <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      {task.endDate ? new Date(task.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Dates unset'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {assignee ? (
                        <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center font-bold text-[10px] text-[hsl(var(--primary))] ring-2 ring-[hsl(var(--background))]">
                          {assignee.firstName?.[0]}
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))] ring-2 ring-[hsl(var(--background))]">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {tasks.filter(t => t.status === activeTab).length === 0 && (
            <div className="text-center py-16">
              <Layers className="w-12 h-12 text-[hsl(var(--muted-foreground))] opacity-20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">No tasks found</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">There are no tasks in this status currently.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isTaskDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Add Task to Package</h3>
                <button onClick={() => setIsTaskDialogOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask}>
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">WBS Target Package</label>
                    <select
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                      value={formData.packageId}
                      onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                    >
                      <option value="">Select Package...</option>
                      {wbsPackages.map((pkg) => (
                        <option key={pkg.id || pkg._id} value={pkg.id || pkg._id}>
                          {pkg.name} ({pkg.trade})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Assign to Milestone (Optional)</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                      value={formData.milestoneId}
                      onChange={(e) => setFormData({ ...formData, milestoneId: e.target.value })}
                    >
                      <option value="">No Milestone (Unscheduled)</option>
                      {milestones.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Task Name</label>
                    <Input required placeholder="e.g. Core Conduit Fixing" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Priority</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Assignee</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={formData.assigneeId}
                        onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                      >
                        <option value="">Select Assignee...</option>
                        {projectMembers.map((m) => (
                          <option key={m.userId?._id || m._id} value={m.userId?._id || m._id}>
                            {m.userId?.firstName || m.firstName} {m.userId?.lastName || m.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Start Date</label>
                      <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">End Date</label>
                      <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Description</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                      placeholder="Specify task instructions..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsTaskDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingTask}>
                    {creatingTask && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Add Task
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-[2px]">
            <div className="flex-1" onClick={() => setSelectedTask(null)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] shadow-2xl h-full flex flex-col"
            >
              {isEditingTask ? (
                <form onSubmit={handleSaveEditedTask} className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block mb-1">Task Name</label>
                      <Input required className="text-sm font-bold w-full" value={editTaskData.name} onChange={(e) => setEditTaskData({ ...editTaskData, name: e.target.value })} />
                    </div>
                    <button type="button" onClick={() => setIsEditingTask(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Description</label>
                      <textarea
                        rows={4}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                        placeholder="Specify task instructions..."
                        value={editTaskData.description}
                        onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Priority</label>
                        <select
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                          value={editTaskData.priority}
                          onChange={(e) => setEditTaskData({ ...editTaskData, priority: e.target.value })}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Progress (%)</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-9 text-xs"
                          value={editTaskData.progress}
                          onChange={(e) => setEditTaskData({ ...editTaskData, progress: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Assignee</label>
                      <select
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={editTaskData.assigneeId}
                        onChange={(e) => setEditTaskData({ ...editTaskData, assigneeId: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {projectMembers.map((m) => (
                          <option key={m.userId?._id || m._id} value={m.userId?._id || m._id}>
                            {m.userId?.firstName || m.firstName} {m.userId?.lastName || m.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Start Date</label>
                        <Input type="date" className="h-9 text-xs" value={editTaskData.startDate} onChange={(e) => setEditTaskData({ ...editTaskData, startDate: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">End Date</label>
                        <Input type="date" className="h-9 text-xs" value={editTaskData.endDate} onChange={(e) => setEditTaskData({ ...editTaskData, endDate: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.1)] flex items-center justify-between shrink-0">
                    <Button variant="outline" type="button" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDeleteTask}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Task
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" type="button" onClick={() => setIsEditingTask(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between border-t-0 shrink-0">
                    <div>
                      <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{selectedTask.name}</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {selectedTask.packageId?.name} ({selectedTask.packageId?.trade})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 py-1 px-2.5 text-xs" onClick={() => setIsEditingTask(true)}>
                        <Edit className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 py-1 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                        onClick={handleDeleteTask}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <button onClick={() => setSelectedTask(null)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Task Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['todo', 'in_progress', 'completed'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleUpdateTaskStatus(selectedTask._id, st)}
                            className={cn(
                              'px-3 py-1.5 text-xs font-medium border rounded-lg capitalize transition-colors',
                              selectedTask.status === st
                                ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                            )}
                          >
                            {st.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border border-[hsl(var(--border))] p-4 rounded-xl">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Priority</span>
                        <p className="text-xs font-semibold capitalize text-[hsl(var(--foreground))]">{selectedTask.priority}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Progress</span>
                        <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{selectedTask.progress}%</p>
                      </div>
                      <div className="space-y-1 col-span-2 flex items-center gap-2 border-t border-[hsl(var(--border))/0.4] pt-3">
                        <CalendarDays className="w-4 h-4 text-[hsl(var(--primary))]" />
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start Unset'} -{' '}
                          {selectedTask.endDate ? new Date(selectedTask.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End Unset'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">Description</h4>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{selectedTask.description || 'No description provided.'}</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[hsl(var(--border))]">
                      <h4 className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        Task Discussions ({comments.length})
                      </h4>

                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                        {comments.length === 0 ? (
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic text-center py-4">
                            No messages on this task yet. Type below to align your team.
                          </p>
                        ) : (
                          comments.map((comment) => (
                            <div key={comment._id} className="p-3 border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] rounded-lg space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                                  {comment.userId?.firstName} {comment.userId?.lastName}
                                </span>
                                <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                                  {new Date(comment.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-[hsl(var(--muted-foreground))]">{comment.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handlePostComment} className="flex gap-2">
                        <Input placeholder="Ask for updates or post observations..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                        <Button type="submit" disabled={postingComment}>
                          {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                        </Button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
