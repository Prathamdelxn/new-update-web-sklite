'use client';

// Port of src/components/modals/SendToSiteVisitModal.tsx, rewired to interiorCrmService.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  History,
  Clock,
  User,
  FileText,
  Calendar,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { validateNonEmpty, validateFutureDate, ValidationErrors, getMinDateTimeLocal } from '@/lib/crmValidation';

interface SendToSiteVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  projectLocation?: string;
  currentStatus?: string;
  onSuccess: () => void;
  users?: any[];
  initialData?: {
    scheduledDate?: string | Date;
    remarks?: string;
    assignedSalesExecutive?: string;
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
  projectLocation,
  currentStatus,
  onSuccess,
  users = [],
  initialData = null,
}: SendToSiteVisitModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [assignedSalesExecutive, setAssignedSalesExecutive] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const isPast = initialData.scheduledDate
          ? new Date(initialData.scheduledDate).getTime() < Date.now()
          : false;

        setAssignedSalesExecutive(initialData.assignedSalesExecutive || '');
        setScheduledDate(isPast ? '' : formatForDateTimeLocal(initialData.scheduledDate));
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

  const minDateTime = getMinDateTimeLocal();
  const isSiteVisitStage = ['Under Site Visit', 'Measurement Done'].includes(currentStatus || '');
  const isRescheduling = isSiteVisitStage && Boolean(initialData?.scheduledDate);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      assignedSalesExecutive: validateNonEmpty(assignedSalesExecutive, 'Assign team member'),
      scheduledDate: validateFutureDate(scheduledDate, 'Scheduled date & time'),
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

      toast.success(isRescheduling ? 'Site visit rescheduled successfully!' : 'Follow-up completed & scheduled for Site Visit!');
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
        return u ? (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name) : 'Assigned Member';
      })()
    : null;

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
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-sm mt-0.5">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2">
                  {isRescheduling ? 'Reschedule Site Visit' : 'Send to Site Visit'}
                </h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 leading-relaxed">
                  {isRescheduling
                    ? 'Update scheduled visit date, time, and assigned member.'
                    : 'Assign a member and schedule the on-site visit.'}
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
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4 space-y-2.5 shadow-xs min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5 shrink-0">
                    <History size={13} /> Previous Schedule (Reference)
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 shrink-0">
                    Site Survey
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 min-w-0">
                  {initialData?.scheduledDate && (
                    <div className="flex items-center gap-2 bg-[hsl(var(--background))] px-3 py-2 rounded-xl border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] min-w-0 overflow-hidden">
                      <Clock size={13} className="text-purple-600 shrink-0" />
                      <span className="truncate">
                        {new Date(initialData.scheduledDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {previousAssignedUser && (
                    <div className="flex items-center gap-2 bg-[hsl(var(--background))] px-3 py-2 rounded-xl border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] min-w-0 overflow-hidden">
                      <User size={13} className="text-blue-500 shrink-0" />
                      <span className="truncate">
                        <strong className="text-[hsl(var(--foreground))] font-semibold">{previousAssignedUser}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {initialData?.remarks && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] italic bg-[hsl(var(--background))] p-2.5 rounded-xl border border-[hsl(var(--border)/0.8)] leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap min-w-0">
                    "{initialData.remarks}"
                  </div>
                )}
              </div>
            )}

            {/* Field 1: Assigned Staff */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-purple-600" />
                  Assign Team Member to Site Visit <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                  {users.length} available
                </span>
              </label>

              <div className="relative">
                <select
                  value={assignedSalesExecutive}
                  onChange={(e) => {
                    setAssignedSalesExecutive(e.target.value);
                    if (errors.assignedSalesExecutive) setErrors((prev) => ({ ...prev, assignedSalesExecutive: null }));
                  }}
                  className={`w-full appearance-none pl-3.5 pr-10 py-2.5 sm:py-3 rounded-xl border bg-[hsl(var(--background))] text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] outline-none transition-all cursor-pointer ${
                    errors.assignedSalesExecutive
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'
                  }`}
                >
                  <option value="">-- Select Team Member --</option>
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

              {errors.assignedSalesExecutive && (
                <p className="text-xs text-rose-500 font-medium flex items-center gap-1 pt-0.5">
                  <AlertCircle size={12} /> {errors.assignedSalesExecutive}
                </p>
              )}
            </div>

            {/* Field 2: Scheduled Date & Time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <Calendar size={13} className="text-purple-600" />
                  Scheduled Date & Time <span className="text-rose-500">*</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={scheduledDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScheduledDate(val);
                    if (val) {
                      const err = validateFutureDate(val, 'Scheduled date & time');
                      setErrors((prev) => ({ ...prev, scheduledDate: err }));
                    } else {
                      setErrors((prev) => ({ ...prev, scheduledDate: null }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 sm:py-3 rounded-xl border bg-[hsl(var(--background))] text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] outline-none transition-all ${
                    errors.scheduledDate
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-[hsl(var(--border))] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'
                  }`}
                />
              </div>

              {errors.scheduledDate && (
                <p className="text-xs text-rose-500 font-medium flex items-center gap-1 pt-0.5">
                  <AlertCircle size={12} /> {errors.scheduledDate}
                </p>
              )}
            </div>

            {/* Field 3: Instructions / Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <FileText size={13} className="text-purple-600" />
                  Instructions / Site Notes
                </label>
                <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md">
                  Optional
                </span>
              </div>

              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any specific instructions for the person visiting the site..."
                className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/0.6)] focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none leading-relaxed transition-all"
              />
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
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>{isRescheduling ? 'Confirm Reschedule' : 'Send to Site Visit'}</span>
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
