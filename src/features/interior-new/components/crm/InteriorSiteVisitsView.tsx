'use client';

// Port of src/components/crm/SiteVisitsView.tsx, rewired to interiorCrmService.

import React, { useState, useEffect } from 'react';
import { MapPin, Calendar as CalendarIcon, ArrowRight, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { interiorCrmService } from '@/services/interiorCrm.service';

interface Props {
  leads: any[];
  onLogSiteVisit: (leadId: string) => void;
  onPassToRequirements: (leadId: string) => void;
}

export const InteriorSiteVisitsView = ({ leads, onLogSiteVisit, onPassToRequirements }: Props) => {
  const router = useRouter();
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await interiorCrmService.getPendingActivities();
        const list = res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];
        setPendingActivities(list);
      } catch (error) {
        console.error('Failed to fetch pending activities:', error);
      }
    };
    fetchActivities();
  }, []);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-[hsl(var(--card))] border-2 border-dashed border-[hsl(var(--border))] rounded-3xl">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-400 mb-4">
          <MapPin size={32} />
        </div>
        <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">No Active Site Visits</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mt-2">
          When you change a Lead's status to "Meeting Scheduled" or "Measurement Done", they will appear here.
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
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Scheduled Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {leads.map((lead) => {
              const pendingSiteVisit = pendingActivities.find(act =>
                act.customer?._id === lead._id && act.type === 'Site Visit'
              );
              const resolvedScheduledDate = lead.siteVisitScheduledDate || pendingSiteVisit?.scheduledDate;

              return (
              <tr
                key={lead._id}
                onClick={() => router.push(`/interior-new/crm/leads/${lead._id}?tab=site`)}
                className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
              >
                {/* Lead Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
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

                {/* Location */}
                <td className="px-6 py-4 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-medium">
                    <Home size={14} className="text-[hsl(var(--muted-foreground))]" />
                    <span className="truncate max-w-[200px]">{lead.projectLocation || 'Location Pending'}</span>
                  </div>
                </td>

                {/* Scheduled Date */}
                <td className="px-6 py-4">
                  {resolvedScheduledDate ? (
                    <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] text-xs font-medium">
                      <CalendarIcon size={14} className="text-[hsl(var(--muted-foreground))]" />
                      {new Date(resolvedScheduledDate).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-[hsl(var(--muted-foreground))] italic">Not scheduled</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border bg-purple-50 text-purple-700 border-purple-100">
                    {lead.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onLogSiteVisit(lead._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    Log Visit
                  </button>
                  <button
                    onClick={() => onPassToRequirements(lead._id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                    title="Pass to Requirements"
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
