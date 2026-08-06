'use client';

// Port of src/components/modals/ConvertToProjectModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, CalendarClock } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
}

export function InteriorConvertToProjectModal({ isOpen, onClose, customerId, onSuccess }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [remarks, setRemarks] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await interiorCrmService.convertCustomer(customerId, {
        startDate: startDate || new Date().toISOString(),
        remarks
      });

      toast.success('Congratulations! Lead converted to an Active Project!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to convert lead to project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 z-[70]">

        <div className="flex items-center justify-between mb-6 border-b border-[hsl(var(--border))] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Win Project</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Convert this lead to an active project.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl"><X size={20} className="text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5"><CalendarClock size={14} className="text-[hsl(var(--muted-foreground))]" /> Expected Project Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Handover Remarks (Optional)</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Notes for the execution team..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[hsl(var(--border))]">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50">
              {isSubmitting ? 'Converting...' : <><Trophy size={16} /> Convert to Project</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
