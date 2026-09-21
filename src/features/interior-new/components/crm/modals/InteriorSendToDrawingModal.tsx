'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Ruler,
  User,
  FileText,
  AlertCircle,
  History,
  ChevronDown,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { validateNonEmpty } from '@/lib/crmValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  currentStatus?: string;
  initialData?: {
    scheduledDate?: string | Date;
    assignedDesigner?: string;
    remarks?: string;
  } | null;
  onSuccess: () => void;
  users?: any[];
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Team Member';
  const roleName = u.role?.name || u.role || 'Designer';
  return `${name} (${roleName})`;
}

export function InteriorSendToDrawingModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  currentStatus,
  initialData,
  onSuccess,
  users = [],
}: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedDesigner, setAssignedDesigner] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<{ assignedDesigner?: string | null }>({});

  useEffect(() => {
    if (isOpen) {
      setAssignedDesigner(initialData?.assignedDesigner || '');
      setRemarks(initialData?.remarks || '');
      setErrors({});
    } else {
      setAssignedDesigner('');
      setRemarks('');
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isDrawingStage = ['Under Drawing', 'Design Approved'].includes(currentStatus || '');
  const isRescheduling = isDrawingStage && Boolean(initialData?.assignedDesigner || initialData?.remarks);

  const previousAssignedUser = initialData?.assignedDesigner
    ? (() => {
        const u = users.find(
          (u) => (u._id || u.id || u.clerkUserId) === initialData.assignedDesigner
        );
        return u ? (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name) : 'Assigned Designer';
      })()
    : null;

  const validateForm = () => {
    const newErrors: { assignedDesigner?: string | null } = {
      assignedDesigner: validateNonEmpty(assignedDesigner, 'Assign a 2D/3D designer or team member'),
    };
    setErrors(newErrors);
    return !newErrors.assignedDesigner;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please assign a designer');
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedRemarks = remarks.trim();

      const updatePayload: any = {
        status: 'Under Drawing',
        designerAssigned: assignedDesigner.trim(),
      };

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: '2D/3D Drawing',
        status: 'Pending',
        scheduledDate: new Date().toISOString(),
        remarks: trimmedRemarks || 'Lead passed to 2D/3D Drawing phase and assigned to designer.',
        user: assignedDesigner.trim() || undefined,
      });

      toast.success(
        isRescheduling
          ? 'Drawing designer updated successfully!'
          : 'Successfully passed to 2D & 3D Drawing phase!'
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send to drawing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl shadow-2xl z-[70] overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
            <div className="flex items-start gap-3.5 pr-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm mt-0.5">
                <Ruler size={20} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2">
                  {isRescheduling ? 'Reassign Drawing Phase' : 'Pass to 2D/3D Drawing'}
                </h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 leading-relaxed">
                  {isRescheduling
                    ? 'Update assigned designer and handover brief notes.'
                    : 'Assign a 2D/3D designer and handover requirements.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[hsl(var(--muted)/0.6)] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer shrink-0"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 custom-scrollbar">
            {/* Previous Session Details Box when rescheduling */}
            {isRescheduling && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-2.5 shadow-xs min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5 shrink-0">
                    <History size={13} /> Current Assignment
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 shrink-0">
                    Drawing Phase
                  </span>
                </div>

                {previousAssignedUser && (
                  <div className="flex items-center gap-2 bg-[hsl(var(--background))] px-3 py-2 rounded-xl border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] min-w-0 overflow-hidden">
                    <User size={13} className="text-blue-500 shrink-0" />
                    <span className="truncate">
                      Currently Assigned: <strong className="text-[hsl(var(--foreground))] font-semibold">{previousAssignedUser}</strong>
                    </span>
                  </div>
                )}

                {initialData?.remarks && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] italic bg-[hsl(var(--background))] p-2.5 rounded-xl border border-[hsl(var(--border)/0.8)] leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap min-w-0">
                    "{initialData.remarks}"
                  </div>
                )}
              </div>
            )}

            {/* Field 1: Assigned Designer */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-blue-600" />
                  Assign 2D / 3D Designer <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                  {users.length} available
                </span>
              </label>

              <div className="relative">
                <select
                  value={assignedDesigner}
                  onChange={(e) => {
                    setAssignedDesigner(e.target.value);
                    if (errors.assignedDesigner) setErrors((prev) => ({ ...prev, assignedDesigner: null }));
                  }}
                  className={`w-full appearance-none pl-3.5 pr-10 py-2.5 sm:py-3 rounded-xl border bg-[hsl(var(--background))] text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] outline-none transition-all cursor-pointer ${
                    errors.assignedDesigner
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                >
                  <option value="">-- Select Designer or Team Member --</option>
                  {users.map((u) => (
                    <option key={u._id || u.id || u.clerkUserId} value={u._id || u.id || u.clerkUserId}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[hsl(var(--muted-foreground))]">
                  <ChevronDown size={15} />
                </div>
              </div>

              {errors.assignedDesigner && (
                <p className="text-xs text-rose-500 font-medium flex items-center gap-1 pt-0.5">
                  <AlertCircle size={12} /> {errors.assignedDesigner}
                </p>
              )}
            </div>

            {/* Field 2: Drawing Brief & Handover Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <FileText size={13} className="text-blue-600" />
                  Drawing Brief & Handover Notes
                </label>
              </div>

              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any specific instructions, CAD layer guidelines, room priorities, or notes from requirements..."
                className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.6)] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none leading-relaxed transition-all"
              />
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                These notes will be passed directly to the assigned designer.
              </p>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-[hsl(var(--border))] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>{isRescheduling ? 'Confirm Reassign' : 'Pass to Drawing'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
