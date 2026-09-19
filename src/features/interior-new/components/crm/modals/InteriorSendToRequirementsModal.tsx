'use client';

// Port of src/components/modals/SendToRequirementsModal.tsx, rewired to interiorCrmService.

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, PenTool, User, FileText, Calendar, Clock, AlertTriangle, History } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { validateNonEmpty, validateRequiredDate, ValidationErrors } from '@/lib/crmValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  initialData?: {
    scheduledDate?: string | Date;
    assignedMember?: string;
    remarks?: string;
  } | null;
  onSuccess: () => void;
  users?: any[];
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Team Member';
  const roleName = u.role?.name || u.role || 'Member';
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

export function InteriorSendToRequirementsModal({
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
  const [assignedMember, setAssignedMember] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<{ assignedMember?: string | null; scheduledDate?: string | null }>({});

  useEffect(() => {
    if (isOpen) {
      setAssignedMember(initialData?.assignedMember || '');
      setScheduledDate(formatForDateTimeLocal(initialData?.scheduledDate));
      setRemarks(initialData?.remarks || '');
      setErrors({});
    } else {
      setAssignedMember('');
      setScheduledDate('');
      setRemarks('');
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isRescheduling = Boolean(
    initialData?.scheduledDate || initialData?.assignedMember || initialData?.remarks
  );

  const previousAssignedUser = initialData?.assignedMember
    ? (() => {
        const u = users.find(
          (u) => (u._id || u.id || u.clerkUserId) === initialData.assignedMember
        );
        return u ? (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name) : 'Assigned Consultant';
      })()
    : null;

  const isPastDate = Boolean(
    scheduledDate && new Date(scheduledDate).getTime() < Date.now()
  );

  const validateForm = () => {
    const newErrors: { assignedMember?: string | null; scheduledDate?: string | null } = {
      assignedMember: validateNonEmpty(assignedMember, 'Assign consultant or team member'),
      scheduledDate: validateRequiredDate(scheduledDate, 'Discussion date & time'),
    };
    setErrors(newErrors);
    return !newErrors.assignedMember && !newErrors.scheduledDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const meetingDate = new Date(scheduledDate);
      const trimmedRemarks = remarks.trim();

      const updatePayload: any = {
        status: 'Under Requirement',
        designerAssigned: assignedMember.trim(),
        requirementScheduledDate: meetingDate.toISOString(),
      };

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Requirement Gathering',
        status: 'Pending',
        scheduledDate: meetingDate.toISOString(),
        remarks: trimmedRemarks || 'Requirement gathering session scheduled with consultant.',
        user: assignedMember.trim() || undefined,
      });

      toast.success(
        isRescheduling
          ? 'Requirements session rescheduled successfully!'
          : 'Successfully scheduled & passed to Requirements!'
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send to requirements');
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
              <PenTool className="text-emerald-600" /> {isRescheduling ? 'Reschedule Requirements Session' : 'Send to Requirements'}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 truncate max-w-full">
              {isRescheduling
                ? 'Update scheduled discussion date, time & assigned consultant'
                : 'Assign a consultant and schedule the requirements gathering session'}{customerName ? ` for ${customerName}` : ''}.
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
          <div className="mb-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <History size={12} /> Previous Schedule (Reference)
              </span>
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md border border-[hsl(var(--border))]">
                Requirements Phase
              </span>
            </div>
            {initialData?.scheduledDate && (
              <p className="text-xs font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5 pt-0.5">
                <Clock size={12} className="text-emerald-600 shrink-0" />
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
              <User size={13} className="text-emerald-600" />
              Assign Requirement Consultant / Team Member *
            </label>
            <select
              value={assignedMember}
              onChange={(e) => {
                setAssignedMember(e.target.value);
                if (errors.assignedMember) setErrors((prev) => ({ ...prev, assignedMember: null }));
              }}
              className={`w-full mt-1.5 px-4 py-3 rounded-xl border bg-[hsl(var(--background))] text-sm outline-none transition-all ${
                errors.assignedMember
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            >
              <option value="">-- Select Member / Consultant --</option>
              {users.map((u) => (
                <option key={u._id || u.id || u.clerkUserId} value={u._id || u.id || u.clerkUserId}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
            {errors.assignedMember && <p className="text-xs text-red-500 mt-1">{errors.assignedMember}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-600" />
                Discussion / Meeting Date & Time *
              </label>
              {isPastDate && (
                <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                  <AlertTriangle size={10} /> Date Overdue
                </span>
              )}
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
                    : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.scheduledDate && (
              <p className="text-xs text-red-500 mt-1">{errors.scheduledDate}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <FileText size={13} className="text-emerald-600" />
              Requirement Handover & Brief Notes
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add client preferences, specific design style expectations, budget focus, or notes from site visit..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
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
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              {isSubmitting ? 'Saving...' : isRescheduling ? 'Reschedule Session ➔' : 'Schedule & Pass to Requirements ➔'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
