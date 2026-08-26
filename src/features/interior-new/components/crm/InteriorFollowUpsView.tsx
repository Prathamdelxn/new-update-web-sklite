'use client';

// Port of src/components/crm/FollowUpsView.tsx, rewired to interiorCrmService.

import React, { useState, useEffect } from 'react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { Calendar, Clock, Phone, UserCircle, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Props {
  onPassToSiteVisit: (leadId: string) => void;
  refreshTrigger?: any;
}

function displayUserName(u?: any) {
  if (!u) return '';
  if (typeof u !== 'object') return 'Assigned';
  if (u.fullName) return u.fullName;
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return u.name || 'Assigned';
}

export const InteriorFollowUpsView = ({ onPassToSiteVisit, refreshTrigger }: Props) => {
  const router = useRouter();
  const [pendingFollowUps, setPendingFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        const res = await interiorCrmService.getPendingActivities();
        const list = res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];
        // Only show follow-ups for leads that are actually in the early pipeline stages
        const filtered = list.filter((act: any) =>
          act.customer && ['New Lead', 'Contacted'].includes(act.customer.status)
        );
        setPendingFollowUps(filtered);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFollowUps();
  }, [refreshTrigger]);

  return (
    <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
      <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Calendar className="text-[hsl(var(--primary))] w-6 h-6" /> Pending Follow-ups
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Manage your scheduled calls and meetings.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pendingFollowUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--muted))] m-6">
          <Clock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">All clear!</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-md mt-2">
            You have no pending follow-ups. Go to any Lead's 360 Profile to schedule a future call or meeting!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Lead Info</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Assigned To</th>
                <th className="px-6 py-4">Scheduled For</th>
                <th className="px-6 py-4">Activity Type</th>
                <th className="px-6 py-4">Remarks</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {pendingFollowUps.map((act, idx) => (
                <motion.tr
                  key={act._id}
                  onClick={() => router.push(`/interior-new/crm/leads/${act.customer?._id}`)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
                >
                  {/* Lead Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--foreground))] font-bold text-xs shrink-0">
                        {act.customer?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                        {act.customer?.name || 'Unknown'}
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-[hsl(var(--foreground))] font-medium">
                      <Phone size={14} className="text-[hsl(var(--muted-foreground))]" />
                      {act.customer?.mobileNumber}
                    </div>
                  </td>

                  {/* Assigned To */}
                  <td className="px-6 py-4">
                    {act.customer?.assignedSalesExecutive ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-2.5 py-1.5 rounded-lg border border-[hsl(var(--border))] w-max">
                        <UserCircle size={14} className="text-[hsl(var(--primary))]" />
                        {displayUserName(act.customer.assignedSalesExecutive)}
                      </div>
                    ) : (
                      <span className="text-xs text-[hsl(var(--muted-foreground))] italic">Unassigned</span>
                    )}
                  </td>

                  {/* Scheduled For */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold">
                      <Clock size={12} />
                      {new Date(act.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </td>

                  {/* Activity Type */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-50 text-blue-600 border border-blue-100">
                      {act.type}
                    </span>
                  </td>

                  {/* Remarks */}
                  <td className="px-6 py-4 text-xs text-[hsl(var(--muted-foreground))] max-w-[250px] truncate" title={act.remarks}>
                    {act.remarks || '-'}
                  </td>

                  {/* Actions (Pass to Next Stage) */}
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onPassToSiteVisit(act.customer?._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5  text-white bg-blue-600 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                      title="Send to Site Visit"
                    >
                      <MapPin size={14} />Send to Site Visit 
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
