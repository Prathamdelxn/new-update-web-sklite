'use client';

// Dedicated Drawings & 3D Design View with All / Pending / Completed Filter Tabs, Search, and Stage Handlers

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Upload,
  ArrowRight,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
  MapPin,
  Home,
  Palette,
  UploadCloud,
  XCircle,
  Share2,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { InteriorCrmShareModal } from './modals/InteriorCrmShareModal';

interface Props {
  leads: any[];
  onUploadDesign: (leadId: string) => void;
  onPassToBoq?: (leadId: string) => void;
  onMarkAsLost?: (leadId: string) => void;
}

function displayUserName(u?: any) {
  if (!u) return '';
  if (typeof u !== 'object') return 'Assigned';
  if (u.fullName) return u.fullName;
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return u.name || 'Assigned';
}

export const InteriorDrawingsView = ({ leads, onUploadDesign, onPassToBoq, onMarkAsLost }: Props) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'pending' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [shareLead, setShareLead] = useState<any | null>(null);

  const pendingCount = useMemo(
    () => leads.filter((l) => !l.designFiles || l.designFiles.length === 0).length,
    [leads]
  );
  const completedCount = useMemo(
    () => leads.filter((l) => l.designFiles && l.designFiles.length > 0).length,
    [leads]
  );

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (filterState === 'completed') {
      result = result.filter((l) => l.designFiles && l.designFiles.length > 0);
    } else if (filterState === 'pending') {
      result = result.filter((l) => !l.designFiles || l.designFiles.length === 0);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.mobileNumber?.toLowerCase().includes(q) ||
          l.leadNumber?.toLowerCase().includes(q) ||
          l.propertyType?.toLowerCase().includes(q) ||
          l.projectLocation?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, searchTerm, filterState]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  return (
    <div className="w-full space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Tab Pills */}
        <div className="flex items-center gap-1.5 bg-[hsl(var(--muted))] p-1 rounded-xl w-full sm:w-max overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setFilterState('all');
              setCurrentPage(1);
            }}
            className={cn(
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap text-center',
              filterState === 'all'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            All ({leads.length})
          </button>
          <button
            onClick={() => {
              setFilterState('pending');
              setCurrentPage(1);
            }}
            className={cn(
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5',
              filterState === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => {
              setFilterState('completed');
              setCurrentPage(1);
            }}
            className={cn(
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5',
              filterState === 'completed'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Right: Search Box */}
        <div className="relative w-full sm:min-w-[240px] sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search drawings..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-10 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
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
      </div>

      {/* Table Container */}
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 rounded-2xl flex items-center justify-center mb-3">
              <Layers size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))] mb-1">No Drawings Found</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
              {searchTerm || filterState !== 'all'
                ? 'No leads match your current drawing filter.'
                : 'Leads moved to "Under Drawing" or "Design Approved" will appear here for CAD & 3D files tracking.'}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (< md) */}
            <div className="block md:hidden divide-y divide-[hsl(var(--border))]">
              {paginatedLeads.map((lead, idx) => {
                const designFiles = lead.designFiles || [];
                const hasDrawings = designFiles.length > 0;
                const pendingDrawings = designFiles.filter((f: any) => {
                  const latestVersion = Array.isArray(f.versions) && f.versions.length > 0 
                    ? f.versions[f.versions.length - 1] 
                    : null;
                  const rawStatus = f.status || f.approvalStatus || latestVersion?.approvalStatus || 'draft';
                  const s = String(rawStatus).toLowerCase().trim();
                  const isApproved = s === 'internally_approved' || s === 'client_approved' || s === 'approved';
                  const isClientRejected = f.clientStatus === 'client_changes_requested' || latestVersion?.clientStatus === 'client_changes_requested';
                  return !isApproved || isClientRejected;
                });
                const areAllDrawingsApproved = hasDrawings && pendingDrawings.length === 0;
                const hasApprovedDrawing = hasDrawings && designFiles.some((f: any) => {
                  const latestVersion = Array.isArray(f.versions) && f.versions.length > 0 
                    ? f.versions[f.versions.length - 1] 
                    : null;
                  const rawStatus = f.status || f.approvalStatus || latestVersion?.approvalStatus || 'draft';
                  const s = String(rawStatus).toLowerCase().trim();
                  const isApproved = s === 'internally_approved' || s === 'client_approved' || s === 'approved';
                  const isClientRejected = f.clientStatus === 'client_changes_requested' || latestVersion?.clientStatus === 'client_changes_requested';
                  return isApproved && !isClientRejected;
                });

                const hasAcceptedQuote = Array.isArray(lead.quotations) && lead.quotations.some((q: any) => 
                  ['accepted', 'approved', 'converted', 'signed & accepted'].includes(String(q.status).toLowerCase())
                );
                const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean((lead as any).linkedProject);
                const isPassedToNext = isQuotationApproved || [
                  'Under BOQ Creation',
                  'Under Quotation',
                  'Negotiation',
                  'Booking Pending',
                  'Won',
                  'Converted',
                ].includes(lead.status);

                return (
                  <div
                    key={lead._id}
                    onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=designs`)}
                    className="p-3.5 space-y-2.5 active:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 font-extrabold text-xs shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 
                            className="text-xs font-bold text-[hsl(var(--foreground))] truncate max-w-[150px] sm:max-w-[220px]"
                            title={lead.name}
                          >
                            {lead.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono text-indigo-600 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 font-bold shrink-0">
                              {lead.leadNumber || 'LD-XXXX'}
                            </span>
                            <span className="text-[hsl(var(--muted-foreground))]">•</span>
                            <span className="text-[hsl(var(--muted-foreground))] truncate">{lead.mobileNumber}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border',
                          hasDrawings
                            ? areAllDrawingsApproved
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                        )}
                      >
                        {hasDrawings 
                          ? areAllDrawingsApproved 
                            ? `✓ All ${designFiles.length} Approved` 
                            : `${pendingDrawings.length} Pending Approval`
                          : 'No Drawings'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] bg-[hsl(var(--muted)/0.4)] p-2 rounded-xl border border-[hsl(var(--border)/0.5)]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Palette size={11} className="text-indigo-500 shrink-0" />
                        <span className="truncate text-[hsl(var(--foreground))]">{lead.propertyType || 'Residential'}</span>
                      </div>
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0 font-medium">
                        {hasDrawings ? `${designFiles.length} files attached` : 'No drawings yet'}
                      </div>
                    </div>

                    {/* Actions Ribbon */}
                    <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {hasDrawings ? (
                          <button
                            onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=designs`)}
                            className="p-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold active:scale-95 shadow-sm cursor-pointer"
                            title="View Drawings"
                          >
                            <Eye size={13} className="text-indigo-600" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onUploadDesign(lead._id)}
                            className="inline-flex items-center justify-center rounded-lg text-xs font-bold active:scale-95 shadow-sm cursor-pointer gap-1 px-2.5 py-1.5 bg-indigo-600 text-white"
                            title="Upload Drawings"
                          >
                            <UploadCloud size={11} /> Upload
                          </button>
                        )}

                        {hasDrawings && hasApprovedDrawing && (
                          <button
                            onClick={() => setShareLead(lead)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 active:scale-95 shadow-sm cursor-pointer"
                            title="Share Drawings with Client"
                          >
                            <Share2 size={11} /> Share
                          </button>
                        )}
                      </div>

                      {hasDrawings && onPassToBoq && !isPassedToNext && (
                        <button
                          onClick={() => onPassToBoq(lead._id)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all",
                            areAllDrawingsApproved
                              ? "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 cursor-pointer"
                              : "bg-amber-500/10 text-amber-700 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
                          )}
                          title={
                            areAllDrawingsApproved 
                              ? "Pass to BOQ Estimation" 
                              : `Cannot pass to BOQ: ${pendingDrawings.length} drawing(s) still pending approval`
                          }
                        >
                          Pass to BOQ {areAllDrawingsApproved ? <ArrowRight size={11} /> : <AlertTriangle size={11} className="text-amber-600" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (>= md) - Senior Enterprise CRM Table */}
            <div className="hidden md:block w-full overflow-hidden">
              <table className="w-full text-left text-xs border-collapse table-fixed">
                <thead className="bg-[hsl(var(--muted)/0.45)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4.5 py-3 rounded-tl-2xl w-[28%]">Lead & Contact</th>
                    <th className="px-4 py-3 w-[22%]">Property & Location</th>
                    <th className="px-4 py-3 w-[20%]">Drawings & Status</th>
                    <th className="px-4 py-3 w-[15%]">Assigned Rep</th>
                    <th className="px-4.5 py-3 text-right rounded-tr-2xl w-[15%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.7)]">
                  {paginatedLeads.map((lead, idx) => {
                    const designFiles = lead.designFiles || [];
                    const hasDrawings = designFiles.length > 0;
                    const pendingDrawings = designFiles.filter((f: any) => {
                      const latestVersion = Array.isArray(f.versions) && f.versions.length > 0 
                        ? f.versions[f.versions.length - 1] 
                        : null;
                      const rawStatus = f.status || f.approvalStatus || latestVersion?.approvalStatus || 'draft';
                      const s = String(rawStatus).toLowerCase().trim();
                      const isApproved = s === 'internally_approved' || s === 'client_approved' || s === 'approved';
                      const isClientRejected = f.clientStatus === 'client_changes_requested' || latestVersion?.clientStatus === 'client_changes_requested';
                      return !isApproved || isClientRejected;
                    });
                    const areAllDrawingsApproved = hasDrawings && pendingDrawings.length === 0;
                    const hasApprovedDrawing = hasDrawings && designFiles.some((f: any) => {
                      const latestVersion = Array.isArray(f.versions) && f.versions.length > 0 
                        ? f.versions[f.versions.length - 1] 
                        : null;
                      const rawStatus = f.status || f.approvalStatus || latestVersion?.approvalStatus || 'draft';
                      const s = String(rawStatus).toLowerCase().trim();
                      const isApproved = s === 'internally_approved' || s === 'client_approved' || s === 'approved';
                      const isClientRejected = f.clientStatus === 'client_changes_requested' || latestVersion?.clientStatus === 'client_changes_requested';
                      return isApproved && !isClientRejected;
                    });

                    const hasAcceptedQuote = Array.isArray(lead.quotations) && lead.quotations.some((q: any) => 
                      ['accepted', 'approved', 'converted', 'signed & accepted'].includes(String(q.status).toLowerCase())
                    );
                    const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean((lead as any).linkedProject);
                    const isPassedToNext = isQuotationApproved || [
                      'Under BOQ Creation',
                      'Under Quotation',
                      'Negotiation',
                      'Booking Pending',
                      'Won',
                      'Converted',
                    ].includes(lead.status);
                    const assignedName = displayUserName(lead.assignedSalesExecutive);

                    return (
                      <tr
                        key={lead._id}
                        onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=designs`)}
                        className="hover:bg-[hsl(var(--muted)/0.35)] transition-colors group cursor-pointer"
                      >
                        {/* 1. Lead & Contact */}
                        <td className="px-4.5 py-3 max-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0 shadow-xs">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span 
                                  className="font-bold text-xs text-[hsl(var(--foreground))] group-hover:text-indigo-600 transition-colors truncate max-w-[160px] lg:max-w-[220px]"
                                  title={lead.name}
                                >
                                  {lead.name}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 shrink-0">
                                  {lead.leadNumber || 'LD-XXXX'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                                <span className="font-medium text-[hsl(var(--foreground))] truncate">{lead.mobileNumber}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Property & Location */}
                        <td className="px-4 py-3 max-w-0">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))] min-w-0" title={lead.propertyType || 'Residential'}>
                              <Home size={12} className="text-amber-500 shrink-0" />
                              <span className="truncate block">{lead.propertyType || 'Residential'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] min-w-0" title={lead.projectLocation || lead.city || 'Location Pending'}>
                              <MapPin size={11} className="shrink-0 text-indigo-500" />
                              <span className="truncate block">{lead.projectLocation || lead.city || 'Location Pending'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Drawings & Status */}
                        <td className="px-4 py-3">
                          <div className="min-w-0 space-y-1">
                            <div>
                              {hasDrawings ? (
                                areAllDrawingsApproved ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-bold" title="All drawings approved">
                                    <CheckCircle2 size={10} />
                                    {designFiles.length} Approved
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[10px] font-bold" title={`${pendingDrawings.length} drawing(s) pending approval`}>
                                    <Clock size={10} />
                                    {pendingDrawings.length} Pending
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-500/10 border border-slate-500/20 text-slate-700 text-[10px] font-bold">
                                  <Upload size={10} /> No Drawings
                                </span>
                              )}
                            </div>
                            <div>
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-bold tracking-tight uppercase border',
                                  hasDrawings
                                    ? areAllDrawingsApproved
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                                )}
                              >
                                {lead.status}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Assigned Rep */}
                        <td className="px-4 py-3">
                          {assignedName ? (
                            <div 
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.5)] px-2 py-1 rounded-lg border border-[hsl(var(--border))] max-w-[130px] truncate"
                              title={assignedName}
                            >
                              <User size={12} className="text-indigo-600 shrink-0" />
                              <span className="truncate">{assignedName}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] italic">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Unassigned
                            </span>
                          )}
                        </td>

                        {/* 5. Actions */}
                        <td className="px-4.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {hasDrawings ? (
                              <button
                                onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=designs`)}
                                className="p-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                                title="View Drawings"
                              >
                                <Eye size={13} className="text-indigo-600" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onUploadDesign(lead._id)}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all border cursor-pointer shadow-xs gap-1 px-2.5 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]"
                                title="Upload Drawings"
                              >
                                <Upload size={11} className="text-indigo-600" /> Upload
                              </button>
                            )}

                            {hasDrawings && hasApprovedDrawing && (
                              <button
                                onClick={() => setShareLead(lead)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded-lg text-xs font-bold transition-all border border-indigo-500/20 cursor-pointer shadow-xs"
                                title="Share Drawings Link"
                              >
                                <Share2 size={11} /> Share
                              </button>
                            )}

                            {hasDrawings && onPassToBoq && !isPassedToNext && (
                              <button
                                onClick={() => onPassToBoq(lead._id)}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs",
                                  areAllDrawingsApproved
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95"
                                    : "bg-amber-500/10 text-amber-700 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
                                )}
                                title={
                                  areAllDrawingsApproved 
                                    ? "Pass to BOQ Estimation" 
                                    : `Cannot pass to BOQ: ${pendingDrawings.length} drawing(s) still pending approval`
                                }
                              >
                                Pass {areAllDrawingsApproved ? <ArrowRight size={11} /> : <AlertTriangle size={11} className="text-amber-600" />}
                              </button>
                            )}

                            {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(lead.status) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onMarkAsLost(lead._id); }}
                                className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-500/20 cursor-pointer"
                                title="Mark as Lost"
                              >
                                <XCircle size={13} />
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
          </>
        )}

        {/* Pagination Footer */}
        {filteredLeads.length > 0 && (
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[hsl(var(--muted-foreground))] font-medium">
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, filteredLeads.length)}</strong> of{' '}
                <strong>{filteredLeads.length}</strong> drawings
              </span>

              <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
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
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center sm:justify-end gap-1.5 self-center sm:self-auto">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                </button>

                <div className="flex items-center gap-1 px-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
'w-7 h-7 rounded-lg font-bold text-xs transition-all shrink-0',
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
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

      {/* Share Drawings Modal */}
      {shareLead && (
        <InteriorCrmShareModal
          isOpen={Boolean(shareLead)}
          onClose={() => setShareLead(null)}
          lead={shareLead}
        />
      )}
    </div>
  );
};
