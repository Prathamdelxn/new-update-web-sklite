'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calculator,
  FileSpreadsheet,
  UserCheck,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { cn, parseMaxBudget } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  budgetRange?: string;
  existingBoqs: any[];
  boqIndex?: number | null;
  initialAction?: 'approve' | 'reject' | null;
  onSuccess: () => void;
}

export function InteriorBoqApprovalModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  budgetRange,
  existingBoqs = [],
  boqIndex = null,
  initialAction = null,
  onSuccess,
}: Props) {
  const toast = useToast();
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(initialAction);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActionType(initialAction);
      setRejectionReason('');
    }
  }, [isOpen, initialAction]);

  if (!isOpen) return null;

  const targetIdx =
    boqIndex !== null && boqIndex !== undefined && boqIndex >= 0 && boqIndex < existingBoqs.length
      ? boqIndex
      : existingBoqs.length - 1;

  const targetBoq = existingBoqs[targetIdx];
  const versionNumber = targetBoq?.version || targetIdx + 1;

  const maxBudget = parseMaxBudget(budgetRange);
  const totalBoqAmount = targetBoq?.totalAmount || 0;
  const isOverBudget = Boolean(maxBudget && maxBudget > 0 && totalBoqAmount > maxBudget);
  const excessAmount = isOverBudget ? totalBoqAmount - (maxBudget || 0) : 0;

  const handleApprove = async () => {
    if (!customerId || !targetBoq) return;
    setIsSubmitting(true);

    try {
      const updatedBoqs = [...existingBoqs];
      updatedBoqs[targetIdx] = {
        ...targetBoq,
        status: 'approved',
        approvedAt: new Date(),
        rejectionReason: undefined,
        rejectedAt: undefined,
      };

      await interiorCrmService.updateCustomer(customerId, {
        boqs: updatedBoqs,
      });

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: `BOQ Version ${versionNumber} (₹${totalBoqAmount.toLocaleString('en-IN')}) was approved internally.`,
        completedDate: new Date(),
      });

      toast.success(`BOQ Version ${versionNumber} approved successfully! Quotations phase unlocked.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve BOQ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please specify the rejection reason and required changes.');
      return;
    }
    if (!customerId || !targetBoq) return;
    setIsSubmitting(true);

    try {
      const updatedBoqs = [...existingBoqs];
      updatedBoqs[targetIdx] = {
        ...targetBoq,
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        rejectedAt: new Date(),
      };

      await interiorCrmService.updateCustomer(customerId, {
        boqs: updatedBoqs,
      });

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: `BOQ Version ${versionNumber} rejected with reason: "${rejectionReason.trim()}". Revisions requested.`,
        completedDate: new Date(),
      });

      toast.info(`BOQ Version ${versionNumber} rejected. Reason logged for revisions.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject BOQ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApproveMode = actionType === 'approve';
  const isRejectMode = actionType === 'reject';
  const showToggleTabs = !initialAction;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden z-10"
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-4 border-b transition-colors",
          isApproveMode 
            ? "border-emerald-500/20 bg-emerald-500/[0.04]" 
            : isRejectMode 
            ? "border-rose-500/20 bg-rose-500/[0.04]" 
            : "border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center font-bold border shrink-0",
              isApproveMode 
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600" 
                : isRejectMode 
                ? "bg-rose-500/15 border-rose-500/30 text-rose-600" 
                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600"
            )}>
              {isApproveMode ? (
                <CheckCircle2 size={18} />
              ) : isRejectMode ? (
                <XCircle size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[hsl(var(--foreground))]">
                {isApproveMode 
                  ? 'Confirm BOQ Approval' 
                  : isRejectMode 
                  ? 'Reject BOQ & Request Changes' 
                  : 'Review & Internal BOQ Approval'}
              </h3>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {customerName ? `Lead: ${customerName}` : 'Estimate Review'} • Version {versionNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Top Mode Confirmation Banner */}
          {isApproveMode && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-2.5 text-xs text-emerald-950 shadow-xs">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-600" />
              <div className="leading-relaxed font-medium text-emerald-950">
                You are approving <strong className="font-extrabold text-slate-950">BOQ Version {versionNumber}</strong> valued at{' '}
                <strong className="font-black text-emerald-700">₹{totalBoqAmount.toLocaleString('en-IN')}</strong>. 
                Once confirmed, this estimation is approved and unlocks the <strong className="font-bold text-slate-950">Quotation phase</strong>.
              </div>
            </div>
          )}

          {isRejectMode && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-950 shadow-xs">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed font-medium text-rose-950">
                You are rejecting <strong className="font-extrabold text-slate-950">BOQ Version {versionNumber}</strong>. Please provide specific feedback and reasons below so the estimator can revise the line items.
              </div>
            </div>
          )}

          {/* Optional Toggle Tabs if opened without preselected action */}
          {showToggleTabs && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setActionType('approve')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  actionType === 'approve'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 shadow-xs'
                    : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-emerald-500/40 hover:text-emerald-600'
                )}
              >
                <CheckCircle2 size={16} className={actionType === 'approve' ? 'text-emerald-600' : ''} />
                <span>Approve BOQ</span>
              </button>
              <button
                type="button"
                onClick={() => setActionType('reject')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  actionType === 'reject'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-700 shadow-xs'
                    : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-rose-500/40 hover:text-rose-600'
                )}
              >
                <XCircle size={16} className={actionType === 'reject' ? 'text-rose-600' : ''} />
                <span>Request Changes</span>
              </button>
            </div>
          )}

          {/* BOQ Summary Card */}
          {targetBoq && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <FileSpreadsheet size={13} className="text-indigo-600" /> Estimation
                </span>
                <span className="font-bold text-slate-900">Version {versionNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <Calculator size={13} className="text-emerald-600" /> Total Value
                </span>
                <span className="font-black text-emerald-700 text-sm">
                  ₹{totalBoqAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Line Items Count</span>
                <span className="font-bold text-slate-900">
                  {targetBoq.items?.length || 0} items
                </span>
              </div>
              {targetBoq.assignedReviewerName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Submitted To</span>
                  <span className="font-bold text-indigo-700">
                    {targetBoq.assignedReviewerName}
                  </span>
                </div>
              )}
              {targetBoq.submissionNotes && (
                <div className="pt-2 border-t border-slate-200 text-[11px]">
                  <span className="font-bold text-slate-700">Estimator Focus / Handover Note:</span>
                  <p className="text-slate-950 italic mt-0.5 whitespace-pre-wrap font-semibold">
                    "{targetBoq.submissionNotes}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Budget Warning if Over Budget */}
          {isOverBudget && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <div className="leading-relaxed">
                <strong className="font-bold text-amber-900">Over Target Budget:</strong> BOQ total of ₹{totalBoqAmount.toLocaleString('en-IN')}{' '}
                exceeds client's target budget of ₹{maxBudget?.toLocaleString('en-IN')} by{' '}
                <strong className="font-black text-amber-950">₹{excessAmount.toLocaleString('en-IN')}</strong>.
              </div>
            </div>
          )}

          {/* Reject Reason Field (Mandatory) */}
          {isRejectMode && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                <AlertCircle size={13} /> Rejection Reason / Required Revisions <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Rate for ceiling panelling is incorrect; please update hardware fittings to Hafele."
                className="w-full px-3 py-2 rounded-xl border border-rose-500/40 bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all resize-none"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3.5 bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all cursor-pointer"
          >
            Cancel
          </button>
          
          {isApproveMode && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                'Approving...'
              ) : (
                <>
                  <CheckCircle2 size={14} /> Confirm Approval
                </>
              )}
            </button>
          )}

          {isRejectMode && (
            <button
              type="button"
              onClick={handleReject}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                'Rejecting...'
              ) : (
                <>
                  <XCircle size={14} /> Confirm Rejection
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
