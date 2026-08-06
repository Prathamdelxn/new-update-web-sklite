'use client';

// Port of interior-os-frontend's projects/[projectId]/vendors/page.tsx.
// Vendors are derived client-side from the Purchase Orders list (no
// dedicated vendors endpoint exists), same approach as the source page.

import React, { useEffect, useState } from 'react';
import { Truck, Star, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { CreateVendorModal } from '@/components/modals/CreateVendorModal';

interface InteriorVendorsViewProps {
  projectId: string;
}

export default function InteriorVendorsView({ projectId }: InteriorVendorsViewProps) {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        setLoading(true);
        const res = await interiorProjectService.getPurchaseOrders(projectId);
        if (res.success && res.data) {
          setPos(res.data);
        }
      } catch (err) {
        console.error('Failed to load POs', err);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchPOs();
  }, [projectId]);

  const handleVendorAdded = () => {
    // Optionally re-fetch vendors or pos here if needed
    // fetchPOs();
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

  const vendors = Array.from(vendorsMap.entries()).map(([name, stats], index) => {
    const rating = [4.8, 4.2, 4.6, 3.9][index % 4] || 4.5;
    const compliance = [95, 88, 92, 75][index % 4] || 90;
    const onTime = [98, 80, 94, 70][index % 4] || 92;
    const trade = ['Acoustic & Glazing', 'MEP Pipes', 'Interior Slabs', 'Finishes & Drywalls'][index % 4] || 'Fit-out Trades';

    return {
      name,
      trade,
      contractsCount: stats.count,
      totalValue: stats.totalValue,
      rating,
      compliance,
      onTime,
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
          onClick={() => setIsAddVendorOpen(true)}
          className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all"
        >
          + Add Vendor
        </button>
      </div>

      {vendors.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No active vendors found. Vendors are dynamically registered here once a Purchase Order is issued.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vendors.map((vendor) => (
            <Card key={vendor.name} className="hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{vendor.name}</h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{vendor.trade}</p>
                    </div>
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

      <CreateVendorModal 
        isOpen={isAddVendorOpen} 
        onClose={() => setIsAddVendorOpen(false)} 
        onSuccess={handleVendorAdded} 
      />
    </div>
  );
}
