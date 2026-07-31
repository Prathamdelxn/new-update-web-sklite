'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, User, Phone, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lead } from './LeadsTable';

export function QuotationsView({ leads, onConvertToProject, onCreateQuotation }: { leads: Lead[], onConvertToProject?: (leadId: string) => void, onCreateQuotation: (leadId: string) => void }) {
  const router = useRouter();

  if (!leads || leads.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center bg-white border border-dashed border-slate-200 rounded-3xl shadow-sm">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-300 mb-4">
          <FileText size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">No Quotations Yet</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Leads will appear here once you generate a quote for them.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl">Lead Info</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Quotation Info</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead, idx) => {
              // Find the latest quotation
              const latestQuote = lead.quotations && lead.quotations.length > 0 
                ? lead.quotations[lead.quotations.length - 1] 
                : null;

              return (
                <tr 
                  key={lead._id}
                  onClick={() => router.push(`/interior/crm/leads/${lead._id}?tab=quotation`)}
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                >
                  {/* Lead Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {lead.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {lead.leadNumber || 'LD-XXXX'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Phone size={14} className="text-slate-400" />
                      {lead.mobileNumber}
                    </div>
                  </td>

                  {/* Quotation Info */}
                  <td className="px-6 py-4">
                    {latestQuote ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <FileText size={12} className="text-slate-400" /> V{latestQuote.version}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            latestQuote.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' : 
                            latestQuote.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-white border border-slate-200 text-slate-600'
                          }`}>
                            {latestQuote.status}
                          </span>
                        </div>
                        <span className="text-sm font-black text-slate-900">
                          ₹{latestQuote.grandTotal?.toLocaleString('en-IN') || 0}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Quotation pending...</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border",
                      (latestQuote?.status === 'Accepted' && lead.status !== 'Converted') ? 'bg-emerald-100 text-emerald-700 border-emerald-100' :
                      lead.status === 'Negotiation' ? 'bg-indigo-100 text-indigo-700 border-indigo-100' : 'bg-rose-100 text-rose-700 border-rose-100'
                    )}>
                      {(latestQuote?.status === 'Accepted' && lead.status !== 'Converted') ? 'Quotation Accepted' : lead.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    {!latestQuote ? (
                      <button 
                        onClick={() => onCreateQuotation(lead._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Create <FileText size={14} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => router.push(`/interior/crm/leads/${lead._id}?tab=quotation`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Open <ArrowRight size={14} />
                      </button>
                    )}
                    
                    {onConvertToProject && (
                      <button 
                        onClick={() => onConvertToProject(lead._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg text-xs font-bold transition-all shadow-sm"
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
