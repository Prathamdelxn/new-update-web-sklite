'use client';

// =============================================================================
// Sky-Lite Web — Interior CRM Share Link Modal
// Compact, Professional Light-Theme Sharing Modal for Drawings and Requirements
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Download,
  MessageCircle,
  Mail,
  Link2,
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface InteriorCrmShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  onUpdated?: () => void;
  mode?: 'drawings' | 'requirements';
}

export function InteriorCrmShareModal({
  isOpen,
  onClose,
  lead,
  onUpdated,
  mode = 'drawings',
}: InteriorCrmShareModalProps) {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresHours, setExpiresHours] = useState<number | null>(mode === 'requirements' ? null : 168);
  const [allowDownload, setAllowDownload] = useState(false);
  const [shareToken, setShareToken] = useState<string>('');
  const [isPublic, setIsPublic] = useState(false);

  const approvedDrawings = (lead?.designFiles || []).filter((d: any) => {
    const versions = d.versions || [];
    const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
    const status = d.status || d.approvalStatus || latestVersion?.approvalStatus;
    const isStatusApproved = ['internally_approved', 'client_approved', 'approved'].includes(status);
    const hasApprovedVersion = versions.some((v: any) => v.approvalStatus === 'internally_approved' || v.approvalStatus === 'approved');
    const isChangesRequested = d.clientStatus === 'client_changes_requested' || latestVersion?.clientStatus === 'client_changes_requested';
    return (isStatusApproved || hasApprovedVersion) && !isChangesRequested;
  });
  const approvedCount = approvedDrawings.length;
  const isClientSubmitted = !!(lead?.clientRequirements?.submittedAt || lead?.clientRequirementsSubmittedAt);

  const isLinkExpired = Boolean(
    lead?.shareSettings?.expiresAt &&
    new Date(lead.shareSettings.expiresAt).getTime() < Date.now()
  );

  useEffect(() => {
    if (lead && isOpen) {
      if (mode === 'drawings' && approvedCount === 0) {
        setShareToken('');
        setIsPublic(false);
        return;
      }

      const currentShare = lead.shareSettings || {};
      if (currentShare.shareToken && currentShare.isPublic) {
        setShareToken(currentShare.shareToken);
        setIsPublic(true);
        setAllowDownload(currentShare.allowDownload === true);

        if (currentShare.expiresAt) {
          const diffMs = new Date(currentShare.expiresAt).getTime() - Date.now();
          if (diffMs <= 0) {
            // Expired link - default renewal to Never or 7 days
            setExpiresHours(mode === 'requirements' ? null : 168);
          } else {
            const diffHours = Math.round(diffMs / (1000 * 60 * 60));
            const presets = [1, 12, 24, 168, 720];
            const closest = presets.find((p) => Math.abs(p - diffHours) <= 1 || (p === 168 && Math.abs(p - diffHours) <= 24) || (p === 720 && Math.abs(p - diffHours) <= 48));
            if (closest) {
              setExpiresHours(closest);
            } else {
              setExpiresHours(Math.max(1, diffHours));
            }
          }
        } else if (currentShare.expiresAt === null) {
          setExpiresHours(null);
        } else {
          setExpiresHours(mode === 'requirements' ? null : 168);
        }
      } else {
        handleGenerateOrUpdate(false, mode === 'requirements' ? null : 168, false);
      }
    }
  }, [lead?._id, isOpen]);

  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '') : '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const sharePath = mode === 'requirements' ? 'requirements' : 'drawing';
  const shareUrl = shareToken ? `${origin}/share/${sharePath}/${shareToken}` : '';

  const handleGenerateOrUpdate = async (
    regenerate = false,
    customHours?: number | null,
    customDownload?: boolean
  ) => {
    if (!lead?._id) return;
    if (mode === 'drawings' && approvedCount === 0) {
      toast.error('Cannot create share link: At least one drawing must be approved before sharing with client.');
      return;
    }

    try {
      setLoading(true);
      const targetHours = customHours !== undefined ? customHours : expiresHours;
      const targetDownload = customDownload !== undefined ? customDownload : allowDownload;

      const res = await interiorCrmService.generateShareLink(lead._id, {
        expiresHours: targetHours,
        allowDownload: targetDownload,
        includeRequirements: mode === 'requirements',
        mode,
        regenerate,
      });

      if (res.success && res.data) {
        setShareToken(res.data.shareToken);
        setIsPublic(true);
        if (regenerate) {
          toast.success('Active share link refreshed successfully');
        }
        if (onUpdated) onUpdated();
      } else {
        toast.error(res.message || 'Failed to configure share link');
      }
    } catch (err: any) {
      console.error('Error sharing link:', err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to configure share link');
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
        toast.success('Share link deactivated');
        if (onUpdated) onUpdated();
      } else {
        toast.error(res.message || 'Failed to revoke link');
      }
    } catch (err: any) {
      console.error('Error revoking share link:', err);
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to revoke link');
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
    if (mode === 'drawings' && approvedCount === 0) {
      toast.error('Sharing is not allowed until at least one drawing is approved');
      return;
    }
    if (!shareUrl) {
      toast.error('Please wait for share link to generate');
      return;
    }
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2200);
    } else {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  const handleWhatsAppShare = () => {
    if (mode === 'drawings' && approvedCount === 0) {
      toast.error('Sharing is not allowed until at least one drawing is approved');
      return;
    }
    if (!shareUrl) return;
    const clientName = lead?.name || 'Client';
    const text = mode === 'requirements'
      ? encodeURIComponent(
          `Hello ${clientName},\n\nPlease fill out your interior design requirements & room wishlist using this link:\n${shareUrl}\n\nOur design team will review your preferences and specifications right away!`
        )
      : encodeURIComponent(
          `Hello ${clientName},\n\nHere is your interior design & drawings link for review:\n${shareUrl}\n\nPlease click to view your 2D plans and 3D renders.`
        );
    const phone = (lead?.mobileNumber || '').replace(/\D/g, '');
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleEmailShare = () => {
    if (mode === 'drawings' && approvedCount === 0) {
      toast.error('Sharing is not allowed until at least one drawing is approved');
      return;
    }
    if (!shareUrl) return;
    const clientName = lead?.name || 'Client';
    const subject = mode === 'requirements'
      ? encodeURIComponent(`Interior Design Requirements Intake - ${clientName}`)
      : encodeURIComponent(`Interior Design & Drawings Review - ${clientName}`);
    const body = mode === 'requirements'
      ? encodeURIComponent(`Hello ${clientName},\n\nPlease fill out your interior design requirements & room wishlist using this link:\n\n${shareUrl}\n\nOur design team will review your preferences right away!`)
      : encodeURIComponent(`Hello ${clientName},\n\nHere is your interior design & drawings link for review:\n\n${shareUrl}\n\nPlease click to view your 2D plans and 3D renders.`);
    const email = lead?.email || '';
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  if (!isOpen || !lead) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header Banner */}
          <div className={cn(
            "p-4 sm:p-6 text-white relative",
            mode === 'requirements'
              ? "bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-700"
              : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700"
          )}>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                {mode === 'requirements' ? <FileText size={18} className="text-white" /> : <Share2 size={18} className="text-white" />}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {mode === 'requirements' ? 'Client Requirements Link' : 'Share Drawings Link'}
                </h3>
                <p className="text-xs text-white/80 font-medium">
                  {mode === 'requirements'
                    ? 'Intake form for client to self-fill wishlist & room specs'
                    : 'Public view-only portal for client review'}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 w-max">
              <span className="font-bold">{lead.name}</span>
              <span className="text-white/60">•</span>
              <span className="text-white/80">{lead.propertyType || 'Residential'}</span>
              <span className="text-white/60">•</span>
              {mode === 'requirements' ? (
                <span className={cn("font-bold", isClientSubmitted ? "text-emerald-300" : "text-amber-200")}>
                  {isClientSubmitted ? '✓ Client Submitted' : 'Pending Client Response'}
                </span>
              ) : (
                <span className="font-bold text-emerald-300">
                  {approvedCount} Approved {approvedCount === 1 ? 'Drawing' : 'Drawings'}
                </span>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Warning if no drawings are approved yet (only for drawings mode) */}
            {mode === 'drawings' && approvedCount === 0 ? (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="block font-bold">No Approved Drawings Yet</strong>
                  <span>Clients will only see drawings after they are approved internally. Draft or pending drawings are automatically hidden from this link.</span>
                </div>
              </div>
            ) : (
              <>
                {/* Expired Link Notice */}
                {isLinkExpired && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-amber-600 shrink-0" />
                      <span>This share link has expired (HTTP 410).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateOrUpdate(true, expiresHours ?? (mode === 'requirements' ? null : 168))}
                      disabled={loading}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer transition shadow-2xs"
                    >
                      Renew Link
                    </button>
                  </div>
                )}

                {/* Share URL Input & Copy Button */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {mode === 'requirements' ? 'Client Intake URL' : 'Shareable Portal URL'}
                  </label>
                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-slate-400 focus-within:bg-white transition-all">
                    <div className="pl-2 text-slate-400">
                      <Link2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={shareUrl || 'Generating link...'}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 bg-transparent px-1.5 py-1 text-xs font-mono text-slate-700 outline-none truncate select-all cursor-pointer"
                    />

                    <button
                      type="button"
                      onClick={handleCopy}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs",
                        copied ? "bg-emerald-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
                      )}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {shareUrl && (
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition shrink-0"
                        title="Open live preview in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Fast Sharing Channels */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer active:scale-[0.99]"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEmailShare}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer active:scale-[0.99]"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Email</span>
                  </button>
                </div>
              </>
            )}

            {/* Sharing Permissions & Customization */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Link Settings & Permissions
              </h4>

              {/* Allow Downloads Toggle (Drawings only) */}
              {mode === 'drawings' && (
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Download size={16} className="text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">Allow Drawing Downloads</div>
                      <div className="text-[10px] text-slate-500">Client can download CAD files, PDF blueprints, and 3D renders</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => {
                      const newDownload = e.target.checked;
                      setAllowDownload(newDownload);
                      if (isPublic) handleGenerateOrUpdate(false, expiresHours, newDownload);
                    }}
                    className="rounded accent-indigo-600 w-4 h-4 cursor-pointer shrink-0 ml-2"
                  />
                </label>
              )}

              {/* Expiry Selector */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Link Expiration:</span>
                  </div>

                  <select
                    value={expiresHours === null ? 'never' : expiresHours}
                    onChange={(e) => {
                      const val = e.target.value === 'never' ? null : Number(e.target.value);
                      setExpiresHours(val);
                      if (isPublic) handleGenerateOrUpdate(false, val, allowDownload);
                    }}
                    className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-blue-500"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={168}>7 Days</option>
                    <option value={720}>30 Days</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Footer */}
          <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
            <div>
              {(mode === 'requirements' || approvedCount > 0) && (
                isPublic ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRevoke}
                      disabled={loading}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Deactivate Link
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateOrUpdate(true, expiresHours ?? (mode === 'requirements' ? null : 168))}
                      disabled={loading}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                      Regenerate Link
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGenerateOrUpdate(false, expiresHours ?? (mode === 'requirements' ? null : 168))}
                    disabled={loading}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Activate Link
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs ml-auto"
            >
              {(mode === 'drawings' && approvedCount === 0) ? 'Close' : 'Done'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
