'use client';

import React, { useState } from 'react';
import {
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  Rocket,
  Mail,
  AlertTriangle,
  Trash2,
  Plus,
  Tag,
  X,
  User,
  Phone,
  Calendar,
  Building2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { cn, parseMaxBudget, formatInternational, formatMillionBillion, formatSmartCurrency } from '@/lib/utils';
import { useConfirm } from '@/providers/ConfirmContext';

interface QuotationPreviewProps {
  lead: any;
  quotationIndex: number;
  onSuccess: () => void;
  onAddVersion?: () => void;
  onClosePreview?: () => void;
  hideToolbar?: boolean;
}

export function QuotationPreview({
  lead,
  quotationIndex,
  onSuccess,
  onAddVersion,
  onClosePreview,
  hideToolbar = false,
}: QuotationPreviewProps) {
  const toast = useToast();
  const { currencySymbol } = useCurrency();
  const { confirm, prompt } = useConfirm();
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const quote = lead?.quotations ? lead.quotations[quotationIndex] : null;

  const maxBudget = parseMaxBudget(lead?.budgetRange || lead?.estimatedBudget || lead?.budget);
  const grandTotal = Number(quote?.grandTotal) || 0;
  const isOverBudget = Boolean(maxBudget && maxBudget > 0 && grandTotal > maxBudget);
  const excessAmount = isOverBudget ? grandTotal - (maxBudget || 0) : 0;

  const handleSendEmail = async () => {
    let emailToUse = lead?.email;
    if (!emailToUse) {
      const custom = await prompt({
        title: 'Recipient Email Required',
        message: 'No email address saved for this lead. Please enter target email address:',
        placeholder: 'client@example.com',
      });
      if (!custom) return;
      emailToUse = custom.trim();
    }

    setIsSendingEmail(true);
    try {
      await interiorCrmService.sendQuotationEmail(lead._id, {
        quotation: quote,
        recipientEmail: emailToUse,
      });
      toast.success(`Quotation emailed to ${emailToUse}!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      const updatedQuotations = [...lead.quotations];
      updatedQuotations[quotationIndex] = { ...quote, status };

      let nextLeadStatus = lead.status;
      if (status === 'Accepted') {
        nextLeadStatus = 'Booking Pending';
      } else if (status === 'Rejected') {
        nextLeadStatus = 'Under Quotation';
      }

      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
        status: nextLeadStatus,
      });

      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Quotation v${quote.version} (${quote.title || 'Option ' + quote.version}) was marked as ${status}`,
      });

      toast.success(`Quotation marked as ${status}.`);
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to update quotation status');
    }
  };

  const handleConvertToProject = async () => {
    const ok = await confirm({
      title: 'Convert Lead to Project',
      message: 'Are you sure you want to convert this Lead into an active Project? This will hand it over to the Execution team.',
      confirmText: 'Convert',
      type: 'warning',
    });
    if (!ok) return;

    setIsConverting(true);
    try {
      await interiorCrmService.convertCustomer(lead._id, { quotationIndex });
      toast.success('🎉 Successfully converted to Project!');
      router.push('/interior-new/crm');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to convert to project');
      setIsConverting(false);
    }
  };

  const handleDeleteQuotation = async () => {
    const rawTitle = quote?.title || `Quotation Option ${quote?.version || quotationIndex + 1}`;
    const displayTitle = rawTitle.length > 50 ? `${rawTitle.slice(0, 50)}...` : rawTitle;
    const ok = await confirm({
      title: 'Delete Quotation',
      message: `Are you sure you want to delete "${displayTitle}" (${currencySymbol} ${formatMillionBillion(grandTotal)})? This action cannot be undone.`,
      confirmText: 'Delete Quotation',
      type: 'danger',
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      const updatedQuotations = (lead.quotations || [])
        .filter((_: any, idx: number) => idx !== quotationIndex)
        .map((q: any, i: number) => ({ ...q, version: i + 1 }));

      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
      });

      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Deleted Quotation Option ${quote?.version || quotationIndex + 1}`,
      });

      toast.success(`Quotation Option ${quote?.version || quotationIndex + 1} deleted successfully!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete quotation');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isConverted = lead?.status === 'Won' || lead?.status === 'Converted' || lead?.status === 'Lost' || Boolean(lead?.linkedProject);

  if (!quote) return null;

  const quoteDate = quote?.createdAt
    ? new Date(quote.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const qtnNumber =
    quote?.quotationNumber ||
    quote?.quoteNumber ||
    (lead?.leadNumber
      ? `QTN-${lead.leadNumber.replace(/^LD-/, '')}-${quote?.version || quotationIndex + 1}`
      : `QTN-${String(quotationIndex + 1).padStart(3, '0')}`);

  const rawTitle = quote?.title?.trim();
  const hasCustomTitle = Boolean(rawTitle && rawTitle.toLowerCase() !== 'commercial quotation');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Toolbar Actions (Hidden on print or if hideToolbar is true) ── */}
      {!hideToolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[hsl(var(--card))] p-3.5 sm:p-4 rounded-2xl border border-[hsl(var(--border))] shadow-xs print:hidden">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-extrabold text-[hsl(var(--foreground))] text-sm sm:text-base truncate max-w-xs sm:max-w-md">
                {quote.title || `Quotation #${quotationIndex + 1}`}
              </h3>
            </div>
            <span
              className={cn(
                'text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider',
                quote.status === 'Accepted'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : quote.status === 'Rejected'
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              )}
            >
              {quote.status || 'Draft'}
            </span>
            {isOverBudget && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30 flex items-center gap-1"
                title={`${currencySymbol} ${formatInternational(excessAmount, 2, 2)}`}
              >
                <AlertTriangle size={11} /> Over Budget by {currencySymbol} {formatMillionBillion(excessAmount)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
            {!isConverted && quote.status === 'Sent' && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('Accepted')}
                  className="text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 size={15} /> Mark Accepted
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusUpdate('Rejected')}
                  className="text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
                >
                  <XCircle size={15} /> Mark Rejected
                </button>
                <div className="hidden sm:block w-px h-6 bg-[hsl(var(--border))] mx-1" />
              </>
            )}

            {!isConverted && quote.status === 'Accepted' && (
              <>
                <button
                  type="button"
                  onClick={handleConvertToProject}
                  disabled={isConverting}
                  className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-sm cursor-pointer"
                >
                  <Rocket size={15} />
                  {isConverting ? 'Converting...' : '🎉 Convert to Project'}
                </button>
                <div className="hidden sm:block w-px h-6 bg-[hsl(var(--border))] mx-1" />
              </>
            )}

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="text-xs font-bold bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 hover:border-blue-300 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-xs cursor-pointer"
              title="Email Quotation to client"
            >
              <Mail size={15} /> {isSendingEmail ? 'Sending...' : 'Send Email'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
            >
              <Printer size={15} /> Print / PDF
            </button>

            {!isConverted && (
              <button
                type="button"
                onClick={handleDeleteQuotation}
                disabled={isDeleting}
                className="text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
                title="Delete this quotation"
              >
                <Trash2 size={15} /> {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}

            {onClosePreview && (
              <>
                <div className="hidden sm:block w-px h-6 bg-[hsl(var(--border))] mx-1" />
                <button
                  type="button"
                  onClick={onClosePreview}
                  className="text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
                  title="Close Preview"
                >
                  <X size={15} /> Close Preview
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── A4 Printable Document Container ── */}
      <div className="overflow-x-auto w-full py-2">
        <div
          className="bg-white border border-slate-200/90 mx-auto rounded-3xl shadow-xl relative overflow-hidden print:border-none print:shadow-none print:m-0 w-full max-w-[210mm] min-h-[297mm] print:min-h-0 text-slate-900"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Top Gradient Stripe Accent */}
          <div className="h-2 w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-800 shrink-0" />

          {/* Document Body */}
          <div className="p-6 sm:p-10 md:p-12 flex flex-col h-full space-y-6 sm:space-y-8">
            {/* 1. Header: Document Identity & Company Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200/80 pb-6 sm:pb-8">
              {/* Left: Document Title & Project Scope */}
              <div className="min-w-0 max-w-full sm:max-w-[58%] space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                    <Sparkles size={11} className="text-indigo-600" /> Commercial Quotation
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {qtnNumber}
                  </span>
                </div>

                {hasCustomTitle ? (
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words [overflow-wrap:anywhere] break-all leading-snug">
                      {rawTitle}
                    </h1>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Quotation Option #{quotationIndex + 1} • Version {quote.version || quotationIndex + 1}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                      Commercial Estimate & Scope
                    </h1>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Quotation Option #{quotationIndex + 1} • Version {quote.version || quotationIndex + 1}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Company Branding & Contact */}
              <div className="sm:text-right flex flex-col sm:items-end justify-between shrink-0 space-y-1.5">
                <div className="flex items-center gap-2.5 sm:justify-end">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-900 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                    SI
                  </div>
                  <div className="sm:text-right">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                      SKY INTERIOR
                    </h2>
                    <span className="text-[10px] font-bold text-indigo-600 tracking-wide uppercase">
                      Architecture & Design
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-0.5 sm:text-right leading-relaxed">
                  <p>123 Design Avenue, Tech Park</p>
                  <p>contact@skyinterior.com</p>
                  <p>+1 (555) 234-5678</p>
                </div>
              </div>
            </div>

            {/* 2. Metadata Cards: Client (Bill To) & Quotation Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              {/* Client Info Card */}
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <User size={13} className="text-indigo-600" /> Prepared For
                </div>
                <p className="text-base font-extrabold text-slate-900 break-words [overflow-wrap:anywhere] break-all leading-tight">
                  {lead.name || 'Valued Client'}
                </p>
                <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                  {lead.mobileNumber && (
                    <p className="flex items-center gap-2 break-words [overflow-wrap:anywhere] break-all">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{lead.mobileNumber}</span>
                    </p>
                  )}
                  {lead.email && (
                    <p className="flex items-center gap-2 break-words [overflow-wrap:anywhere] break-all">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span>{lead.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Quotation Details Card */}
              <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <Calendar size={13} className="text-indigo-600" /> Quotation Details
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Issue Date</span>
                    <span className="font-bold text-slate-800">{quoteDate}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Lead Reference</span>
                    <span className="font-bold text-slate-800 font-mono">{lead.leadNumber || 'LD-XXXX'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Quote Reference</span>
                    <span className="font-bold text-indigo-700 font-mono text-[11px]">{qtnNumber}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Status</span>
                    <span
                      className={cn(
                        'inline-block text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider mt-0.5',
                        quote.status === 'Accepted'
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : quote.status === 'Rejected'
                          ? 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                      )}
                    >
                      {quote.status || 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Items Table: Fixed Layout, Strict Word Wrapping */}
            <div className="flex-1 print:flex-none overflow-x-auto min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col className="w-[8%] sm:w-[6%]" />
                  <col className="w-[46%] sm:w-[48%]" />
                  <col className="w-[14%] sm:w-[14%]" />
                  <col className="w-[16%] sm:w-[16%]" />
                  <col className="w-[16%] sm:w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center">#</th>
                    <th className="py-3 px-3 text-left">Description</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Unit Rate ({currencySymbol})</th>
                    <th className="py-3 px-3 text-right">Total ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {quote.items && quote.items.length > 0 ? (
                    quote.items.map((item: any, idx: number) => {
                      const rawDesc = typeof item.description === 'string' ? item.description : String(item.description || 'Item');
                      const descLines = rawDesc.split('\n').filter(Boolean);
                      const itemTitle = descLines[0] || 'Item';
                      const itemNotes = descLines.slice(1).join('\n');
                      const unitStr = item.unit ? String(item.unit).trim() : '';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors print:break-inside-avoid">
                          {/* Row Number */}
                          <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-xs align-top">
                            {String(idx + 1).padStart(2, '0')}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-3 align-top min-w-0 overflow-hidden">
                            <div className="font-semibold text-slate-800 break-words [overflow-wrap:anywhere] break-all leading-snug">
                              {itemTitle}
                            </div>
                            {itemNotes && (
                              <div className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] break-all leading-relaxed">
                                {itemNotes}
                              </div>
                            )}
                            {item.category && item.category !== 'General Scope' && (
                              <div className="mt-1.5 max-w-full">
                                <span
                                  className="inline-block max-w-[140px] truncate text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 align-middle"
                                  title={item.category}
                                >
                                  {item.category}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Quantity & Unit */}
                          <td className="py-3.5 px-3 text-center align-top min-w-0 overflow-hidden">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm tabular-nums">
                              {item.quantity}
                            </div>
                            {unitStr && (
                              <div
                                className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate max-w-[80px] mx-auto mt-0.5"
                                title={unitStr}
                              >
                                {unitStr.length > 8 ? `${unitStr.slice(0, 8)}…` : unitStr}
                              </div>
                            )}
                          </td>

                          {/* Unit Rate */}
                          <td className="py-3.5 px-3 text-right text-slate-700 tabular-nums align-top min-w-0 overflow-hidden">
                            {(() => {
                              const smartRate = formatSmartCurrency(Number(item.unitPrice || 0), currencySymbol, { threshold: 1_000_000 });
                              return (
                                <span className="font-medium truncate block" title={smartRate.exact}>
                                  {smartRate.display}
                                </span>
                              );
                            })()}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3.5 px-3 text-right font-bold text-slate-900 tabular-nums align-top min-w-0 overflow-hidden">
                            {(() => {
                              const smartTotal = formatSmartCurrency(Number(item.total || 0), currencySymbol, { threshold: 1_000_000 });
                              return (
                                <span className="truncate block" title={smartTotal.exact}>
                                  {smartTotal.display}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        No line items listed in this quotation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Financial Summary */}
            <div className="flex justify-end mt-auto pt-6 border-t border-slate-200 print:break-inside-avoid">
              {/* Right: Modern Structured Totals Card */}
              <div className="w-full sm:w-80 rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 sm:p-5 space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Subtotal ({quote.items?.length || 0} items)</span>
                  <span
                    className="font-semibold text-slate-900 tabular-nums"
                    title={`${currencySymbol} ${formatInternational(Number(quote.subtotal || 0), 2, 2)}`}
                  >
                    {currencySymbol} {formatMillionBillion(Number(quote.subtotal || 0))}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Tax ({quote.taxPercentage || 0}%)</span>
                  <span
                    className="font-semibold text-slate-900 tabular-nums"
                    title={`${currencySymbol} ${formatInternational(Number(quote.tax || 0), 2, 2)}`}
                  >
                    {currencySymbol} {formatMillionBillion(Number(quote.tax || 0))}
                  </span>
                </div>

                {Number(quote.discount || 0) > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-600">
                    <span className="flex items-center gap-1 font-medium">
                      <Tag size={12} /> Discount Applied
                    </span>
                    <span
                      className="font-bold tabular-nums"
                      title={`- ${currencySymbol} ${formatInternational(Number(quote.discount), 2, 2)}`}
                    >
                      - {currencySymbol} {formatMillionBillion(Number(quote.discount))}
                    </span>
                  </div>
                )}

                {/* Highlighted Grand Total Banner */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-3 sm:p-3.5 flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                        Grand Total
                      </span>
                      <span className="text-xs text-slate-300 font-medium">Net Payable</span>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-base sm:text-xl font-black text-white tabular-nums tracking-tight block"
                        title={`${currencySymbol} ${formatInternational(Number(quote.grandTotal || 0), 2, 2)}`}
                      >
                        {currencySymbol} {formatMillionBillion(Number(quote.grandTotal || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Notes & Remarks (If present) */}
            {Boolean(quote.notes?.trim()) && (
              <div className="pt-2 print:break-inside-avoid min-w-0">
                <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 p-4 sm:p-5">
                  <p className="text-xs font-bold text-amber-950 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-amber-600" /> Notes & Remarks
                  </p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] break-all">
                    {quote.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}