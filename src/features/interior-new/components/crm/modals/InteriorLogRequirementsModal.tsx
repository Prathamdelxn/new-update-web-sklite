'use client';

// Port of src/components/modals/LogRequirementsModal.tsx, rewired to interiorCrmService.

import React, { useState } from 'react';
import { X, PenTool, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { motion } from 'framer-motion';

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

export const InteriorLogRequirementsModal = ({ isOpen, onClose, customerId, onSuccess, users = [] }: Props) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedSalesExecutive, setAssignedSalesExecutive] = useState('');

  const [requirements, setRequirements] = useState([
    { roomName: 'Living Room', description: '', theme: '' }
  ]);

  const addRoom = () => {
    setRequirements([...requirements, { roomName: '', description: '', theme: '' }]);
  };

  const removeRoom = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const updateRoom = (index: number, field: string, value: string) => {
    const newReqs = [...requirements];
    newReqs[index] = { ...newReqs[index], [field]: value };
    setRequirements(newReqs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatePayload: any = {
        status: 'Requirement Completed',
        requirements,
      };

      if (assignedSalesExecutive) {
        updatePayload.assignedSalesExecutive = assignedSalesExecutive;
      }

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Requirement Gathering',
        status: 'Completed',
        remarks: `Logged requirements for ${requirements.length} rooms.`,
        completedDate: new Date()
      });

      toast.success('Requirements saved successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to save requirements');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[hsl(var(--card))] rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2">
              <PenTool className="text-[hsl(var(--primary))]" /> Design Requirements
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Capture room-by-room details and themes.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6">

          <div className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-2xl p-5 mb-2">
            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1">Assign Member (Designer/Sales)</label>
            <select
              value={assignedSalesExecutive}
              onChange={(e) => setAssignedSalesExecutive(e.target.value)}
              className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all"
            >
              <option value="">Unassigned (Keep Current)</option>
              {users.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>{userLabel(u)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {requirements.map((req, index) => (
              <div key={index} className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-2xl p-5 relative group">
                <button
                  type="button"
                  onClick={() => removeRoom(index)}
                  className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1">Room Name</label>
                    <input
                      type="text"
                      value={req.roomName}
                      onChange={(e) => updateRoom(index, 'roomName', e.target.value)}
                      className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all"
                      placeholder="e.g. Master Bedroom"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1">Preferred Theme / Colors</label>
                    <input
                      type="text"
                      value={req.theme}
                      onChange={(e) => updateRoom(index, 'theme', e.target.value)}
                      className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all"
                      placeholder="e.g. Modern Minimalist, Navy Blue"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1">Specific Requirements</label>
                    <textarea
                      value={req.description}
                      onChange={(e) => updateRoom(index, 'description', e.target.value)}
                      className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all h-20 resize-none"
                      placeholder="e.g. Sliding wardrobe, floating TV unit, false ceiling with cove lights"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRoom}
            className="w-full py-4 border-2 border-dashed border-[hsl(var(--border))] rounded-2xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:border-[hsl(var(--primary)/0.3)] hover:bg-[hsl(var(--accent))] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Another Room
          </button>

          <div className="pt-4 flex gap-3 mt-auto">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Requirements'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
