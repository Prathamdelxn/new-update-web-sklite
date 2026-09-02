'use client';

// Dedicated BOQ Estimation View with All / Pending / Completed Filter Tabs, Search, and Stage Handlers

import React, { useState, useMemo } from 'react';
import {
  Calculator,
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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  leads: any[];
  onAddBoq: (leadId: string) => void;
  onPassToQuotations?: (leadId: string) => void;
  onMarkAsLost?: (leadId: string) => void;
}

export const InteriorBoqStageView = ({ leads, onAddBoq, onPassToQuotations, onMarkAsLost }: Props) => {
  const router = useRouter();
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
                ? 'bg-blue-600 text-white shadow-sm'
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
            placeholder="Search BOQs..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-10 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
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
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
              <Calculator size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))] mb-1">No BOQs Found</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
              {searchTerm || filterState !== 'all'
                ? 'No leads match your current BOQ filter.'
                : 'Leads moved to "Under BOQ Creation" will appear here for cost estimation and bill of quantities.'}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (< md) */}
            <div className="block md:hidden divide-y divide-[hsl(var(--border))]">
              {paginatedLeads.map((lead, idx) => {
                const hasBoqs = lead.boqs && lead.boqs.length > 0;
                const latestBoq = hasBoqs ? lead.boqs[lead.boqs.length - 1] : null;
                const isPassedToNext = [
                  'Under Quotation',
                  'Negotiation',
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
                            className="text-xs font-bold text-[hsl(var(--foreground))] truncate max-w-[150px] sm:max-w-[220px]"
                            title={lead.name}
                          >
                            {lead.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono text-blue-600 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 font-bold shrink-0">
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
                          hasBoqs
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        )}
                      >
                        {hasBoqs ? `${lead.boqs.length} BOQ Estimation${lead.boqs.length === 1 ? '' : 's'} ✓` : 'Pending BOQ'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] bg-[hsl(var(--muted)/0.4)] p-2 rounded-xl border border-[hsl(var(--border)/0.5)]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 size={11} className="text-blue-500 shrink-0" />
                        <span className="truncate text-[hsl(var(--foreground))]">{lead.propertyType || 'Residential'}</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold shrink-0">
                        {hasBoqs ? `₹${(lead.boqs[lead.boqs.length - 1]?.totalAmount || 0).toLocaleString('en-IN')}` : 'No estimate'}
                      </div>
                    </div>

                    {/* Actions Ribbon */}
                    <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onAddBoq(lead._id)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold active:scale-95 shadow-sm cursor-pointer',
                          hasBoqs
                            ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                            : 'bg-blue-600 text-white'
                        )}
                      >
                        <FileSpreadsheet size={11} /> {hasBoqs ? 'Edit BOQ' : 'Create BOQ'}
                      </button>

                      {hasBoqs &&
                        onPassToQuotations &&
                        (['Under Quotation', 'Negotiation', 'Won', 'Converted'].includes(lead.status) ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                            Passed ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => onPassToQuotations(lead._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                          >
                            Pass to Quotation <ArrowRight size={11} />
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-3.5 rounded-tl-2xl">Lead Info</th>
                    <th className="px-6 py-3.5">Property & Location</th>
                    <th className="px-6 py-3.5">Latest BOQ Value</th>
                    <th className="px-6 py-3.5">BOQ Status</th>
                    <th className="px-6 py-3.5 text-right rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {paginatedLeads.map((lead, idx) => {
                    const hasBoqs = lead.boqs && lead.boqs.length > 0;
                    const latestBoq = hasBoqs ? lead.boqs[lead.boqs.length - 1] : null;
                    const isPassedToNext = [
                      'Under Quotation',
                      'Negotiation',
                      'Won',
                      'Converted',
                    ].includes(lead.status);

                    return (
                      <motion.tr
                        key={lead._id}
                        onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=boq`)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: idx * 0.02 }}
                        className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
                      >
                        {/* Lead Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 font-extrabold text-xs shrink-0">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div 
                                className="font-extrabold text-xs text-[hsl(var(--foreground))] group-hover:text-blue-600 transition-colors truncate max-w-[140px] sm:max-w-[200px] lg:max-w-[280px]"
                                title={lead.name}
                              >
                                {lead.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">
                                  {lead.leadNumber || 'LD-XXXX'}
                                </span>
                                <span className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                                  {lead.mobileNumber}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 space-y-0.5 text-xs">
                          <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-semibold" title={lead.propertyType || 'Residential'}>
                            <Home size={13} className="text-[hsl(var(--muted-foreground))] shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-[180px]">{lead.propertyType || 'Residential'}</span>
                          </div>
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1 truncate max-w-[160px] lg:max-w-[220px]" title={lead.projectLocation || lead.city || 'Location Pending'}>
                            <MapPin size={11} className="shrink-0 text-blue-500" />
                            <span className="truncate">{lead.projectLocation || lead.city || 'Location Pending'}</span>
                          </div>
                        </td>

                        {/* BOQ Summary */}
                        <td className="px-6 py-4">
                          {hasBoqs ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 text-xs font-bold border border-blue-500/20 max-w-[160px] sm:max-w-[220px] truncate"
                                  title={latestBoq?.title || `BOQ v${lead.boqs.length}`}
                                >
                                  <FileSpreadsheet size={12} className="shrink-0" />
                                  <span className="truncate">v{lead.boqs.length} ({latestBoq?.title || 'Main BOQ'})</span>
                                </span>
                              </div>
                              {latestBoq?.totalAmount ? (
                                <div className="text-xs font-extrabold text-emerald-600">
                                  Total: ₹{latestBoq.totalAmount.toLocaleString('en-IN')}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-[hsl(var(--muted-foreground))] italic">No BOQ generated</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={cn(
'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border',
                              hasBoqs
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            )}
                          >
                            {lead.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onAddBoq(lead._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] rounded-lg text-xs font-bold transition-all border border-[hsl(var(--border))] cursor-pointer"
                          >
                            <Calculator size={13} className="text-blue-600" />
                            {hasBoqs ? 'Edit BOQ' : 'Create BOQ'}
                          </button>

                          {hasBoqs &&
                            onPassToQuotations &&
                            (isPassedToNext ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold"
                                title="Lead has already been passed to Quotations"
                              >
                                Passed to Quotation ✓
                              </span>
                            ) : (
                              <button
                                onClick={() => onPassToQuotations(lead._id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Pass to Quotation Phase"
                              >
                                Pass to Quotation <ArrowRight size={13} />
                              </button>
                            ))}
                          
                          {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(lead.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onMarkAsLost(lead._id); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-500/20 ml-2 cursor-pointer"
                              title="Mark as Lost"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </td>
                      </motion.tr>
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
                <strong>{filteredLeads.length}</strong> BOQ records
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
                            ? 'bg-blue-600 text-white shadow-sm'
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
    </div>
  );
};

function hasBoqDetails(boq: any) {
  if (!boq) return false;
  return (boq.items && boq.items.length > 0) || (boq.totalAmount !== undefined && boq.totalAmount > 0);
}
