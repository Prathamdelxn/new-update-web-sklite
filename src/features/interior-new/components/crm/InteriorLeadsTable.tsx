'use client';

// Port of src/components/crm/LeadsTable.tsx — rewired to the interior-new route.

import React from 'react';
import { Phone, Mail, User, Building,BadgeInfo, ArrowRight, UserCircle, Pencil, Trash2, Calendar, MapPin, PenTool, Ruler, Calculator, FileText, Image as ImageIcon } from 'lucide-react';
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
  siteMeasurements?: any;
  sitePhotos?: string[];
  siteVisitScheduledDate?: string;
  designFiles?: any[];
  boqs?: any[];
}

interface InteriorLeadsTableProps {
  leads: InteriorLead[];
  isLoading: boolean;
  onEdit: (lead: InteriorLead) => void;
  onDelete?: (lead: InteriorLead) => void;
  onPassToFollowUp: (leadId: string) => void;
  onPassToSiteVisit?: (leadId: string) => void;
  onPassToRequirements?: (leadId: string) => void;
  onPassToDrawing?: (leadId: string) => void;
  onPassToBoq?: (leadId: string) => void;
  onAddBoq?: (leadId: string) => void;
  onPassToQuotations?: (leadId: string) => void;
  onCreateQuotation?: (leadId: string) => void;
  onUploadDesign?: (leadId: string) => void;
  onLogRequirements?: (leadId: string) => void;
  onConvertToProject?: (leadId: string) => void;
  activeTab?: string;
}

function displayUserName(u?: { name?: string; firstName?: string; lastName?: string; fullName?: string }) {
  if (!u) return '';
  if (u.fullName) return u.fullName;
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return u.name || '';
}

export const InteriorLeadsTable: React.FC<InteriorLeadsTableProps> = ({
  leads, isLoading, onEdit, onDelete,
  onPassToFollowUp, onPassToSiteVisit, onPassToRequirements,
  onPassToDrawing, onPassToBoq, onAddBoq, onPassToQuotations, onCreateQuotation, onUploadDesign, onLogRequirements, onConvertToProject, activeTab
}) => {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-6 flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-dashed border-[hsl(var(--border))] p-12 flex flex-col items-center justify-center text-center">
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
    <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-xs font-semibold">
            <tr>
              <th className="px-6 py-3.5 rounded-tl-2xl">Lead Info</th>
              <th className="px-6 py-3.5">Contact</th>
              <th className="px-6 py-3.5">Source</th>
              <th className="px-6 py-3.5">Assigned To</th>
              <th className="px-6 py-3.5">Property Info</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right rounded-tr-2xl">Actions</th>
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
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--foreground))] font-semibold text-xs shrink-0">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
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
                  <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-medium text-xs">
                    <Phone size={13} className="text-[hsl(var(--muted-foreground))]" />
                    {lead.mobileNumber}
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] text-xs">
                      <Mail size={12} className="text-[hsl(var(--muted-foreground))]" />
                      <span className="truncate max-w-[150px]">{lead.email}</span>
                    </div>
                  )}
                </td>

                {/* Source */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-xs font-medium">
                    {lead.leadSource || 'N/A'}
                  </span>
                </td>

                {/* Assigned To */}
                <td className="px-6 py-4">
                  {lead.assignedSalesExecutive ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.6)] px-2.5 py-1.5 rounded-lg border border-[hsl(var(--border))] w-max">
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
                      <Building size={13} className="text-[hsl(var(--muted-foreground))]" />
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
                    (lead.quotations?.length && lead.quotations[lead.quotations.length - 1].status === 'Accepted' && lead.status !== 'Converted') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    lead.status === 'New Lead' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    lead.status === 'Contacted' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                    lead.status === 'Under Site Visit' || lead.status === 'Measurement Done' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    lead.status === 'Under Requirement' || lead.status === 'Design Approved' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                    lead.status === 'Under Drawing' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                    lead.status === 'Under BOQ Creation' ? 'bg-teal-50 text-teal-600 border-teal-100' :
                    lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'
                  )}>
                    {(lead.quotations?.length && lead.quotations[lead.quotations.length - 1].status === 'Accepted' && lead.status !== 'Converted') ? 'Quotation Accepted' : lead.status}
                  </span>
                </td>

                {/* Actions (Edit, Delete in leads tab, respective actions in drawing/boq tabs) */}
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {activeTab === 'leads' && (
                      <>
                        {lead.status === 'New Lead' && onPassToFollowUp && (
                          <button
                            onClick={() => onPassToFollowUp(lead._id)}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-xl transition-all border border-blue-500/20"
                            title="Schedule Follow-up"
                          >
                            <Calendar size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => onEdit(lead)}
                          className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-xl transition-all border border-[hsl(var(--border))]"
                          title="Edit Lead"
                        >
                          <Pencil size={14} />
                        </button>

                        {onDelete && (
                          <button
                            onClick={() => onDelete(lead)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl transition-all border border-rose-500/20"
                            title="Delete Lead"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}

                    {activeTab === 'drawing' && (
                      <>
                        {onUploadDesign && (
                          <button
                            onClick={() => onUploadDesign(lead._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all"
                            title="Upload Design / Drawing Files"
                          >
                            {(!lead.designFiles || lead.designFiles.length === 0) ? 'Upload Drawing' : 'Add More Drawings'}
                          </button>
                        )}
                        {onPassToBoq && lead.designFiles && lead.designFiles.length > 0 && (
                          <button
                            onClick={() => onPassToBoq(lead._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 text-white hover:bg-cyan-700 rounded-lg text-xs font-bold transition-all"
                            title="Pass to BOQ"
                          >
                            Pass <ArrowRight size={14} />
                          </button>
                        )}
                      </>
                    )}

                    {activeTab === 'boq' && (
                      <>
                        {onAddBoq && (
                          <button
                            onClick={() => onAddBoq(lead._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-xs font-bold transition-all"
                            title={(!lead.boqs || lead.boqs.length === 0) ? "Add BOQ" : "View/Edit BOQ"}
                          >
                            {(!lead.boqs || lead.boqs.length === 0) ? "Add BOQ" : "View/Edit"}
                          </button>
                        )}
                        {onPassToQuotations && lead.boqs && lead.boqs.length > 0 && (
                          <button
                            onClick={() => onPassToQuotations(lead._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                            title="Pass to Quotations"
                          >
                            Pass <ArrowRight size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
