'use client';

// =============================================================================
// Sky-Lite Web — Interior CRM Drawing Share Link Modal
// Generates a pluggable, view-only client link for CRM Drawings & Design Portfolio
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Clock,
  Download,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Layers,
  Sparkles,
  MessageCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface InteriorCrmShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  onUpdated?: () => void;
}

export function InteriorCrmShareModal({
  isOpen,
  onClose,
  lead,
  onUpdated,
}: InteriorCrmShareModalProps) {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresDays, setExpiresDays] = useState<number | null>(null);
  const [allowDownload, setAllowDownload] = useState(true);
  const [shareToken, setShareToken] = useState<string>('');
  const [isPublic, setIsPublic] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);

  useEffect(() => {
    if (lead && isOpen) {
      const currentShare = lead.shareSettings || {};
      if (currentShare.shareToken && currentShare.isPublic) {
        setShareToken(currentShare.shareToken);
        setIsPublic(true);
        setAllowDownload(currentShare.allowDownload !== false);
        setViewCount(currentShare.viewCount || 0);
        setLastViewedAt(currentShare.lastViewedAt || null);
      } else {
        // Automatically generate/activate token if not already active
        handleGenerateOrUpdate(false);
      }
    }
  }, [lead?._id, isOpen]);

  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '') : '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const shareUrl = shareToken ? `${origin}/share/drawing/${shareToken}` : '';

  const handleGenerateOrUpdate = async (regenerate = false) => {
    if (!lead?._id) return;
    try {
      setLoading(true);
      const res = await interiorCrmService.generateShareLink(lead._id, {
        expiresDays,
        allowDownload,
        includeRequirements: false,
        regenerate,
      });

      if (res.success && res.data) {
        setShareToken(res.data.shareToken);
        setIsPublic(true);
        if (regenerate) {
          toast.success('New link generated successfully');
        }
        if (onUpdated) onUpdated();
      } else {
        toast.error(res.message || 'Failed to configure share link');
      }
    } catch (err: any) {
      console.error('Error sharing drawings:', err);
      toast.error(err.response?.data?.message || 'Failed to configure share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!lead?._id) return;
    try {
      setLoading(true);
      const res = await interiorCrmService.revokeShareLink(lead._id);
      if (res.success) {
        setIsPublic(false);
        toast.success('Public share link deactivated');
        if (onUpdated) onUpdated();
      } else {
        toast.error(res.message || 'Failed to revoke link');
      }
    } catch (err: any) {
      console.error('Error revoking share link:', err);
      toast.error(err.response?.data?.message || 'Failed to revoke link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!text) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn('Clipboard writeText failed, using fallback', err);
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback copy failed', err);
      return false;
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) {
      toast.error('Please wait for share link to generate');
      return;
    }
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      toast.success('Link copied: ' + shareUrl);
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error('Failed to copy. Please manually select and copy the text.');
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareUrl) return;
    const clientName = lead?.name || 'Client';
    const text = encodeURIComponent(
      `Hello ${clientName},\n\nHere is your interior design & drawings link for review:\n${shareUrl}\n\nPlease click to view your 2D plans and 3D renders.`
    );
    const phone = (lead?.mobileNumber || '').replace(/\D/g, '');
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  if (!isOpen || !lead) return null;

  const approvedDrawings = (lead.designFiles || []).filter((d: any) => {
    const versions = d.versions || [];
    const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
    const status = d.status || d.approvalStatus || latestVersion?.approvalStatus;
    const isStatusApproved = ['internally_approved', 'client_approved', 'client_changes_requested'].includes(status);
    const hasApprovedVersion = versions.some((v: any) => v.approvalStatus === 'internally_approved');
    return isStatusApproved || hasApprovedVersion;
  });
  const approvedCount = approvedDrawings.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-4 sm:p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <Share2 size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">Share Drawings Link</h3>
                <p className="text-xs text-indigo-100 font-medium">Public view-only portal for client review</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 w-max">
              <span className="font-bold">{lead.name}</span>
              <span className="text-indigo-200">•</span>
              <span className="text-indigo-200">{lead.propertyType || 'Residential'}</span>
              <span className="text-indigo-200">•</span>
              <span className="font-bold text-emerald-300">{approvedCount} Approved {approvedCount === 1 ? 'Drawing' : 'Drawings'}</span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 space-y-5">
            {/* Warning if no drawings are approved yet */}
            {approvedCount === 0 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="block font-bold">No Approved Drawings Yet</strong>
                  <span>Clients will only see drawings after they are approved internally. Draft or pending drawings are automatically hidden from this link.</span>
                </div>
              </div>
            )}
            {/* Status & Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full animate-pulse',
                    isPublic ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-400'
                  )}
                />
                <div>
                  <div className="text-xs font-bold text-[hsl(var(--foreground))]">
                    {isPublic ? 'Public Link Active' : 'Public Link Inactive'}
                  </div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {isPublic
                      ? `${viewCount} client ${viewCount === 1 ? 'view' : 'views'}`
                      : 'Anyone with this link can view if enabled'}
                  </div>
                </div>
              </div>

              {!isPublic ? (
                <button
                  onClick={() => handleGenerateOrUpdate(false)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  <Globe size={13} /> Enable Link
                </button>
              ) : (
                <button
                  onClick={handleRevoke}
                  disabled={loading}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  Revoke Link
                </button>
              )}
            </div>

            {/* Generated Link Box (if active) */}
            {isPublic && shareUrl && (
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-[hsl(var(--foreground))] flex items-center justify-between">
                  <span>Client URL (No Login Required)</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Live
                  </span>
                </label>

                <div className="flex items-center gap-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-1.5 rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 bg-transparent px-2.5 py-1 text-xs font-mono text-[hsl(var(--foreground))] outline-none truncate cursor-pointer select-all"
                  />

                  <button
                    onClick={handleCopy}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95',
                      copied
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                    )}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>

                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-colors shrink-0"
                    title="Open live preview"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>

                {/* Quick Share Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <MessageCircle size={14} /> Send to WhatsApp
                  </button>

                  <button
                    onClick={() => handleGenerateOrUpdate(true)}
                    disabled={loading}
                    className="py-2 px-3 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.8)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Generate a new fresh URL token (invalidates old URL)"
                  >
                    <RefreshCw size={13} className={cn(loading && 'animate-spin')} /> Reset Token
                  </button>
                </div>
              </div>
            )}

            {/* Sharing Permissions & Customization */}
            <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
              <h4 className="text-xs font-extrabold text-[hsl(var(--foreground))] uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]">
                Client Permissions & View Settings
              </h4>

              {/* Allow Downloads Toggle */}
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.3)] transition-colors cursor-pointer">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Download size={16} className="text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[hsl(var(--foreground))] truncate">Allow Drawing Downloads</div>
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Client can download CAD files, PDF blueprints, and 3D renders</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => {
                    setAllowDownload(e.target.checked);
                    if (isPublic) handleGenerateOrUpdate(false);
                  }}
                  className="rounded accent-indigo-600 w-4 h-4 cursor-pointer shrink-0 ml-2"
                />
              </label>

              {/* Expiry Selector */}
              <div className="p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-[hsl(var(--foreground))]">Link Expiration</span>
                  </div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {expiresDays ? `Expires in ${expiresDays} days` : 'Never expires'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '7 Days', val: 7 },
                    { label: '30 Days', val: 30 },
                    { label: 'Never', val: null },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setExpiresDays(opt.val);
                        if (isPublic) handleGenerateOrUpdate(false);
                      }}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-xs font-bold transition-all border text-center cursor-pointer',
                        expiresDays === opt.val
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-[hsl(var(--muted)/0.4)] border-t border-[hsl(var(--border))] flex items-center justify-between">
            <div className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              <span>Pluggable tokenized sharing</span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
