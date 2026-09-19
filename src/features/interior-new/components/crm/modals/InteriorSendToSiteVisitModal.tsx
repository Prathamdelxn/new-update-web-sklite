'use client';

// Port of src/components/modals/SendToSiteVisitModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, History, Clock, User, FileText, Calendar } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { validateNonEmpty, validateRequiredDate, ValidationErrors } from '@/lib/crmValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  onSuccess: () => void;
  users?: any[];
  initialData?: {
    scheduledDate?: string | Date;
    assignedSalesExecutive?: string;
    remarks?: string;
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

export function InteriorSendToSiteVisitModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
  users = [],
  initialData = null,
}: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [assignedSalesExecutive, setAssignedSalesExecutive] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [remarks, setRemarks] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAssignedSalesExecutive(initialData.assignedSalesExecutive || '');
        setScheduledDate(formatForDateTimeLocal(initialData.scheduledDate));
        setRemarks(initialData.remarks || '');
      } else {
        setAssignedSalesExecutive('');
        setScheduledDate('');
        setRemarks('');
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const isDateInPast = Boolean(
    scheduledDate && new Date(scheduledDate).getTime() < Date.now()
  );

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      assignedSalesExecutive: validateNonEmpty(assignedSalesExecutive, 'Assign member'),
      scheduledDate: validateRequiredDate(scheduledDate, 'Scheduled date & time'),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((err) => err !== null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const visitDate = new Date(scheduledDate);
      const trimmedRemarks = remarks.trim();
      const updatePayload: any = {
        status: 'Under Site Visit',
        siteVisitScheduledDate: visitDate.toISOString(),
        assignedSalesExecutive: assignedSalesExecutive.trim(),
        remarks: trimmedRemarks || undefined,
      };

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Site Visit',
        status: 'Pending',
        scheduledDate: visitDate.toISOString(),
        remarks: trimmedRemarks || 'Lead passed to Site Visit and assigned to site team.',
        user: assignedSalesExecutive.trim() || undefined,
      });

      // Automatically complete any pending follow-up activities for this customer
      try {
        const activitiesRes = await interiorCrmService.getActivities();
        const acts = activitiesRes?.data || (Array.isArray(activitiesRes) ? activitiesRes : []);
        const pendingFollowUps = acts.filter((a: any) => {
          const cId = a.customer?._id || a.customer?.id || a.customer;
          return cId === customerId && a.status === 'Pending' && a.type !== 'Site Visit';
        });

        for (const act of pendingFollowUps) {
          await interiorCrmService.updateActivity(act._id, {
            status: 'Completed',
            completedDate: new Date(),
          });
        }
      } catch (actErr) {
        console.warn('Failed to auto-complete pending follow-ups:', actErr);
      }

      toast.success(initialData?.scheduledDate ? 'Site visit rescheduled successfully!' : 'Follow-up completed & scheduled for Site Visit!');
      onSuccess();
      onClose();
      setErrors({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send to site visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previousAssignedUser = initialData?.assignedSalesExecutive
    ? (() => {
        const u = users.find(
          (u) => (u._id || u.id || u.clerkUserId) === initialData.assignedSalesExecutive
        );
        return u ? (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name) : 'Assigned Staff';
      })()
    : null;

  const isRescheduling = Boolean(initialData?.scheduledDate || initialData?.assignedSalesExecutive);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 shadow-2xl z-[70] max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2">
              <MapPin className="text-purple-600" /> {isRescheduling ? 'Reschedule Site Visit' : 'Send to Site Visit'}
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 truncate max-w-full" title={customerName ? `for ${customerName}` : ''}>
              {isRescheduling ? 'Update scheduled visit date, time & assigned member' : 'Assign a member and schedule the on-site visit.'} {customerName ? `for ${customerName}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl cursor-pointer"><X size={20} className="text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        {/* Previous Site Visit Details Box when rescheduling */}
        {isRescheduling && (
          <div className="mb-5 bg-purple-500/5 border border-purple-500/20 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <History size={12} /> Previous Schedule (Reference)
              </span>
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md border border-[hsl(var(--border))]">
                Site Survey
              </span>
            </div>
            {initialData?.scheduledDate && (
              <p className="text-xs font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5 pt-0.5">
                <Clock size={12} className="text-purple-600 shrink-0" />
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
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Assign Member to Site Visit *</label>
            <select
              value={assignedSalesExecutive}
              onChange={e => {
                setAssignedSalesExecutive(e.target.value);
                if (errors.assignedSalesExecutive) setErrors({ ...errors, assignedSalesExecutive: null });
              }}
              className={`w-full mt-1.5 px-4 py-3 rounded-xl border bg-[hsl(var(--background))] text-sm outline-none transition-all ${
                errors.assignedSalesExecutive
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'
              }`}
            >
              <option value="">-- Select Member --</option>
              {users.map(u => (
                <option key={u._id || u.id || u.clerkUserId} value={u._id || u.id || u.clerkUserId}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
            {errors.assignedSalesExecutive && (
              <p className="text-xs text-red-500 mt-1">{errors.assignedSalesExecutive}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Scheduled Date & Time *</label>
              {isDateInPast && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded">
                  Past date
                </span>
              )}
            </div>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={e => {
                setScheduledDate(e.target.value);
                if (errors.scheduledDate) setErrors({ ...errors, scheduledDate: null });
              }}
              className={`w-full mt-1.5 px-4 py-3 rounded-xl border bg-[hsl(var(--background))] text-sm outline-none transition-all ${
                errors.scheduledDate
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : isDateInPast
                  ? 'border-amber-500/60 focus:border-amber-500'
                  : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'
              }`}
            />
            {errors.scheduledDate && (
              <p className="text-xs text-red-500 mt-1">{errors.scheduledDate}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Instructions / Notes</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Any specific instructions for the person visiting the site..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 shadow-md shadow-purple-600/20 active:scale-95 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isRescheduling ? 'Confirm Reschedule' : 'Pass to Site Visit ➔'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
