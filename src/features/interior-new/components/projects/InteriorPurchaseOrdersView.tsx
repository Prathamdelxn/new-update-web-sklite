'use client';

// Port of interior-os-frontend's projects/[projectId]/purchase-orders/page.tsx.
// This is the simple tabular PO register view (distinct from the kanban
// Procurement Board view at InteriorProcurementView.tsx) — both source pages
// hit the same /procurement backend endpoints but render different UIs.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, X, Loader2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';

interface InteriorPurchaseOrdersViewProps {
  projectId: string;
}

export default function InteriorPurchaseOrdersView({ projectId }: InteriorPurchaseOrdersViewProps) {
  const toast = useToast();

  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [materialName, setMaterialName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('pending');
  const [deliveryDate, setDeliveryDate] = useState('');

  const fetchPOs = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getPurchaseOrders(projectId);
      if (res.success && res.data) {
        setPos(res.data);
      }
    } catch (err) {
      console.error('Failed to load POs', err);
      toast.error('Failed to fetch Purchase Order logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchPOs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName || !vendorName || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        materialName,
        vendorName,
        amount: parseFloat(amount) || 0,
        status,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      };

      const res = await interiorProjectService.createPurchaseOrder(projectId, payload);
      if (res.success) {
        toast.success('Purchase Order logged successfully!');
        setIsModalOpen(false);
        setMaterialName('');
        setVendorName('');
        setAmount('');
        setStatus('pending');
        setDeliveryDate('');
        fetchPOs();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'ordered':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'delivered':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
    }
  };

  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Purchase Orders Register</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Log financial contracts, purchase workflows, and vendor closeouts.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create PO
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : pos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No Purchase Orders created yet. Click &quot;Create PO&quot; to log materials procurement.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
                  <th className="py-3.5 px-4 font-bold text-[hsl(var(--muted-foreground))]">PO Number</th>
                  <th className="py-3.5 px-4 font-bold text-[hsl(var(--muted-foreground))]">Material Description</th>
                  <th className="py-3.5 px-4 font-bold text-[hsl(var(--muted-foreground))]">Vendor</th>
                  <th className="py-3.5 px-4 font-bold text-[hsl(var(--muted-foreground))]">Amount</th>
                  <th className="py-3.5 px-4 font-bold text-[hsl(var(--muted-foreground))]">Delivery Date</th>
                  <th className="py-3.5 px-4 font-bold text-[hsl(var(--muted-foreground))]">Status</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po._id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-[hsl(var(--foreground))]">{po.poNumber}</td>
                    <td className="py-3 px-4 font-medium text-[hsl(var(--foreground))]">{po.materialName}</td>
                    <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">{po.vendorName}</td>
                    <td className="py-3 px-4 font-semibold text-[hsl(var(--foreground))]">{formatCost(po.amount)}</td>
                    <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">
                      {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border', getStatusStyle(po.status))}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PO Creation Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Issue Purchase Order (PO)
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitPO}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Material Description</label>
                    <Input required placeholder="e.g. Double Glazed Acoustic Glass Panels" value={materialName} onChange={(e) => setMaterialName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Vendor Name</label>
                    <Input required placeholder="e.g. Saint Gobain Glass Ltd" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Amount (INR)</label>
                      <Input required type="number" min={0} placeholder="e.g. 250000" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Status</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="pending">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="ordered">Ordered</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Expected Delivery Date</label>
                    <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Create PO
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
