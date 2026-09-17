import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';
import { validateNonEmpty, ValidationErrors } from '@/lib/crmValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  users?: any[];
}

export function SendToSiteVisitModal({ isOpen, onClose, customerId, onSuccess, users = [] }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [assignedSalesExecutive, setAssignedSalesExecutive] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [remarks, setRemarks] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedSalesExecutive('');
      setScheduledDate('');
      setRemarks('');
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      assignedSalesExecutive: validateNonEmpty(assignedSalesExecutive, 'Assign member'),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((err) => err !== null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please assign a team member for the site visit');
      return;
    }

    setIsSubmitting(true);

    try {
      const visitDate = scheduledDate ? new Date(scheduledDate) : new Date();
      const trimmedRemarks = remarks.trim();
      // 1. Update Customer Status & Assignment
      const updatePayload: any = {
        status: 'Meeting Scheduled', // This puts them in the Site Visits tab
        siteVisitScheduledDate: visitDate.toISOString(),
        assignedSalesExecutive: assignedSalesExecutive.trim(),
        remarks: trimmedRemarks || undefined,
      };

      await api.patch(`/crm/customers/${customerId}`, updatePayload);

      // 2. Log the scheduling activity
      await interiorApiClient.post('/crm/activities', {
        customer: customerId,
        type: 'Site Visit',
        status: 'Pending',
        scheduledDate: visitDate.toISOString(),
        remarks: trimmedRemarks || 'Site visit scheduled.',
      });

      toast.success('Successfully sent to Site Visits!');
      onSuccess();
      onClose();
      setErrors({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send to site visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 z-[70]">
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <MapPin className="text-purple-600" /> Send to Site Visit
            </h2>
            <p className="text-sm text-slate-500 mt-1">Assign a member and schedule the visit.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700">Assign Member to Site Visit *</label>
            <select 
              value={assignedSalesExecutive}
              onChange={e => {
                setAssignedSalesExecutive(e.target.value);
                if (errors.assignedSalesExecutive) setErrors({ ...errors, assignedSalesExecutive: null });
              }}
              className={`w-full mt-1.5 px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                errors.assignedSalesExecutive
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'
              }`}
            >
              <option value="">-- Select Member --</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role?.name || 'User'})</option>
              ))}
            </select>
            {errors.assignedSalesExecutive && (
              <p className="text-xs text-red-500 mt-1">{errors.assignedSalesExecutive}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Scheduled Date & Time (Optional)</label>
            <input 
              type="datetime-local"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Instructions / Notes</label>
            <textarea 
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Any specific instructions for the person visiting the site..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-500/30">
              {isSubmitting ? 'Sending...' : 'Pass to Site Visit ➔'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
