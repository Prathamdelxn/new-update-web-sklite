'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Ruler } from 'lucide-react';
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

export function InteriorSendToDrawingModal({ isOpen, onClose, customerId, onSuccess, users = [] }: Props) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedDesigner, setAssignedDesigner] = useState('');
  const [remarks, setRemarks] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setAssignedDesigner('');
      setRemarks('');
    }
  }, [isOpen]);


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatePayload: any = {
        status: 'Under Drawing',
      };

      if (assignedDesigner) {
        updatePayload.designerAssigned = assignedDesigner;
      }

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: remarks || 'Lead passed to Drawing phase.',
        completedDate: new Date()
      });

      toast.success('Successfully sent to Drawing!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Failed to send to drawing');
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
              <Ruler className="text-cyan-600" /> Pass to Drawing
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Assign a designer to create drawings.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl"><X size={20} className="text-[hsl(var(--muted-foreground))]" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Assign Designer</label>
            <select
              value={assignedDesigner}
              onChange={e => setAssignedDesigner(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
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
              placeholder="Any details the team should know before creating the drawing..."
              className="w-full mt-1.5 px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50">
              {isSubmitting ? 'Passing...' : 'Pass to Drawing ➔'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
