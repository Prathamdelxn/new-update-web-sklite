'use client';

// =============================================================================
// Sky-Lite Web — Interior-New BOQ (Bill of Quantities) View
// Professional, Section-Based Hierarchical BOQ Management, Version Control,
// Specifications, Multi-Section Groups, and BOQ vs Actual Site Tracking.
// Backed directly by interiorProjectService & InteriorProjectBoqBuilderModal.
// =============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Upload,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Loader2,
  List,
  Trash2,
  X,
  Pencil,
  FileText,
  Layers,
  Sparkles,
  Download,
  Eye,
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InteriorProjectBoqBuilderModal } from '@/features/interior-new/components/projects/modals/InteriorProjectBoqBuilderModal';

interface InteriorBoqViewProps {
  projectId: string;
}

export default function InteriorBoqView({ projectId }: InteriorBoqViewProps) {
  const toast = useToast();
  const { currencySymbol } = useCurrency();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  // Core state
  const [activeTab, setActiveTab] = useState<'items' | 'actual'>('items');
  const [selectedBoqId, setSelectedBoqId] = useState<string | null>(null);

  // Builder modal state (Identical to CRM BOQ Builder)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderEditBoq, setBuilderEditBoq] = useState<any | null>(null);
  const [isBuilderReadOnly, setIsBuilderReadOnly] = useState(false);

  // Excel Import modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Rejection modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // 1. BOQs list query
  const {
    data: boqs = [],
    isLoading: loadingBoqs,
    refetch: refetchBoqs,
  } = useQuery({
    queryKey: ['project-boq', projectId],
    queryFn: async () => {
      const res = await interiorProjectService.getBoqList(projectId);
      return res.success && res.data ? res.data : [];
    },
    enabled: Boolean(projectId),
    staleTime: 5 * 60 * 1000,
  });

  // Automatically select the first BOQ if none selected
  useEffect(() => {
    if (boqs.length > 0 && (!selectedBoqId || !boqs.some((b: any) => b._id === selectedBoqId))) {
      setSelectedBoqId(boqs[0]._id);
    }
  }, [boqs, selectedBoqId]);

  // 2. Active BOQ detail query
  const activeBoqId = selectedBoqId || (boqs.length > 0 ? boqs[0]._id : null);
  const {
    data: selectedBoq = null,
    isLoading: loadingDetail,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['project-boq-detail', projectId, activeBoqId],
    queryFn: async () => {
      if (!activeBoqId) return null;
      const res = await interiorProjectService.getBoqDetail(projectId, activeBoqId);
      return res.success && res.data ? res.data : null;
    },
    enabled: Boolean(projectId && activeBoqId),
    staleTime: 5 * 60 * 1000,
  });

  // 3. BOQ vs Actual query
  const {
    data: actualData = null,
    isLoading: loadingActual,
  } = useQuery({
    queryKey: ['project-boq-actual', projectId],
    queryFn: async () => {
      const res = await interiorProjectService.getBoqVsActual(projectId);
      return res.success && res.data ? res.data : null;
    },
    enabled: Boolean(projectId && activeTab === 'actual'),
    staleTime: 5 * 60 * 1000,
  });

  const loading = loadingBoqs || loadingDetail;

  const fetchBoqs = async (selectLatest = true) => {
    queryClient.invalidateQueries({ queryKey: ['project-boq', projectId] });
    const res = await refetchBoqs();
    if (selectLatest && res.data && res.data.length > 0) {
      setSelectedBoqId(res.data[0]._id);
    }
  };

  const fetchBoqDetail = (boqId: string) => {
    setSelectedBoqId(boqId);
  };

  const handleOpenCreateBuilder = () => {
    setBuilderEditBoq(null);
    setIsBuilderReadOnly(false);
    setIsBuilderOpen(true);
  };

  const handleOpenEditBuilder = (boq: any, readOnly = false) => {
    setBuilderEditBoq(boq);
    setIsBuilderReadOnly(readOnly);
    setIsBuilderOpen(true);
  };

  const handleApprovalAction = async (action: 'submit' | 'approve' | 'reject', reason?: string) => {
    if (!selectedBoq) return;
    try {
      setSubmittingAction(true);
      const res = await interiorProjectService.boqApprovalAction(projectId, selectedBoq._id, { action, reason });
      if (res.success) {
        toast.success(`BOQ successfully ${action}ed`);
        setIsRejectOpen(false);
        setRejectReason('');
        queryClient.invalidateQueries({ queryKey: ['project-boq', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-boq-detail', projectId, selectedBoq._id] });
        await refetchBoqs();
        await refetchDetail();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || `Failed to ${action} BOQ`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCreateRevision = async () => {
    if (!selectedBoq) return;
    try {
      const res = await interiorProjectService.reviseBoq(projectId, selectedBoq._id);
      if (res.success && res.data) {
        toast.success(`New draft revision created: ${res.data.versionLabel}`);
        fetchBoqs(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create BOQ revision');
    }
  };

  const handleDeleteBoq = async () => {
    if (!selectedBoq) return;
    const ok = await confirm({
      title: 'Delete BOQ Draft',
      message: 'Are you sure you want to delete this BOQ draft?',
      confirmText: 'Delete Draft',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await interiorProjectService.deleteBoq(projectId, selectedBoq._id);
      if (res.success) {
        toast.success('Draft deleted successfully');
        fetchBoqs(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete BOQ');
    }
  };

  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error('Please choose a valid Excel file first');
      return;
    }
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', excelFile);
      const res = await interiorProjectService.importBoqExcel(projectId, formData);
      if (res.success) {
        toast.success(res.message || 'Excel BOQ Imported Successfully!');
        setIsImportOpen(false);
        setExcelFile(null);
        fetchBoqs(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to import Excel file');
    } finally {
      setImporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pending_approval':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'superseded':
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  // Group items by sections for professional hierarchical display
  const groupedSections = useMemo(() => {
    if (!selectedBoq || !selectedBoq.items || selectedBoq.items.length === 0) return [];

    if (Array.isArray(selectedBoq.sections) && selectedBoq.sections.length > 0) {
      return selectedBoq.sections.map((sec: any) => {
        const secItems = selectedBoq.items.filter(
          (it: any) =>
            it.sectionId === sec.id ||
            it.sectionId === sec.sectionId ||
            it.sectionNumber === sec.sectionNumber ||
            it.sectionTitle === sec.sectionTitle ||
            it.category === sec.sectionTitle
        );
        const subTotal = secItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
        return {
          ...sec,
          items: secItems,
          subTotal,
        };
      }).filter((s: any) => s.items.length > 0);
    }

    // Default grouping by category
    const categories = Array.from(new Set(selectedBoq.items.map((it: any) => it.category || 'Civil Work')));
    return categories.map((cat, idx) => {
      const secItems = selectedBoq.items.filter((it: any) => (it.category || 'Civil Work') === cat);
      const subTotal = secItems.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0);
      const firstItem = secItems[0];
      return {
        id: `sec-${idx + 1}`,
        sectionNumber: firstItem?.sectionNumber || String(idx + 1),
        sectionTitle: firstItem?.sectionTitle || cat,
        scopeDescription: firstItem?.sectionScope || '',
        items: secItems,
        subTotal,
      };
    });
  }, [selectedBoq]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Bill of Quantities (BOQ)</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-200">
              SkyStruct Lite Standard
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Section-based hierarchical BOQ builder, technical specifications, brand/makes, versioning, and actual site consumption tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="gap-1.5 text-xs cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import Excel
          </Button>
          <Button size="sm" onClick={handleOpenCreateBuilder} className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Create BOQ Version
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Top Horizontal: BOQ Versions & Active Version Details */}
        <Card className="border border-[hsl(var(--border))] shadow-xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* BOQ Versions Selector (Horizontal) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold tracking-wider text-[hsl(var(--muted-foreground))] uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" /> BOQ Versions
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  {boqs.length} {boqs.length === 1 ? 'version' : 'versions'} available
                </span>
              </div>

              {loading && boqs.length === 0 ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              ) : boqs.length === 0 ? (
                <div className="text-xs text-[hsl(var(--muted-foreground))] text-center py-4 border border-dashed rounded-xl p-3 bg-slate-50/50">
                  No BOQ registered. Click &quot;Create BOQ Version&quot; to begin.
                </div>
              ) : (
                <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-thin">
                  {boqs.map((boq: any) => {
                    const isSelected = selectedBoq?._id === boq._id;
                    return (
                      <button
                        key={boq._id}
                        onClick={() => fetchBoqDetail(boq._id)}
                        className={cn(
                          'shrink-0 text-left p-3 rounded-xl border text-xs font-semibold transition-all flex flex-col gap-1.5 cursor-pointer min-w-[190px]',
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-xs ring-1 ring-blue-500/20'
                            : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] hover:bg-slate-50 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm text-slate-900">{boq.versionLabel}</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border', getStatusBadge(boq.status))}>
                            {boq.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-0.5">
                          <span className="font-bold font-mono text-slate-800">{currencySymbol} {boq.totalAmount?.toLocaleString('en-IN')}</span>
                          <span className="text-[10px]">{new Date(boq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Version Horizontal Strip & Actions */}
            {selectedBoq && (
              <div className="pt-3.5 border-t border-[hsl(var(--border))] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[hsl(var(--muted-foreground))] text-[11px]">Total Cost:</span>
                    <span className="font-black font-mono text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {currencySymbol} {selectedBoq.totalAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[hsl(var(--muted-foreground))] text-[11px]">Created By:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedBoq.createdBy?.firstName} {selectedBoq.createdBy?.lastName || 'System'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[hsl(var(--muted-foreground))] text-[11px]">Source:</span>
                    <span className="font-semibold capitalize text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {selectedBoq.importedFrom || 'CRM Builder'}
                    </span>
                  </div>

                  {selectedBoq.notes && (
                    <div className="flex items-center gap-1.5 max-w-md">
                      <span className="text-[hsl(var(--muted-foreground))] text-[11px] shrink-0">Scope & Terms:</span>
                      <span className="text-slate-600 text-[11px] truncate bg-slate-50 px-2 py-0.5 rounded border border-slate-200" title={selectedBoq.notes}>
                        {selectedBoq.notes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {(selectedBoq.status === 'draft' || selectedBoq.status === 'rejected') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditBuilder(selectedBoq)}
                      className="h-8 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit in Builder
                    </Button>
                  )}
                  {selectedBoq.status === 'draft' && (
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleApprovalAction('submit')}
                    >
                      Submit for Approval
                    </Button>
                  )}
                  {selectedBoq.status === 'pending_approval' && (
                    <>
                      <Button
                        size="sm"
                        className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleApprovalAction('approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => setIsRejectOpen(true)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {selectedBoq.status === 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={handleCreateRevision}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create New Revision
                    </Button>
                  )}
                  {(selectedBoq.status === 'draft' || selectedBoq.status === 'rejected') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      onClick={handleDeleteBoq}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Draft
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full Width Main Content: BOQ Line Items & Sections */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-1.5 rounded-2xl border border-[hsl(var(--border))]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('items')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                  activeTab === 'items'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-slate-900'
                )}
              >
                <List className="w-3.5 h-3.5 text-blue-600" /> BOQ Line Items & Sections
              </button>
            </div>

            {selectedBoq && (
              <div className="flex items-center gap-2 pr-1">
                {(selectedBoq.status === 'draft' || selectedBoq.status === 'rejected') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditBuilder(selectedBoq)}
                    className="h-8 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Open in Builder
                  </Button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div>
              {activeTab === 'items' && selectedBoq && (
                <div className="space-y-6">
                  {groupedSections.length > 0 ? (
                    groupedSections.map((section: any, sIdx: number) => (
                      <Card key={section.id || sIdx} className="overflow-hidden border border-slate-200 shadow-xs">
                        {/* Section Header */}
                        <div className="p-3.5 sm:p-4 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                Section {section.sectionNumber || sIdx + 1}
                              </span>
                              <h4 className="font-bold text-sm text-slate-900">{section.sectionTitle}</h4>
                              <span className="text-[10px] text-slate-500 font-semibold bg-slate-200/80 px-2 py-0.5 rounded-full">
                                {section.items?.length || 0} items
                              </span>
                            </div>
                            {section.scopeDescription && (
                              <p className="text-[11px] text-slate-500 mt-1">{section.scopeDescription}</p>
                            )}
                          </div>

                          <div className="text-right shrink-0 font-mono font-bold text-xs text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                            Subtotal: {currencySymbol}{section.subTotal?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Section Items Table */}
                        <CardContent className="p-0 overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                                <th className="p-2.5 w-12 text-center">Code</th>
                                <th className="p-2.5 w-44">Item Headline</th>
                                <th className="p-2.5">Technical Specification</th>
                                <th className="p-2.5 w-20 text-right">Qty</th>
                                <th className="p-2.5 w-24 text-center">Unit</th>
                                <th className="p-2.5 w-24 text-right">Rate ({currencySymbol})</th>
                                <th className="p-2.5 w-28 text-right">Amount ({currencySymbol})</th>
                                <th className="p-2.5 w-36">Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.items?.map((item: any, idx: number) => (
                                <tr key={item._id || idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-2.5 text-center font-mono font-bold text-slate-600">
                                    {item.itemCode || item.serialNumber || idx + 1}
                                  </td>
                                  <td className="p-2.5 font-bold text-slate-900 align-top">
                                    {item.itemName}
                                  </td>
                                  <td className="p-2.5 text-slate-700 align-top leading-tight text-[11px]">
                                    {item.description || '—'}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 align-top">
                                    {item.quantity?.toLocaleString('en-IN')}
                                  </td>
                                  <td className="p-2.5 text-center text-slate-600 font-semibold align-top uppercase text-[10px]">
                                    {item.unit}
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-slate-800 align-top">
                                    {item.rate?.toLocaleString('en-IN')}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 align-top">
                                    {currencySymbol} {item.amount?.toLocaleString('en-IN')}
                                  </td>
                                  <td className="p-2.5 text-slate-500 text-[11px] align-top">
                                    {item.remarks || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="p-8 text-center text-xs text-slate-400 border-dashed">
                      No line items in this BOQ version.
                    </Card>
                  )}

                  {/* Grand Total Strip */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                        Total Master BOQ Value ({selectedBoq.versionLabel})
                      </span>
                      <span className="text-xs text-slate-300">
                        {groupedSections.length} Sections • {selectedBoq.items?.length || 0} Total Specifications
                      </span>
                    </div>
                    <span className="text-lg sm:text-xl font-black font-mono text-white">
                      {currencySymbol} {selectedBoq.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'items' && !selectedBoq && (
                <Card className="p-12 text-center text-xs text-slate-500 border-dashed">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  Select or create a BOQ version to view line items.
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Project BOQ Builder Modal (Identical to CRM Builder) */}
      {/* ========================================================================= */}
      <InteriorProjectBoqBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        projectId={projectId}
        existingBoq={builderEditBoq}
        isReadOnly={isBuilderReadOnly}
        onSuccess={() => {
          fetchBoqs(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: Excel Import Modal */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-sm font-black text-[hsl(var(--foreground))] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Import BOQ Excel Sheet
                </h3>
                <button onClick={() => setIsImportOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleExcelImport}>
                <div className="p-5 space-y-4">
                  <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    Upload your architecture spreadsheet (.xlsx or .xls). Columns will automatically map for Category, Item Name, Quantity, Unit, and Rate.
                  </p>

                  <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-emerald-500/50 transition-colors relative cursor-pointer bg-[hsl(var(--background))]">
                    <input
                      type="file"
                      required
                      accept=".xlsx,.xls"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setExcelFile(e.target.files[0]);
                        }
                      }}
                    />
                    <FileSpreadsheet className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-xs font-semibold text-center text-[hsl(var(--foreground))] px-2 truncate w-full">
                      {excelFile ? excelFile.name : 'Click or drag BOQ file here'}
                    </span>
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))]">Supports Excel spreadsheet files up to 10MB</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsImportOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" disabled={importing}>
                    {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Import & Process
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: Rejection Reason */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isRejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-sm font-black text-[hsl(var(--foreground))]">Specify Rejection Reason</h3>
                <button onClick={() => setIsRejectOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Comments</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter reason for rejecting this BOQ version draft..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <Button variant="outline" type="button" onClick={() => setIsRejectOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white cursor-pointer" disabled={!rejectReason || submittingAction} onClick={() => handleApprovalAction('reject', rejectReason)}>
                  {submittingAction && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Reject BOQ
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
