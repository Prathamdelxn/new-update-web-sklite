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
      {/* Search & Filter Toolbar with Tab Pills */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Tab Pills */}
        <div className="flex items-center gap-1.5 bg-[hsl(var(--muted))] p-1 rounded-xl w-max">
          <button
            onClick={() => {
              setQuoteFilter('all');
              setCurrentPage(1);
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all',
              quoteFilter === 'all'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            All Quotations ({leads.length})
          </button>
          <button
            onClick={() => {
              setQuoteFilter('pending');
              setCurrentPage(1);
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5',
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
              'px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5',
              quoteFilter === 'completed'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Right: Search Box */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by client, phone, or lead ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
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
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mb-3">
              <FileText size={24} />
            </div>
            <h2 className="text-base font-extrabold text-[hsl(var(--foreground))]">No Quotations Found</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-sm">
              {searchTerm || quoteFilter !== 'all'
                ? 'No quotations match your current filter settings.'
                : 'Leads moved to "Under Quotation" will appear here for pricing and proposal generation.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                            <div 
                              className="font-extrabold text-xs text-[hsl(var(--foreground))] group-hover:text-indigo-600 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                              title={lead.name}
                            >
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            <FileText size={13} /> Create Quote
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => onCreateQuotation(lead._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all"
                              title="Edit Quotation"
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=quotation`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition-all"
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                              title="Convert to Project"
                            >
                              <Trophy size={13} /> Convert Project
                            </button>
                          ))}
                        
                        {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(lead.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkAsLost(lead._id); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-500/20 ml-1.5"
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
        )}

        {/* Pagination Footer */}
        {filteredLeads.length > 0 && (
          <div className="px-6 py-4 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))] font-medium">
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, filteredLeads.length)}</strong> of{' '}
                <strong>{filteredLeads.length}</strong> quotes
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
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'w-7 h-7 rounded-lg font-bold text-xs transition-all',
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

