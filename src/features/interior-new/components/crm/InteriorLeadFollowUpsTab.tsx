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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { interiorCrmService } from '@/services/interiorCrm.service';
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
      return `${diffDays} day${diffDays > 1 ? 's' : ''} overdue`;
    }
    if (diffHours > 0) {
      return `${diffHours} hr${diffHours > 1 ? 's' : ''} overdue`;
    }
    return `${Math.max(1, diffMins)} min${diffMins > 1 ? 's' : ''} overdue`;
  };

  // Helper to resolve user names
  const getUserDisplayName = (userRef: any) => {
    if (!userRef) return 'Assigned Member';
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

  // Find the single relevant follow-up note for this phase
  const followUpNote = useMemo(() => {
    // 1. Check for active pending follow-up touchpoint
    const pending = activities.find(
      (a) => a.status === 'Pending' && a.type !== 'Site Visit' && a.type !== 'Status Change'
    );
    if (pending) return pending;

    // 2. Otherwise get the latest follow-up note
    const relevant = activities.filter(
      (a) => a.type !== 'Status Change' && a.type !== 'Site Visit' && a.remarks
    );
    return relevant[0] || null;
  }, [activities]);

  const assignedUserName = useMemo(() => {
    if (lead?.assignedSalesExecutive) {
      return getUserDisplayName(lead.assignedSalesExecutive);
    }
    if (followUpNote?.user) {
      return getUserDisplayName(followUpNote.user);
    }
    return 'Unassigned';
  }, [lead, followUpNote, users]);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'Phone Call':
        return <Phone className="w-4 h-4 text-blue-500" />;
      case 'WhatsApp':
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'Meeting':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'Office Visit':
        return <Building className="w-4 h-4 text-indigo-500" />;
      case 'Site Visit':
        return <MapPin className="w-4 h-4 text-amber-500" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-500" />;
    }
  };

  const isPending = followUpNote?.status === 'Pending';
  const isOverdue = Boolean(isPending && followUpNote?.scheduledDate && new Date(followUpNote.scheduledDate).getTime() < Date.now());

  const isInitialPhase = ['New Lead', 'Contacted', 'Meeting Scheduled'].includes(lead?.status || '');
  const hasSiteVisitStarted =
    !isInitialPhase ||
    lead?.status === 'Under Site Visit' ||
    lead?.status === 'Measurement Done' ||
    Boolean(lead?.siteMeasurements) ||
    (Array.isArray(lead?.sitePhotos) && lead.sitePhotos.length > 0) ||
    Boolean(lead?.linkedProject);

  const canSendToSiteVisit = !isConverted && !hasSiteVisitStarted && (!lead?.quotations || lead.quotations.length === 0);

  if (!followUpNote) {
    return (
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-3 sm:mb-4">
          <Calendar size={26} className="sm:w-8 sm:h-8" />
        </div>
        <h3 className="text-base sm:text-xl font-black text-[hsl(var(--foreground))]">No Follow-up Note Recorded</h3>
        <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
          Schedule a follow-up touchpoint note to log client requirements and discussion before site visit.
        </p>
        {!isConverted && (
          <button
            onClick={onScheduleFollowUp}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus size={15} /> Schedule Follow-up
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* 1. OVERDUE ALERT BANNER (Modern, High-Priority Alert) */}
      {isOverdue && (
        <div className="relative overflow-hidden bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border-2 border-rose-500/30 dark:border-rose-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
              <AlertTriangle size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-black text-rose-950 dark:text-rose-100">
                  Follow-up Schedule Overdue
                </h4>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                  <Clock size={10} />
                  {getOverdueText(followUpNote.scheduledDate)}
                </span>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300/90 mt-1 leading-relaxed">
                The scheduled follow-up for{' '}
                <strong className="font-bold underline decoration-rose-400 decoration-1 underline-offset-2">
                  {new Date(followUpNote.scheduledDate).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </strong>{' '}
                has passed. Immediate touchpoint with the client is recommended before proceeding to site visit.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={onScheduleFollowUp}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer"
              title="Reschedule Follow-up"
            >
              <Calendar size={13} /> Reschedule Follow-up
            </button>
          </div>
        </div>
      )}

      {/* 2. TOP BAR */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-[hsl(var(--card))] border rounded-2xl p-4 sm:p-5 md:px-6 shadow-xs",
        isOverdue ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-[hsl(var(--border))]"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0",
            isOverdue ? "bg-rose-500/10 text-rose-600" : "bg-blue-500/10 text-blue-600"
          )}>
            <Calendar size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-[hsl(var(--foreground))]">
                Follow-up Phase Note
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
                      {getOverdueText(followUpNote.scheduledDate)}
                    </>
                  ) : 'Pending'
                ) : 'Completed'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))]">
              {isOverdue 
                ? 'Follow-up timeline exceeded scheduled window.' 
                : 'Client touchpoint note recorded for this lead stage.'}
            </p>
          </div>
        </div>

        {!isConverted && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onScheduleFollowUp}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer",
                isOverdue
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                  : "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]"
              )}
              title="Reschedule Follow-up Date & Time"
            >
              <Calendar size={13} /> Reschedule Follow-up
            </button>
            {!isOverdue && canSendToSiteVisit && (
              <button
                onClick={onSendToSiteVisit}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                title="Complete follow-up & send lead to Site Visit stage"
              >
                <MapPin size={13} /> Complete & Send to Site Visit
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. THE SINGLE FOLLOW-UP NOTE CARD */}
      <div className={cn(
        "bg-[hsl(var(--card))] border rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs",
        isOverdue ? "border-rose-500/30 shadow-rose-500/5" : "border-[hsl(var(--border))]"
      )}>
        
        {/* Note Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2.5">
            <span className={cn(
              "p-2 rounded-xl shrink-0 border",
              isOverdue ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
            )}>
              {getTypeIcon(followUpNote.type)}
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                {followUpNote.type || 'Follow-up'} Note
                {isOverdue && (
                  <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    Expired
                  </span>
                )}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1 mt-0.5 flex-wrap">
                <Clock size={11} className={isOverdue ? "text-rose-500 shrink-0" : "shrink-0"} />
                {isPending ? (isOverdue ? 'Scheduled time passed: ' : 'Scheduled for: ') : 'Logged on: '}
                <strong className={cn(
                  "font-semibold",
                  isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[hsl(var(--foreground))]"
                )}>
                  {new Date(followUpNote.scheduledDate || followUpNote.createdAt).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.5)] px-3 py-1 rounded-lg border border-[hsl(var(--border))]">
              Assigned: <strong className="text-[hsl(var(--foreground))]">{assignedUserName}</strong>
            </span>
          </div>
        </div>

        {/* Note Body: The single follow-up message */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <FileText size={12} className={isOverdue ? "text-rose-500" : "text-blue-500"} /> Follow-up Note / Goal
          </p>
          <div className={cn(
            "border rounded-2xl p-4 sm:p-5",
            isOverdue ? "bg-rose-500/[0.03] border-rose-500/20" : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
          )}>
            <p className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] leading-relaxed whitespace-pre-wrap selection:bg-rose-500/20">
              {followUpNote.remarks || 'No note remarks entered.'}
            </p>
          </div>
        </div>

        {/* Key Info Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))]">
            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Touchpoint Channel</p>
            <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 flex items-center gap-1.5">
              {getTypeIcon(followUpNote.type)}
              {followUpNote.type || 'Phone Call'}
            </p>
          </div>

          <div className={cn(
            "rounded-xl p-3 border transition-colors",
            isOverdue 
              ? "bg-rose-500/10 border-rose-500/30" 
              : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
          )}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Scheduled Date</p>
              {isOverdue && (
                <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30 uppercase">
                  Time Passed
                </span>
              )}
            </div>
            <p className={cn(
              "font-bold text-xs mt-0.5",
              isOverdue ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-[hsl(var(--foreground))]"
            )}>
              {new Date(followUpNote.scheduledDate || followUpNote.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))]">
            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Client Mobile</p>
            <p className="font-bold text-xs text-blue-600 mt-0.5">
              {lead.mobileNumber || '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
