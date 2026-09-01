'use client';

import React, { useState } from 'react';
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

export function InteriorMarkAsLostModal({ isOpen, onClose, customerId, leadName, onSuccess }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await interiorCrmService.updateCustomer(customerId, {
        status: 'Lost',
        lostReason: reason,
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
          className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 z-[70]"
        >
          <div className="flex items-center justify-between mb-6 border-b border-[hsl(var(--border))] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                <Frown size={20} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Mark as Lost</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Move lead to lost stage</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl transition-colors">
              <X size={20} className="text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-rose-700">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="text-xs font-medium">
                You are about to mark <strong className="truncate max-w-[150px] inline-block align-bottom" title={leadName}>{leadName || 'this lead'}</strong> as Lost. They will be moved to the Lost Leads tab.
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Reason for Loss (Optional)</label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g., Price too high, chose competitor..."
                className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none transition-all"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition-colors"
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
