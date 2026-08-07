'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Plus, Trash2, FileCheck, Info, MessageSquare, Truck, Hash, FileText } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';

interface MaterialReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  materials: any[];
}

export const MaterialReceiptModal: React.FC<MaterialReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  materials
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    vendorName: '',
    challanNumber: '',
    invoiceNumber: '',
    commonNote: '',
  });
  const [items, setItems] = useState([{ materialId: '', quantity: 0, unit: '' }]);

  const toast = useToast();

  React.useEffect(() => {
    if (isOpen) {
      api.get('/vendors').then(res => setVendors(res.data)).catch(console.error);
    }
  }, [isOpen]);

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
      await api.post(`/projects/${projectId}/material-receipts`, {
        ...formData,
        items
      });
      toast.success('Material receipt recorded successfully!');
      onSuccess();
      onClose();
      setFormData({ vendorName: '', challanNumber: '', invoiceNumber: '', commonNote: '' });
      setItems([{ materialId: '', quantity: 0, unit: '' }]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record receipt');
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
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Record Material Receipt</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Log incoming supplies and challan details.</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Vendor & Document Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Vendor Name</label>
                    <div className="relative group">
                      <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <select
                        required
                        value={formData.vendorName}
                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm appearance-none"
                      >
                        <option value="" disabled>Select Vendor</option>
                        {vendors.map(v => (
                          <option key={v._id} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Challan #</label>
                    <div className="relative group">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        required
                        value={formData.challanNumber}
                        onChange={(e) => setFormData({ ...formData, challanNumber: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        placeholder="Challan #"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Invoice #</label>
                    <div className="relative group">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        placeholder="Invoice #"
                      />
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
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
                          placeholder="0"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
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
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-slate-500 hover:text-emerald-600 hover:border-emerald-400 transition-all flex items-center justify-center space-x-2 text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600 ml-1">Common Note / Description</label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <textarea
                      rows={2}
                      value={formData.commonNote}
                      onChange={(e) => setFormData({ ...formData, commonNote: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                      placeholder="Any additional observations or damage reports..."
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
                    className="flex-2 py-3 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Complete Receipt</span>
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
