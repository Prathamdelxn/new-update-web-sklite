import React, { useState, useEffect } from 'react';
import { MapPin, Calendar as CalendarIcon, Clock, ArrowRight, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/services/api.client';

interface Props {
  leads: any[];
  onLogSiteVisit: (leadId: string) => void;
  onPassToRequirements: (leadId: string) => void;
}

export const SiteVisitsView = ({ leads, onLogSiteVisit, onPassToRequirements }: Props) => {
  const router = useRouter();
  const [pendingActivities, setPendingActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await api.get('/crm/activities/pending');
        setPendingActivities(res.data);
      } catch (error) {
        console.error('Failed to fetch pending activities:', error);
      }
    };
    fetchActivities();
  }, []);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-400 mb-4">
          <MapPin size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">No Active Site Visits</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-2">
          When you change a Lead's status to "Meeting Scheduled" or "Measurement Done", they will appear here.
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
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Scheduled Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead, idx) => {
              const pendingSiteVisit = pendingActivities.find(act => 
                act.customer?._id === lead._id && act.type === 'Site Visit'
              );
              const resolvedScheduledDate = lead.siteVisitScheduledDate || pendingSiteVisit?.scheduledDate;

              return (
              <tr 
                key={lead._id}
                onClick={() => router.push(`/interior/crm/leads/${lead._id}?tab=site`)}
                className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
              >
                {/* Lead Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs shrink-0">
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

                {/* Location */}
                <td className="px-6 py-4 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Home size={14} className="text-slate-400" />
                    <span className="truncate max-w-[200px]">{lead.projectLocation || 'Location Pending'}</span>
                  </div>
                </td>

                {/* Scheduled Date */}
                <td className="px-6 py-4">
                  {resolvedScheduledDate ? (
                    <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                      <CalendarIcon size={14} className="text-slate-400" />
                      {new Date(resolvedScheduledDate).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Not scheduled</span>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold transition-all shadow-sm"
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
