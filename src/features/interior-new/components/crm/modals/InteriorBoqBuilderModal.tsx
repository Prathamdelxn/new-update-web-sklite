'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Calculator, Save } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { Input } from '@/components/interior/ui'; // Since I'll use the Input component from UI

interface BoqItem {
  serialNumber: number;
  category: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface BoqBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  existingBoqs?: any[];
  editingBoqIndex?: number | null;
  onSuccess: () => void;
}

export function InteriorBoqBuilderModal({ isOpen, onClose, customerId, existingBoqs = [], editingBoqIndex = null, onSuccess }: BoqBuilderModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BoqItem[]>([]);

  const isEditing = editingBoqIndex !== null && editingBoqIndex >= 0 && existingBoqs[editingBoqIndex];

  React.useEffect(() => {
    if (!isOpen) {
      setNotes('');
      setItems([]);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        const targetBoq = existingBoqs[editingBoqIndex!];
        setItems(targetBoq.items && targetBoq.items.length > 0 ? targetBoq.items : [{ serialNumber: 1, category: 'Flooring', itemName: '', description: '', quantity: 1, unit: 'sqft', rate: 0, amount: 0 }]);
        setNotes(targetBoq.notes || '');
      } else {
        setItems([{ serialNumber: 1, category: 'Flooring', itemName: '', description: '', quantity: 1, unit: 'sqft', rate: 0, amount: 0 }]);
        setNotes('');
      }
    }
  }, [isOpen, editingBoqIndex, existingBoqs]);

  const updateItemField = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: value };
      
      // Calculate amount if qty or rate changes
      if (field === 'quantity' || field === 'rate') {
        item.amount = (item.quantity || 0) * (item.rate || 0);
      }
      
      newItems[index] = item;
      return newItems;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        serialNumber: prev.length + 1,
        category: prev[prev.length - 1]?.category || 'Flooring',
        itemName: '',
        description: '',
        quantity: 1,
        unit: prev[prev.length - 1]?.unit || 'sqft',
        rate: 0,
        amount: 0
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index).map((it, idx) => ({ ...it, serialNumber: idx + 1 })));
  };

  const totalAmount = items.reduce((acc, item) => acc + (item.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      return toast.error("Please add at least one line item to the BOQ.");
    }
    if (items.some(i => !i.itemName || !i.itemName.trim())) {
      return toast.error("Please provide an item name for all items.");
    }

    setIsSubmitting(true);

    try {
      const updatedBoqs = [...(existingBoqs || [])];
      
      if (isEditing) {
        const currentBoq = updatedBoqs[editingBoqIndex!];
        updatedBoqs[editingBoqIndex!] = {
          ...currentBoq,
          items,
          totalAmount,
          notes,
          updatedAt: new Date()
        };
      } else {
        const newVersion = (existingBoqs?.length || 0) + 1;
        updatedBoqs.push({
          version: newVersion,
          items,
          totalAmount,
          notes,
          status: 'draft',
          createdAt: new Date()
        });
      }

      // Update CRM Customer with the new/edited BOQ
      await interiorCrmService.updateCustomer(customerId, {
        boqs: updatedBoqs,
        status: 'Under BOQ Creation'
      });

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'System Update',
        status: 'Completed',
        remarks: isEditing 
          ? `BOQ Version ${existingBoqs[editingBoqIndex!]?.version || (editingBoqIndex! + 1)} details updated.`
          : `BOQ Version ${updatedBoqs.length} added.`,
        completedDate: new Date()
      });

      toast.success(isEditing ? 'BOQ updated successfully!' : 'New BOQ version created successfully!');
      onSuccess();
      onClose();
      setItems([{ serialNumber: 1, category: 'Flooring', itemName: '', description: '', quantity: 1, unit: 'sqft', rate: 0, amount: 0 }]);
      setNotes('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save BOQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-5xl border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))] shrink-0 bg-[hsl(var(--muted)/0.5)]">
            <div>
              <h3 className="text-lg font-black text-[hsl(var(--foreground))] flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                {isEditing ? `Edit BOQ (Version ${existingBoqs[editingBoqIndex!]?.version || (editingBoqIndex! + 1)})` : `New BOQ Version (Version ${existingBoqs.length + 1})`}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {isEditing ? 'Update item quantities, rates, and descriptions for this version.' : 'Draft a new BOQ version before passing to Quotations.'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[hsl(var(--accent))] transition-colors">
              <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">BOQ Line Items ({items.length})</span>
                </div>

                <div className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] font-bold border-b border-[hsl(var(--border))] uppercase tracking-wider text-[10px]">
                          <th className="p-3 w-10 text-center">#</th>
                          <th className="p-3 w-40">Category</th>
                          <th className="p-3">Item Name</th>
                          <th className="p-3 w-24 text-right">Quantity</th>
                          <th className="p-3 w-20 text-center">Unit</th>
                          <th className="p-3 w-28 text-right">Unit Rate (₹)</th>
                          <th className="p-3 w-32 text-right">Amount (₹)</th>
                          <th className="p-3 w-12 text-center" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                            <td className="p-3 text-center font-mono font-semibold text-[hsl(var(--muted-foreground))]">{item.serialNumber}</td>
                            <td className="p-2">
                              <Input
                                list="boq-categories"
                                className="h-9"
                                placeholder="Category"
                                value={item.category}
                                onChange={(e) => updateItemField(idx, 'category', e.target.value)}
                              />
                              <datalist id="boq-categories">
                                <option value="Flooring" />
                                <option value="Woodwork" />
                                <option value="False Ceiling" />
                                <option value="Painting" />
                                <option value="Electrical Works" />
                                <option value="Plumbing" />
                                <option value="HVAC" />
                                <option value="Masonry" />
                                <option value="Civil Works" />
                                <option value="Kitchen" />
                                <option value="Wardrobe" />
                                <option value="Other" />
                              </datalist>
                            </td>
                            <td className="p-2">
                              <Input 
                                required 
                                placeholder="Item / material specifications" 
                                value={item.itemName} 
                                onChange={(e) => updateItemField(idx, 'itemName', e.target.value)} 
                                className="h-9 mb-1" 
                              />
                              <Input 
                                placeholder="Description (optional)" 
                                value={item.description} 
                                onChange={(e) => updateItemField(idx, 'description', e.target.value)} 
                                className="h-7 text-[10px]" 
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                type="number" 
                                required 
                                min={0.01} 
                                step="any" 
                                value={item.quantity || ''} 
                                onChange={(e) => updateItemField(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                                className="h-9 text-right" 
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                required 
                                placeholder="sqft" 
                                value={item.unit} 
                                onChange={(e) => updateItemField(idx, 'unit', e.target.value)} 
                                className="h-9 text-center uppercase" 
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                type="number" 
                                required 
                                min={0} 
                                step="any" 
                                value={item.rate || ''} 
                                onChange={(e) => updateItemField(idx, 'rate', parseFloat(e.target.value) || 0)} 
                                className="h-9 text-right" 
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-[hsl(var(--foreground))]">
                              ₹{item.amount?.toLocaleString('en-IN') || 0}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                disabled={items.length === 1}
                                className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="p-4 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] flex justify-between items-center">
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="flex items-center gap-2 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg transition-colors border border-teal-100 border-dashed"
                    >
                      <Plus size={14} /> Add Row
                    </button>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total BOQ Amount</span>
                      <span className="text-xl font-black text-teal-700">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95"
              >
                <Save size={16} />
                {isSubmitting ? 'Saving BOQ...' : 'Save BOQ Version'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
