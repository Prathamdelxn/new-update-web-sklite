'use client';
import { tr } from '@/i18n';

// Enhanced Site Visits View with Search, Pagination, and Stage Handlers

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Calendar as CalendarIcon,
  ArrowRight,
  Home,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Ruler,
  X,
  XCircle,
  MessageSquare,
  Pencil,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

interface Props {
  leads: any[];
  onLogSiteVisit: (leadId: string) => void;
  onPassToRequirements?: (leadId: string) => void;
  onPassToDrawing?: (leadId: string) => void;
  onMarkAsLost?: (leadId: string) => void;
}

export const InteriorSiteVisitsView = ({ leads, onLogSiteVisit, onPassToRequirements, onPassToDrawing, onMarkAsLost }: Props) => {
  const router = useRouter();
const { hasPermission: canDo } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: pendingActivities = [] } = useQuery({
    queryKey: ['crm-pending-activities'],
    queryFn: async () => {
      const res = await interiorCrmService.getPendingActivities();
      return res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const pendingCount = useMemo(() => leads.filter((l) => !l.siteMeasurements).length, [leads]);
  const completedCount = useMemo(() => leads.filter((l) => !!l.siteMeasurements).length, [leads]);

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (statusFilter === 'completed') {
      result = result.filter((l) => !!l.siteMeasurements);
    } else if (statusFilter === 'pending') {
      result = result.filter((l) => !l.siteMeasurements);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.mobileNumber?.toLowerCase().includes(q) ||
          l.leadNumber?.toLowerCase().includes(q) ||
          l.projectLocation?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, searchTerm, statusFilter]);

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
              placeholder={tr("Search site visits...")}
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
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {tr("All (")}{leads.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('pending');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              {tr("Pending (")}{tr(pendingCount)})
            </button>
            <button
              onClick={() => {
                setStatusFilter('completed');
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                statusFilter === 'completed'
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
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-500/10 border border-purple-500/20 text-purple-600 rounded-2xl flex items-center justify-center mb-3">
              <MapPin size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))] mb-1">{tr("No Site Visits Found")}</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? tr("No site visits matched your current filter criteria.")
                : tr("Leads moved to \"Under Site Visit\" or \"Measurement Done\" will appear here for tracking.")}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (< md) */}
            <div className="block md:hidden divide-y divide-[hsl(var(--border))]">
              {paginatedLeads.map((lead, idx) => {
                    const pendingSiteVisit = pendingActivities.find(
                      (act: any) => ((act.customer?._id || act.customer) === lead._id) && act.type === 'Site Visit'
                    );
                const resolvedScheduledDate = lead.siteVisitScheduledDate || pendingSiteVisit?.scheduledDate;

                return (
                  <div
                    key={lead._id}
                    onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=site`)}
                    className="p-3.5 space-y-2.5 active:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 font-extrabold text-xs shrink-0">
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
                            <span className="font-mono text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 font-bold shrink-0">
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
                          lead.siteMeasurements
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                        )}
                      >
                        {lead.siteMeasurements ? tr("Measured ") : tr("Pending Survey")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[0.6875rem] bg-[hsl(var(--muted)/0.4)] p-2 rounded-xl border border-[hsl(var(--border)/0.5)]">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={11} className="text-purple-500 shrink-0" />
                        <span className="truncate text-[hsl(var(--foreground))]">{lead.projectLocation || lead.city || tr("Location pending")}</span>
                      </div>
                      <div className="text-[0.625rem] text-[hsl(var(--muted-foreground))] shrink-0 font-medium">
                        {lead.propertyType || tr("Residential")}
                      </div>
                    </div>

                    {resolvedScheduledDate && (() => {
                      const isOverdue = !lead.siteMeasurements && new Date(resolvedScheduledDate).getTime() < Date.now();
                      return (
                        <div className={cn(
                          "flex items-center gap-1.5 text-[0.625rem] px-2.5 py-1 rounded-lg border font-bold w-fit",
                          isOverdue
                            ? "text-rose-600 bg-rose-500/10 border-rose-500/30"
                            : "text-purple-700 bg-purple-500/10 border-purple-500/20"
                        )}>
                          <CalendarIcon size={11} className={isOverdue ? "text-rose-600 shrink-0" : "text-purple-600 shrink-0"} />
                          <span>
                            {new Date(resolvedScheduledDate).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          {isOverdue && (
                            <span className="ms-1 text-[0.5625rem] font-black uppercase text-rose-600 bg-rose-500/20 px-1 py-0.2 rounded">
                              {tr("Overdue")}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {(pendingSiteVisit?.remarks || lead.remarks) && (
                      <div className="flex items-start gap-1.5 text-[0.6875rem] bg-purple-500/[0.06] border border-purple-500/20 p-2 rounded-xl text-[hsl(var(--foreground))]">
                        <MessageSquare size={12} className="text-purple-600 shrink-0 mt-0.5" />
                        <p className="line-clamp-2 leading-relaxed">
                          <span className="font-bold text-purple-700 dark:text-purple-300">{tr("Note: ")}</span>
                          {pendingSiteVisit?.remarks || lead.remarks}
                        </p>
                      </div>
                    )}

                    {/* Actions Ribbon */}
                    <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      {(canDo('crm_site_visits', 'update')) && (
                        <button
                          onClick={() => onLogSiteVisit(lead._id)}
                          className={cn(
                            'inline-flex items-center justify-center rounded-lg text-xs font-bold active:scale-95 shadow-sm cursor-pointer',
                            lead.siteMeasurements
                              ? 'p-1.5 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                              : 'gap-1 px-2.5 py-1.5 bg-purple-600 text-white'
                          )}
                          title={tr("Edit Site Visit Measurements & Photos")}
                        >
                          {lead.siteMeasurements ? (
                            <Pencil size={13} className="text-purple-600" />
                          ) : (
                            <>
                              <Ruler size={11} />{tr(" Log Survey")}
                            </>
                          )}
                        </button>
                      )}

                      {lead.siteMeasurements && (
                        (Boolean(Array.isArray(lead.quotations) && lead.quotations.some((q: any) => ['accepted', 'approved', 'converted', 'signed & accepted'].includes(String(q.status).toLowerCase()))) ||
                         ['Under Drawing', 'Design Approved', 'Under BOQ Creation', 'Under Quotation', 'Negotiation', 'Booking Pending', 'Won', 'Converted'].includes(lead.status) ||
                         Boolean((lead as any).linkedProject)) ? (
                          <span className="text-[0.625rem] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                            {tr("Passed")}
                          </span>
                        ) : (
                          (canDo('crm_site_visits', 'update') || canDo('crm_drawing', 'update') || canDo('crm_drawing', 'create') || canDo('crm_requirements', 'update')) && (
                            <button
                              onClick={() => (onPassToDrawing ? onPassToDrawing(lead._id) : onPassToRequirements?.(lead._id))}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                              title={tr("Pass to 2D/3D Drawing")}
                            >
                              {tr("Pass ")}<ArrowRight size={11} />
                            </button>
                          )
                        )
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
                    <th className="px-4.5 py-3 rounded-ss-2xl w-[28%]">{tr("Lead & Contact")}</th>
                    <th className="px-4 py-3 w-[22%]">{tr("Property & Location")}</th>
                    <th className="px-4 py-3 w-[20%]">{tr("Scheduled Date & Note")}</th>
                    <th className="px-4 py-3 w-[15%]">{tr("Survey Status")}</th>
                    <th className="px-4.5 py-3 text-end rounded-se-2xl w-[15%]">{tr("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.7)] text-xs">
                  {paginatedLeads.map((lead) => {
                    const pendingSiteVisit = pendingActivities.find(
                      (act: any) => ((act.customer?._id || act.customer) === lead._id) && act.type === 'Site Visit'
                    );
                    const resolvedScheduledDate = lead.siteVisitScheduledDate || pendingSiteVisit?.scheduledDate;

                    return (
                      <tr
                        key={lead._id}
                        onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=site`)}
                        className="hover:bg-[hsl(var(--muted)/0.35)] transition-colors group cursor-pointer"
                      >
                        {/* 1. Lead & Contact */}
                        <td className="px-4.5 py-3 max-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-600 font-black text-xs shrink-0 shadow-xs">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span 
                                  className="font-bold text-xs text-[hsl(var(--foreground))] group-hover:text-purple-600 transition-colors truncate max-w-[10rem] lg:max-w-[13.75rem]"
                                  title={lead.name}
                                >
                                  {tr(lead.name)}
                                </span>
                                <span className="text-[0.625rem] font-mono font-bold text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 shrink-0">
                                  {lead.leadNumber || tr("LD-XXXX")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[0.6875rem] text-[hsl(var(--muted-foreground))]">
                                <span className="font-medium text-[hsl(var(--foreground))] truncate">{tr(lead.mobileNumber)}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Location */}
                        <td className="px-4 py-3 max-w-0">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))] min-w-0" title={lead.propertyType || tr("Residential")}>
                              <Home size={12} className="text-amber-500 shrink-0" />
                              <span className="truncate block">{lead.propertyType || tr("Residential")}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[0.6875rem] text-[hsl(var(--muted-foreground))] min-w-0" title={lead.projectLocation || lead.city || tr("Location Pending")}>
                              <MapPin size={11} className="shrink-0 text-purple-500" />
                              <span className="truncate block">{lead.projectLocation || lead.city || tr("Location Pending")}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Scheduled Date & Notes */}
                        <td className="px-4 py-3">
                          <div className="min-w-0 space-y-1">
                            {resolvedScheduledDate ? (() => {
                              const isOverdue = !lead.siteMeasurements && new Date(resolvedScheduledDate).getTime() < Date.now();
                              return (
                                <div className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[0.625rem] font-bold",
                                  isOverdue
                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600"
                                    : "bg-purple-500/10 border-purple-500/20 text-purple-700"
                                )}>
                                  <CalendarIcon size={10} className={isOverdue ? "text-rose-600" : "text-purple-600"} />
                                  <span>
                                    {new Date(resolvedScheduledDate).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {isOverdue && (
                                    <span className="ms-0.5 text-[0.5rem] font-black uppercase text-rose-600 bg-rose-500/20 px-1 py-0.2 rounded">
                                      {tr("Late")}
                                    </span>
                                  )}
                                </div>
                              );
                            })() : (
                              <span className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] italic">{tr("Not scheduled")}</span>
                            )}
                            {(pendingSiteVisit?.remarks || lead.remarks) && (
                              <div className="flex items-center gap-1 text-[0.625rem] text-purple-700 dark:text-purple-300 max-w-[12.5rem] truncate" title={`Note: ${pendingSiteVisit?.remarks || lead.remarks}`}>
                                <MessageSquare size={9} className="shrink-0 text-purple-600" />
                                <span className="truncate font-medium">{pendingSiteVisit?.remarks || lead.remarks}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. Status */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[0.5625rem] font-bold tracking-tight uppercase border',
                              lead.siteMeasurements
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                            )}
                          >
                            {lead.siteMeasurements ? tr("Done ") : lead.status}
                          </span>
                        </td>

                        {/* 5. Actions */}
                        <td className="px-4.5 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {lead.siteMeasurements ? (
                              (canDo('crm_site_visits', 'update')) && (
                                <button
                                  onClick={() => onLogSiteVisit(lead._id)}
                                  className="p-1.5 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center justify-center"
                                  title={tr("Edit Site Visit Measurements & Photos")}
                                >
                                  <Pencil size={13} className="text-purple-600" />
                                </button>
                              )
                            ) : (
                              (canDo('crm_site_visits', 'update')) && (
                                <button
                                  onClick={() => onLogSiteVisit(lead._id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                                >
                                  <Ruler size={11} />{tr(" + Log")}
                                </button>
                              )
                            )}
                            {lead.siteMeasurements &&
                              ((Boolean(Array.isArray(lead.quotations) && lead.quotations.some((q: any) => ['accepted', 'approved', 'converted', 'signed & accepted'].includes(String(q.status).toLowerCase()))) ||
                               ['Under Drawing', 'Design Approved', 'Under BOQ Creation', 'Under Quotation', 'Negotiation', 'Booking Pending', 'Won', 'Converted'].includes(lead.status) ||
                               Boolean((lead as any).linkedProject)) ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-1 text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[0.6875rem] font-bold"
                                  title={tr("Passed to 2D/3D Drawing")}
                                >
                                  {tr("Passed")}
                                </span>
                              ) : (
                                (canDo('crm_site_visits', 'update') || canDo('crm_drawing', 'update') || canDo('crm_drawing', 'create') || canDo('crm_requirements', 'update')) && (
                                  <button
                                    onClick={() => (onPassToDrawing ? onPassToDrawing(lead._id) : onPassToRequirements?.(lead._id))}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                                    title={tr("Pass to 2D/3D Drawing")}
                                  >
                                    {tr("Pass ")}<ArrowRight size={11} />
                                  </button>
                                )
                              ))}
                            {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(lead.status) && (
                              (canDo('crm_site_visits', 'update') || canDo('crm_leads', 'update')) && (
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
                <strong>{filteredLeads.length}</strong>{tr(" site visits")}
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
                            ? 'bg-purple-600 text-white shadow-sm'
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

