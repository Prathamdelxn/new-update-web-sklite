'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Flag, Calendar, User, Clock, CheckCircle2,
  Circle, Loader2, MessageSquare, ChevronDown,
  ChevronUp, AlertCircle, Camera, Package, Plus,
  Trash2, Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { uploadToCloudinary } from '@/lib/upload';

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
interface MaterialOption {
  _id: string;
  name: string;
  unit: string;
  balance?: number;
  currentStock?: number;
  totalReceived?: number;
  totalConsumed?: number;
}
interface MaterialRow { materialId: string; quantity: string; }

interface SubmitForm {
  open: boolean;
  note: string;
  photoFile: File | null;
  photoPreview: string | null;
  uploadingPhoto: boolean;
  materials: MaterialRow[];
}

const emptySubmitForm = (): SubmitForm => ({
  open: false, note: '', photoFile: null, photoPreview: null,
  uploadingPhoto: false, materials: [],
});

const getAvailableStock = (mat: any): number => {
  if (!mat) return 0;
  return mat.balance !== undefined
    ? mat.balance
    : (mat.currentStock !== undefined ? mat.currentStock : ((mat.totalReceived || 0) - (mat.totalConsumed || 0)));
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  milestone: any | null;
  projectId: string;
  members: Member[];
  onUpdate: (updated: any) => void;
}

export const MilestoneDetailModal: React.FC<Props> = ({
  isOpen, onClose, milestone, projectId, members, onUpdate,
}) => {
  const [savingStatus, setSavingStatus]   = useState(false);
  const [expandedTask, setExpandedTask]   = useState<number | null>(null);
  const [submitting, setSubmitting]       = useState<number | null>(null);
  const [submitForms, setSubmitForms]     = useState<Record<number, SubmitForm>>({});
  const [materials, setMaterials]         = useState<MaterialOption[]>([]);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const toast = useToast();

  // Fetch project materials when modal opens
  useEffect(() => {
    if (!isOpen || !projectId) return;
    api.get(`/projects/${projectId}/materials`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.materials ?? [];
        setMaterials(list);
      })
      .catch(() => {});
    // Reset form state
    setSubmitForms({});
    setExpandedTask(null);
  }, [isOpen, projectId]);

  if (!milestone) return null;

  const tasks: any[] = milestone.tasks || [];
  const completedCount = tasks.filter((t: any) => t.isCompleted).length;
  const progress = tasks.length > 0
    ? Math.round((completedCount / tasks.length) * 100)
    : (milestone.status === 'Completed' ? 100 : 0);

  const memberName = (assignedTo: any) => {
    if (!assignedTo) return null;
    const id = assignedTo?._id || assignedTo;
    return members.find(m => m._id === id)?.name || assignedTo?.name || null;
  };

  // ── Helpers to update a submit form ────────────────────────────────────────
  const setForm = (i: number, patch: Partial<SubmitForm>) =>
    setSubmitForms(prev => ({ ...prev, [i]: { ...(prev[i] ?? emptySubmitForm()), ...patch } }));

  const addMaterialRow = (i: number) =>
    setForm(i, { materials: [...(submitForms[i]?.materials ?? []), { materialId: '', quantity: '' }] });

  const removeMaterialRow = (formIdx: number, rowIdx: number) =>
    setForm(formIdx, { materials: (submitForms[formIdx]?.materials ?? []).filter((_, j) => j !== rowIdx) });

  const updateMaterialRow = (formIdx: number, rowIdx: number, field: keyof MaterialRow, value: string) => {
    const rows = [...(submitForms[formIdx]?.materials ?? [])];
    rows[rowIdx] = { ...rows[rowIdx], [field]: value };
    setForm(formIdx, { materials: rows });
  };

  const handlePhotoSelect = (formIdx: number, file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm(formIdx, { photoFile: file, photoPreview: preview });
  };

  // ── Status change ──────────────────────────────────────────────────────────
  const handleStatusChange = async (status: MilestoneStatus) => {
    setSavingStatus(true);
    try {
      const res = await api.patch(`/projects/${projectId}/milestones/${milestone._id}`, { status });
      onUpdate(res.data);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  // ── Submit task (mark complete) ────────────────────────────────────────────
  const handleSubmitTask = async (taskIndex: number) => {
    const form = submitForms[taskIndex] ?? emptySubmitForm();
    setSubmitting(taskIndex);

    try {
      // 1. Upload photo if selected
      let proofImage: { url: string; uploadedAt: string } | undefined;
      if (form.photoFile) {
        setForm(taskIndex, { uploadingPhoto: true });
        const url = await uploadToCloudinary(form.photoFile);
        proofImage = { url, uploadedAt: new Date().toISOString() };
        setForm(taskIndex, { uploadingPhoto: false });
      }

      // 2. Log material usage if any rows filled
      const validMaterials = (form.materials ?? []).filter(r => r.materialId && Number(r.quantity) > 0);

      // Validate quantities against available balance
      for (const r of validMaterials) {
        const mat = materials.find((m: any) => m._id === r.materialId);
        if (mat) {
          const avail = getAvailableStock(mat);
          if (avail <= 0) {
            toast.error(`Insufficient stock available for ${mat.name}.`);
            setSubmitting(null);
            return;
          }
          if (Number(r.quantity) > avail) {
            toast.error(`Insufficient stock available for ${mat.name}. Only ${avail} ${mat.unit} available.`);
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

      // 3. Patch milestone task
      const allDone = tasks.every((t: any, i: number) =>
        i === taskIndex ? true : t.isCompleted
      );

      const updatedTasks = tasks.map((t: any, i: number) => {
        if (i !== taskIndex) return t;
        return {
          ...t,
          isCompleted:    true,
          completedAt:    new Date().toISOString(),
          completionNote: form.note || t.completionNote || '',
          ...(proofImage ? { proofImage } : {}),
        };
      });

      const payload: any = { tasks: updatedTasks };
      if (allDone && milestone.status !== 'Completed') payload.status = 'Completed';

      const res = await api.patch(`/projects/${projectId}/milestones/${milestone._id}`, payload);
      onUpdate(res.data);

      // Clean up form
      setSubmitForms(prev => { const n = { ...prev }; delete n[taskIndex]; return n; });

      if (payload.status === 'Completed') toast.success('All tasks done — milestone marked Completed!');
      else toast.success('Task submitted successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit task');
    } finally {
      setSubmitting(null);
    }
  };

  // ── Uncheck task ──────────────────────────────────────────────────────────
  const handleUncheckTask = async (taskIndex: number) => {
    setSubmitting(taskIndex);
    const updatedTasks = tasks.map((t: any, i: number) =>
      i === taskIndex ? { ...t, isCompleted: false, completedAt: null } : t
    );
    const payload: any = { tasks: updatedTasks };
    if (milestone.status === 'Completed') payload.status = 'In Progress';
    try {
      const res = await api.patch(`/projects/${projectId}/milestones/${milestone._id}`, payload);
      onUpdate(res.data);
    } catch {
      toast.error('Failed to update task');
    } finally {
      setSubmitting(null);
    }
  };

  const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="w-full max-w-2xl relative z-10 max-h-[90vh] flex flex-col"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">

              {/* ── Header ── */}
              <div className="px-6 py-5 border-b border-gray-100 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                      <Flag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-gray-900 leading-tight">{milestone.name}</h2>
                      {milestone.description && (
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{milestone.description}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-gray-900 hover:bg-gray-50 transition-colors shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    {savingStatus && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                    <select
                      value={milestone.status || 'Pending'}
                      onChange={e => handleStatusChange(e.target.value as MilestoneStatus)}
                      className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border cursor-pointer focus:outline-none appearance-none', getStatusStyle(milestone.status || 'Pending'))}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {milestone.dueDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due {new Date(milestone.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                  {milestone.completedAt && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Completed {new Date(milestone.completedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">{completedCount}/{tasks.length} tasks done</span>
                    <span className="font-black text-gray-900">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
                      className={cn('h-full rounded-full', milestone.status === 'Completed' ? 'bg-emerald-500' : milestone.status === 'On Hold' ? 'bg-amber-500' : 'bg-blue-500')}
                    />
                  </div>
                </div>
              </div>

              {/* ── Task list ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                {tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-full bg-gray-100 border border-gray-200 mb-4">
                      <AlertCircle className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No tasks added to this milestone.</p>
                  </div>
                )}

                {tasks.map((task: any, i: number) => {
                  const assignee    = memberName(task.assignedTo);
                  const isExpanded  = expandedTask === i;
                  const form        = submitForms[i] ?? emptySubmitForm();
                  const isSubmitting = submitting === i;

                  return (
                    <div key={i} className={cn('rounded-2xl border transition-all', task.isCompleted ? 'bg-emerald-50/60 border-emerald-100' : 'bg-white border-gray-200 hover:border-blue-200')}>

                      {/* Task header — click anywhere to expand details */}
                      <div
                        className="flex items-start gap-3 p-4 cursor-pointer select-none"
                        onClick={() => setExpandedTask(isExpanded ? null : i)}
                      >
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (task.isCompleted) { handleUncheckTask(i); return; }
                            const opening = !form.open;
                            setForm(i, {
                              open: opening,
                              ...(opening && (form.materials ?? []).length === 0 && materials.length > 0
                                ? { materials: [{ materialId: '', quantity: '' }] }
                                : {}),
                            });
                          }}
                          disabled={isSubmitting}
                          className="shrink-0 mt-0.5"
                        >
                          {isSubmitting
                            ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            : task.isCompleted
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 hover:text-emerald-600 transition-colors" />
                              : <Circle className="w-5 h-5 text-gray-300 hover:text-blue-400 transition-colors" />
                          }
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn('text-sm font-semibold', task.isCompleted ? 'line-through text-slate-400' : 'text-gray-900')}>
                              {task.title}
                            </p>
                            <span className="shrink-0 p-1 text-slate-400">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
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
                            {task.isCompleted && task.completedAt && (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Done {new Date(task.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded details (read-only) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="px-4 pb-4 border-t border-dashed border-gray-200 space-y-3 pt-3">
                              <div className="grid grid-cols-2 gap-4">
                                {task.description && (
                                  <div className="col-span-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                                  </div>
                                )}
                                {task.startDate && (
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</p>
                                    <p className="text-sm text-gray-700">{new Date(task.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                )}
                                {task.endDate && (
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Date</p>
                                    <p className="text-sm text-gray-700">{new Date(task.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                )}
                                {assignee && (
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned To</p>
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">{assignee.charAt(0)}</div>
                                      <p className="text-sm text-gray-700">{assignee}</p>
                                    </div>
                                  </div>
                                )}
                                {task.isCompleted && task.completedAt && (
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Completed At</p>
                                    <p className="text-sm text-emerald-700 font-medium">{new Date(task.completedAt).toLocaleString()}</p>
                                  </div>
                                )}
                                {task.completionNote && (
                                  <div className="col-span-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Completion Note</p>
                                    <p className="text-sm text-gray-700 italic flex items-start gap-2">
                                      <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />{task.completionNote}
                                    </p>
                                  </div>
                                )}
                                {task.proofImage?.url && (
                                  <div className="col-span-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Proof Photo</p>
                                    <a href={task.proofImage.url} target="_blank" rel="noopener noreferrer">
                                      <img src={task.proofImage.url} alt="Proof" className="w-32 h-32 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" />
                                    </a>
                                    <p className="text-[10px] text-slate-400 mt-1">{task.proofImage.uploadedAt ? new Date(task.proofImage.uploadedAt).toLocaleDateString() : ''}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── Submit form (incomplete tasks only) ── */}
                      <AnimatePresence>
                        {!task.isCompleted && form.open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="px-4 pb-4 border-t border-blue-100 bg-blue-50/30 space-y-4 pt-4">
                              <p className="text-xs font-black text-blue-700 uppercase tracking-wider">Submit Task Completion</p>

                              {/* Completion Note */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  Completion Note <span className="font-normal text-slate-400">(optional)</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={form.note}
                                  onChange={e => setForm(i, { note: e.target.value })}
                                  className={inputCls + ' resize-none'}
                                  placeholder="How was it completed? Any notes..."
                                  autoFocus
                                />
                              </div>

                              {/* Proof Photo */}
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5" />
                                  Proof Photo <span className="font-normal text-slate-400">(optional)</span>
                                </label>
                                {form.photoPreview ? (
                                  <div className="flex items-center gap-3">
                                    <img src={form.photoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                                    <div className="flex-1">
                                      <p className="text-xs text-gray-700 font-medium">{form.photoFile?.name}</p>
                                      <button
                                        type="button"
                                        onClick={() => setForm(i, { photoFile: null, photoPreview: null })}
                                        className="text-xs text-red-500 hover:text-red-700 mt-1 transition-colors"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl cursor-pointer transition-all">
                                    <input
                                      ref={el => { fileRefs.current[i] = el; }}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => handlePhotoSelect(i, e.target.files?.[0] ?? null)}
                                    />
                                    <ImageIcon className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm text-slate-400">Click to attach a photo</span>
                                  </label>
                                )}
                              </div>

                              {/* Material Usage */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" />
                                    Materials Used <span className="font-normal text-slate-400">(optional)</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => addMaterialRow(i)}
                                    disabled={materials.length === 0}
                                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Material
                                  </button>
                                </div>

                                {materials.length === 0 && (
                                  <p className="text-xs text-slate-400 italic">No materials found for this project.</p>
                                )}

                                {(form.materials ?? []).map((row, rowIdx) => {
                                  const selMat = materials.find((m) => m._id === row.materialId);
                                  const balance = selMat ? getAvailableStock(selMat) : undefined;
                                  const outOfStock = balance !== undefined && balance <= 0;
                                  const exceeded = !outOfStock && balance !== undefined && Number(row.quantity) > balance;
                                  const inputBad = outOfStock || exceeded;
                                  return (
                                    <div key={rowIdx} className="flex items-start gap-2">
                                      <select
                                        value={row.materialId}
                                        onChange={e => updateMaterialRow(i, rowIdx, 'materialId', e.target.value)}
                                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                      >
                                        <option value="">— Select material —</option>
                                        {materials.map((m) => (
                                          <option key={m._id} value={m._id}>
                                            {m.name} ({m.unit}) — {Math.max(0, getAvailableStock(m))} available
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex flex-col items-end gap-0.5">
                                        <input
                                          type="number"
                                          min={0}
                                          max={balance !== undefined ? Math.max(0, balance) : undefined}
                                          value={row.quantity}
                                          disabled={outOfStock}
                                          onChange={e => updateMaterialRow(i, rowIdx, 'quantity', e.target.value)}
                                          placeholder={outOfStock ? '—' : 'Qty'}
                                          className={`w-24 bg-white border rounded-xl px-3 py-2 text-sm text-right text-gray-900 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                            inputBad
                                              ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500'
                                              : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-500'
                                          }`}
                                        />
                                        {outOfStock && <span className="text-[10px] text-red-500 font-medium">Out of stock</span>}
                                        {exceeded && <span className="text-[10px] text-red-500 font-medium">Max {balance}</span>}
                                      </div>
                                      <button type="button" onClick={() => removeMaterialRow(i, rowIdx)} className="p-2 mt-0.5 text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>


                              {/* Action buttons */}
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setForm(i, { open: false })}
                                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-slate-600 transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSubmitTask(i)}
                                  disabled={isSubmitting || form.uploadingPhoto}
                                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                  {isSubmitting || form.uploadingPhoto
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{form.uploadingPhoto ? 'Uploading…' : 'Submitting…'}</>
                                    : <><CheckCircle2 className="w-3.5 h-3.5" />Mark Complete</>
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

              {/* ── Footer ── */}
              <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Created {new Date(milestone.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <button onClick={onClose} className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-slate-600 transition-all">
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
