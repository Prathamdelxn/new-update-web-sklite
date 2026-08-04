import React from 'react';
import { Phone, Mail, User, Building, ArrowRight, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface Lead {
  _id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  leadNumber?: string;
  leadSource?: string;
  propertyType?: string;
  projectLocation?: string;
  status: string;
  assignedSalesExecutive?: { name: string; _id: string }; // newly populated field
  createdAt: string;
  quotations?: any[];
}

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  onEdit: (lead: Lead) => void;
  onPassToFollowUp: (leadId: string) => void;
  onPassToSiteVisit?: (leadId: string) => void;
  onPassToRequirements?: (leadId: string) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({ 
  leads, isLoading, onEdit, 
  onPassToFollowUp, onPassToSiteVisit, onPassToRequirements 
}) => {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <User size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Leads Found</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          You don't have any leads in this stage yet. Create a new lead to get started!
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
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Assigned To</th>
              <th className="px-6 py-4">Property Info</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead, idx) => (
              <motion.tr 
                key={lead._id}
                onClick={() => router.push(`/interior/crm/leads/${lead._id}`)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
              >
                {/* Lead Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {lead.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Added {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-6 py-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Phone size={14} className="text-slate-400" />
                    {lead.mobileNumber}
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Mail size={13} className="text-slate-400" />
                      <span className="truncate max-w-[150px]">{lead.email}</span>
                    </div>
                  )}
                </td>

                {/* Source */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                    {lead.leadSource || 'N/A'}
                  </span>
                </td>

                {/* Assigned To */}
                <td className="px-6 py-4">
                  {lead.assignedSalesExecutive ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 w-max">
                      <UserCircle size={14} className="text-blue-500" />
                      {lead.assignedSalesExecutive.name}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Property Info */}
                <td className="px-6 py-4 space-y-1 text-xs">
                  {lead.propertyType && (
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Building size={14} className="text-slate-400" />
                      {lead.propertyType}
                    </div>
                  )}
                  {lead.projectLocation ? (
                    <div className="text-slate-500 truncate max-w-[150px]">
                      {lead.projectLocation}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No location</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border",
                    (lead.quotations?.length && lead.quotations[lead.quotations.length - 1].status === 'Accepted' && lead.status !== 'Converted') ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                    lead.status === 'New Lead' ? "bg-blue-50 text-blue-600 border-blue-100" :
                    lead.status === 'Contacted' ? "bg-amber-50 text-amber-600 border-amber-100" :
                    lead.status === 'Meeting Scheduled' || lead.status === 'Measurement Done' ? "bg-purple-50 text-purple-600 border-purple-100" :
                    lead.status === 'Requirements Gathering' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                    lead.status === 'Requirement Completed' || lead.status === 'Design Approved' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                    lead.status === 'Quotation Pending' ? "bg-rose-50 text-rose-600 border-rose-100" :
                    lead.status === 'Quotation Sent' || lead.status === 'Negotiation' ? "bg-rose-50 text-rose-600 border-rose-100" :
                    lead.status === 'Converted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    "bg-slate-50 text-slate-600 border-slate-200"
                  )}>
                    {(lead.quotations?.length && lead.quotations[lead.quotations.length - 1].status === 'Accepted' && lead.status !== 'Converted') ? 'Quotation Accepted' : lead.status}
                  </span>
                </td>

                {/* Actions (Pass to Next Stage) */}
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  {(lead.status === 'New Lead') && (
                    <button
                      onClick={() => onPassToFollowUp(lead._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm group-hover:opacity-100 md:opacity-0"
                      title="Pass to Follow-up"
                    >
                      Follow-up <ArrowRight size={14} />
                    </button>
                  )}
                  {lead.status === 'Contacted' && onPassToSiteVisit && (
                    <button
                      onClick={() => onPassToSiteVisit(lead._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm group-hover:opacity-100 md:opacity-0"
                      title="Send to Site Visit"
                    >
                      Site Visit <ArrowRight size={14} />
                    </button>
                  )}
                  {(lead.status === 'Meeting Scheduled' || lead.status === 'Measurement Done') && onPassToRequirements && (
                    <button
                      onClick={() => onPassToRequirements(lead._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm group-hover:opacity-100 md:opacity-0"
                      title="Pass to Requirements"
                    >
                      Requirements <ArrowRight size={14} />
                    </button>
                  )}
                  {['Requirement Completed', 'Design Approved', 'Quotation Sent', 'Negotiation', 'Converted', 'Lost'].includes(lead.status) && (
                    <span className="text-xs text-slate-400 font-semibold">—</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
