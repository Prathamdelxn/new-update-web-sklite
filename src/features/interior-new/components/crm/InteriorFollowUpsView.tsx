'use client';

// Enhanced Follow-ups View with Status Tabs (All, Pending, Completed), Search, and Direct Site Visit Actions

import React, { useState, useMemo } from 'react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { Clock, Phone, UserCircle, MapPin, CheckCircle2, Search, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [completingId, setCompletingId] = useState<string | null>(null);

  const {
    data: allActivities = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['crm-follow-ups-all'],
    queryFn: async () => {
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
      return deduped;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleCompleteActivity = async (activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setCompletingId(activityId);
      await interiorCrmService.updateActivity(activityId, {
        status: 'Completed',
        completedDate: new Date(),
      });
      toast.success('Follow-up marked as completed! You can now send to Site Visit.');
      queryClient.invalidateQueries({ queryKey: ['crm-follow-ups-all'] });
      await refetch();
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
              'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap text-center cursor-pointer',
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
              'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer',
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
              'flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer',
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
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
              {filteredFollowUps.map((act) => (
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
                          className="text-xs font-bold text-[hsl(var(--foreground))] truncate max-w-[140px] sm:max-w-[220px]"
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

                  <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/0.5)] text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {act.customer?.mobileNumber && (
                        <a href={`tel:${act.customer.mobileNumber}`} className="p-1.5 rounded-lg bg-[hsl(var(--muted))] hover:bg-emerald-500/10 text-emerald-600 transition-colors border border-[hsl(var(--border))]" title="Call Lead"><Phone size={12} /></a>
                      )}
                      {act.customer?.mobileNumber && (
                        <a href={`https://wa.me/${act.customer.mobileNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-[hsl(var(--muted))] hover:bg-emerald-500/10 text-emerald-600 transition-colors border border-[hsl(var(--border))]" title="WhatsApp Lead"><MessageSquare size={12} /></a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {act.status !== 'Completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPassToSiteVisit(act.customer?._id || act.customer?.id);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold active:scale-95 cursor-pointer shadow-sm"
                          title="Complete Follow-up and Send to Site Visit"
                        >
                          <CheckCircle2 size={12} /> Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW (>= md) - Senior Enterprise CRM Table */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[hsl(var(--muted)/0.45)] border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4.5 py-3 rounded-tl-2xl w-[28%]">Lead / Customer</th>
                    <th className="px-4 py-3 w-[16%]">Assigned Rep</th>
                    <th className="px-4 py-3 w-[28%]">Activity & Notes</th>
                    <th className="px-4 py-3 w-[14%]">Status</th>
                    <th className="px-4.5 py-3 text-right rounded-tr-2xl w-[14%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.7)] text-xs">
                  {filteredFollowUps.map((act) => (
                    <tr
                      key={act._id}
                      onClick={() => router.push(`/interior-new/crm/leads/${act.customer?._id}`)}
                      className="hover:bg-[hsl(var(--muted)/0.35)] transition-colors group cursor-pointer"
                    >
                      {/* 1. Lead / Customer */}
                      <td className="px-4.5 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 font-black text-xs shrink-0 shadow-xs">
                            {act.customer?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span 
                                className="font-bold text-xs text-[hsl(var(--foreground))] group-hover:text-amber-600 transition-colors truncate max-w-[150px] lg:max-w-[200px]"
                                title={act.customer?.name || 'Unknown'}
                              >
                                {act.customer?.name || 'Unknown'}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 shrink-0">
                                {act.customer?.leadNumber || 'LD-XXXX'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                              <span className="font-medium text-[hsl(var(--foreground))]">{act.customer?.mobileNumber || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Assigned Rep */}
                      <td className="px-4 py-3">
                        {act.customer?.assignedSalesExecutive ? (
                          <div 
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--foreground))] bg-[hsl(var(--muted)/0.5)] px-2 py-1 rounded-lg border border-[hsl(var(--border))] max-w-[130px] truncate"
                            title={displayUserName(act.customer.assignedSalesExecutive)}
                          >
                            <UserCircle size={13} className="text-amber-600 shrink-0" />
                            <span className="truncate">{displayUserName(act.customer.assignedSalesExecutive)}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] italic">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* 3. Activity & Notes */}
                      <td className="px-4 py-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold tracking-tight uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              {act.type || 'Phone Call'}
                            </span>
                            {act.status === 'Completed' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                                <CheckCircle size={10} /> {new Date(act.completedDate || act.updatedAt || act.createdAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                                <Clock size={10} /> {new Date(act.scheduledDate || act.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {act.remarks ? (
                            <div className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-[220px] truncate" title={act.remarks}>
                              {act.remarks}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[hsl(var(--muted-foreground)/0.6)] italic">No remarks</span>
                          )}
                        </div>
                      </td>

                      {/* 4. Status */}
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-tight uppercase border', act.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20')}>
                          {act.status === 'Completed' ? 'Completed ' : 'Pending'}
                        </span>
                      </td>

                      {/* 5. Actions */}
                      <td className="px-4.5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {act.status === 'Pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPassToSiteVisit(act.customer?._id || act.customer?.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                              title="Complete Follow-up and Send to Site Visit"
                            >
                              <CheckCircle2 size={12} /> Complete
                            </button>
                          )}
                          {onMarkAsLost && !['Lost', 'Won', 'Converted'].includes(act.customer?.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onMarkAsLost(act.customer?._id); }}
                              className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-500/20 cursor-pointer"
                              title="Mark as Lost"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
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
