'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, History, Plus, Trash2, MapPin, Clipboard } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';

interface MaterialUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  materials: any[];
}

export const MaterialUsageModal: React.FC<MaterialUsageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  materials
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: '',
    workType: '',
    items: [{ materialId: '', quantity: 0, unit: '' }],
    notes: ''
  });

  const toast = useToast();

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { materialId: '', quantity: 0, unit: '' }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    if (field === 'materialId') {
      const selected = materials.find(m => m._id === value);
      newItems[index] = { ...newItems[index], materialId: value, unit: selected?.unit || '' };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post(`/projects/${projectId}/material-usage`, {
        locationOrTask: formData.location,
        commonNote: formData.notes,
        items: formData.items,
      });
      toast.success('Material consumption logged successfully!');
      onSuccess();
      onClose();
      setFormData({
        location: '', workType: '',
        items: [{ materialId: '', quantity: 0, unit: '' }],
        notes: ''
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to log usage');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg relative z-10"
          >
            <GlassCard className="border-gray-200" gradient>
              <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                      <History className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Log Material Usage</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Record material consumption on site.</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">Work Location</label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                        <input
                          type="text"
                          required
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-sm transition-all"
                          placeholder="e.g. Block A, Floor 2"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">Type of Work</label>
                      <div className="relative group">
                        <Clipboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                        <input
                          type="text"
                          required
                          value={formData.workType}
                          onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-sm transition-all"
                          placeholder="e.g. Concreting"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-600 ml-1">Consumed Items</label>
                      <button
                        type="button"
                        onClick={addItem}
                        className="text-xs font-bold text-purple-600 hover:text-purple-500 flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <div className="col-span-6 space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Material</label>
                            <select
                              required
                              value={item.materialId}
                              onChange={(e) => updateItem(index, 'materialId', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs text-gray-900 focus:outline-none focus:border-purple-400"
                            >
                              <option value="">Select Material</option>
                              {materials.map(m => (
                                <option key={m._id} value={m._id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-4 space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                            <div className="flex items-center bg-white border border-gray-200 rounded-lg pr-2">
                              <input
                                type="number"
                                required
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                className="w-full bg-transparent py-1.5 px-3 text-xs text-gray-900 focus:outline-none"
                              />
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{item.unit || '-'}</span>
                            </div>
                          </div>
                          <div className="col-span-2 flex justify-center pb-1">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex space-x-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-medium transition-all active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-2 py-3 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Logging...</span>
                        </>
                      ) : (
                        <span>Log Consumption</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
