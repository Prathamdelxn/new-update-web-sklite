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
  User,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Loader2,
  RefreshCw,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { CreateVendorModal } from '@/components/modals/CreateVendorModal';
import { useToast } from '@/providers/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';
import { cn } from '@/lib/utils';

function VendorCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-none flex flex-col justify-between space-y-4 animate-pulse">
      {/* Top Row Skeleton */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/60 shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-4 w-32 bg-slate-200/90 rounded-md" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-16 bg-slate-200/60 rounded-md" />
              <div className="h-3.5 w-20 bg-slate-100 border border-slate-200/60 rounded" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-slate-100" />
          <div className="w-7 h-7 rounded-lg bg-slate-100" />
        </div>
      </div>

      {/* Details Row Skeleton */}
      <div className="space-y-2 border-t border-slate-100 pt-3 mt-2">
        <div className="flex items-center gap-2">
          <div className="h-3 w-14 bg-slate-200/50 rounded" />
          <div className="h-3.5 w-28 bg-slate-200/80 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-14 bg-slate-200/50 rounded" />
          <div className="h-3.5 w-36 bg-slate-200/80 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-14 bg-slate-200/50 rounded" />
          <div className="h-3.5 w-24 bg-slate-200/80 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-14 bg-slate-200/50 rounded" />
          <div className="h-3.5 w-44 bg-slate-200/80 rounded" />
        </div>
      </div>

      {/* Bottom Category/Status Skeleton */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="h-5 w-20 bg-slate-100 rounded-full" />
        <div className="h-5 w-16 bg-slate-100 rounded-full" />
      </div>
    </div>
  );
}

function VendorTableSkeleton() {
  return (
    <Card className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-none animate-pulse">
      <div className="overflow-x-auto min-w-full p-4 space-y-3">
        <div className="h-8 bg-slate-100 rounded-lg w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-50 border border-slate-100 rounded-lg w-full" />
        ))}
      </div>
    </Card>
  );
}

function InteriorVendorsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, idx) => (
        <VendorCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export default function InteriorVendorsManagementView() {
  const toast = useToast();
  const { hasPermission: canDo } = usePermissions();
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name-asc' | 'name-desc' | 'category'>('newest');

  // Layout View Switcher (Grid vs Table List)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
    const standard = ['All', 'Raw Materials', 'Furniture', 'Electrical', 'Labour', 'Paint', 'Other'];
    const custom = new Set<string>();
    dbVendors.forEach((v) => {
      const cat = v.vendorCategory || v.category;
      if (cat && !standard.includes(cat)) {
        custom.add(cat);
      }
    });
    return [...standard, ...Array.from(custom)];
  }, [dbVendors]);

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (statusFilter !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [selectedCategory, statusFilter, sortBy]);

  const filteredVendors = useMemo(() => {
    const list = dbVendors.filter((v) => {
      const name = (v.name || v.companyName || '').toLowerCase();
      const code = (v.vendorCode || '').toLowerCase();
      const contact = (v.contactPerson || '').toLowerCase();
      const email = (v.email || '').toLowerCase();
      const phone = (v.phoneNumber || v.phone || '').toLowerCase();
      const gst = (v.gstNumber || '').toLowerCase();
      const cat = (v.vendorCategory || v.category || 'Other').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        code.includes(q) ||
        contact.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        gst.includes(q) ||
        cat.includes(q);

      const matchesCategory =
        selectedCategory === 'All' ||
        (v.vendorCategory || v.category || 'Other') === selectedCategory;

      const vendorStatus = v.status || 'Active';
      const matchesStatus =
        statusFilter === 'all' ||
        vendorStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'category') {
        const catA = a.vendorCategory || a.category || 'Other';
        const catB = b.vendorCategory || b.category || 'Other';
        return catA.localeCompare(catB);
      }
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
  }, [dbVendors, searchQuery, selectedCategory, statusFilter, sortBy]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Organization Vendors & Subcontractors
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {dbVendors.length} {dbVendors.length === 1 ? 'Partner' : 'Partners'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization-wide trade partners, material suppliers, and contact details.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchVendors}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            title="Refresh vendor list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canDo('vendors', 'create') && (
            <button
              onClick={() => {
                setEditingVendor(null);
                setIsAddVendorOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              + Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Filter & Search Control Bar (Matching Project Tab Style) ── */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors by name, category, contact, email, GSTIN..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Category Dropdown Filter (replaces line of pills) */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-8.5 pl-3 pr-8 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer appearance-none shadow-2xs"
                title="Filter by Category"
              >
                <option value="All">All Categories</option>
                {categories
                  .filter((cat) => cat !== 'All')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Toggle Button (Matching Project Tab) */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                'h-8.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border shrink-0 cursor-pointer',
                isFilterOpen || activeFilterCount > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              )}
              title="Toggle Advanced Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                  isFilterOpen && 'rotate-180'
                )}
              />
            </button>

            {/* View Switcher: LayoutGrid vs List (Matching Project Tab) */}
            <div className="flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 h-8.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-all cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-700'
                )}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-all cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-700'
                )}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filter Drawer Panel (Matching Project Tab) */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-200/80 pt-3 mt-1 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
                {/* Category Dropdown */}
                <div className="md:col-span-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Vendor Category</label>
                    {selectedCategory !== 'All' && (
                      <button
                        onClick={() => setSelectedCategory('All')}
                        className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {categories
                      .filter((c) => c !== 'All')
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="md:col-span-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Partner Status</label>
                    {statusFilter !== 'all' && (
                      <button
                        onClick={() => setStatusFilter('all')}
                        className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Active">Active Only</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Sort Order Dropdown */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Sort Order</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="newest">Recently Added (Default)</option>
                    <option value="name-asc">Vendor Name: A → Z</option>
                    <option value="name-desc">Vendor Name: Z → A</option>
                    <option value="category">Category</option>
                  </select>
                </div>

                {/* Reset Action */}
                <div className="md:col-span-2 flex items-center justify-end">
                  {activeFilterCount > 0 ? (
                    <button
                      onClick={() => {
                        setSelectedCategory('All');
                        setStatusFilter('all');
                        setSortBy('newest');
                      }}
                      className="w-full py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-medium text-slate-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Filters
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 text-right w-full">Default sorting applied</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. Vendors Content: Grid vs Table List ── */}
      {loading ? (
        viewMode === 'grid' ? <InteriorVendorsSkeleton /> : <VendorTableSkeleton />
      ) : filteredVendors.length === 0 ? (
        <Card className="p-12 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <Truck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="font-bold text-base text-slate-900">
            {searchQuery || activeFilterCount > 0
              ? 'No matching vendors found'
              : 'No vendors registered yet'}
          </p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {searchQuery || activeFilterCount > 0
              ? 'Try adjusting your search query or filters.'
              : 'Click "+ Add Vendor" to register suppliers and subcontractors for your organization.'}
          </p>
          {canDo('vendors', 'create') && (
            <button
              onClick={() => {
                setEditingVendor(null);
                setIsAddVendorOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              + Add Vendor
            </button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        /* ── GRID CARDS VIEW ── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredVendors.map((vendor, index) => {
            const vId = vendor._id || vendor.id;
            const category = vendor.vendorCategory || vendor.category || 'Trade Partner';
            const status = vendor.status || 'Active';
            const vendorCode = vendor.vendorCode || `VND-${String(index + 1).padStart(3, '0')}`;

            return (
              <div
                key={vId}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md hover:border-blue-300 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Clean Light Truck Icon Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 truncate" title={vendor.name}>
                            {vendor.name}
                          </h3>
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                            {vendorCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {category}
                          </span>

                          {vendor.gstNumber && (
                            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                              GST: {vendor.gstNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {canDo('vendors', 'update') && (
                        <button
                          onClick={() => {
                            setEditingVendor(vendor);
                            setIsAddVendorOpen(true);
                          }}
                          title="Edit Vendor"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDo('vendors', 'delete') && (
                        <button
                          onClick={() => setVendorToDelete(vendor)}
                          title="Delete Vendor"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Clean Inset Contact Details Panel (Pure Light Theme) */}
                  <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs">
                    {/* Contact Person */}
                    <div className="flex items-center gap-2.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-400 w-14 shrink-0">Contact</span>
                      <span className="font-medium text-slate-800 truncate">
                        {vendor.contactPerson || <span className="text-slate-400 italic font-normal">—</span>}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-400 w-14 shrink-0">Email</span>
                      {vendor.email ? (
                        <a
                          href={`mailto:${vendor.email}`}
                          className="text-blue-600 hover:underline truncate font-medium"
                          title={vendor.email}
                        >
                          {vendor.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic font-normal">—</span>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-400 w-14 shrink-0">Phone</span>
                      {vendor.phoneNumber ? (
                        <a
                          href={`tel:${vendor.phoneNumber}`}
                          className="font-mono text-slate-800 hover:text-blue-600 hover:underline"
                        >
                          {vendor.phoneNumber}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic font-normal">—</span>
                      )}
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-400 w-14 shrink-0">Address</span>
                      <span className="text-slate-600 truncate flex-1" title={vendor.address}>
                        {vendor.address || <span className="text-slate-400 italic font-normal">—</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Row */}
                <div className="pt-3.5 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-medium text-emerald-700">
                      {status} Partner
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {vendor.phoneNumber && (
                      <a
                        href={`https://wa.me/${vendor.phoneNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Chat on WhatsApp"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {vendor.email && (
                      <a
                        href={`mailto:${vendor.email}`}
                        title="Send Email"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      ) : (
        /* ── TABLE / LIST VIEW (Matching Project Tab Style) ── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-2xs">
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Vendor & Code</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Contact Person</th>
                    <th className="py-3.5 px-4">Email & Phone</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVendors.map((vendor, index) => {
                    const vId = vendor._id || vendor.id;
                    const category = vendor.vendorCategory || vendor.category || 'Trade Partner';
                    const status = vendor.status || 'Active';
                    const vendorCode = vendor.vendorCode || `VND-${String(index + 1).padStart(3, '0')}`;

                    return (
                      <tr
                        key={vId}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Vendor & Code */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[200px]"
                                  title={vendor.name}
                                >
                                  {vendor.name}
                                </span>
                                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                                  {vendorCode}
                                </span>
                              </div>
                              {vendor.gstNumber && (
                                <span className="text-[10px] font-mono text-slate-400 block truncate">
                                  GST: {vendor.gstNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                            {category}
                          </span>
                        </td>

                        {/* Contact Person */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {vendor.contactPerson ? (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{vendor.contactPerson}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Email & Phone */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {vendor.email ? (
                              <a
                                href={`mailto:${vendor.email}`}
                                className="text-blue-600 hover:underline truncate block max-w-[180px] font-medium"
                                title={vendor.email}
                              >
                                {vendor.email}
                              </a>
                            ) : null}
                            {vendor.phoneNumber ? (
                              <a
                                href={`tel:${vendor.phoneNumber}`}
                                className="text-slate-600 hover:text-blue-600 font-mono text-[11px] block"
                              >
                                {vendor.phoneNumber}
                              </a>
                            ) : null}
                            {!vendor.email && !vendor.phoneNumber && (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </div>
                        </td>

                        {/* Address */}
                        <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate" title={vendor.address}>
                          {vendor.address ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{vendor.address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {vendor.phoneNumber && (
                              <a
                                href={`https://wa.me/${vendor.phoneNumber.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                            {vendor.email && (
                              <a
                                href={`mailto:${vendor.email}`}
                                title="Send Email"
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                            {canDo('vendors', 'update') && (
                              <button
                                onClick={() => {
                                  setEditingVendor(vendor);
                                  setIsAddVendorOpen(true);
                                }}
                                title="Edit Vendor"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDo('vendors', 'delete') && (
                              <button
                                onClick={() => setVendorToDelete(vendor)}
                                title="Delete Vendor"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── 4. Add / Edit Vendor Modal ── */}
      <CreateVendorModal
        isOpen={isAddVendorOpen || !!editingVendor}
        initialVendor={editingVendor}
        onClose={() => {
          setIsAddVendorOpen(false);
          setEditingVendor(null);
        }}
        onSuccess={handleVendorSaved}
      />

      {/* ── 5. Delete Confirmation Modal ── */}
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
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600 shrink-0 border border-red-100">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Vendor</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to remove <span className="font-bold text-slate-800">"{vendorToDelete?.name}"</span> from the organization directory? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setVendorToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
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
