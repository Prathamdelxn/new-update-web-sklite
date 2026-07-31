import React, { useState, useEffect } from 'react';
import api from '@/services/api.client';
import { Calendar, Clock, Phone, User, CheckCircle2, ChevronRight, MapPin, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Props {
  onPassToSiteVisit: (leadId: string) => void;
}

export const FollowUpsView = ({ onPassToSiteVisit }: Props) => {
  const router = useRouter();
  const [pendingFollowUps, setPendingFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        const res = await api.get('/crm/activities/pending');
        // Only show follow-ups for leads that are actually in the early pipeline stages
        const filtered = res.data.filter((act: any) => 
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
  }, []);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="text-blue-600 w-6 h-6" /> Pending Follow-ups
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage your scheduled calls and meetings.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pendingFollowUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50 m-6">
          <Clock className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">All clear!</h3>
          <p className="text-sm text-slate-500 max-w-md mt-2">
            You have no pending follow-ups. Go to any Lead's 360 Profile to schedule a future call or meeting!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-widest">
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
            <tbody className="divide-y divide-slate-100">
              {pendingFollowUps.map((act, idx) => (
                <motion.tr 
                  key={act._id}
                  onClick={() => router.push(`/interior/crm/leads/${act.customer?._id}`)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                >
                  {/* Lead Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                        {act.customer?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {act.customer?.name || 'Unknown'}
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Phone size={14} className="text-slate-400" />
                      {act.customer?.mobileNumber}
                    </div>
                  </td>

                  {/* Assigned To */}
                  <td className="px-6 py-4">
                    {act.customer?.assignedSalesExecutive ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 w-max">
                        <UserCircle size={14} className="text-blue-500" />
                        {typeof act.customer.assignedSalesExecutive === 'object' ? act.customer.assignedSalesExecutive.name : 'Assigned'}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
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
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[250px] truncate" title={act.remarks}>
                    {act.remarks || '-'}
                  </td>

                  {/* Actions (Pass to Next Stage) */}
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onPassToSiteVisit(act.customer?._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm group-hover:opacity-100 md:opacity-0"
                      title="Send to Site Visit"
                    >
                      Pass <MapPin size={14} />
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
