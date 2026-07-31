'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Calculator, Save } from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface Item {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  existingQuotations: any[];
  onSuccess: () => void;
}

export function QuotationBuilderModal({ isOpen, onClose, customerId, existingQuotations, onSuccess }: QuotationBuilderModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [items, setItems] = useState<Item[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);
  
  const [taxPercentage, setTaxPercentage] = useState(18); // default 18% GST
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const tax = (subtotal * taxPercentage) / 100;
  const grandTotal = subtotal + tax - discount;

  const handleItemChange = (index: number, field: keyof Item, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Auto calculate total for this line item
    if (field === 'quantity' || field === 'unitPrice') {
      item.total = item.quantity * item.unitPrice;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return; // Must have at least one item
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.some(i => !i.description)) {
      return toast.error("Please provide a description for all items.");
    }
    if (grandTotal <= 0) {
      return toast.error("Total amount must be greater than zero.");
    }

    setIsSubmitting(true);
    
    const newVersion = (existingQuotations?.length || 0) + 1;
    
    const newQuotation = {
      version: newVersion,
      items,
      subtotal,
      taxPercentage,
      tax,
      discount,
      grandTotal,
      notes,
      status: 'Sent'
    };

    try {
      // We will append the new quotation and update status to Quotation Sent
      const updatedQuotations = [...(existingQuotations || []), newQuotation];
      
      await api.patch(`/crm/customers/${customerId}`, { 
        quotations: updatedQuotations,
        status: 'Quotation Sent' 
      });

      // Also log the activity
      await api.post('/crm/activities', {
        customer: customerId,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Generated Quotation v${newVersion} for ₹${grandTotal.toLocaleString('en-IN')}`
      });

      toast.success('Quotation generated successfully!');
      onSuccess();
      onClose();
      // Reset form
      setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
      setDiscount(0);
      setNotes('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }} 
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" /> 
                Quotation Builder
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Generating Version {existingQuotations?.length ? existingQuotations.length + 1 : 1}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <form id="quote-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Line Items Table */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <div className="col-span-6">Description / Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit Price (₹)</div>
                  <div className="col-span-2 text-right">Total (₹)</div>
                </div>
                
                <div className="p-4 space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-center group">
                      <div className="col-span-6 flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => removeItem(index)}
                          className={`p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${items.length === 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          disabled={items.length === 1}
                        >
                          <Trash2 size={16} />
                        </button>
                        <input 
                          type="text" 
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="e.g. Modular Kitchen - Acrylic Finish"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          required min="1"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number" 
                          required min="0"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none text-right"
                        />
                      </div>
                      <div className="col-span-2 text-right font-bold text-slate-800 flex items-center justify-end pr-2">
                        ₹{item.total.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={addItem}
                    className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors w-full justify-center border border-indigo-100 border-dashed"
                  >
                    <Plus size={16} /> Add Line Item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side - Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Client Notes / Terms</label>
                  <textarea 
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., 50% advance required before production begins. Valid for 15 days."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                {/* Right Side - Totals */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-600 flex items-center gap-2">
                      Tax (GST) %
                      <input 
                        type="number" 
                        value={taxPercentage}
                        onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-xs rounded border border-slate-200 text-center focus:border-indigo-500 outline-none"
                      />
                    </span>
                    <span className="font-semibold text-slate-600">+ ₹{tax.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-slate-600 flex items-center gap-2">
                      Discount (₹)
                    </span>
                    <input 
                      type="number" 
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-sm rounded border border-slate-200 text-right focus:border-indigo-500 outline-none text-red-600 font-bold bg-white"
                      placeholder="0"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-lg font-black text-slate-900">Grand Total</span>
                    <span className="text-2xl font-black text-indigo-700">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="quote-form"
              disabled={isSubmitting} 
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95"
            >
              <Save size={16} />
              {isSubmitting ? 'Saving...' : 'Save & Generate'}
            </button>
          </div>
          
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
