import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Camera, CheckCircle2 } from 'lucide-react';
import { Button, Input } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';

interface InteriorGRNModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: any;
  onSubmit: (receivedItems: any[], challanNumber: string, proofUrl: string) => Promise<void>;
}

export const InteriorGRNModal = ({ isOpen, onClose, po, onSubmit }: InteriorGRNModalProps) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [challanNumber, setChallanNumber] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  
  // Initialize received quantities to be equal to ordered quantities by default
  const [receivedItems, setReceivedItems] = useState(
    po?.items?.map((item: any) => ({
      ...item,
      receivedQuantity: item.quantity,
    })) || []
  );

  const getPreviouslyReceived = React.useCallback((itemName: string) => {
    if (!po?.grns || !Array.isArray(po.grns)) return 0;
    return po.grns.reduce((total: number, grn: any) => {
      const item = grn.receivedItems?.find((i: any) => i.name === itemName);
      return total + (item?.receivedQuantity || 0);
    }, 0);
  }, [po]);

  // If `po` changes, we need to reset the items
  React.useEffect(() => {
    if (po && po.items) {
      setReceivedItems(po.items.map((item: any) => {
        const prevReceived = getPreviouslyReceived(item.name);
        const remaining = Math.max(0, item.quantity - prevReceived);
        return { 
          ...item, 
          previouslyReceived: prevReceived,
          remainingQuantity: remaining,
          receivedQuantity: remaining // Default to receiving whatever is remaining
        };
      }));
      setChallanNumber('');
      setProofUrl('');
    }
  }, [po, getPreviouslyReceived]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen || !po) return null;

  const handleQuantityChange = (index: number, val: string) => {
    const newItems = [...receivedItems];
    newItems[index].receivedQuantity = parseFloat(val) || 0;
    setReceivedItems(newItems);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setProofUrl(objectUrl);
    toast.success('Photo attached!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challanNumber) {
      toast.error('Please enter the Challan/Receipt Number.');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit(receivedItems, challanNumber, proofUrl);
      setChallanNumber('');
      setProofUrl('');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit GRM.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[hsl(var(--card))] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.3)]">
              <div>
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">Receive Material (GRM)</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Verify delivered quantities for PO: {po.poNumber}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Delivery Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Challan / Receipt No. *</label>
                  <Input 
                    required 
                    placeholder="e.g. CHL-2026-882" 
                    value={challanNumber} 
                    onChange={(e) => setChallanNumber(e.target.value)} 
                  />
                </div>
                <div className="space-y-1 relative">
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Delivery Proof (Photo)</label>
                  
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                  />

                  {!proofUrl ? (
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border border-dashed border-[hsl(var(--border))] rounded-md h-10 flex items-center justify-center gap-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"
                    >
                      <Camera className="w-4 h-4" /> Capture / Upload
                    </button>
                  ) : (
                    <div className="w-full border border-[hsl(var(--border))] rounded-md overflow-hidden relative group">
                      <img src={proofUrl} alt="Delivery Proof Preview" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        <div className="flex items-center gap-1 text-white font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-green-400" /> Attached
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => window.open(proofUrl, '_blank')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold">
                            View Full Size
                          </button>
                          <button type="button" onClick={() => setProofUrl('')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Verification */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Verify Quantities</h4>
                <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))] overflow-hidden">
                  <div className="bg-[hsl(var(--muted)/0.3)] grid grid-cols-12 gap-2 p-3 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">
                    <div className="col-span-4">Material</div>
                    <div className="col-span-4 text-center">Prev. Received / Total</div>
                    <div className="col-span-4 text-right">Receiving Now</div>
                  </div>
                  {receivedItems.length > 0 ? (
                    receivedItems.map((item: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 p-3 items-center bg-[hsl(var(--card))]">
                        <div className="col-span-4">
                          <p className="text-xs font-bold text-[hsl(var(--foreground))] line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">{item.unit}</p>
                        </div>
                        <div className="col-span-4 flex flex-col items-center">
                          <span className="font-mono text-xs font-bold text-[hsl(var(--primary))]">{item.previouslyReceived} <span className="text-[hsl(var(--muted-foreground))]">/ {item.quantity}</span></span>
                          <span className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider mt-0.5">Remaining: {item.remainingQuantity}</span>
                        </div>
                        <div className="col-span-4 flex justify-end">
                          <input 
                            type="number"
                            min="0"
                            max={item.remainingQuantity}
                            value={item.receivedQuantity}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            className="w-20 px-2 py-1 text-right text-xs border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.05)] rounded focus:outline-none focus:border-[hsl(var(--primary))] font-mono font-bold"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                      No items found for this PO.
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  * Verify the exact quantities received on site. The system will automatically update the inventory based on these verified numbers.
                </p>
              </div>

            </form>
            
            <div className="p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !challanNumber}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Receipt & Add to Inventory
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
