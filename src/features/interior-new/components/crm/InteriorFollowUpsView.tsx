'use client';

// Enhanced Follow-ups View with Status Tabs (All, Pending, Completed), Search, and Direct Site Visit Actions

import React, { useState, useEffect, useMemo } from 'react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { Calendar, Clock, Phone, UserCircle, MapPin, CheckCircle2, Search, ArrowRight, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
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
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Tab Pills */}
        <div className="flex items-center gap-1.5 bg-[hsl(var(--muted))] p-1 rounded-xl w-full sm:w-max overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap text-center',
              activeTab === 'all'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            All ({allActivities.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5',
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
'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5',
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Right: Search Box */}
        <div className="relative w-full sm:min-w-[240px] sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-10 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
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

      {/* Content Container */}
      <div className="w-full bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
        {isLoading ? (
          <div className="p-6 flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-[hsl(var(--muted))] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredFollowUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mb-3">
              <Clock size={24} />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))] mb-1">
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
          <>
            {/* MOBILE CARD VIEW (< md) */}
            <div className="block md:hidden divide-y divide-[hsl(var(--border))]">
              {filteredFollowUps.map((act, idx) => (
                <div
                  key={act._id}
                  onClick={() => router.push(`/interior-new/crm/leads/${act.customer?._id}`)}
                  className="p-3.5 space-y-2.5 active:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-extrabold text-xs shrink-0">
                        {act.customer?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 
                          className="text-xs font-bold text-[hsl(var(--foreground))] truncate max-w-[100px] sm:max-w-[220px]"
                          title={act.customer?.name || 'Unknown'}
                        >
                          {act.customer?.name || 'Unknown'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="font-mono text-[hsl(var(--muted-foreground))] shrink-0">{act.customer?.leadNumber || 'LD-XXXX'}</span>
                          <span className="text-[hsl(var(--muted-foreground))]">•</span>
                          <span className="text-[hsl(var(--muted-foreground))] truncate">{act.customer?.mobileNumber}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={cn(
'shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border',
                        act.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      )}
                    >
                      {act.status}
                    </span>
                  </div>

                  {/* Activity Details */}
                  <div className="bg-[hsl(var(--muted)/0.4)] p-2.5 rounded-xl border border-[hsl(var(--border)/0.5)] space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[hsl(var(--foreground))]">{act.type}</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">
                        {act.scheduledDate ? new Date(act.scheduledDate).toLocaleDateString() : new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {act.remarks && (
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-2 italic" title={act.remarks}>
                        &quot;{act.remarks}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions Ribbon */}
                  <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/0.5)] text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {act.customer?.mobileNumber && (
                        <a
                          href={`tel:${act.customer.mobileNumber}`}
                          className="p-1.5 rounded-lg bg-[hsl(var(--muted))] hover:bg-emerald-500/10 text-emerald-600 transition-colors border border-[hsl(var(--border))]"
                          title="Call Lead"
                        >
                          <Phone size={12} />
                        </a>
                      )}
                      {act.customer?.mobileNumber && (
                        <a
                          href={`https://wa.me/${act.customer.mobileNumber.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-[hsl(var(--muted))] hover:bg-emerald-500/10 text-emerald-600 transition-colors border border-[hsl(var(--border))]"
                          title="WhatsApp Lead"
                        >
                          <MessageSquare size={12} />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {act.status !== 'Completed' ? (
                        <button
                          onClick={(e) => handleCompleteActivity(act._id, e)}
                          disabled={completingId === act._id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 size={12} /> Done
                        </button>
                      ) : (
                        ['New Lead', 'Contacted', 'Meeting Scheduled'].includes(act.customer?.status || '') && (
                          <button
                            onClick={() => onPassToSiteVisit(act.customer?._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-white bg-purple-600 text-xs font-bold rounded-lg active:scale-95 cursor-pointer"
                          >
                            <MapPin size={11} /> Site Visit
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] text-[11px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)]">
                    <th className="px-6 py-4">Lead / Customer</th>
                    <th className="px-6 py-4">Follow-up Type</th>
                    <th className="px-6 py-4">Scheduled Date</th>
                    <th className="px-6 py-4">Remarks / Notes</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))] text-xs">
                  {filteredFollowUps.map((act) => (
                    <tr
                      key={act._id}
                      onClick={() => router.push(`/interior-new/crm/leads/${act.customer?._id}`)}
                      className="hover:bg-[hsl(var(--accent))] transition-colors group cursor-pointer"
                    >
                      {/* Customer Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-extrabold text-xs shrink-0">
                            {act.customer?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div 
                              className="font-extrabold text-xs text-[hsl(var(--foreground))] group-hover:text-amber-600 transition-colors truncate max-w-[100px] sm:max-w-[200px] lg:max-w-[280px]"
                              title={act.customer?.name || 'Unknown'}
                            >
                              {act.customer?.name || 'Unknown'}
                            </div>
                            <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] shrink-0">
                              {act.customer?.leadNumber || 'LD-XXXX'}
                            </div>
                          </div>
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
                      <td className="px-6 py-4 text-xs text-[hsl(var(--muted-foreground))] max-w-[170px] truncate" title={act.remarks}>
                        {act.remarks || '-'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        {act.status === 'Pending' && (
                          <button
                            onClick={(e) => handleCompleteActivity(act._id, e)}
                            disabled={completingId === act._id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            title="Mark Follow-up as Completed"
                          >
                            <CheckCircle2 size={13} /> {completingId === act._id ? 'Saving...' : 'Done'}
                          </button>
                        )}

                        {act.status === 'Completed' &&
                          ['New Lead', 'Contacted', 'Meeting Scheduled'].includes(act.customer?.status || '') && (
                            <button
                              onClick={() => onPassToSiteVisit(act.customer?._id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-white bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="Send this Lead to Site Visit"
                            >
                              <MapPin size={12} /> Site Visit
                            </button>
                          )}

                        <button
                          onClick={() => router.push(`/interior-new/crm/leads/${act.customer?._id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] rounded-lg text-xs font-bold transition-all border border-[hsl(var(--border))] cursor-pointer"
                          title="View Lead Profile"
                        >
                          <ArrowRight size={13} />
                        </button>

                        {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(act.customer?.status) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMarkAsLost(act.customer?._id); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-500/20 cursor-pointer"
                            title="Mark as Lost"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


