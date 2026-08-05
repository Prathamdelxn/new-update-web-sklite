'use client';

// Port of src/components/crm/RequirementDesignView.tsx — pure UI, no data-layer calls of its own.

import React from 'react';
import { ArrowRight, User, FileText, Image as ImageIcon, PenTool } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Props {
  leads: any[];
  onLogRequirements: (leadId: string) => void;
  onUploadDesign: (leadId: string) => void;
  onPassToQuotations: (leadId: string) => void;
}

export const InteriorRequirementDesignView = ({ leads, onLogRequirements, onUploadDesign, onPassToQuotations }: Props) => {
  const router = useRouter();

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-[hsl(var(--card))] border-2 border-dashed border-[hsl(var(--border))] rounded-3xl">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
          <PenTool size={32} />
        </div>
        <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">No Design Projects Active</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mt-2">
          Leads moved to "Requirement Completed" or "Design Approved" will appear here for tracking layouts and 3D renders.
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
              <th className="px-6 py-4">Property Info</th>
              <th className="px-6 py-4">Design Status</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {leads.map((lead) => {
              const isRequirementDisabled = (lead.requirements && lead.requirements.length > 0) || lead.status === 'Design Approved';
              const isDesignDisabled = !(lead.requirements && lead.requirements.length > 0) || lead.status === 'Design Approved';

              return (
                <tr
                  key={lead._id}
                  onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=design`)}
                  className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
                >
                  {/* Lead Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">
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

                  {/* Property Info */}
                  <td className="px-6 py-4 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-medium">
                      <User size={14} className="text-[hsl(var(--muted-foreground))]" />
                      <span className="truncate max-w-[200px]">{lead.propertyType || 'Property pending'}</span>
                    </div>
                  </td>

                  {/* Design Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-[hsl(var(--muted-foreground))]" />
                        <span className="font-bold text-[hsl(var(--foreground))]">{lead.requirements?.length || 0}</span> Rooms to Design
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ImageIcon size={12} className="text-[hsl(var(--muted-foreground))]" />
                        <span className="font-bold text-[hsl(var(--foreground))]">{lead.designFiles?.length || 0}</span> Design Files
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border',
                      lead.status === 'Design Approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    )}>
                      {lead.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onLogRequirements(lead._id)}
                      disabled={isRequirementDisabled}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all"
                    >
                      Requirement
                    </button>
                    <button
                      onClick={() => onUploadDesign(lead._id)}
                      disabled={isDesignDisabled}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all"
                    >
                      Design
                    </button>
                    <button
                      onClick={() => onPassToQuotations(lead._id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                      title="Pass to Quotations"
                    >
                      Pass <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
