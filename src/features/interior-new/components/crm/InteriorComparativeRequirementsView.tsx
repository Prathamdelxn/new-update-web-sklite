'use client';

// =============================================================================
// Sky-Lite Web — Unified Requirements View
// Displays unified room requirements & specifications without duplicate columns.
// Supports "Waiting for Client Input" state when public share link is active.
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  User,
  CheckCircle2,
  Copy,
  Share2,
  MessageCircle,
  Plus,
  Pencil,
  Clock,
  Sparkles,
  Eye,
  X,
  Check,
  Trash2,
  PowerOff,
  Settings,
  RotateCcw,
  Palette,
  Sliders,
  Zap,
  Sun,
  Droplets,
  Armchair,
  Edit3,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { cn } from '@/lib/utils';

interface Props {
  lead: any;
  technicalPersonName?: string;
  isReadOnly?: boolean;
  canEdit?: boolean;
  hasPassedToSiteVisit?: boolean;
  currencySymbol?: string;
  onEditTeamRequirements?: () => void;
  onRescheduleSession?: () => void;
  onRefresh?: () => void;
  onOpenShareModal?: () => void;
}

export function InteriorComparativeRequirementsView({
  lead,
  isReadOnly = false,
  canEdit = true,
  hasPassedToSiteVisit: hasPassedToSiteVisitProp,
  currencySymbol = '₹',
  onEditTeamRequirements,
  onRefresh,
  onOpenShareModal,
}: Props) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isStoppingLink, setIsStoppingLink] = useState(false);
  const [isUpdatingExpiry, setIsUpdatingExpiry] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  const shareSettings = lead?.shareSettings;
  const isLinkExpired = Boolean(
    shareSettings?.expiresAt && new Date() > new Date(shareSettings.expiresAt)
  );
  const isLinkStopped = shareSettings?.isPublic === false;
  const isLinkActive = Boolean(shareSettings?.shareToken && !isLinkStopped && !isLinkExpired);

  const getExpiryDisplay = () => {
    if (isLinkStopped) return { label: 'Link Stopped / Disabled', isWarning: true };
    if (isLinkExpired) return { label: 'Link Expired', isWarning: true };
    if (!shareSettings?.expiresAt) return { label: 'No Expiry (Always Active)', isWarning: false };

    const diffMs = new Date(shareSettings.expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return { label: 'Link Expired', isWarning: true };
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 1) {
      const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      return { label: `Expires in ${mins}m`, isWarning: true };
    }
    if (hours < 24) {
      return { label: `Expires in ${hours}h`, isWarning: hours <= 3 };
    }
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const expDateStr = new Date(shareSettings.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { label: `Expires in ${days}d (${expDateStr})`, isWarning: false };
  };

  const currentExpiry = getExpiryDisplay();

  const POST_REQUIREMENT_STAGES = [
    'Under Site Visit',
    'Measurement Done',
    'Under Drawing',
    'Design Approved',
    'Under BOQ Creation',
    'Under Quotation',
    'Quotation Pending',
    'Quotation Sent',
    'Negotiation',
    'Booking Pending',
    'Won',
    'Converted',
  ];

  const hasPassedToSiteVisit = Boolean(
    hasPassedToSiteVisitProp !== undefined
      ? hasPassedToSiteVisitProp
      : (lead?.status && POST_REQUIREMENT_STAGES.includes(lead.status)) ||
        lead?.siteMeasurements ||
        (Array.isArray(lead?.sitePhotos) && lead.sitePhotos.length > 0) ||
        (Array.isArray(lead?.activities) && lead.activities.some((a: any) => a.type === 'Site Visit')) ||
        (Array.isArray(lead?.quotations) && lead.quotations.length > 0) ||
        (Array.isArray(lead?.designFiles) && lead.designFiles.length > 0) ||
        (Array.isArray(lead?.boqs) && lead.boqs.length > 0) ||
        lead?.linkedProject
  );

  const clientWishlist = lead?.clientWishlist;
  const clientSubmittedAt = lead?.clientRequirementsSubmittedAt || lead?.clientRequirements?.submittedAt || lead?.clientWishlist?.submittedAt;
  const clientNotes =
    lead?.clientRequirementsNotes ||
    lead?.clientWishlist?.overallVibe ||
    lead?.clientWishlist?.generalNotes ||
    lead?.clientRequirements?.notes ||
    '';
  const inspirationImages: string[] =
    clientWishlist?.inspirationImages ||
    lead?.clientRequirements?.inspirationImages ||
    lead?.inspirationImages ||
    lead?.clientRequirementsInspirations ||
    [];

  const handleManualRefresh = async () => {
    if (isSyncing || !onRefresh) return;
    setIsSyncing(true);
    try {
      await onRefresh();
      toast.success('Requirements status updated');
    } catch (err) {
      console.error('Failed to refresh requirements:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Cross-tab synchronization & auto-polling when awaiting client input
  useEffect(() => {
    const leadId = lead?._id || lead?.id;
    const currentToken = shareSettings?.shareToken;

    // 1. BroadcastChannel for instant cross-tab updates on same origin
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('crm_requirement_channel');
        channel.onmessage = (event) => {
          const data = event.data;
          if (
            data?.type === 'REQUIREMENT_SUBMITTED' &&
            (!data.leadId || data.leadId === leadId || !data.token || data.token === currentToken)
          ) {
            if (onRefresh) onRefresh();
          }
        };
      }
    } catch (e) {
      // Fallback
    }

    // 2. Storage event fallback for cross-tab sync
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'crm_requirement_sync' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (
            !parsed.leadId ||
            parsed.leadId === leadId ||
            !parsed.token ||
            parsed.token === currentToken
          ) {
            if (onRefresh) onRefresh();
          }
        } catch {
          if (onRefresh) onRefresh();
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // 3. Tab visibility / Window Focus refetch
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && isLinkActive && !clientSubmittedAt) {
        if (onRefresh) onRefresh();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleVisibilityOrFocus);
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }

    // 4. Background polling interval when link is active and waiting for client input
    let pollInterval: any = null;
    if (isLinkActive && !clientSubmittedAt) {
      pollInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          if (onRefresh) onRefresh();
        }
      }, 5000); // Check every 5 seconds while tab is active
    }

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('focus', handleVisibilityOrFocus);
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [lead?._id, lead?.id, shareSettings?.shareToken, isLinkActive, clientSubmittedAt, onRefresh]);

  // Team requirements (support array or single-object legacy format)
  const teamRequirements: any[] = React.useMemo(() => {
    if (Array.isArray(lead?.requirements)) return lead.requirements;
    if (lead?.requirements && typeof lead.requirements === 'object' && Object.keys(lead.requirements).length > 0) {
      if (Array.isArray(lead.requirements.rooms)) return lead.requirements.rooms;
      return [lead.requirements];
    }
    return [];
  }, [lead?.requirements]);

  // Client intake submission (normalized)
  const rawClientRooms: any[] = React.useMemo(() => {
    if (Array.isArray(lead?.clientRequirements)) return lead.clientRequirements;
    if (Array.isArray(lead?.clientRequirements?.rooms)) return lead.clientRequirements.rooms;
    if (Array.isArray(lead?.clientWishlist?.rooms)) return lead.clientWishlist.rooms;
    if (lead?.clientRequirements && typeof lead.clientRequirements === 'object') {
      return [lead.clientRequirements];
    }
    return [];
  }, [lead?.clientRequirements, lead?.clientWishlist]);

  // Unified specifications list (Both client intake and team entries are unified and merged)
  const unifiedRooms = React.useMemo(() => {
    const normalizeRoom = (r: any, source: 'client' | 'team' | 'merged') => {
      const pref = r.preferences || lead?.preferences || {};
      const coloursVal =
        r.colours ||
        r.colors ||
        r.colorPalette ||
        (Array.isArray(pref.colorPalette) ? pref.colorPalette.join(', ') : pref.colorPalette) ||
        '';
      const flooringVal = r.flooring || r.flooringType || pref.flooringType || '';
      const ceilingVal =
        r.ceiling ||
        (typeof r.falseCeiling === 'boolean' ? (r.falseCeiling ? 'False Ceiling Required' : '') : r.falseCeiling) ||
        (typeof pref.falseCeiling === 'boolean' ? (pref.falseCeiling ? 'False Ceiling Required' : '') : pref.falseCeiling) ||
        '';
      const wallFinishesVal = r.wallFinishes || r.walls || r.wallDecor || '';
      const furnitureStyleVal = r.furnitureStyle || r.furniture_style || '';
      const designStyleVal = r.designStyle || r.style || r.theme || pref.style || '';
      const themeVal = r.theme || r.designStyle || r.style || pref.theme || '';
      const materialsVal =
        r.materials ||
        r.materialSpecs ||
        (Array.isArray(r.materials) ? r.materials.join(', ') : '') ||
        '';

      return {
        roomName: (r.roomName || r.name || r.room || 'Space').trim(),
        interiorType: r.interiorType || r.type || lead?.propertyType || 'Residential',
        designStyle: designStyleVal,
        theme: themeVal,
        dimensions: r.dimensions || r.carpetArea || r.area || r.size || '',
        budget: r.budget || r.estimatedBudget || '',
        roomUsage: r.roomUsage || r.usage || '',
        furnitureRequirements:
          r.furnitureRequirements ||
          r.wishedItems ||
          (Array.isArray(r.furniture) ? r.furniture.join(', ') : r.furniture || ''),
        storage: r.storage || r.storageRequirements || '',
        electricalPoints: r.electricalPoints || r.electrical || '',
        lightingRequirements: r.lightingRequirements || r.lighting || pref.lightingType || '',
        plumbingRequirements: r.plumbingRequirements || r.plumbing || '',
        circulation: r.circulation || '',
        colours: coloursVal,
        materials: materialsVal,
        flooring: flooringVal,
        ceiling: ceilingVal,
        wallFinishes: wallFinishesVal,
        furnitureStyle: furnitureStyleVal,
        description: r.description || r.notes || r.remarks || r.specialRequests || r.aestheticNotes || '',
        priority: r.priority || '',
        source,
      };
    };

    const clientNorm = rawClientRooms.map((r: any) => normalizeRoom(r, 'client'));
    const teamNorm = teamRequirements.map((r: any) => normalizeRoom(r, 'team'));

    if (teamNorm.length === 0 && clientNorm.length === 0) return [];
    if (teamNorm.length === 0) return clientNorm;
    if (clientNorm.length === 0) return teamNorm;

    // Both exist: merge them so all rooms and all filled fields are visible!
    const clientMap = new Map<string, ReturnType<typeof normalizeRoom>>();
    clientNorm.forEach((r) => {
      clientMap.set(r.roomName.toLowerCase(), r);
    });

    const merged: ReturnType<typeof normalizeRoom>[] = [];
    const usedClientKeys = new Set<string>();

    teamNorm.forEach((tr) => {
      const key = tr.roomName.toLowerCase();
      const cr = clientMap.get(key);
      if (cr) {
        usedClientKeys.add(key);
        // Merge: fill any empty team fields with client filled data!
        merged.push({
          roomName: tr.roomName || cr.roomName,
          interiorType: tr.interiorType || cr.interiorType,
          designStyle: tr.designStyle || cr.designStyle,
          theme: tr.theme || cr.theme,
          dimensions: tr.dimensions || cr.dimensions,
          budget: tr.budget || cr.budget,
          roomUsage: tr.roomUsage || cr.roomUsage,
          furnitureRequirements: tr.furnitureRequirements || cr.furnitureRequirements,
          storage: tr.storage || cr.storage,
          electricalPoints: tr.electricalPoints || cr.electricalPoints,
          lightingRequirements: tr.lightingRequirements || cr.lightingRequirements,
          plumbingRequirements: tr.plumbingRequirements || cr.plumbingRequirements,
          circulation: tr.circulation || cr.circulation,
          colours: tr.colours || cr.colours,
          materials: tr.materials || cr.materials,
          flooring: tr.flooring || cr.flooring,
          ceiling: tr.ceiling || cr.ceiling,
          wallFinishes: tr.wallFinishes || cr.wallFinishes,
          furnitureStyle: tr.furnitureStyle || cr.furnitureStyle,
          priority: tr.priority || cr.priority,
          description: tr.description
            ? cr.description && cr.description !== tr.description
              ? `${tr.description} (Client: ${cr.description})`
              : tr.description
            : cr.description,
          source: 'merged',
        });
      } else {
        merged.push(tr);
      }
    });

    // Add any client rooms that were not in team requirements
    clientNorm.forEach((cr) => {
      const key = cr.roomName.toLowerCase();
      if (!usedClientKeys.has(key)) {
        merged.push(cr);
      }
    });

    return merged;
  }, [teamRequirements, rawClientRooms, lead?.propertyType, lead?.preferences]);

  // Build the public link URL
  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
      : '') || (typeof window !== 'undefined' ? window.location.origin : '');

  const shareToken = lead?.shareSettings?.shareToken;
  const clientFormUrl = shareToken && !isLinkStopped && !isLinkExpired ? `${origin}/share/requirements/${shareToken}` : '';

  const getOrFetchUrl = async (): Promise<string | null> => {
    if (clientFormUrl) return clientFormUrl;

    const leadId = lead?._id || lead?.id;
    if (!leadId) {
      toast.error('Customer/Lead ID is missing.');
      return null;
    }

    try {
      setIsGeneratingLink(true);
      const res = await interiorCrmService.generateShareLink(leadId, {
        mode: 'requirements',
        includeRequirements: true,
        allowDownload: false,
      });

      const token = res?.data?.shareToken || res?.shareToken;
      if (token) {
        if (onRefresh) onRefresh();
        return `${origin}/share/requirements/${token}`;
      }
      throw new Error(res?.error || res?.message || 'Failed to generate share link');
    } catch (err: any) {
      console.error('Error generating share link:', err);
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create share link';
      toast.error(errorMsg);
      return null;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    const url = await getOrFetchUrl();
    if (!url) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      toast.success('Client Requirements Link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleShareWhatsApp = async () => {
    const url = await getOrFetchUrl();
    if (!url) return;
    const clientName = (lead?.name || 'there').split(' ')[0];
    const message = encodeURIComponent(
      `Hi ${clientName}! Please share your interior design preferences & room requirements using this link: ${url}\n\nOur design team will review your preferences right away!`
    );
    const phone = (lead?.mobileNumber || lead?.phone || '').replace(/[^0-9]/g, '');
    const waUrl = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleDiscardRequirements = async () => {
    if (hasPassedToSiteVisit) {
      toast.error('Cannot discard requirements after lead has been passed to Site Visit.');
      return;
    }

    const ok = await confirm({
      title: 'Discard Requirements',
      message: 'Are you sure you want to discard all logged requirements for this lead? All room specifications will be cleared and reset.',
      confirmText: 'Discard Requirements',
      type: 'danger',
    });
    if (!ok) return;

    setIsDiscarding(true);
    try {
      await interiorCrmService.updateCustomer(lead._id, {
        requirements: [],
        clientRequirements: null,
        clientWishlist: null,
        clientRequirementsSubmittedAt: null,
      });
      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Requirement Gathering',
        status: 'Completed',
        remarks: 'Discarded/reset all room requirements.',
        completedDate: new Date(),
      });
      toast.success('Requirements discarded successfully.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to discard requirements');
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleStopLink = async () => {
    const leadId = lead?._id || lead?.id;
    if (!leadId) return;

    const ok = await confirm({
      title: 'Stop Client Intake Link?',
      message: 'The link will be immediately deactivated. The client will no longer be able to open the intake form or submit specifications.',
      confirmText: 'Stop Link',
      type: 'danger',
    });
    if (!ok) return;

    setIsStoppingLink(true);
    try {
      await interiorCrmService.revokeShareLink(leadId);
      toast.success('Client intake link stopped.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to stop link');
    } finally {
      setIsStoppingLink(false);
    }
  };

  const handleChangeExpiry = async (hours: number | null) => {
    const leadId = lead?._id || lead?.id;
    if (!leadId) return;

    setIsUpdatingExpiry(true);
    try {
      await interiorCrmService.generateShareLink(leadId, {
        mode: 'requirements',
        includeRequirements: true,
        allowDownload: false,
        expiresHours: hours,
      });
      const label =
        hours === null
          ? 'Never expire'
          : hours === 24
          ? '24 hours'
          : hours === 72
          ? '3 days'
          : hours === 168
          ? '7 days'
          : hours === 720
          ? '30 days'
          : `${hours} hours`;
      toast.success(`Link expiry set to ${label}.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update link expiry');
    } finally {
      setIsUpdatingExpiry(false);
    }
  };

  const handleReactivateLink = async (hours: number | null = 168) => {
    const leadId = lead?._id || lead?.id;
    if (!leadId) return;

    setIsUpdatingExpiry(true);
    try {
      await interiorCrmService.generateShareLink(leadId, {
        mode: 'requirements',
        includeRequirements: true,
        allowDownload: false,
        expiresHours: hours,
      });
      toast.success('Client intake link reactivated!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to reactivate link');
    } finally {
      setIsUpdatingExpiry(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── CASE 1: WAITING FOR CLIENT INPUT (Link active, but no requirements submitted yet) ── */}
      {unifiedRooms.length === 0 && isLinkActive && !clientSubmittedAt ? (
        <div className="bg-gradient-to-br from-amber-500/[0.04] to-teal-500/[0.04] border border-amber-500/20 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-2xs">
            <Clock size={26} className="animate-pulse" />
          </div>

          <div className="max-w-md space-y-2">
            <div className="inline-flex items-center gap-2 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Awaiting Client Submission
              </span>

              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                  currentExpiry.isWarning
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                    : "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20"
                )}
              >
                <Clock size={10} />
                {currentExpiry.label}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
              Waiting for Client Input
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              The public intake link is active. Waiting for <strong className="text-[hsl(var(--foreground))]">{lead?.name || 'the client'}</strong> to submit room preferences online.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60"
              title="Check if client has submitted requirements"
            >
              <RotateCcw size={13} className={cn(isSyncing && "animate-spin")} />
              <span>{isSyncing ? 'Checking...' : 'Check Status / Refresh'}</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingLink}
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Intake Link'}</span>
            </button>

            {lead?.mobileNumber && (
              <button
                type="button"
                disabled={isGeneratingLink}
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                <MessageCircle size={13} />
                <span>Send via WhatsApp</span>
              </button>
            )}

            {/* Schedule Expiry Dropdown Selector */}
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl text-xs transition-all shadow-2xs">
              <Clock size={13} className="text-amber-500 shrink-0" />
              <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Schedule Expiry:</span>
              <select
                disabled={isUpdatingExpiry}
                value={
                  shareSettings?.expiresAt === null || shareSettings?.expiresAt === undefined
                    ? 'never'
                    : (() => {
                        const diffMs = new Date(shareSettings.expiresAt).getTime() - Date.now();
                        const h = Math.round(diffMs / (1000 * 60 * 60));
                        if (Math.abs(h - 24) <= 4) return '24';
                        if (Math.abs(h - 72) <= 8) return '72';
                        if (Math.abs(h - 168) <= 24) return '168';
                        if (Math.abs(h - 720) <= 48) return '720';
                        return 'custom';
                      })()
                }
                onChange={(e) => {
                  const val = e.target.value === 'never' ? null : Number(e.target.value);
                  handleChangeExpiry(val);
                }}
                className="bg-transparent text-xs font-bold text-[hsl(var(--foreground))] outline-none cursor-pointer pr-1"
                title="Schedule link expiry duration"
              >
                <option value="24" className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">24 Hours (1 Day)</option>
                <option value="72" className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">3 Days</option>
                <option value="168" className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">7 Days (1 Week)</option>
                <option value="720" className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">30 Days</option>
                <option value="never" className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">Never (No Expiry)</option>
                <option value="custom" disabled hidden className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">Custom</option>
              </select>
            </div>

            {/* Stop Link Button */}
            {!isReadOnly && canEdit && (
              <button
                type="button"
                disabled={isStoppingLink}
                onClick={handleStopLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                title="Stop link immediately (clients will be blocked)"
              >
                <PowerOff size={13} />
                <span>{isStoppingLink ? 'Stopping...' : 'Stop Link'}</span>
              </button>
            )}

            {onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                className="p-2 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Advanced link settings & QR code"
              >
                <Settings size={14} />
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-[hsl(var(--border))] w-full max-w-sm flex items-center justify-center gap-2">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Want to take specs now?</span>
            {!isReadOnly && canEdit && (
              <button
                type="button"
                onClick={onEditTeamRequirements}
                className="text-xs font-bold text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Pencil size={11} /> Enter Requirements Manually
              </button>
            )}
          </div>
        </div>
      ) : unifiedRooms.length === 0 && (isLinkStopped || isLinkExpired) && shareSettings?.shareToken ? (
        /* ── CASE 2: LINK STOPPED OR EXPIRED (No requirements logged) ── */
        <div className="bg-[hsl(var(--card))] border border-rose-500/20 dark:border-rose-500/30 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center space-y-3.5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20 shadow-2xs">
            <PowerOff size={24} />
          </div>

          <div className="max-w-md space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider">
              {isLinkStopped ? '● Link Stopped / Disabled' : '● Link Expired'}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
              {isLinkStopped ? 'Client Intake Link is Stopped' : 'Client Intake Link has Expired'}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              {isLinkStopped
                ? 'The public requirements link is deactivated. Clients opening this link will see that it has been disabled.'
                : 'The scheduled expiry date has passed. You can reactivate the link with a new schedule or enter requirements directly.'}
            </p>
          </div>

          {!isReadOnly && canEdit && (
            <div className="flex items-center gap-2 flex-wrap justify-center pt-1">
              <button
                type="button"
                disabled={isUpdatingExpiry}
                onClick={() => handleReactivateLink(168)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw size={13} />
                <span>Reactivate Link (7 Days)</span>
              </button>

              <button
                type="button"
                onClick={onEditTeamRequirements}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Pencil size={13} />
                <span>Enter Requirements Manually</span>
              </button>

              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={onOpenShareModal}
                  className="p-2 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title="Configure custom expiry & permissions"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      ) : unifiedRooms.length === 0 ? (
        /* ── CASE 3: FRESH EMPTY STATE ── */
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 text-center flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20">
            <Home size={26} />
          </div>

          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
              No Requirements Logged Yet
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Add project specifications directly or generate an online intake link for the client.
            </p>
          </div>

          {!isReadOnly && canEdit && (
            <div className="flex items-center gap-2 flex-wrap justify-center pt-2">
              <button
                type="button"
                onClick={onEditTeamRequirements}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Requirements</span>
              </button>

              <button
                type="button"
                disabled={isGeneratingLink}
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Share2 size={13} />
                <span>Generate & Copy Client Link</span>
              </button>

              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={onOpenShareModal}
                  className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Configure Expiry & Permissions"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── CASE 4: REQUIREMENTS CONFIGURED (Clean Room-by-Room Display) ── */
        <div className="space-y-3.5">
          {/* Header Bar */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Home size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                    Room Specifications ({unifiedRooms.length} {unifiedRooms.length === 1 ? 'Area' : 'Areas'})
                  </h3>
                  {clientSubmittedAt ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
                      <CheckCircle2 size={10} /> Client Submitted
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      Team Recorded
                    </span>
                  )}
                  {clientSubmittedAt && isLinkActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-1">
                      <Edit3 size={10} /> Link Reactivated (Client Can Edit)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isLinkActive && (
                <>
                  <button
                    type="button"
                    disabled={isGeneratingLink}
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-all active:scale-95 cursor-pointer"
                    title="Copy client link"
                  >
                    {copiedLink ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
                  </button>

                  <span
                    className={cn(
                      "hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold border",
                      currentExpiry.isWarning
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                        : "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20"
                    )}
                    title={shareSettings?.expiresAt ? `Expires: ${new Date(shareSettings.expiresAt).toLocaleString()}` : 'No expiry'}
                  >
                    <Clock size={10} />
                    {currentExpiry.label}
                  </span>

                  {!isReadOnly && canEdit && (
                    <button
                      type="button"
                      disabled={isStoppingLink}
                      onClick={handleStopLink}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Stop client intake link"
                    >
                      <PowerOff size={11} />
                      <span>{isStoppingLink ? 'Stopping...' : 'Stop Link'}</span>
                    </button>
                  )}
                </>
              )}

              {shareSettings?.shareToken && (isLinkStopped || isLinkExpired) && (
                <>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                    <PowerOff size={10} />
                    {isLinkStopped ? 'Link Disabled (Submitted)' : 'Link Expired'}
                  </span>
                  {!isReadOnly && canEdit && (
                    <button
                      type="button"
                      disabled={isUpdatingExpiry}
                      onClick={() => handleReactivateLink(168)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Reactivate client intake link"
                    >
                      <RotateCcw size={11} />
                      <span>Reactivate Link</span>
                    </button>
                  )}
                </>
              )}

              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={onOpenShareModal}
                  className="p-1.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] transition-all cursor-pointer"
                  title="Link expiry & permissions settings"
                >
                  <Settings size={13} />
                </button>
              )}

              {!isReadOnly && canEdit && !hasPassedToSiteVisit && (
                <button
                  type="button"
                  disabled={isDiscarding}
                  onClick={handleDiscardRequirements}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Discard all requirements"
                >
                  <Trash2 size={12} />
                  <span>{isDiscarding ? 'Discarding...' : 'Discard'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Client Stated Vision / Directives (if provided) */}
          {clientNotes && (
            <div className="bg-purple-500/[0.04] border border-purple-500/20 rounded-2xl p-3.5 sm:p-4 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                Client Stated Directives & Vision:
              </span>
              <p className="text-[hsl(var(--foreground))] italic leading-relaxed whitespace-pre-wrap">
                &ldquo;{clientNotes}&rdquo;
              </p>
            </div>
          )}

          {/* Inspiration Gallery (if client uploaded photos) */}
          {inspirationImages.length > 0 && (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3.5 sm:p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <Sparkles size={11} className="text-pink-500" /> Client Inspiration Moodboard ({inspirationImages.length} Photos)
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {inspirationImages.map((img, iIdx) => (
                  <button
                    key={iIdx}
                    type="button"
                    onClick={() => setSelectedPhotoModal(img)}
                    className="relative group rounded-xl overflow-hidden aspect-square border border-[hsl(var(--border))] hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    <img src={img} alt={`Inspiration ${iIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Eye size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Room Cards List */}
          <div className="space-y-3.5">
            {unifiedRooms.map((room: any, idx: number) => {
              const hasFunctional = Boolean(
                room.roomUsage ||
                room.furnitureRequirements ||
                room.storage ||
                room.electricalPoints ||
                room.lightingRequirements ||
                room.plumbingRequirements ||
                room.circulation
              );

              const hasAesthetic = Boolean(
                room.designStyle ||
                room.theme ||
                room.colours ||
                room.materials ||
                room.flooring ||
                room.ceiling ||
                room.wallFinishes ||
                room.furnitureStyle
              );

              return (
                <div
                  key={idx}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-2xs hover:border-[hsl(var(--border))]/90 transition-all"
                >
                  {/* Room Title Header */}
                  <div className="bg-[hsl(var(--muted)/0.35)] px-4 py-2.5 border-b border-[hsl(var(--border))] flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">{room.roomName}</h4>
                      {room.interiorType && (
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">({room.interiorType})</span>
                      )}
                      {room.source === 'client' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Client Intake
                        </span>
                      )}
                      {room.source === 'merged' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                          Merged
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(room.designStyle || room.theme) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                          <Palette size={10} /> {room.designStyle || room.theme}
                        </span>
                      )}
                      {room.dimensions && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          {room.dimensions}
                        </span>
                      )}
                      {room.budget && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          {currencySymbol} {room.budget}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Room Details Body */}
                  <div className="p-4 space-y-3.5 text-xs">
                    {/* Dual Section Grid: Functional Requirements vs Aesthetic Requirements */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 min-w-0">
                      {/* 1. Functional Requirements Card */}
                      <div className="bg-[hsl(var(--muted)/0.15)] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-2.5 min-w-0">
                        <div className="flex items-center justify-between pb-1.5 border-b border-[hsl(var(--border))]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <Sliders size={12} /> Functional Requirements
                          </span>
                          {hasFunctional ? (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Specified
                            </span>
                          ) : (
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">Not specified</span>
                          )}
                        </div>

                        {room.roomUsage && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Usage / Primary Purpose</span>
                            <span className="font-semibold text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.roomUsage}</span>
                          </div>
                        )}

                        {room.furnitureRequirements && (
                          <div className="p-2.5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] min-w-0">
                            <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-0.5">
                              <Armchair size={11} className="text-emerald-600" /> Furniture & Fixtures Required
                            </span>
                            <p className="font-semibold text-[hsl(var(--foreground))] leading-relaxed break-words">
                              {room.furnitureRequirements}
                            </p>
                          </div>
                        )}

                        {room.storage && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Storage Units</span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.storage}</span>
                          </div>
                        )}

                        {room.electricalPoints && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                              <Zap size={11} /> Electrical / MEP Points
                            </span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.electricalPoints}</span>
                          </div>
                        )}

                        {room.lightingRequirements && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                              <Sun size={11} /> Lighting Requirements
                            </span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.lightingRequirements}</span>
                          </div>
                        )}

                        {room.plumbingRequirements && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-cyan-500 uppercase flex items-center gap-1">
                              <Droplets size={11} /> Plumbing Requirements
                            </span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.plumbingRequirements}</span>
                          </div>
                        )}

                        {room.circulation && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Circulation & Clearance</span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.circulation}</span>
                          </div>
                        )}

                        {!hasFunctional && (
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic py-2">
                            No functional specifications recorded for this space.
                          </p>
                        )}
                      </div>

                      {/* 2. Aesthetic Requirements Card */}
                      <div className="bg-[hsl(var(--muted)/0.15)] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-2.5 min-w-0">
                        <div className="flex items-center justify-between pb-1.5 border-b border-[hsl(var(--border))]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                            <Palette size={12} /> Aesthetic Requirements
                          </span>
                          {hasAesthetic ? (
                            <span className="text-[9px] font-bold text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded">
                              Specified
                            </span>
                          ) : (
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">Not specified</span>
                          )}
                        </div>

                        {(room.designStyle || room.theme) && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Design Style</span>
                            <span className="font-bold text-purple-700 dark:text-purple-300 break-words mt-0.5 block">{room.designStyle || room.theme}</span>
                          </div>
                        )}

                        {room.theme && room.designStyle && room.theme !== room.designStyle && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Theme / Mood</span>
                            <span className="font-semibold text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.theme}</span>
                          </div>
                        )}

                        {room.colours && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Colours & Palette</span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.colours}</span>
                          </div>
                        )}

                        {room.materials && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Materials & Finishes</span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.materials}</span>
                          </div>
                        )}

                        {room.flooring && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Flooring Preferences</span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.flooring}</span>
                          </div>
                        )}

                        {room.ceiling && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Ceiling & False Ceiling</span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.ceiling}</span>
                          </div>
                        )}

                        {room.wallFinishes && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Wall Finishes & Paneling</span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.wallFinishes}</span>
                          </div>
                        )}

                        {room.furnitureStyle && (
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Furniture Style</span>
                            <span className="font-medium text-[hsl(var(--foreground))] break-words mt-0.5 block">{room.furnitureStyle}</span>
                          </div>
                        )}

                        {!hasAesthetic && (
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic py-2">
                            No aesthetic requirements recorded for this space.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Special Notes / Description */}
                    {room.description && (
                      <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                          <Sparkles size={11} className="text-amber-500" /> Space Observations & Preferences
                        </span>
                        <p className="text-[hsl(var(--foreground))] leading-relaxed italic whitespace-pre-wrap">
                          &ldquo;{room.description}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Inspiration Photos */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhotoModal} alt="Enlarged Inspiration" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
