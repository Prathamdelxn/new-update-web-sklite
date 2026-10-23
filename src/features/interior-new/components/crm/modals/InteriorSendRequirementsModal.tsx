'use client';

// =============================================================================
// Sky-Lite Web — Send Requirements Questionnaire Modal
// Allows the team to email the interactive client design intake form directly
// to the lead, with editable personal notes, subject line, and live link preview.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Send,
  Sparkles,
  Link2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Loader2,
  AlertCircle,
  User,
  Palette,
  Eye,
  Clock,
  Ban,
  RotateCw,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  onSuccess?: () => void;
}

export function InteriorSendRequirementsModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: Props) {
  const toast = useToast();

  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [expiresDays, setExpiresDays] = useState<number | null>(7);
  const [shareToken, setShareToken] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailError, setEmailError] = useState('');

  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
      : '') || (typeof window !== 'undefined' ? window.location.origin : '');

  const requirementsUrl = shareToken ? `${origin}/share/requirements/${shareToken}` : '';

  // Initialize form state when opened
  useEffect(() => {
    if (!isOpen || !lead) return;

    const leadName = lead.name || 'Client';
    const firstName = leadName.split(' ')[0];
    const initialEmail = lead.email || '';

    setRecipientEmail(initialEmail);
    setRecipientName(leadName);
    setEmailError('');
    setCopiedLink(false);

    setCustomSubject(`✨ Complete Your Interior Design Wishlist - ${leadName} | SkyStruct Interior`);
    setCustomMessage(
      `Hi ${firstName},\n\nWe are excited to begin designing your dream space! Please take 3 minutes to complete your interactive design questionnaire. You can select your favorite interior styles, detail your room-by-room wishlist, and upload inspiration photos so our design team can craft tailored 2D plans and 3D renders for you.\n\nWarm regards,\nDesign Team`
    );

    // Check or generate token
    const existingToken = lead.shareSettings?.shareToken;
    if (existingToken) {
      setShareToken(existingToken);
    } else {
      setIsLoadingToken(true);
      interiorCrmService
        .getRequirementsShareToken(lead._id)
        .then((res: any) => {
          if (res?.data?.shareToken) {
            setShareToken(res.data.shareToken);
          }
        })
        .catch((err: any) => {
          console.warn('Failed to ensure requirements token:', err);
        })
        .finally(() => {
          setIsLoadingToken(false);
        });
    }
  }, [isOpen, lead]);

  const handleCopy = () => {
    if (!requirementsUrl) return;
    navigator.clipboard.writeText(requirementsUrl);
    setCopiedLink(true);
    toast.success('Requirements link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedEmail = recipientEmail.trim();
    if (!trimmedEmail) {
      setEmailError('Please enter a recipient email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');

    try {
      setIsSubmitting(true);

      const res = await interiorCrmService.sendRequirementsEmail(lead._id, {
        recipientEmail: trimmedEmail,
        customSubject: customSubject.trim(),
        customMessage: customMessage.trim(),
        requirementsUrl: requirementsUrl || undefined,
        expiresDays: expiresDays,
      });

      if (res.success) {
        toast.success(res.message || `Requirements link successfully emailed to ${trimmedEmail}!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Failed to dispatch email');
      }
    } catch (err: any) {
      console.error('Send requirements email error:', err);
      toast.error(
        err?.response?.data?.error ||
        err?.message ||
        'Failed to send email. Please verify SMTP configuration.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopLink = async () => {
    if (!confirm('Are you sure you want to stop this link? Anyone attempting to open it will be blocked.')) {
      return;
    }
    try {
      setIsRevoking(true);
      const res = await interiorCrmService.revokeRequirementsLink(lead._id);
      if (res.success) {
        toast.success('Requirements link stopped and access revoked.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Failed to stop link');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to stop link');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleMailtoFallback = () => {
    if (!requirementsUrl) return;
    const subject = encodeURIComponent(customSubject);
    const body = encodeURIComponent(
      `${customMessage}\n\n👉 Complete Your Design Questionnaire here:\n${requirementsUrl}`
    );
    window.open(`mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleWhatsAppShare = () => {
    if (!requirementsUrl) return;
    const clientName = (lead.name || 'there').split(' ')[0];
    const message = encodeURIComponent(
      `Hi ${clientName}! Please share your interior design preferences, room wishlist, and style inspirations using this link: ${requirementsUrl}\n\nOur design team will use your brief to create your custom 2D & 3D designs!`
    );
    window.open(`https://wa.me/${lead.mobileNumber?.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] shadow-2xl my-auto text-[hsl(var(--foreground))]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4.5 border-b border-[hsl(var(--border))] bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-transparent dark:from-indigo-950/30 dark:via-purple-950/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20 shadow-2xs">
                <Mail size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-[hsl(var(--foreground))]">
                    Email Design Questionnaire
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    Client Portal
                  </span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  Send the self-service requirements questionnaire directly to <strong>{lead.name}</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSendEmail} className="p-6 overflow-y-auto space-y-4.5 flex-1">
            {/* Recipient Email Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <Mail size={13} className="text-indigo-600" />
                  <span>Recipient Client Email</span>
                  <span className="text-rose-500">*</span>
                </label>
                {lead.name && (
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                    <User size={11} /> {lead.name}
                  </span>
                )}
              </div>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="client@example.com"
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 transition-all',
                  emailError
                    ? 'border-rose-400 focus:ring-rose-400/20'
                    : 'border-[hsl(var(--border))] focus:ring-indigo-500/20 focus:border-indigo-500'
                )}
              />
              {emailError && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {emailError}
                </p>
              )}
            </div>

            {/* Email Subject */}
            <div>
              <label className="text-xs font-bold text-[hsl(var(--foreground))] mb-1.5 block">
                Email Subject
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Subject line..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--border))] text-sm font-medium bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Personal Message / Note */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] block">
                  Personal Message / Note from Designer
                </label>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Appears inside the branded email card
                </span>
              </div>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Write a personalized note to the client..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--border))] text-xs leading-relaxed bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Link Expiration Period Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-600" />
                  <span>Link Expiration Period</span>
                </label>
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  {expiresDays === null ? 'Never expires' : `Valid for ${expiresDays} days from dispatch`}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '7 Days', val: 7, desc: 'Recommended' },
                  { label: '14 Days', val: 14, desc: '2 Weeks' },
                  { label: '30 Days', val: 30, desc: '1 Month' },
                  { label: 'No Expiry', val: null, desc: 'Always Active' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setExpiresDays(opt.val)}
                    className={cn(
                      'py-2 px-2 rounded-xl border text-center transition-all cursor-pointer',
                      expiresDays === opt.val
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                        : 'bg-[hsl(var(--background))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border-strong))]'
                    )}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] opacity-75">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stop Link Banner if Link is Currently Active */}
            {lead.shareSettings?.isPublic !== false && shareToken && (
              <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <Ban size={13} className="text-rose-600" /> Need to disable this link?
                  </span>
                  <span className="text-[11px] text-rose-700/80 dark:text-rose-400 block mt-0.5">
                    Stopping the link immediately blocks clients from accessing or submitting preferences.
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={handleStopLink}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isRevoking ? 'Stopping...' : 'Stop Link'}
                </button>
              </div>
            )}

            {lead.shareSettings?.isPublic === false && (
              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span>This link is currently <strong>stopped / disabled</strong>. Sending an email will automatically reactivate it for the client.</span>
              </div>
            )}

            {/* Live Link Preview & Quick Actions */}
            <div className="bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-[hsl(var(--foreground))]">
                  <Link2 size={13} className="text-indigo-600" />
                  <span>Shareable Questionnaire Link</span>
                </span>
                {isLoadingToken && (
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> Generating...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[hsl(var(--background))] px-3 py-2 rounded-lg border border-[hsl(var(--border))] text-xs font-mono text-[hsl(var(--foreground))] truncate select-all">
                  {requirementsUrl || 'Preparing unique link...'}
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!requirementsUrl}
                  className="px-3 py-2 bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                  title="Copy Link to Clipboard"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>

                {requirementsUrl && (
                  <a
                    href={requirementsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg transition-all shrink-0 cursor-pointer shadow-2xs"
                    title="Preview Client Questionnaire in New Tab"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {/* What Client Does Feature Summary */}
              <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                <span className="flex items-center gap-1">
                  <Palette size={11} className="text-purple-500" /> Visual Theme Picker
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" /> Pinterest Inspiration
                </span>
                <span className="flex items-center gap-1">
                  <Check size={11} className="text-emerald-500" /> Auto-syncs to CRM
                </span>
              </div>
            </div>

            {/* Other Sharing Channels (WhatsApp & Mailto) */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                Alternative dispatch options:
              </span>

              <div className="flex items-center gap-2">
                {lead.mobileNumber && (
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    disabled={!requirementsUrl}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleMailtoFallback}
                  disabled={!requirementsUrl}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Mail size={12} /> Open in Email App (mailto)
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isLoadingToken}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Sending Email via SMTP...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Send Intake Link via Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
