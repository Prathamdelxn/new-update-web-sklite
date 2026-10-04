'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  Ruler,
  Calculator,
  FileText,
  MapPin,
  PenTool,
  PhoneCall,
  Flame,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { getMinDateTimeLocal } from '@/lib/crmValidation';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  leadName?: string;
  leadData?: any;
  users?: any[];
  onSuccess?: (updatedData?: any) => void;
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'User';
  return `${name} (${u.role?.name || u.role || 'User'})`;
}

// Helper to auto-detect the highest reached pipeline stage before the lead was marked as lost
function detectPreviousStage(lead: any): {
  stageKey: string;
  stageLabel: string;
  status: string;
  badge: string;
  icon: React.ElementType;
  reason: string;
} {
  if (!lead) {
    return {
      stageKey: 'leads',
      stageLabel: 'New Lead',
      status: 'New Lead',
      badge: 'Fresh Lead',
      icon: Layers,
      reason: 'No stage data recorded yet',
    };
  }

  // 1. Quotations stage
  if (lead.quotations && Array.isArray(lead.quotations) && lead.quotations.length > 0) {
    return {
      stageKey: 'quotations',
      stageLabel: 'Quotations Stage',
      status: 'Under Quotation',
      badge: `${lead.quotations.length} Quotation(s) Saved`,
      icon: FileText,
      reason: 'Lead had active or draft quotation proposals',
    };
  }

  // 2. BOQ Estimation stage
  if (lead.boqs && Array.isArray(lead.boqs) && lead.boqs.length > 0) {
    return {
      stageKey: 'boq',
      stageLabel: 'BOQ Estimation Stage',
      status: 'Under BOQ Creation',
      badge: `${lead.boqs.length} BOQ Version(s)`,
      icon: Calculator,
      reason: 'Lead had bill of quantities and cost estimations ready',
    };
  }

  // 3. Drawings stage
  if (lead.designFiles && Array.isArray(lead.designFiles) && lead.designFiles.length > 0) {
    return {
      stageKey: 'drawing',
      stageLabel: 'Drawings & Design Stage',
      status: 'Under Drawing',
      badge: `${lead.designFiles.length} Drawing Blueprint(s)`,
      icon: Ruler,
      reason: 'Lead had 2D/3D design blueprints uploaded',
    };
  }

  // 4. Requirements stage
  if (lead.requirements && Array.isArray(lead.requirements) && lead.requirements.length > 0) {
    return {
      stageKey: 'requirement_design',
      stageLabel: 'Requirements Stage',
      status: 'Under Requirement',
      badge: `${lead.requirements.length} Room Requirements`,
      icon: PenTool,
      reason: 'Lead had detailed room specifications gathered',
    };
  }

  // 5. Site Visit stage
  if (
    lead.siteMeasurements ||
    lead.siteVisitScheduledDate ||
    (lead.sitePhotos && Array.isArray(lead.sitePhotos) && lead.sitePhotos.length > 0)
  ) {
    return {
      stageKey: 'site_visits',
      stageLabel: 'Site Visit Stage',
      status: 'Under Site Visit',
      badge: 'Site Measurements Recorded',
      icon: MapPin,
      reason: 'Lead had site dimensions / visit scheduled',
    };
  }

  // 6. Follow-up stage
  if (lead.futureFollowUpDate || lead.assignedSalesExecutive) {
    return {
      stageKey: 'follow_ups',
      stageLabel: 'Follow-ups Stage',
      status: 'Contacted',
      badge: 'Assigned / Contacted',
      icon: PhoneCall,
      reason: 'Lead had sales executive or follow-up activity',
    };
  }

  // 7. Default New Lead
  return {
    stageKey: 'leads',
    stageLabel: 'New Lead Stage',
    status: 'New Lead',
    badge: 'Fresh Stage',
    icon: Layers,
    reason: 'Initial lead record',
  };
}

export function InteriorReopenLeadModal({
  isOpen,
  onClose,
  customerId,
  leadName,
  leadData,
  users = [],
  onSuccess,
}: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detect previous progress stage
  const detectedStage = useMemo(() => detectPreviousStage(leadData), [leadData]);

  // Target stage selection: 'previous' (auto-restore), 'New Lead', 'follow_up', or specific stage string
  const [mode, setMode] = useState<'previous' | 'new_lead' | 'follow_up' | 'custom'>('previous');
  const [customStatus, setCustomStatus] = useState<string>('Under Site Visit');
  const [reopenNotes, setReopenNotes] = useState('');
  const [followUpType, setFollowUpType] = useState('Phone Call');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assignedSalesExecutive, setAssignedSalesExecutive] = useState('');
  const [error, setError] = useState<string | null>(null);

  const minDateTime = getMinDateTimeLocal();

  useEffect(() => {
    if (isOpen) {
      setMode('previous');
      setReopenNotes('');
      setFollowUpType('Phone Call');
      setScheduledDate('');
      setCustomStatus(detectedStage.status || 'Under Site Visit');
      setAssignedSalesExecutive(
        leadData?.assignedSalesExecutive?._id ||
          leadData?.assignedSalesExecutive?.id ||
          leadData?.assignedSalesExecutive ||
          ''
      );
      setError(null);
    }
  }, [isOpen, leadData, detectedStage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNotes = reopenNotes.trim();
    if (!trimmedNotes) {
      setError('Please provide a note or reason for reopening this lead');
      toast.error('Please provide a reopen note');
      return;
    }

    if (mode === 'follow_up') {
      if (!scheduledDate) {
        setError('Please select a scheduled date & time for the follow-up');
        toast.error('Scheduled date is required for follow-up');
        return;
      }
      if (new Date(scheduledDate).getTime() < Date.now() - 60000) {
        setError('Scheduled date & time must be in the future');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let resolvedStatus = 'New Lead';
      let stageSummary = 'New Lead';

      if (mode === 'previous') {
        resolvedStatus = detectedStage.status;
        stageSummary = `Restored to Previous Stage (${detectedStage.stageLabel})`;
      } else if (mode === 'new_lead') {
        resolvedStatus = 'New Lead';
        stageSummary = 'Restarted as New Lead';
      } else if (mode === 'follow_up') {
        resolvedStatus = 'Contacted';
        stageSummary = 'Scheduled Follow-Up';
      } else if (mode === 'custom') {
        resolvedStatus = customStatus;
        stageSummary = `Moved to ${customStatus}`;
      }

      const updatePayload: Record<string, any> = {
        status: resolvedStatus,
        lostReason: null,
        futureFollowUpDate: mode === 'follow_up' && scheduledDate ? new Date(scheduledDate) : undefined,
        remarks: `Lead Reopened [${stageSummary}]: ${trimmedNotes}`,
      };
      if (assignedSalesExecutive) {
        updatePayload.assignedSalesExecutive = assignedSalesExecutive;
      }

      const activityPayload = mode === 'follow_up'
        ? {
            customer: customerId,
            type: followUpType,
            status: 'Pending',
            scheduledDate: new Date(scheduledDate),
            assignedTo: assignedSalesExecutive || undefined,
            remarks: `Lead reopened from Lost. ${stageSummary} — ${trimmedNotes}`,
          }
        : {
            customer: customerId,
            type: 'Status Change',
            status: 'Completed',
            remarks: `Lead reopened from Lost state. ${stageSummary} — ${trimmedNotes}`,
          };

      await Promise.all([
        interiorCrmService.updateCustomer(customerId, updatePayload),
        interiorCrmService.createActivity(activityPayload),
      ]);

      toast.success(`Lead restored to ${resolvedStatus}! All previous data preserved.`);
      queryClient.invalidateQueries({ queryKey: ['crm-leads-list'] });
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups-all'] });
      queryClient.invalidateQueries({ queryKey: ['crm-pending-activities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-customers'] });
      if (onSuccess) {
        onSuccess({ _id: customerId, ...updatePayload });
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reopen lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const DetectedIcon = detectedStage.icon;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 z-[70] shadow-2xl max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-[hsl(var(--border))] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Reopen Lead</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Restore previously completed work or resume pipeline
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} className="text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auto-detected Previous Stage Banner */}
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3 text-indigo-900 dark:text-indigo-300">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <DetectedIcon size={16} />
              </div>
              <div className="text-xs leading-relaxed flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-[hsl(var(--foreground))] text-sm">
                    {leadName || leadData?.name || 'Lead'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                    Last Stage: {detectedStage.stageLabel}
                  </span>
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                  {detectedStage.reason} ({detectedStage.badge}). All blueprints, BOQ items, measurements & quotes are safely preserved.
                </p>
              </div>
            </div>

            {/* Target Reopen Selection Mode */}
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))] mb-1.5 block">
                How would you like to restore this lead?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Restore to previous stage */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('previous');
                    if (error) setError(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    mode === 'previous'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                    <DetectedIcon size={14} className="text-emerald-600" />
                  </div>
                  <div className="text-xs font-bold">Previous Stage</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate" title={detectedStage.stageLabel}>
                    {detectedStage.stageLabel}
                  </div>
                </button>

                {/* 2. Schedule Follow-up */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('follow_up');
                    if (error) setError(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    mode === 'follow_up'
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <PhoneCall size={14} className="text-indigo-600" />
                  </div>
                  <div className="text-xs font-bold">Follow-Up</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Schedule call / meeting
                  </div>
                </button>

                {/* 3. Restart as New Lead */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('new_lead');
                    if (error) setError(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    mode === 'new_lead'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Layers size={14} className="text-blue-600" />
                  </div>
                  <div className="text-xs font-bold">New Lead</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Restart from stage 1
                  </div>
                </button>
              </div>
            </div>

            {/* Follow-up Fields if 'follow_up' mode */}
            {mode === 'follow_up' && (
              <div className="p-3.5 bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      Follow-up Type
                    </label>
                    <select
                      value={followUpType}
                      onChange={(e) => setFollowUpType(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-medium focus:border-[hsl(var(--ring))] outline-none"
                    >
                      <option value="Phone Call">Phone Call</option>
                      <option value="Meeting">Meeting / Demo</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600" />
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      min={minDateTime}
                      value={scheduledDate}
                      onChange={(e) => {
                        setScheduledDate(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full mt-1.5 px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-medium focus:border-[hsl(var(--ring))] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <User size={13} className="text-indigo-600" />
                    Assign Sales Executive
                  </label>
                  <select
                    value={assignedSalesExecutive}
                    onChange={(e) => setAssignedSalesExecutive(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-medium focus:border-[hsl(var(--ring))] outline-none"
                  >
                    <option value="">-- Leave Unassigned / Keep Current --</option>
                    {users.map((u) => (
                      <option key={u._id || u.id} value={u._id || u.id}>
                        {userLabel(u)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Reopen Reason & Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                  Reopen Notes / Reason *
                </label>
                <span className="text-[10px] font-bold text-rose-500">Required</span>
              </div>
              <textarea
                rows={3}
                value={reopenNotes}
                onChange={(e) => {
                  setReopenNotes(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Explain why the lead is being reopened (e.g., Client requested updated quotation, agreed to restart project, resolved budget)..."
                className={`w-full px-4 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-xs outline-none resize-none transition-all ${
                  error
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-[hsl(var(--border))] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                }`}
              />
              {error && <p className="text-xs text-rose-500 font-semibold mt-1">{error}</p>}
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end gap-2.5 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <RotateCcw size={14} className={isSubmitting ? 'animate-spin' : ''} />
                {isSubmitting
                  ? 'Restoring...'
                  : mode === 'previous'
                  ? `Restore to ${detectedStage.stageLabel}`
                  : 'Reopen Lead'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
