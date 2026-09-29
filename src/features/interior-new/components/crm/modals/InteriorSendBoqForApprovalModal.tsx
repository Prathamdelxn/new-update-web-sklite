'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, MessageSquare, AlertCircle, FileSpreadsheet, Calculator } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  existingBoqs: any[];
  boqIndex?: number | null;
  users?: any[];
  onSuccess: () => void;
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'User';
  const role = u.role?.name || u.role || 'Team Member';
  return `${name} (${role})`;
}

export function InteriorSendBoqForApprovalModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  existingBoqs = [],
  boqIndex = null,
  users = [],
  onSuccess,
}: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<{ reviewer?: string }>({});

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedReviewer('');
      setRemarks('');
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetIdx =
    boqIndex !== null && boqIndex !== undefined && boqIndex >= 0 && boqIndex < existingBoqs.length
      ? boqIndex
      : existingBoqs.length - 1;

  const targetBoq = existingBoqs[targetIdx];
  const versionNumber = targetBoq?.version || targetIdx + 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignedReviewer) {
      setErrors({ reviewer: 'Please select a reviewer / manager to send for approval.' });
      toast.error('Please select an approver.');
      return;
    }

    if (!targetBoq) {
      toast.error('Target BOQ not found.');
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const reviewerObj = users.find((u) => (u._id || u.id) === assignedReviewer);
      const reviewerName = reviewerObj ? userLabel(reviewerObj) : 'Manager';

      const updatedBoqs = [...existingBoqs];
      updatedBoqs[targetIdx] = {
        ...targetBoq,
        status: 'pending_approval',
        assignedReviewer: assignedReviewer,
        assignedReviewerName: reviewerName,
        submittedAt: new Date(),
        submissionNotes: remarks.trim() || undefined,
      };

      await interiorCrmService.updateCustomer(customerId, {
        boqs: updatedBoqs,
      });

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: `BOQ Version ${versionNumber} (₹${(targetBoq.totalAmount || 0).toLocaleString(
          'en-IN'
        )}) submitted for internal review to ${reviewerName}.${remarks.trim() ? ` Notes: "${remarks.trim()}"` : ''}`,
        completedDate: new Date(),
      });

      toast.success(`BOQ Version ${versionNumber} submitted for approval to ${reviewerName}!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit BOQ for approval.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md bg-[hsl(var(--card))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))] bg-indigo-500/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center font-bold">
              <Send size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[hsl(var(--foreground))]">
                Send BOQ for Internal Approval
              </h3>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {customerName ? `Lead: ${customerName}` : 'Review Request'}
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

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {targetBoq && (
            <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5">
                  <FileSpreadsheet size={13} className="text-indigo-500" /> BOQ Target
                </span>
                <span className="font-bold text-[hsl(var(--foreground))]">Version {versionNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5">
                  <Calculator size={13} className="text-emerald-500" /> Total Valuation
                </span>
                <span className="font-extrabold text-emerald-600">
                  ₹{(targetBoq.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[hsl(var(--muted-foreground))] font-medium">Line Items Count</span>
                <span className="font-bold text-[hsl(var(--foreground))]">
                  {targetBoq.items?.length || 0} items
                </span>
              </div>
            </div>
          )}

          {/* Reviewer Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <User size={13} className="text-indigo-500" /> Assign Reviewer / Approver{' '}
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={assignedReviewer}
              onChange={(e) => {
                setAssignedReviewer(e.target.value);
                if (errors.reviewer) setErrors({});
              }}
              className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="">-- Select Reviewer / Manager --</option>
              {users.map((u) => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
            {errors.reviewer && (
              <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle size={11} /> {errors.reviewer}
              </p>
            )}
          </div>

          {/* Submission Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
              <MessageSquare size={13} className="text-indigo-500" /> Handover Notes / Review Focus (Optional)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Please check custom veneer rates and kitchen hardware quantities..."
              className="w-full px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send size={13} /> Send for Approval
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
