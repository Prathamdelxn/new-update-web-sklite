'use client';

// =============================================================================
// Sky-Lite Web — Interior CRM Drawing Share Link Modal
// Compact, Professional Light-Theme Sharing Modal
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
  Loader2,
  RefreshCw,
  MessageCircle,
  Mail,
  Link2,
  AlertTriangle,
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
  const [expiresHours, setExpiresHours] = useState<number | null>(1);
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

  useEffect(() => {
    if (lead && isOpen) {
      if (approvedCount === 0) {
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
          const diffHours = Math.round(diffMs / (1000 * 60 * 60));
          const presets = [1, 12, 24, 168, 720];
          const closest = presets.find((p) => Math.abs(p - diffHours) <= 1 || (p === 168 && Math.abs(p - diffHours) <= 24) || (p === 720 && Math.abs(p - diffHours) <= 48));
          if (closest && diffMs > 0) {
            setExpiresHours(closest);
          } else if (diffMs > 0) {
            setExpiresHours(Math.max(1, diffHours));
          } else {
            setExpiresHours(1);
          }
        } else if (currentShare.expiresAt === null) {
          setExpiresHours(null);
        } else {
          setExpiresHours(1);
        }
      } else {
        handleGenerateOrUpdate(false, 1, false);
      }
    }
  }, [lead?._id, isOpen]);

  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '') : '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const shareUrl = shareToken ? `${origin}/share/drawing/${shareToken}` : '';

  const handleGenerateOrUpdate = async (
    regenerate = false,
    customHours?: number | null,
    customDownload?: boolean
  ) => {
    if (!lead?._id) return;
    if (approvedCount === 0) {
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
        includeRequirements: false,
        regenerate,
      });

      if (res.success && res.data) {
        setShareToken(res.data.shareToken);
        setIsPublic(true);
        if (regenerate) {
          toast.success('New share link generated successfully');
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
        toast.success('Share link deactivated');
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
    if (approvedCount === 0) {
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
    if (approvedCount === 0) {
      toast.error('Sharing is not allowed until at least one drawing is approved');
      return;
    }
    if (!shareUrl) return;
    const clientName = lead?.name || 'Client';
    const text = encodeURIComponent(
      `Hello ${clientName},\n\nHere is your interior design & drawings link for review:\n${shareUrl}\n\nPlease click to view your 2D plans and 3D renders.`
    );
    const phone = (lead?.mobileNumber || '').replace(/\D/g, '');
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleEmailShare = () => {
    if (approvedCount === 0) {
      toast.error('Sharing is not allowed until at least one drawing is approved');
      return;
    }
    if (!shareUrl) return;
    const clientName = lead?.name || 'Client';
    const email = lead?.email || lead?.emailAddress || '';
    const subject = encodeURIComponent(`Interior Design & Drawings for Review - ${lead?.name || 'Project'}`);
    const body = encodeURIComponent(
      `Hello ${clientName},\n\nPlease review your interior design drawings, 2D floor plans, and 3D renders using the secure review link below:\n\n${shareUrl}\n\nThank you,\nSkyStruct Interior Design Team`
    );
    const mailtoUrl = email ? `mailto:${email}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
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
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-none">
                  Share Drawings Link
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {lead.name} • {lead.propertyType || 'Residential'} • <span className={approvedCount > 0 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{approvedCount} Approved</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          {approvedCount === 0 ? (
            <div className="p-6 text-center space-y-4 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-xs mx-auto">
                <h4 className="text-sm font-bold text-slate-900">Sharing Not Allowed</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No drawings are currently approved for <strong className="text-slate-700">{lead.name}</strong>. At least one drawing must be approved before you can create and share a client link.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-3.5 bg-white">
              {/* Primary Link & Actions */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-slate-700">Client Access URL</span>
                  <button
                    type="button"
                    onClick={() => handleGenerateOrUpdate(true)}
                    disabled={loading}
                    className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
                    title="Generate fresh URL token"
                  >
                    <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                    <span>Reset Link</span>
                  </button>
                </div>

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

              {/* Compact Settings Controls */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                {/* Download toggle row */}
                <div
                  onClick={() => {
                    const newDownload = !allowDownload;
                    setAllowDownload(newDownload);
                    if (isPublic) handleGenerateOrUpdate(false, expiresHours, newDownload);
                  }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs font-semibold text-slate-800">Allow File Downloads</span>
                  </div>
                  <div
                    className={cn(
                      'w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0',
                      allowDownload ? 'bg-blue-600' : 'bg-slate-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-all',
                        allowDownload ? 'ml-auto' : 'ml-0'
                      )}
                    />
                  </div>
                </div>

                {/* Expiration row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
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
          )}

          {/* Compact Footer */}
          <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
            <div>
              {approvedCount > 0 && (
                isPublic ? (
                  <button
                    type="button"
                    onClick={handleRevoke}
                    disabled={loading}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Deactivate Link
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGenerateOrUpdate(false)}
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
              {approvedCount === 0 ? 'Close' : 'Done'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

