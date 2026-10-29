'use client';

import React, { useState } from 'react';
import {
  X,
  Send,
  User,
  FileText,
  Clock,
  Layers,
  Box,
  MessageSquare,
  AlertCircle
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
  onSuccess: () => void;
  users?: any[];
}

function userLabel(u: any) {
  const name = u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Team Member';
  const roleName = u.role?.name || u.role || 'Reviewer';
  return `${name} (${roleName})`;
}

export const InteriorProjectSendDrawingForApprovalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projectId,
  drawing,
  onSuccess,
  users = []
}) => {
  const toast = useToast();
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedReviewer('');
      setRemarks('');
    } else if (drawing) {
      setAssignedReviewer(
        drawing.assignedReviewer?._id || drawing.assignedReviewer?.id || drawing.assignedReviewer || ''
      );
      setRemarks(drawing.submissionNotes || '');
    }
  }, [isOpen, drawing]);

  if (!isOpen || !drawing) return null;

  const drawingId = drawing._id || drawing.id || drawing.drawingNumber;
  const currentVersion = drawing.revisions?.length || drawing.currentVersion || 1;
  const drawingTitle = drawing.title || drawing.name || 'Drawing Blueprint';
  const latestUrl = drawing.revisions?.[drawing.revisions.length - 1]?.url || drawing.fileUrl || drawing.url || '';
  const badgeInfo = getFileTypeBadge(drawingTitle, latestUrl, drawing.drawingType || '2D');
  const BadgeIcon = badgeInfo.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedReviewer) {
      toast.error('Please select a project team member / manager to review and approve this drawing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedUserObj = users.find(
        (u) => (u._id || u.id || u.clerkUserId) === assignedReviewer
      );
      const assignedReviewerName = assignedUserObj ? userLabel(assignedUserObj) : undefined;

      await interiorProjectService.updateDrawing(projectId, {
        drawingId: String(drawing._id || drawing.id || drawingId),
        status: 'under_review',
        assignedReviewer,
        assignedReviewerName,
        submissionNotes: remarks.trim() || undefined,
        submittedAt: new Date().toISOString()
      });

      toast.success(`Drawing sent to ${assignedReviewerName || 'reviewer'} for approval!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to send drawing for approval');
    } finally {
      setIsSubmitting(false);
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
          className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Send Drawing for Approval
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign a project lead or manager to review specifications & verify layout
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
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
                  {drawing.discipline && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      {drawing.discipline}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Select Reviewer / Approver */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Select Approver / Reviewer <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={assignedReviewer}
                  onChange={(e) => setAssignedReviewer(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer transition"
                >
                  <option value="" className="text-slate-400">-- Choose Project Lead / Manager --</option>
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
              <p className="text-[11px] text-slate-500">
                The reviewer will be notified to review the blueprint, place inspection pins, and approve or request changes.
              </p>
            </div>

            {/* Submission Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Submission Notes / Scope Covered (Optional)
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="E.g., Updated electrical conduit layout per client discussion, revised structural beam cutouts..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs transition resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !assignedReviewer}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send for Approval
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
