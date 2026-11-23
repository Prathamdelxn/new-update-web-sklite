'use client';
import { tr } from '@/i18n';
import { useDeepLinkParams } from '@/features/interior-new/hooks/useDeepLinkParams';

// Port of interior-os-frontend's projects/[projectId]/variation-orders/page.tsx.
// getVoDashboardMetrics is not available in interiorProject.service.ts, so
// metrics are computed client-side from the variation-orders list instead.

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  TrendingUp,
  Activity,
  Calendar,
  Loader2,
  Building,
  Hammer,
  User,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';

interface InteriorVariationOrdersViewProps {
  projectId: string;
}

export default function InteriorVariationOrdersView({ projectId }: InteriorVariationOrdersViewProps) {
  const toast = useToast();
  const { can: canDo } = useProjectPermissions(projectId);
  const { currencySymbol, formatExactCurrency } = useCurrency();

  const [variationOrders, setVariationOrders] = useState<any[]>([]);
  const [selectedVo, setSelectedVo] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({
    totalVariationOrders: 0,
    approvedVariations: 0,
    pendingVariations: 0,
    additionalRevenueGenerated: 0,
    timelineImpact: 0,
  });

  const [loading, setLoading] = useState(true);
  // Opened from "What needs doing" (?vo=<id>): select that variation order
  useDeepLinkParams(['vo'], !loading && variationOrders.length > 0, ({ vo }) => {
    const match = variationOrders.find((v: any) => String(v._id) === vo);
    if (match) setSelectedVo(match);
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState({
    type: 'addition',
    category: 'Carpentry',
    description: '',
    materialCost: 0,
    laborCost: 0,
    vendorCost: 0,
    overheadCost: 0,
    timelineImpactDays: 0,
  });

  const [projectBudget, setProjectBudget] = useState(500000);

  const computeMetrics = (list: any[]) => {
    const approved = list.filter((v: any) => v.status === 'approved' || v.status === 'executed');
    const pending = list.filter((v: any) =>
      ['submitted', 'pm_review', 'commercial_review', 'management_approval', 'client_approval'].includes(v.status)
    );
    const revenue = approved.reduce((sum: number, v: any) => sum + (v.financialSummary?.netDifference || 0), 0);
    const days = approved.reduce((sum: number, v: any) => sum + (v.impactAnalysis?.timelineImpactDays || 0), 0);
    return {
      totalVariationOrders: list.length,
      approvedVariations: approved.length,
      pendingVariations: pending.length,
      additionalRevenueGenerated: revenue,
      timelineImpact: days,
    };
  };

  const fetchVoData = async () => {
    try {
      setLoading(true);
      // The budget comes from Project Config — optional, so users with only
      // Variation Orders access still get their list
      const [projResult, voResult] = await Promise.allSettled([
        interiorProjectService.getProjectDetails(projectId),
        interiorProjectService.getVariationOrders(projectId),
      ]);
      const projRes = projResult.status === 'fulfilled' ? projResult.value : null;
      if (projRes && projRes.success && projRes.data) {
        setProjectBudget(projRes.data.budget?.amount || 500000);
      }
      if (voResult.status === 'rejected') throw voResult.reason;

      const res = voResult.value;
      let list: any[] = [];
      if (res && res.success && res.data) {
        list = res.data;
        setVariationOrders(list);
      }

      setMetrics(computeMetrics(list));

      if (list.length > 0) {
        setSelectedVo(list[0]);
      } else {
        setSelectedVo(null);
      }
    } catch (error) {
      console.warn('Failed to load variation orders', error);
      toast.error(tr("Failed to load variation orders"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchVoData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreateVo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const totalDiff = formData.materialCost + formData.laborCost + formData.vendorCost + formData.overheadCost;
      const payload = {
        type: formData.type,
        category: formData.category,
        description: formData.description,
        impactAnalysis: {
          materialCost: Number(formData.materialCost),
          laborCost: Number(formData.laborCost),
          vendorCost: Number(formData.vendorCost),
          overheadCost: Number(formData.overheadCost),
          timelineImpactDays: Number(formData.timelineImpactDays),
        },
        financialSummary: {
          originalCost: projectBudget,
          variationCost: totalDiff,
          netDifference: totalDiff,
          revisedProjectCost: projectBudget + totalDiff,
        },
      };

      const res = await interiorProjectService.createVariationOrder(projectId, payload);
      if (res && res.success) {
        toast.success(tr("Variation Order created successfully"));
        await fetchVoData();
        setShowCreateModal(false);
        setFormData({
          type: 'addition',
          category: 'Carpentry',
          description: '',
          materialCost: 0,
          laborCost: 0,
          vendorCost: 0,
          overheadCost: 0,
          timelineImpactDays: 0,
        });
      }
    } catch (err) {
      console.warn('Failed to create variation order', err);
      toast.error(tr("Failed to create Variation Order"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveVo = async () => {
    if (!selectedVo) return;
    try {
      setActionLoading(true);
      const res = await interiorProjectService.approveVariationOrder(projectId, selectedVo._id);
      if (res && res.success) {
        toast.success(tr("Variation Order approved"));
        await fetchVoData();
      }
    } catch (err) {
      console.warn('Failed to approve variation order', err);
      toast.error(tr("Failed to approve Variation Order"));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'executed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    }
  };

  const getVoTypeBadge = (type: string) => {
    switch (type) {
      case 'addition':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'deletion':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
      case 'replacement':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[100rem] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight">
            {tr("Variation Order (VO) Dashboard")}
          </h2>
          <p className="text-xs md:text-sm text-[hsl(var(--muted-foreground))]">
            {tr("Formally approve design variations, track cost margins, and view live database synchronization updates.")}
          </p>
        </div>
        {canDo('variation_orders', 'create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-lg shadow-[hsl(var(--primary)/0.25)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {tr("Create Variation Order")}
          </button>
        )}
      </div>

      {/* KPI Metrics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:border-[hsl(var(--primary)/0.2)] transition-all">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {tr("Total Variation Orders")}
          </span>
          <span className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-2">{tr(metrics.totalVariationOrders)}</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:border-emerald-500/20 transition-all">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {tr("Approved Variations")}
          </span>
          <span className="text-2xl font-extrabold text-emerald-500 mt-2">{tr(metrics.approvedVariations)}</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:border-amber-500/20 transition-all">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {tr("Pending Review")}
          </span>
          <span className="text-2xl font-extrabold text-amber-500 mt-2">{tr(metrics.pendingVariations)}</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-all col-span-2 md:col-span-1">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            {tr("Additional Revenue")}
          </span>
          <span className="text-2xl font-black text-emerald-500 mt-2">
            {tr(currencySymbol)} {metrics.additionalRevenueGenerated.toLocaleString()}
          </span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
            {tr("Timeline Delay")}
          </span>
          <span className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-2">+{tr(metrics.timelineImpact)}{tr(" Days")}</span>
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Variation Orders */}
        <div className="lg:col-span-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm overflow-hidden flex flex-col h-[46.875rem]">
          <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <h3 className="text-sm font-semibold">{tr("Variation Orders")}</h3>
            <span className="ms-auto px-2 py-0.5 text-[0.625rem] font-bold rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              {variationOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))] scrollbar-thin">
            {variationOrders.map((vo) => (
              <div
                key={vo._id}
                onClick={() => setSelectedVo(vo)}
                className={cn(
                  'p-4 cursor-pointer hover:bg-[hsl(var(--muted)/0.3)] transition-all space-y-2 border-s-2',
                  selectedVo?._id === vo._id ? 'bg-[hsl(var(--muted)/0.5)] border-[hsl(var(--primary))]' : 'border-transparent'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[hsl(var(--foreground))]">{tr(vo.voNumber)}</span>
                  <span className={cn('px-2.5 py-0.5 rounded-full text-[0.625rem] font-semibold border capitalize', getStatusBadge(vo.status))}>
                    {tr(vo.status?.replace('_', ' '))}
                  </span>
                </div>
                <p className="text-xs text-[hsl(var(--foreground))] font-medium line-clamp-2">{tr(vo.description)}</p>
                <div className="flex items-center justify-between pt-1 text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                  <span className={cn('px-1.5 py-0.5 rounded text-[0.5rem] uppercase font-bold', getVoTypeBadge(vo.type))}>
                    {vo.type?.replace('_', ' ')}
                  </span>
                  <span className="font-extrabold text-[hsl(var(--foreground))]">
                    {tr(currencySymbol)} {(vo.financialSummary?.netDifference || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {variationOrders.length === 0 && (
              <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">{tr("No variation orders yet.")}</div>
            )}
          </div>
        </div>

        {/* Right Details Pane & Auto Impact Checklist */}
        <div className="lg:col-span-8 space-y-6">
          {selectedVo ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm overflow-hidden flex flex-col h-[46.875rem]">
              {/* Detail Header */}
              <div className="p-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-lg font-bold tracking-wider text-[hsl(var(--foreground))]">{tr(selectedVo.voNumber)}</span>
                    <span className={cn('px-2 py-0.5 rounded text-[0.5625rem] uppercase font-bold', getVoTypeBadge(selectedVo.type))}>
                      {selectedVo.type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      {tr("Category: ")}<span className="font-semibold text-[hsl(var(--foreground))]">{tr(selectedVo.category)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border capitalize', getStatusBadge(selectedVo.status))}>
                    {tr(selectedVo.status?.replace('_', ' '))}
                  </span>
                </div>
              </div>

              {/* Scrollable Contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                <div className="space-y-1.5 bg-[hsl(var(--muted)/0.15)] p-4 rounded-lg border border-[hsl(var(--border))]">
                  <span className="text-[0.5625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase block">
                    {tr("Scope of Variation / Change Details")}
                  </span>
                  <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed">{tr(selectedVo.description)}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{tr("Financial Summary")}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg">
                      <span className="text-[0.5625rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">{tr("Original Approved Cost")}</span>
                      <span className="text-base font-extrabold text-[hsl(var(--foreground))]">
                        {tr(currencySymbol)} {(selectedVo.financialSummary?.originalCost || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <span className="text-[0.5625rem] font-bold text-emerald-500 uppercase tracking-wider block mb-1">{tr("Variation Cost (Net Diff)")}</span>
                      <span className="text-base font-extrabold text-emerald-500">
                        {tr(currencySymbol)} {(selectedVo.financialSummary?.netDifference || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-4 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-lg">
                      <span className="text-[0.5625rem] font-bold text-[hsl(var(--primary))] uppercase tracking-wider block mb-1">{tr("Revised Project Cost")}</span>
                      <span className="text-base font-extrabold text-[hsl(var(--primary))]">
                        {tr(currencySymbol)} {(selectedVo.financialSummary?.revisedProjectCost || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{tr("Cost Impact Analysis")}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3.5 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Hammer className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[0.5625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase block">{tr("Material")}</span>
                        <span className="text-xs font-bold">{tr(currencySymbol)} {(selectedVo.impactAnalysis?.materialCost || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3.5 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[0.5625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase block">{tr("Labor Cost")}</span>
                        <span className="text-xs font-bold">{tr(currencySymbol)} {(selectedVo.impactAnalysis?.laborCost || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3.5 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[0.5625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase block">{tr("Vendor cost")}</span>
                        <span className="text-xs font-bold">{tr(currencySymbol)} {(selectedVo.impactAnalysis?.vendorCost || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3.5 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-teal-500/10 text-teal-500 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[0.5625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase block">{tr("Overhead")}</span>
                        <span className="text-xs font-bold">{tr(currencySymbol)} {(selectedVo.impactAnalysis?.overheadCost || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{tr("Auto-Impact System Adjustments")}</h4>
                  <div className="bg-[hsl(var(--muted)/0.15)] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
                    <div className="text-[0.625rem] text-[hsl(var(--muted-foreground))] font-semibold">
                      {tr("ON APPROVAL, THE SYSTEM AUTOMATICALLY PROPAGATES SHIFTS TO RELEVANT MODULES:")}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3 rounded-lg">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-white',
                            selectedVo.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{tr("Project Budget Revised")}</span>
                          <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.status === 'approved'
                              ? tr("Project budget successfully updated by +₹{{value}}", { value: (selectedVo.financialSummary?.netDifference || 0).toLocaleString('en-IN') })
                              : tr("Awaiting approval...")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3 rounded-lg">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-white',
                            selectedVo.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{tr("BOQ Line Items Appended")}</span>
                          <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.status === 'approved'
                              ? tr("Added line item 'VO Item - {{voNumber}}' to approved BOQ", { voNumber: selectedVo.voNumber })
                              : tr("Awaiting approval...")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3 rounded-lg">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-white',
                            selectedVo.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{tr("WBS Schedule Recalculated")}</span>
                          <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.status === 'approved'
                              ? tr("Created task 'Execute VO: {{voNumber}}' (+{{timelineImpactDays}} days)", { voNumber: selectedVo.voNumber, timelineImpactDays: selectedVo.impactAnalysis?.timelineImpactDays })
                              : tr("Awaiting approval...")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3 rounded-lg">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-white',
                            selectedVo.status === 'approved' && selectedVo.impactAnalysis?.materialCost > 0
                              ? 'bg-emerald-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{tr("Procurement Requisitions Created")}</span>
                          <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.status === 'approved' && selectedVo.impactAnalysis?.materialCost > 0
                              ? tr("Created Purchase Order PO-VO-{{voNumber}} (₹{{materialCost}})", { voNumber: selectedVo.voNumber, materialCost: selectedVo.impactAnalysis?.materialCost.toLocaleString('en-IN') })
                              : tr("No material adjustments required.")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3 rounded-lg sm:col-span-2">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-white',
                            selectedVo.billingGenerated ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{tr("Client Variation Billing Logs Updated")}</span>
                          <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.billingGenerated
                              ? tr("Variation invoice record generated successfully on {{value}}", { value: new Date(selectedVo.billingGeneratedAt).toLocaleDateString('en-IN') })
                              : tr("Awaiting execution approval...")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Footer Actions */}
              {selectedVo.status !== 'approved' && (
                <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] flex justify-end">
                  {canDo('variation_orders', 'approve') && (
                    <button
                      onClick={handleApproveVo}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {tr("Approve & Run Auto Impact Updates")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center text-slate-500 h-[31.25rem] flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
              <p>{tr("No Variation Order selected.")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-[hsl(var(--primary))]" />
                {tr("Create Variation Order")}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVo} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{tr("VO Type")}</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  >
                    <option value="addition">{tr("Addition")}</option>
                    <option value="deletion">{tr("Deletion")}</option>
                    <option value="replacement">{tr("Replacement")}</option>
                    <option value="quantity_change">{tr("Quantity Change")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{tr("Category")}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  >
                    <option value="Civil">{tr("Civil")}</option>
                    <option value="Electrical">{tr("Electrical")}</option>
                    <option value="Carpentry">{tr("Carpentry")}</option>
                    <option value="Furniture">{tr("Furniture")}</option>
                    <option value="MEP">{tr("MEP")}</option>
                    <option value="Landscape">{tr("Landscape")}</option>
                    <option value="Design">{tr("Design")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  {tr("Scope of Variation Description")}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={tr("Describe the scope changes and execution instructions...")}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {tr("Material Cost Impact (")}{tr(currencySymbol)})
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.materialCost}
                    onChange={(e) => setFormData({ ...formData, materialCost: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {tr("Labor Cost Impact (")}{tr(currencySymbol)})
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.laborCost}
                    onChange={(e) => setFormData({ ...formData, laborCost: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {tr("Vendor Cost Impact (")}{tr(currencySymbol)})
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.vendorCost}
                    onChange={(e) => setFormData({ ...formData, vendorCost: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    {tr("Overhead Cost Impact (")}{tr(currencySymbol)})
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.overheadCost}
                    onChange={(e) => setFormData({ ...formData, overheadCost: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  {tr("Timeline Impact (Days Added)")}
                </label>
                <input
                  type="number"
                  required
                  value={formData.timelineImpactDays}
                  onChange={(e) => setFormData({ ...formData, timelineImpactDays: Number(e.target.value) })}
                  className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3 bg-[hsl(var(--card))]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--muted))] cursor-pointer"
                >
                  {tr("Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? tr("Creating...") : tr("Create VO")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
