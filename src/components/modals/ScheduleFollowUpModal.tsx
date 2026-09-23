import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Phone, FileText, AlertCircle } from 'lucide-react';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';
import { validateFutureDate, validateNonEmpty, ValidationErrors, getMinDateTimeLocal } from '@/lib/crmValidation';

interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  onSuccess: () => void;
  users?: any[]; // The list of organization users for assignment
}

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

  const minDateTime = getMinDateTimeLocal();

  React.useEffect(() => {
    if (isOpen) {
      setForm({
        type: 'Phone Call',
        status: 'Pending',
        scheduledDate: '',
        remarks: '',
        assignedSalesExecutive: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {
      scheduledDate: validateFutureDate(form.scheduledDate, 'Follow-up date & time'),
      assignedSalesExecutive: validateNonEmpty(form.assignedSalesExecutive, 'Assigned team member'),
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
      try {
        await interiorApiClient.post('/crm/activities', {
          type: form.type,
          status: 'Pending',
          scheduledDate: form.scheduledDate,
          remarks: form.remarks.trim(),
          customer: customerId,
          user: form.assignedSalesExecutive || undefined,
        });

        if (form.assignedSalesExecutive) {
          await interiorApiClient.patch(`/crm/customers/${customerId}`, {
            assignedSalesExecutive: form.assignedSalesExecutive,
            status: 'Contacted',
          });
        } else {
          await interiorApiClient.patch(`/crm/customers/${customerId}`, { status: 'Contacted' });
        }
      } catch (interiorErr) {
        await api.post('/crm/activities', {
          type: form.type,
          status: 'Pending',
          scheduledDate: form.scheduledDate,
          remarks: form.remarks.trim(),
          customer: customerId,
          user: form.assignedSalesExecutive || undefined,
        });

        if (form.assignedSalesExecutive) {
          await api.patch(`/crm/customers/${customerId}`, {
            assignedSalesExecutive: form.assignedSalesExecutive,
            status: 'Contacted',
          });
        } else {
          await api.patch(`/crm/customers/${customerId}`, { status: 'Contacted' });
        }
      }

      toast.success('Follow-up scheduled successfully!');
      onSuccess();
      onClose();
      setErrors({});
    } catch (error: any) {
      console.error('Failed to schedule follow-up:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Schedule Follow-up</h2>
            <p className="text-sm text-slate-500 truncate max-w-full" title={customerName ? `Plan a future touchpoint with ${customerName}` : 'Plan a future touchpoint'}>
              Plan a future touchpoint
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Follow-up Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 h-5">
                <Phone size={13} className="text-slate-400" />
                Follow-up Type *
              </label>
              <select 
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
              >
                {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 h-5">
                <Calendar size={13} className="text-slate-400" />
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input 
                type="datetime-local"
                min={minDateTime}
                value={form.scheduledDate}
                onChange={e => {
                  const val = e.target.value;
                  setForm({...form, scheduledDate: val});
                  if (val) {
                    const err = validateFutureDate(val, 'Follow-up date & time');
                    setErrors(prev => ({ ...prev, scheduledDate: err }));
                  } else {
                    setErrors(prev => ({ ...prev, scheduledDate: null }));
                  }
                }}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm text-slate-800 bg-white outline-none transition-all ${
                  errors.scheduledDate ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
              {errors.scheduledDate && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={11} className="shrink-0" />
                  {errors.scheduledDate}
                </p>
              )}
            </div>
          </div>

          {/* Assign Member */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 h-5">
              <User size={13} className="text-slate-400" />
              Assign Member <span className="text-red-500">*</span>
            </label>
            <select 
              value={form.assignedSalesExecutive}
              onChange={e => {
                setForm({...form, assignedSalesExecutive: e.target.value});
                if (errors.assignedSalesExecutive) setErrors({...errors, assignedSalesExecutive: null});
              }}
              className={`w-full h-11 px-3.5 rounded-xl border text-sm text-slate-800 bg-white outline-none transition-all cursor-pointer ${
                errors.assignedSalesExecutive ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
            >
              <option value="">Select team member...</option>
              {users.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>{u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()} ({u.role?.name || u.role || 'User'})</option>
              ))}
            </select>
            {errors.assignedSalesExecutive && (
              <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} className="shrink-0" />
                {errors.assignedSalesExecutive}
              </p>
            )}
          </div>

          {/* Follow-up Goal / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 h-5">
              <FileText size={13} className="text-slate-400" />
              Follow-up Goal / Notes <span className="text-red-500">*</span>
            </label>
            <textarea 
              rows={3}
              value={form.remarks}
              onChange={e => {
                setForm({...form, remarks: e.target.value});
                if (errors.remarks) setErrors({...errors, remarks: null});
              }}
              placeholder="e.g. Call client regarding modular kitchen preferences and budget range..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 bg-white outline-none resize-none transition-all ${
                errors.remarks ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
            />
            {errors.remarks && (
              <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} className="shrink-0" />
                {errors.remarks}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer">
              {isSubmitting ? 'Scheduling...' : 'Save Follow-up'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
