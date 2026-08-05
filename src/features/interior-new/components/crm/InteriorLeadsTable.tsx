'use client';

// Port of src/components/crm/LeadsTable.tsx — rewired to the interior-new route.

import React from 'react';
import { Phone, Mail, User, Building, ArrowRight, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface InteriorLead {
  _id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  leadNumber?: string;
  leadSource?: string;
  propertyType?: string;
  projectLocation?: string;
  status: string;
  assignedSalesExecutive?: { name?: string; firstName?: string; lastName?: string; fullName?: string; _id: string };
  createdAt: string;
  quotations?: any[];
}

interface InteriorLeadsTableProps {
  leads: InteriorLead[];
  isLoading: boolean;
  onEdit: (lead: InteriorLead) => void;
  onPassToFollowUp: (leadId: string) => void;
  onPassToSiteVisit?: (leadId: string) => void;
  onPassToRequirements?: (leadId: string) => void;
}

function displayUserName(u?: { name?: string; firstName?: string; lastName?: string; fullName?: string }) {
  if (!u) return '';
  if (u.fullName) return u.fullName;
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return u.name || '';
}

export const InteriorLeadsTable: React.FC<InteriorLeadsTableProps> = ({
  leads, isLoading, onEdit,
  onPassToFollowUp, onPassToSiteVisit, onPassToRequirements
}) => {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm p-6 flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-dashed border-[hsl(var(--border))] shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] mb-4">
          <User size={32} />
        </div>
        <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No Leads Found</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mt-1">
          You don't have any leads in this stage yet. Create a new lead to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px] font-black tracking-widest">
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
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {leads.map((lead, idx) => (
              <motion.tr
                key={lead._id}
                onClick={() => router.push(`/interior-new/crm/leads/${lead._id}`)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
              >
                {/* Lead Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--foreground))] font-bold text-xs shrink-0">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                        {lead.name}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        Added {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-6 py-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-medium">
                    <Phone size={14} className="text-[hsl(var(--muted-foreground))]" />
                    {lead.mobileNumber}
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] text-xs">
                      <Mail size={13} className="text-[hsl(var(--muted-foreground))]" />
                      <span className="truncate max-w-[150px]">{lead.email}</span>
                    </div>
                  )}
                </td>

                {/* Source */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-xs font-semibold">
                    {lead.leadSource || 'N/A'}
                  </span>
                </td>

                {/* Assigned To */}
                <td className="px-6 py-4">
                  {lead.assignedSalesExecutive ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-2.5 py-1.5 rounded-lg border border-[hsl(var(--border))] w-max">
                      <UserCircle size={14} className="text-[hsl(var(--primary))]" />
                      {displayUserName(lead.assignedSalesExecutive)}
                    </div>
                  ) : (
                    <span className="text-xs text-[hsl(var(--muted-foreground))] italic">Unassigned</span>
                  )}
                </td>

                {/* Property Info */}
                <td className="px-6 py-4 space-y-1 text-xs">
                  {lead.propertyType && (
                    <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-medium">
                      <Building size={14} className="text-[hsl(var(--muted-foreground))]" />
                      {lead.propertyType}
                    </div>
                  )}
                  {lead.projectLocation ? (
                    <div className="text-[hsl(var(--muted-foreground))] truncate max-w-[150px]">
                      {lead.projectLocation}
                    </div>
                  ) : (
                    <span className="text-[hsl(var(--muted-foreground))] italic">No location</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border',
                    (lead.quotations?.length && lead.quotations[lead.quotations.length - 1].status === 'Accepted' && lead.status !== 'Converted') ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                    lead.status === 'New Lead' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    lead.status === 'Contacted' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    lead.status === 'Meeting Scheduled' || lead.status === 'Measurement Done' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    lead.status === 'Requirement Completed' || lead.status === 'Design Approved' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                    lead.status === 'Quotation Sent' || lead.status === 'Negotiation' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'
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
                    <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">—</span>
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
