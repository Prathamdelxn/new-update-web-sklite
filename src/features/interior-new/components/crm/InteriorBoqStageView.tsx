'use client';
import { tr } from '@/i18n';

// Dedicated BOQ Estimation View with All / Pending / Completed Filter Tabs, Search, and Stage Handlers

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  X,
  ArrowRight,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
  MapPin,
  Home,
  FileSpreadsheet,
  Building2,
  XCircle,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { exportBoqToExcel } from '@/lib/exportBoqExcelLazy';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

interface Props {
  leads: any[];
  onAddBoq: (leadId: string, boqIndex?: number) => void;
  onPassToQuotations?: (leadId: string) => void;
  onMarkAsLost?: (leadId: string) => void;
  onDeleteBoq?: (leadId: string) => void;
  onSendForApproval?: (leadId: string, boqIndex?: number) => void;
  onApproveBoq?: (leadId: string, boqIndex?: number) => void;
  onRejectBoq?: (leadId: string, boqIndex?: number) => void;
}

export const InteriorBoqStageView = ({
  leads,
  onAddBoq,
  onPassToQuotations,
  onMarkAsLost,
  onDeleteBoq,
  onSendForApproval,
  onApproveBoq,
  onRejectBoq,
}: Props) => {
  const router = useRouter();
const { hasPermission: canDo } = usePermissions();
  const { currencySymbol, currencyCode } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'pending' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pendingCount = useMemo(
    () => leads.filter((l) => !l.boqs || l.boqs.length === 0).length,
    [leads]
  );
  const completedCount = useMemo(
    () => leads.filter((l) => l.boqs && l.boqs.length > 0).length,
    [leads]
  );

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (filterState === 'completed') {
      result = result.filter((l) => l.boqs && l.boqs.length > 0);
    } else if (filterState === 'pending') {
      result = result.filter((l) => !l.boqs || l.boqs.length === 0);
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
      {/* ── Search & Filter Control Bar (Matching Projects & Vendors Layout) ── */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: Search Box (Full Width flex-1) */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={tr("Search BOQs...")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full ps-8 pe-8 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
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

          {/* Right: Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 bg-slate-50 shrink-0 overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setFilterState('all');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                filterState === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {tr("All (")}{leads.length})
            </button>
            <button
              onClick={() => {
                setFilterState('pending');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                filterState === 'pending'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {tr("Pending (")}{tr(pendingCount)})
            </button>
            <button
              onClick={() => {
                setFilterState('completed');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                filterState === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {tr("Completed (")}{tr(completedCount)})
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
              <Calculator size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))] mb-1">{tr("No BOQs Found")}</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
              {searchTerm || filterState !== 'all'
                ? tr("No leads match your current BOQ filter.")
                : tr("Leads moved to \"Under BOQ Creation\" will appear here for cost estimation and bill of quantities.")}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (< md) */}
            <div className="block md:hidden divide-y divide-[hsl(var(--border))]">
              {paginatedLeads.map((lead, idx) => {
                const hasBoqs = lead.boqs && lead.boqs.length > 0;
                const latestBoq = hasBoqs ? lead.boqs[lead.boqs.length - 1] : null;
                const hasAcceptedQuote = Array.isArray(lead.quotations) && lead.quotations.some((q: any) => 
                  ['accepted', 'approved', 'converted', 'signed & accepted'].includes(String(q.status).toLowerCase())
                );
                const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean(lead.linkedProject);
                const isPassedToNext = isQuotationApproved || [
                  'Under Quotation',
                  'Negotiation',
                  'Booking Pending',
                  'Won',
                  'Converted',
                ].includes(lead.status);

                return (
                  <div
                    key={lead._id}
                    onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=boq`)}
                    className="p-3.5 space-y-2.5 active:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 font-extrabold text-xs shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 
                            className="text-xs font-bold text-[hsl(var(--foreground))] truncate max-w-[9.375rem] sm:max-w-[13.75rem]"
                            title={lead.name}
                          >
                            {tr(lead.name)}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[0.625rem]">
                            <span className="font-mono text-blue-600 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 font-bold shrink-0">
                              {lead.leadNumber || tr("LD-XXXX")}
                            </span>
                            <span className="text-[hsl(var(--muted-foreground))]">•</span>
                            <span className="text-[hsl(var(--muted-foreground))] truncate">{tr(lead.mobileNumber)}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[0.5625rem] font-black uppercase tracking-wider border',
                          latestBoq?.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : latestBoq?.status === 'pending_approval'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : latestBoq?.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            : hasBoqs
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        )}
                      >
                        {latestBoq?.status === 'approved'
                          ? tr("✓ BOQ Approved")
                          : latestBoq?.status === 'pending_approval'
                          ? tr("⏳ Review Pending")
                          : latestBoq?.status === 'rejected'
                          ? tr("✕ Rejected")
                          : hasBoqs
                          ? tr("Draft BOQ")
                          : tr("Pending BOQ")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[0.6875rem] bg-[hsl(var(--muted)/0.4)] p-2 rounded-xl border border-[hsl(var(--border)/0.5)]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 size={11} className="text-blue-500 shrink-0" />
                        <span className="truncate text-[hsl(var(--foreground))]">{lead.propertyType || tr("Residential")}</span>
                      </div>
                      <div className="text-[0.625rem] text-emerald-600 font-bold shrink-0">
                        {hasBoqs ? `${currencySymbol} ${(latestBoq?.totalAmount || 0).toLocaleString()}` : tr("No estimate")}
                      </div>
                    </div>

                    {hasBoqs && (
                      <div className="flex items-center justify-between text-[0.625rem] text-[hsl(var(--muted-foreground))] px-1">
                        <span>v{lead.boqs.length} • {latestBoq?.createdAt ? new Date(latestBoq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : tr("Recent")}</span>
                        <span className="truncate max-w-[8.125rem]">{tr("by ")}{latestBoq?.createdByName || (latestBoq?.createdBy?.firstName ? `${latestBoq.createdBy.firstName} ${latestBoq.createdBy.lastName || ''}`.trim() : null) || tr("Team")}</span>
                      </div>
                    )}

                    {/* Actions Ribbon */}
                    <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      {isQuotationApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.625rem] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <Lock size={11} />{tr(" Locked (Quote Approved)")}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap w-full justify-between">
                          <div className="flex items-center gap-1.5">
                            {/* 1. Approval Actions First */}
                            {hasBoqs && latestBoq?.status === 'pending_approval' && (
                              <>
                                {onApproveBoq && (
                                  (canDo('crm_boq', 'approve')) && (
                                    <button
                                      onClick={() => onApproveBoq(lead._id)}
                                      className="inline-flex items-center gap-0.5 px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-[0.6875rem] font-bold active:scale-95 cursor-pointer"
                                      title={tr("Approve BOQ")}
                                    >
                                      <CheckCircle2 size={10} />{tr(" Approve")}
                                    </button>
                                  )
                                )}
                                {onRejectBoq && (
                                  (canDo('crm_boq', 'approve')) && (
                                    <button
                                      onClick={() => onRejectBoq(lead._id)}
                                      className="inline-flex items-center gap-0.5 px-2 py-1.5 bg-rose-600 text-white rounded-lg text-[0.6875rem] font-bold active:scale-95 cursor-pointer"
                                      title={tr("Reject / Request Changes")}
                                    >
                                      <XCircle size={10} />{tr(" Reject")}
                                    </button>
                                  )
                                )}
                              </>
                            )}

                            {hasBoqs && (!latestBoq?.status || latestBoq?.status === 'draft' || latestBoq?.status === 'rejected') && onSendForApproval && (
                              (canDo('crm_boq', 'update')) && (
                                <button
                                  onClick={() => onSendForApproval(lead._id)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded-lg text-[0.6875rem] font-bold active:scale-95 cursor-pointer"
                                  title={tr("Send BOQ for Approval")}
                                >
                                  <Send size={10} />{tr(" Send Approval")}
                                </button>
                              )
                            )}

                            {/* 2. Edit BOQ */}
                            {((hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? canDo('crm_boq', 'update') : canDo('crm_boq', 'create')) && (
                              <button
                                onClick={() => onAddBoq(lead._id, (hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? (lead.boqs.length - 1) : undefined)}
                                className={cn(
                                  'inline-flex items-center justify-center rounded-lg text-xs font-bold active:scale-95 shadow-sm cursor-pointer',
                                  (hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved')
                                    ? 'p-1.5 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                                    : 'gap-1 px-2.5 py-1.5 bg-blue-600 text-white'
                                )}
                                title={(hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? tr("Edit BOQ") : hasBoqs ? tr("Approved BOQs are final — create a new version") : tr("Create BOQ")}
                              >
                              {(hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? (
                                <Pencil size={13} className="text-blue-600" />
                              ) : (
                                <>
                                  <Plus size={11} /> {hasBoqs ? tr("New Version") : tr("Create BOQ")}
                                </>
                              )}
                              </button>
                            )}

                            {/* 3. Export Excel */}
                            {hasBoqs && canDo('crm_boq', 'export') && (
                              <button
                                onClick={() =>
                                  exportBoqToExcel({
                                    lead,
                                    boqIndex: lead.boqs.length - 1,
                                    currencySymbol,
                                    currencyCode,
                                  })
                                }
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/20 rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                                title={tr("Export BOQ to Excel (.xlsx)")}
                              >
                                <FileSpreadsheet size={13} />
                              </button>
                            )}

                            {/* 4. Delete BOQ */}
                            {hasBoqs && onDeleteBoq && !isQuotationApproved && (
                              (canDo('crm_boq', 'delete')) && (
                                <button
                                  onClick={() => onDeleteBoq(lead._id)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                                  title={tr("Delete BOQ")}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )
                            )}
                          </div>

                          {hasBoqs &&
                            onPassToQuotations &&
                            (isPassedToNext ? (
                              <span className="text-[0.625rem] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                                {tr("Passed")}
                              </span>
                            ) : latestBoq?.status === 'approved' ? (
                              (canDo('crm_boq', 'update') || canDo('crm_quotations', 'update') || canDo('crm_quotations', 'create')) && (
                                <button
                                  onClick={() => onPassToQuotations(lead._id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-all bg-blue-600 text-white cursor-pointer shadow-xs"
                                  title={tr("Pass to Quotation")}
                                >
                                  {tr("Pass ")}<ArrowRight size={11} />
                                </button>
                              )
                            ) : null)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (>= md) - Senior Enterprise CRM Table */}
            <div className="hidden md:block w-full overflow-hidden">
              <table className="w-full text-start text-xs border-collapse table-fixed">
                <thead className="bg-[hsl(var(--muted)/0.45)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-[0.6875rem] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4.5 py-3 rounded-ss-2xl w-[26%]">{tr("Lead & Contact")}</th>
                    <th className="px-4 py-3 w-[20%]">{tr("Property & Location")}</th>
                    <th className="px-4 py-3 w-[22%]">{tr("BOQ Value & Status")}</th>
                    <th className="px-4 py-3 w-[12%]">{tr("Pipeline")}</th>
                    <th className="px-4.5 py-3 text-end rounded-se-2xl w-[20%]">{tr("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.7)]">
                  {paginatedLeads.map((lead, idx) => {
                    const hasBoqs = lead.boqs && lead.boqs.length > 0;
                    const latestBoq = hasBoqs ? lead.boqs[lead.boqs.length - 1] : null;
                    const hasAcceptedQuote = Array.isArray(lead.quotations) && lead.quotations.some((q: any) => 
                      ['accepted', 'approved', 'converted', 'signed & accepted'].includes(String(q.status).toLowerCase())
                    );
                    const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean(lead.linkedProject);
                    const isPassedToNext = isQuotationApproved || [
                      'Under Quotation',
                      'Negotiation',
                      'Booking Pending',
                      'Won',
                      'Converted',
                    ].includes(lead.status);

                    const boqStatus = latestBoq?.status || 'draft';
                    const isBoqApproved = boqStatus === 'approved';
                    const isBoqPending = boqStatus === 'pending_approval';
                    const isBoqRejected = boqStatus === 'rejected';
                    const isBoqDraft = boqStatus === 'draft';

                    return (
                      <tr
                        key={lead._id}
                        onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=boq`)}
                        className="hover:bg-[hsl(var(--muted)/0.35)] transition-colors group cursor-pointer"
                      >
                        {/* 1. Lead & Contact */}
                        <td className="px-4.5 py-3 max-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 font-black text-xs shrink-0 shadow-xs">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span 
                                  className="font-bold text-xs text-[hsl(var(--foreground))] group-hover:text-blue-600 transition-colors truncate max-w-[10rem] lg:max-w-[13.75rem]"
                                  title={lead.name}
                                >
                                  {tr(lead.name)}
                                </span>
                                <span className="text-[0.625rem] font-mono font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 shrink-0">
                                  {lead.leadNumber || tr("LD-XXXX")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[0.6875rem] text-[hsl(var(--muted-foreground))]">
                                <span className="font-medium text-[hsl(var(--foreground))] truncate">{tr(lead.mobileNumber)}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Property & Location */}
                        <td className="px-4 py-3 max-w-0">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))] min-w-0" title={lead.propertyType || tr("Residential")}>
                              <Home size={12} className="text-amber-500 shrink-0" />
                              <span className="truncate block">{lead.propertyType || tr("Residential")}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[0.6875rem] text-[hsl(var(--muted-foreground))] min-w-0" title={lead.projectLocation || lead.city || tr("Location Pending")}>
                              <MapPin size={11} className="shrink-0 text-blue-500" />
                              <span className="truncate block">{lead.projectLocation || lead.city || tr("Location Pending")}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. BOQ Summary & Value & Status */}
                        <td className="px-4 py-3">
                          {hasBoqs ? (
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-700 text-[0.625rem] font-bold border border-blue-500/20 max-w-[8.75rem] truncate"
                                  title={latestBoq?.title || tr("BOQ v{{boqsCount}}", { boqsCount: lead.boqs.length })}
                                >
                                  <FileSpreadsheet size={10} className="shrink-0" />
                                  <span className="truncate">v{lead.boqs.length} ({latestBoq?.title || tr("Main")})</span>
                                </span>
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.2 rounded text-[0.5625rem] font-extrabold border tracking-wider uppercase",
                                  isBoqApproved
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                    : isBoqPending
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse"
                                    : isBoqRejected
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                    : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30"
                                )}>
                                  {isBoqApproved ? tr("Approved") : isBoqPending ? tr("Pending Review") : isBoqRejected ? tr("Rejected") : tr("Draft")}
                                </span>
                              </div>
                              {latestBoq?.totalAmount ? (
                                <div className="text-xs font-extrabold text-emerald-600 flex items-center justify-between gap-1">
                                  <span>{tr(currencySymbol)} {latestBoq.totalAmount.toLocaleString()}</span>
                                  <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))] font-normal">
                                    {latestBoq.createdAt ? new Date(latestBoq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                                  </span>
                                </div>
                              ) : null}
                              {(latestBoq?.createdByName || latestBoq?.createdBy?.firstName) && (
                                <div className="text-[0.625rem] text-[hsl(var(--muted-foreground))] truncate" title={tr("Created by {{value}}", { value: latestBoq.createdByName || `${latestBoq.createdBy.firstName} ${latestBoq.createdBy.lastName || ''}`.trim() })}>
                                  {tr("by ")}<span className="font-semibold text-[hsl(var(--foreground))]">{latestBoq.createdByName || `${latestBoq.createdBy.firstName} ${latestBoq.createdBy.lastName || ''}`.trim()}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] italic">{tr("No BOQ generated")}</span>
                          )}
                        </td>

                        {/* 4. Status */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[0.5625rem] font-bold tracking-tight uppercase border',
                              hasBoqs
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            )}
                          >
                            {tr(lead.status)}
                          </span>
                        </td>

                        {/* 5. Actions */}
                        <td className="px-4.5 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isQuotationApproved ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg text-[0.6875rem] font-bold"
                                title={tr("Quotation is approved, BOQ locked")}
                              >
                                <Lock size={10} />{tr(" Locked")}
                              </span>
                            ) : (
                              <>
                                {/* 1. Approval Actions First */}
                                {hasBoqs && isBoqPending && (
                                  <>
                                    {onApproveBoq && (
                                      (canDo('crm_boq', 'approve')) && (
                                        <button
                                          onClick={() => onApproveBoq(lead._id)}
                                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                                          title={tr("Approve BOQ")}
                                        >
                                          <CheckCircle2 size={13} />
                                        </button>
                                      )
                                    )}
                                    {onRejectBoq && (
                                      (canDo('crm_boq', 'approve')) && (
                                        <button
                                          onClick={() => onRejectBoq(lead._id)}
                                          className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                                          title={tr("Reject / Request Changes")}
                                        >
                                          <XCircle size={13} />
                                        </button>
                                      )
                                    )}
                                  </>
                                )}

                                {hasBoqs && (isBoqDraft || isBoqRejected) && onSendForApproval && (
                                  (canDo('crm_boq', 'update')) && (
                                    <button
                                      onClick={() => onSendForApproval(lead._id)}
                                      className="inline-flex items-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                                      title={tr("Send BOQ for Approval")}
                                    >
                                      <Send size={11} />{tr(" Approval")}
                                    </button>
                                  )
                                )}

                                {/* 2. Edit BOQ */}
                                {((hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? canDo('crm_boq', 'update') : canDo('crm_boq', 'create')) && (
                                  <button
                                    onClick={() => onAddBoq(lead._id, (hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? (lead.boqs.length - 1) : undefined)}
                                    className={cn(
                                      "inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all border cursor-pointer shadow-xs",
                                      (hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved')
                                        ? "p-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]"
                                        : "gap-1 px-2.5 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]"
                                    )}
                                    title={(hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? tr("Edit BOQ") : hasBoqs ? tr("Approved BOQs are final — create a new version") : tr("Create BOQ")}
                                  >
                                    {(hasBoqs && lead.boqs[lead.boqs.length - 1]?.status !== 'approved') ? (
                                      <Pencil size={13} className="text-blue-600" />
                                    ) : (
                                      <>
                                        <Plus size={11} className="text-blue-600" />{hasBoqs ? tr("New Version") : tr("BOQ")}
                                      </>
                                    )}
                                  </button>
                                )}

                                {/* 3. Export Excel */}
                                {hasBoqs && canDo('crm_boq', 'export') && (
                                  <button
                                    onClick={() =>
                                      exportBoqToExcel({
                                        lead,
                                        boqIndex: lead.boqs.length - 1,
                                        currencySymbol,
                                        currencyCode,
                                      })
                                    }
                                    className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                                    title={tr("Export BOQ to Excel (.xlsx)")}
                                  >
                                    <FileSpreadsheet size={13} />
                                  </button>
                                )}

                                {/* 4. Delete BOQ */}
                                {hasBoqs && onDeleteBoq && !isQuotationApproved && (
                                  (canDo('crm_boq', 'delete')) && (
                                    <button
                                      onClick={() => onDeleteBoq(lead._id)}
                                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                                      title={tr("Delete BOQ")}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )
                                )}

                                {hasBoqs &&
                                  onPassToQuotations &&
                                  (isPassedToNext ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-1 text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[0.6875rem] font-bold"
                                      title={tr("Passed to Quotations")}
                                    >
                                      {tr("Passed")}
                                    </span>
                                  ) : isBoqApproved ? (
                                    (canDo('crm_boq', 'update') || canDo('crm_quotations', 'update') || canDo('crm_quotations', 'create')) && (
                                      <button
                                        onClick={() => onPassToQuotations(lead._id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                        title={tr("Pass to Quotation Phase")}
                                      >
                                        {tr("Pass ")}<ArrowRight size={11} />
                                      </button>
                                    )
                                  ) : null)}
                              </>
                            )}
                            
                            {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(lead.status) && (
                              (canDo('crm_boq', 'update') || canDo('crm_leads', 'update')) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMarkAsLost(lead._id); }}
                                  className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-500/20 cursor-pointer"
                                  title={tr("Mark as Lost")}
                                >
                                  <XCircle size={13} />
                                </button>
                              )
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
                {tr("Showing ")}<strong>{(currentPage - 1) * pageSize + 1}</strong>{tr(" to")}{' '}
                <strong>{Math.min(currentPage * pageSize, filteredLeads.length)}</strong>{tr(" of")}{' '}
                <strong>{filteredLeads.length}</strong>{tr(" BOQ records")}
              </span>

              <div className="flex items-center gap-1.5 ms-auto sm:ms-2">
                <span>{tr("Per page:")}</span>
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
                  title={tr("Previous Page")}
                >
                  <ChevronLeft size={15} />
                </button>

                <div className="flex items-center gap-1 px-1 overflow-x-auto max-w-[12.5rem] sm:max-w-none">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
'w-7 h-7 rounded-lg font-bold text-xs transition-all shrink-0',
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                        )}
                      >
                        {tr(pageNum)}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title={tr("Next Page")}
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

function hasBoqDetails(boq: any) {
  if (!boq) return false;
  return (boq.items && boq.items.length > 0) || (boq.totalAmount !== undefined && boq.totalAmount > 0);
}
