'use client';

// Enhanced Quotations View with Search, Quote Status Filter, and Pagination

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, Phone, Trophy, Search, ChevronLeft, ChevronRight, Edit3, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InteriorLead } from './InteriorLeadsTable';
import { motion } from 'framer-motion';

export function InteriorQuotationsView({
  leads,
  onConvertToProject,
  onCreateQuotation,
  onMarkAsLost,
}: {
  leads: InteriorLead[];
  onConvertToProject?: (leadId: string) => void;
  onCreateQuotation: (leadId: string) => void;
  onMarkAsLost?: (leadId: string) => void;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [quoteFilter, setQuoteFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pendingCount = useMemo(
    () => leads.filter((l) => !l.quotations || l.quotations.length === 0).length,
    [leads]
  );
  const completedCount = useMemo(
    () => leads.filter((l) => l.quotations && l.quotations.length > 0).length,
    [leads]
  );

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (quoteFilter === 'completed') {
      result = result.filter((l) => l.quotations && l.quotations.length > 0);
    } else if (quoteFilter === 'pending') {
      result = result.filter((l) => !l.quotations || l.quotations.length === 0);
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
  }, [leads, searchTerm, quoteFilter]);

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
              setQuoteFilter('all');
              setCurrentPage(1);
            }}
            className={cn(
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap text-center',
              quoteFilter === 'all'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            All ({leads.length})
          </button>
          <button
            onClick={() => {
              setQuoteFilter('pending');
              setCurrentPage(1);
            }}
            className={cn(
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5',
              quoteFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => {
              setQuoteFilter('completed');
              setCurrentPage(1);
            }}
            className={cn(
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5',
              quoteFilter === 'completed'
                ? 'bg-rose-600 text-white shadow-sm'
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
            placeholder="Search quotations..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-10 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
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
          <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mb-3">
              <FileText size={24} />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))] mb-1">No Quotations Found</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
              {searchTerm || quoteFilter !== 'all'
                ? 'No quotations match your current filter settings.'
                : 'Leads moved to "Under Quotation" will appear here for pricing and proposal generation.'}
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (< md) */}
            <div className="block md:hidden divide-y divide-[hsl(var(--border))]">
              {paginatedLeads.map((lead, idx) => {
                const latestQuote =
                  lead.quotations && lead.quotations.length > 0
                    ? lead.quotations[lead.quotations.length - 1]
                    : null;

                return (
                  <div
                    key={lead._id}
                    onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=quotation`)}
                    className="p-3.5 space-y-2.5 active:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 font-extrabold text-xs shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[hsl(var(--foreground))] truncate">{lead.name}</h4>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 font-bold">
                              {lead.leadNumber || 'LD-XXXX'}
                            </span>
                            <span className="text-[hsl(var(--muted-foreground))]">•</span>
                            <span className="text-[hsl(var(--muted-foreground))]">{lead.mobileNumber}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={cn(
'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border',
                          lead.status === 'Converted'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : (latestQuote?.status === 'Accepted' || lead.status === 'Booking Pending')
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : latestQuote?.status === 'Rejected'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                        )}
                      >
                        {lead.status === 'Converted'
                          ? 'Converted'
                          : (latestQuote?.status === 'Accepted' || lead.status === 'Booking Pending')
                          ? 'Approved ✓'
                          : latestQuote?.status === 'Rejected'
                          ? 'Rejected'
                          : 'Pending'}
                      </span>
                    </div>

                    <div className="text-[11px] bg-[hsl(var(--muted)/0.4)] p-2 rounded-xl border border-[hsl(var(--border)/0.5)] flex items-center justify-between">
                      {latestQuote ? (
                        <>
                          <span className="font-bold text-emerald-600">
                            Grand Total: ₹{latestQuote.grandTotal?.toLocaleString('en-IN') || 0}
                          </span>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                            v{latestQuote.version}
                          </span>
                        </>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))] italic">No quotation generated</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      {!latestQuote ? (
                        <button
                          onClick={() => onCreateQuotation(lead._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                        >
                          <FileText size={11} /> Create Quote
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onCreateQuotation(lead._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                          >
                            <Edit3 size={11} /> Edit
                          </button>
                          <button
                            onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=quotation`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                          >
                            View <ArrowRight size={11} />
                          </button>
                        </div>
                      )}

                      {onConvertToProject &&
                        latestQuote?.status === 'Accepted' &&
                        (lead.status === 'Won' || lead.status === 'Converted' ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                            Converted ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => onConvertToProject(lead._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                          >
                            <Trophy size={11} /> Convert
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
                    <th className="px-6 py-3.5">Contact</th>
                    <th className="px-6 py-3.5">Quotation Info</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {paginatedLeads.map((lead, idx) => {
                    const latestQuote =
                      lead.quotations && lead.quotations.length > 0
                        ? lead.quotations[lead.quotations.length - 1]
                        : null;

                    return (
                      <motion.tr
                        key={lead._id}
                        onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=quotation`)}
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
                              <div className="font-extrabold text-xs text-[hsl(var(--foreground))] group-hover:text-indigo-600 transition-colors">
                                {lead.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                  {lead.leadNumber || 'LD-XXXX'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))] font-semibold">
                            <Phone size={13} className="text-[hsl(var(--muted-foreground))]" />
                            {lead.mobileNumber}
                          </div>
                        </td>

                        {/* Quotation Info */}
                        <td className="px-6 py-4">
                          {latestQuote ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-[hsl(var(--foreground))]">
                                  ₹{latestQuote.grandTotal?.toLocaleString('en-IN') || 0}
                                </span>
                                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-0.5">
                                  <FileText size={10} /> V{latestQuote.version}
                                </span>
                                <span
                                  className={cn(
'text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase border',
                                    latestQuote.status === 'Accepted'
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                      : latestQuote.status === 'Rejected'
                                      ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                      : 'bg-[hsl(var(--muted))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                                  )}
                                >
                                  {latestQuote.status}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[hsl(var(--muted-foreground))] italic">
                              Quotation pending...
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={cn(
'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border',
                              lead.status === 'Converted'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : (latestQuote?.status === 'Accepted' || lead.status === 'Booking Pending')
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : latestQuote?.status === 'Rejected'
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                            )}
                          >
                            {lead.status === 'Converted'
                              ? 'Converted'
                              : (latestQuote?.status === 'Accepted' || lead.status === 'Booking Pending')
                              ? 'Quotation Approved ✓'
                              : latestQuote?.status === 'Rejected'
                              ? 'Quotation Rejected'
                              : 'Under Quotation'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-6 py-4 text-right space-x-2 flex items-center justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!latestQuote ? (
                            <button
                              onClick={() => onCreateQuotation(lead._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              <FileText size={13} /> Create Quote
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => onCreateQuotation(lead._id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Edit Quotation"
                              >
                                <Edit3 size={12} /> Edit
                              </button>
                              <button
                                onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=quotation`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                View <ArrowRight size={12} />
                              </button>
                            </>
                          )}

                          {onConvertToProject &&
                            latestQuote?.status === 'Accepted' &&
                            (lead.status === 'Won' || lead.status === 'Converted' ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-lg text-xs font-bold"
                                title="Lead converted into Active Project"
                              >
                                <Trophy size={13} /> Converted ✓
                              </span>
                            ) : (
                              <button
                                onClick={() => onConvertToProject(lead._id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Convert to Project"
                              >
                                <Trophy size={13} /> Convert Project
                              </button>
                            ))}
                          
                          {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(lead.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onMarkAsLost(lead._id); }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-500/20 ml-1.5 cursor-pointer"
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
                <strong>{filteredLeads.length}</strong> quotes
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
                            ? 'bg-rose-600 text-white shadow-sm'
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
}

