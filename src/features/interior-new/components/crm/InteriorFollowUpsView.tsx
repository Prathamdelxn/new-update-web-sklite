'use client';

// Enhanced Follow-ups View with Status Tabs (All, Pending, Completed), Search, and Direct Site Visit Actions

import React, { useState, useEffect, useMemo } from 'react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { Calendar, Clock, Phone, UserCircle, MapPin, CheckCircle2, Search, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface Props {
  onPassToSiteVisit: (leadId: string) => void;
  refreshTrigger?: any;
  onMarkAsLost?: (leadId: string) => void;
}

function displayUserName(u?: any) {
  if (!u) return '';
  if (typeof u !== 'object') return 'Assigned';
  if (u.fullName) return u.fullName;
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return u.name || 'Assigned';
}

export const InteriorFollowUpsView = ({ onPassToSiteVisit, refreshTrigger, onMarkAsLost }: Props) => {
  const router = useRouter();
  const toast = useToast();
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const res = await interiorCrmService.getActivities();
      const list = res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];

      // Filter and deduplicate per customer (only 1 row per lead in follow-ups)
      const seen = new Set<string>();
      const deduped: any[] = [];

      for (const act of list) {
        if (!act.customer) continue;
        const custId = act.customer._id || act.customer.id;
        if (!custId) continue;
        if (act.customer.status === 'Lost') continue;
        if (act.type === 'Site Visit' || act.type === 'Status Change' || act.type === 'System Update') continue;

        if (!seen.has(custId)) {
          seen.add(custId);
          deduped.push(act);
        }
      }

      setAllActivities(deduped);
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [refreshTrigger]);

  const handleCompleteActivity = async (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setCompletingId(activityId);
      await interiorCrmService.updateActivity(activityId, {
        status: 'Completed',
        completedDate: new Date(),
      });
      toast.success('Follow-up marked as completed! You can now send to Site Visit.');
      fetchActivities();
    } catch (err: any) {
      toast.error('Failed to complete follow-up');
    } finally {
      setCompletingId(null);
    }
  };

  const pendingCount = useMemo(() => allActivities.filter((a) => a.status === 'Pending').length, [allActivities]);
  const completedCount = useMemo(() => allActivities.filter((a) => a.status === 'Completed').length, [allActivities]);

  const filteredFollowUps = useMemo(() => {
    let list = [...allActivities];

    // Filter by tab
    if (activeTab === 'pending') {
      list = list.filter((a) => a.status === 'Pending');
    } else if (activeTab === 'completed') {
      list = list.filter((a) => a.status === 'Completed');
    }

    // Filter by search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (act) =>
          act.customer?.name?.toLowerCase().includes(q) ||
          act.customer?.mobileNumber?.toLowerCase().includes(q) ||
          act.customer?.leadNumber?.toLowerCase().includes(q) ||
          act.type?.toLowerCase().includes(q) ||
          act.remarks?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allActivities, activeTab, searchTerm]);

  return (
    <div className="w-full space-y-4">
      {/* Header, Filter Tabs & Search Bar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Tab Pills */}
        <div className="flex items-center gap-1.5 bg-[hsl(var(--muted))] p-1 rounded-xl w-max">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all',
              activeTab === 'all'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            All Follow-ups ({allActivities.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5',
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5',
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Right: Search Box */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search by client, phone, remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mb-3">
              <Clock size={24} />
            </div>
            <h3 className="text-base font-extrabold text-[hsl(var(--foreground))] mb-1">
              {searchTerm ? 'No Matching Follow-ups' : activeTab === 'completed' ? 'No Completed Follow-ups Yet' : 'All Clear!'}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
              {searchTerm
                ? 'Try adjusting your search terms.'
                : activeTab === 'completed'
                ? 'Completed follow-up calls and meetings will appear here with a direct option to send to Site Visit.'
                : 'You have no pending follow-up touchpoints. Schedule a call or meeting from any lead profile.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-3.5 rounded-tl-2xl">Lead Info</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5">Assigned To</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Type & Follow-up Status</th>
                  <th className="px-6 py-3.5">Goal / Remarks</th>
                  <th className="px-6 py-3.5 text-right rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredFollowUps.map((act, idx) => (
                  <motion.tr
                    key={act._id}
                    onClick={() => router.push(`/interior-new/crm/leads/${act.customer?._id}`)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
                  >
                    {/* Lead Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-extrabold text-xs shrink-0">
                          {act.customer?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-[hsl(var(--foreground))] group-hover:text-amber-600 transition-colors">
                            {act.customer?.name || 'Unknown'}
                          </div>
                          <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                            {act.customer?.leadNumber || 'LD-XXXX'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--foreground))]">
                        <Phone size={13} className="text-[hsl(var(--muted-foreground))]" />
                        {act.customer?.mobileNumber || '-'}
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td className="px-6 py-4">
                      {act.customer?.assignedSalesExecutive ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-2.5 py-1 rounded-lg border border-[hsl(var(--border))] w-max">
                          <UserCircle size={13} className="text-amber-600" />
                          {displayUserName(act.customer.assignedSalesExecutive)}
                        </div>
                      ) : (
                        <span className="text-xs text-[hsl(var(--muted-foreground))] italic">Unassigned</span>
                      )}
                    </td>

                    {/* Scheduled / Completed For */}
                    <td className="px-6 py-4">
                      {act.status === 'Completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold">
                          <CheckCircle size={12} />
                          {new Date(act.completedDate || act.updatedAt || act.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold">
                          <Clock size={12} />
                          {new Date(act.scheduledDate || act.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </td>

                    {/* Type & Follow-up Status */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            {act.type}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border',
                              act.status === 'Completed'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            )}
                          >
                            {act.status === 'Completed' ? 'Completed ✓' : 'Pending'}
                          </span>
                        </div>
                        {act.customer?.status && (
                          <div className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                            Stage: <span className="text-[hsl(var(--foreground))]">{act.customer.status}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Remarks */}
                    <td className="px-6 py-4 text-xs text-[hsl(var(--muted-foreground))] max-w-[220px] truncate" title={act.remarks}>
                      {act.remarks || '-'}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      {act.status === 'Pending' && (
                        /* Pending follow-up: Show Done button to complete the call/meeting */
                        <button
                          onClick={(e) => handleCompleteActivity(act._id, e)}
                          disabled={completingId === act._id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                          title="Mark Follow-up as Completed"
                        >
                          <CheckCircle2 size={13} /> {completingId === act._id ? 'Saving...' : 'Done'}
                        </button>
                      )}

                      {/* Site Visit Button: ONLY shown if follow-up is completed AND lead has not yet been passed to site visit */}
                      {act.status === 'Completed' &&
                        ['New Lead', 'Contacted', 'Meeting Scheduled'].includes(act.customer?.status || '') && (
                          <button
                            onClick={() => onPassToSiteVisit(act.customer?._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-white bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                            title="Send this Lead to Site Visit"
                          >
                            <MapPin size={12} /> Site Visit
                          </button>
                        )}

                      <button
                        onClick={() => router.push(`/interior-new/crm/leads/${act.customer?._id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] rounded-lg text-xs font-bold transition-all border border-[hsl(var(--border))]"
                        title="View Lead Profile"
                      >
                        View <ArrowRight size={12} />
                      </button>

                      {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(act.customer?.status) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onMarkAsLost(act.customer?._id); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-500/20"
                          title="Mark as Lost"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


