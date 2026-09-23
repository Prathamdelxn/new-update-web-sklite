'use client';

import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  Users,
  Building,
  MapPin,
  Mail,
  CheckCircle2,
  Plus,
  Pencil,
  FileText,
  User,
  Sparkles,
  AlertTriangle,
  History,
  ArrowRight,
  RotateCcw,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';

interface InteriorLeadFollowUpsTabProps {
  lead: any;
  activities: any[];
  users: any[];
  onRefresh: () => void;
  onScheduleFollowUp: () => void;
  onLogActivity?: () => void;
  onSendToSiteVisit: () => void;
  isConverted?: boolean;
}

export const InteriorLeadFollowUpsTab: React.FC<InteriorLeadFollowUpsTabProps> = ({
  lead,
  activities,
  users,
  onRefresh,
  onScheduleFollowUp,
  onSendToSiteVisit,
  isConverted = false,
}) => {
  const toast = useToast();

  // Helper to calculate overdue human-readable text
  const getOverdueText = (dateStr?: string | Date) => {
    if (!dateStr) return 'Schedule Expired';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs <= 0) return 'Schedule Expired';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `${diffDays}d overdue`;
    }
    if (diffHours > 0) {
      return `${diffHours}h overdue`;
    }
    return `${Math.max(1, diffMins)}m overdue`;
  };

  // Helper to resolve user names
  const getUserDisplayName = (userRef: any) => {
    if (!userRef) return 'Assigned Staff';
    const uId = typeof userRef === 'object' ? userRef._id || userRef.id || userRef.clerkUserId : userRef;
    const matched = users.find((u) => u._id === uId || u.id === uId || u.clerkUserId === uId);
    if (matched) {
      return matched.fullName || `${matched.firstName || ''} ${matched.lastName || ''}`.trim() || matched.name || 'Team Member';
    }
    if (typeof userRef === 'object') {
      return userRef.fullName || `${userRef.firstName || ''} ${userRef.lastName || ''}`.trim() || userRef.name || 'Team Member';
    }
    return 'Team Member';
  };

  // All follow-up activities filtered and sorted
  const allFollowUps = useMemo(() => {
    const list = activities.filter(
      (a) =>
        a.type !== 'Status Change' &&
        a.type !== 'Site Visit' &&
        (a.remarks || a.scheduledDate || a.status === 'Pending')
    );

    // Sort: Pending items at the top, then by most recent date descending
    return list.sort((a, b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (b.status === 'Pending' && a.status !== 'Pending') return 1;
      const timeA = new Date(a.scheduledDate || a.createdAt).getTime();
      const timeB = new Date(b.scheduledDate || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [activities]);

  // Current active follow-up note
  const currentFollowUp = useMemo(() => {
    const pending = allFollowUps.find((a) => a.status === 'Pending');
    if (pending) return pending;
    return allFollowUps[0] || null;
  }, [allFollowUps]);

  // Previous follow-ups list (all records other than current active note)
  const previousFollowUps = useMemo(() => {
    if (!currentFollowUp) return [];
    return allFollowUps.filter((a) => a._id !== currentFollowUp._id);
  }, [allFollowUps, currentFollowUp]);

  const assignedUserName = useMemo(() => {
    if (lead?.assignedSalesExecutive) {
      return getUserDisplayName(lead.assignedSalesExecutive);
    }
    if (currentFollowUp?.user) {
      return getUserDisplayName(currentFollowUp.user);
    }
    return 'Unassigned';
  }, [lead, currentFollowUp, users]);

  const getTypeIcon = (type?: string, className = "w-4 h-4") => {
    switch (type) {
      case 'Phone Call':
        return <Phone className={cn(className, "text-blue-500")} />;
      case 'WhatsApp':
        return <MessageSquare className={cn(className, "text-emerald-500")} />;
      case 'Meeting':
        return <Users className={cn(className, "text-purple-500")} />;
      case 'Office Visit':
        return <Building className={cn(className, "text-indigo-500")} />;
      case 'Site Visit':
        return <MapPin className={cn(className, "text-amber-500")} />;
      default:
        return <Calendar className={cn(className, "text-blue-500")} />;
    }
  };

  const isInitialPhase = ['New Lead', 'Contacted', 'Meeting Scheduled'].includes(lead?.status || '');
  const hasSiteVisitStarted =
    !isInitialPhase ||
    lead?.status === 'Under Site Visit' ||
    lead?.status === 'Measurement Done' ||
    Boolean(lead?.siteMeasurements) ||
    (Array.isArray(lead?.sitePhotos) && lead.sitePhotos.length > 0) ||
    Boolean(lead?.linkedProject);

  const isLeadProgressed =
    !isInitialPhase ||
    isConverted ||
    Boolean(lead?.linkedProject) ||
    [
      'Won',
      'Converted',
      'Booking Pending',
      'Under Quotation',
      'Quotation Pending',
      'Quotation Sent',
      'Negotiation',
      'Under BOQ Creation',
      'Under Drawing',
      'Design Approved',
      'Under Requirement',
      'Requirement Completed',
      'Under Site Visit',
      'Measurement Done',
    ].includes(lead?.status || '');

  // Only consider follow-up pending/overdue if the lead has NOT progressed past the follow-up stage
  const isPending = currentFollowUp?.status === 'Pending' && !isLeadProgressed;
  const isOverdue = Boolean(
    isPending &&
      currentFollowUp?.scheduledDate &&
      new Date(currentFollowUp.scheduledDate).getTime() < Date.now()
  );

  const canSendToSiteVisit = !isConverted && !hasSiteVisitStarted && (!lead?.quotations || lead.quotations.length === 0);

  if (!currentFollowUp) {
    return (
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-center flex flex-col items-center justify-center max-w-2xl mx-auto shadow-xs">
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-4 border border-blue-500/20">
          <Calendar size={28} />
        </div>
        <h3 className="text-base sm:text-xl font-black text-[hsl(var(--foreground))]">
          {isLeadProgressed ? 'Initial Follow-up Phase Completed' : 'No Follow-ups Scheduled'}
        </h3>
        <p className="text-[hsl(var(--muted-foreground))] text-xs sm:text-sm mt-1.5 mb-6 max-w-md leading-relaxed">
          {isLeadProgressed
            ? `This lead has already moved to the "${lead?.status || 'Site Visit'}" stage. Initial follow-up phase is complete.`
            : 'Schedule initial client touchpoints (calls, WhatsApp, or meetings) to capture client requirements before planning the site visit.'}
        </p>
        {!isConverted && !isLeadProgressed && (
          <button
            onClick={onScheduleFollowUp}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus size={15} /> Schedule Initial Follow-up
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      
      {/* --- UNIFIED HEADER & ACTION BAR --- */}
      <div className={cn(
        "bg-[hsl(var(--card))] border rounded-2xl p-4 sm:p-5 shadow-xs transition-colors",
        isOverdue ? "border-rose-500/30" : "border-[hsl(var(--border))]"
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          
          {/* Title & Status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
              isOverdue ? "bg-rose-500/10 border-rose-500/20 text-rose-600" : "bg-blue-500/10 border-blue-500/20 text-blue-600"
            )}>
              {getTypeIcon(currentFollowUp.type, "w-5 h-5")}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-[hsl(var(--foreground))]">
                  {currentFollowUp.type || 'Follow-up'} Touchpoint
                </h2>
                <span className={cn(
                  "text-[10px] font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5",
                  isPending
                    ? isOverdue
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                )}>
                  {isPending ? (
                    isOverdue ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                        </span>
                        Overdue ({getOverdueText(currentFollowUp.scheduledDate)})
                      </>
                    ) : 'Pending Touchpoint'
                  ) : isLeadProgressed ? 'Stage Completed' : 'Completed'}
                </span>
                {allFollowUps.length > 1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]">
                    {allFollowUps.length} Total Logs
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 mt-0.5">
                <Clock size={11} className={isOverdue ? "text-rose-500 shrink-0" : "shrink-0"} />
                <span>
                  {isPending ? 'Scheduled for: ' : 'Logged on: '}
                  <strong className={cn(
                    "font-semibold",
                    isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[hsl(var(--foreground))]"
                  )}>
                    {new Date(currentFollowUp.scheduledDate || currentFollowUp.createdAt).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </strong>
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {!isConverted && (
            <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-[hsl(var(--border)/0.6)]">
              {!isLeadProgressed ? (
                <>
                  <button
                    onClick={onScheduleFollowUp}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer",
                      isOverdue
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                        : "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]"
                    )}
                    title="Reschedule Follow-up Date & Time"
                  >
                    <Calendar size={13} /> Reschedule Follow-up
                  </button>
                  {!isOverdue && canSendToSiteVisit && (
                    <button
                      onClick={onSendToSiteVisit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                      title="Complete follow-up & send lead to Site Visit stage"
                    >
                      <MapPin size={13} /> Complete & Send to Site Visit
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={13} /> Follow-up Phase Completed (Lead in {lead?.status || 'Site Visit'})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Overdue Alert Strip inside Hero (if overdue) */}
        {isOverdue && (
          <div className="mt-3.5 pt-3 border-t border-rose-500/20 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>
                Scheduled window has expired. Please contact client and reschedule or proceed to the next stage.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* --- 2-COLUMN BALANCED DASHBOARD GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 min-w-0">
        
        {/* LEFT COLUMN: ACTIVE FOLLOW-UP DETAILS (5 cols) */}
        <div className="lg:col-span-5 space-y-4 min-w-0">
          
          {/* Main Brief & Goal Card */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                <FileText size={14} className="text-blue-500" /> Touchpoint Objective & Goal
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                Active Note
              </span>
            </div>

            <div className={cn(
              "p-3.5 rounded-xl border text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap selection:bg-blue-500/20 break-words [overflow-wrap:anywhere]",
              isOverdue ? "bg-rose-500/5 border-rose-500/20 text-[hsl(var(--foreground))]" : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
            )}>
              {currentFollowUp.remarks || 'No notes or objectives recorded for this touchpoint.'}
            </div>

            {/* Quick Spec Matrix (2x2 Compact Grid) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl p-2.5 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-0.5">Channel</p>
                <div className="flex items-center gap-1.5 font-bold text-xs text-[hsl(var(--foreground))] min-w-0">
                  {getTypeIcon(currentFollowUp.type, "w-3.5 h-3.5 shrink-0")}
                  <span className="truncate">{currentFollowUp.type || 'Phone Call'}</span>
                </div>
              </div>

              <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl p-2.5 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-0.5">Assigned To</p>
                <div className="flex items-center gap-1.5 font-bold text-xs text-[hsl(var(--foreground))] min-w-0">
                  <User size={12} className="text-purple-500 shrink-0" />
                  <span className="truncate" title={assignedUserName}>{assignedUserName}</span>
                </div>
              </div>

              <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl p-2.5 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-0.5">Client Mobile</p>
                <a href={`tel:${lead?.mobileNumber}`} className="flex items-center gap-1.5 font-bold text-xs text-blue-600 hover:underline min-w-0">
                  <Phone size={12} className="shrink-0" />
                  <span className="truncate">{lead?.mobileNumber || '—'}</span>
                </a>
              </div>

              <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-xl p-2.5 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-0.5">Project City</p>
                <div className="flex items-center gap-1.5 font-bold text-xs text-[hsl(var(--foreground))] min-w-0">
                  <MapPin size={12} className="text-amber-500 shrink-0" />
                  <span className="truncate">{lead?.city || lead?.projectLocation || 'Standard'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TIMELINE & HISTORY LOG (7 cols) */}
        <div className="lg:col-span-7 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-6 shadow-xs min-w-0">
          <div className="flex items-center justify-between pb-3 mb-4 sm:mb-5 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2">
              <History size={16} className="text-blue-500" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                Follow-up History & Past Touchpoints
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded border border-[hsl(var(--border))]">
              {allFollowUps.length} {allFollowUps.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="relative border-l-2 border-[hsl(var(--border))] ml-2.5 sm:ml-4 pl-4 sm:pl-6 space-y-4 sm:space-y-5 min-w-0">
            {allFollowUps.map((item: any, idx: number) => {
              const isItemActive = item._id === currentFollowUp?._id;
              const itemUser = getUserDisplayName(item.user);
              const itemDate = item.scheduledDate || item.createdAt;
              const isItemOverdue = !isLeadProgressed && item.status === 'Pending' && item.scheduledDate && new Date(item.scheduledDate).getTime() < Date.now();

              return (
                <div key={item._id || idx} className="relative group min-w-0">
                  {/* Bullet Node on Vertical Line */}
                  <div className={cn(
                    "absolute -left-[1.35rem] sm:-left-[1.85rem] top-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[hsl(var(--card))] flex items-center justify-center",
                    isItemActive
                      ? isItemOverdue ? "bg-rose-500" : isLeadProgressed ? "bg-emerald-500" : "bg-blue-500"
                      : "bg-emerald-500"
                  )}></div>

                  {/* Timeline Entry Card */}
                  <div className={cn(
                    "border rounded-xl p-3.5 sm:p-4 transition-colors space-y-2 min-w-0 overflow-hidden",
                    isItemActive
                      ? isItemOverdue
                        ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/30"
                        : isLeadProgressed
                        ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20"
                        : "bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/30"
                      : "bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.6)] border-[hsl(var(--border))]"
                  )}>
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                          {getTypeIcon(item.type, "w-3 h-3")}
                        </span>
                        <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                          {item.type || 'Follow-up'}
                        </span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border",
                          isItemActive
                            ? isItemOverdue
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              : isLeadProgressed
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        )}>
                          {isItemActive
                            ? isItemOverdue
                              ? 'Active • Overdue'
                              : isLeadProgressed
                              ? 'Stage Progressed'
                              : 'Active Schedule'
                            : 'Past Touchpoint'}
                        </span>
                      </div>

                      <span className="text-[10px] sm:text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                        {new Date(itemDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {item.remarks || 'No notes logged.'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border)/0.5)]">
                      <span className="truncate max-w-[200px] sm:max-w-xs">
                        Handled by: <strong className="text-[hsl(var(--foreground))]">{itemUser}</strong>
                      </span>
                      {item.createdAt && (
                        <span className="shrink-0">
                          Logged: {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
