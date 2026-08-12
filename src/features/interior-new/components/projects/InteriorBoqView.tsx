'use client';

// =============================================================================
// Sky-Lite Web — Interior-New BOQ (Bill of Quantities) View
// Port of interior-os-frontend's projects/[projectId]/boq/page.tsx, backed by
// interiorProjectService. The "Compare Revisions" tab is dropped — its
// backing endpoint (projectService.compareBoqVersions) has no equivalent in
// interiorProject.service.ts. use-project-permissions gating is also dropped
// (no permission infra in this app) — all actions are shown unconditionally.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Upload,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Loader2,
  List,
  Activity,
  Trash2,
  X,
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';

interface InteriorBoqViewProps {
  projectId: string;
}

export default function InteriorBoqView({ projectId }: InteriorBoqViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  // Core state
  const [activeTab, setActiveTab] = useState<'items' | 'actual'>('items');
  const [boqs, setBoqs] = useState<any[]>([]);
  const [selectedBoq, setSelectedBoq] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Create / Import modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Manual Create form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBoqNotes, setNewBoqNotes] = useState('');
  const [newItems, setNewItems] = useState<any[]>([
    { serialNumber: 1, category: 'Flooring', itemName: '', description: '', quantity: 1, unit: 'sqft', rate: 0 },
  ]);

  // BOQ vs Actual
  const [actualData, setActualData] = useState<any>(null);
  const [loadingActual, setLoadingActual] = useState(false);

  // Rejection modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchBoqs = async (selectLatest = true) => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getBoqList(projectId);
      if (res.success && res.data) {
        setBoqs(res.data);
        if (selectLatest && res.data.length > 0) {
          fetchBoqDetail(res.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load BOQs', err);
      toast.error('Failed to fetch BOQ versions list');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoqDetail = async (boqId: string) => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getBoqDetail(projectId, boqId);
      if (res.success && res.data) {
        setSelectedBoq(res.data);
      }
    } catch (err) {
      console.error('Failed to load BOQ details', err);
      toast.error('Failed to fetch BOQ details');
    } finally {
      setLoading(false);
    }
  };

  const fetchActual = async () => {
    try {
      setLoadingActual(true);
      const res = await interiorProjectService.getBoqVsActual(projectId);
      if (res.success && res.data) {
        setActualData(res.data);
      }
    } catch (err) {
      console.error('Failed to load actual tracking data', err);
      setActualData(null);
    } finally {
      setLoadingActual(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchBoqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'actual' && projectId) fetchActual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleApprovalAction = async (action: 'submit' | 'approve' | 'reject', reason?: string) => {
    if (!selectedBoq) return;
    try {
      setSubmittingAction(true);
      const res = await interiorProjectService.boqApprovalAction(projectId, selectedBoq._id, { action, reason });
      if (res.success) {
        toast.success(`BOQ successfully ${action}ed`);
        setIsRejectOpen(false);
        setRejectReason('');
        fetchBoqs(false);
        fetchBoqDetail(selectedBoq._id);
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
      setLoading(true);
      const res = await interiorProjectService.reviseBoq(projectId, selectedBoq._id);
      if (res.success && res.data) {
        toast.success(`New draft revision created: ${res.data.versionLabel}`);
        fetchBoqs(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create BOQ revision');
    } finally {
      setLoading(false);
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
      setLoading(true);
      const res = await interiorProjectService.deleteBoq(projectId, selectedBoq._id);
      if (res.success) {
        toast.success('Draft deleted successfully');
        fetchBoqs(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete BOQ');
    } finally {
      setLoading(false);
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

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await interiorProjectService.createBoq(projectId, {
        notes: newBoqNotes,
        items: newItems,
      });
      if (res.success) {
        toast.success('BOQ Created Successfully!');
        setIsCreateOpen(false);
        setNewBoqNotes('');
        setNewItems([{ serialNumber: 1, category: 'Flooring', itemName: '', description: '', quantity: 1, unit: 'sqft', rate: 0 }]);
        fetchBoqs(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create BOQ');
    } finally {
      setLoading(false);
    }
  };

  const addNewItemRow = () => {
    setNewItems((prev) => [
      ...prev,
      {
        serialNumber: prev.length + 1,
        category: prev[prev.length - 1]?.category || 'Flooring',
        itemName: '',
        description: '',
        quantity: 1,
        unit: prev[prev.length - 1]?.unit || 'sqft',
        rate: 0,
      },
    ]);
  };

  const removeNewItemRow = (index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index).map((it, idx) => ({ ...it, serialNumber: idx + 1 })));
  };

  const updateNewItemField = (index: number, field: string, value: any) => {
    setNewItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'pending_approval':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 animate-pulse';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'superseded':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Top action row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Bill of Quantities (BOQ)</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Manage materials, pricing, and revision audits alongside actual site consumption tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Import Excel
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create BOQ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Version Selector & Summary */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-bold tracking-tight text-[hsl(var(--muted-foreground))] uppercase">Versions List</h3>

              {loading && boqs.length === 0 ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--primary))]" />
                </div>
              ) : boqs.length === 0 ? (
                <div className="text-xs text-[hsl(var(--muted-foreground))] text-center py-4">
                  No BOQ registered. Click Create or Import to start.
                </div>
              ) : (
                <div className="space-y-1">
                  {boqs.map((boq) => (
                    <button
                      key={boq._id}
                      onClick={() => fetchBoqDetail(boq._id)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border text-xs font-semibold transition-all flex flex-col gap-1',
                        selectedBoq?._id === boq._id
                          ? 'bg-[hsl(var(--primary)/0.05)] border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                          : 'border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{boq.versionLabel}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border', getStatusBadge(boq.status))}>
                          {boq.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] font-medium pt-1">
                        <span>₹{boq.totalAmount?.toLocaleString('en-IN')}</span>
                        <span>{new Date(boq.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedBoq && (
            <Card>
              <CardContent className="p-4 space-y-3 text-xs">
                <h3 className="font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-tight">Active Version Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-[hsl(var(--muted-foreground))]">Total Cost:</span>
                    <span className="font-bold text-[hsl(var(--foreground))]">₹{selectedBoq.totalAmount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-[hsl(var(--muted-foreground))]">Created By:</span>
                    <span className="font-medium text-[hsl(var(--foreground))]">
                      {selectedBoq.createdBy?.firstName} {selectedBoq.createdBy?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-[hsl(var(--muted-foreground))]">Source:</span>
                    <span className="font-medium capitalize text-[hsl(var(--foreground))]">{selectedBoq.importedFrom || 'manual'}</span>
                  </div>
                  {selectedBoq.notes && (
                    <div className="pt-1">
                      <span className="text-[hsl(var(--muted-foreground))] block mb-1">Notes:</span>
                      <p className="p-2 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-[10px] leading-relaxed">{selectedBoq.notes}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t space-y-2">
                  {selectedBoq.status === 'draft' && (
                    <Button className="w-full" size="sm" onClick={() => handleApprovalAction('submit')}>
                      Submit for Approval
                    </Button>
                  )}
                  {selectedBoq.status === 'pending_approval' && (
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={() => handleApprovalAction('approve')}>
                        Approve
                      </Button>
                      <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" size="sm" onClick={() => setIsRejectOpen(true)}>
                        Reject
                      </Button>
                    </div>
                  )}
                  {selectedBoq.status === 'approved' && (
                    <Button variant="outline" className="w-full text-[hsl(var(--primary))] border-[hsl(var(--primary))]" size="sm" onClick={handleCreateRevision}>
                      Create New Revision
                    </Button>
                  )}
                  {(selectedBoq.status === 'draft' || selectedBoq.status === 'rejected') && (
                    <Button variant="outline" className="w-full text-red-500 hover:text-red-600 border-red-200" size="sm" onClick={handleDeleteBoq}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Draft
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Tab View Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-wrap items-center gap-1 bg-[hsl(var(--muted)/0.3)] p-1 rounded-xl border">
            <button
              onClick={() => setActiveTab('items')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                activeTab === 'items' ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <List className="w-3.5 h-3.5" /> BOQ Line Items
            </button>
            <button
              onClick={() => setActiveTab('actual')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                activeTab === 'actual' ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <Activity className="w-3.5 h-3.5" /> BOQ vs Actual
            </button>
            {/* "Compare Revisions" tab dropped — no compareBoqVersions endpoint in interiorProject.service.ts */}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : (
            <div>
              {activeTab === 'items' && selectedBoq && (
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-bold border-b">
                          <th className="p-3 w-12 text-center">S.No</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Item Description</th>
                          <th className="p-3 text-right">Quantity</th>
                          <th className="p-3 text-center">Unit</th>
                          <th className="p-3 text-right">Rate (₹)</th>
                          <th className="p-3 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBoq.items?.map((item: any, idx: number) => (
                          <tr key={item._id || idx} className="border-b hover:bg-[hsl(var(--muted)/0.15)] transition-colors">
                            <td className="p-3 text-center font-mono font-medium text-[hsl(var(--muted-foreground))]">{item.serialNumber}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] font-bold text-[10px]">{item.category}</span>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-[hsl(var(--foreground))]">{item.itemName}</div>
                              {item.description && <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{item.description}</div>}
                            </td>
                            <td className="p-3 text-right font-semibold">{item.quantity?.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-center uppercase text-[hsl(var(--muted-foreground))]">{item.unit}</td>
                            <td className="p-3 text-right font-medium">{item.rate?.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-right font-bold text-[hsl(var(--foreground))]">₹{item.amount?.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'items' && !selectedBoq && (
                <Card className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))] border-dashed">
                  Select or create a BOQ version to view line items.
                </Card>
              )}

              {activeTab === 'actual' && (
                <div className="space-y-6">
                  {loadingActual ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
                    </div>
                  ) : !actualData ? (
                    <Card className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))] border-dashed">
                      No approved BOQ found to compare against site consumption. Approve a version first.
                    </Card>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-blue-50/20 border-blue-100">
                          <CardContent className="p-4 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Total Planned Budget</span>
                            <div className="text-xl font-black">₹{actualData.summary?.totalPlannedAmount?.toLocaleString('en-IN')}</div>
                            <p className="text-[9px] text-[hsl(var(--muted-foreground))]">Approved BOQ Master Value</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-amber-50/20 border-amber-100">
                          <CardContent className="p-4 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Consumed Cost</span>
                            <div className="text-xl font-black">₹{actualData.summary?.totalConsumedAmount?.toLocaleString('en-IN')}</div>
                            <p className="text-[9px] text-[hsl(var(--muted-foreground))]">Calculated via site installation logs</p>
                          </CardContent>
                        </Card>
                        <Card
                          className={cn(
                            'border-opacity-40',
                            actualData.summary?.overallVariance > 0 ? 'bg-red-50/20 border-red-200' : 'bg-emerald-50/20 border-emerald-200'
                          )}
                        >
                          <CardContent className="p-4 space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider">Overall Variance</span>
                            <div className="text-xl font-black flex items-center gap-1">
                              {actualData.summary?.overallVariance > 0 ? (
                                <span className="text-red-600 flex items-center">
                                  <TrendingUp className="w-4 h-4" /> +{actualData.summary.overallVariance}%
                                </span>
                              ) : (
                                <span className="text-emerald-600 flex items-center">
                                  <TrendingDown className="w-4 h-4" /> {actualData.summary?.overallVariance}%
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-[hsl(var(--muted-foreground))]">Overall budget variance threshold</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardContent className="p-0 overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-bold border-b">
                                <th className="p-3 w-12 text-center">S.No</th>
                                <th className="p-3">Material Item</th>
                                <th className="p-3 text-right">BOQ Planned</th>
                                <th className="p-3 text-right">Site Consumed</th>
                                <th className="p-3 text-right">Remaining</th>
                                <th className="p-3 text-right">Variance (%)</th>
                                <th className="p-3 text-center">Budget Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {actualData.items?.map((item: any, idx: number) => (
                                <tr key={item._id || idx} className="border-b hover:bg-[hsl(var(--muted)/0.15)] transition-colors">
                                  <td className="p-3 text-center font-mono font-medium text-[hsl(var(--muted-foreground))]">{item.serialNumber}</td>
                                  <td className="p-3">
                                    <div className="font-bold text-[hsl(var(--foreground))]">{item.itemName}</div>
                                    <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 uppercase tracking-wide">
                                      {item.category} • {item.unit}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right font-medium">
                                    <div>{item.plannedQuantity?.toLocaleString('en-IN')}</div>
                                    <div className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">₹{item.plannedAmount?.toLocaleString('en-IN')}</div>
                                  </td>
                                  <td className="p-3 text-right font-medium">
                                    <div className="font-bold text-[hsl(var(--foreground))]">{item.consumedQuantity?.toLocaleString('en-IN')}</div>
                                    <div className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">₹{item.consumedAmount?.toLocaleString('en-IN')}</div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className={cn('font-medium', item.remainingQuantity < 0 ? 'text-red-500 font-bold' : 'text-[hsl(var(--muted-foreground))]')}>
                                      {item.remainingQuantity?.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">₹{item.remainingAmount?.toLocaleString('en-IN')}</div>
                                  </td>
                                  <td className="p-3 text-right font-mono font-bold">
                                    {item.variancePercentage > 0 ? (
                                      <span className="text-red-500">+{item.variancePercentage}%</span>
                                    ) : item.variancePercentage < 0 ? (
                                      <span className="text-emerald-500">{item.variancePercentage}%</span>
                                    ) : (
                                      <span className="text-[hsl(var(--muted-foreground))]">0%</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border whitespace-nowrap',
                                        item.status === 'over_budget' && 'bg-red-50 text-red-700 border-red-200',
                                        item.status === 'completed' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                        item.status === 'on_track' && 'bg-blue-50 text-blue-700 border-blue-200',
                                        item.status === 'in_progress' && 'bg-amber-50 text-amber-700 border-amber-200',
                                        item.status === 'not_started' && 'bg-slate-50 text-slate-700 border-slate-200'
                                      )}
                                    >
                                      {item.status?.replace('_', ' ')}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Excel Import */}
      <AnimatePresence>
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-sm font-black text-[hsl(var(--foreground))] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Import BOQ Excel Sheet
                </h3>
                <button onClick={() => setIsImportOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleExcelImport}>
                <div className="p-5 space-y-4">
                  <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    Upload your architecture spreadsheet (.xlsx or .xls). Columns will automatically map for Category, Item Name, Quantity, Unit, and Rate.
                  </p>

                  <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-emerald-500/50 transition-colors relative cursor-pointer bg-[hsl(var(--background))]">
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
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={importing}>
                    {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Import & Process
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Create Manual BOQ */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden flex flex-col h-[85vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))] shrink-0">
                <h3 className="text-sm font-black text-[hsl(var(--foreground))]">Manual BOQ Entry</h3>
                <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleManualCreate} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Revision Notes</label>
                    <Input placeholder="e.g. Initial draft layout base price calculations" value={newBoqNotes} onChange={(e) => setNewBoqNotes(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">BOQ Line Items ({newItems.length})</span>
                      <Button variant="outline" size="sm" type="button" onClick={addNewItemRow} className="text-xs h-7 px-2.5">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                      </Button>
                    </div>

                    <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-bold border-b">
                            <th className="p-2 w-10 text-center">#</th>
                            <th className="p-2 w-32">Category</th>
                            <th className="p-2">Item Name</th>
                            <th className="p-2 w-20 text-right">Quantity</th>
                            <th className="p-2 w-20 text-center">Unit</th>
                            <th className="p-2 w-28 text-right">Unit Rate (₹)</th>
                            <th className="p-2 w-12 text-center" />
                          </tr>
                        </thead>
                        <tbody>
                          {newItems.map((item, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2 text-center font-mono text-[hsl(var(--muted-foreground))]">{item.serialNumber}</td>
                              <td className="p-2">
                                <Input
                                  list="boq-categories"
                                  className="h-8 py-1"
                                  placeholder="Type or select category..."
                                  value={item.category}
                                  onChange={(e) => updateNewItemField(idx, 'category', e.target.value)}
                                />
                                <datalist id="boq-categories">
                                  {/* WBS & Default Categories */}
                                  <option value="Flooring" />
                                  <option value="Woodwork" />
                                  <option value="False Ceiling" />
                                  <option value="Painting" />
                                  <option value="Electrical Works" />
                                  <option value="Plumbing" />
                                  <option value="HVAC" />
                                  <option value="Masonry" />
                                  <option value="Design & Planning" />
                                  <option value="Architectural Design" />
                                  <option value="Space Planning" />
                                  <option value="3D Visualization" />
                                  <option value="Material Selection" />
                                  <option value="Civil Works" />
                                  <option value="Demolition" />
                                  <option value="Waterproofing" />
                                  <option value="Carpentry" />
                                  <option value="Kitchen" />
                                  <option value="Wardrobe" />
                                  <option value="TV Unit" />
                                  <option value="Handover" />
                                  <option value="Other" />
                                </datalist>
                              </td>
                              <td className="p-2">
                                <Input required placeholder="Item / material specifications" value={item.itemName} onChange={(e) => updateNewItemField(idx, 'itemName', e.target.value)} className="h-8 py-1" />
                              </td>
                              <td className="p-2">
                                <Input type="number" required min={0.01} step="any" value={item.quantity} onChange={(e) => updateNewItemField(idx, 'quantity', parseFloat(e.target.value) || 0)} className="h-8 py-1 text-right" />
                              </td>
                              <td className="p-2">
                                <Input required placeholder="sqft" value={item.unit} onChange={(e) => updateNewItemField(idx, 'unit', e.target.value)} className="h-8 py-1 text-center" />
                              </td>
                              <td className="p-2">
                                <Input type="number" required min={0} step="any" value={item.rate} onChange={(e) => updateNewItemField(idx, 'rate', parseFloat(e.target.value) || 0)} className="h-8 py-1 text-right" />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeNewItemRow(idx)}
                                  disabled={newItems.length === 1}
                                  className="p-1 rounded text-red-500 hover:bg-red-50 hover:bg-opacity-80 disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] shrink-0">
                  <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create BOQ version</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Rejection Reason */}
      <AnimatePresence>
        {isRejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-sm font-black text-[hsl(var(--foreground))]">Specify Rejection Reason</h3>
                <button onClick={() => setIsRejectOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Comments</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
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
                <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!rejectReason || submittingAction} onClick={() => handleApprovalAction('reject', rejectReason)}>
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
