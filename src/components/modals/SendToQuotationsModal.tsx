import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, User, MessageSquare, AlertCircle } from 'lucide-react';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  users?: any[];
}

export function SendToQuotationsModal({ isOpen, onClose, customerId, onSuccess, users = [] }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedSalesExecutive, setAssignedSalesExecutive] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<{ member?: string; remarks?: string }>({});

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedSalesExecutive('');
      setRemarks('');
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { member?: string; remarks?: string } = {};
    if (!assignedSalesExecutive) {
      newErrors.member = 'Please select a member to assign.';
    }
    if (!remarks.trim()) {
      newErrors.remarks = 'Handover notes are required before passing to quotations.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill in all required fields.');
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // Update Customer Status & Assignment
      const updatePayload: any = {
        status: 'Quotation Pending',
        assignedSalesExecutive: assignedSalesExecutive,
      };

      await api.patch(`/crm/customers/${customerId}`, updatePayload);

      const assignedUserObj = users.find(u => (u._id || u.id) === assignedSalesExecutive);
      const assignedName = assignedUserObj ? `Assigned Member: ${assignedUserObj.name || assignedUserObj.fullName}.` : '';
      const finalRemarks = [remarks.trim(), assignedName].filter(Boolean).join(' | ');

      // Log activity
      await interiorApiClient.post('/crm/activities', {
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: finalRemarks,
        completedDate: new Date()
      });

      toast.success('Successfully sent to Quotations!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Failed to send to quotations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 z-[70]">
        
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Pass to Quotations
              </h2>
              <p className="text-xs text-slate-500">Assign a member and provide handover notes.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <User size={13} className="text-indigo-500" />
              <span>Assign Member</span>
              <span className="text-rose-500 font-black">*</span>
            </label>
            <select 
              value={assignedSalesExecutive}
              onChange={e => {
                setAssignedSalesExecutive(e.target.value);
                if (errors.member) setErrors(prev => ({ ...prev, member: undefined }));
              }}
              className={`w-full px-4 py-3 rounded-xl border text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all ${
                errors.member ? 'border-rose-500' : 'border-slate-200'
              }`}
              required
            >
              <option value="">-- Select Member (Required) --</option>
              {users.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>{u.name || u.fullName} ({u.role?.name || u.role || 'User'})</option>
              ))}
            </select>
            {errors.member && (
              <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {errors.member}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <MessageSquare size={13} className="text-indigo-500" />
              <span>Handover Notes & Pricing Assumptions</span>
              <span className="text-rose-500 font-black">*</span>
            </label>
            <textarea 
              rows={4}
              required
              value={remarks}
              onChange={e => {
                setRemarks(e.target.value);
                if (errors.remarks) setErrors(prev => ({ ...prev, remarks: undefined }));
              }}
              placeholder="Enter client payment terms, target discount constraints, milestone breakdown requirements, or specific notes for the quotation..."
              className={`w-full px-4 py-3 rounded-xl border text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400 ${
                errors.remarks ? 'border-rose-500' : 'border-slate-200'
              }`}
            />
            {errors.remarks && (
              <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {errors.remarks}
              </p>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
              {isSubmitting ? 'Passing...' : 'Pass to Quotations ➔'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

