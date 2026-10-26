'use client';

// =============================================================================
// Sky-Lite Web — Interior CRM Drawing Approval Confirmation Modal
// Confirmation Dialog with Loading State for Internal Drawing Approval
// =============================================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Loader2,
  Layers,
  AlertCircle
} from 'lucide-react';
import { getFileBadgeInfo } from './InteriorUploadDesignModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  drawing: any;
  isSubmitting?: boolean;
  leadName?: string;
}

export const InteriorDrawingConfirmApproveModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  drawing,
  isSubmitting = false,
  leadName,
}) => {
  if (!isOpen || !drawing) return null;

  const drawingTitle = drawing.title || drawing.name || 'Drawing File';
  const versionNum = drawing.currentVersion || (drawing.versions && drawing.versions.length) || 1;
  const badgeInfo = getFileBadgeInfo(drawing.name || drawingTitle, drawing.category || 'Drawing');

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  Approve Drawing?
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Internal verification & publishing
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-40"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 bg-white">
            {/* Drawing preview chip */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 truncate" title={drawingTitle}>
                  {drawingTitle}
                </h4>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase tracking-wider ${badgeInfo.color}`}>
                    {badgeInfo.label}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Version v{versionNum}
                  </span>
                  {drawing.roomTag && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {drawing.roomTag}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Explanatory banner */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>What happens next:</span>
              </div>
              <p className="text-[11px] text-emerald-950/80 leading-relaxed pl-5">
                This drawing will be marked as <strong className="text-emerald-900">Internally Approved</strong> and will become visible to {leadName ? <strong>{leadName}</strong> : 'the client'} on the public share link portal.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/25 rounded-xl transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Approving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Approval</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
