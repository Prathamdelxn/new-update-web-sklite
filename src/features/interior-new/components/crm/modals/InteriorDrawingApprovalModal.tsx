'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Eye,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  History,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { motion, AnimatePresence } from 'framer-motion';
import { getFileBadgeInfo } from './InteriorUploadDesignModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  drawing: any;
  onSuccess: () => void;
  users?: any[];
}

export const InteriorDrawingApprovalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customerId,
  drawing,
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
      const startInReject = drawing?.initialAction === 'reject';
      setIsRejectMode(startInReject);
      if (startInReject) {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 120);
      }
    }
  }, [isOpen, drawing]);

  if (!isOpen || !drawing) return null;

  const drawingId = drawing._id || drawing.id;
  const currentVersion = drawing.currentVersion || 1;
  const versions = drawing.versions || [];
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const approvalStatus = drawing.approvalStatus || latestVersion?.approvalStatus || 'pending_internal_approval';
  const clientStatus = drawing.clientStatus || latestVersion?.clientStatus;
  const clientFeedback = drawing.clientFeedback || latestVersion?.clientFeedback;
  const pastRejectionReason = drawing.rejectionReason || drawing.internalNotes || latestVersion?.rejectionReason || latestVersion?.internalNotes;
  const assignedReviewerName = drawing.assignedReviewerName || latestVersion?.assignedReviewerName;
  const drawingTitle = drawing.title || drawing.name || 'Drawing';
  const badgeInfo = getFileBadgeInfo(drawing.name || drawingTitle, drawing.category || 'Drawing');

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
      await interiorCrmService.approveDrawing(customerId, drawingId, {
        action,
        versionNumber: currentVersion,
        internalNotes: action === 'reject' ? rejectionReason.trim() : undefined
      });

      if (action === 'approve') {
        toast.success('Drawing approved internally! It is now visible on the client share link.');
      } else {
        toast.info('Drawing rejected with reason. Status updated for revision.');
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
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${
                isRejectMode
                  ? 'bg-rose-50 border-rose-100 text-rose-600'
                  : 'bg-blue-50 border-blue-100 text-blue-600'
              }`}>
                {isRejectMode ? <XCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isRejectMode ? 'Reject Drawing with Reason' : 'Internal Drawing Review & Approval'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRejectMode 
                    ? 'Specify required changes for the designer to upload the next revision'
                    : 'Review drawing quality and approve for client presentation'
                  }
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto bg-white">
            {/* Drawing Summary Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate" title={drawingTitle}>
                      {drawingTitle}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${badgeInfo.color}`}>
                        {badgeInfo.label}
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Version v{currentVersion}
                      </span>
                      {drawing.roomTag && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {drawing.roomTag}
                        </span>
                      )}
                      {assignedReviewerName && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          <UserCheck className="w-3 h-3" />
                          Reviewer: {assignedReviewerName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {drawing.url && (
                    <a
                      href={drawing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View File
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Internal Status:</span>
                <div>
                  {approvalStatus === 'internally_approved' ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved (Live to Client)
                    </span>
                  ) : approvalStatus === 'internally_rejected' ? (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected (Needs Revision)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Pending Internal Approval
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Previous Rejection Reason Alert (If previously rejected) */}
            {!isRejectMode && approvalStatus === 'internally_rejected' && pastRejectionReason && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wide">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Current Rejection Reason & Required Changes:
                </div>
                <p className="text-sm text-rose-950 bg-white p-3 rounded-lg border border-rose-200 shadow-2xs font-medium">
                  {pastRejectionReason}
                </p>
              </div>
            )}

            {/* Client Feedback Alert (If any) */}
            {(clientStatus === 'client_changes_requested' || clientFeedback) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wide">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  Client Feedback / Change Request
                </div>
                <p className="text-sm text-amber-950 bg-white p-3 rounded-lg border border-amber-200 shadow-2xs">
                  {clientFeedback || 'Client requested modifications on the previous version.'}
                </p>
              </div>
            )}

            {/* Version History List */}
            {versions.length > 1 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-600" />
                  Revision History ({versions.length} versions)
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {versions.map((ver: any, index: number) => (
                    <div
                      key={index}
                      className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                        ver.versionNumber === currentVersion
                          ? 'bg-blue-50/70 border-blue-200 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          v{ver.versionNumber || index + 1}
                        </span>
                        <span className="text-slate-600 truncate max-w-[180px]">{ver.name}</span>
                        {ver.approvalStatus === 'internally_approved' && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                            Approved
                          </span>
                        )}
                        {ver.approvalStatus === 'internally_rejected' && (
                          <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-bold">
                            Rejected
                          </span>
                        )}
                      </div>
                      {ver.url && (
                        <a
                          href={ver.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
                        >
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Reason Input (ONLY shown in Rejection Mode) */}
            {isRejectMode && (
              <div className="space-y-2 p-4 bg-rose-50/70 border border-rose-200 rounded-xl">
                <label className="text-xs font-bold text-rose-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Rejection Reason & Required Modifications <span className="text-rose-600">*</span>
                  </span>
                  <span className="text-rose-600 font-bold text-[11px]">
                    (Required to reject)
                  </span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this drawing is rejected so the designer can fix it in the next revision..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-rose-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs resize-none transition"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/70">
            {isRejectMode ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleAction('reject')}
                  disabled={isSubmitting || !rejectionReason.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm shadow-rose-600/20 rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  {isSubmitting && actionType === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRejectMode(true);
                      setTimeout(() => textareaRef.current?.focus(), 100);
                    }}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl shadow-2xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction('approve')}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/20 rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmitting && actionType === 'approve' ? 'Approving...' : 'Approve & Publish to Client'}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
