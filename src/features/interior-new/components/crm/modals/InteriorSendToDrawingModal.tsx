'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Ruler, User, FileText, Calendar, Clock, AlertTriangle, History } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { validateNonEmpty, validateRequiredDate } from '@/lib/crmValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
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

const formatForDateTimeLocal = (date?: string | Date | null) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function InteriorSendToDrawingModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  initialData,
  onSuccess,
  users = [],
}: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedDesigner, setAssignedDesigner] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<{ assignedDesigner?: string | null; scheduledDate?: string | null }>({});

  useEffect(() => {
    if (isOpen) {
      setAssignedDesigner(initialData?.assignedDesigner || '');
      setScheduledDate(formatForDateTimeLocal(initialData?.scheduledDate));
      setRemarks(initialData?.remarks || '');
      setErrors({});
    } else {
      setAssignedDesigner('');
      setScheduledDate('');
      setRemarks('');
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isRescheduling = Boolean(
    initialData?.scheduledDate || initialData?.assignedDesigner || initialData?.remarks
  );

  const previousAssignedUser = initialData?.assignedDesigner
    ? (() => {
        const u = users.find(
          (u) => (u._id || u.id || u.clerkUserId) === initialData.assignedDesigner
        );
        return u ? (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name) : 'Assigned Designer';
      })()
    : null;

  const isPastDate = Boolean(
    scheduledDate && new Date(scheduledDate).getTime() < Date.now()
  );

  const validateForm = () => {
    const newErrors: { assignedDesigner?: string | null; scheduledDate?: string | null } = {
      assignedDesigner: validateNonEmpty(assignedDesigner, 'Assign 2D/3D designer'),
      scheduledDate: validateRequiredDate(scheduledDate, 'Delivery / review date & time'),
    };
    setErrors(newErrors);
    return !newErrors.assignedDesigner && !newErrors.scheduledDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const deliveryDate = new Date(scheduledDate);
      const trimmedRemarks = remarks.trim();

      const updatePayload: any = {
        status: 'Under Drawing',
        designerAssigned: assignedDesigner.trim(),
        drawingScheduledDate: deliveryDate.toISOString(),
      };

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: '2D/3D Drawing',
        status: 'Pending',
        scheduledDate: deliveryDate.toISOString(),
        remarks: trimmedRemarks || 'Lead passed to 2D/3D Drawing phase and assigned to designer.',
        user: assignedDesigner.trim() || undefined,
      });

      toast.success(
        isRescheduling
          ? 'Drawing schedule updated successfully!'
          : 'Successfully sent to 2D & 3D Drawing phase!'
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 shadow-2xl z-[70] max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Ruler className="text-blue-600" /> {isRescheduling ? 'Reschedule Drawing Delivery' : 'Pass to 2D/3D Drawing'}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 truncate max-w-full">
              {isRescheduling
                ? 'Update drawing delivery date, time & assigned designer'
                : 'Assign a 2D/3D designer and set drawing delivery timeline'}{customerName ? ` for ${customerName}` : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl cursor-pointer"
          >
            <X size={20} className="text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

        {/* Previous Session Details Box when rescheduling */}
        {isRescheduling && (
          <div className="mb-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <History size={12} /> Previous Schedule (Reference)
              </span>
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md border border-[hsl(var(--border))]">
                Drawing Phase
              </span>
            </div>
            {initialData?.scheduledDate && (
              <p className="text-xs font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5 pt-0.5">
                <Clock size={12} className="text-blue-600 shrink-0" />
                <span>
                  {new Date(initialData.scheduledDate).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </p>
            )}
            {previousAssignedUser && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                <User size={12} className="text-blue-500 shrink-0" />
                <span>Assigned: <strong className="text-[hsl(var(--foreground))]">{previousAssignedUser}</strong></span>
              </p>
            )}
            {initialData?.remarks && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 italic bg-[hsl(var(--muted)/0.4)] p-2 rounded-xl border border-[hsl(var(--border)/0.5)] mt-1">
                "{initialData.remarks}"
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <User size={13} className="text-blue-600" />
              Assign 2D / 3D Designer *
            </label>
            <select
              value={assignedDesigner}
              onChange={(e) => {
                setAssignedDesigner(e.target.value);
                if (errors.assignedDesigner) setErrors((prev) => ({ ...prev, assignedDesigner: null }));
              }}
              className={`w-full mt-1.5 px-4 py-3 rounded-xl border bg-[hsl(var(--background))] text-sm outline-none transition-all ${
                errors.assignedDesigner
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            >
              <option value="">-- Select Designer --</option>
              {users.map((u) => (
                <option key={u._id || u.id || u.clerkUserId} value={u._id || u.id || u.clerkUserId}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
            {errors.assignedDesigner && <p className="text-xs text-red-500 mt-1">{errors.assignedDesigner}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Clock size={13} className="text-blue-600" />
                Delivery Deadline & Time Limit (Date & Time) *
              </label>
              {isPastDate && (
                <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                  <AlertTriangle size={10} /> Date Overdue
                </span>
              )}
            </div>

            {/* Quick Turnaround Time (TAT) Presets */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2 mb-1.5">
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mr-1">
                Quick TAT:
              </span>
              {[
                { label: '24h (1 Day)', hours: 24 },
                { label: '48h (2 Days)', hours: 48 },
                { label: '3 Days', hours: 72 },
                { label: '5 Days', hours: 120 },
                { label: '1 Week', hours: 168 },
              ].map((preset) => {
                const target = new Date(Date.now() + preset.hours * 60 * 60 * 1000);
                const formatted = formatForDateTimeLocal(target);
                const isSelected = scheduledDate === formatted;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setScheduledDate(formatted);
                      if (errors.scheduledDate) setErrors((prev) => ({ ...prev, scheduledDate: null }));
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]'
                    }`}
                  >
                    +{preset.label}
                  </button>
                );
              })}
            </div>

            <div className="relative mt-1.5">
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  if (errors.scheduledDate) setErrors((prev) => ({ ...prev, scheduledDate: null }));
                }}
                className={`w-full px-4 py-3 rounded-xl border bg-[hsl(var(--background))] text-sm outline-none transition-all ${
                  errors.scheduledDate
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
              />
            </div>
            {scheduledDate && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1.5 flex items-center gap-1.5">
                <Clock size={11} className="text-blue-500" />
                Target Limit: <strong className="text-[hsl(var(--foreground))]">{new Date(scheduledDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong>
              </p>
            )}
            {errors.scheduledDate && (
              <p className="text-xs text-red-500 mt-1">{errors.scheduledDate}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <FileText size={13} className="text-blue-600" />
              Drawing Brief & Handover Notes
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any specific instructions, CAD layer guidelines, room priorities, or notes from requirements..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              {isSubmitting ? 'Saving...' : isRescheduling ? 'Reschedule Delivery ➔' : 'Schedule & Pass to Drawing ➔'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
