'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, Loader2, Target, Flag, X,
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Trash2, LayoutGrid, List, AlignLeft, MoreVertical, Pencil,
  User, Clock, MessageSquare, ChevronRight, Camera, Image as ImageIcon, FileText, ShieldAlert
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { useToast } from '@/providers/ToastContext';
import { XERImportModal } from '@/features/projects/components/XERImportModal';
import { TimelineTab } from '@/features/projects/timeline/components/TimelineTab';

interface MilestonesTabProps {
  projectId: string;
}

type MilestoneStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';

const STATUS_OPTIONS: MilestoneStatus[] = ['Pending', 'In Progress', 'Completed', 'On Hold'];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Completed':   return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    case 'In Progress': return 'text-blue-700 bg-blue-100 border-blue-200';
    case 'On Hold':     return 'text-amber-700 bg-amber-100 border-amber-200';
    default:            return 'text-slate-600 bg-gray-100 border-gray-200';
  }
};

const STATUS_BAR_COLOR: Record<string, string> = {
  'Completed':   'bg-emerald-500',
  'In Progress': 'bg-blue-500',
  'On Hold':     'bg-amber-500',
  'Pending':     'bg-slate-400',
};

const emptyTaskForm = () => ({
  title: '', description: '', startDate: '', endDate: '', assignedTo: '',
});

const emptyMilestoneForm = () => ({
  name: '', description: '',
  tasks: [] as Array<{
    title: string; description: string; startDate: string;
    endDate: string; assignedTo: string; isCompleted: boolean;
  }>,
});

export const MilestonesTab: React.FC<MilestonesTabProps> = ({ projectId }) => {
  const router = useRouter();
  const [milestones, setMilestones]         = useState<any[]>([]);
  const [members, setMembers]               = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [togglingTask, setTogglingTask]   = useState<string | null>(null);
  const [view, setView]                   = useState<'cards' | 'list' | 'gantt'>('cards');
  const [activeView, setActiveView]       = useState<'milestones' | 'timeline'>('milestones');
  const [milestoneMenuId, setMilestoneMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [isXERModalOpen, setIsXERModalOpen] = useState(false);

  // Completion note + proof image prompt state
  const [completionPrompt, setCompletionPrompt] = useState<{
    milestoneId: string; taskIndex: number; note: string; proofImageUrl: string; uploading: boolean;
  } | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Edit task state
  const [editingTask, setEditingTask] = useState<{
    milestoneId: string; taskIndex: number;
    form: { title: string; description: string; startDate: string; endDate: string; assignedTo: string };
  } | null>(null);
  const [isSavingEditTask, setIsSavingEditTask] = useState(false);

  // Milestone form
  const [formData, setFormData]     = useState(emptyMilestoneForm());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm]     = useState(emptyTaskForm());

  const toast = useToast();

  const [isForbidden, setIsForbidden]       = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setIsForbidden(false);
      const [msRes, usersRes] = await Promise.all([
        api.get(`/projects/${projectId}/milestones`),
        api.get(`/users?projectId=${projectId}`),
      ]);

      const data = Array.isArray(msRes.data)
        ? msRes.data
        : Array.isArray(msRes.data?.milestones)
          ? msRes.data.milestones
          : [];
      setMilestones(data);

      const rawUsers: any[] = Array.isArray(usersRes.data) ? usersRes.data : [];
      setMembers(rawUsers.map((u: any) => ({ _id: u._id, name: u.name || 'Member' })));
    } catch (error: any) {
      if (error.response?.status === 403) {
        setIsForbidden(true);
      } else {
        console.error('Error fetching milestones:', error);
        toast.error('Failed to load milestones');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [projectId]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingMilestone(null);
    setFormData(emptyMilestoneForm());
    setTaskForm(emptyTaskForm());
    setShowTaskForm(false);
    setIsModalOpen(true);
  };

  const openEditModal = (milestone: any) => {
    setMilestoneMenuId(null);
    setEditingMilestone(milestone);
    setFormData({
      name:        milestone.name || '',
      description: milestone.description || '',
      tasks: (milestone.tasks || []).map((t: any) => ({
        title:       t.title || '',
        description: t.description || '',
        startDate:   t.startDate ? t.startDate.slice(0, 10) : '',
        endDate:     t.endDate   ? t.endDate.slice(0, 10)   : '',
        assignedTo:  t.assignedTo?._id || t.assignedTo || '',
        isCompleted: t.isCompleted || false,
      })),
    });
    setTaskForm(emptyTaskForm());
    setShowTaskForm(false);
    setIsModalOpen(true);
  };

  // ── Task form in modal ─────────────────────────────────────────────────────
  const commitTask = () => {
    if (!taskForm.title.trim()) return;
    if (taskForm.startDate && taskForm.endDate && taskForm.endDate < taskForm.startDate) {
      toast.error('End date cannot be before the start date');
      return;
    }

    // Validate against milestone duration
    const milestoneDueDate = editingMilestone?.dueDate;
    const milestoneStartDate = editingMilestone?.createdAt || new Date().toISOString();

    if (milestoneDueDate) {
      const mDueDateStr = new Date(milestoneDueDate).toISOString().slice(0, 10);
      const mStartDateStr = new Date(milestoneStartDate).toISOString().slice(0, 10);

      if (taskForm.startDate && taskForm.startDate < mStartDateStr) {
        toast.error(`Task start date cannot be before milestone start date (${new Date(milestoneStartDate).toLocaleDateString()})`);
        return;
      }
      if (taskForm.endDate && taskForm.endDate > mDueDateStr) {
        toast.error(`Task end date cannot be after milestone due date (${new Date(milestoneDueDate).toLocaleDateString()})`);
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, {
        title:       taskForm.title.trim(),
        description: taskForm.description,
        startDate:   taskForm.startDate,
        endDate:     taskForm.endDate,
        assignedTo:  taskForm.assignedTo,
        isCompleted: false,
      }],
    }));
    setTaskForm(emptyTaskForm());
    setShowTaskForm(false);
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({ ...prev, tasks: prev.tasks.filter((_, i) => i !== index) }));
  };

  // ── Save milestone ─────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name:        formData.name,
        description: formData.description,
        tasks:       formData.tasks.map(t => ({
          ...t,
          assignedTo: t.assignedTo || undefined,
          startDate:  t.startDate  || undefined,
          endDate:    t.endDate    || undefined,
        })),
      };

      if (editingMilestone) {
        await api.patch(`/projects/${projectId}/milestones/${editingMilestone._id}`, payload);
        toast.success('Milestone updated');
      } else {
        await api.post(`/projects/${projectId}/milestones`, payload);
        toast.success('Milestone created');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save milestone');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (milestone: any, status: MilestoneStatus) => {
    try {
      await api.patch(`/projects/${projectId}/milestones/${milestone._id}`, { status });
      setMilestones(prev => prev.map(m => m._id === milestone._id ? { ...m, status } : m));
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Toggle task (step 1: if completing, prompt for note) ──────────────────
  const initiateToggle = (milestone: any, taskIndex: number) => {
    const task = milestone.tasks[taskIndex];
    if (!task.isCompleted) {
      setCompletionPrompt({ milestoneId: milestone._id, taskIndex, note: '', proofImageUrl: '', uploading: false });
    } else {
      commitToggle(milestone, taskIndex, null, '');
    }
  };

  const handleProofUpload = async (file: File) => {
    if (!completionPrompt) return;
    setCompletionPrompt(prev => prev ? { ...prev, uploading: true } : null);
    try {
      const url = await uploadToCloudinary(file);
      setCompletionPrompt(prev => prev ? { ...prev, proofImageUrl: url, uploading: false } : null);
    } catch {
      setCompletionPrompt(prev => prev ? { ...prev, uploading: false } : null);
      toast.error('Image upload failed');
    }
  };

  const openEditTask = (milestone: any, taskIndex: number) => {
    const t = milestone.tasks[taskIndex];
    setEditingTask({
      milestoneId: milestone._id,
      taskIndex,
      form: {
        title:       t.title || '',
        description: t.description || '',
        startDate:   t.startDate ? t.startDate.slice(0, 10) : '',
        endDate:     t.endDate   ? t.endDate.slice(0, 10)   : '',
        assignedTo:  t.assignedTo?._id || t.assignedTo || '',
      },
    });
  };

  const handleSaveEditTask = async () => {
    if (!editingTask) return;
    const { startDate, endDate } = editingTask.form;
    if (startDate && endDate && endDate < startDate) {
      toast.error('End date cannot be before the start date');
      return;
    }
    const ms = milestones.find(m => m._id === editingTask.milestoneId);
    if (!ms) return;

    // Validate against milestone duration
    const milestoneDueDate = ms.dueDate;
    const milestoneStartDate = ms.createdAt;

    if (milestoneDueDate) {
      const mDueDateStr = new Date(milestoneDueDate).toISOString().slice(0, 10);
      const mStartDateStr = new Date(milestoneStartDate).toISOString().slice(0, 10);

      if (startDate && startDate < mStartDateStr) {
        toast.error(`Task start date cannot be before milestone start date (${new Date(milestoneStartDate).toLocaleDateString()})`);
        return;
      }
      if (endDate && endDate > mDueDateStr) {
        toast.error(`Task end date cannot be after milestone due date (${new Date(milestoneDueDate).toLocaleDateString()})`);
        return;
      }
    }

    setIsSavingEditTask(true);
    const updatedTasks = ms.tasks.map((t: any, i: number) => {
      if (i !== editingTask.taskIndex) return t;
      return {
        ...t,
        title:       editingTask.form.title.trim() || t.title,
        description: editingTask.form.description,
        startDate:   editingTask.form.startDate || undefined,
        endDate:     editingTask.form.endDate   || undefined,
        assignedTo:  editingTask.form.assignedTo || undefined,
      };
    });
    try {
      const res = await api.patch(`/projects/${projectId}/milestones/${ms._id}`, { tasks: updatedTasks });
      setMilestones(prev => prev.map(m => m._id === ms._id ? res.data : m));
      setEditingTask(null);
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    } finally {
      setIsSavingEditTask(false);
    }
  };

  const commitToggle = async (milestone: any, taskIndex: number, note: string | null, proofImageUrl: string) => {
    const key = `${milestone._id}-${taskIndex}`;
    setTogglingTask(key);
    setCompletionPrompt(null);

    const nowCompleting = !milestone.tasks[taskIndex].isCompleted;

    const updatedTasks = milestone.tasks.map((t: any, i: number) => {
      if (i !== taskIndex) return t;
      return {
        ...t,
        isCompleted:    nowCompleting,
        completedAt:    nowCompleting ? new Date().toISOString() : null,
        completionNote: nowCompleting && note ? note : (t.completionNote || ''),
        proofImage:     nowCompleting && proofImageUrl ? { url: proofImageUrl, uploadedAt: new Date().toISOString() } : (t.proofImage || null),
      };
    });

    const allDone = updatedTasks.every((t: any) => t.isCompleted);
    const payload: any = { tasks: updatedTasks };

    if (allDone && milestone.status !== 'Completed') payload.status = 'Completed';
    if (!allDone && milestone.status === 'Completed') payload.status = 'In Progress';

    try {
      await api.patch(`/projects/${projectId}/milestones/${milestone._id}`, payload);
      setMilestones(prev =>
        prev.map(m => m._id === milestone._id ? { ...m, tasks: updatedTasks, ...payload } : m)
      );
      if (payload.status === 'Completed') toast.success('All tasks done — milestone marked Completed!');
    } catch {
      toast.error('Failed to update task');
    } finally {
      setTogglingTask(null);
    }
  };

  // ── Delete milestone ───────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    setMilestoneMenuId(null);
    if (!window.confirm(`Delete milestone "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/projects/${projectId}/milestones/${id}`);
      toast.success('Milestone deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete milestone');
    }
  };

  const memberName = (assignedTo: any) => {
    if (!assignedTo) return null;
    const id = assignedTo?._id || assignedTo;
    return members.find(m => m._id === id)?.name || assignedTo?.name || null;
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  // Loading state handled by Skeleton wrapper

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

  return (
    <SkeletonLoader loading={loading} preset="list">
      {isForbidden ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm mt-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 text-sm max-w-sm text-center mb-6">
            You do not have the required "Task Management" permission to view milestones.
          </p>
        </div>
      ) : (
      <div className="space-y-6">
        {/* View switcher */}
        <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveView('milestones')}
            className={cn(
              'py-1.5 px-4 rounded-lg text-xs font-bold transition-all',
              activeView === 'milestones'
                ? 'bg-white shadow text-blue-600'
                : 'text-slate-500 hover:text-gray-700'
            )}
          >
            Milestones
          </button>
          <button
            type="button"
            onClick={() => setActiveView('timeline')}
            className={cn(
              'py-1.5 px-4 rounded-lg text-xs font-bold transition-all',
              activeView === 'timeline'
                ? 'bg-white shadow text-blue-600'
                : 'text-slate-500 hover:text-gray-700'
            )}
          >
            Timeline
          </button>
        </div>

        {activeView === 'timeline' ? (
          <TimelineTab projectId={projectId} />
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900"> </h3>
          <p className="text-sm text-slate-500 mt-1">Key targets and critical path objectives.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-xl">
            <button onClick={() => setView('cards')} className={cn('p-1.5 rounded-lg transition-all', view === 'cards' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-gray-700')}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={cn('p-1.5 rounded-lg transition-all', view === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-gray-700')}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('gantt')} className={cn('p-1.5 rounded-lg transition-all', view === 'gantt' ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-gray-700')}>
              <AlignLeft className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setIsXERModalOpen(true)}
            className="flex items-center space-x-2 bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" /><span>Import XER</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /><span>New Milestone</span>
          </button>
        </div>
      </div>

      {/* ── Gantt view ── */}
      {view === 'gantt' && (() => {
        const withDates = milestones.filter(m => m.dueDate);
        if (withDates.length === 0) return (
          <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No milestones with due dates to display.</p>
          </div>
        );
        const dates  = milestones.map(m => new Date(m.dueDate || m.createdAt).getTime());
        const starts = milestones.map(m => new Date(m.createdAt).getTime());
        const rangeStart = Math.min(...starts);
        const rangeEnd   = Math.max(...dates);
        const totalMs    = rangeEnd - rangeStart || 1;
        const months: string[] = [];
        const cur = new Date(rangeStart); cur.setDate(1);
        while (cur.getTime() <= rangeEnd) {
          months.push(cur.toLocaleString('default', { month: 'short', year: '2-digit' }));
          cur.setMonth(cur.getMonth() + 1);
        }
        return (
          <GlassCard className="p-6 border-gray-200 overflow-hidden" gradient>
            <div className="overflow-x-auto"><div style={{ minWidth: 600 }}>
              <div className="flex mb-4 pl-[200px]">
                {months.map((m, i) => <div key={i} className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l border-gray-200 pl-1">{m}</div>)}
              </div>
              <div className="space-y-3">
                {milestones.map(m => {
                  const start = new Date(m.createdAt).getTime();
                  const end   = m.dueDate ? new Date(m.dueDate).getTime() : start + totalMs * 0.1;
                  const leftPct  = ((start - rangeStart) / totalMs) * 100;
                  const widthPct = Math.max(((end - start) / totalMs) * 100, 1.5);
                  const done = m.tasks?.filter((t: any) => t.isCompleted).length || 0;
                  const tot  = m.tasks?.length || 0;
                  return (
                    <div key={m._id} className="flex items-center gap-4">
                      <div className="w-[196px] shrink-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-500">{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'No date'}</p>
                      </div>
                      <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <div className={cn('absolute h-full rounded-lg flex items-center px-2', STATUS_BAR_COLOR[m.status] || 'bg-slate-400')} style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
                          {widthPct > 8 && <span className="text-[10px] text-white font-bold truncate">{tot > 0 ? `${done}/${tot}` : m.status}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-gray-100">
                {Object.entries(STATUS_BAR_COLOR).map(([s, c]) => <div key={s} className="flex items-center space-x-1.5"><div className={cn('w-3 h-3 rounded-sm', c)} /><span className="text-[10px] font-semibold text-slate-500">{s}</span></div>)}
              </div>
            </div></div>
          </GlassCard>
        );
      })()}

      {/* ── List view ── */}
      {view === 'list' && (
        <div className="space-y-6">
          {/* Mobile Stacked Cards (< md) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {milestones.map((milestone) => {
              const completedTasks = milestone.tasks?.filter((t: any) => t.isCompleted).length || 0;
              const totalTasks     = milestone.tasks?.length || 0;
              const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (milestone.status === 'Completed' ? 100 : 0);
              const isExpanded     = expandedId === milestone._id;
              return (
                <GlassCard key={milestone._id} className="p-4 border-gray-200" gradient>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <Flag className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 leading-tight truncate">{milestone.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                          Due: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'TBD'}
                        </p>
                      </div>
                    </div>
                    <select
                      value={milestone.status || 'Pending'}
                      onChange={e => handleStatusChange(milestone, e.target.value as MilestoneStatus)}
                      className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border cursor-pointer focus:outline-none appearance-none text-center shrink-0', getStatusStyle(milestone.status || 'Pending'))}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>{completedTasks}/{totalTasks} Tasks</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                      <div className={cn('h-full rounded-full', milestone.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : milestone._id)}
                      className="text-xs font-bold text-blue-600 flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide Checklist' : 'Show Checklist'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button onClick={() => openEditModal(milestone)} className="p-1.5 rounded-lg text-slate-400 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-200 bg-white">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(milestone._id, milestone.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-gray-200 bg-white">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => router.push(`/projects/${projectId}/milestones/${milestone._id}`)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-100 bg-blue-50/50">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && totalTasks > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-2">
                      {milestone.tasks.map((task: any, i: number) => {
                        const key = `${milestone._id}-${i}`;
                        const isToggling = togglingTask === key;
                        const assignee   = memberName(task.assignedTo);
                        return (
                          <div key={i} className={cn('rounded-xl border p-2.5 text-xs', task.isCompleted ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-gray-100')}>
                            <div className="flex items-start gap-2">
                              <button onClick={() => initiateToggle(milestone, i)} disabled={isToggling} className="mt-0.5 shrink-0">
                                {isToggling ? <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" /> : task.isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={cn('font-semibold', task.isCompleted ? 'line-through text-slate-400' : 'text-gray-800')}>{task.title}</p>
                                {assignee && <p className="text-[10px] text-slate-400 mt-0.5">Assignee: {assignee}</p>}
                              </div>
                              {!task.isCompleted && (
                                <button onClick={() => openEditTask(milestone, i)} className="text-slate-300 hover:text-blue-500 shrink-0">
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>

          {/* Desktop Table View (hidden on mobile, visible md+) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="w-8"></th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Milestone Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasks</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</th>
                  {/* <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th> */}
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((milestone) => {
                  const completedTasks = milestone.tasks?.filter((t: any) => t.isCompleted).length || 0;
                  const totalTasks     = milestone.tasks?.length || 0;
                  const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (milestone.status === 'Completed' ? 100 : 0);
                  const isExpanded     = expandedId === milestone._id;
                  return (
                    <React.Fragment key={milestone._id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                        <td className="pl-4">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : milestone._id)}
                            className="p-1 rounded hover:bg-gray-100 text-slate-400 transition-transform"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                              <Flag className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{milestone.name}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[240px] mt-0.5">{milestone.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600 whitespace-nowrap">
                          {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                          {completedTasks}/{totalTasks}
                        </td>
                        <td className="px-6 py-4 w-40">
                          <div className="flex items-center space-x-2">
                            <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                              <div className={cn('h-full rounded-full', milestone.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{progress}%</span>
                          </div>
                        </td>
                        {/* <td className="px-6 py-4 text-center">
                          <select
                            value={milestone.status || 'Pending'}
                            onChange={e => handleStatusChange(milestone, e.target.value as MilestoneStatus)}
                            className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border cursor-pointer focus:outline-none appearance-none text-center', getStatusStyle(milestone.status || 'Pending'))}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td> */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => openEditModal(milestone)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                              title="Edit Milestone"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(milestone._id, milestone.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Delete Milestone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/projects/${projectId}/milestones/${milestone._id}`)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-100 transition-all"
                              title="View details"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Tasks Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-gray-50/50 p-6 border-b border-gray-100">
                            <div className="space-y-3">
                              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 pl-2">Task Checklist</p>
                              {totalTasks === 0 ? (
                                <p className="text-xs text-slate-400 italic pl-2">No tasks added to this milestone.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {milestone.tasks.map((task: any, i: number) => {
                                    const key = `${milestone._id}-${i}`;
                                    const isToggling = togglingTask === key;
                                    const assignee   = memberName(task.assignedTo);
                                    return (
                                      <div key={i} className={cn('rounded-xl border bg-white p-3 shadow-sm transition-all hover:border-blue-200', task.isCompleted ? 'bg-emerald-50/20 border-emerald-100' : 'border-gray-100')}>
                                        <div className="flex items-start gap-3">
                                          <button onClick={() => initiateToggle(milestone, i)} disabled={isToggling} className="mt-0.5 shrink-0">
                                            {isToggling ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : task.isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-300 hover:text-blue-400" />}
                                          </button>
                                          <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm font-semibold', task.isCompleted ? 'line-through text-slate-400' : 'text-gray-800')}>{task.title}</p>
                                            {task.description && <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-slate-400">
                                              {(task.startDate || task.endDate) && (
                                                <span className="flex items-center gap-1">
                                                  <Clock className="w-3 h-3" />
                                                  {task.startDate ? new Date(task.startDate).toLocaleDateString() : '—'}
                                                  {task.endDate ? ` → ${new Date(task.endDate).toLocaleDateString()}` : ''}
                                                </span>
                                              )}
                                              {assignee && (
                                                <span className="flex items-center gap-1">
                                                  <User className="w-3 h-3" />{assignee}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {!task.isCompleted && (
                                            <button onClick={() => openEditTask(milestone, i)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all shrink-0">
                                              <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {milestones.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic bg-white">
                      No milestones set for this project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Card view ── */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {milestones.map((milestone) => {
            const completedTasks = milestone.tasks?.filter((t: any) => t.isCompleted).length || 0;
            const totalTasks     = milestone.tasks?.length || 0;
            const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (milestone.status === 'Completed' ? 100 : 0);
            const isExpanded     = expandedId === milestone._id;
            return (
              <div key={milestone._id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full overflow-hidden">
                <div className="p-5 flex-1 flex flex-col">
                  {/* Header: Title and Menu */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => router.push(`/projects/${projectId}/milestones/${milestone._id}`)}>
                      <h4 className="text-base font-semibold text-gray-900 truncate" title={milestone.name}>{milestone.name}</h4>
                      {milestone.dueDate && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Due {new Date(milestone.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                     
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (milestoneMenuId === milestone._id) {
                            setMilestoneMenuId(null); setMenuPos(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setMilestoneMenuId(milestone._id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {milestone.description && (
                    <p className="text-sm text-slate-600 mt-3 line-clamp-2 cursor-pointer flex-1" onClick={() => router.push(`/projects/${projectId}/milestones/${milestone._id}`)}>
                      {milestone.description}
                    </p>
                  )}
                  {!milestone.description && <div className="flex-1" />}

                  {/* Progress */}
                  <div className="mt-5 space-y-2 cursor-pointer" onClick={() => router.push(`/projects/${projectId}/milestones/${milestone._id}`)}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Progress</span>
                      <span className="font-semibold text-gray-900">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }}
                        className={cn('h-full rounded-full', milestone.status === 'Completed' ? 'bg-emerald-500' : milestone.status === 'On Hold' ? 'bg-amber-500' : 'bg-blue-500')}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer / Checklist */}
                <div className="border-t border-gray-100 bg-gray-50/30">
                  <div className="flex items-center justify-between px-5 py-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : milestone._id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-gray-900 transition-colors"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>{completedTasks}/{totalTasks} Tasks</span>
                      {totalTasks > 0 && (isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                    </button>
                    <button
                      onClick={() => router.push(`/projects/${projectId}/milestones/${milestone._id}`)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>

                  <AnimatePresence>
                    {isExpanded && totalTasks > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden bg-white border-t border-gray-100">
                        <div className="p-2 space-y-1 max-h-[220px] overflow-y-auto">
                          {milestone.tasks.map((task: any, i: number) => {
                            const key = `${milestone._id}-${i}`;
                            const isToggling = togglingTask === key;
                            const assignee   = memberName(task.assignedTo);
                            return (
                              <div key={i} className={cn('flex items-start gap-3 p-2.5 rounded-lg transition-colors group', task.isCompleted ? 'bg-emerald-50/30' : 'hover:bg-gray-50')}>
                                <button
                                  onClick={() => initiateToggle(milestone, i)}
                                  disabled={isToggling}
                                  className="mt-0.5 shrink-0 focus:outline-none"
                                >
                                  {isToggling
                                    ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                    : task.isCompleted
                                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      : <Circle className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                  }
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-sm font-medium leading-tight', task.isCompleted ? 'line-through text-slate-400' : 'text-gray-800')}>
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="text-xs text-slate-500 mt-1 truncate">{task.description}</p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                    {(task.startDate || task.endDate) && (
                                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        {task.startDate ? new Date(task.startDate).toLocaleDateString() : '—'}
                                        {task.endDate ? ` → ${new Date(task.endDate).toLocaleDateString()}` : ''}
                                      </span>
                                    )}
                                    {assignee && (
                                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <User className="w-3 h-3" />{assignee}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!task.isCompleted && (
                                  <button
                                    onClick={() => openEditTask(milestone, i)}
                                    className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all shrink-0 opacity-0 group-hover:opacity-100"
                                    title="Edit task"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}

          {milestones.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-slate-500">No milestones set</h4>
              <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">Define key milestones to track the critical path of your project.</p>
              <button onClick={openCreateModal} className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-500 transition-colors">+ Add first milestone</button>
            </div>
          )}
        </div>
      )}

      {/* ── Completion Note Prompt ── */}
      <AnimatePresence>
        {completionPrompt && (() => {
          const ms = milestones.find(m => m._id === completionPrompt.milestoneId);
          const task = ms?.tasks[completionPrompt.taskIndex];
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCompletionPrompt(null)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="w-full max-w-sm relative z-10">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Mark task complete</p>
                      <p className="text-xs text-slate-500 truncate max-w-[220px]">{task?.title}</p>
                    </div>
                  </div>

                  {/* Completion note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completion Note <span className="font-normal text-slate-400">(optional)</span></label>
                    <textarea
                      rows={2}
                      value={completionPrompt.note}
                      onChange={e => setCompletionPrompt(prev => prev ? { ...prev, note: e.target.value } : null)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all"
                      placeholder="How was it completed? Any notes..."
                      autoFocus
                    />
                  </div>

                  {/* Proof of work image */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Proof of Work <span className="font-normal text-slate-400">(optional photo)</span></label>
                    <input
                      ref={proofInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleProofUpload(f); e.target.value = ''; }}
                    />
                    {completionPrompt.proofImageUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-200">
                        <img src={completionPrompt.proofImageUrl} alt="Proof" className="w-full h-32 object-cover" />
                        <button
                          onClick={() => setCompletionPrompt(prev => prev ? { ...prev, proofImageUrl: '' } : null)}
                          className="absolute top-2 right-2 p-1 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => proofInputRef.current?.click()}
                        disabled={completionPrompt.uploading}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-xl text-sm font-semibold text-slate-400 hover:text-blue-500 transition-all disabled:opacity-50"
                      >
                        {completionPrompt.uploading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                          : <><Camera className="w-4 h-4" /> Upload Photo</>
                        }
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setCompletionPrompt(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-slate-600 transition-all">Cancel</button>
                    <button
                      onClick={() => commitToggle(ms, completionPrompt.taskIndex, completionPrompt.note, completionPrompt.proofImageUrl)}
                      disabled={completionPrompt.uploading}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mark Done
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── Edit Task Modal ── */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingTask(null)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="w-full max-w-sm relative z-10">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">Edit Task</p>
                  </div>
                  <button onClick={() => setEditingTask(null)} className="p-1.5 text-slate-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title *</label>
                  <input
                    type="text"
                    autoFocus
                    value={editingTask.form.title}
                    onChange={e => setEditingTask(prev => prev ? { ...prev, form: { ...prev.form, title: e.target.value } } : null)}
                    className={inputCls}
                    placeholder="Task title"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    value={editingTask.form.description}
                    onChange={e => setEditingTask(prev => prev ? { ...prev, form: { ...prev.form, description: e.target.value } } : null)}
                    className={inputCls}
                    placeholder="Optional details..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      value={editingTask.form.startDate}
                      onChange={e => {
                        const s = e.target.value;
                        setEditingTask(prev => prev ? {
                          ...prev,
                          form: {
                            ...prev.form,
                            startDate: s,
                            endDate: prev.form.endDate && prev.form.endDate < s ? '' : prev.form.endDate,
                          }
                        } : null);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      value={editingTask.form.endDate}
                      min={editingTask.form.startDate || undefined}
                      onChange={e => setEditingTask(prev => prev ? { ...prev, form: { ...prev.form, endDate: e.target.value } } : null)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To</label>
                  <select value={editingTask.form.assignedTo} onChange={e => setEditingTask(prev => prev ? { ...prev, form: { ...prev.form, assignedTo: e.target.value } } : null)} className={inputCls}>
                    <option value="">— Unassigned —</option>
                    {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setEditingTask(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-slate-600 transition-all">Cancel</button>
                  <button
                    onClick={handleSaveEditTask}
                    disabled={isSavingEditTask || !editingTask.form.title.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {isSavingEditTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Save Task</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ── XER Import Modal ── */}
      {/* ── Fixed-position milestone context menu (escapes card overflow-hidden) ── */}
      {milestoneMenuId && menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setMilestoneMenuId(null); setMenuPos(null); }} />
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 50 }}
            className="w-36 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          >
            <button
              onClick={() => {
                const ms = milestones.find(m => m._id === milestoneMenuId);
                if (ms) openEditModal(ms);
                setMilestoneMenuId(null); setMenuPos(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Pencil className="w-3.5 h-3.5" /><span>Edit</span>
            </button>
            <button
              onClick={() => {
                const ms = milestones.find(m => m._id === milestoneMenuId);
                if (ms) handleDelete(ms._id, ms.name);
                setMilestoneMenuId(null); setMenuPos(null);
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
            </button>
          </div>
        </>
      )}

      <XERImportModal
        isOpen={isXERModalOpen}
        onClose={() => setIsXERModalOpen(false)}
        onSuccess={fetchData}
        projectId={projectId}
      />

      {/* ── Create / Edit Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-lg relative z-10">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-8 pt-8 pb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                      <Flag className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{editingMilestone ? 'Edit Milestone' : 'New Milestone'}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{editingMilestone ? 'Update details and tasks.' : 'Set a target with optional task checklist.'}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="px-8 pb-8 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-600">Milestone Name</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputCls} placeholder="e.g. Foundation Complete" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-600">Description</label>
                    <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={inputCls + ' resize-none'} placeholder="What needs to be achieved?" />
                  </div>



                  <div className="pt-2 flex space-x-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-medium transition-all">Cancel</button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-3 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{editingMilestone ? 'Save Changes' : 'Create Milestone'}</span>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          </>
        )}
      </div>
      )}
    </SkeletonLoader>
  );
};
