'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag, Calendar, CheckCircle2, Circle, Loader2, ChevronLeft,
  Clock, User, MessageSquare, Camera, Package, Plus, Trash2,
  Image as ImageIcon, AlertCircle, Pencil, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { useToast } from '@/providers/ToastContext';

type MilestoneStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
const STATUS_OPTIONS: MilestoneStatus[] = ['Pending', 'In Progress', 'Completed', 'On Hold'];

const getStatusStyle = (s: string) => {
  switch (s) {
    case 'Completed':   return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    case 'In Progress': return 'text-blue-700 bg-blue-100 border-blue-200';
    case 'On Hold':     return 'text-amber-700 bg-amber-100 border-amber-200';
    default:            return 'text-slate-600 bg-gray-100 border-gray-200';
  }
};

interface Member { _id: string; name: string; }
interface MaterialOption { _id: string; name: string; unit: string; balance: number; }
interface MaterialRow { materialId: string; quantity: string; }
interface SubmitForm {
  open: boolean; note: string;
  photoFile: File | null; photoPreview: string | null; uploadingPhoto: boolean;
  materials: MaterialRow[];
}
const emptySubmitForm = (): SubmitForm => ({
  open: false, note: '', photoFile: null, photoPreview: null,
  uploadingPhoto: false, materials: [],
});

const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

export default function MilestoneDetailPage() {
  const { id: projectId, milestonesId: milestoneId } = useParams<{ id: string; milestonesId: string }>();
  const router = useRouter();
  const toast = useToast();

  const [milestone, setMilestone]   = useState<any>(null);
  const [members, setMembers]       = useState<Member[]>([]);
  const [materials, setMaterials]   = useState<MaterialOption[]>([]);
  const [loading, setLoading]       = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [submitForms, setSubmitForms] = useState<Record<number, SubmitForm>>({});
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  // Add task state
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskForm, setAddTaskForm] = useState({ title: '', description: '', startDate: '', endDate: '', assignedTo: '' });
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  // Edit task state
  const [editingTask, setEditingTask] = useState<{
    taskIndex: number;
    form: { title: string; description: string; startDate: string; endDate: string; assignedTo: string };
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ── Fetch data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [msRes, usersRes, matRes] = await Promise.all([
          api.get(`/projects/${projectId}/milestones`),
          api.get(`/users?projectId=${projectId}`),
          api.get(`/projects/${projectId}/materials`),
        ]);

        const all = Array.isArray(msRes.data) ? msRes.data : msRes.data?.milestones ?? [];
        const found = all.find((m: any) => m._id === milestoneId);
        if (!found) { toast.error('Milestone not found'); router.push(`/projects/${projectId}/milestones`); return; }
        setMilestone(found);

        const rawUsers: any[] = Array.isArray(usersRes.data) ? usersRes.data : [];
        setMembers(rawUsers.map((u: any) => ({ _id: u._id, name: u.name || 'Member' })));

        const matList = Array.isArray(matRes.data) ? matRes.data : matRes.data?.materials ?? [];
        setMaterials(matList);
      } catch {
        toast.error('Failed to load milestone');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, milestoneId]);

  const memberName = (assignedTo: any) => {
    if (!assignedTo) return null;
    const id = assignedTo?._id || assignedTo;
    return members.find(m => m._id === id)?.name || assignedTo?.name || null;
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const setForm = (i: number, patch: Partial<SubmitForm>) =>
    setSubmitForms(prev => ({ ...prev, [i]: { ...(prev[i] ?? emptySubmitForm()), ...patch } }));

  const addMaterialRow = (i: number) =>
    setForm(i, { materials: [...(submitForms[i]?.materials ?? []), { materialId: '', quantity: '' }] });

  const removeMaterialRow = (fi: number, ri: number) =>
    setForm(fi, { materials: (submitForms[fi]?.materials ?? []).filter((_, j) => j !== ri) });

  const updateMaterialRow = (fi: number, ri: number, field: keyof MaterialRow, value: string) => {
    const rows = [...(submitForms[fi]?.materials ?? [])];
    rows[ri] = { ...rows[ri], [field]: value };
    setForm(fi, { materials: rows });
  };

  // ── Status change ────────────────────────────────────────────────────────────
  const handleStatusChange = async (status: MilestoneStatus) => {
    setSavingStatus(true);
    try {
      const res = await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, { status });
      setMilestone(res.data);
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
    finally { setSavingStatus(false); }
  };

  // ── Submit task ──────────────────────────────────────────────────────────────
  const handleSubmitTask = async (taskIndex: number) => {
    const form = submitForms[taskIndex] ?? emptySubmitForm();
    setSubmitting(taskIndex);
    const tasks: any[] = milestone.tasks || [];

    try {
      let proofImage: { url: string; uploadedAt: string } | undefined;
      if (form.photoFile) {
        setForm(taskIndex, { uploadingPhoto: true });
        const url = await uploadToCloudinary(form.photoFile);
        proofImage = { url, uploadedAt: new Date().toISOString() };
        setForm(taskIndex, { uploadingPhoto: false });
      }

      const validMaterials = (form.materials ?? []).filter(r => r.materialId && Number(r.quantity) > 0);

      for (const r of validMaterials) {
        const mat = materials.find(m => m._id === r.materialId);
        if (mat) {
          const avail = mat.balance ?? 0;
          if (avail <= 0) {
            toast.error(`"${mat.name}" is out of stock`);
            setSubmitting(null);
            return;
          }
          if (Number(r.quantity) > avail) {
            toast.error(`Insufficient stock for "${mat.name}" — only ${avail} ${mat.unit} available`);
            setSubmitting(null);
            return;
          }
        }
      }

      if (validMaterials.length > 0) {
        await api.post(`/projects/${projectId}/material-usage`, {
          items: validMaterials.map(r => ({ materialId: r.materialId, quantity: Number(r.quantity) })),
          locationOrTask: tasks[taskIndex]?.title || '',
          commonNote: form.note || '',
        });
      }

      const allDone = tasks.every((t: any, i: number) => i === taskIndex ? true : t.isCompleted);
      const updatedTasks = tasks.map((t: any, i: number) => {
        if (i !== taskIndex) return t;
        return { ...t, isCompleted: true, completedAt: new Date().toISOString(), completionNote: form.note || t.completionNote || '', ...(proofImage ? { proofImage } : {}) };
      });

      const payload: any = { tasks: updatedTasks };
      if (allDone && milestone.status !== 'Completed') payload.status = 'Completed';

      const res = await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, payload);
      setMilestone(res.data);
      setSubmitForms(prev => { const n = { ...prev }; delete n[taskIndex]; return n; });
      if (payload.status === 'Completed') toast.success('All tasks done — milestone Completed!');
      else toast.success('Task submitted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit task');
    } finally { setSubmitting(null); }
  };

  // ── Uncheck task ─────────────────────────────────────────────────────────────
  const handleUncheck = async (taskIndex: number) => {
    setSubmitting(taskIndex);
    const tasks: any[] = milestone.tasks || [];
    const updatedTasks = tasks.map((t: any, i: number) =>
      i === taskIndex ? { ...t, isCompleted: false, completedAt: null } : t
    );
    const payload: any = { tasks: updatedTasks };
    if (milestone.status === 'Completed') payload.status = 'In Progress';
    try {
      const res = await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, payload);
      setMilestone(res.data);
    } catch { toast.error('Failed to update task'); }
    finally { setSubmitting(null); }
  };

  // ── Edit task ────────────────────────────────────────────────────────────────
  const openEdit = (taskIndex: number) => {
    const t = milestone.tasks[taskIndex];
    setEditingTask({
      taskIndex,
      form: {
        title: t.title || '', description: t.description || '',
        startDate: t.startDate ? t.startDate.slice(0, 10) : '',
        endDate:   t.endDate   ? t.endDate.slice(0, 10)   : '',
        assignedTo: t.assignedTo?._id || t.assignedTo || '',
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    const { startDate, endDate } = editingTask.form;
    if (startDate && endDate && endDate < startDate) {
      toast.error('End date cannot be before start date');
      return;
    }
    setIsSavingEdit(true);
    const tasks: any[] = milestone.tasks || [];
    const updatedTasks = tasks.map((t: any, i: number) => {
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
      const res = await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, { tasks: updatedTasks });
      setMilestone(res.data);
      setEditingTask(null);
      toast.success('Task updated');
    } catch { toast.error('Failed to update task'); }
    finally { setIsSavingEdit(false); }
  };

  // ── Add task ─────────────────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!addTaskForm.title.trim()) return;
    if (addTaskForm.startDate && addTaskForm.endDate && addTaskForm.endDate < addTaskForm.startDate) {
      toast.error('End date cannot be before start date');
      return;
    }
    setIsSavingAdd(true);
    const tasks: any[] = milestone.tasks || [];
    const newTask = {
      title:       addTaskForm.title.trim(),
      description: addTaskForm.description || undefined,
      startDate:   addTaskForm.startDate   || undefined,
      endDate:     addTaskForm.endDate     || undefined,
      assignedTo:  addTaskForm.assignedTo  || undefined,
      isCompleted: false,
    };
    try {
      const res = await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, { tasks: [...tasks, newTask] });
      setMilestone(res.data);
      setAddTaskForm({ title: '', description: '', startDate: '', endDate: '', assignedTo: '' });
      setShowAddTask(false);
      toast.success('Task added');
    } catch { toast.error('Failed to add task'); }
    finally { setIsSavingAdd(false); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!milestone && !loading) return null;

  return (
    <>
      <SkeletonLoader loading={loading} preset="detail">
        {milestone && (() => {
          const tasks: any[] = milestone.tasks || [];
          const completedCount = tasks.filter((t: any) => t.isCompleted).length;
          const progress = tasks.length > 0
            ? Math.round((completedCount / tasks.length) * 100)
            : milestone.status === 'Completed' ? 100 : 0;

          return (
            <>
            <div className="space-y-6 pt-4">

        {/* Back button */}
        <button
          onClick={() => router.push(`/projects/${projectId}/milestones`)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Milestones
        </button>

        {/* ── Milestone header ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Flag className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 leading-tight truncate">{milestone.name}</h1>
                {milestone.description && (
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{milestone.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    {savingStatus && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                    <select
                      value={milestone.status || 'Pending'}
                      onChange={e => handleStatusChange(e.target.value as MilestoneStatus)}
                      className={cn('px-2.5 py-1 rounded-md text-[10px] font-medium border cursor-pointer focus:outline-none appearance-none', getStatusStyle(milestone.status))}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {milestone.dueDate && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      Due {new Date(milestone.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {milestone.completedAt && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed {new Date(milestone.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress ring */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke={milestone.status === 'Completed' ? '#10b981' : milestone.status === 'On Hold' ? '#f59e0b' : '#3b82f6'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - progress / 100)}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900">{progress}%</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{completedCount}/{tasks.length} Tasks</p>
            </div>
          </div>
        </div>

        {/* ── Task list ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Tasks</h2>
            <button
              onClick={() => setShowAddTask(v => !v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>

          {/* ── Add task inline form ── */}
          <AnimatePresence>
            {showAddTask && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="p-5 border border-blue-100 bg-blue-50/30 rounded-xl shadow-sm">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-4">New Task</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title *</label>
                      <input
                        autoFocus type="text" value={addTaskForm.title}
                        onChange={e => setAddTaskForm(p => ({ ...p, title: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); }}
                        className={inputCls} placeholder="e.g. Pour concrete slab"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                      <input type="text" value={addTaskForm.description}
                        onChange={e => setAddTaskForm(p => ({ ...p, description: e.target.value }))}
                        className={inputCls} placeholder="Optional details..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</label>
                        <input type="date" value={addTaskForm.startDate}
                          onChange={e => {
                            const s = e.target.value;
                            setAddTaskForm(p => ({
                              ...p,
                              startDate: s,
                              endDate: p.endDate && p.endDate < s ? '' : p.endDate,
                            }));
                          }}
                          className={inputCls} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</label>
                        <input type="date" value={addTaskForm.endDate}
                          min={addTaskForm.startDate || undefined}
                          onChange={e => setAddTaskForm(p => ({ ...p, endDate: e.target.value }))}
                          className={inputCls} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign To</label>
                      <select value={addTaskForm.assignedTo}
                        onChange={e => setAddTaskForm(p => ({ ...p, assignedTo: e.target.value }))}
                        className={inputCls}>
                        <option value="">— Unassigned —</option>
                        {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowAddTask(false); setAddTaskForm({ title: '', description: '', startDate: '', endDate: '', assignedTo: '' }); }}
                        className="flex-1 py-2.5 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-slate-600 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button" onClick={handleAddTask}
                        disabled={isSavingAdd || !addTaskForm.title.trim()}
                        className="flex-1 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                      >
                        {isSavingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Add Task</>}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {tasks.length === 0 && !showAddTask && (
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 rounded-xl">
              <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-slate-500 font-medium">No tasks yet.</p>
              <button
                onClick={() => setShowAddTask(true)}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                + Add the first task
              </button>
            </div>
          )}

          {tasks.map((task: any, i: number) => {
            const assignee    = memberName(task.assignedTo);
            const form        = submitForms[i] ?? emptySubmitForm();
            const isSubmitting = submitting === i;
            const isExpanded  = expandedTask === i;

            return (
              <div key={i} className={cn('bg-white rounded-xl shadow-sm border transition-all overflow-hidden', task.isCompleted ? 'border-emerald-100 bg-emerald-50/20' : 'border-gray-200 hover:border-blue-200')}>

                {/* Task header row — click anywhere to open submit form (incomplete) or toggle detail (completed) */}
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer select-none"
                  onClick={() => {
                    if (task.isCompleted) {
                      setExpandedTask(isExpanded ? null : i);
                    } else {
                      const opening = !form.open;
                      setForm(i, {
                        open: opening,
                        ...(opening && form.materials.length === 0 && materials.length > 0
                          ? { materials: [{ materialId: '', quantity: '' }] }
                          : {}),
                      });
                    }
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      task.isCompleted
                        ? handleUncheck(i)
                        : setForm(i, { open: !form.open, ...((!form.open && form.materials.length === 0 && materials.length > 0) ? { materials: [{ materialId: '', quantity: '' }] } : {}) });
                    }}
                    disabled={isSubmitting}
                    className="shrink-0 mt-0.5 focus:outline-none"
                  >
                    {isSubmitting
                      ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      : task.isCompleted
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 hover:text-emerald-600 transition-colors" />
                        : <Circle className="w-5 h-5 text-gray-300 hover:text-blue-400 transition-colors" />
                    }
                  </button>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn('text-base font-semibold', task.isCompleted ? 'line-through text-slate-400' : 'text-gray-900')}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Edit — only if not completed */}
                        {!task.isCompleted && (
                          <button
                            onClick={e => { e.stopPropagation(); openEdit(i); }}
                            className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit task"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <span className="p-1.5 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-slate-500 mt-0.5">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                      {(task.startDate || task.endDate) && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {task.startDate ? new Date(task.startDate).toLocaleDateString() : '—'}
                          {task.endDate ? ` → ${new Date(task.endDate).toLocaleDateString()}` : ''}
                        </span>
                      )}
                      {assignee && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                          <User className="w-3.5 h-3.5" />{assignee}
                        </span>
                      )}
                      {task.isCompleted && task.completedAt && (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Done {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-5 pb-5 border-t border-dashed border-gray-200 pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {task.completionNote && (
                          <div className="col-span-2 md:col-span-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Completion Note</p>
                            <p className="text-sm text-gray-700 italic flex items-start gap-2">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />{task.completionNote}
                            </p>
                          </div>
                        )}
                        {task.proofImage?.url && (
                          <div className="col-span-2 md:col-span-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Proof Photo</p>
                            <a href={task.proofImage.url} target="_blank" rel="noopener noreferrer">
                              <img src={task.proofImage.url} alt="Proof" className="h-40 w-auto object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" />
                            </a>
                            {task.proofImage.uploadedAt && (
                              <p className="text-[10px] text-slate-400 mt-1">{new Date(task.proofImage.uploadedAt).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit form */}
                <AnimatePresence>
                  {!task.isCompleted && form.open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-5 pb-5 pt-4 border-t border-blue-100 bg-blue-50/30 space-y-5">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Submit Task Completion</p>

                        <div className="grid md:grid-cols-2 gap-5">
                          {/* Left col — note + photo */}
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Completion Note <span className="font-normal text-slate-400">(optional)</span>
                              </label>
                              <textarea
                                rows={3}
                                value={form.note}
                                onChange={e => setForm(i, { note: e.target.value })}
                                className={inputCls + ' resize-none'}
                                placeholder="How was it completed? Any notes..."
                                autoFocus
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5" />
                                Proof Photo <span className="font-normal text-slate-400">(optional)</span>
                              </label>
                              {form.photoPreview ? (
                                <div className="relative rounded-xl overflow-hidden border border-gray-200 w-fit">
                                  <img src={form.photoPreview} alt="Preview" className="h-32 w-auto object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => setForm(i, { photoFile: null, photoPreview: null })}
                                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center gap-3 px-4 py-4 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl cursor-pointer transition-all">
                                  <input
                                    ref={el => { fileRefs.current[i] = el; }}
                                    type="file" accept="image/*" className="hidden"
                                    onChange={e => {
                                      const f = e.target.files?.[0];
                                      if (f) { setForm(i, { photoFile: f, photoPreview: URL.createObjectURL(f) }); }
                                    }}
                                  />
                                  <ImageIcon className="w-5 h-5 text-slate-400" />
                                  <span className="text-sm text-slate-400">Click to attach a proof photo</span>
                                </label>
                              )}
                            </div>
                          </div>

                          {/* Right col — materials */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" />
                                Materials Used <span className="font-normal text-slate-400">(optional)</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => addMaterialRow(i)}
                                disabled={materials.length === 0}
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 disabled:text-slate-300 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            </div>

                            {materials.length === 0 && (
                              <p className="text-xs text-slate-400 italic">No materials set up for this project.</p>
                            )}

                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {(form.materials ?? []).map((row, ri) => {
                                const selMat = materials.find(m => m._id === row.materialId);
                                const balance = selMat ? (selMat.balance ?? 0) : undefined;
                                const outOfStock = balance !== undefined && balance <= 0;
                                const exceeded = !outOfStock && balance !== undefined && Number(row.quantity) > balance;
                                const inputBad = outOfStock || exceeded;
                                return (
                                  <div key={ri} className="flex items-start gap-2">
                                    <select
                                      value={row.materialId}
                                      onChange={e => updateMaterialRow(i, ri, 'materialId', e.target.value)}
                                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    >
                                      <option value="">— Select —</option>
                                      {materials.map(m => (
                                        <option key={m._id} value={m._id}>
                                          {m.name} ({m.unit}) — {Math.max(0, m.balance ?? 0)} avail.
                                        </option>
                                      ))}
                                    </select>
                                    <div className="flex flex-col items-end gap-0.5">
                                      <input
                                        type="number" min={0}
                                        max={balance !== undefined ? Math.max(0, balance) : undefined}
                                        value={row.quantity}
                                        disabled={outOfStock}
                                        onChange={e => updateMaterialRow(i, ri, 'quantity', e.target.value)}
                                        placeholder={outOfStock ? '—' : 'Qty'}
                                        className={`w-20 bg-white border rounded-xl px-3 py-2 text-sm text-right text-gray-900 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                          inputBad
                                            ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                                            : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                        }`}
                                      />
                                      {outOfStock && <span className="text-[10px] text-red-500 font-medium">Out of stock</span>}
                                      {exceeded && <span className="text-[10px] text-red-500 font-medium">Max {balance}</span>}
                                    </div>
                                    <button type="button" onClick={() => removeMaterialRow(i, ri)} className="p-2 mt-0.5 text-slate-300 hover:text-red-500 transition-colors">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => setForm(i, { open: false })}
                            className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-slate-600 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSubmitTask(i)}
                            disabled={isSubmitting || form.uploadingPhoto}
                            className="flex-1 md:flex-none md:px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            {isSubmitting || form.uploadingPhoto
                              ? <><Loader2 className="w-4 h-4 animate-spin" />{form.uploadingPhoto ? 'Uploading…' : 'Submitting…'}</>
                              : <><CheckCircle2 className="w-4 h-4" />Mark Complete</>
                            }
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Edit Task Modal ── */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                  <input autoFocus type="text" value={editingTask.form.title}
                    onChange={e => setEditingTask(p => p ? { ...p, form: { ...p.form, title: e.target.value } } : null)}
                    className={inputCls} placeholder="Task title" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <input type="text" value={editingTask.form.description}
                    onChange={e => setEditingTask(p => p ? { ...p, form: { ...p.form, description: e.target.value } } : null)}
                    className={inputCls} placeholder="Optional details..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start</label>
                    <input type="date" value={editingTask.form.startDate}
                      onChange={e => {
                        const s = e.target.value;
                        setEditingTask(p => p ? {
                          ...p,
                          form: {
                            ...p.form,
                            startDate: s,
                            endDate: p.form.endDate && p.form.endDate < s ? '' : p.form.endDate,
                          },
                        } : null);
                      }}
                      className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End</label>
                    <input type="date" value={editingTask.form.endDate}
                      min={editingTask.form.startDate || undefined}
                      onChange={e => setEditingTask(p => p ? { ...p, form: { ...p.form, endDate: e.target.value } } : null)}
                      className={inputCls} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To</label>
                  <select value={editingTask.form.assignedTo}
                    onChange={e => setEditingTask(p => p ? { ...p, form: { ...p.form, assignedTo: e.target.value } } : null)}
                    className={inputCls}>
                    <option value="">— Unassigned —</option>
                    {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setEditingTask(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-slate-600 transition-all">Cancel</button>
                  <button onClick={handleSaveEdit} disabled={isSavingEdit || !editingTask.form.title.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold text-white transition-all flex items-center justify-center gap-2">
                    {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" />Save</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>
          );
        })()}
      </SkeletonLoader>
    </>
  );
}
