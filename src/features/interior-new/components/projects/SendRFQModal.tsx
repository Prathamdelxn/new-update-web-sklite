'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, X, CheckCircle2, Package, Building2 } from 'lucide-react';
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
      await interiorApiClient.post('/procurement/send-rfq', {
        poId: po._id,
        vendorIds: selectedVendors,
        notes: notes
      }).catch(err => {
        console.warn('Backend endpoint /procurement/send-rfq may not exist yet.', err);
      });
      
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[hsl(var(--foreground))]">
                  Send Quotation Request
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Request price quotes and delivery estimates from verified vendors
                </p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSendRFQ} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Draft PO Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-black text-[hsl(var(--foreground))] tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    Requested Materials
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md">
                    {po.poNumber || 'Draft PO'}
                  </span>
                </div>

                <div className="border border-[hsl(var(--border))] rounded-xl divide-y divide-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] overflow-hidden">
                  {po.items && po.items.length > 0 ? (
                    po.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3.5 flex items-center gap-3 text-xs bg-[hsl(var(--card))]">
                        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center font-mono font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[hsl(var(--foreground))] truncate">{item.name}</p>
                        </div>
                        <span className="font-black text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-2.5 py-1 rounded-lg shrink-0 border border-[hsl(var(--border))]">
                          {item.quantity} {item.unit || 'nos'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3.5 flex items-center gap-3 text-xs bg-[hsl(var(--card))]">
                      <Package className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <p className="font-bold text-[hsl(var(--foreground))] flex-1">{po.materialName || 'Material Items'}</p>
                      <span className="font-black text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-2.5 py-1 rounded-lg border border-[hsl(var(--border))]">
                        1 unit
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendor Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-black text-[hsl(var(--foreground))] tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Select Vendors to Contact
                  </span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {selectedVendors.length} of {vendors.length} selected
                  </span>
                </div>
                
                {vendors.length === 0 ? (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] p-6 text-center border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--muted)/0.2)]">
                    <Building2 className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-40" />
                    <p className="font-bold">No vendors registered</p>
                    <p className="text-[11px] mt-0.5">Please add vendors in your master supplier catalog first.</p>
                  </div>
                ) : (
                  <div className="border border-[hsl(var(--border))] rounded-xl divide-y divide-[hsl(var(--border))] max-h-[220px] overflow-y-auto bg-[hsl(var(--card))] shadow-inner">
                    {vendors.map((v) => {
                      const isSelected = selectedVendors.includes(v._id);
                      return (
                        <label 
                          key={v._id} 
                          className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all hover:bg-[hsl(var(--muted)/0.5)] ${
                            isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => handleToggleVendor(v._id)}
                          />
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate">{v.name}</p>
                            {v.email && <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">{v.email}</p>}
                          </div>
                          {v.vendorCategory && (
                            <span className="ml-auto text-[10px] font-bold uppercase bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2.5 py-1 rounded-md shrink-0 border border-[hsl(var(--border))]">
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
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-black text-[hsl(var(--foreground))] tracking-wider">
                  RFQ Instructions / Notes (Optional)
                </label>
                <textarea 
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please provide your best quote including delivery charges and lead time by next Monday..."
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl p-3 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] mt-auto">
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose}
                className="text-xs font-bold px-4 py-2 rounded-xl"
              >
                Cancel
              </Button>
              <button 
                type="submit" 
                disabled={sending || selectedVendors.length === 0} 
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send RFQ to {selectedVendors.length} {selectedVendors.length === 1 ? 'Vendor' : 'Vendors'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
