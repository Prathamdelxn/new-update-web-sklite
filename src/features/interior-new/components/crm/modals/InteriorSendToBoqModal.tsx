'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, CheckCircle2, AlertTriangle, ChevronDown, User, Layers } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
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
    const s = f.approvalStatus || f.status || 'draft';
    return s === 'draft' || s === 'pending_internal_approval' || s === 'internally_rejected' || f.clientStatus === 'client_changes_requested';
  });
  const hasPendingDrawings = pendingDrawings.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPendingDrawings) {
      toast.error('Cannot pass to BOQ: Drawing approval is still pending. Please approve all drawings first.');
      return;
    }

    if (!assignedEstimator) {
      toast.error('Please assign an estimator / team member for BOQ creation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updatePayload: any = {
        status: 'Under BOQ Creation',
      };

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      const assignedUserObj = users.find(u => (u._id || u.id || u.clerkUserId) === assignedEstimator);
      const estimatorInfo = assignedUserObj ? `Assigned Estimator: ${userLabel(assignedUserObj)}.` : '';
      const finalRemarks = [remarks, estimatorInfo].filter(Boolean).join(' | ') || 'Lead passed to BOQ phase with approved drawings.';

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: finalRemarks,
        completedDate: new Date()
      });

      toast.success('Lead successfully passed to BOQ Creation!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Failed to send to BOQ');
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
                  Pass to BOQ Creation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hand over approved design drawings to estimation for BOQ preparation
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

          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
            {/* Drawing Status Alert (if any drawing is pending approval) */}
            {hasPendingDrawings && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cannot Pass to BOQ — {pendingDrawings.length} Drawing(s) Pending Approval</span>
                </div>
                <p className="text-[11px] text-amber-800 pl-6 leading-relaxed">
                  Make sure all 2D layouts and 3D models are approved before passing this lead to the BOQ team.
                </p>
              </div>
            )}

            {/* Select Estimator */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-600" />
                Assign Estimator / QS <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={assignedEstimator}
                  onChange={e => setAssignedEstimator(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm font-medium rounded-xl border border-slate-300 bg-white text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 shadow-2xs cursor-pointer transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                  disabled={hasPendingDrawings}
                >
                  <option value="" className="text-slate-400">-- Select Estimator / Team Member --</option>
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
                <span>Handover Remarks / Costing Notes</span>
                <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Specific instructions for estimation..."
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
                Cancel
              </button>
              
              <button 
                type="submit" 
                disabled={isSubmitting || hasPendingDrawings || !assignedEstimator} 
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-sm shadow-teal-600/20 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calculator className="w-4 h-4" />
                {isSubmitting ? 'Passing...' : hasPendingDrawings ? 'Drawings Pending Approval' : 'Pass to BOQ ➔'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
