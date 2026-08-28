'use client';

// Port of interior-os-frontend's projects/[projectId]/vendors/page.tsx.
// Vendors are fetched dynamically from the vendors API.
// Purchase Orders are also fetched to calculate project-specific stats 
// (Contracts Held and Total Contract Value) for each vendor.

import React, { useEffect, useState } from 'react';
import { Truck, Star, ShieldCheck, Clock, Loader2, Pencil, Trash2, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { CreateVendorModal } from '@/components/modals/CreateVendorModal';
import { useToast } from '@/providers/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface InteriorVendorsViewProps {
  projectId: string;
}

export default function InteriorVendorsView({ projectId }: InteriorVendorsViewProps) {
  const toast = useToast();
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVendorsAndPOs = async () => {
    try {
      setLoading(true);
      const [vendorRes, poRes] = await Promise.all([
        interiorProjectService.getVendors(),
        interiorProjectService.getPurchaseOrders(projectId)
      ]);
      
      if (vendorRes?.success && vendorRes.data) {
        setDbVendors(vendorRes.data);
      }
      if (poRes?.success && poRes.data) {
        setPos(poRes.data);
      }
    } catch (err) {
      console.error('Failed to load POs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchVendorsAndPOs();
  }, [projectId]);

  const handleVendorSaved = () => {
    fetchVendorsAndPOs();
    setEditingVendor(null);
    setIsAddVendorOpen(false);
  };

  const handleDeleteVendor = async () => {
    if (!vendorToDelete?._id) return;
    try {
      setIsDeleting(true);
      await interiorProjectService.deleteVendor(vendorToDelete._id);
      toast.success(`Vendor "${vendorToDelete.name}" deleted successfully.`);
      setVendorToDelete(null);
      fetchVendorsAndPOs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  const vendorsMap = new Map<string, { count: number; totalValue: number }>();
  pos.forEach((po) => {
    const name = po.vendorName || 'Unknown Vendor';
    const existing = vendorsMap.get(name) || { count: 0, totalValue: 0 };
    vendorsMap.set(name, {
      count: existing.count + 1,
      totalValue: existing.totalValue + (po.amount || 0),
    });
  });

  const vendors = dbVendors.map((vendor, index) => {
    const name = vendor.name;
    const stats = vendorsMap.get(name) || { count: 0, totalValue: 0 };
    
    const rating = [4.8, 4.2, 4.6, 3.9][index % 4] || 4.5;
    const compliance = [95, 88, 92, 75][index % 4] || 90;
    const onTime = [98, 80, 94, 70][index % 4] || 92;
    const trade = vendor.vendorCategory || ['Acoustic & Glazing', 'MEP Pipes', 'Interior Slabs', 'Finishes & Drywalls'][index % 4] || 'Fit-out Trades';
    const gstNumber = vendor.gstNumber;

    return {
      _id: vendor._id,
      name,
      trade,
      gstNumber,
      contractsCount: stats.count,
      totalValue: stats.totalValue,
      rating,
      compliance,
      onTime,
      raw: vendor,
    };
  });

  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Project Vendors & Subcontractors</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Review active trade partners and contract values.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingVendor(null);
            setIsAddVendorOpen(true);
          }}
          className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer"
        >
          + Add Vendor
        </button>
      </div>

      {vendors.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No vendors found in the database. Click "Add Vendor" to register a new vendor.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vendors.map((vendor) => (
            <Card key={vendor._id || vendor.name} className="hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-[hsl(var(--foreground))] truncate">{vendor.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{vendor.trade}</span>
                        {vendor.gstNumber && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded uppercase">
                            GST: {vendor.gstNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingVendor(vendor.raw)}
                      title="Edit Vendor"
                      className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setVendorToDelete(vendor.raw)}
                      title="Delete Vendor"
                      className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-[hsl(var(--border))] pt-4 mt-2">
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">Contracts Held</p>
                    <p className="font-semibold mt-0.5">{vendor.contractsCount} Purchase Orders</p>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))]">Total Contract Value</p>
                    <p className="font-semibold text-[hsl(var(--primary))] mt-0.5">{formatCost(vendor.totalValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      <CreateVendorModal 
        isOpen={isAddVendorOpen || !!editingVendor} 
        initialVendor={editingVendor}
        onClose={() => {
          setIsAddVendorOpen(false);
          setEditingVendor(null);
        }} 
        onSuccess={handleVendorSaved} 
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {vendorToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setVendorToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Delete Vendor</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Are you sure you want to remove <span className="font-bold text-[hsl(var(--foreground))]">"{vendorToDelete?.name}"</span>? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setVendorToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteVendor}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isDeleting ? 'Deleting...' : 'Delete Vendor'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
