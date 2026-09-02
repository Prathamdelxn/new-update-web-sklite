import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';

interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  onSuccess: () => void;
  users?: any[]; // The list of organization users for assignment
}

import { validateRequiredDate, validateNonEmpty, ValidationErrors } from '@/lib/crmValidation';

export function ScheduleFollowUpModal({ isOpen, onClose, customerId, customerName, onSuccess, users = [] }: ScheduleFollowUpModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [form, setForm] = useState({
    type: 'Phone Call',
    status: 'Pending',
    scheduledDate: '',
    remarks: '',
    assignedSalesExecutive: '' // New Field
  });

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      scheduledDate: validateRequiredDate(form.scheduledDate, 'Follow-up date & time'),
      remarks: validateNonEmpty(form.remarks, 'Follow-up goal / notes'),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((err) => err !== null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Follow-up Activity
      await interiorApiClient.post('/crm/activities', {
        ...form,
        remarks: form.remarks.trim(),
        customer: customerId
      });

      // 2. Optionally, assign user & auto-update lead status to "Contacted"
      if (form.assignedSalesExecutive) {
        await interiorApiClient.patch(`/crm/customers/${customerId}`, { 
          assignedSalesExecutive: form.assignedSalesExecutive,
          status: 'Contacted' // Pushing to next stage
        });
      } else {
        await interiorApiClient.patch(`/crm/customers/${customerId}`, { status: 'Contacted' });
      }

      toast.success('Follow-up scheduled successfully!');
      onSuccess();
      onClose();
      setForm({ type: 'Phone Call', status: 'Pending', scheduledDate: '', remarks: '', assignedSalesExecutive: '' });
      setErrors({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Schedule Follow-up</h2>
            <p className="text-sm text-slate-500 truncate max-w-full" title={customerName ? `Plan a future touchpoint with ${customerName}` : 'Plan a future touchpoint'}>Plan a future touchpoint {customerName ? `with ${customerName}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">Follow-up Type</label>
              <select 
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              >
                {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700">Date & Time</label>
              <input 
                type="datetime-local"
                required
                value={form.scheduledDate}
                onChange={e => setForm({...form, scheduledDate: e.target.value})}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Assign Member</label>
            <select 
              value={form.assignedSalesExecutive}
              onChange={e => setForm({...form, assignedSalesExecutive: e.target.value})}
              className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
            >
              <option value="">Unassigned (Keep Current)</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role?.name || 'User'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Follow-up Goal / Notes</label>
            <textarea 
              required
              rows={4}
              value={form.remarks}
              onChange={e => setForm({...form, remarks: e.target.value})}
              placeholder="E.g., Call to discuss revised quotation..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
