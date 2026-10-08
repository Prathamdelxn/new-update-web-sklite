'use client';

// =============================================================================
// Sky-Lite Web — Interior Project Quotations View
// Mirrors the executive Quotation Phase section from CRM Lead Details:
// - Header Summary Card with Proposal Status badge and Quick Actions
// - 4-Column KPI Metrics Ribbon (Grand Total, Breakdown, Status, Budget)
// - Quotation Versions Table with Scope / Line-Items, Subtotals, Taxes & Status
// - Rich Document Preview Modal (A4 Print / PDF / Line-Item Breakdown)
// - Quotation Builder Modal for creating and revising project proposals
// =============================================================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  Building2,
  ArrowRight,
  User,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import interiorApiClient from '@/services/interiorApi.client';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { useCurrency } from '@/hooks/useCurrency';
import { InteriorQuotationBuilderModal } from '@/features/interior-new/components/crm/modals/InteriorQuotationBuilderModal';
import { InteriorQuotationPreviewModal } from '@/features/interior-new/components/crm/modals/InteriorQuotationPreviewModal';

function InteriorProjectQuotationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse font-sans">
      {/* Header Summary Skeleton */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-48 bg-slate-200/90 rounded-md" />
                <div className="h-4.5 w-24 bg-slate-100 rounded-full" />
              </div>
              <div className="h-3.5 w-72 max-w-full bg-slate-200/60 rounded-md" />
            </div>
          </div>
          <div className="h-9 w-32 bg-slate-200/80 rounded-xl shrink-0" />
        </div>

        {/* 4 Metric Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-1.5">
              <div className="h-3 w-20 bg-slate-200/60 rounded" />
              <div className="h-5 w-28 bg-slate-200/90 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-200/80 rounded" />
          <div className="h-3 w-48 bg-slate-200/50 rounded hidden sm:block" />
        </div>
        <div className="divide-y divide-slate-100 p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="space-y-1">
                  <div className="h-4 w-36 bg-slate-200/90 rounded" />
                  <div className="h-3 w-24 bg-slate-200/60 rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-slate-200/80 rounded" />
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
              <div className="h-7 w-24 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InteriorProjectQuotationView() {
  const params = useParams();
  const projectId = (params?.projectId || params?.id) as string;
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { currencySymbol, formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);

  // Modal States
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [editingQuotationIndex, setEditingQuotationIndex] = useState<number | null>(null);
  const [activeQuotationIndex, setActiveQuotationIndex] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);

      // 1. Fetch Project Details
      let projectData: any = null;
      try {
        const prjRes = await interiorApiClient.get(`/projects/${projectId}`);
        projectData = prjRes?.data?.data || prjRes?.data || null;
        setProject(projectData);
      } catch (e) {
        console.warn('Could not fetch project details', e);
      }

      // 2. Fetch CRM Customers / Leads to find the linked customer
      const custRes = await interiorApiClient.get('/crm/customers');
      const customers = custRes?.data?.data || custRes?.data || [];

      const matchedCustomer = customers.find((c: any) => {
        if (!c.linkedProject) return false;
        const linkedId =
          typeof c.linkedProject === 'object' && c.linkedProject !== null && c.linkedProject._id
            ? String(c.linkedProject._id)
            : String(c.linkedProject);
        return linkedId === String(projectId);
      });

      if (matchedCustomer) {
        setLead(matchedCustomer);
      } else {
        // Fallback: build a synthetic lead representation from project data
        setLead({
          _id: projectData?.id || projectData?._id || projectId,
          name: projectData?.client || projectData?.name || 'Project Client',
          email: projectData?.email || '',
          phone: projectData?.phone || '',
          projectLocation: projectData?.city || projectData?.address || '',
          budgetRange: projectData?.budget?.amount
            ? `${currencySymbol} ${Number(projectData.budget.amount).toLocaleString()}`
            : '',
          quotations: projectData?.quotations || [],
          boqs: projectData?.boqs || [],
          linkedProject: projectId,
        });
      }
    } catch (err) {
      console.error('Failed to load project quotations:', err);
      toast.error('Failed to load quotations data');
    } finally {
      setLoading(false);
    }
  }, [projectId, currencySymbol, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const quotations = useMemo(() => {
    return (lead?.quotations as any[]) || [];
  }, [lead]);

  const hasQuotations = quotations.length > 0;
  const latestQuote = hasQuotations ? quotations[quotations.length - 1] : null;
  const isLatestQuoteRejected = Boolean(latestQuote && latestQuote.status === 'Rejected');
  const hasAcceptedQuote = Boolean(
    quotations.some((q: any) => q.status === 'Accepted' || q.status === 'Approved')
  );

  const quotationInfo = useMemo(() => {
    const currentQuote = (activeQuotationIndex !== null ? quotations[activeQuotationIndex] : null) || latestQuote;
    const grandTotal = currentQuote?.grandTotal || currentQuote?.amount || 0;
    const subtotal = currentQuote?.subtotal || currentQuote?.subTotal || 0;
    const taxPercentage = currentQuote?.taxPercentage || currentQuote?.tax || 0;
    const itemsCount = currentQuote?.items?.length || 0;

    return {
      currentQuote,
      grandTotal,
      subtotal,
      taxPercentage,
      itemsCount,
    };
  }, [quotations, activeQuotationIndex, latestQuote]);

  const handleDeleteQuotationByIndex = async (idxToDelete: number) => {
    const q = quotations[idxToDelete];
    const quoteTitle = q?.title || `Quotation ${idxToDelete + 1}`;

    const confirmed = await confirm({
      title: 'Delete Quotation',
      message: `Are you sure you want to delete "${quoteTitle}" (v${q?.version || idxToDelete + 1})? This action cannot be undone.`,
      confirmText: 'Delete Quotation',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const updatedQuotations = quotations.filter((_: any, i: number) => i !== idxToDelete);

      if (lead?._id && !String(lead._id).startsWith('proj-')) {
        await interiorCrmService.updateCustomer(lead._id, {
          quotations: updatedQuotations,
        });
      }

      setLead((prev: any) => ({
        ...prev,
        quotations: updatedQuotations,
      }));

      toast.success(`Quotation "${quoteTitle}" deleted successfully.`);
      setActiveQuotationIndex(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to delete quotation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Sent':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Generated':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Draft':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return <InteriorProjectQuotationSkeleton />;
  }

  return (
    <div className="w-full space-y-4 font-sans">
      {/* ── 1. Header Summary Card ── */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-[hsl(var(--foreground))]">
                  Commercial Quotations & Proposals
                </h2>
                <span
                  className={cn(
                    'text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5',
                    hasQuotations
                      ? isLatestQuoteRejected
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        : hasAcceptedQuote
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      hasQuotations
                        ? isLatestQuoteRejected
                          ? 'bg-rose-500'
                          : hasAcceptedQuote
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                        : 'bg-amber-500'
                    )}
                  />
                  {hasQuotations
                    ? `${quotations.length} ${quotations.length === 1 ? 'Proposal' : 'Proposals'} Generated`
                    : 'Pending Creation'}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Generate commercial proposals, apply taxes, discounts and manage client approvals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setEditingQuotationIndex(null);
                setIsQuotationModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <Plus size={14} /> Create Quotation
            </button>
          </div>
        </div>

        {/* ── 2. Summary KPI Metrics Ribbon ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Grand Total
            </p>
            <p className="font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400 mt-1">
              {hasQuotations ? `${currencySymbol} ${quotationInfo.grandTotal.toLocaleString()}` : '—'}
            </p>
          </div>

          <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Breakdown
            </p>
            <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1 truncate">
              {hasQuotations
                ? `${quotationInfo.taxPercentage}% Tax • ${quotationInfo.itemsCount} Items`
                : 'No items'}
            </p>
          </div>

          <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Latest Status
            </p>
            <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1">
              {quotationInfo.currentQuote?.status || (hasQuotations ? 'Generated' : 'Pending')}
            </p>
          </div>

          <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Target Budget
            </p>
            <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1">
              {project?.budget?.amount
                ? formatCurrency(project.budget.amount)
                : lead?.budgetRange || 'Not specified'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Quotation Content Table / Empty State ── */}
      {!hasQuotations ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center space-y-3.5 shadow-2xs">
          <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600">
            <FileText size={26} />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
              No Quotations Created Yet
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] text-xs">
              Generate itemized pricing proposals directly from project BOQ estimation, apply custom discounts and taxes.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingQuotationIndex(null);
              setIsQuotationModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus size={15} /> Create First Quotation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table Card */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <span>Quotation Versions & Options</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    {quotations.length}
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] hidden sm:block">
                Click &quot;View&quot; to inspect document preview, print, or download PDF
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Quotation Title</th>
                    <th className="py-3 px-4">Scope / Items</th>
                    <th className="py-3 px-4">Subtotal & Tax</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {quotations.map((q: any, idx: number) => {
                    const quoteTitle = q.title || `Quotation ${idx + 1}`;
                    const itemCount = q.items?.length || 0;
                    const status = q.status || 'Generated';

                    return (
                      <tr
                        key={idx}
                        onClick={() => setActiveQuotationIndex(idx)}
                        className="group cursor-pointer transition-all hover:bg-[hsl(var(--muted)/0.4)]"
                      >
                        {/* Index */}
                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md font-semibold text-xs bg-slate-100 dark:bg-[hsl(var(--muted))] text-slate-600 dark:text-[hsl(var(--muted-foreground))]">
                            {idx + 1}
                          </span>
                        </td>

                        {/* Quotation Title */}
                        <td className="py-3.5 px-4 font-bold text-[hsl(var(--foreground))]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:border-blue-500/20">
                              <FileText size={14} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[hsl(var(--foreground))] block">
                                {quoteTitle}
                              </span>
                              <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">
                                Version {q.version || idx + 1}
                                {q.sourceBoqVersion && ` • BOQ v${q.sourceBoqVersion}`}
                                {Array.isArray(q.vendorQuotes) && q.vendorQuotes.length > 0 && (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1.5">
                                    • {q.vendorQuotes.length} Vendor{' '}
                                    {q.vendorQuotes.length === 1 ? 'Quote' : 'Quotes'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Items / Scope */}
                        <td className="py-3.5 px-4 text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700 dark:text-[hsl(var(--foreground))] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[hsl(var(--muted))] border border-slate-200/80 dark:border-[hsl(var(--border))]">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </td>

                        {/* Subtotal & Tax */}
                        <td className="py-3.5 px-4 text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                          <div className="font-medium text-[hsl(var(--foreground))]">
                            {currencySymbol} {(q.subtotal || q.subTotal || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            Tax: {q.taxPercentage || 0}%
                            {Number(q.discountAmount || 0) > 0 && (
                              <span className="ml-1 text-emerald-600 font-semibold">
                                • Disc: {currencySymbol} {Number(q.discountAmount).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Grand Total */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            {currencySymbol} {(q.grandTotal || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider inline-flex items-center gap-1',
                              getStatusBadge(status)
                            )}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                            {status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div
                            className="inline-flex items-center gap-1.5 justify-end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setActiveQuotationIndex(idx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-500 dark:bg-[hsl(var(--card))] dark:text-blue-400"
                              title="View Quotation Modal"
                            >
                              <Eye size={13} /> View
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuotationIndex(idx);
                                setIsQuotationModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-xs dark:bg-[hsl(var(--card))] dark:border-[hsl(var(--border))] dark:text-[hsl(var(--foreground))]"
                              title="Edit Quotation"
                            >
                              <Pencil size={12} /> Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuotationByIndex(idx)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shadow-xs dark:bg-[hsl(var(--card))] dark:border-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]"
                              title="Delete Quotation"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Quotation Preview Document Modal ── */}
      {lead && (
        <InteriorQuotationPreviewModal
          isOpen={activeQuotationIndex !== null}
          onClose={() => setActiveQuotationIndex(null)}
          lead={lead}
          quotationIndex={activeQuotationIndex}
          onSuccess={loadData}
        />
      )}

      {/* ── 5. Quotation Builder / Editor Modal ── */}
      {lead && (
        <InteriorQuotationBuilderModal
          isOpen={isQuotationModalOpen}
          onClose={() => {
            setIsQuotationModalOpen(false);
            setEditingQuotationIndex(null);
          }}
          customerId={lead._id || projectId}
          customerEmail={lead.email}
          existingQuotations={quotations}
          existingBoqs={lead.boqs || project?.boqs || []}
          editingQuotationIndex={editingQuotationIndex}
          lead={lead}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
