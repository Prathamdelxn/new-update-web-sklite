'use client';

// =============================================================================
// Sky-Lite Web — Dual-Perspective Comparative Requirements View
// Displays Client Self-Submitted Wishlist alongside Team Technical Brief
// with side-by-side room cards, inspiration gallery, and direct actions.
// =============================================================================

import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Wrench,
  Columns,
  Heart,
  Palette,
  Armchair,
  Home,
  Check,
  CheckCircle2,
  Copy,
  Share2,
  MessageCircle,
  ExternalLink,
  Plus,
  Pencil,
  ArrowRight,
  Maximize2,
  DollarSign,
  AlertCircle,
  Clock,
  Layers,
  Zap,
  Droplets,
  Sliders,
  Send,
  Eye,
  X,
  FileText,
  Calendar,
  Building,
  CheckSquare,
  Mail,
  Ban,
  RotateCw,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { InteriorSendRequirementsModal } from './modals/InteriorSendRequirementsModal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  lead: any;
  isReadOnly?: boolean;
  canEdit?: boolean;
  canSendToDrawings?: boolean;
  currencySymbol?: string;
  onEditTeamRequirements: () => void;
  onRescheduleSession?: () => void;
  onPassToDrawings?: () => void;
  onRefresh?: () => void;
}

export function InteriorComparativeRequirementsView({
  lead,
  isReadOnly = false,
  canEdit = true,
  canSendToDrawings = false,
  currencySymbol = '₹',
  onEditTeamRequirements,
  onRescheduleSession,
  onPassToDrawings,
  onRefresh,
}: Props) {
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'side_by_side' | 'client_only' | 'team_only'>('side_by_side');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isRevokingLink, setIsRevokingLink] = useState(false);
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  const shareSettings = lead.shareSettings;
  const isLinkExpired = Boolean(
    shareSettings?.expiresAt && new Date() > new Date(shareSettings.expiresAt)
  );
  const isLinkStopped = shareSettings?.isPublic === false;
  const isLinkActive = Boolean(shareSettings?.shareToken && !isLinkStopped && !isLinkExpired);

  const expiresText = shareSettings?.expiresAt
    ? `Expires ${new Date(shareSettings.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'No expiry';

  const clientWishlist = lead.clientWishlist;
  const hasClientWishlist = Boolean(
    clientWishlist && (
      (clientWishlist.preferredStyles && clientWishlist.preferredStyles.length > 0) ||
      (clientWishlist.rooms && clientWishlist.rooms.length > 0) ||
      clientWishlist.overallVibe ||
      clientWishlist.mustHaves ||
      (clientWishlist.inspirationImages && clientWishlist.inspirationImages.length > 0)
    )
  );

  const teamRequirements: any[] = Array.isArray(lead.requirements) ? lead.requirements : [];
  const hasTeamRequirements = teamRequirements.length > 0;

  // Build the public link URL
  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
      : '') || (typeof window !== 'undefined' ? window.location.origin : '');

  const shareToken = lead.shareSettings?.shareToken;
  const clientFormUrl = shareToken ? `${origin}/share/requirements/${shareToken}` : '';

  const getOrFetchUrl = async (): Promise<string | null> => {
    if (clientFormUrl) return clientFormUrl;
    try {
      setIsGeneratingLink(true);
      const res = await interiorCrmService.getRequirementsShareToken(lead._id);
      if (res?.data?.shareToken) {
        if (onRefresh) onRefresh();
        return `${origin}/share/requirements/${res.data.shareToken}`;
      }
    } catch {
      try {
        const resFallback = await interiorCrmService.generateShareLink(lead._id, {
          allowDownload: false,
          includeRequirements: true,
        });
        if (resFallback?.success && resFallback?.data?.shareToken) {
          if (onRefresh) onRefresh();
          return `${origin}/share/requirements/${resFallback.data.shareToken}`;
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Failed to create share link');
        return null;
      }
    } finally {
      setIsGeneratingLink(false);
    }
    return null;
  };

  const handleCopyLink = async () => {
    const url = await getOrFetchUrl();
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success('Client Requirements Link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = async () => {
    const url = await getOrFetchUrl();
    if (!url) return;
    const clientName = (lead.name || 'there').split(' ')[0];
    const message = encodeURIComponent(
      `Hi ${clientName}! Please share your interior design preferences, room wishlist, and style inspirations using this link: ${url}\n\nOur design team will use your brief to create your custom 2D & 3D designs!`
    );
    window.open(`https://wa.me/${lead.mobileNumber?.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const handleStopLink = async () => {
    if (!confirm('Are you sure you want to stop this link? Clients attempting to open it will see an Unavailable message and will not be able to submit.')) {
      return;
    }
    try {
      setIsRevokingLink(true);
      const res = await interiorCrmService.revokeRequirementsLink(lead._id);
      if (res.success) {
        toast.success('Requirements intake link has been stopped / disabled.');
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || 'Failed to stop link');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to stop link');
    } finally {
      setIsRevokingLink(false);
    }
  };

  const handleReactivateLink = async () => {
    try {
      setIsRevokingLink(true);
      const res = await interiorCrmService.updateRequirementsLink(lead._id, {
        isPublic: true,
        expiresDays: 7, // default 7 days extension
      });
      if (res.success) {
        toast.success('Requirements intake link reactivated for 7 days!');
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || 'Failed to reactivate link');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to reactivate link');
    } finally {
      setIsRevokingLink(false);
    }
  };

  // Compile unique room names from both Client and Team
  const allRoomNames = Array.from(
    new Set([
      ...(clientWishlist?.rooms || []).map((r: any) => r.roomName),
      ...teamRequirements.map((r: any) => r.roomName),
    ])
  ).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* ── TOP ACTION & VIEW TOGGLE BAR ── */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: View Mode Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[hsl(var(--muted)/0.5)] rounded-xl border border-[hsl(var(--border))] w-fit">
          <button
            type="button"
            onClick={() => setViewMode('side_by_side')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'side_by_side'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            <Columns size={13} className="text-indigo-600" />
            <span>Side-by-Side Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('client_only')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'client_only'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            <User size={13} className="text-purple-600" />
            <span>Client Wishlist</span>
            {hasClientWishlist && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setViewMode('team_only')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'team_only'
                ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            <Wrench size={13} className="text-emerald-600" />
            <span>Team Technical Brief</span>
            {hasTeamRequirements && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Right: Quick Share & Handover Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Link Status Pill */}
          {shareSettings?.shareToken && (
            <div className="flex items-center mr-1">
              {isLinkActive ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 shadow-2xs"
                  title={`Questionnaire link is live. ${expiresText}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active</span>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 font-normal">({expiresText})</span>
                </span>
              ) : isLinkStopped ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 shadow-2xs"
                  title="This link has been stopped and access is revoked."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Stopped</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 shadow-2xs"
                  title="This link has expired."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Expired</span>
                </span>
              )}
            </div>
          )}

          {/* Copy / Share Client Questionnaire */}
          <button
            type="button"
            disabled={isGeneratingLink}
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-all active:scale-95 cursor-pointer"
            title="Copy Public Intake Link for the Client"
          >
            {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Client Link'}</span>
          </button>

          {/* Email to Client */}
          <button
            type="button"
            onClick={() => setIsSendEmailModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 transition-all active:scale-95 cursor-pointer"
            title="Email Questionnaire Link Directly to Client"
          >
            <Mail size={13} className="text-indigo-600" />
            <span>Email to Client</span>
          </button>

          {/* Stop / Reactivate Link Button */}
          {isLinkActive ? (
            <button
              type="button"
              disabled={isRevokingLink}
              onClick={handleStopLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Stop link immediately so clients cannot access or submit"
            >
              <Ban size={13} className="text-rose-600" />
              <span>{isRevokingLink ? 'Stopping...' : 'Stop Link'}</span>
            </button>
          ) : shareSettings?.shareToken ? (
            <button
              type="button"
              disabled={isRevokingLink}
              onClick={handleReactivateLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Reactivate questionnaire link for 7 days"
            >
              <RotateCw size={13} className="text-emerald-600" />
              <span>{isRevokingLink ? 'Activating...' : 'Reactivate Link'}</span>
            </button>
          ) : null}

          {lead.mobileNumber && (
            <button
              type="button"
              disabled={isGeneratingLink}
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer"
              title="Share Form via WhatsApp"
            >
              <MessageCircle size={13} className="text-emerald-600" />
              <span>WhatsApp to Client</span>
            </button>
          )}

          {!isReadOnly && canEdit && (
            <button
              type="button"
              onClick={onEditTeamRequirements}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[hsl(var(--primary))] hover:opacity-95 text-[hsl(var(--primary-foreground))] shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Pencil size={12} />
              <span>{hasTeamRequirements ? 'Edit Team Brief' : 'Record Team Brief'}</span>
            </button>
          )}

          {canSendToDrawings && onPassToDrawings && (
            <button
              type="button"
              onClick={onPassToDrawings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Pass to 2D/3D Drawing</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── CLIENT SUBMISSION STATUS NOTIFICATION BANNER ── */}
      {!hasClientWishlist ? (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                Client Wishlist Pending Online Submission
              </h4>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300 mt-0.5 leading-relaxed">
                Send the self-service intake link to <strong>{lead.name}</strong> so they can pick their favorite interior styles, room wishlist, and upload Pinterest/inspiration photos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedLink ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSendEmailModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Mail size={12} /> Email to Client
            </button>

            {lead.mobileNumber && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MessageCircle size={12} /> WhatsApp
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={17} />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">
                Client Submitted Online Wishlist
              </span>
              <span className="text-[10px] text-emerald-800/70 dark:text-emerald-400 block mt-0.5">
                Submitted on{' '}
                {clientWishlist.submittedAt
                  ? new Date(clientWishlist.submittedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Recent'}{' '}
                • {clientWishlist.rooms?.length || 0} Room(s) Specified
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shrink-0">
            Client Verified
          </span>
        </div>
      )}

      {/* ── OVERALL PROJECT DIRECTIVES COMPARISON ── */}
      {(viewMode === 'side_by_side' || viewMode === 'client_only') && hasClientWishlist && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
            <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Palette size={15} className="text-purple-600" />
              Client Aesthetic Moodboard & Living Profile
            </h3>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              Client Input
            </span>
          </div>

          {/* Style Pills & Family Profile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Preferred Styles */}
            <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <Palette size={11} className="text-purple-500" /> Preferred Styles
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {clientWishlist.preferredStyles && clientWishlist.preferredStyles.length > 0 ? (
                  clientWishlist.preferredStyles.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))] italic">Not specified</span>
                )}
              </div>
            </div>

            {/* Household Profile */}
            <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <User size={11} className="text-blue-500" /> Household Profile
              </span>
              <p className="text-xs font-semibold text-[hsl(var(--foreground))] mt-1 leading-relaxed">
                {clientWishlist.familyComposition || 'Not specified by client'}
              </p>
            </div>

            {/* Lifestyle Priorities */}
            <div className="p-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <Armchair size={11} className="text-amber-500" /> Lifestyle Priorities
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {clientWishlist.lifestylePriorities && clientWishlist.lifestylePriorities.length > 0 ? (
                  clientWishlist.lifestylePriorities.map((lp: string) => (
                    <span
                      key={lp}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                    >
                      {lp}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[hsl(var(--muted-foreground))] italic">No specific habits noted</span>
                )}
              </div>
            </div>
          </div>

          {/* Overall Vibe & Notes */}
          {clientWishlist.overallVibe && (
            <div className="p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block mb-1">
                Client&apos;s Own Words (Desired Vibe):
              </span>
              <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed italic">
                &ldquo;{clientWishlist.overallVibe}&rdquo;
              </p>
            </div>
          )}

          {/* Must Haves vs Must Avoids */}
          {(clientWishlist.mustHaves || clientWishlist.mustAvoids) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {clientWishlist.mustHaves && (
                <div className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Must-Haves (Client Priorities):
                  </span>
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                    {clientWishlist.mustHaves}
                  </p>
                </div>
              )}

              {clientWishlist.mustAvoids && (
                <div className="p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1 mb-1">
                    <X size={12} className="text-rose-600" /> Must-Avoids (Disliked Items):
                  </span>
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                    {clientWishlist.mustAvoids}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Inspiration Gallery */}
          {clientWishlist.inspirationImages && clientWishlist.inspirationImages.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1 mb-2">
                <Sparkles size={11} className="text-pink-500" /> Client Inspiration Moodboard ({clientWishlist.inspirationImages.length} Photos)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {clientWishlist.inspirationImages.map((img: string, iIdx: number) => (
                  <button
                    type="button"
                    key={iIdx}
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
        </div>
      )}

      {/* ── ROOM-BY-ROOM COMPARISON MATRIX ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Home size={15} className="text-indigo-600" />
            Room-by-Room Specifications ({allRoomNames.length} {allRoomNames.length === 1 ? 'Area' : 'Areas'})
          </h3>

          <div className="text-[11px] text-[hsl(var(--muted-foreground))] hidden sm:block">
            {viewMode === 'side_by_side' && 'Left: Client Wishes • Right: Team Feasibility'}
          </div>
        </div>

        {allRoomNames.length === 0 ? (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 text-center flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
              <Home size={22} />
            </div>
            <h4 className="text-sm font-bold text-[hsl(var(--foreground))]">No Room Requirements Logged Yet</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md">
              Send the client intake link or record the technical brief to begin room-by-room space planning.
            </p>
          </div>
        ) : (
          allRoomNames.map((roomName: string, idx: number) => {
            const clientRoom = (clientWishlist?.rooms || []).find(
              (r: any) => r.roomName?.toLowerCase() === roomName.toLowerCase()
            );
            const teamRoom = teamRequirements.find(
              (r: any) => r.roomName?.toLowerCase() === roomName.toLowerCase()
            );

            return (
              <div
                key={idx}
                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-xs hover:border-indigo-500/30 transition-all"
              >
                {/* Room Header Bar */}
                <div className="bg-[hsl(var(--muted)/0.4)] px-4 py-2.5 border-b border-[hsl(var(--border))] flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">{roomName}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {clientRoom?.priority && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        clientRoom.priority === 'Must Have'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                      )}>
                        Client: {clientRoom.priority}
                      </span>
                    )}

                    {teamRoom?.dimensions && (
                      <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded">
                        {teamRoom.dimensions}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body: Split View or Filtered View */}
                <div className={cn(
                  'p-4 gap-4',
                  viewMode === 'side_by_side' ? 'grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[hsl(var(--border))]' : 'block'
                )}>
                  {/* ── LEFT COLUMN: CLIENT PERSPECTIVE ── */}
                  {(viewMode === 'side_by_side' || viewMode === 'client_only') && (
                    <div className="space-y-3 pb-3 lg:pb-0 lg:pr-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                          <User size={12} /> Homeowner / Client Wishlist
                        </span>
                        {clientRoom ? (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Client Specified
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] italic">
                            No client input
                          </span>
                        )}
                      </div>

                      {clientRoom ? (
                        <div className="space-y-2 text-xs">
                          {clientRoom.wishedItems && (
                            <div className="p-2.5 rounded-xl bg-purple-500/[0.04] border border-purple-500/15">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block mb-0.5">
                                Desired Furniture & Fixtures:
                              </span>
                              <p className="font-semibold text-[hsl(var(--foreground))] leading-relaxed">
                                {clientRoom.wishedItems}
                              </p>
                            </div>
                          )}

                          {clientRoom.aestheticNotes && (
                            <div className="p-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-0.5">
                                Client Aesthetic / Mood Notes:
                              </span>
                              <p className="text-[hsl(var(--foreground))] italic leading-relaxed">
                                &ldquo;{clientRoom.aestheticNotes}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] italic py-2">
                          Client did not specifically request items for this room.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── RIGHT COLUMN: TEAM TECHNICAL BRIEF ── */}
                  {(viewMode === 'side_by_side' || viewMode === 'team_only') && (
                    <div className="space-y-3 pt-3 lg:pt-0 lg:pl-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                          <Wrench size={12} /> Team Technical & Spatial Specifications
                        </span>
                        {teamRoom ? (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Surveyed & Configured
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                            Pending Technical Survey
                          </span>
                        )}
                      </div>

                      {teamRoom ? (
                        <div className="space-y-2 text-xs">
                          {/* Functional Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {teamRoom.roomUsage && (
                              <div className="p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">Usage / Function</span>
                                <span className="font-semibold text-[hsl(var(--foreground))]">{teamRoom.roomUsage}</span>
                              </div>
                            )}

                            {teamRoom.designStyle && (
                              <div className="p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">Design Theme</span>
                                <span className="font-semibold text-[hsl(var(--foreground))]">{teamRoom.designStyle}</span>
                              </div>
                            )}

                            {teamRoom.storage && (
                              <div className="p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">Storage Units</span>
                                <span className="font-semibold text-[hsl(var(--foreground))]">{teamRoom.storage}</span>
                              </div>
                            )}

                            {teamRoom.electricalPoints && (
                              <div className="p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">Electrical / MEP</span>
                                <span className="font-semibold text-[hsl(var(--foreground))]">{teamRoom.electricalPoints}</span>
                              </div>
                            )}
                          </div>

                          {/* Technical Notes / Specs */}
                          {(teamRoom.furnitureRequirements || teamRoom.materials || teamRoom.ceiling || teamRoom.wallFinishes) && (
                            <div className="p-2.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/15">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block mb-0.5">
                                Consultant Specifications:
                              </span>
                              <div className="space-y-1 font-medium text-[hsl(var(--foreground))] text-[11px]">
                                {teamRoom.furnitureRequirements && (
                                  <p>• <strong>Furniture:</strong> {teamRoom.furnitureRequirements}</p>
                                )}
                                {teamRoom.materials && (
                                  <p>• <strong>Materials:</strong> {teamRoom.materials}</p>
                                )}
                                {teamRoom.wallFinishes && (
                                  <p>• <strong>Walls / Ceiling:</strong> {teamRoom.wallFinishes} {teamRoom.ceiling ? `(${teamRoom.ceiling})` : ''}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-[hsl(var(--border))] text-center">
                          <p className="text-xs text-[hsl(var(--muted-foreground))] italic mb-2">
                            Technical specifications not logged yet for this room.
                          </p>
                          {!isReadOnly && canEdit && (
                            <button
                              type="button"
                              onClick={onEditTeamRequirements}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                            >
                              + Add specs for {roomName}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox Modal for Inspiration Photo View */}
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

      {/* Send Requirements Email Modal */}
      <InteriorSendRequirementsModal
        isOpen={isSendEmailModalOpen}
        onClose={() => setIsSendEmailModalOpen(false)}
        lead={lead}
        onSuccess={onRefresh}
      />
    </div>
  );
}
