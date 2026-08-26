'use client';

// Port of src/components/modals/SendToQuotationsModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  users?: any[];
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'User';
  return `${name} (${u.role?.name || u.role || 'User'})`;
}

export function InteriorSendToQuotationsModal({ isOpen, onClose, customerId, onSuccess, users = [] }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedSalesExecutive, setAssignedSalesExecutive] = useState('');
  const [remarks, setRemarks] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedSalesExecutive('');
      setRemarks('');
    }
  }, [isOpen]);


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatePayload: any = {
        status: 'Under Quotation',
      };

      if (assignedSalesExecutive) {
        updatePayload.assignedSalesExecutive = assignedSalesExecutive;
      }

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: remarks || 'Lead passed to Quotations phase.',
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 z-[70]">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2">
              <FileText className="text-indigo-600" /> Pass to Quotations
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Assign a member to create a quotation.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl"><X size={20} className="text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Assign Member</label>
            <select
              value={assignedSalesExecutive}
              onChange={e => setAssignedSalesExecutive(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              required
            >
              <option value="">-- Select Member --</option>
              {users.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>{userLabel(u)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Handover Notes</label>
            <textarea
              rows={4}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Any details the team should know before creating the quotation..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
              {isSubmitting ? 'Passing...' : 'Pass to Quotations ➔'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
