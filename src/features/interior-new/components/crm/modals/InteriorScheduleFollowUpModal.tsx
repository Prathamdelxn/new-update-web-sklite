'use client';

// Port of src/components/modals/ScheduleFollowUpModal.tsx, rewired to interiorCrmService.
// `users` entries come from the interior-os backend's User model (firstName/lastName),
// not sky-lite's own `name` field.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, History, Calendar, Clock, User, Phone, FileText, AlertCircle } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { validateFutureDate, validateNonEmpty, ValidationErrors, getMinDateTimeLocal } from '@/lib/crmValidation';

interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  onSuccess: () => void;
  users?: any[];
  initialData?: {
    _id?: string;
    type?: string;
    scheduledDate?: string | Date;
    remarks?: string;
    assignedSalesExecutive?: string | any;
  } | null;
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'User';
  return `${name} (${u.role?.name || u.role || 'User'})`;
}

function formatForDateTimeLocal(dateVal?: string | Date | null): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function InteriorScheduleFollowUpModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
  users = [],
  initialData = null,
}: ScheduleFollowUpModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [form, setForm] = useState({
    type: 'Phone Call',
    scheduledDate: '',
    remarks: '',
    assignedSalesExecutive: '',
  });

  const minDateTime = getMinDateTimeLocal();

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let assignedId = '';
        if (initialData.assignedSalesExecutive) {
          if (typeof initialData.assignedSalesExecutive === 'object') {
            assignedId = (initialData.assignedSalesExecutive as any)._id || (initialData.assignedSalesExecutive as any).id || '';
          } else {
            assignedId = String(initialData.assignedSalesExecutive);
          }
        }
        setForm({
          type: initialData.type || 'Phone Call',
          scheduledDate: formatForDateTimeLocal(initialData.scheduledDate),
          remarks: initialData.remarks || '',
          assignedSalesExecutive: assignedId,
        });
      } else {
        setForm({
          type: 'Phone Call',
          scheduledDate: '',
          remarks: '',
          assignedSalesExecutive: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Resolve assigned user name for display when rescheduling
  let assignedUserDisplayName = '';
  if (initialData?.assignedSalesExecutive) {
    if (typeof initialData.assignedSalesExecutive === 'object') {
      assignedUserDisplayName = userLabel(initialData.assignedSalesExecutive);
    } else {
      const match = users.find(u => (u._id || u.id || u.clerkUserId) === initialData.assignedSalesExecutive);
      if (match) assignedUserDisplayName = userLabel(match);
    }
  }

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      scheduledDate: validateFutureDate(form.scheduledDate, 'Follow-up date & time'),
      assignedSalesExecutive: validateNonEmpty(form.assignedSalesExecutive, 'Assigned team member'),
      remarks: validateNonEmpty(form.remarks, 'Follow-up goal / notes'),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(err => err !== null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    try {
      await interiorCrmService.createActivity({
        type: form.type,
        status: 'Pending',
        scheduledDate: form.scheduledDate,
        remarks: form.remarks.trim(),
        customer: customerId,
        user: form.assignedSalesExecutive || undefined,
      });

      if (form.assignedSalesExecutive) {
        await interiorCrmService.updateCustomer(customerId, {
          assignedSalesExecutive: form.assignedSalesExecutive,
          status: 'Contacted',
        });
      } else {
        await interiorCrmService.updateCustomer(customerId, { status: 'Contacted' });
      }

      toast.success(initialData?._id ? 'Follow-up rescheduled successfully!' : 'Follow-up scheduled successfully!');
      onSuccess();
      onClose();
      setErrors({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">
              {initialData?._id ? 'Reschedule Follow-up' : 'Schedule Follow-up'}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] truncate max-w-full" title={customerName ? `Plan a future touchpoint with ${customerName}` : 'Plan a future touchpoint'}>
              {initialData?._id ? 'Update scheduled touchpoint date, time & notes' : 'Plan a future touchpoint'} 
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl cursor-pointer"><X size={20} className="text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        {/* Previous follow-up reference box when rescheduling */}
        {initialData && initialData._id && (
          <div className="mb-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-3.5 space-y-1.5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5 shrink-0">
                <History size={12} /> Previous Schedule (Reference)
              </span>
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md border border-[hsl(var(--border))] shrink-0">
                {initialData.type || 'Follow-up'}
              </span>
            </div>
            {initialData.scheduledDate && (
              <p className="text-xs font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5 pt-0.5 min-w-0 overflow-hidden">
                <Clock size={12} className="text-blue-500 shrink-0" />
                <span className="truncate">
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
            {initialData.remarks && (
              <p className="text-xs text-[hsl(var(--muted-foreground))] italic bg-[hsl(var(--muted)/0.4)] p-2 rounded-xl border border-[hsl(var(--border)/0.5)] mt-1 break-words [overflow-wrap:anywhere] whitespace-pre-wrap min-w-0">
                "{initialData.remarks}"
              </p>
            )}
            {assignedUserDisplayName && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                Assigned: <strong className="text-[hsl(var(--foreground))]">{assignedUserDisplayName}</strong>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Follow-up Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5 h-5">
                <Phone size={13} className="text-[hsl(var(--muted-foreground))]" />
                Follow-up Type *
              </label>
              <select
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full h-11 px-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5 h-5">
                <Calendar size={13} className="text-[hsl(var(--muted-foreground))]" />
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                min={minDateTime}
                value={form.scheduledDate}
                onChange={e => {
                  const val = e.target.value;
                  setForm({...form, scheduledDate: val});
                  if (val) {
                    const err = validateFutureDate(val, 'Follow-up date & time');
                    setErrors(prev => ({ ...prev, scheduledDate: err }));
                  } else {
                    setErrors(prev => ({ ...prev, scheduledDate: null }));
                  }
                }}
                className={`w-full h-11 px-3.5 rounded-xl border bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 transition-all ${
                  errors.scheduledDate
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-[hsl(var(--border))] focus:ring-blue-500/20 focus:border-blue-500'
                }`}
              />
              {errors.scheduledDate && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} className="shrink-0" />
                  {errors.scheduledDate}
                </p>
              )}
            </div>
          </div>

          {/* Assign Member */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5 h-5">
              <User size={13} className="text-[hsl(var(--muted-foreground))]" />
              Assign Member <span className="text-red-500">*</span>
            </label>
            <select
              value={form.assignedSalesExecutive}
              onChange={e => {
                setForm({...form, assignedSalesExecutive: e.target.value});
                if (errors.assignedSalesExecutive) setErrors({ ...errors, assignedSalesExecutive: null });
              }}
              className={`w-full h-11 px-3.5 rounded-xl border bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                errors.assignedSalesExecutive
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-[hsl(var(--border))] focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            >
              <option value="">Select team member...</option>
              {users.map(u => (
                <option key={u._id || u.id || u.clerkUserId} value={u._id || u.id || u.clerkUserId}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
            {errors.assignedSalesExecutive && (
              <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} className="shrink-0" />
                {errors.assignedSalesExecutive}
              </p>
            )}
          </div>

          {/* Follow-up Goal / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5 h-5">
              <FileText size={13} className="text-[hsl(var(--muted-foreground))]" />
              Follow-up Goal / Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={form.remarks}
              onChange={e => {
                setForm({...form, remarks: e.target.value});
                if (errors.remarks) setErrors({ ...errors, remarks: null });
              }}
              placeholder="e.g. Call client regarding modular kitchen preferences and budget range..."
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 transition-all resize-none ${
                errors.remarks
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-[hsl(var(--border))] focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            />
            {errors.remarks && (
              <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} className="shrink-0" />
                {errors.remarks}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 cursor-pointer transition-all"
            >
              {isSubmitting ? 'Saving...' : initialData?._id ? 'Confirm Reschedule' : 'Save Follow-up'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
