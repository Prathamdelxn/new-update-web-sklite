'use client';
import { tr } from '@/i18n';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, CheckCircle2, AlertTriangle, ChevronDown, User, Layers } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess?: (updatedData?: any) => void;
  users?: any[];
  lead?: any;
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Team Member';
  const roleName = u.role?.name || u.role || 'Estimator';
  return `${name} (${roleName})`;
}

export function InteriorSendToBoqModal({ isOpen, onClose, customerId, onSuccess, users = [], lead }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedEstimator, setAssignedEstimator] = useState('');
  const [remarks, setRemarks] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedEstimator('');
      setRemarks('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const designFiles = lead?.designFiles || [];
  const pendingDrawings = designFiles.filter((f: any) => {
    const latestVersion = Array.isArray(f.versions) && f.versions.length > 0 
      ? f.versions[f.versions.length - 1] 
      : null;
    const rawStatus = f.status || f.approvalStatus || latestVersion?.approvalStatus || 'draft';
    const s = String(rawStatus).toLowerCase().trim();
    const isApproved = s === 'internally_approved' || s === 'client_approved' || s === 'approved';
    const isClientRejected = f.clientStatus === 'client_changes_requested' || latestVersion?.clientStatus === 'client_changes_requested';
    return !isApproved || isClientRejected;
  });
  const hasPendingDrawings = designFiles.length === 0 || pendingDrawings.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (designFiles.length === 0) {
      toast.error(tr("Cannot pass to BOQ: No drawings found. Please upload and approve drawings first."));
      return;
    }

    if (pendingDrawings.length > 0) {
      toast.error(tr("Cannot pass to BOQ: {{pendingDrawingsCount}} drawing(s) are still drafted/pending approval. Please approve all drawings first.", { pendingDrawingsCount: pendingDrawings.length }));
      return;
    }

    if (!assignedEstimator) {
      toast.error(tr("Please assign an estimator / team member for BOQ creation."));
      return;
    }

    if (remarks.trim().length > 500) {
      toast.error(tr("Handover remarks cannot exceed 500 characters."));
      return;
    }

    setIsSubmitting(true);

    try {
      const updatePayload: any = {
        status: 'Under BOQ Creation',
      };

      const assignedUserObj = users.find(u => (u._id || u.id || u.clerkUserId) === assignedEstimator);
      const estimatorInfo = assignedUserObj ? `Assigned Estimator: ${userLabel(assignedUserObj)}.` : '';
      const finalRemarks = [remarks, estimatorInfo].filter(Boolean).join(' | ') || 'Lead passed to BOQ phase with approved drawings.';

      await Promise.all([
        interiorCrmService.updateCustomer(customerId, updatePayload),
        interiorCrmService.createActivity({
          customer: customerId,
          type: 'Status Change',
          status: 'Completed',
          remarks: finalRemarks,
          completedDate: new Date()
        }),
      ]);

      toast.success(tr("Lead successfully passed to BOQ Creation!"));
      if (onSuccess) {
        onSuccess({ _id: customerId, ...updatePayload });
      }
      onClose();
    } catch (error: any) {
      toast.error(tr("Failed to send to BOQ"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
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
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-2xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {tr("Pass to BOQ Creation")}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tr("Hand over approved design drawings to estimation for BOQ preparation")}
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
              title={tr("Close modal")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
            {/* Drawing Status Alerts */}
            {designFiles.length === 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{tr("Cannot Pass to BOQ — No Drawings Uploaded")}</span>
                </div>
                <p className="text-[0.6875rem] text-amber-800 ps-6 leading-relaxed">
                  {tr("Please upload and approve drawings first before passing this lead to the BOQ team.")}
                </p>
              </div>
            ) : pendingDrawings.length > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{tr("Cannot Pass to BOQ — ")}{pendingDrawings.length}{tr(" of ")}{designFiles.length}{tr(" Drawing(s) Not Approved")}</span>
                </div>
                <p className="text-[0.6875rem] text-amber-800 ps-6 leading-relaxed">
                  {tr("All drafted 2D layouts and 3D models must be internally approved before passing this lead to estimation.")}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{tr("All ")}{designFiles.length}{tr(" drawing(s) are approved and ready for BOQ estimation.")}</span>
              </div>
            )}

            {/* Select Estimator */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                {tr("Assign Estimator / QS ")}<span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={assignedEstimator}
                  onChange={e => setAssignedEstimator(e.target.value)}
                  className="w-full ps-3.5 pe-10 py-2.5 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-2xs cursor-pointer transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                  disabled={hasPendingDrawings}
                >
                  <option value="" className="text-slate-400">{tr("-- Select Estimator / Team Member --")}</option>
                  {users.map(u => {
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

            {/* Handover Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{tr("Handover Remarks / Costing Notes")}</span>
                <span className="text-slate-400 font-normal text-[0.6875rem] font-mono">
                  {remarks.length}/500
                </span>
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={tr("Specific instructions for estimation...")}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-2xs resize-none transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={hasPendingDrawings}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition"
              >
                {tr("Cancel")}
              </button>
              
              <button 
                type="submit" 
                disabled={isSubmitting || hasPendingDrawings || !assignedEstimator} 
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-sm shadow-teal-600/20 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calculator className="w-4 h-4" />
                {isSubmitting ? tr("Passing...") : hasPendingDrawings ? tr("Drawings Pending Approval") : tr("Pass to BOQ ➔")}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
