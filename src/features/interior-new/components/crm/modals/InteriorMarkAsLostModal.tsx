'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Frown, AlertCircle } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  leadName?: string;
  onSuccess: () => void;
}

const LOST_REASON_CATEGORIES = [
  { value: 'Budget', label: 'Budget / High Pricing' },
  { value: 'Competitor', label: 'Chose Competitor' },
  { value: 'No Response', label: 'No Response / Client Inactive' },
  { value: 'Possession Delayed', label: 'Possession Delayed' },
  { value: 'Cancelled', label: 'Project Cancelled / Dropped' },
  { value: 'Other', label: 'Other Reason' },
];

export function InteriorMarkAsLostModal({ isOpen, onClose, customerId, leadName, onSuccess }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonCategory, setReasonCategory] = useState<'Budget' | 'Competitor' | 'No Response' | 'Possession Delayed' | 'Cancelled' | 'Other'>('Budget');
  const [reasonDetails, setReasonDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setReasonCategory('Budget');
      setReasonDetails('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reasonDetails.trim();
    if (!trimmed) {
      setError('Reason for loss is required');
      toast.error('Please provide a reason for marking this lead as lost');
      return;
    }
    if (trimmed.length < 3) {
      setError('Please provide at least 3 characters for the reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await interiorCrmService.updateCustomer(customerId, {
        status: 'Lost',
        lostReason: reasonCategory,
        remarks: trimmed,
      });

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Lead marked as Lost (${reasonCategory}): ${trimmed}`,
      });

      toast.success('Lead has been marked as Lost.');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to mark lead as lost');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 z-[70] shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6 border-b border-[hsl(var(--border))] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                <Frown size={20} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Mark as Lost</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Move lead to lost stage</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl transition-colors cursor-pointer">
              <X size={20} className="text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-rose-700 dark:text-rose-300">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="text-xs font-medium">
                You are about to mark <strong className="truncate max-w-[180px] inline-block align-bottom font-bold" title={leadName}>{leadName || 'this lead'}</strong> as Lost.
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Loss Reason Category *</label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value as any)}
                className="w-full mt-1.5 px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:border-[hsl(var(--ring))] outline-none"
              >
                {LOST_REASON_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[hsl(var(--foreground))]">Reason & Notes *</label>
                <span className="text-[10px] font-bold text-rose-500">Required</span>
              </div>
              <textarea
                rows={3}
                value={reasonDetails}
                onChange={(e) => {
                  setReasonDetails(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Explain why the lead was lost (e.g., Client finalized another vendor with lower quotation)..."
                className={`w-full mt-1.5 px-4 py-3 rounded-xl border bg-[hsl(var(--background))] text-sm outline-none resize-none transition-all ${
                  error
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-[hsl(var(--border))] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                }`}
              />
              {error && <p className="text-xs text-rose-500 font-semibold mt-1">{error}</p>}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {isSubmitting ? 'Updating...' : 'Confirm Lost'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
