'use client';

// =============================================================================
// Sky-Lite Web — Interior CRM Share Link Modal
// Modern, Executive-Grade Light/Dark Sharing Modal for Drawings and Requirements
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
  PowerOff,
  RotateCcw,
  QrCode,
  ShieldCheck,
  User,
  Sliders,
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
  const [showQr, setShowQr] = useState(false);

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
            setExpiresHours(mode === 'requirements' ? 168 : 168);
          } else {
            const diffHours = Math.round(diffMs / (1000 * 60 * 60));
            const presets = [1, 12, 24, 72, 168, 720];
            const closest = presets.find((p) => Math.abs(p - diffHours) <= 1 || (p === 72 && Math.abs(p - diffHours) <= 12) || (p === 168 && Math.abs(p - diffHours) <= 24) || (p === 720 && Math.abs(p - diffHours) <= 48));
            if (closest) {
              setExpiresHours(closest);
            } else {
              setExpiresHours(Math.max(1, diffHours));
            }
          }
        } else if (currentShare.expiresAt === null) {
          setExpiresHours(null);
        } else {
          setExpiresHours(mode === 'requirements' ? 168 : 168);
        }
      } else if (currentShare.shareToken && currentShare.isPublic === false) {
        setShareToken(currentShare.shareToken);
        setIsPublic(false);
        setAllowDownload(currentShare.allowDownload === true);
        if (currentShare.expiresAt) {
          const diffMs = new Date(currentShare.expiresAt).getTime() - Date.now();
          setExpiresHours(diffMs > 0 ? Math.round(diffMs / (1000 * 60 * 60)) : 168);
        } else if (currentShare.expiresAt === null) {
          setExpiresHours(null);
        } else {
          setExpiresHours(168);
        }
      } else {
        handleGenerateOrUpdate(false, mode === 'requirements' ? 168 : 168, false);
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
          `Hello ${clientName}!\n\nPlease fill out your interior design requirements & room wishlist using this link:\n${shareUrl}\n\nOur design team will review your preferences and specifications right away!`
        )
      : encodeURIComponent(
          `Hello ${clientName}!\n\nHere is your interior design & drawings link for review:\n${shareUrl}\n\nPlease click to view your approved 2D layouts and 3D visual concepts.`
        );
    const phone = (lead?.mobileNumber || lead?.phone || '').replace(/\D/g, '');
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-900/10 overflow-hidden my-auto"
        >
          {/* Executive Light Header */}
          <div className="px-6 pt-6 pb-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-white relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-8">
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border",
                mode === 'requirements'
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200/80"
                  : "bg-indigo-50 text-indigo-600 border-indigo-200/80"
              )}>
                {mode === 'requirements' ? <FileText size={22} /> : <Share2 size={22} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {mode === 'requirements' ? 'Client Requirements Link' : 'Share Drawings Link'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {mode === 'requirements'
                    ? 'Shareable online intake form for room wishlist & interior specifications'
                    : 'Private client review portal for 2D plans and 3D visual concepts'}
                </p>
              </div>
            </div>

            {/* Context Badge Bar */}
            <div className="mt-4 flex items-center gap-2 flex-wrap text-xs">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200/80">
                <User size={12} className="text-slate-400" />
                <span className="truncate max-w-[140px]">{lead.name || 'Client'}</span>
                {lead.propertyType && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-normal">{lead.propertyType}</span>
                  </>
                )}
              </div>

              {/* Status Pill */}
              {mode === 'requirements' ? (
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-semibold border text-xs",
                  !isPublic
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : isClientSubmitted
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    !isPublic
                      ? "bg-rose-500"
                      : isClientSubmitted
                      ? "bg-emerald-500"
                      : "bg-amber-500 animate-pulse"
                  )} />
                  <span>
                    {!isPublic
                      ? 'Link Stopped'
                      : isClientSubmitted
                      ? 'Requirements Submitted'
                      : 'Awaiting Client Input'}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{approvedCount} Approved {approvedCount === 1 ? 'Drawing' : 'Drawings'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-4.5">
            {/* Warning if no drawings are approved yet (only for drawings mode) */}
            {mode === 'drawings' && approvedCount === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong className="block font-bold text-amber-900">No Approved Drawings Yet</strong>
                  <span className="mt-0.5 block leading-relaxed text-amber-800/90">
                    Clients will only see drawings after they are approved internally. Draft or pending drawings are automatically hidden from this link.
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* Expired Link Notice */}
                {isLinkExpired && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2.5">
                      <Clock size={16} className="text-amber-600 shrink-0" />
                      <span>This share link has expired and is inaccessible to clients.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerateOrUpdate(true, expiresHours ?? (mode === 'requirements' ? null : 168))}
                      disabled={loading}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all shadow-xs active:scale-95"
                    >
                      Renew Link
                    </button>
                  </div>
                )}

                {/* Share URL Input & Action Buttons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {mode === 'requirements' ? 'Client Intake URL' : 'Shareable Portal URL'}
                    </label>
                    {isPublic && !isLinkExpired ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>Live & Accessible</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>{isLinkExpired ? 'Expired' : 'Stopped / Disabled'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all shadow-2xs">
                    <div className="pl-2.5 text-slate-400">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={shareUrl || 'Generating secure link...'}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 bg-transparent px-2 py-1 text-xs font-mono text-slate-700 outline-none truncate select-all cursor-pointer"
                    />

                    <button
                      type="button"
                      onClick={handleCopy}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95",
                        copied
                          ? "bg-emerald-700 text-white shadow-emerald-700/20"
                          : mode === 'requirements'
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/15"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/15"
                      )}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {shareUrl && (
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition shrink-0"
                        title="Open live preview in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Fast Sharing Channels */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-2xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Send intake link directly via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEmailShare}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100/80 text-blue-800 border border-blue-200/80 rounded-2xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                    title="Send intake link via Email"
                  >
                    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQr((prev) => !prev)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer border",
                      showQr
                        ? "bg-purple-600 text-white border-purple-600 shadow-purple-600/20"
                        : "bg-purple-50 hover:bg-purple-100/80 text-purple-800 border border-purple-200/80"
                    )}
                    title="Toggle QR Code for client camera scan"
                  >
                    <QrCode className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{showQr ? 'Hide QR' : 'QR Code'}</span>
                  </button>
                </div>

                {/* Collapsible QR Code Card */}
                {showQr && shareUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col items-center text-center space-y-2.5"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-200/80">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(shareUrl)}`}
                        alt="Intake Link QR Code"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Scan with Phone Camera
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Show this QR code to the client to open the intake form instantly on their mobile
                      </p>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* Sharing Permissions & Customization */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders size={12} />
                <span>Link Access & Expiration</span>
              </h4>

              {/* Expiry Selector Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/80">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">
                      Link Expiration
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {expiresHours === null
                        ? 'Never expires (Always active)'
                        : `Auto-expires in ${expiresHours >= 24 ? Math.round(expiresHours / 24) + ' day(s)' : expiresHours + ' hour(s)'}`}
                    </div>
                  </div>
                </div>

                <select
                  value={expiresHours === null ? 'never' : expiresHours}
                  onChange={(e) => {
                    const val = e.target.value === 'never' ? null : Number(e.target.value);
                    setExpiresHours(val);
                    if (isPublic) handleGenerateOrUpdate(false, val, allowDownload);
                  }}
                  className="text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 outline-none cursor-pointer shadow-2xs transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={72}>3 Days</option>
                  <option value={168}>7 Days (Recommended)</option>
                  <option value={720}>30 Days (1 Month)</option>
                  <option value="never">Never (No Expiry)</option>
                </select>
              </div>

              {/* Allow Downloads Toggle (Drawings mode only) */}
              {mode === 'drawings' && (
                <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200/80">
                      <Download size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900">
                        Allow Drawing Downloads
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Clients can download high-resolution CAD blueprints and 3D renders
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowDownload}
                    onClick={() => {
                      const next = !allowDownload;
                      setAllowDownload(next);
                      if (isPublic) handleGenerateOrUpdate(false, expiresHours, next);
                    }}
                    className={cn(
                      "w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5",
                      allowDownload ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-xs transition-transform block",
                        allowDownload ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Executive Light Footer */}
          <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              {(mode === 'requirements' || approvedCount > 0) && (
                isPublic ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRevoke}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Deactivate and stop this share link immediately"
                    >
                      <PowerOff size={12} />
                      <span>Deactivate / Stop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateOrUpdate(true, expiresHours ?? 168)}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Generate a new secure token for this link"
                    >
                      <RefreshCw size={12} className={loading ? "animate-spin text-slate-400" : "text-slate-500"} />
                      <span>Regenerate</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <PowerOff size={11} />
                      <span>Link Stopped</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGenerateOrUpdate(false, expiresHours ?? 168)}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      <span>Activate Link</span>
                    </button>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer ml-auto text-white",
                mode === 'requirements'
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/15"
              )}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
