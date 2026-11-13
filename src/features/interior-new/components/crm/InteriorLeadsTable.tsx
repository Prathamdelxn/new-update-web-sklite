'use client';

// Enhanced Leads Table with Search, Filter, Sort, Pagination, CSV Export, Grid/Table Switcher & Stage Handlers

import React, { useState, useMemo } from 'react';
import {
  Phone,
  Mail,
  User,
  Building,
  ArrowRight,
  UserCircle,
  Pencil,
  Trash2,
  Calendar,
  Search,
  SlidersHorizontal,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Lock,
  XCircle,
  ChevronDown,
  LayoutGrid,
  List,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

export interface InteriorLead {
  _id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  leadNumber?: string;
  leadSource?: string;
  propertyType?: string;
  projectLocation?: string;
  status: string;
  budgetRange?: string;
  assignedSalesExecutive?: { name?: string; firstName?: string; lastName?: string; fullName?: string; _id: string };
  createdAt: string;
  quotations?: any[];
  siteMeasurements?: any;
  sitePhotos?: string[];
  siteVisitScheduledDate?: string;
  designFiles?: any[];
  boqs?: any[];
}

interface InteriorLeadsTableProps {
  leads: InteriorLead[];
  isLoading: boolean;
  onEdit: (lead: InteriorLead) => void;
  onDelete?: (lead: InteriorLead) => void;
  onPassToFollowUp: (leadId: string) => void;
  onPassToSiteVisit?: (leadId: string) => void;
  onPassToRequirements?: (leadId: string) => void;
  onPassToDrawing?: (leadId: string) => void;
  onPassToBoq?: (leadId: string) => void;
  onAddBoq?: (leadId: string, boqIndex?: number) => void;
  onPassToQuotations?: (leadId: string) => void;
  onCreateQuotation?: (leadId: string) => void;
  onUploadDesign?: (leadId: string) => void;
  onLogRequirements?: (leadId: string) => void;
  onConvertToProject?: (leadId: string) => void;
  onMarkAsLost?: (leadId: string) => void;
  onReopenLead?: (leadId: string) => void;
  activeTab?: string;
}

function displayUserName(u?: { name?: string; firstName?: string; lastName?: string; fullName?: string }) {
  if (!u) return '';
  if (u.fullName) return u.fullName;
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return u.name || '';
}

function getLeadStatusInfo(lead: any) {
  const latestQuote = lead.quotations && lead.quotations.length > 0
    ? lead.quotations[lead.quotations.length - 1]
    : null;
  const hasAcceptedQuote = lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted');
  const hasRejectedQuote = latestQuote?.status === 'Rejected';

  if (lead.status === 'Won' || lead.status === 'Converted') {
    return { label: 'Converted', style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  }
  if (lead.status === 'Lost') {
    return { label: 'Lost', style: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
  }
  if (hasAcceptedQuote || lead.status === 'Booking Pending') {
    return { label: 'Quotation Approved ', style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  }
  if (hasRejectedQuote) {
    return { label: 'Quotation Rejected', style: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
  }
  if (lead.status === 'Under Quotation') {
    return { label: 'Under Quotation', style: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
  }
  if (lead.status === 'Site Measurement Done' || lead.status === 'Under Drawing' || lead.status === 'Design Approved') {
    return { label: lead.status, style: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  }
  if (lead.status === 'Site Visit Scheduled') {
    return { label: 'Site Visit Scheduled', style: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
  }
  if (lead.status === 'Follow-up') {
    return { label: 'Follow-up', style: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
  }
  if (lead.status === 'New Lead') {
    return { label: 'New Lead', style: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  }

  return { label: lead.status || 'Active', style: 'bg-slate-500/10 text-slate-600 border-slate-500/20' };
}

export const InteriorLeadsTable: React.FC<InteriorLeadsTableProps> = ({
  leads,
  isLoading,
  onEdit,
  onDelete,
  onPassToFollowUp,
  onPassToSiteVisit,
  onPassToRequirements,
  onPassToDrawing,
  onPassToBoq,
  onAddBoq,
  onPassToQuotations,
  onCreateQuotation,
  onUploadDesign,
  onLogRequirements,
  onConvertToProject,
  onMarkAsLost,
  onReopenLead,
  activeTab = 'leads',
}) => {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canDo = hasPermission;

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Available unique options for dropdowns
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.leadSource) set.add(l.leadSource);
    });
    return Array.from(set);
  }, [leads]);

  const availableProperties = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.propertyType) set.add(l.propertyType);
    });
    return Array.from(set);
  }, [leads]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.status) set.add(l.status);
    });
    return Array.from(set);
  }, [leads]);

  // Filtered & Sorted leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.mobileNumber.toLowerCase().includes(q) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.leadNumber && l.leadNumber.toLowerCase().includes(q)) ||
          (l.projectLocation && l.projectLocation.toLowerCase().includes(q))
      );
    }

    // Source Filter
    if (sourceFilter !== 'all') {
      result = result.filter((l) => l.leadSource === sourceFilter);
    }

    // Property Filter
    if (propertyFilter !== 'all') {
      result = result.filter((l) => l.propertyType === propertyFilter);
    }

    // Status Filter (mainly for master tab)
    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });

    return result;
  }, [leads, searchTerm, sourceFilter, propertyFilter, statusFilter, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (sourceFilter !== 'all') count++;
    if (propertyFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [sourceFilter, propertyFilter, statusFilter, sortBy]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    sourceFilter !== 'all' ||
    propertyFilter !== 'all' ||
    statusFilter !== 'all' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchTerm('');
    setSourceFilter('all');
    setPropertyFilter('all');
    setStatusFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = [
      'Lead Number',
      'Name',
      'Mobile Number',
      'Email',
      'Source',
      'Property Type',
      'Location',
      'Status',
      'Assigned Executive',
      'Created At',
    ];

    const rows = filteredLeads.map((l) => [
      `"${l.leadNumber || ''}"`,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.mobileNumber}"`,
      `"${l.email || ''}"`,
      `"${l.leadSource || ''}"`,
      `"${l.propertyType || ''}"`,
      `"${(l.projectLocation || '').replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${displayUserName(l.assignedSalesExecutive)}"`,
      `"${new Date(l.createdAt).toLocaleDateString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 shadow-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3.5">
      {/* ── 1. Controls & Filter Bar (Matching Projects & Vendors Layout) ── */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 space-y-3 shadow-2xs">
        {/* Top Control Line: Search Bar + Filter Toggle Button + View Switcher + Export */}
        <div className="flex items-center justify-between gap-3">
          {/* Search Box on Left */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads by name, phone, lead ID, location..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                'h-8.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border shrink-0 cursor-pointer',
                isFilterOpen || activeFiltersCount > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              )}
              title="Toggle Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                  isFilterOpen && 'rotate-180'
                )}
              />
            </button>

            {/* View Switcher: LayoutGrid vs List */}
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
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-md transition-all cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-white text-blue-600 shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-700'
                )}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Export CSV Button */}
            {hasPermission('crm_leads', 'export') && (
              <button
                onClick={handleExportCSV}
                disabled={filteredLeads.length === 0}
                className="h-8.5 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Export visible leads to CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filter Drawer Panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-200/80 pt-3 mt-1 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                {/* Source Filter */}
                <div className="lg:col-span-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Lead Source</label>
                    {sourceFilter !== 'all' && (
                      <button
                        onClick={() => {
                          setSourceFilter('all');
                          setCurrentPage(1);
                        }}
                        className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <select
                    value={sourceFilter}
                    onChange={(e) => {
                      setSourceFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="all">All Sources</option>
                    {availableSources.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Property Type Filter */}
                <div className="lg:col-span-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Property Type</label>
                    {propertyFilter !== 'all' && (
                      <button
                        onClick={() => {
                          setPropertyFilter('all');
                          setCurrentPage(1);
                        }}
                        className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <select
                    value={propertyFilter}
                    onChange={(e) => {
                      setPropertyFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="all">All Property Types</option>
                    {availableProperties.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter (if in master leads view) */}
                {activeTab === 'leads' ? (
                  <div className="lg:col-span-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">Pipeline Status</label>
                      {statusFilter !== 'all' && (
                        <button
                          onClick={() => {
                            setStatusFilter('all');
                            setCurrentPage(1);
                          }}
                          className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      {availableStatuses.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* Sort Order */}
                <div className={cn(activeTab === 'leads' ? 'lg:col-span-3' : 'lg:col-span-6', 'space-y-1.5')}>
                  <label className="text-xs font-semibold text-slate-700">Sort Order</label>
                  <select
                    value={sortBy}
                    onChange={(e: any) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer"
                  >
                    <option value="newest">Recently Created (Default)</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name_asc">Name: A → Z</option>
                    <option value="name_desc">Name: Z → A</option>
                  </select>
                </div>
              </div>

              {/* Reset Filters inside Drawer */}
              {hasActiveFilters && (
                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={resetFilters}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-medium text-slate-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 2. Leads Content: Cards Grid vs Enterprise Table ── */}
      {filteredLeads.length === 0 ? (
        <div className="w-full p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <User size={24} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">No Leads Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            {hasActiveFilters
              ? 'No leads matched your search or active filter criteria.'
              : "You don't have any leads in this stage yet."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID CARDS VIEW ── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {paginatedLeads.map((lead) => {
            const rawDigits = (lead.mobileNumber || '').replace(/\D/g, '');
            const whatsappPhone = rawDigits.startsWith('91') ? rawDigits : `91${rawDigits}`;
            const statusInfo = getLeadStatusInfo(lead);
            const assignedName = displayUserName(lead.assignedSalesExecutive);

            return (
              <div
                key={lead._id}
                onClick={() => router.push(`/interior-new/crm/leads/${lead._id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top Header: Avatar + Name + Lead Code + Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={lead.name}>
                          {lead.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                          <span className="font-mono font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                            {lead.leadNumber || 'LD-XXXX'}
                          </span>
                          <span className="text-slate-400 truncate">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={cn('shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase border', statusInfo.style)}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Middle Info Details */}
                  <div className="mt-3.5 space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate font-semibold text-slate-800">{lead.propertyType || 'Interior Project'}</span>
                      </div>
                      {lead.budgetRange && (
                        <span className="font-bold text-emerald-600 text-xs shrink-0">
                          ₹{lead.budgetRange}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 truncate text-slate-500 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{lead.projectLocation || 'Location pending'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                      <div className="flex items-center gap-1.5 truncate text-slate-500">
                        <UserCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{assignedName || 'Unassigned'}</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded bg-slate-200/60 text-slate-600 font-medium text-[10px] shrink-0">
                        {lead.leadSource || 'Direct'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Ribbon */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${lead.mobileNumber}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-all cursor-pointer"
                      title="Call Lead"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                    {rawDigits.length >= 10 && (
                      <a
                        href={`https://wa.me/${whatsappPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {lead.status === 'New Lead' && onPassToFollowUp && (canDo('crm_leads', 'update') || canDo('crm_followups', 'update') || canDo('crm_followups', 'create')) && (
                      <button
                        onClick={() => onPassToFollowUp(lead._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold border border-blue-200 transition-all cursor-pointer"
                        title="Schedule Follow-up"
                      >
                        <Calendar className="w-3 h-3" /> Follow-up
                      </button>
                    )}
                    {lead.status !== 'Won' && lead.status !== 'Converted' ? (
                      <>
                        {hasPermission('crm_leads', 'update') && canDo('crm_leads', 'update') && (
                          <button
                            onClick={() => onEdit(lead)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                            title="Edit Lead"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && hasPermission('crm_leads', 'delete') && canDo('crm_leads', 'delete') && (
                          <button
                            onClick={() => onDelete(lead)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onReopenLead && lead.status === 'Lost' && canDo('crm_leads', 'update') && (
                          <button
                            onClick={() => onReopenLead(lead._id)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Reopen
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <Lock className="w-3 h-3" /> Won
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      ) : (
        /* ── TABLE VIEW (Mobile Cards + Desktop Table) ── */
        <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          {/* MOBILE CARD VIEW (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {paginatedLeads.map((lead) => {
              const rawDigits = (lead.mobileNumber || '').replace(/\D/g, '');
              const whatsappPhone = rawDigits.startsWith('91') ? rawDigits : `91${rawDigits}`;
              const statusInfo = getLeadStatusInfo(lead);
              const assignedName = displayUserName(lead.assignedSalesExecutive);

              return (
                <div
                  key={lead._id}
                  onClick={() => router.push(`/interior-new/crm/leads/${lead._id}`)}
                  className="p-3.5 space-y-3 active:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  {/* Top Row: Avatar + Name + Lead Number + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          className="text-xs font-bold text-slate-900 truncate leading-snug max-w-[160px] sm:max-w-[240px]"
                          title={lead.name}
                        >
                          {lead.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                          <span className="font-mono font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                            {lead.leadNumber || 'LD-XXXX'}
                          </span>
                          <span className="text-slate-400 truncate">
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={cn('shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border', statusInfo.style)}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Middle Row: Info Grid */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building size={12} className="shrink-0 text-amber-500" />
                      <span className="truncate font-semibold text-slate-800">{lead.propertyType || 'Project'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate text-slate-500">{lead.projectLocation || 'Location pending'}</span>
                    </div>
                    {lead.budgetRange && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-emerald-600 font-bold">₹</span>
                        <span className="truncate font-bold text-emerald-600">{lead.budgetRange}</span>
                      </div>
                    )}
                    {assignedName ? (
                      <div className="flex items-center gap-1.5 truncate">
                        <UserCircle size={12} className="shrink-0 text-blue-500" />
                        <span className="truncate text-slate-600">{assignedName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 truncate text-[10px] text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="truncate">Unassigned</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Ribbon */}
                  <div className="flex items-center justify-between gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${lead.mobileNumber}`}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition-all cursor-pointer"
                        title="Call Lead"
                      >
                        <Phone size={12} /> Call
                      </a>
                      {rawDigits.length >= 10 && (
                        <a
                          href={`https://wa.me/${whatsappPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all cursor-pointer"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {lead.status === 'New Lead' && onPassToFollowUp && (
                        (canDo('crm_leads', 'update') || canDo('crm_followups', 'update') || canDo('crm_followups', 'create')) && (
                          <button
                            onClick={() => onPassToFollowUp(lead._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
                            title="Schedule Follow-up"
                          >
                            <Calendar size={12} /> Follow-up
                          </button>
                        )
                      )}

                      {lead.status !== 'Won' && lead.status !== 'Converted' ? (
                        <>
                          {hasPermission('crm_leads', 'update') && (
                            (canDo('crm_leads', 'update')) && (
                              <button
                                onClick={() => onEdit(lead)}
                                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                                title="Edit Lead"
                              >
                                <Pencil size={13} />
                              </button>
                            )
                          )}
                          {onDelete && hasPermission('crm_leads', 'delete') && (
                            (canDo('crm_leads', 'delete')) && (
                              <button
                                onClick={() => onDelete(lead)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                                title="Delete Lead"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                          <Lock size={10} /> Won
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (>= md) */}
          <div className="hidden md:block w-full overflow-hidden">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4.5 py-3 w-[28%]">Lead & Contact</th>
                  <th className="px-4 py-3 w-[22%]">Property & Location</th>
                  <th className="px-4 py-3 w-[18%]">Stage & Source</th>
                  <th className="px-4 py-3 w-[16%]">Assigned Rep</th>
                  <th className="px-4.5 py-3 text-right w-[16%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLeads.map((lead, idx) => {
                  const rawDigits = (lead.mobileNumber || '').replace(/\D/g, '');
                  const whatsappPhone = rawDigits.startsWith('91') ? rawDigits : `91${rawDigits}`;
                  const statusInfo = getLeadStatusInfo(lead);
                  const assignedName = displayUserName(lead.assignedSalesExecutive);

                  return (
                    <motion.tr
                      key={lead._id}
                      onClick={() => router.push(`/interior-new/crm/leads/${lead._id}`)}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.12, delay: idx * 0.015 }}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      {/* 1. Lead & Contact */}
                      <td className="px-4.5 py-3 max-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[160px] lg:max-w-[220px]"
                                title={lead.name}
                              >
                                {lead.name}
                              </span>
                              <span className="text-[10px] font-mono font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 shrink-0">
                                {lead.leadNumber || 'LD-XXXX'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500" onClick={(e) => e.stopPropagation()}>
                              <span className="font-medium text-slate-700 truncate">{lead.mobileNumber}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={`tel:${lead.mobileNumber}`}
                                  className="p-0.5 rounded text-slate-400 hover:text-emerald-600 transition-colors"
                                  title="Call Lead"
                                >
                                  <Phone size={11} />
                                </a>
                                {rawDigits.length >= 10 && (
                                  <a
                                    href={`https://wa.me/${whatsappPhone}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-0.5 rounded text-slate-400 hover:text-emerald-600 transition-colors"
                                    title="WhatsApp"
                                  >
                                    <MessageCircle size={11} />
                                  </a>
                                )}
                              </div>
                              {lead.email && (
                                <span className="hidden xl:inline-block truncate max-w-[110px] text-[10px]" title={lead.email}>
                                  • {lead.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Property & Location */}
                      <td className="px-4 py-3 max-w-0">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 min-w-0" title={lead.propertyType || 'Interior Project'}>
                            <Building size={12} className="text-amber-500 shrink-0" />
                            <span className="truncate block">{lead.propertyType || 'Interior Project'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 min-w-0" title={lead.projectLocation || 'Location pending'}>
                            <MapPin size={11} className="shrink-0 text-slate-400" />
                            <span className="truncate block">{lead.projectLocation || 'Location pending'}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Stage & Source */}
                      <td className="px-4 py-3">
                        <div className="min-w-0 space-y-1">
                          <div>
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase border',
                                statusInfo.style
                              )}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500">
                            <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-medium truncate max-w-[110px]" title={lead.leadSource || 'Direct'}>
                              {lead.leadSource || 'Direct'}
                            </span>
                            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Assigned Rep */}
                      <td className="px-4 py-3">
                        {assignedName ? (
                          <div
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 max-w-[140px] truncate"
                            title={assignedName}
                          >
                            <UserCircle size={13} className="text-blue-600 shrink-0" />
                            <span className="truncate">{assignedName}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* 5. Actions */}
                      <td className="px-4.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tab Specific Stage Actions */}
                          {activeTab === 'drawing' && onUploadDesign && (
                            (canDo('crm_drawings', 'create')) && (
                              <button
                                onClick={() => onUploadDesign(lead._id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                              >
                                Upload
                              </button>
                            )
                          )}

                          {activeTab === 'drawing' && onPassToBoq && lead.designFiles && lead.designFiles.length > 0 && (
                            (canDo('crm_drawings', 'update') || canDo('crm_boq', 'update') || canDo('crm_boq', 'create')) && (
                              <button
                                onClick={() => onPassToBoq(lead._id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-cyan-600 text-white hover:bg-cyan-700 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                              >
                                Pass <ArrowRight size={11} />
                              </button>
                            )
                          )}

                          {activeTab === 'boq' && onAddBoq && (
                            (() => {
                              const hasAcceptedQuote = lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted');
                              const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean((lead as any).linkedProject);

                              if (isQuotationApproved) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[11px] font-semibold" title="Quotation is approved, BOQ locked">
                                    <Lock size={10} /> Locked
                                  </span>
                                );
                              }

                              return (
                                (((lead.boqs && lead.boqs.length > 0 && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? canDo('crm_boq', 'update') : canDo('crm_boq', 'create'))) && (
                                  <button
                                    onClick={() => onAddBoq(lead._id, (lead.boqs && lead.boqs.length > 0 && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? lead.boqs.length - 1 : undefined)}
                                    className={cn(
                                      "inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs",
                                      (!lead.boqs || lead.boqs.length === 0)
                                        ? "gap-1 px-2.5 py-1.5 bg-teal-600 text-white hover:bg-teal-700"
                                        : "p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                                    )}
                                    title={(!lead.boqs || lead.boqs.length === 0) ? 'Create BOQ' : 'Edit BOQ'}
                                  >
                                    {(!lead.boqs || lead.boqs.length === 0) ? '+ BOQ' : <Pencil size={13} className="text-teal-600" />}
                                  </button>
                                )
                              );
                            })()
                          )}

                          {activeTab === 'boq' && onPassToQuotations && lead.boqs && lead.boqs.length > 0 && (
                            (canDo('crm_boq', 'update') || canDo('crm_quotations', 'update') || canDo('crm_quotations', 'create')) && (
                              <button
                                onClick={() => onPassToQuotations(lead._id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
                              >
                                Pass <ArrowRight size={11} />
                              </button>
                            )
                          )}

                          {/* Master Leads Actions */}
                          {(activeTab === 'leads' || activeTab === 'lost_leads') && (
                            <>
                              {lead.status === 'New Lead' && onPassToFollowUp && (
                                (canDo('crm_leads', 'update') || canDo('crm_followups', 'update') || canDo('crm_followups', 'create')) && (
                                  <button
                                    onClick={() => onPassToFollowUp(lead._id)}
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all border border-blue-200 cursor-pointer"
                                    title="Schedule Follow-up"
                                  >
                                    <Calendar size={13} />
                                  </button>
                                )
                              )}

                              {lead.status !== 'Won' && lead.status !== 'Converted' ? (
                                <>
                                  {hasPermission('crm_leads', 'update') && (
                                    (canDo('crm_leads', 'update')) && (
                                      <button
                                        onClick={() => onEdit(lead)}
                                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg transition-all border border-slate-200 cursor-pointer"
                                        title="Edit Lead"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                    )
                                  )}

                                  {onDelete && hasPermission('crm_leads', 'delete') && (
                                    (canDo('crm_leads', 'delete')) && (
                                      <button
                                        onClick={() => onDelete(lead)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all border border-rose-200 cursor-pointer"
                                        title="Delete Lead"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )
                                  )}

                                  {onReopenLead && lead.status === 'Lost' && (
                                    (canDo('crm_leads', 'update')) && (
                                      <button
                                        onClick={() => onReopenLead(lead._id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all border border-emerald-200 cursor-pointer font-semibold text-xs"
                                        title="Reopen Lost Lead"
                                      >
                                        <RotateCcw size={12} />
                                        <span>Reopen</span>
                                      </button>
                                    )
                                  )}

                                  {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(lead.status) && (
                                    (canDo('crm_leads', 'update')) && (
                                      <button
                                        onClick={() => onMarkAsLost(lead._id)}
                                        className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-all border border-orange-200 cursor-pointer"
                                        title="Mark as Lost"
                                      >
                                        <XCircle size={13} />
                                      </button>
                                    )
                                  )}
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg" title="Converted to Project (Locked)">
                                  <Lock size={10} /> Locked
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 3. Pagination Footer ── */}
      {filteredLeads.length > 0 && (
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-500 font-medium">
            <span>
              Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(currentPage * pageSize, filteredLeads.length)}</strong> of{' '}
              <strong>{filteredLeads.length}</strong> leads
            </span>

            <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center sm:justify-end gap-1.5 self-center sm:self-auto">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="flex items-center gap-1 px-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'w-7 h-7 rounded-lg font-bold text-xs transition-all shrink-0 cursor-pointer',
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return (
                      <span key={pageNum} className="text-slate-400 px-0.5">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
