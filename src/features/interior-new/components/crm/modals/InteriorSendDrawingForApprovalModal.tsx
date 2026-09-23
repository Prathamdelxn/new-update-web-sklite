'use client';

import React, { useState } from 'react';
import {
  X,
  Send,
  User,
  FileText,
  ChevronDown
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

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Team Member';
  const roleName = u.role?.name || u.role || 'Reviewer';
  return `${name} (${roleName})`;
}

export const InteriorSendDrawingForApprovalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customerId,
  drawing,
  onSuccess,
  users = []
}) => {
  const toast = useToast();
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedReviewer('');
    } else if (drawing) {
      setAssignedReviewer(
        drawing.assignedReviewer?._id || drawing.assignedReviewer?.id || drawing.assignedReviewer || ''
      );
    }
  }, [isOpen, drawing]);

  if (!isOpen || !drawing) return null;

  const drawingId = drawing._id || drawing.id;
  const currentVersion = drawing.currentVersion || 1;
  const drawingTitle = drawing.title || drawing.name || 'Drawing';
  const badgeInfo = getFileBadgeInfo(drawing.name || drawingTitle, drawing.category || 'Drawing');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedReviewer) {
      toast.error('Please select a team member to review and approve this drawing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedUserObj = users.find(
        (u) => (u._id || u.id || u.clerkUserId) === assignedReviewer
      );
      const assignedReviewerName = assignedUserObj
        ? assignedUserObj.fullName || `${assignedUserObj.firstName || ''} ${assignedUserObj.lastName || ''}`.trim() || assignedUserObj.name
        : undefined;

      await interiorCrmService.sendDrawingForApproval(customerId, drawingId, {
        assignedReviewer,
        assignedReviewerName,
        versionNumber: currentVersion
      });

      toast.success(`Drawing sent to ${assignedReviewerName || 'team member'} for internal review!`);
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
          {/* Header - Pure Light Theme */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Send for Internal Approval
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign a team member to verify drawing before client publishing
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
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={drawingTitle}>
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
                </div>
              </div>
            </div>

            {/* Select Reviewer / Approver */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Select Approver / Reviewer <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={assignedReviewer}
                  onChange={(e) => setAssignedReviewer(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs cursor-pointer transition"
                >
                  <option value="" className="text-slate-400">-- Choose Team Member / Reviewer --</option>
                  {users.map((u) => {
                    const uId = u._id || u.id || u.clerkUserId;
                    return (
                      <option key={uId} value={uId} className="text-slate-900 font-medium">
                        {userLabel(u)}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !assignedReviewer}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-600/20 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Sending Request...' : 'Send for Approval'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
