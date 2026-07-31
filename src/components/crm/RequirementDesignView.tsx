import React from 'react';
import { PenTool, CheckCircle2, ArrowRight, User, FileText, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Props {
  leads: any[];
  onLogRequirements: (leadId: string) => void;
  onUploadDesign: (leadId: string) => void;
  onPassToQuotations: (leadId: string) => void;
}

export const RequirementDesignView = ({ leads, onLogRequirements, onUploadDesign, onPassToQuotations }: Props) => {
  const router = useRouter();

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
          <PenTool size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">No Design Projects Active</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2">
          Leads moved to "Requirement Completed" or "Design Approved" will appear here for tracking layouts and 3D renders.
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
              <th className="px-6 py-4">Property Info</th>
              <th className="px-6 py-4">Design Status</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead, idx) => {
              // Action button states
              // Requirement is disabled if requirements are already filled or if design is approved.
              const isRequirementDisabled = (lead.requirements && lead.requirements.length > 0) || lead.status === 'Design Approved';
              // Design is disabled if requirements are NOT filled yet, or if design is already approved.
              const isDesignDisabled = !(lead.requirements && lead.requirements.length > 0) || lead.status === 'Design Approved';

              return (
                <tr 
                  key={lead._id}
                  onClick={() => router.push(`/interior/crm/leads/${lead._id}?tab=design`)}
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                >
                  {/* Lead Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-xs shrink-0">
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

                  {/* Property Info */}
                  <td className="px-6 py-4 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <User size={14} className="text-slate-400" />
                      <span className="truncate max-w-[200px]">{lead.propertyType || 'Property pending'}</span>
                    </div>
                  </td>

                  {/* Design Status */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-slate-400" />
                        <span className="font-bold text-slate-900">{lead.requirements?.length || 0}</span> Rooms to Design
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ImageIcon size={12} className="text-slate-400" />
                        <span className="font-bold text-slate-900">{lead.designFiles?.length || 0}</span> Design Files
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border",
                      lead.status === 'Design Approved' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    )}>
                      {lead.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => onLogRequirements(lead._id)}
                      disabled={isRequirementDisabled}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      Requirement
                    </button>
                    <button 
                      onClick={() => onUploadDesign(lead._id)}
                      disabled={isDesignDisabled}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all shadow-sm"
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
