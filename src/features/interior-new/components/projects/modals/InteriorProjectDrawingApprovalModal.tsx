'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  History,
  UserCheck,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorProjectService } from '@/services/interiorProject.service';
import { motion, AnimatePresence } from 'framer-motion';
import { getFileTypeBadge } from '../InteriorDrawingsView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  drawing: any;
  initialAction?: 'approve' | 'reject' | null;
  onSuccess: () => void;
}

export const InteriorProjectDrawingApprovalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projectId,
  drawing,
  initialAction = null,
  onSuccess
}) => {
  const toast = useToast();
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setRejectionReason('');
      setActionType(null);
      setIsRejectMode(false);
    } else {
      const startInReject = initialAction === 'reject' || drawing?.initialAction === 'reject';
      setIsRejectMode(startInReject);
      if (startInReject) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 120);
      }
    }
  }, [isOpen, initialAction, drawing]);

  if (!isOpen || !drawing) return null;

  const drawingId = drawing._id || drawing.id || drawing.drawingNumber;
  const currentVersion = drawing.revisions?.length || drawing.currentVersion || 1;
  const drawingTitle = drawing.title || drawing.name || 'Drawing Blueprint';
  const latestUrl = drawing.revisions?.[drawing.revisions.length - 1]?.url || drawing.fileUrl || drawing.url || '';
  const badgeInfo = getFileTypeBadge(drawingTitle, latestUrl, drawing.drawingType || '2D');
  const BadgeIcon = badgeInfo.icon;

  const pastRejectionReason = drawing.rejectionReason || drawing.submissionNotes;
  const assignedReviewerName = drawing.assignedReviewerName;

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject') {
      if (!rejectionReason.trim()) {
        toast.error('Please provide a rejection reason explaining the required changes for the designer.');
        textareaRef.current?.focus();
        return;
      }
    }

    setIsSubmitting(true);
    setActionType(action);
    try {
      if (action === 'approve') {
        await interiorProjectService.updateDrawing(projectId, {
          drawingId: String(drawing._id || drawing.id || drawingId),
          status: 'approved',
          approvedAt: new Date().toISOString(),
          rejectionReason: undefined,
        });
        toast.success(`Drawing "${drawingTitle}" approved successfully!`);
      } else {
        await interiorProjectService.updateDrawing(projectId, {
          drawingId: String(drawing._id || drawing.id || drawingId),
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
          rejectedAt: new Date().toISOString(),
        });
        toast.info(`Drawing marked as rejected with change request notes.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update approval status');
    } finally {
      setIsSubmitting(false);
      setActionType(null);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
                isRejectMode
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}>
                {isRejectMode ? <XCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRejectMode ? 'Request Changes / Reject Drawing' : 'Verify & Approve Drawing'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRejectMode
                    ? 'Document specific revision requests for the design team'
                    : 'Formal sign-off to authorize blueprint for site execution'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 bg-white">
            {/* Drawing Preview Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
                <BadgeIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={drawingTitle}>
                  {drawingTitle}
                </h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${badgeInfo.color}`}>
                    {badgeInfo.label}
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Version v{currentVersion}
                  </span>
                  {drawing.drawingNumber && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      #{drawing.drawingNumber}
                    </span>
                  )}
                  {assignedReviewerName && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <UserCheck size={11} /> Reviewer: {assignedReviewerName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Submission Notes if available */}
            {drawing.submissionNotes && (
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
                <span className="font-bold flex items-center gap-1 mb-0.5 text-blue-700">
                  <MessageSquare size={12} /> Submission Notes:
                </span>
                <p className="text-slate-700 leading-relaxed">{drawing.submissionNotes}</p>
              </div>
            )}

            {/* Past rejection if exists */}
            {pastRejectionReason && drawing.status === 'rejected' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-900">
                <span className="font-bold flex items-center gap-1 mb-0.5 text-rose-700">
                  <AlertCircle size={12} /> Previous Rejection Reason:
                </span>
                <p className="text-slate-700 leading-relaxed">{pastRejectionReason}</p>
              </div>
            )}

            {/* Action-Specific Content */}
            {isRejectMode ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                  Reason for Rejection / Changes Required <span className="text-rose-500">*</span>
                </label>
                <textarea
                  ref={textareaRef}
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Specify what needs correction (e.g., HVAC duct clash on grid B-4, missing elevation heights, inaccurate wall thickness)..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-rose-200 bg-rose-50/20 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 shadow-2xs transition resize-none placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-500">
                  This note will be saved in the drawing audit history and shown to the designer to guide version revision.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 size={15} /> Confirm Architectural Approval
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  By approving this drawing version (v{currentVersion}), you confirm that dimensions, structural allowances, and working specifications comply with project requirements and are authorized for site execution.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2.5">
              {isRejectMode ? (
                <button
                  type="button"
                  onClick={() => setIsRejectMode(false)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  ← Back to Approve Options
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRejectMode(true)}
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

                {isRejectMode ? (
                  <button
                    type="button"
                    onClick={() => handleAction('reject')}
                    disabled={isSubmitting || !rejectionReason.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {isSubmitting && actionType === 'reject' ? (
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
                    onClick={() => handleAction('approve')}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {isSubmitting && actionType === 'approve' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Drawing (v{currentVersion})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
