'use client';

// =============================================================================
// Sky-Lite Web — Interior CRM BOQ Preview Component
// Renders Section-Based Hierarchical BOQ with Scope of Work Notes, Drawings,
// Item Technical Specs, Remarks, Section Subtotals & Dynamic Currency
// =============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Printer,
  Pencil,
  Lock,
  Layers,
  CheckCircle2,
  FileText,
  Tag,
  Calculator,
  AlertTriangle,
  Trash2,
  Send,
  ShieldCheck,
  XCircle,
  Clock,
  User,
  Paperclip,
  Eye,
  FileCode,
  ExternalLink,
  Download,
  ChevronDown,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, parseMaxBudget } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { exportBoqToExcel } from '@/lib/exportBoqExcel';
import { BoqDrawingViewerModal } from '@/components/crm/BoqDrawingViewerModal';

interface BoqPreviewProps {
  lead: any;
  boqIndex: number;
  onSuccess?: () => void;
  onEdit?: () => void;
  onDelete?: (boqIndex: number) => void;
  onSendForApproval?: (boqIndex: number) => void;
  onApprove?: (boqIndex: number) => void;
  onReject?: (boqIndex: number) => void;
}

const getCategoryBadgeClass = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('floor')) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  if (cat.includes('carpent') || cat.includes('wood') || cat.includes('furnit')) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  if (cat.includes('elect') || cat.includes('light')) return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
  if (cat.includes('plumb') || cat.includes('sanit')) return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20';
  if (cat.includes('paint') || cat.includes('wall')) return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
  if (cat.includes('ceil') || cat.includes('rcp')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
  if (cat.includes('civil') || cat.includes('mason') || cat.includes('demolit')) return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
  if (cat.includes('hardw') || cat.includes('glass') || cat.includes('metal')) return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
  return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20';
};

export function BoqPreview({
  lead,
  boqIndex,
  onEdit,
  onDelete,
  onSendForApproval,
  onApprove,
  onReject,
}: BoqPreviewProps) {
  const { currencySymbol } = useCurrency();
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; url: string; fileType?: string } | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  const toggleExpandItem = (itemId: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const boq = lead?.boqs?.[boqIndex];
  const hasAcceptedQuote = lead?.quotations && lead.quotations.some((q: any) => q.status === 'Accepted');
  const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead?.status || '') || Boolean(lead?.linkedProject);
  const isLocked = isQuotationApproved;

  const rawStatus = boq?.status || 'draft';
  const isApproved = rawStatus === 'approved';
  const isPendingApproval = rawStatus === 'pending_approval';
  const isRejected = rawStatus === 'rejected';
  const isDraft = rawStatus === 'draft';

  const maxBudget = parseMaxBudget(lead?.budgetRange || lead?.estimatedBudget || lead?.budget);
  const totalBoqAmount = boq?.totalAmount || 0;
  const isOverBudget = Boolean(maxBudget && maxBudget > 0 && totalBoqAmount > maxBudget);
  const excessAmount = isOverBudget ? totalBoqAmount - (maxBudget || 0) : 0;
  const excessPercentage = isOverBudget && maxBudget ? ((totalBoqAmount - maxBudget) / maxBudget) * 100 : 0;

  // Process Hierarchical Sections
  const structuredSections = React.useMemo(() => {
    if (!boq) return [];
    
    // If sections already exist on the boq object
    if (boq.sections && Array.isArray(boq.sections) && boq.sections.length > 0) {
      return boq.sections.map((sec: any, idx: number) => {
        const secItems = (boq.items || []).filter(
          (it: any) => it.sectionId === (sec.sectionId || sec.id) || it.sectionTitle === sec.sectionTitle || it.category === sec.sectionTitle
        );
        const secSubtotal = secItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);

        return {
          id: sec.sectionId || sec.id || `sec-${idx}`,
          sectionNumber: sec.sectionNumber || String(idx + 1),
          sectionTitle: sec.sectionTitle || `Section ${idx + 1}`,
          scopeDescription: sec.scopeDescription || sec.sectionScope || (secItems[0]?.sectionScope) || '',
          attachments: sec.attachments || [],
          items: secItems,
          subTotal: secSubtotal,
        };
      });
    }

    // Fallback migration: group by category if sections array not present
    if (boq.items && Array.isArray(boq.items) && boq.items.length > 0) {
      const categoryMap = new Map<string, any[]>();
      for (const it of boq.items) {
        const cat = it.category || 'Civil & General Works';
        const list = categoryMap.get(cat) || [];
        list.push(it);
        categoryMap.set(cat, list);
      }

      return Array.from(categoryMap.entries()).map(([cat, list], idx) => {
        const secSubtotal = list.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
        return {
          id: `sec-${idx}`,
          sectionNumber: String(idx + 1),
          sectionTitle: cat,
          scopeDescription: list[0]?.sectionScope || '',
          attachments: [],
          items: list,
          subTotal: secSubtotal,
        };
      });
    }

    return [];
  }, [boq]);

  const categorySubtotals = React.useMemo(() => {
    if (!boq?.items) return [];
    const map = new Map<string, { count: number; total: number }>();
    for (const it of boq.items) {
      const cat = it.category || 'General';
      const existing = map.get(cat) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(it.amount) || (Number(it.quantity) * Number(it.rate)) || 0;
      map.set(cat, existing);
    }
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [boq?.items]);

  const handlePrint = () => {
    window.print();
  };

  if (!boq) return null;

  return (
    <div className="space-y-4">
      {/* Approval Status Ribbon */}
      <div className={cn(
        "rounded-2xl p-3 sm:p-3.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
        isApproved
          ? "bg-emerald-500/[0.06] border-emerald-500/25"
          : isPendingApproval
          ? "bg-amber-500/[0.06] border-amber-500/30"
          : isRejected
          ? "bg-rose-500/[0.06] border-rose-500/30"
          : "bg-slate-500/[0.06] border-[hsl(var(--border))]"
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold border",
            isApproved
              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
              : isPendingApproval
              ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
              : isRejected
              ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
              : "bg-slate-500/15 text-slate-600 border-slate-500/30"
          )}>
            {isApproved ? <ShieldCheck size={16} /> : isPendingApproval ? <Clock size={16} /> : isRejected ? <XCircle size={16} /> : <FileText size={16} />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-900">
                {isApproved ? "Internal Approval: Approved" : isPendingApproval ? "Internal Approval: Pending Review" : isRejected ? "Internal Approval: Changes Requested" : "Internal Approval: Draft"}
              </span>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                isApproved
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : isPendingApproval
                  ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                  : isRejected
                  ? "bg-rose-50 text-rose-700 border-rose-300"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              )}>
                {isApproved ? "Approved" : isPendingApproval ? "Pending Review" : isRejected ? "Rejected" : "Draft"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isApproved
                ? `BOQ estimation approved${boq.approvedByName ? ` by ${boq.approvedByName}` : ''}. Ready for Quotations.`
                : isPendingApproval
                ? `Submitted to ${boq.assignedReviewerName || 'Manager'} for review.`
                : isRejected
                ? `Revisions required: "${boq.rejectionReason || 'Please review items'}"`
                : "This estimation is in draft mode and requires manager approval before quotation."}
            </p>
            {boq.submissionNotes && (
              <div className="mt-2 text-xs bg-white border border-amber-200 text-slate-800 px-3 py-1.5 rounded-xl flex items-start gap-2 max-w-xl shadow-xs">
                <span className="font-extrabold text-amber-800 shrink-0 text-[11px]">Review Focus / Note:</span>
                <span className="font-medium leading-relaxed break-words text-slate-900 italic text-[11px]">"{boq.submissionNotes}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Review Actions */}
        {!isLocked && (
          <div className="flex items-center gap-1.5 shrink-0">
            {(isDraft || isRejected) && onSendForApproval && (
              <button
                type="button"
                onClick={() => onSendForApproval(boqIndex)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <Send size={13} /> {isRejected ? "Resubmit for Approval" : "Send for Approval"}
              </button>
            )}

            {isPendingApproval && (
              <>
                {onApprove && (
                  <button
                    type="button"
                    onClick={() => onApprove(boqIndex)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 size={13} /> Approve
                  </button>
                )}
                {onReject && (
                  <button
                    type="button"
                    onClick={() => onReject(boqIndex)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Category Breakdown Chips */}
      {categorySubtotals.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x print:hidden">
          {categorySubtotals.map((cat) => (
            <div
              key={cat.name}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 shrink-0 bg-white shadow-2xs",
                getCategoryBadgeClass(cat.name)
              )}
            >
              <Tag size={12} />
              <span>{cat.name}</span>
              <span className="opacity-60 text-[10px]">({cat.count})</span>
              <span className="font-extrabold text-slate-900 font-mono">
                {currencySymbol} {cat.total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Section-Based BOQ Tables */}
      <div className="space-y-4">
        {structuredSections.map((section: any, secIdx: number) => (
          <div
            key={section.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs min-w-0 transition-all"
          >
            {/* Section Header Band */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-mono text-[11px] font-bold shrink-0">
                  Sec {section.sectionNumber || secIdx + 1}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {section.sectionTitle}
                </h3>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-semibold text-slate-500 mr-2">Section Subtotal:</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {currencySymbol} {section.subTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Section Body: Scope Overview Note & Attachments */}
            {(section.scopeDescription || (section.attachments && section.attachments.length > 0)) && (
              <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-200 space-y-2.5">
                {/* Section Scope of Work Note */}
                {section.scopeDescription && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200/90 rounded-xl space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900">
                      <FileText size={13} className="text-blue-600" />
                      <span>Section Scope of Work / Overview Note</span>
                    </div>
                    <p className="text-xs text-slate-900 font-normal leading-relaxed whitespace-pre-wrap">
                      {section.scopeDescription}
                    </p>
                  </div>
                )}

                {/* Attached Drawings & Images */}
                {section.attachments && section.attachments.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
                      <Paperclip size={12} className="text-blue-600" /> Attached Drawings:
                    </span>
                    {section.attachments.map((att: any, attIdx: number) => {
                      const isImg = att.url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) || (att.fileType && att.fileType.includes('image'));
                      const leadId = lead?._id || lead?.id || '';
                      const drawingIdentifier = att.drawingId || att._id || att.id || att.name || att.url;
                      const drawingViewerHref = leadId
                        ? `/interior-new/crm/leads/${leadId}/drawings/${encodeURIComponent(drawingIdentifier)}?from=boq`
                        : '#';

                      return (
                        <Link
                          key={attIdx}
                          href={drawingViewerHref}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs hover:border-blue-500 hover:text-blue-600 transition cursor-pointer group"
                          title="Click to open Drawing Studio Viewport Page"
                        >
                          {isImg ? (
                            <img src={att.url} alt={att.name} className="w-4 h-4 rounded object-cover border border-slate-100 shrink-0" />
                          ) : (
                            <FileCode size={13} className="text-blue-600 shrink-0" />
                          )}
                          <span className="font-semibold truncate max-w-[140px] text-[11px]">{att.name}</span>
                          <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-600" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Section Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3 w-12 text-center">Sr. No</th>
                    <th className="p-3 min-w-[220px]">Item Description & Technical Specifications</th>
                    <th className="p-3 text-center w-24">Unit</th>
                    <th className="p-3 text-center w-20">Quantity</th>
                    <th className="p-3 text-right w-28">Rate ({currencySymbol})</th>
                    <th className="p-3 text-right w-28">Amount ({currencySymbol})</th>
                    <th className="p-3 min-w-[150px]">Remarks / Disposal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {section.items.map((item: any, idx: number) => {
                    const itemId = item._id || item.id || `it-${secIdx}-${idx}`;
                    const isExpanded = Boolean(expandedItemIds[itemId]);

                    return (
                      <tr key={itemId} className="hover:bg-slate-50/80 transition-colors group align-top">
                        {/* Sr No / Code */}
                        <td className="p-3 text-center font-mono font-bold text-slate-500">
                          {item.itemCode || item.serialNumber || idx + 1}
                        </td>

                        {/* Description & Technical Specs */}
                        <td
                          onClick={() => toggleExpandItem(itemId)}
                          className="p-3 min-w-[220px] max-w-[440px] space-y-1 cursor-pointer select-text transition-all duration-300"
                          title="Click or hover to expand/collapse full specification"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors break-words [overflow-wrap:anywhere]">
                              {item.itemName}
                            </div>
                            {item.description && (
                              <ChevronDown
                                size={13}
                                className={cn(
                                  "text-slate-400 shrink-0 mt-0.5 transition-transform duration-300 ease-in-out",
                                  isExpanded ? "rotate-180 text-blue-600" : "group-hover:rotate-180 group-hover:text-blue-500"
                                )}
                              />
                            )}
                          </div>
                          {item.description && (
                            <div
                              className={cn(
                                "text-[11px] text-slate-600 leading-relaxed break-words [overflow-wrap:anywhere] transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden",
                                isExpanded
                                  ? "max-h-[600px] opacity-100"
                                  : "max-h-[1.35rem] group-hover:max-h-[600px] opacity-80 group-hover:opacity-100"
                              )}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          )}
                        </td>

                      {/* Unit */}
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                          {item.unit || 'Nos'}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="p-3 text-center font-mono font-bold text-xs text-slate-900">
                        {Number(item.quantity || 0).toLocaleString()}
                      </td>

                      {/* Rate */}
                      <td className="p-3 text-right font-mono font-bold text-xs text-slate-700">
                        {currencySymbol} {Number(item.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>

                      {/* Amount */}
                      <td className="p-3 text-right font-mono font-black text-xs text-slate-900">
                        {currencySymbol} {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>

                      {/* Remarks */}
                      <td className="p-3 text-[11px] text-slate-600 italic break-words [overflow-wrap:anywhere]">
                        {item.remarks || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>

            {/* Section Subtotal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Sub Total of {section.sectionTitle}:
              </span>
              <span className="text-xs font-black font-mono text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                {currencySymbol} {section.subTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Over Target Budget Warning (if exceeded) */}
      {isOverBudget && (
        <div className="p-3 sm:p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-rose-900 font-medium min-w-0 shadow-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertTriangle size={16} className="shrink-0 text-rose-600" />
            <span className="break-words [overflow-wrap:anywhere]">
              <strong>Over Target Budget Warning:</strong> Current BOQ total of {currencySymbol} {totalBoqAmount.toLocaleString()} exceeds estimated target budget of {currencySymbol} {maxBudget?.toLocaleString()} ({lead?.budgetRange || 'Estimate'}) by <strong className="font-extrabold text-rose-700">{currencySymbol} {excessAmount.toLocaleString()}</strong>.
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
            +{excessPercentage.toFixed(1)}% Over Budget
          </span>
        </div>
      )}

      {/* Estimator Remarks / Handover Notes (only if present) */}
      {(boq.notes?.trim() || boq.submissionNotes?.trim()) && (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
          {boq.notes?.trim() && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText size={12} className="text-blue-600" />
                Estimator Remarks & Assumptions
              </p>
              <p className="text-xs text-slate-900 font-medium whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                {boq.notes.trim()}
              </p>
            </div>
          )}
          {boq.submissionNotes?.trim() && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs shadow-2xs">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                Review Focus / Handover Note
              </p>
              <p className="text-slate-900 font-semibold italic mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                "{boq.submissionNotes.trim()}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Architectural Drawing Studio Lightbox Modal */}
      <BoqDrawingViewerModal
        isOpen={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        attachment={previewAttachment}
        leadName={lead?.name || lead?.customerName}
      />
    </div>
  );
}
