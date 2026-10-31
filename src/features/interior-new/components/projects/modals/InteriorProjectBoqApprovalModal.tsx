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
  ShieldAlert,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { parseMaxBudget } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  projectBudget?: number | string;
  boq: any;
  initialAction?: 'approve' | 'reject' | null;
  onSuccess: () => void;
}

export function InteriorProjectBoqApprovalModal({
  isOpen,
  onClose,
  projectId,
  projectName = 'Project',
  projectBudget,
  boq,
  initialAction = null,
  onSuccess,
}: Props) {
  const toast = useToast();
  const { formatExactCurrency } = useCurrency();
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(initialAction);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActionType(initialAction);
      setRejectionReason('');
      if (initialAction === 'reject') {
        setTimeout(() => textareaRef.current?.focus(), 120);
      }
    }
  }, [isOpen, initialAction]);

  if (!isOpen || !boq) return null;

  const versionLabel = boq.versionLabel || `v${boq.version || 1}`;
  const totalAmount = Number(boq.totalAmount || 0);
  const maxBudget = projectBudget ? (parseMaxBudget(String(projectBudget)) ?? 0) : 0;
  const isOverBudget = Boolean(maxBudget > 0 && totalAmount > maxBudget);
  const excessAmount = isOverBudget ? totalAmount - maxBudget : 0;

  const sectionsCount = Array.isArray(boq.sections) && boq.sections.length > 0
    ? boq.sections.length
    : new Set((boq.items || []).map((it: any) => it.category || 'General')).size;
  const itemsCount = boq.items?.length || 0;

  const handleApprove = async () => {
    if (!projectId || !boq) return;
    setIsSubmitting(true);

    try {
      await interiorProjectService.boqApprovalAction(projectId, boq._id, {
        action: 'approve',
      });

      toast.success(`BOQ (${versionLabel}) approved successfully! Baseline project budget locked.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to approve BOQ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!projectId || !boq) return;
    if (!rejectionReason.trim()) {
      toast.error('Please specify the reason for rejection / modifications needed.');
      textareaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await interiorProjectService.boqApprovalAction(projectId, boq._id, {
        action: 'reject',
        reason: rejectionReason.trim(),
      });

      toast.info(`BOQ (${versionLabel}) rejected. Returned to draft status for revision.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to reject BOQ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
              actionType === 'reject'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
              {actionType === 'reject' ? <XCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {actionType === 'reject' ? 'Reject Project BOQ' : 'Verify & Approve BOQ'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {actionType === 'reject'
                  ? `Provide revision feedback for ${versionLabel}`
                  : `Authorize ${versionLabel} for execution and procurement in "${projectName}"`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* BOQ Summary Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  BOQ {versionLabel}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {sectionsCount} {sectionsCount === 1 ? 'Section' : 'Sections'} • {itemsCount} items
                </span>
                {boq.assignedReviewerName && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <UserCheck size={11} /> Reviewer: {boq.assignedReviewerName}
                  </span>
                )}
              </div>
              <span className="text-base font-black text-slate-900">
                {formatExactCurrency(totalAmount)}
              </span>
            </div>

            {/* Budget Banner */}
            {maxBudget > 0 && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  isOverBudget
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                }`}
              >
                {isOverBudget ? (
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 leading-snug">
                  <div className="font-bold">
                    {isOverBudget ? 'Budget Excess Warning' : 'Within Approved Target Budget'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Project Target Budget: <span className="font-semibold">{formatExactCurrency(maxBudget)}</span>
                    {isOverBudget && (
                      <>
                        {' • '}
                        <span className="text-amber-700 font-bold">
                          Exceeds by {formatExactCurrency(excessAmount)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submission notes if provided */}
          {boq.submissionNotes && (
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
              <span className="font-bold flex items-center gap-1 mb-0.5 text-blue-700">
                <MessageSquare size={12} /> Estimator Submission Remarks:
              </span>
              <p className="text-slate-700 leading-relaxed">{boq.submissionNotes}</p>
            </div>
          )}

          {/* Rejection Mode View */}
          {actionType === 'reject' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                Reason for Rejection / Adjustments Required <span className="text-rose-500">*</span>
              </label>
              <textarea
                ref={textareaRef}
                required
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain what needs to be changed (e.g., reduce rate for carpentry, trim false ceiling scope to meet target budget)..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-rose-200 bg-rose-50/20 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 shadow-2xs transition resize-none placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                The BOQ status will be set to Rejected, allowing the estimator to revise quantities/rates and re-submit.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 size={15} /> Confirm Commercial Sign-off
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                Approving this BOQ will set it as the approved cost plan for the project. Site engineers and procurement heads will use these baseline quantities and rates for Purchase Orders (POs) and inventory tracking.
              </p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2.5">
            {actionType === 'reject' ? (
              <button
                type="button"
                onClick={() => setActionType('approve')}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
              >
                ← Switch to Approve
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActionType('reject')}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <XCircle size={14} /> Request Changes
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              {actionType === 'reject' ? (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting || !rejectionReason.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Confirm Rejection
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Approve BOQ ({versionLabel})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
