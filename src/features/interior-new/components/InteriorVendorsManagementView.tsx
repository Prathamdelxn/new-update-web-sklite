'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Organization-Level Vendor Management View
// Matches the interior project vendor design & theme, organization-wide.
// =============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  Truck,
  Building2,
  Search,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Landmark,
  ShieldCheck,
  CreditCard,
  Loader2,
  RefreshCw,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { CreateVendorModal } from '@/components/modals/CreateVendorModal';
import { useToast } from '@/providers/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function InteriorVendorsManagementView() {
  const toast = useToast();
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getVendors();
      if (res?.success && res.data) {
        setDbVendors(res.data);
      } else if (Array.isArray(res)) {
        setDbVendors(res);
      } else if (res?.data && Array.isArray(res.data)) {
        setDbVendors(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load vendors', err);
      toast.error('Failed to load vendors list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleVendorSaved = () => {
    fetchVendors();
    setEditingVendor(null);
    setIsAddVendorOpen(false);
  };

  const handleDeleteVendor = async () => {
    if (!vendorToDelete?._id && !vendorToDelete?.id) return;
    const vendorId = vendorToDelete._id || vendorToDelete.id;
    try {
      setIsDeleting(true);
      await interiorProjectService.deleteVendor(vendorId);
      toast.success(`Vendor "${vendorToDelete.name}" deleted successfully.`);
      setVendorToDelete(null);
      fetchVendors();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = useMemo(() => {
    return ['All', 'Raw Materials', 'Furniture', 'Electrical', 'Labour', 'Paint', 'Other'];
  }, []);

  const filteredVendors = useMemo(() => {
    return dbVendors.filter((v) => {
      const name = (v.name || v.companyName || '').toLowerCase();
      const contact = (v.contactPerson || '').toLowerCase();
      const email = (v.email || '').toLowerCase();
      const phone = (v.phoneNumber || v.phone || '').toLowerCase();
      const gst = (v.gstNumber || '').toLowerCase();
      const cat = (v.vendorCategory || v.category || 'Other').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        contact.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        gst.includes(q) ||
        cat.includes(q);

      const matchesCategory =
        selectedCategory === 'All' ||
        (v.vendorCategory || v.category || 'Other') === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [dbVendors, searchQuery, selectedCategory]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
              Organization Vendors & Subcontractors
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
              {dbVendors.length} {dbVendors.length === 1 ? 'Partner' : 'Partners'}
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Manage organization-wide trade partners, material suppliers, contact details & bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchVendors}
            disabled={loading}
            className="p-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
            title="Refresh vendor list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingVendor(null);
              setIsAddVendorOpen(true);
            }}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            + Add Vendor
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[hsl(var(--card))] p-3 rounded-xl border border-[hsl(var(--border))]">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendors by name, category, contact, email, GSTIN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] text-[hsl(var(--foreground))]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[hsl(var(--primary))] text-white shadow-xs'
                    : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vendors Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : filteredVendors.length === 0 ? (
        <Card className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
          <Truck className="w-10 h-10 text-[hsl(var(--muted-foreground))] opacity-40 mx-auto mb-3" />
          <p className="font-bold text-base text-[hsl(var(--foreground))]">
            {searchQuery ? 'No matching vendors found' : 'No vendors registered yet'}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-4">
            {searchQuery
              ? 'Try adjusting your search query or category filter.'
              : 'Click "+ Add Vendor" to register suppliers and subcontractors for your organization.'}
          </p>
          <button
            onClick={() => {
              setEditingVendor(null);
              setIsAddVendorOpen(true);
            }}
            className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            + Add Vendor
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVendors.map((vendor) => {
            const vId = vendor._id || vendor.id;
            const category = vendor.vendorCategory || vendor.category || 'Trade Partner';
            const status = vendor.status || 'Active';

            return (
              <Card
                key={vId}
                className="hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Card Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[hsl(var(--foreground))] truncate">
                          {vendor.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            {category}
                          </span>
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
                        onClick={() => {
                          setEditingVendor(vendor);
                          setIsAddVendorOpen(true);
                        }}
                        title="Edit Vendor"
                        className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setVendorToDelete(vendor)}
                        title="Delete Vendor"
                        className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Vendor Details Grid */}
                  <div className="space-y-1.5 text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-3 mt-2">
                    {vendor.contactPerson && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] min-w-[65px] opacity-70">Contact:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))] truncate">
                          {vendor.contactPerson}
                        </span>
                      </div>
                    )}

                    {vendor.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] min-w-[65px] opacity-70">Email:</span>
                        <a
                          href={`mailto:${vendor.email}`}
                          className="text-[hsl(var(--primary))] hover:underline truncate"
                        >
                          {vendor.email}
                        </a>
                      </div>
                    )}

                    {vendor.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] min-w-[65px] opacity-70">Phone:</span>
                        <a
                          href={`tel:${vendor.phoneNumber}`}
                          className="text-[hsl(var(--foreground))] hover:underline"
                        >
                          {vendor.phoneNumber}
                        </a>
                      </div>
                    )}

                    {vendor.address && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] min-w-[65px] opacity-70">Address:</span>
                        <span className="truncate text-[hsl(var(--foreground))]">
                          {vendor.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Banking & Payment Terms */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-[hsl(var(--border))] pt-3 mt-2">
                    <div>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Payment Terms</p>
                      <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5">
                        {vendor.paymentTerms || 'Standard'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Bank Account</p>
                      <p className="font-semibold text-[hsl(var(--primary))] mt-0.5 truncate">
                        {vendor.bankDetails?.accountNumber
                          ? `${vendor.bankDetails.bankName || 'Bank'} (••${vendor.bankDetails.accountNumber.slice(-4)})`
                          : 'Not Provided'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
                    Are you sure you want to remove <span className="font-bold text-[hsl(var(--foreground))]">"{vendorToDelete?.name}"</span> from the organization directory? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setVendorToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteVendor}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
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
