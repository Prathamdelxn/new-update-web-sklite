'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShoppingCart, Plus, Trash2, Calendar, User, DollarSign, FileText } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { formatCurrency, MAX_INPUT_VALUE } from '@/lib/utils';

interface MaterialPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  materials: any[];
}

export const MaterialPurchaseModal: React.FC<MaterialPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  materials
}) => {
  const { project } = useProjectContext();
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    vendorName: '',
    vendorEmail: '',
    vendorPhone: '',
    poNumber: `PO-${Math.floor(100000 + Math.random() * 900000)}`,
    items: [{ materialId: '', quantity: 0, unit: '', unitPrice: 0 }],
    totalAmount: 0,
    advancePaid: 0,
    deliveryDate: '',
    terms: '',
    billNumber: '',
    commonNote: ''
  });

  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      api.get('/vendors').then(res => setVendors(res.data)).catch(console.error);
    }
  }, [isOpen]);

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { materialId: '', quantity: 0, unit: '', unitPrice: 0 }]
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
    if (formData.items.some(it => it.quantity > MAX_INPUT_VALUE || it.unitPrice > MAX_INPUT_VALUE) || formData.advancePaid > MAX_INPUT_VALUE) {
      toast.error('Quantity, price, or advance amount is too large');
      return;
    }
    setIsLoading(true);

    try {
      await api.post(`/projects/${projectId}/material-purchase`, {
        vendorName: formData.vendorName,
        poNumber: formData.poNumber,
        advancePayment: formData.advancePaid,
        items: formData.items.map(({ materialId, quantity, unitPrice }) => ({ materialId, quantity, unitPrice })),
        billNumber: formData.billNumber,
        commonNote: formData.commonNote,
        deliveryDate: formData.deliveryDate || null,
      });
      toast.success('Material purchase logged successfully!');
      onSuccess();
      onClose();
      setFormData({
        vendorName: '', vendorEmail: '', vendorPhone: '',
        poNumber: `PO-${Math.floor(100000 + Math.random() * 900000)}`,
        items: [{ materialId: '', quantity: 0, unit: '', unitPrice: 0 }],
        totalAmount: 0, advancePaid: 0, deliveryDate: '', terms: '',
        billNumber: '', commonNote: ''
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create material purchase');
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
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
              <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200">
                      <ShoppingCart className="w-6 h-6 text-blue-600" />
                    </div>
                     <div>
                      <h2 className="text-xl font-bold text-gray-900">Create Material Purchase</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Formal procurement request for project supplies.</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">Vendor Name</label>
                      <select
                        required
                        value={formData.vendorName}
                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      >
                        <option value="" disabled>Select Vendor</option>
                        {vendors.map(v => (
                          <option key={v._id} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">Bill / Invoice Number</label>
                      <input
                        type="text"
                        value={formData.billNumber}
                        onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        placeholder="e.g. BILL-987"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">PO Number</label>
                      <input
                        type="text"
                        disabled
                        value={formData.poNumber}
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl py-2 px-4 text-slate-400 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-600 ml-1">Order Items</label>
                      <button
                        type="button"
                        onClick={addItem}
                        className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.items.map((item, index) => {
                        const subtotal = item.quantity * item.unitPrice;
                        return (
                          <div key={index} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                            <div className="grid grid-cols-12 gap-3 items-end">
                              <div className="col-span-5 space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Material</label>
                                <select
                                  required
                                  value={item.materialId}
                                  onChange={(e) => updateItem(index, 'materialId', e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                                >
                                  <option value="">Select Material</option>
                                  {materials.map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-3 space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                                <div className="flex items-center bg-white border border-gray-200 rounded-lg pr-2">
                                  <input
                                    type="number"
                                    required
                                    min={0}
                                    max={MAX_INPUT_VALUE}
                                    placeholder="0"
                                    value={item.quantity === 0 ? '' : item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                                    className="w-full bg-transparent py-1.5 px-3 text-xs text-gray-900 focus:outline-none"
                                  />
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">{item.unit || '-'}</span>
                                </div>
                              </div>
                              <div className="col-span-3 space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Rate ($)</label>
                                <input
                                  type="number"
                                  required
                                  min={0}
                                  max={MAX_INPUT_VALUE}
                                  placeholder="0"
                                  value={item.unitPrice === 0 ? '' : item.unitPrice}
                                  onChange={(e) => updateItem(index, 'unitPrice', e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="col-span-1 flex justify-center pb-1">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {/* Subtotal row */}
                            <div className="flex items-center justify-between gap-2 px-1 pt-1 border-t border-gray-200">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Subtotal</span>
                              <span className="text-xs font-black text-emerald-600 break-all text-right min-w-0">
                               {subtotal > 0 ? formatCurrency(subtotal, project?.currency || '$') : '—'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grand total */}
                    {formData.items.length > 0 && (
                      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl mt-2">
                        <span className="text-sm font-black text-slate-600 uppercase tracking-wider shrink-0">Grand Total</span>
                        <span className="text-lg font-black text-emerald-600 break-all text-right min-w-0">
                          {formatCurrency(formData.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0), project?.currency || '$')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">Expected Delivery</label>
                      <input
                        type="date"
                        required
                        value={formData.deliveryDate}
                        onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">Advance Amount ($)</label>
                      <input
                        type="number"
                        min={0}
                        max={MAX_INPUT_VALUE}
                        value={formData.advancePaid === 0 ? '' : formData.advancePaid}
                        onChange={(e) => setFormData({ ...formData, advancePaid: e.target.value === '' ? 0 : Number(e.target.value) })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600 ml-1">Common Note / Description</label>
                    <textarea
                      rows={2}
                      value={formData.commonNote}
                      onChange={(e) => setFormData({ ...formData, commonNote: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                      placeholder="e.g. Terms, descriptions, or notes..."
                    />
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
                          <span>Generating Purchase...</span>
                        </>
                      ) : (
                        <span>Generate Purchase</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
