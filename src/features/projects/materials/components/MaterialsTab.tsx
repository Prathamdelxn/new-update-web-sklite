'use client';
import { tr, getLang } from '@/i18n';
import { projectCurrency } from '@/lib/projectCurrency';

import React, { useState, useEffect, useMemo } from 'react';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import {
  Package,
  ShoppingCart,
  ClipboardList,
  FileCheck,
  History,
  Plus,
  Search,
  Loader2,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  MinusCircle,
  PlusCircle,
  Truck,
  CreditCard,
  Zap,
  X,
  CheckCircle2,
  Trash2,
  Printer,
  XCircle,
  ScrollText,
  PackageCheck,
  Lock,
  Pencil,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency, formatCompact, MAX_INPUT_VALUE } from '@/lib/utils';
import api from '@/services/api.client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission, hasAnyProjectPermissionPrefix, isProjectLocked } from '@/lib/permissions';
import { MaterialModal } from '@/features/projects/materials/components/MaterialModal';
import { MaterialRequestModal } from '@/features/projects/materials/components/MaterialRequestModal';
import { MaterialReceiptModal } from '@/features/projects/materials/components/MaterialReceiptModal';
import { MaterialPurchaseModal } from '@/features/projects/materials/components/MaterialPurchaseModal';
import { MaterialUsageModal } from '@/features/projects/materials/components/MaterialUsageModal';

interface MaterialsTabProps {
  projectId: string;
}

const subTabs = [
  { id: 'all', name: 'All', icon: Package },
  { id: 'low-stock', name: 'Low Stock', icon: Package },
  { id: 'out-of-stock', name: 'Out of Stock', icon: Package },
  { id: 'requests', name: 'Requests', icon: ClipboardList },
  { id: 'purchase', name: 'Purchases', icon: ShoppingCart },
  { id: 'receipts', name: 'Receipts', icon: FileCheck },
  { id: 'usage', name: 'Usage Logs', icon: History },
  { id: 'activity', name: 'Log History', icon: ScrollText },
];

const PO_STATUS_COLORS: Record<string, string> = {
  'Approved':        'text-emerald-700 bg-emerald-100 border-emerald-200',
  'Rejected':        'text-red-700 bg-red-100 border-red-200',
  'Pending Approval':'text-amber-700 bg-amber-100 border-amber-200',
  'Pending':         'text-amber-700 bg-amber-100 border-amber-200',
  'Active':          'text-blue-700 bg-blue-100 border-blue-200',
};

export const MaterialsTab: React.FC<MaterialsTabProps> = ({ projectId }) => {
  const { project } = useProjectContext();
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'Admin' || (user?.role?.permissions?.includes('*') ?? false);
  const isLocked = isProjectLocked(project);
  const canView = isAdmin || hasAnyProjectPermissionPrefix(user, project, 'inventory:');
  const canCreate = !isLocked && (isAdmin || hasProjectPermission(user, project, 'inventory:create'));
  const canUpdate = !isLocked && (isAdmin || hasProjectPermission(user, project, 'inventory:update'));
  const canDelete = !isLocked && (isAdmin || hasProjectPermission(user, project, 'inventory:delete'));
  const canApprove = !isLocked && (isAdmin || hasProjectPermission(user, project, 'inventory:approve'));
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [materials, setMaterials] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const received = m.totalReceived || 0;
      const consumed = m.totalConsumed || 0;
      const balance = received - consumed;
      
      if (activeSubTab === 'low-stock') {
        return matchesSearch && balance > 0 && balance < 10;
      }
      if (activeSubTab === 'out-of-stock') {
        return matchesSearch && balance <= 0;
      }
      return matchesSearch;
    });
  }, [materials, searchQuery, activeSubTab]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'stock-in' | 'stock-out' | 'edit'>('create');
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [checkedRequestIds, setCheckedRequestIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingPOId, setUpdatingPOId] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const toast = useToast();

  const fetchMaterials = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/materials`);
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error(tr("Failed to load materials"));
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/material-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error(tr("Failed to load material requests"));
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/material-receipts`);
      setReceipts(response.data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error(tr("Failed to load material receipts"));
    }
  };

  const fetchPurchases = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/material-purchase`);
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error(tr("Failed to load purchase orders"));
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/material-usage`);
      setUsageLogs(response.data);
    } catch (error) {
      console.error('Error fetching usage:', error);
      toast.error(tr("Failed to load usage logs"));
    }
  };

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const [reqRes, poRes, rcptRes, usageRes] = await Promise.all([
        api.get(`/projects/${projectId}/material-requests`),
        api.get(`/projects/${projectId}/material-purchase`),
        api.get(`/projects/${projectId}/material-receipts`),
        api.get(`/projects/${projectId}/material-usage`),
      ]);
      const entries: any[] = [
        ...(Array.isArray(reqRes.data) ? reqRes.data : []).map((r: any) => ({ ...r, _type: 'request' })),
        ...(Array.isArray(poRes.data) ? poRes.data : []).map((p: any) => ({ ...p, _type: 'purchase' })),
        ...(Array.isArray(rcptRes.data) ? rcptRes.data : []).map((r: any) => ({ ...r, _type: 'receipt' })),
        ...(Array.isArray(usageRes.data) ? usageRes.data : []).map((u: any) => ({ ...u, _type: 'usage' })),
      ];
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActivityFeed(entries);
    } catch { toast.error(tr("Failed to load activity log")); }
    finally { setActivityLoading(false); }
  };

  const openHistory = async (material: any) => {
    setHistoryMaterial(material);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/material-usage`);
      const filtered = (res.data as any[]).filter((log: any) =>
        log.items?.some((item: any) => (item.materialId?._id || item.materialId) === material._id)
      );
      setHistoryLogs(filtered);
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, status: 'Approved' | 'Rejected' | 'Fulfilled') => {
    if (isLocked) { toast.error(tr("This project is locked and can no longer be modified.")); return; }
    setUpdatingRequestId(requestId);
    try {
      await api.patch(`/material-requests/${requestId}`, { status });
      toast.success(`Request ${status.toLowerCase()}`);
      if (selectedRequest?._id === requestId) {
        setSelectedRequest((r: any) => r ? { ...r, status } : r);
      }
      fetchRequests();
    } catch {
      toast.error(tr("Failed to {{status}} request", { status: status.toLowerCase() }));
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const handleVerifyReceipt = async (receiptId: string) => {
    if (isLocked) { toast.error(tr("This project is locked and can no longer be modified.")); return; }
    try {
      await api.patch(`/projects/${projectId}/material-receipts/${receiptId}`, { status: 'Verified' });
      toast.success(tr("Receipt marked as verified"));
      fetchReceipts();
    } catch {
      toast.error(tr("Failed to verify receipt"));
    }
  };

  const bulkUpdateRequests = async (status: 'Approved' | 'Rejected') => {
    if (isLocked) { toast.error(tr("This project is locked and can no longer be modified.")); return; }
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(checkedRequestIds);
      await Promise.all(
        ids.map((id) => api.patch(`/material-requests/${id}`, { status }))
      );
      toast.success(tr("{{size}} request(s) {{status}}", { size: checkedRequestIds.size, status: status.toLowerCase() }));
      setCheckedRequestIds(new Set());
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || tr("Bulk update failed"));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleRequestCheck = (id: string) => {
    setCheckedRequestIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (isLocked) { toast.error(tr("This project is locked and can no longer be modified.")); return; }
    if (!window.confirm(tr("Delete this material? This cannot be undone."))) return;
    setDeletingId(materialId);
    try {
      await api.delete(`/materials/${materialId}`);
      toast.success(tr("Material deleted"));
      fetchMaterials();
    } catch { toast.error(tr("Failed to delete material")); }
    finally { setDeletingId(null); }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (isLocked) { toast.error(tr("This project is locked and can no longer be modified.")); return; }
    if (!window.confirm(tr("Delete this request?"))) return;
    setDeletingId(requestId);
    try {
      await api.delete(`/material-requests/${requestId}`);
      toast.success(tr("Request deleted"));
      if (selectedRequest?._id === requestId) setSelectedRequest(null);
      fetchRequests();
    } catch { toast.error(tr("Failed to delete request")); }
    finally { setDeletingId(null); }
  };

  const handleDeleteUsageLog = async (logId: string) => {
    if (isLocked) { toast.error(tr("This project is locked and can no longer be modified.")); return; }
    if (!window.confirm(tr("Delete this usage log? Consumed quantities will be restored to stock."))) return;
    setDeletingId(logId);
    try {
      await api.delete(`/projects/${projectId}/material-usage/${logId}`);
      toast.success(tr("Usage log deleted and stock restored"));
      await Promise.all([fetchUsage(), fetchMaterials()]);
    } catch { toast.error(tr("Failed to delete usage log")); }
    finally { setDeletingId(null); }
  };

  const handleDeletePO = async (purchaseId: string) => {
    if (isLocked) { toast.error(tr("This project is locked and can no longer be modified.")); return; }
    if (!window.confirm(tr("Delete this material purchase?"))) return;
    setDeletingId(purchaseId);
    try {
      await api.delete(`/projects/${projectId}/material-purchase/${purchaseId}`);
      toast.success(tr("Material purchase deleted"));
      setSelectedPO(null);
      fetchPurchases();
    } catch { toast.error(tr("Failed to delete material purchase")); }
    finally { setDeletingId(null); }
  };

  const handleUpdatePOStatus = async (purchaseId: string, status: 'Approved' | 'Rejected') => {
    if (isLocked) { toast.error(tr("This project is locked and can no longer be modified.")); return; }
    setUpdatingPOId(purchaseId);
    try {
      await api.patch(`/projects/${projectId}/material-purchase/${purchaseId}`, { status });
      toast.success(tr("Material purchase {{status}}", { status: status.toLowerCase() }));
      setSelectedPO((po: any) => po ? { ...po, status } : po);
      fetchPurchases();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || tr("Failed to {{status}} material purchase", { status: status.toLowerCase() }));
    }
    finally { setUpdatingPOId(null); }
  };

  const printReceipt = (receipt: any) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rtl = getLang() === 'ar';
    const rows = receipt.items.map((item: any) =>
      `<tr><td style="border:1px solid #ccc;padding:8px">${item.materialId?.name || tr('Item')}</td><td style="border:1px solid #ccc;padding:8px">${item.quantity} ${tr(item.unit)}</td></tr>`
    ).join('');
    win.document.write(`<!DOCTYPE html><html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}"><head><title>GRN-${receipt._id.slice(-6).toUpperCase()}</title>
<style>body{font-family:${rtl ? "'Segoe UI',Tahoma,'Noto Sans Arabic',Arial,sans-serif" : 'sans-serif'};padding:24px;color:#111}h2{margin:0 0 4px}p{margin:4px 0}table{border-collapse:collapse;width:100%;margin-top:12px}th{background:#f3f4f6;border:1px solid #ccc;padding:8px;text-align:start}</style>
</head><body>
<h2>${tr('Goods Receipt Note')} — GRN-${receipt._id.slice(-6).toUpperCase()}</h2>
<p>${tr('Date:')} ${new Date(receipt.createdAt).toLocaleDateString()}</p>
<p>${tr('Vendor:')} ${receipt.vendorName}</p>
<p>${tr('Challan:')} ${receipt.challanNumber}${receipt.invoiceNumber ? ` &nbsp;|&nbsp; ${tr('Invoice:')} ${receipt.invoiceNumber}` : ''}</p>
<p>${tr('Status:')} ${tr(receipt.status)}</p>
<table><thead><tr><th style="border:1px solid #ccc;padding:8px">${tr('Material')}</th><th style="border:1px solid #ccc;padding:8px">${tr('Quantity')}</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`);
    win.document.close();
    win.print();
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (['all', 'low-stock', 'out-of-stock'].includes(activeSubTab)) {
        await fetchMaterials();
      } else if (activeSubTab === 'requests') {
        await Promise.all([fetchMaterials(), fetchRequests()]);
      } else if (activeSubTab === 'receipts') {
        await Promise.all([fetchMaterials(), fetchReceipts()]);
      } else if (activeSubTab === 'purchase') {
        await Promise.all([fetchMaterials(), fetchPurchases()]);
      } else if (activeSubTab === 'usage') {
        await Promise.all([fetchMaterials(), fetchUsage()]);
      } else if (activeSubTab === 'activity') {
        await fetchActivity();
      }
      setLoading(false);
    };
    loadData();
  }, [projectId, activeSubTab]);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-slate-500">{tr("You don't have permission to view the Materials & Inventory module.")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 w-full sm:w-fit shadow-2xs">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
              activeSubTab === tab.id
                ? "bg-white text-blue-700 shadow-2xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tr(tab.name)}</span>
          </button>
        ))}
      </div>

      {['all', 'low-stock', 'out-of-stock'].includes(activeSubTab) && (
        <div className="space-y-6">
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            <div className="p-4.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tr("Total Materials")}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{materials.length}</p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tr("Low Stock Items")}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {materials.filter(m => {
                  const stock = m.currentStock ?? ((m.totalReceived || 0) - (m.totalConsumed || 0));
                  const min = m.minimumStock ?? m.minStock ?? 0;
                  return stock <= min && stock >= 0;
                }).length}
              </p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tr("Total Received")}</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 break-all">
                {formatCompact(materials.reduce((sum, m) => sum + (m.totalReceived || 0), 0))}
              </p>
            </div>
            <div className="p-4.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tr("Total Consumed")}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1 break-all">
                {formatCompact(materials.reduce((sum, m) => sum + (m.totalConsumed || 0), 0))}
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder={tr("Search materials...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 ps-10 pe-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                />
              </div>

              <div className="flex items-center space-x-3">
                {canCreate && (
                <button
                  onClick={() => {
                    setModalMode('create');
                    setSelectedMaterial(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{tr("New Material")}</span>
                </button>
                )}
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <SkeletonLoader loading={loading} preset="table">{(!loading && materials.length > 0) || !loading ? (
            <div>
              {/* Stacked Cards for Mobile (< md) */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredMaterials.map((material) => {
                  const received = material.totalReceived || 0;
                  const consumed = material.totalConsumed || 0;
                  const rawStock = received - consumed;
                  const stock = Math.max(0, rawStock);
                  const overConsumed = rawStock < 0;
                  const pct = received > 0 ? Math.max(0, Math.min(100, (stock / received) * 100)) : 0;
                  const isLow = !overConsumed && stock <= (material.minimumStock ?? material.minStock ?? 0);

                  return (
                    <GlassCard key={material._id} className="p-4 border-gray-200 shadow-none" gradient>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 animate-pulse-subtle">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 leading-tight truncate" title={material.name}>{tr(material.name)}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">
                              {tr("Unit: ")}<span className="px-1.5 py-0.5 rounded bg-gray-100 text-[9px] font-bold text-slate-500 ms-1">{tr(material.unit)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 min-w-0 max-w-[45%]">
                          {overConsumed ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 border border-red-200 text-red-600 uppercase tracking-wide">{tr("Over-consumed")}</span>
                          ) : (
                            <>
                              <span className={cn('text-sm font-bold break-all text-end', isLow ? 'text-red-600' : 'text-gray-900')}>{formatCompact(stock)}{tr(" In Stock")}</span>
                              <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                                <div className={cn('h-full rounded-full', isLow ? 'bg-red-400' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-gray-100 bg-gray-50/50 -mx-4 px-4 py-2">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">{tr("Received:")}</span>
                          <span className="text-xs font-bold text-emerald-600 break-all">{formatCompact(received)}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 justify-end min-w-0">
                          <ArrowUpRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">{tr("Consumed:")}</span>
                          <span className="text-xs font-bold text-red-600 break-all">{formatCompact(consumed)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-2">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                          {tr("Updated: ")}{new Date(material.updatedAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          {canUpdate && (
                          <button
                            onClick={() => {
                              setModalMode('stock-in');
                              setSelectedMaterial(material);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-100 bg-emerald-50/50"
                            title={tr("Stock In")}
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          )}
                          {canUpdate && (
                          <button
                            onClick={() => {
                              setModalMode('stock-out');
                              setSelectedMaterial(material);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-all border border-red-100 bg-red-50/50"
                            title={tr("Stock Out")}
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          )}
                          <button
                            onClick={() => openHistory(material)}
                            title={tr("Usage History")}
                            className="p-1.5 text-slate-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all border border-gray-200 bg-white"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {canUpdate && (
                          <button
                            onClick={() => {
                              setModalMode('edit');
                              setSelectedMaterial(material);
                              setIsModalOpen(true);
                            }}
                            title={tr("Edit Material")}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-gray-200 bg-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          )}
                          {canDelete && (
                          <button
                            onClick={() => handleDeleteMaterial(material._id)}
                            disabled={deletingId === material._id}
                            title={tr("Delete Material")}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40 border border-gray-200 bg-white"
                          >
                            {deletingId === material._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>

              {/* Desktop Table (hidden on mobile, visible md+) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-start border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tr("Material Name")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">{tr("Unit")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-end">{tr("Received")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-end">{tr("Consumed")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-end">{tr("In Stock")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map((material) => (
                      <tr key={material._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                              <Package className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate max-w-[220px]" title={material.name}>{tr(material.name)}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{tr("Last updated: ")}{new Date(material.updatedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-bold text-slate-500">
                            {tr(material.unit)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-end max-w-[140px]">
                          <div className="flex items-center justify-end space-x-1 min-w-0">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="text-sm font-bold text-emerald-600 break-all">{formatCompact(material.totalReceived || 0)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-end max-w-[140px]">
                          <div className="flex items-center justify-end space-x-1 min-w-0">
                            <ArrowUpRight className="w-3 h-3 text-red-500 shrink-0" />
                            <span className="text-sm font-bold text-red-600 break-all">{formatCompact(material.totalConsumed || 0)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-end max-w-[140px]">
                          <div className="flex flex-col items-end min-w-0">
                            {(() => {
                              const received = material.totalReceived || 0;
                              const consumed = material.totalConsumed || 0;
                              const rawStock = received - consumed;
                              const stock = Math.max(0, rawStock);
                              const overConsumed = rawStock < 0;
                              const pct = received > 0 ? Math.max(0, Math.min(100, (stock / received) * 100)) : 0;
                              const isLow = !overConsumed && stock <= (material.minimumStock ?? material.minStock ?? 0);
                              return (
                                <>
                                  {overConsumed ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 border border-red-200 text-red-600 uppercase tracking-wide">{tr("Over-consumed")}</span>
                                  ) : (
                                    <>
                                      <span className={cn('text-lg font-bold break-all text-end', isLow ? 'text-red-600' : 'text-gray-900')}>{formatCompact(stock)}</span>
                                      <div className="h-1 w-16 bg-gray-200 rounded-full overflow-hidden mt-1">
                                        <div className={cn('h-full rounded-full', isLow ? 'bg-red-400' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                                      </div>
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-end">
                          <div className="flex items-center justify-end space-x-1">
                            {/* <button
                              onClick={() => {
                                setModalMode('stock-in');
                                setSelectedMaterial(material);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                              title="Stock In"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setModalMode('stock-out');
                                setSelectedMaterial(material);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                              title="Stock Out"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openHistory(material)}
                              title="Usage History"
                              className="p-2 text-slate-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                            >
                              <History className="w-4 h-4" />
                            </button> */}
                            {canUpdate && (
                            <button
                              onClick={() => {
                                setModalMode('edit');
                                setSelectedMaterial(material);
                                setIsModalOpen(true);
                              }}
                              title={tr("Edit Material")}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            )}
                            {canDelete && (
                            <button
                              onClick={() => handleDeleteMaterial(material._id)}
                              disabled={deletingId === material._id}
                              title={tr("Delete Material")}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                            >
                              {deletingId === material._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {materials.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                          {tr("No materials in inventory for this project.")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}</SkeletonLoader>
        </div>
      )}

      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200 shadow-none" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900">{tr("Material Requests")}</h3>
                <p className="text-xs text-slate-500">{tr("Track and manage project material requisitions.")}</p>
              </div>
              <div className="flex items-center space-x-3">
                {canCreate && (
                <button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl text-sm font-bold text-white hover:bg-blue-500 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tr("New Request")}</span>
                </button>
                )}
              </div>
            </div>
          </GlassCard>

          {checkedRequestIds.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <span className="text-sm font-bold text-blue-700">{tr(checkedRequestIds.size)}{tr(" request")}{checkedRequestIds.size > 1 ? 's' : ''}{tr(" selected")}</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => bulkUpdateRequests('Approved')}
                  disabled={isBulkUpdating}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  <span>{tr("Approve")}</span>
                </button>
                <button
                  onClick={() => bulkUpdateRequests('Rejected')}
                  disabled={isBulkUpdating}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                  <span>{tr("Reject")}</span>
                </button>
                <button
                  onClick={() => setCheckedRequestIds(new Set())}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-slate-500 hover:text-gray-900 transition-all"
                >
                  {tr("Clear")}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonLoader loading={true} preset="card-grid"><div /></SkeletonLoader>
          ) : requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.map((request) => (
                <GlassCard key={request._id} className="p-6 border-gray-200 hover:border-blue-500/30 transition-all shadow-none" gradient>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={checkedRequestIds.has(request._id)}
                        onChange={() => toggleRequestCheck(request._id)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer mt-1"
                      />
                      <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{tr("REQ-")}{request._id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      request.status === 'Approved'   ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                      request.status === 'Fulfilled'  ? 'text-blue-700 bg-blue-100 border-blue-200' :
                      request.status === 'Rejected'   ? 'text-red-700 bg-red-100 border-red-200' :
                      'text-amber-700 bg-amber-100 border-amber-200'
                    )}>
                      {tr(request.status)}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    {request.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">{item.materialId?.name || tr("Unknown Material")}</span>
                        <span className="font-bold text-gray-900">{item.quantity} {tr(item.unit)}</span>
                      </div>
                    ))}
                  </div>

                  {request.commonNote && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 mb-6">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">{tr("Note")}</p>
                      <p className="text-xs text-slate-600 italic">"{tr(request.commonNote)}"</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {request.requestedByName?.charAt(0) || 'U'}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{tr(request.requestedByName)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {request.status === 'Pending' && canApprove && (
                        <>
                          <button
                            onClick={() => handleUpdateRequestStatus(request._id, 'Rejected')}
                            disabled={updatingRequestId === request._id}
                            title={tr("Reject")}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateRequestStatus(request._id, 'Approved')}
                            disabled={updatingRequestId === request._id}
                            title={tr("Approve")}
                            className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            {updatingRequestId === request._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                      {request.status === 'Approved' && canUpdate && (
                        <button
                          onClick={() => handleUpdateRequestStatus(request._id, 'Fulfilled')}
                          disabled={updatingRequestId === request._id}
                          title={tr("Mark Fulfilled")}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white text-[10px] font-bold transition-all disabled:opacity-50"
                        >
                          {updatingRequestId === request._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                          {tr("Fulfill")}
                        </button>
                      )}
                      {canDelete && (
                      <button
                        onClick={() => handleDeleteRequest(request._id)}
                        disabled={deletingId === request._id}
                        title={tr("Delete")}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        {deletingId === request._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      )}
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                      >{tr("Details →")}</button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">{tr("No requests found")}</h3>
              <p className="text-slate-500 max-w-xs">{tr("There are no material requests for this project yet.")}</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'receipts' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200 shadow-none" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900">{tr("Material Received")}</h3>
                <p className="text-xs text-slate-500">{tr("Log and verify incoming material deliveries.")}</p>
              </div>
              <div className="flex items-center space-x-3">
                {canCreate && (
                <button
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 border border-emerald-500 rounded-xl text-sm font-bold text-white hover:bg-emerald-500 transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{tr("Log Receipt")}</span>
                </button>
                )}
              </div>
            </div>
          </GlassCard>

          {loading ? (
            <SkeletonLoader loading={true} preset="table"><div /></SkeletonLoader>
          ) : receipts.length > 0 ? (
            <div>
              {/* Stacked Cards for Mobile (< md) */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {receipts.map((receipt) => (
                  <GlassCard key={receipt._id} className="p-4 border-gray-200 shadow-none" gradient>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{tr("GRN-")}{receipt._id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {new Date(receipt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                        receipt.status === 'Verified' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                        receipt.status === 'Rejected' ? 'text-red-700 bg-red-100 border-red-200' :
                        'text-amber-700 bg-amber-100 border-amber-200'
                      )}>
                        {tr(receipt.status)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-bold text-slate-700 truncate">{tr(receipt.vendorName)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-bold uppercase ps-6">
                        <span>{tr("Challan: ")}{tr(receipt.challanNumber)}</span>
                        {receipt.invoiceNumber && <span>{tr("Invoice: ")}{tr(receipt.invoiceNumber)}</span>}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{tr("Items Received")}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {receipt.items.map((item: any, i: number) => (
                          <span key={i} className="px-2 py-1 rounded bg-gray-50 border border-gray-200 text-[10px] font-bold text-slate-600">
                            {item.materialId?.name || tr("Item")}: {item.quantity} {tr(item.unit)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {receipt.commonNote && (
                      <div className="mt-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 font-bold">{tr("Notes")}</p>
                        <p className="text-xs text-slate-500 italic">"{tr(receipt.commonNote)}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                      <div>
                        {receipt.status !== 'Verified' ? (
                          <button
                            onClick={() => handleVerifyReceipt(receipt._id)}
                            className="flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors border border-emerald-100 bg-emerald-50/50 px-2.5 py-1.5 rounded-lg"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{tr("Verify Receipt")}</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{tr("Verified")}</span>
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => printReceipt(receipt)}
                        title={tr("Print Receipt")}
                        className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-gray-900 transition-all border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{tr("Print GRN")}</span>
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Desktop Table (hidden on mobile, visible md+) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-start border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tr("Receipt Info")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tr("Vendor & Docs")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tr("Items Received")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">{tr("Status")}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{tr("GRN-")}{receipt._id.slice(-6).toUpperCase()}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{new Date(receipt.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <Truck className="w-3 h-3 text-slate-400" />
                              <span className="text-sm font-medium text-slate-600">{tr(receipt.vendorName)}</span>
                            </div>
                            <div className="flex items-center space-x-4 text-[10px] text-slate-500 font-bold uppercase">
                              <span>{tr("Challan: ")}{tr(receipt.challanNumber)}</span>
                              {receipt.invoiceNumber && <span>{tr("Invoice: ")}{tr(receipt.invoiceNumber)}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {receipt.items.map((item: any, i: number) => (
                              <span key={i} className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-bold text-slate-500">
                                {item.materialId?.name || tr("Item")}: {item.quantity} {tr(item.unit)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                            receipt.status === 'Verified' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                            receipt.status === 'Rejected' ? 'text-red-700 bg-red-100 border-red-200' :
                            'text-amber-700 bg-amber-100 border-amber-200'
                          )}>
                            {tr(receipt.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-end">
                          <div className="flex items-center justify-end space-x-2">
                            {receipt.status !== 'Verified' ? (
                              <button
                                onClick={() => handleVerifyReceipt(receipt._id)}
                                className="flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{tr("Verify")}</span>
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{tr("Verified")}</span>
                              </span>
                            )}
                            <button
                              onClick={() => printReceipt(receipt)}
                              title={tr("Print Receipt")}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileCheck className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">{tr("No receipts found")}</h3>
              <p className="text-slate-500 max-w-xs">{tr("Record incoming material deliveries using the GRN form.")}</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'purchase' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200 shadow-none" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900">{tr("Purchase Orders")}</h3>
                <p className="text-xs text-slate-500">{tr("Formal procurement requests to vendors.")}</p>
              </div>
              {canCreate && (
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl text-sm font-bold text-white hover:bg-blue-500 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{tr("Create PO")}</span>
              </button>
              )}
            </div>
          </GlassCard>

          {loading ? (
            <SkeletonLoader loading={true} preset="card-grid"><div /></SkeletonLoader>
          ) : purchases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {purchases.map((po) => (
                <GlassCard key={po._id} className="p-6 border-gray-200 shadow-none" gradient>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{tr(po.poNumber)}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{tr(po.vendorName)}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                      PO_STATUS_COLORS[po.status] || 'text-blue-700 bg-blue-100 border-blue-200'
                    )}>
                      {po.status || tr("Active")}
                    </span>
                  </div>
                  <div className="space-y-2 mb-6">
                    {po.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-500">{tr(item.materialId?.name)}</span>
                        <span className="text-gray-900 font-bold">{item.quantity} {tr(item.unit)} {(item.unitPrice || item.unitCost) ? `· ${formatCurrency((item.unitPrice || item.unitCost) * item.quantity, projectCurrency(project as any))}` : ''}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{tr("Total Amount")}</span>
                       <span className="text-sm font-bold text-emerald-600">{(po.grandTotal ?? po.totalAmount) != null ? formatCurrency(po.grandTotal ?? po.totalAmount, projectCurrency(project as any)) : '—'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {po.status !== 'Approved' ? (
                        canDelete && (
                        <button
                          onClick={() => handleDeletePO(po._id)}
                          disabled={deletingId === po._id}
                          title={tr("Delete PO")}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          {deletingId === po._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                        )
                      ) : (
                        <span title={tr("Approved POs cannot be deleted")} className="p-1.5 text-slate-300 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedPO(po)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                      >{tr("View PO →")}</button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-slate-500">{tr("No purchase orders found.")}</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'usage' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200 shadow-none" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900">{tr("Usage Log")}</h3>
                <p className="text-xs text-slate-500">{tr("Track on-site material consumption.")}</p>
              </div>
              {canCreate && (
              <button
                onClick={() => setIsUsageModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>{tr("Log Consumption")}</span>
              </button>
              )}
            </div>
          </GlassCard>

          {loading ? (
            <SkeletonLoader loading={true} preset="table"><div /></SkeletonLoader>
          ) : usageLogs.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tr("Date & User")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tr("Location / Work")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{tr("Materials Consumed")}</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {usageLogs.map((log) => (
                    <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{new Date(log.createdAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{tr(log.usedByName)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 font-medium">{log.locationOrTask || '—'}</p>
                        {log.commonNote && <p className="text-[10px] text-slate-500 italic mt-0.5">{tr(log.commonNote)}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {log.items.map((item: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-purple-100 border border-purple-200 text-[10px] font-bold text-purple-700">
                              {tr(item.materialId?.name)}: {item.quantity} {tr(item.unit)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-end">
                        {/* Logs created by a milestone task submission belong to that task — no delete here */}
                        {log.source === 'task' ? (
                          <span
                            title={tr("Logged from a milestone task — cannot be deleted here")}
                            className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                          >
                            {tr("From task")}
                          </span>
                        ) : canDelete && (
                        <button
                          onClick={() => handleDeleteUsageLog(log._id)}
                          disabled={deletingId === log._id}
                          title={tr("Delete log (restores stock)")}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          {deletingId === log._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <History className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-slate-500">{tr("No usage logs found.")}</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'activity' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200 shadow-none" gradient>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{tr("Activity Log")}</h3>
              <p className="text-xs text-slate-500">{tr("All material activity — requests, purchases, receipts, and consumption — in chronological order.")}</p>
            </div>
          </GlassCard>

          {activityLoading ? (
            <SkeletonLoader loading={true} preset="list"><div /></SkeletonLoader>
          ) : activityFeed.length > 0 ? (
            <div className="space-y-3">
              {activityFeed.map((entry) => {
                const typeConfig = {
                  request: { icon: ClipboardList, bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-600', label: 'Material Request', idLabel: `REQ-${entry._id?.slice(-6).toUpperCase()}` },
                  purchase: { icon: ShoppingCart, bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-600', label: 'Purchase Order', idLabel: entry.poNumber || `PO-${entry._id?.slice(-6).toUpperCase()}` },
                  receipt:  { icon: FileCheck, bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-600', label: 'Goods Receipt (GRN)', idLabel: `GRN-${entry._id?.slice(-6).toUpperCase()}` },
                  usage:    { icon: Zap, bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-600', label: 'Material Usage', idLabel: entry.locationOrTask || 'Usage' },
                }[entry._type as string] || { icon: ScrollText, bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', label: 'Activity', idLabel: entry._id };

                const Icon = typeConfig.icon;
                const statusBadge = entry.status ? (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border',
                    entry.status === 'Approved' || entry.status === 'Verified' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                    entry.status === 'Rejected' ? 'text-red-700 bg-red-100 border-red-200' :
                    entry.status === 'Fulfilled' ? 'text-blue-700 bg-blue-100 border-blue-200' :
                    'text-amber-700 bg-amber-100 border-amber-200'
                  )}>{tr(entry.status)}</span>
                ) : null;

                const summaryItems: string[] = entry._type === 'usage'
                  ? (entry.items || []).map((it: any) => `${it.materialId?.name || 'Item'}: −${it.quantity} ${it.unit}`)
                  : (entry.items || []).map((it: any) => `${it.materialId?.name || 'Item'}: ${it.quantity} ${it.unit}`);

                return (
                  <div key={`${entry._type}-${entry._id}`} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-200 transition-all">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', typeConfig.bg, typeConfig.border)}>
                      <Icon className={cn('w-5 h-5', typeConfig.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tr(typeConfig.label)}</span>
                        {tr(statusBadge)}
                      </div>
                      <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{tr(typeConfig.idLabel)}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {summaryItems.slice(0, 4).map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold text-slate-500">{tr(s)}</span>
                        ))}
                        {summaryItems.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold text-slate-400">+{summaryItems.length - 4}{tr(" more")}</span>
                        )}
                      </div>
                      {(entry.vendorName || entry.requestedByName || entry.usedByName || entry.commonNote) && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {entry.vendorName && `Vendor: ${entry.vendorName}`}
                          {entry.requestedByName && `By: ${entry.requestedByName}`}
                          {entry.usedByName && `By: ${entry.usedByName}`}
                          {entry.commonNote && ` · "${entry.commonNote}"`}
                        </p>
                      )}
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-[10px] font-bold text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl">
              <ScrollText className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">{tr("No activity yet")}</h3>
              <p className="text-slate-500">{tr("Material activity will appear here once requests, purchases, receipts, or usage logs are created.")}</p>
            </div>
          )}
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg relative z-10 flex flex-col max-h-[85vh]"
          >
            <GlassCard className="flex flex-col overflow-hidden border-gray-200 max-h-[85vh]" gradient>
              <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{tr("REQ-")}{selectedRequest._id.slice(-6).toUpperCase()}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(selectedRequest.createdAt).toLocaleDateString()}{tr(" · by ")}{tr(selectedRequest.requestedByName)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                    selectedRequest.status === 'Approved'  ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                    selectedRequest.status === 'Fulfilled' ? 'text-blue-700 bg-blue-100 border-blue-200' :
                    selectedRequest.status === 'Rejected'  ? 'text-red-700 bg-red-100 border-red-200' :
                    'text-amber-700 bg-amber-100 border-amber-200'
                  )}>{tr(selectedRequest.status)}</span>
                  <button onClick={() => setSelectedRequest(null)} className="p-2 rounded-xl hover:bg-gray-100 text-slate-400 hover:text-gray-900 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{tr("Requested Items")}</p>
                  <div className="space-y-2">
                    {selectedRequest.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <span className="text-sm font-semibold text-gray-900">{item.materialId?.name || tr("Material")}</span>
                        <span className="text-sm font-bold text-blue-600">{item.quantity} {tr(item.unit)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedRequest.commonNote && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{tr("Note")}</p>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-slate-600 italic">"{tr(selectedRequest.commonNote)}"</p>
                    </div>
                  </div>
                )}
                {selectedRequest.status === 'Pending' && canApprove && (
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleUpdateRequestStatus(selectedRequest._id, 'Rejected')}
                      disabled={updatingRequestId === selectedRequest._id}
                      className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-50"
                    >
                      {tr("Reject")}
                    </button>
                    <button
                      onClick={() => handleUpdateRequestStatus(selectedRequest._id, 'Approved')}
                      disabled={updatingRequestId === selectedRequest._id}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {updatingRequestId === selectedRequest._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{tr("Approve")}</span>
                    </button>
                  </div>
                )}
                {selectedRequest.status === 'Approved' && canUpdate && (
                  <button
                    onClick={() => handleUpdateRequestStatus(selectedRequest._id, 'Fulfilled')}
                    disabled={updatingRequestId === selectedRequest._id}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {updatingRequestId === selectedRequest._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                    <span>{tr("Mark as Fulfilled")}</span>
                  </button>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {selectedPO && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedPO(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg relative z-10 flex flex-col max-h-[85vh]"
          >
            <GlassCard className="flex flex-col overflow-hidden border-gray-200 max-h-[85vh]" gradient>
              <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{tr(selectedPO.poNumber)}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{tr(selectedPO.vendorName)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200">
                    {selectedPO.status || tr("Active")}
                  </span>
                  <button onClick={() => setSelectedPO(null)} className="p-2 rounded-xl hover:bg-gray-100 text-slate-400 hover:text-gray-900 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{tr("Order Items")}</p>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-start">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr("Material")}</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-end">{tr("Qty")}</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-end">{tr("Unit Cost")}</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-end">{tr("Subtotal")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPO.items?.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.materialId?.name || tr("Material")}</td>
                            <td className="px-4 py-3 text-sm text-end text-slate-600">{item.quantity} {tr(item.unit)}</td>
                            <td className="px-4 py-3 text-sm text-end text-slate-600">{(item.unitPrice ?? item.unitCost) != null ? formatCurrency(item.unitPrice ?? item.unitCost, projectCurrency(project as any)) : '—'}</td>
                            <td className="px-4 py-3 text-sm text-end font-bold text-gray-900">
                              {formatCurrency(item.quantity * (item.unitPrice ?? item.unitCost ?? 0), projectCurrency(project as any))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">{tr("Total Amount")}</span>
                   <span className="text-xl font-bold text-emerald-600">{(selectedPO.grandTotal ?? selectedPO.totalAmount) != null ? formatCurrency(selectedPO.grandTotal ?? selectedPO.totalAmount, projectCurrency(project as any)) : '—'}</span>
                </div>
                {selectedPO.expectedDelivery && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tr("Expected Delivery")}</p>
                      <p className="text-sm font-bold text-gray-900">{new Date(selectedPO.expectedDelivery).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {(selectedPO.status === 'Pending Approval' || selectedPO.status === 'Pending') && canApprove && (
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleUpdatePOStatus(selectedPO._id, 'Rejected')}
                      disabled={updatingPOId === selectedPO._id}
                      className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-50"
                    >
                      {tr("Reject")}
                    </button>
                    <button
                      onClick={() => handleUpdatePOStatus(selectedPO._id, 'Approved')}
                      disabled={updatingPOId === selectedPO._id}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {updatingPOId === selectedPO._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{tr("Approve")}</span>
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {historyMaterial && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setHistoryMaterial(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg relative z-10 flex flex-col max-h-[85vh]"
          >
            <GlassCard className="flex flex-col overflow-hidden border-gray-200 max-h-[85vh]" gradient>
              <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                    <History className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{tr(historyMaterial.name)}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{tr("Usage history")}</p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryMaterial(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-slate-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {historyLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : historyLogs.length > 0 ? (
                  <div className="space-y-3">
                    {historyLogs.map((log: any) => {
                      const item = log.items?.find((it: any) =>
                        (it.materialId?._id || it.materialId) === historyMaterial._id
                      );
                      return (
                        <div key={log._id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{log.locationOrTask || '—'}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                              {new Date(log.createdAt).toLocaleDateString()} · {tr(log.usedByName)}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-purple-600">
                            -{item?.quantity} {tr(item?.unit)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">{tr("No usage history")}</p>
                    <p className="text-xs text-slate-400 mt-1">{tr("This material has not been consumed yet.")}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      <MaterialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchMaterials}
        projectId={projectId}
        initialData={selectedMaterial}
        mode={modalMode}
      />

      <MaterialRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={fetchRequests}
        projectId={projectId}
        materials={materials}
      />

      <MaterialReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onSuccess={fetchReceipts}
        projectId={projectId}
        materials={materials}
      />

      <MaterialPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={fetchPurchases}
        projectId={projectId}
        materials={materials}
      />

      <MaterialUsageModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        onSuccess={fetchUsage}
        projectId={projectId}
        materials={materials}
      />
    </div>
  );
};
