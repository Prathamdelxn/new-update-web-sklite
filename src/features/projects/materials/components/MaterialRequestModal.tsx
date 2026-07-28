'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Plus, Trash2, ClipboardList, Info, MessageSquare } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';

interface MaterialRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  materials: any[];
}

export const MaterialRequestModal: React.FC<MaterialRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  materials
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([{ materialId: '', quantity: 0, unit: '' }]);
  const [note, setNote] = useState('');

  const toast = useToast();

  const handleAddItem = () => {
    setItems([...items, { materialId: '', quantity: 0, unit: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'materialId') {
      const material = materials.find(m => m._id === value);
      if (material) {
        newItems[index].unit = material.unit;
      }
    }

    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.some(item => !item.materialId || item.quantity <= 0)) {
      toast.error('Please fill in all items correctly');
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/projects/${projectId}/material-requests`, {
        items,
        commonNote: note
      });
      toast.success('Material request sent successfully!');
      onSuccess();
      onClose();
      setItems([{ materialId: '', quantity: 0, unit: '' }]);
      setNote('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
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
            className="w-full max-w-2xl relative z-10"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Request Materials</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Create a request for project supplies.</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-4 items-end p-4 rounded-2xl bg-gray-50 border border-gray-200 relative group">
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Material</label>
                        <select
                          value={item.materialId}
                          onChange={(e) => handleItemChange(index, 'materialId', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        >
                          <option value="">Select Material</option>
                          {materials.map(m => (
                            <option key={m._id} value={m._id}>{m.name} ({m.unit})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div className="w-20 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Unit</label>
                        <input
                          type="text"
                          readOnly
                          value={item.unit}
                          className="w-full bg-gray-100 border border-transparent rounded-xl py-2 px-3 text-slate-400 text-sm focus:outline-none"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all flex items-center justify-center space-x-2 text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600 ml-1">Common Note (Optional)</label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                      placeholder="Instructions for procurement..."
                    />
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
                    className="flex-2 py-3 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Submit Request</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
