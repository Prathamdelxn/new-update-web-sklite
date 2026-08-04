'use client';

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

interface InteriorVariationOrdersViewProps {
  projectId: string;
}

export default function InteriorVariationOrdersView({ projectId }: InteriorVariationOrdersViewProps) {
  const toast = useToast();

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
      const projRes = await interiorProjectService.getProjectDetails(projectId);
      if (projRes && projRes.success && projRes.data) {
        setProjectBudget(projRes.data.budget?.amount || 500000);
      }

      const res = await interiorProjectService.getVariationOrders(projectId);
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
      toast.error('Failed to load variation orders');
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
        toast.success('Variation Order created successfully');
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
      toast.error('Failed to create Variation Order');
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
        toast.success('Variation Order approved');
        await fetchVoData();
      }
    } catch (err) {
      console.warn('Failed to approve variation order', err);
      toast.error('Failed to approve Variation Order');
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
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight">
            Variation Order (VO) Dashboard
          </h2>
          <p className="text-xs md:text-sm text-[hsl(var(--muted-foreground))]">
            Formally approve design variations, track cost margins, and view live database synchronization updates.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-lg shadow-[hsl(var(--primary)/0.25)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Variation Order
        </button>
      </div>

      {/* KPI Metrics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:border-[hsl(var(--primary)/0.2)] transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Total Variation Orders
          </span>
          <span className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-2">{metrics.totalVariationOrders}</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:border-emerald-500/20 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Approved Variations
          </span>
          <span className="text-2xl font-extrabold text-emerald-500 mt-2">{metrics.approvedVariations}</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:border-amber-500/20 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Pending Review
          </span>
          <span className="text-2xl font-extrabold text-amber-500 mt-2">{metrics.pendingVariations}</span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-all col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Additional Revenue
          </span>
          <span className="text-2xl font-black text-emerald-500 mt-2">
            ₹{metrics.additionalRevenueGenerated.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
            Timeline Delay
          </span>
          <span className="text-2xl font-extrabold text-[hsl(var(--foreground))] mt-2">+{metrics.timelineImpact} Days</span>
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Variation Orders */}
        <div className="lg:col-span-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm overflow-hidden flex flex-col h-[750px]">
          <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <h3 className="text-sm font-semibold">Variation Orders</h3>
            <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              {variationOrders.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))] scrollbar-thin">
            {variationOrders.map((vo) => (
              <div
                key={vo._id}
                onClick={() => setSelectedVo(vo)}
                className={cn(
                  'p-4 cursor-pointer hover:bg-[hsl(var(--muted)/0.3)] transition-all space-y-2 border-l-2',
                  selectedVo?._id === vo._id ? 'bg-[hsl(var(--muted)/0.5)] border-[hsl(var(--primary))]' : 'border-transparent'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[hsl(var(--foreground))]">{vo.voNumber}</span>
                  <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize', getStatusBadge(vo.status))}>
                    {vo.status?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-[hsl(var(--foreground))] font-medium line-clamp-2">{vo.description}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <span className={cn('px-1.5 py-0.5 rounded text-[8px] uppercase font-bold', getVoTypeBadge(vo.type))}>
                    {vo.type?.replace('_', ' ')}
                  </span>
                  <span className="font-extrabold text-[hsl(var(--foreground))]">
                    ₹{(vo.financialSummary?.netDifference || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
            {variationOrders.length === 0 && (
              <div className="p-6 text-center text-xs text-[hsl(var(--muted-foreground))]">No variation orders yet.</div>
            )}
          </div>
        </div>

        {/* Right Details Pane & Auto Impact Checklist */}
        <div className="lg:col-span-8 space-y-6">
          {selectedVo ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm overflow-hidden flex flex-col h-[750px]">
              {/* Detail Header */}
              <div className="p-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-lg font-bold tracking-wider text-[hsl(var(--foreground))]">{selectedVo.voNumber}</span>
                    <span className={cn('px-2 py-0.5 rounded text-[9px] uppercase font-bold', getVoTypeBadge(selectedVo.type))}>
                      {selectedVo.type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Category: <span className="font-semibold text-[hsl(var(--foreground))]">{selectedVo.category}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border capitalize', getStatusBadge(selectedVo.status))}>
                    {selectedVo.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Scrollable Contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                <div className="space-y-1.5 bg-[hsl(var(--muted)/0.15)] p-4 rounded-lg border border-[hsl(var(--border))]">
                  <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">
                    Scope of Variation / Change Details
                  </span>
                  <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed">{selectedVo.description}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Financial Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Original Approved Cost</span>
                      <span className="text-base font-extrabold text-[hsl(var(--foreground))]">
                        ₹{(selectedVo.financialSummary?.originalCost || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">Variation Cost (Net Diff)</span>
                      <span className="text-base font-extrabold text-emerald-500">
                        ₹{(selectedVo.financialSummary?.netDifference || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-4 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] rounded-lg">
                      <span className="text-[9px] font-bold text-[hsl(var(--primary))] uppercase tracking-wider block mb-1">Revised Project Cost</span>
                      <span className="text-base font-extrabold text-[hsl(var(--primary))]">
                        ₹{(selectedVo.financialSummary?.revisedProjectCost || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Cost Impact Analysis</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3.5 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Hammer className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Material</span>
                        <span className="text-xs font-bold">₹{(selectedVo.impactAnalysis?.materialCost || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3.5 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Labor Cost</span>
                        <span className="text-xs font-bold">₹{(selectedVo.impactAnalysis?.laborCost || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3.5 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Vendor cost</span>
                        <span className="text-xs font-bold">₹{(selectedVo.impactAnalysis?.vendorCost || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3.5 rounded-lg flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-teal-500/10 text-teal-500 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Overhead</span>
                        <span className="text-xs font-bold">₹{(selectedVo.impactAnalysis?.overheadCost || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Auto-Impact System Adjustments</h4>
                  <div className="bg-[hsl(var(--muted)/0.15)] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4">
                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">
                      ON APPROVAL, THE SYSTEM AUTOMATICALLY PROPAGATES SHIFTS TO RELEVANT MODULES:
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
                          <span className="text-xs font-bold block">Project Budget Revised</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.status === 'approved'
                              ? `Project budget successfully updated by +₹${(selectedVo.financialSummary?.netDifference || 0).toLocaleString('en-IN')}`
                              : 'Awaiting approval...'}
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
                          <span className="text-xs font-bold block">BOQ Line Items Appended</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.status === 'approved'
                              ? `Added line item 'VO Item - ${selectedVo.voNumber}' to approved BOQ`
                              : 'Awaiting approval...'}
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
                          <span className="text-xs font-bold block">WBS Schedule Recalculated</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.status === 'approved'
                              ? `Created task 'Execute VO: ${selectedVo.voNumber}' (+${selectedVo.impactAnalysis?.timelineImpactDays} days)`
                              : 'Awaiting approval...'}
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
                          <span className="text-xs font-bold block">Procurement Requisitions Created</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.status === 'approved' && selectedVo.impactAnalysis?.materialCost > 0
                              ? `Created Purchase Order PO-VO-${selectedVo.voNumber} (₹${selectedVo.impactAnalysis?.materialCost.toLocaleString('en-IN')})`
                              : 'No material adjustments required.'}
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
                          <span className="text-xs font-bold block">Client Variation Billing Logs Updated</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                            {selectedVo.billingGenerated
                              ? `Variation invoice record generated successfully on ${new Date(selectedVo.billingGeneratedAt).toLocaleDateString('en-IN')}`
                              : 'Awaiting execution approval...'}
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
                  <button
                    onClick={handleApproveVo}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve & Run Auto Impact Updates
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center text-slate-500 h-[500px] flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
              <p>No Variation Order selected.</p>
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
                Create Variation Order
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVo} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">VO Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  >
                    <option value="addition">Addition</option>
                    <option value="deletion">Deletion</option>
                    <option value="replacement">Replacement</option>
                    <option value="quantity_change">Quantity Change</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  >
                    <option value="Civil">Civil</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Furniture">Furniture</option>
                    <option value="MEP">MEP</option>
                    <option value="Landscape">Landscape</option>
                    <option value="Design">Design</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Scope of Variation Description
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the scope changes and execution instructions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Material Cost Impact (₹)
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Labor Cost Impact (₹)
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Vendor Cost Impact (₹)
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Overhead Cost Impact (₹)
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Timeline Impact (Days Added)
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create VO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
