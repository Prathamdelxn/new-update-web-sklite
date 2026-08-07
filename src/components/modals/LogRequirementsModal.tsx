import React, { useState } from 'react';
import { X, PenTool, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import interiorApiClient from '@/services/interiorApi.client';
import { motion } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  users?: any[];
}

export const LogRequirementsModal = ({ isOpen, onClose, customerId, onSuccess, users = [] }: Props) => {
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

    if (requirements.length === 0) {
      toast.error('Please add at least one room requirement.');
      return;
    }
    if (requirements.some(r => !r.roomName || !r.roomName.trim())) {
      toast.error('Please specify a room name for all rooms.');
      return;
    }

    setIsSubmitting(true);

    try {
      const sanitizedRequirements = requirements.map(r => ({
        roomName: r.roomName.trim(),
        description: r.description.trim(),
        theme: r.theme.trim(),
      }));

      const updatePayload: any = {
        status: 'Requirement Completed',
        requirements: sanitizedRequirements,
      };

      if (assignedSalesExecutive) {
        updatePayload.assignedSalesExecutive = assignedSalesExecutive;
      }

      await interiorApiClient.patch(`/crm/customers/${customerId}`, updatePayload);

      await interiorApiClient.post('/crm/activities', {
        customer: customerId,
        type: 'Requirement Gathering',
        status: 'Completed',
        remarks: `Logged requirements for ${sanitizedRequirements.length} rooms.`,
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
        className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <PenTool className="text-blue-600" /> Design Requirements
            </h2>
            <p className="text-sm text-slate-500 mt-1">Capture room-by-room details and themes.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">Assign Member (Designer/Sales)</label>
            <select 
              value={assignedSalesExecutive}
              onChange={(e) => setAssignedSalesExecutive(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              <option value="">Unassigned (Keep Current)</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role?.name || 'User'})</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {requirements.map((req, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative group">
                <button 
                  type="button" 
                  onClick={() => removeRoom(index)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Room Name</label>
                    <input 
                      type="text" 
                      value={req.roomName}
                      onChange={(e) => updateRoom(index, 'roomName', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. Master Bedroom"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Preferred Theme / Colors</label>
                    <input 
                      type="text" 
                      value={req.theme}
                      onChange={(e) => updateRoom(index, 'theme', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. Modern Minimalist, Navy Blue"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Specific Requirements</label>
                    <textarea 
                      value={req.description}
                      onChange={(e) => updateRoom(index, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-20 resize-none"
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
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Another Room
          </button>

          <div className="pt-4 flex gap-3 mt-auto">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Requirements'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
