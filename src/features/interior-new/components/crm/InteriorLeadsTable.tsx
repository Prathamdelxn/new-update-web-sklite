'use client';

// Enhanced Leads Table with Search, Filter, Sort, Pagination, CSV Export & Stage Handlers

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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  onAddBoq?: (leadId: string) => void;
  onPassToQuotations?: (leadId: string) => void;
  onCreateQuotation?: (leadId: string) => void;
  onUploadDesign?: (leadId: string) => void;
  onLogRequirements?: (leadId: string) => void;
  onConvertToProject?: (leadId: string) => void;
  onMarkAsLost?: (leadId: string) => void;
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
    return { label: 'Quotation Approved ✓', style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  }
  if (hasRejectedQuote) {
    return { label: 'Quotation Rejected', style: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
  }
  if (['Under Quotation', 'Quotation Pending', 'Quotation Sent', 'Negotiation'].includes(lead.status)) {
    return { label: 'Under Quotation', style: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
  }
  if (lead.status === 'Under BOQ Creation' || lead.status === 'BOQ Completed') {
    return { label: lead.status, style: 'bg-teal-500/10 text-teal-600 border-teal-500/20' };
  }
  if (lead.status === 'Under Drawing' || lead.status === 'Design Approved') {
    return { label: lead.status, style: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' };
  }
  if (lead.status === 'Under Requirement' || lead.status === 'Requirement Completed') {
    return { label: lead.status, style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  }
  if (lead.status === 'Under Site Visit' || lead.status === 'Measurement Done') {
    return { label: lead.status, style: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
  }
  if (lead.status === 'Contacted') {
    return { label: 'Contacted', style: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' };
  }
  if (lead.status === 'New Lead') {
    return { label: 'New Lead', style: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  }
  return { label: lead.status || 'New Lead', style: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
}

export const InteriorLeadsTable: React.FC<InteriorLeadsTableProps> = ({
  leads,
  isLoading,
  onEdit,
  onDelete,
  onPassToFollowUp,
  onPassToBoq,
  onAddBoq,
  onPassToQuotations,
  onUploadDesign,
  onMarkAsLost,
  activeTab = 'leads',
}) => {
  const router = useRouter();

  // Search, Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-6 flex flex-col gap-4 shadow-sm">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search by name, phone, email, lead ID or location..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all border border-rose-500/20"
                title="Reset all filters"
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}

            <button
              onClick={handleExportCSV}
              disabled={filteredLeads.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] rounded-xl transition-all border border-[hsl(var(--border))] disabled:opacity-50"
              title="Export visible leads to CSV"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2.5 flex-wrap pt-1 border-t border-[hsl(var(--border)/0.6)]">
          <div className="flex items-center gap-1 text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mr-1">
            <SlidersHorizontal size={13} /> Filters:
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] outline-none focus:border-indigo-500"
          >
            <option value="all">All Sources</option>
            {availableSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Property Type Filter */}
          <select
            value={propertyFilter}
            onChange={(e) => {
              setPropertyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] outline-none focus:border-indigo-500"
          >
            <option value="all">All Property Types</option>
            {availableProperties.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Status Filter (if in master leads view) */}
          {activeTab === 'leads' && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              {availableStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          )}

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e: any) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="ml-auto px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] outline-none focus:border-indigo-500"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="name_asc">Sort: Name (A-Z)</option>
            <option value="name_desc">Sort: Name (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="w-full p-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-[hsl(var(--muted))] rounded-2xl flex items-center justify-center text-[hsl(var(--muted-foreground))] mb-3">
              <User size={28} />
            </div>
            <h3 className="text-base font-extrabold text-[hsl(var(--foreground))]">No Leads Found</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mt-1 mb-4">
              {hasActiveFilters
                ? 'No leads matched your search or active filter criteria.'
                : "You don't have any leads in this stage yet."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-[10px] font-black uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 rounded-tl-2xl">Lead Info</th>
                  <th className="px-6 py-3.5">Contact & Actions</th>
                  <th className="px-6 py-3.5">Source</th>
                  <th className="px-6 py-3.5">Assigned To</th>
                  <th className="px-6 py-3.5">Property Info</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {paginatedLeads.map((lead, idx) => {
                  const rawDigits = (lead.mobileNumber || '').replace(/\D/g, '');
                  const whatsappPhone = rawDigits.startsWith('91') ? rawDigits : `91${rawDigits}`;

                  return (
                    <motion.tr
                      key={lead._id}
                      onClick={() => router.push(`/interior-new/crm/leads/${lead._id}`)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: idx * 0.02 }}
                      className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
                    >
                      {/* Lead Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 font-extrabold text-xs shrink-0">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-[hsl(var(--foreground))] group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                              {lead.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                {lead.leadNumber || 'LD-XXXX'}
                              </span>
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                {new Date(lead.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Quick Communication */}
                      <td className="px-6 py-4 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                            {lead.mobileNumber}
                          </span>
                          <a
                            href={`tel:${lead.mobileNumber}`}
                            className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                            title="Call Lead"
                          >
                            <Phone size={13} />
                          </a>
                          {rawDigits.length >= 10 && (
                            <a
                              href={`https://wa.me/${whatsappPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                            <Mail size={11} className="shrink-0" />
                            <a
                              href={`mailto:${lead.email}`}
                              className="truncate max-w-[150px] hover:underline hover:text-[hsl(var(--foreground))]"
                            >
                              {lead.email}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-semibold">
                          {lead.leadSource || 'Direct'}
                        </span>
                      </td>

                      {/* Assigned To */}
                      <td className="px-6 py-4">
                        {lead.assignedSalesExecutive ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.6)] px-2.5 py-1 rounded-lg border border-[hsl(var(--border))] w-max">
                            <UserCircle size={14} className="text-indigo-600 shrink-0" />
                            {displayUserName(lead.assignedSalesExecutive)}
                          </div>
                        ) : (
                          <span className="text-xs text-[hsl(var(--muted-foreground))] italic">Unassigned</span>
                        )}
                      </td>

                      {/* Property Info */}
                      <td className="px-6 py-4 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-semibold">
                          <Building size={13} className="text-[hsl(var(--muted-foreground))]" />
                          {lead.propertyType || 'Interior Project'}
                        </div>
                        {lead.projectLocation ? (
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate max-w-[150px] flex items-center gap-1">
                            <MapPin size={11} className="shrink-0" />
                            {lead.projectLocation}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[hsl(var(--muted-foreground))] italic">Location pending</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {(() => {
                          const statusInfo = getLeadStatusInfo(lead);
                          return (
                            <span
                              className={cn(
                                'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border',
                                statusInfo.style
                              )}
                            >
                              {statusInfo.label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTab === 'drawing' && onUploadDesign && (
                            <button
                              onClick={() => onUploadDesign(lead._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all"
                            >
                              Upload Drawing
                            </button>
                          )}

                          {activeTab === 'drawing' && onPassToBoq && lead.designFiles && lead.designFiles.length > 0 && (
                            <button
                              onClick={() => onPassToBoq(lead._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white hover:bg-cyan-700 rounded-lg text-xs font-bold transition-all"
                            >
                              Pass <ArrowRight size={13} />
                            </button>
                          )}

                          {activeTab === 'boq' && onAddBoq && (
                            <button
                              onClick={() => onAddBoq(lead._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-xs font-bold transition-all"
                            >
                              {(!lead.boqs || lead.boqs.length === 0) ? 'Add BOQ' : 'View/Edit'}
                            </button>
                          )}

                          {activeTab === 'boq' && onPassToQuotations && lead.boqs && lead.boqs.length > 0 && (
                            <button
                              onClick={() => onPassToQuotations(lead._id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                            >
                              Pass <ArrowRight size={13} />
                            </button>
                          )}

                          {/* Master Leads & Lost Leads Action Buttons */}
                          {(activeTab === 'leads' || activeTab === 'lost_leads') && (
                            <>
                              {lead.status === 'New Lead' && onPassToFollowUp && (
                                <button
                                  onClick={() => onPassToFollowUp(lead._id)}
                                  className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-xl transition-all border border-blue-500/20"
                                  title="Schedule Follow-up"
                                >
                                  <Calendar size={14} />
                                </button>
                              )}

                              {lead.status !== 'Won' && lead.status !== 'Converted' ? (
                                <>
                                  <button
                                    onClick={() => onEdit(lead)}
                                    className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-xl transition-all border border-[hsl(var(--border))]"
                                    title="Edit Lead"
                                  >
                                    <Pencil size={14} />
                                  </button>

                                  {onDelete && (
                                    <button
                                      onClick={() => onDelete(lead)}
                                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl transition-all border border-rose-500/20"
                                      title="Delete Lead"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}

                                  {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(lead.status) && (
                                    <button
                                      onClick={() => onMarkAsLost(lead._id)}
                                      className="p-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-xl transition-all border border-orange-500/20"
                                      title="Mark as Lost"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl" title="Converted to Project (Locked)">
                                  <Lock size={11} /> Locked
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
        )}

        {/* Pagination Footer */}
        {filteredLeads.length > 0 && (
          <div className="px-6 py-4 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))] font-medium">
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, filteredLeads.length)}</strong> of{' '}
                <strong>{filteredLeads.length}</strong> leads
              </span>

              <div className="flex items-center gap-1.5 ml-2">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show first, last, and window around current
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
                            'w-7 h-7 rounded-lg font-bold text-xs transition-all',
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return (
                        <span key={pageNum} className="text-[hsl(var(--muted-foreground))] px-0.5">
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
                  className="p-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Next Page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

