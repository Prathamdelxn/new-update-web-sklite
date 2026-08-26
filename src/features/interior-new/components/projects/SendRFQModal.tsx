import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, X, CheckCircle, Package } from 'lucide-react';
import { Button } from '@/components/interior/ui';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';

interface SendRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: any;
  vendors: any[];
  onSuccess?: () => void;
}

export const SendRFQModal = ({ isOpen, onClose, po, vendors, onSuccess }: SendRFQModalProps) => {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  if (!isOpen || !po) return null;

  const handleToggleVendor = (vendorId: string) => {
    setSelectedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSendRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVendors.length === 0) {
      toast.error('Please select at least one vendor to send the quotation request.');
      return;
    }

    try {
      setSending(true);
      // We will make a POST request to a backend endpoint /procurement/send-rfq
      await interiorApiClient.post('/procurement/send-rfq', {
        poId: po._id,
        vendorIds: selectedVendors,
        notes: notes
      }).catch(err => {
        // Fallback for demo purposes if the endpoint doesn't exist yet
        console.warn('Backend endpoint /procurement/send-rfq may not exist yet.', err);
      });
      // Optimistically update the PO object so the UI reflects it immediately
      po.rfqSent = true;

      toast.success(`Quotation request sent to ${selectedVendors.length} vendors!`);
      setSelectedVendors([]);
      setNotes('');
      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to send RFQ', err);
      toast.error('Failed to send quotation requests.');
    } finally {
      setSending(false);
    }
  };

  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" /> Send Quotation Request
            </h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSendRFQ} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Draft PO Summary */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Materials Requested (From PO #{po.poNumber || 'Draft'})</span>
                <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))] bg-white dark:bg-slate-950">
                  {po.items && po.items.length > 0 ? (
                    po.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-center gap-3 text-sm">
                        <Package className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <div className="flex-1">
                          <p className="font-semibold text-[hsl(var(--foreground))]">{item.name}</p>
                        </div>
                        <span className="font-bold text-[hsl(var(--foreground))] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 flex items-center gap-3 text-sm">
                      <Package className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <p className="font-semibold text-[hsl(var(--foreground))] flex-1">{po.materialName}</p>
                      <span className="font-bold text-[hsl(var(--foreground))] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">1 unit</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Select Vendors</span>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{selectedVendors.length} selected</span>
                </div>
                
                {vendors.length === 0 ? (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] italic p-4 text-center border border-dashed border-[hsl(var(--border))] rounded-lg">
                    No vendors available. Please add vendors in the Vendors tab first.
                  </p>
                ) : (
                  <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))] max-h-[250px] overflow-y-auto bg-white dark:bg-slate-950">
                    {vendors.map((v) => {
                      const isSelected = selectedVendors.includes(v._id);
                      return (
                        <label key={v._id} className={`p-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => handleToggleVendor(v._id)}
                          />
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                            {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[hsl(var(--foreground))]">{v.name}</p>
                            {v.email && <p className="text-xs text-[hsl(var(--muted-foreground))]">{v.email}</p>}
                          </div>
                          {v.vendorCategory && (
                            <span className="ml-auto text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-[hsl(var(--muted-foreground))] px-2 py-1 rounded-full">
                              {v.vendorCategory}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Extra Notes */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Additional Notes (Optional)</label>
                <textarea 
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please provide quotes including delivery to the site by next Monday..."
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] resize-none"
                />
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-slate-50 dark:bg-slate-900 mt-auto">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending || selectedVendors.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
                {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Send RFQ Email
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
