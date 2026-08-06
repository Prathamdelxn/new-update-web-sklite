import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, PenTool } from 'lucide-react';
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

export function SendToRequirementsModal({ isOpen, onClose, customerId, onSuccess, users = [] }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [designerAssigned, setDesignerAssigned] = useState('');
  const [remarks, setRemarks] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Update Customer Status & Assignment
      const updatePayload: any = {
        status: 'Requirements Gathering', 
      };
      
      if (designerAssigned) {
        updatePayload.designerAssigned = designerAssigned; // Assuming designerAssigned field is used for design phase
        // Alternatively, use assignedSalesExecutive depending on organization logic
        updatePayload.assignedSalesExecutive = designerAssigned; 
      }

      await api.patch(`/crm/customers/${customerId}`, updatePayload);

      // 2. Log activity
      await interiorApiClient.post('/crm/activities', {
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: remarks || 'Lead passed to Requirements & Design phase.',
        completedDate: new Date()
      });

      toast.success('Successfully sent to Requirements & Design!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Failed to send to requirements');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 z-[70]">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <PenTool className="text-emerald-600" /> Pass to Requirements
            </h2>
            <p className="text-sm text-slate-500 mt-1">Assign a designer to capture requirements.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Assign Designer</label>
            <select 
              value={designerAssigned}
              onChange={e => setDesignerAssigned(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              required
            >
              <option value="">-- Select Designer --</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role?.name || 'User'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Handover Notes</label>
            <textarea 
              rows={4}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Any details the designer should know before meeting the client..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-500/30">
              {isSubmitting ? 'Passing...' : 'Pass to Requirements ➔'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
