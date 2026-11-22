'use client';
import { tr } from '@/i18n';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, MessageSquare, AlertCircle, FileSpreadsheet, Calculator, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
  users?: any[];
  onSuccess: () => void;
}

function userLabel(u: any) {
  const name = u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Team Member';
  const role = u.role?.name || u.role || 'Reviewer';
  return `${name} (${role})`;
}

export function InteriorProjectSendBoqForApprovalModal({
  isOpen,
  onClose,
  projectId,
  projectName = 'Project',
  projectBudget,
  boq,
  users = [],
  onSuccess,
}: Props) {
  const { formatExactCurrency } = useCurrency();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedReviewer('');
      setRemarks('');
      setError(null);
    } else if (boq) {
      setAssignedReviewer(boq.assignedReviewer?._id || boq.assignedReviewer?.id || boq.assignedReviewer || '');
      setRemarks(boq.submissionNotes || '');
    }
  }, [isOpen, boq]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignedReviewer) {
      setError(tr("Please select an approver/manager from the team."));
      toast.error(tr("Please select an approver."));
      return;
    }

    if (remarks.trim().length > 500) {
      setError(tr("Submission remarks cannot exceed 500 characters."));
      toast.error(tr("Submission remarks cannot exceed 500 characters."));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const reviewerObj = users.find((u) => (u._id || u.id || u.clerkUserId) === assignedReviewer);
      const reviewerName = reviewerObj ? userLabel(reviewerObj) : 'Project Manager';

      // Submit approval action and persist reviewer metadata
      try {
        await interiorProjectService.boqApprovalAction(projectId, boq._id, {
          action: 'submit',
          assignedReviewer,
          assignedReviewerName: reviewerName,
          submissionNotes: remarks.trim() || undefined,
        });
      } catch (actionErr) {
        // Fallback to updateBoq if dedicated action route expects standard update payload
        await interiorProjectService.updateBoq(projectId, boq._id, {
          status: 'pending_approval',
          assignedReviewer,
          assignedReviewerName: reviewerName,
          submissionNotes: remarks.trim() || undefined,
        });
      }

      toast.success(tr("BOQ ({{versionLabel}}) submitted for approval to {{reviewerName}}!", { versionLabel: versionLabel, reviewerName: reviewerName }));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || tr("Failed to submit BOQ for approval."));
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
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {tr("Submit BOQ for Approval")}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {tr("Request internal sign-off for ")}{tr(versionLabel)}{tr(" of project \"")}{tr(projectName)}&quot;
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* BOQ Overview Summary Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  {tr("BOQ ")}{tr(versionLabel)}
                </span>
                <span className="px-2 py-0.5 rounded text-[0.625rem] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {tr(sectionsCount)} {sectionsCount === 1 ? tr("Section") : tr("Sections")} • {tr(itemsCount)}{tr(" items")}
                </span>
              </div>
              <span className="text-sm font-black text-slate-900">
                {formatExactCurrency(totalAmount)}
              </span>
            </div>

            {/* Budget Comparison Banner */}
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
                    {isOverBudget ? tr("Budget Excess Notice") : tr("Within Budget Target")}
                  </div>
                  <div className="text-[0.6875rem] text-slate-600">
                    {tr("Project Target Budget: ")}<span className="font-semibold">{formatExactCurrency(maxBudget)}</span>
                    {isOverBudget && (
                      <>
                        {' • '}
                        <span className="text-amber-700 font-bold">
                          {tr("Exceeds by ")}{formatExactCurrency(excessAmount)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Select Approver */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              {tr("Select Approver / Manager ")}<span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={assignedReviewer}
                onChange={(e) => setAssignedReviewer(e.target.value)}
                className="w-full ps-3.5 pe-10 py-2.5 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer transition"
              >
                <option value="" className="text-slate-400">{tr("-- Choose Project Manager / Approver --")}</option>
                {users.map((u) => {
                  const uId = u._id || u.id || u.clerkUserId;
                  return (
                    <option key={uId} value={uId} className="text-slate-900 font-medium">
                      {userLabel(u)}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
            {error && <p className="text-[0.6875rem] text-rose-600 font-medium">{tr(error)}</p>}
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                {tr("Submission Remarks (Optional)")}
              </label>
              <span className="text-[0.625rem] text-slate-400 font-mono">
                {remarks.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={tr("Highlight rate adjustments, brand selections, or major scope inclusions...")}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs transition resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              {tr("Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !assignedReviewer}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Calculator className="w-4 h-4 animate-spin" />
                  {tr("Submitting...")}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {tr("Submit for Approval")}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
