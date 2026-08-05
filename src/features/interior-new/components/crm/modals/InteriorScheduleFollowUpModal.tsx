'use client';

// Port of src/components/modals/ScheduleFollowUpModal.tsx, rewired to interiorCrmService.
// `users` entries come from the interior-os backend's User model (firstName/lastName),
// not sky-lite's own `name` field.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  onSuccess: () => void;
  users?: any[];
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'User';
  return `${name} (${u.role?.name || u.role || 'User'})`;
}

export function InteriorScheduleFollowUpModal({ isOpen, onClose, customerId, customerName, onSuccess, users = [] }: ScheduleFollowUpModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'Phone Call',
    status: 'Pending',
    scheduledDate: '',
    remarks: '',
    assignedSalesExecutive: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduledDate) return toast.error('Date is required');
    if (!form.remarks) return toast.error('Remarks are required');

    setIsSubmitting(true);
    try {
      await interiorCrmService.createActivity({
        ...form,
        customer: customerId
      });

      if (form.assignedSalesExecutive) {
        await interiorCrmService.updateCustomer(customerId, {
          assignedSalesExecutive: form.assignedSalesExecutive,
          status: 'Contacted'
        });
      } else {
        await interiorCrmService.updateCustomer(customerId, { status: 'Contacted' });
      }

      toast.success('Follow-up scheduled successfully!');
      onSuccess();
      onClose();
      setForm({ type: 'Phone Call', status: 'Pending', scheduledDate: '', remarks: '', assignedSalesExecutive: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[hsl(var(--card))] rounded-3xl shadow-2xl p-6">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Schedule Follow-up</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Plan a future touchpoint {customerName ? `with ${customerName}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl"><X size={20} className="text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Follow-up Type</label>
              <select
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:border-[hsl(var(--ring))] outline-none"
              >
                {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.scheduledDate}
                onChange={e => setForm({...form, scheduledDate: e.target.value})}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:border-[hsl(var(--ring))] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Assign Member</label>
            <select
              value={form.assignedSalesExecutive}
              onChange={e => setForm({...form, assignedSalesExecutive: e.target.value})}
              className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:border-[hsl(var(--ring))] outline-none"
            >
              <option value="">Unassigned (Keep Current)</option>
              {users.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>{userLabel(u)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Follow-up Goal / Notes</label>
            <textarea
              required
              rows={4}
              value={form.remarks}
              onChange={e => setForm({...form, remarks: e.target.value})}
              placeholder="E.g., Call to discuss revised quotation..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:border-[hsl(var(--ring))] outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50">
              {isSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
