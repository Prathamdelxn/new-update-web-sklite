'use client';

// Port of src/components/crm/QuotationsView.tsx — pure UI, no data-layer calls of its own.

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, Phone, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InteriorLead } from './InteriorLeadsTable';

export function InteriorQuotationsView({ leads, onConvertToProject, onCreateQuotation }: { leads: InteriorLead[], onConvertToProject?: (leadId: string) => void, onCreateQuotation: (leadId: string) => void }) {
  const router = useRouter();

  if (!leads || leads.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-3xl">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-300 mb-4">
          <FileText size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] tracking-tight">No Quotations Yet</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 max-w-sm">
          Leads will appear here once you generate a quote for them.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl">Lead Info</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Quotation Info</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {leads.map((lead) => {
              const latestQuote = lead.quotations && lead.quotations.length > 0
                ? lead.quotations[lead.quotations.length - 1]
                : null;

              return (
                <tr
                  key={lead._id}
                  onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=quotation`)}
                  className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
                >
                  {/* Lead Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                          {lead.name}
                        </div>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                          {lead.leadNumber || 'LD-XXXX'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-medium">
                      <Phone size={14} className="text-[hsl(var(--muted-foreground))]" />
                      {lead.mobileNumber}
                    </div>
                  </td>

                  {/* Quotation Info */}
                  <td className="px-6 py-4">
                    {latestQuote ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <FileText size={12} className="text-[hsl(var(--muted-foreground))]" /> V{latestQuote.version}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            latestQuote.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                            latestQuote.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                          }`}>
                            {latestQuote.status}
                          </span>
                        </div>
                        <span className="text-sm font-black text-[hsl(var(--foreground))]">
                          ₹{latestQuote.grandTotal?.toLocaleString('en-IN') || 0}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))] italic">Quotation pending...</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border',
                      (latestQuote?.status === 'Accepted' && lead.status !== 'Converted') ? 'bg-emerald-100 text-emerald-700 border-emerald-100' :
                      lead.status === 'Negotiation' ? 'bg-indigo-100 text-indigo-700 border-indigo-100' : 'bg-rose-100 text-rose-700 border-rose-100'
                    )}>
                      {(latestQuote?.status === 'Accepted' && lead.status !== 'Converted') ? 'Quotation Accepted' : lead.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right space-x-2 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    {!latestQuote ? (
                      <button
                        onClick={() => onCreateQuotation(lead._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all"
                      >
                        Create <FileText size={14} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onCreateQuotation(lead._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--card))] text-teal-600 border border-teal-200 hover:bg-teal-50 rounded-lg text-xs font-bold transition-all"
                          title="Edit Quotation"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=quotation`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--card))] text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all"
                        >
                          Open <ArrowRight size={14} />
                        </button>
                      </>
                    )}

                    {onConvertToProject && latestQuote?.status === 'Accepted' && lead.status !== 'Won' && lead.status !== 'Converted' && (
                      <button
                        onClick={() => onConvertToProject(lead._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg text-xs font-bold transition-all"
                        title="Convert to Project"
                      >
                        <Trophy size={14} /> Convert
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
