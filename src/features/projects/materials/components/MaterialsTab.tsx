'use client';

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
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { useToast } from '@/providers/ToastContext';
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
      toast.error('Failed to load materials');
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/material-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load material requests');
    }
  };

  const fetchReceipts = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/material-receipts`);
      setReceipts(response.data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to load material receipts');
    }
  };

  const fetchPurchases = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/material-purchase`);
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to load purchase orders');
    }
  };

  const fetchUsage = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/material-usage`);
      setUsageLogs(response.data);
    } catch (error) {
      console.error('Error fetching usage:', error);
      toast.error('Failed to load usage logs');
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
    } catch { toast.error('Failed to load activity log'); }
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
    setUpdatingRequestId(requestId);
    try {
      await api.patch(`/material-requests/${requestId}`, { status });
      toast.success(`Request ${status.toLowerCase()}`);
      if (selectedRequest?._id === requestId) {
        setSelectedRequest((r: any) => r ? { ...r, status } : r);
      }
      fetchRequests();
    } catch {
      toast.error(`Failed to ${status.toLowerCase()} request`);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  const handleVerifyReceipt = async (receiptId: string) => {
    try {
      await api.patch(`/projects/${projectId}/material-receipts/${receiptId}`, { status: 'Verified' });
      toast.success('Receipt marked as verified');
      fetchReceipts();
    } catch {
      toast.error('Failed to verify receipt');
    }
  };

  const bulkUpdateRequests = async (status: 'Approved' | 'Rejected') => {
    setIsBulkUpdating(true);
    try {
      const ids = Array.from(checkedRequestIds);
      await Promise.all(
        ids.map((id) => api.patch(`/material-requests/${id}`, { status }))
      );
      toast.success(`${checkedRequestIds.size} request(s) ${status.toLowerCase()}`);
      setCheckedRequestIds(new Set());
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk update failed');
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
    if (!window.confirm('Delete this material? This cannot be undone.')) return;
    setDeletingId(materialId);
    try {
      await api.delete(`/materials/${materialId}`);
      toast.success('Material deleted');
      fetchMaterials();
    } catch { toast.error('Failed to delete material'); }
    finally { setDeletingId(null); }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Delete this request?')) return;
    setDeletingId(requestId);
    try {
      await api.delete(`/material-requests/${requestId}`);
      toast.success('Request deleted');
      if (selectedRequest?._id === requestId) setSelectedRequest(null);
      fetchRequests();
    } catch { toast.error('Failed to delete request'); }
    finally { setDeletingId(null); }
  };

  const handleDeleteUsageLog = async (logId: string) => {
    if (!window.confirm('Delete this usage log? Consumed quantities will be restored to stock.')) return;
    setDeletingId(logId);
    try {
      await api.delete(`/material-usage/${logId}`);
      toast.success('Usage log deleted and stock restored');
      await Promise.all([fetchUsage(), fetchMaterials()]);
    } catch { toast.error('Failed to delete usage log'); }
    finally { setDeletingId(null); }
  };

  const handleDeletePO = async (purchaseId: string) => {
    if (!window.confirm('Delete this material purchase?')) return;
    setDeletingId(purchaseId);
    try {
      await api.delete(`/material-purchase/${purchaseId}`);
      toast.success('Material purchase deleted');
      setSelectedPO(null);
      fetchPurchases();
    } catch { toast.error('Failed to delete material purchase'); }
    finally { setDeletingId(null); }
  };

  const handleUpdatePOStatus = async (purchaseId: string, status: 'Approved' | 'Rejected') => {
    setUpdatingPOId(purchaseId);
    try {
      await api.patch(`/material-purchase/${purchaseId}`, { status });
      toast.success(`Material purchase ${status.toLowerCase()}`);
      setSelectedPO((po: any) => po ? { ...po, status } : po);
      fetchPurchases();
    } catch { toast.error(`Failed to ${status.toLowerCase()} material purchase`); }
    finally { setUpdatingPOId(null); }
  };

  const printReceipt = (receipt: any) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = receipt.items.map((item: any) =>
      `<tr><td style="border:1px solid #ccc;padding:8px">${item.materialId?.name || 'Item'}</td><td style="border:1px solid #ccc;padding:8px">${item.quantity} ${item.unit}</td></tr>`
    ).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>GRN-${receipt._id.slice(-6).toUpperCase()}</title>
<style>body{font-family:sans-serif;padding:24px;color:#111}h2{margin:0 0 4px}p{margin:4px 0}table{border-collapse:collapse;width:100%;margin-top:12px}th{background:#f3f4f6;border:1px solid #ccc;padding:8px;text-align:left}</style>
</head><body>
<h2>Goods Receipt Note — GRN-${receipt._id.slice(-6).toUpperCase()}</h2>
<p>Date: ${new Date(receipt.createdAt).toLocaleDateString()}</p>
<p>Vendor: ${receipt.vendorName}</p>
<p>Challan: ${receipt.challanNumber}${receipt.invoiceNumber ? ` &nbsp;|&nbsp; Invoice: ${receipt.invoiceNumber}` : ''}</p>
<p>Status: ${receipt.status}</p>
<table><thead><tr><th style="border:1px solid #ccc;padding:8px">Material</th><th style="border:1px solid #ccc;padding:8px">Quantity</th></tr></thead><tbody>${rows}</tbody></table>
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

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 w-full sm:w-fit">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              activeSubTab === tab.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-500 hover:text-gray-900 hover:bg-white"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {['all', 'low-stock', 'out-of-stock'].includes(activeSubTab) && (
        <div className="space-y-6">
          {/* Inventory Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <GlassCard className="p-4 border-gray-200" gradient>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Materials</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{materials.length}</p>
            </GlassCard>
            <GlassCard className="p-4 border-gray-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Low Stock Items</p>
              <p className="text-2xl font-black text-red-600 mt-1">
                {materials.filter(m => {
                  const stock = m.currentStock ?? ((m.totalReceived || 0) - (m.totalConsumed || 0));
                  const min = m.minimumStock ?? m.minStock ?? 0;
                  return stock <= min && stock >= 0;
                }).length}
              </p>
            </GlassCard>
            <GlassCard className="p-4 border-gray-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Received</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {materials.reduce((sum, m) => sum + (m.totalReceived || 0), 0)}
              </p>
            </GlassCard>
            <GlassCard className="p-4 border-gray-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Consumed</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {materials.reduce((sum, m) => sum + (m.totalConsumed || 0), 0)}
              </p>
            </GlassCard>
          </div>

          {/* Toolbar */}
          <GlassCard className="p-4 border-gray-200" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setModalMode('create');
                    setSelectedMaterial(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Material</span>
                </button>
              </div>
            </div>
          </GlassCard>

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
                    <GlassCard key={material._id} className="p-4 border-gray-200" gradient>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 animate-pulse-subtle">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{material.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">
                              Unit: <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[9px] font-black text-slate-500 ml-1">{material.unit}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          {overConsumed ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-100 border border-red-200 text-red-600 uppercase tracking-wide">Over-consumed</span>
                          ) : (
                            <>
                              <span className={cn('text-sm font-black', isLow ? 'text-red-600' : 'text-gray-900')}>{stock} In Stock</span>
                              <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                                <div className={cn('h-full rounded-full', isLow ? 'bg-red-400' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-gray-100 bg-gray-50/50 -mx-4 px-4 py-2">
                        <div className="flex items-center space-x-1.5">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Received:</span>
                          <span className="text-xs font-black text-emerald-600">{received}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 justify-end">
                          <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Consumed:</span>
                          <span className="text-xs font-black text-red-600">{consumed}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-2">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                          Updated: {new Date(material.updatedAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setModalMode('stock-in');
                              setSelectedMaterial(material);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-100 bg-emerald-50/50"
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
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-all border border-red-100 bg-red-50/50"
                            title="Stock Out"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openHistory(material)}
                            title="Usage History"
                            className="p-1.5 text-slate-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all border border-gray-200 bg-white"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setModalMode('edit');
                              setSelectedMaterial(material);
                              setIsModalOpen(true);
                            }}
                            title="Edit Material"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-gray-200 bg-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMaterial(material._id)}
                            disabled={deletingId === material._id}
                            title="Delete Material"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40 border border-gray-200 bg-white"
                          >
                            {deletingId === material._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>

              {/* Desktop Table (hidden on mobile, visible md+) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Material Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Unit</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Received</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Consumed</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">In Stock</th>
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
                            <div>
                              <p className="text-sm font-bold text-gray-900">{material.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Last updated: {new Date(material.updatedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-bold text-slate-500">
                            {material.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-600">{material.totalReceived || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <ArrowUpRight className="w-3 h-3 text-red-500" />
                            <span className="text-sm font-bold text-red-600">{material.totalConsumed || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
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
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-100 border border-red-200 text-red-600 uppercase tracking-wide">Over-consumed</span>
                                  ) : (
                                    <>
                                      <span className={cn('text-lg font-black', isLow ? 'text-red-600' : 'text-gray-900')}>{stock}</span>
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
                        <td className="px-6 py-4 text-right">
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
                            <button
                              onClick={() => {
                                setModalMode('edit');
                                setSelectedMaterial(material);
                                setIsModalOpen(true);
                              }}
                              title="Edit Material"
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(material._id)}
                              disabled={deletingId === material._id}
                              title="Delete Material"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                            >
                              {deletingId === material._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {materials.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                          No materials in inventory for this project.
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
          <GlassCard className="p-4 border-gray-200" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900">Material Requests</h3>
                <p className="text-xs text-slate-500">Track and manage project material requisitions.</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Request</span>
                </button>
              </div>
            </div>
          </GlassCard>

          {checkedRequestIds.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <span className="text-sm font-bold text-blue-700">{checkedRequestIds.size} request{checkedRequestIds.size > 1 ? 's' : ''} selected</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => bulkUpdateRequests('Approved')}
                  disabled={isBulkUpdating}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                  {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => bulkUpdateRequests('Rejected')}
                  disabled={isBulkUpdating}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => setCheckedRequestIds(new Set())}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-slate-500 hover:text-gray-900 transition-all"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonLoader loading={true} preset="card-grid"><div /></SkeletonLoader>
          ) : requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.map((request) => (
                <GlassCard key={request._id} className="p-6 border-gray-200 hover:border-blue-500/30 transition-all" gradient>
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
                        <p className="text-sm font-bold text-gray-900">REQ-{request._id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{new Date(request.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      request.status === 'Approved'   ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                      request.status === 'Fulfilled'  ? 'text-blue-700 bg-blue-100 border-blue-200' :
                      request.status === 'Rejected'   ? 'text-red-700 bg-red-100 border-red-200' :
                      'text-amber-700 bg-amber-100 border-amber-200'
                    )}>
                      {request.status}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    {request.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">{item.materialId?.name || 'Unknown Material'}</span>
                        <span className="font-bold text-gray-900">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>

                  {request.commonNote && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 mb-6">
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Note</p>
                      <p className="text-xs text-slate-600 italic">"{request.commonNote}"</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {request.requestedByName?.charAt(0) || 'U'}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{request.requestedByName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {request.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateRequestStatus(request._id, 'Rejected')}
                            disabled={updatingRequestId === request._id}
                            title="Reject"
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateRequestStatus(request._id, 'Approved')}
                            disabled={updatingRequestId === request._id}
                            title="Approve"
                            className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            {updatingRequestId === request._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                      {request.status === 'Approved' && (
                        <button
                          onClick={() => handleUpdateRequestStatus(request._id, 'Fulfilled')}
                          disabled={updatingRequestId === request._id}
                          title="Mark Fulfilled"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white text-[10px] font-bold transition-all disabled:opacity-50"
                        >
                          {updatingRequestId === request._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PackageCheck className="w-3 h-3" />}
                          Fulfill
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRequest(request._id)}
                        disabled={deletingId === request._id}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        {deletingId === request._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                      >Details &rarr;</button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No requests found</h3>
              <p className="text-slate-500 max-w-xs">There are no material requests for this project yet.</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'receipts' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900">Material Received</h3>
                <p className="text-xs text-slate-500">Log and verify incoming material deliveries.</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 border border-emerald-500 rounded-xl text-sm font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Log Receipt</span>
                </button>
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
                  <GlassCard key={receipt._id} className="p-4 border-gray-200" gradient>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-gray-900">GRN-{receipt._id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {new Date(receipt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        receipt.status === 'Verified' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                        receipt.status === 'Rejected' ? 'text-red-700 bg-red-100 border-red-200' :
                        'text-amber-700 bg-amber-100 border-amber-200'
                      )}>
                        {receipt.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-bold text-slate-700 truncate">{receipt.vendorName}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-bold uppercase pl-6">
                        <span>Challan: {receipt.challanNumber}</span>
                        {receipt.invoiceNumber && <span>Invoice: {receipt.invoiceNumber}</span>}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Items Received</p>
                      <div className="flex flex-wrap gap-1.5">
                        {receipt.items.map((item: any, i: number) => (
                          <span key={i} className="px-2 py-1 rounded bg-gray-50 border border-gray-200 text-[10px] font-bold text-slate-600">
                            {item.materialId?.name || 'Item'}: {item.quantity} {item.unit}
                          </span>
                        ))}
                      </div>
                    </div>

                    {receipt.commonNote && (
                      <div className="mt-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 font-bold">Notes</p>
                        <p className="text-xs text-slate-500 italic">"{receipt.commonNote}"</p>
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
                            <span>Verify Receipt</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => printReceipt(receipt)}
                        title="Print Receipt"
                        className="flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-gray-900 transition-all border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print GRN</span>
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Desktop Table (hidden on mobile, visible md+) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Receipt Info</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendor & Docs</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Items Received</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">GRN-{receipt._id.slice(-6).toUpperCase()}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{new Date(receipt.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <Truck className="w-3 h-3 text-slate-400" />
                              <span className="text-sm font-medium text-slate-600">{receipt.vendorName}</span>
                            </div>
                            <div className="flex items-center space-x-4 text-[10px] text-slate-500 font-bold uppercase">
                              <span>Challan: {receipt.challanNumber}</span>
                              {receipt.invoiceNumber && <span>Invoice: {receipt.invoiceNumber}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {receipt.items.map((item: any, i: number) => (
                              <span key={i} className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-bold text-slate-500">
                                {item.materialId?.name || 'Item'}: {item.quantity} {item.unit}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            receipt.status === 'Verified' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                            receipt.status === 'Rejected' ? 'text-red-700 bg-red-100 border-red-200' :
                            'text-amber-700 bg-amber-100 border-amber-200'
                          )}>
                            {receipt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {receipt.status !== 'Verified' ? (
                              <button
                                onClick={() => handleVerifyReceipt(receipt._id)}
                                className="flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </span>
                            )}
                            <button
                              onClick={() => printReceipt(receipt)}
                              title="Print Receipt"
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">No receipts found</h3>
              <p className="text-slate-500 max-w-xs">Record incoming material deliveries using the GRN form.</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'purchase' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900">Purchase Orders</h3>
                <p className="text-xs text-slate-500">Formal procurement requests to vendors.</p>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-xl text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create PO</span>
              </button>
            </div>
          </GlassCard>

          {loading ? (
            <SkeletonLoader loading={true} preset="card-grid"><div /></SkeletonLoader>
          ) : purchases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {purchases.map((po) => (
                <GlassCard key={po._id} className="p-6 border-gray-200" gradient>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{po.poNumber}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{po.vendorName}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      PO_STATUS_COLORS[po.status] || 'text-blue-700 bg-blue-100 border-blue-200'
                    )}>
                      {po.status || 'Active'}
                    </span>
                  </div>
                  <div className="space-y-2 mb-6">
                    {po.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-500">{item.materialId?.name}</span>
                        <span className="text-gray-900 font-bold">{item.quantity} {item.unit} {(item.unitPrice || item.unitCost) ? `· ${formatCurrency((item.unitPrice || item.unitCost) * item.quantity, (project as any)?.currency || '$')}` : ''}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
                       <span className="text-sm font-bold text-emerald-600">{(po.grandTotal ?? po.totalAmount) != null ? formatCurrency(po.grandTotal ?? po.totalAmount, (project as any)?.currency || '$') : '—'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {po.status !== 'Approved' ? (
                        <button
                          onClick={() => handleDeletePO(po._id)}
                          disabled={deletingId === po._id}
                          title="Delete PO"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          {deletingId === po._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <span title="Approved POs cannot be deleted" className="p-1.5 text-slate-300 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedPO(po)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                      >View PO &rarr;</button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-slate-500">No purchase orders found.</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'usage' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200" gradient>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900">Usage Log</h3>
                <p className="text-xs text-slate-500">Track on-site material consumption.</p>
              </div>
              <button
                onClick={() => setIsUsageModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 border border-purple-500 rounded-xl text-sm font-bold text-white hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Log Consumption</span>
              </button>
            </div>
          </GlassCard>

          {loading ? (
            <SkeletonLoader loading={true} preset="table"><div /></SkeletonLoader>
          ) : usageLogs.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date & User</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location / Work</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Materials Consumed</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {usageLogs.map((log) => (
                    <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{new Date(log.createdAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{log.usedByName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 font-medium">{log.locationOrTask || '—'}</p>
                        {log.commonNote && <p className="text-[10px] text-slate-500 italic mt-0.5">{log.commonNote}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {log.items.map((item: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-purple-100 border border-purple-200 text-[10px] font-bold text-purple-700">
                              {item.materialId?.name}: {item.quantity} {item.unit}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUsageLog(log._id)}
                          disabled={deletingId === log._id}
                          title="Delete log (restores stock)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          {deletingId === log._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <History className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-slate-500">No usage logs found.</p>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'activity' && (
        <div className="space-y-6">
          <GlassCard className="p-4 border-gray-200" gradient>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Activity Log</h3>
              <p className="text-xs text-slate-500">All material activity — requests, purchases, receipts, and consumption — in chronological order.</p>
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
                    'px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border',
                    entry.status === 'Approved' || entry.status === 'Verified' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                    entry.status === 'Rejected' ? 'text-red-700 bg-red-100 border-red-200' :
                    entry.status === 'Fulfilled' ? 'text-blue-700 bg-blue-100 border-blue-200' :
                    'text-amber-700 bg-amber-100 border-amber-200'
                  )}>{entry.status}</span>
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
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{typeConfig.label}</span>
                        {statusBadge}
                      </div>
                      <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{typeConfig.idLabel}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {summaryItems.slice(0, 4).map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold text-slate-500">{s}</span>
                        ))}
                        {summaryItems.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold text-slate-400">+{summaryItems.length - 4} more</span>
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
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
              <ScrollText className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No activity yet</h3>
              <p className="text-slate-500">Material activity will appear here once requests, purchases, receipts, or usage logs are created.</p>
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
                    <h3 className="text-lg font-bold text-gray-900">REQ-{selectedRequest._id.slice(-6).toUpperCase()}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(selectedRequest.createdAt).toLocaleDateString()} · by {selectedRequest.requestedByName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    selectedRequest.status === 'Approved'  ? 'text-emerald-700 bg-emerald-100 border-emerald-200' :
                    selectedRequest.status === 'Fulfilled' ? 'text-blue-700 bg-blue-100 border-blue-200' :
                    selectedRequest.status === 'Rejected'  ? 'text-red-700 bg-red-100 border-red-200' :
                    'text-amber-700 bg-amber-100 border-amber-200'
                  )}>{selectedRequest.status}</span>
                  <button onClick={() => setSelectedRequest(null)} className="p-2 rounded-xl hover:bg-gray-100 text-slate-400 hover:text-gray-900 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Requested Items</p>
                  <div className="space-y-2">
                    {selectedRequest.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <span className="text-sm font-semibold text-gray-900">{item.materialId?.name || 'Material'}</span>
                        <span className="text-sm font-black text-blue-600">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedRequest.commonNote && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note</p>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-slate-600 italic">"{selectedRequest.commonNote}"</p>
                    </div>
                  </div>
                )}
                {selectedRequest.status === 'Pending' && (
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleUpdateRequestStatus(selectedRequest._id, 'Rejected')}
                      disabled={updatingRequestId === selectedRequest._id}
                      className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdateRequestStatus(selectedRequest._id, 'Approved')}
                      disabled={updatingRequestId === selectedRequest._id}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {updatingRequestId === selectedRequest._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Approve</span>
                    </button>
                  </div>
                )}
                {selectedRequest.status === 'Approved' && (
                  <button
                    onClick={() => handleUpdateRequestStatus(selectedRequest._id, 'Fulfilled')}
                    disabled={updatingRequestId === selectedRequest._id}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {updatingRequestId === selectedRequest._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                    <span>Mark as Fulfilled</span>
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
                    <h3 className="text-lg font-bold text-gray-900">{selectedPO.poNumber}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedPO.vendorName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200">
                    {selectedPO.status || 'Active'}
                  </span>
                  <button onClick={() => setSelectedPO(null)} className="p-2 rounded-xl hover:bg-gray-100 text-slate-400 hover:text-gray-900 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Order Items</p>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Material</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Qty</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Unit Cost</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPO.items?.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.materialId?.name || 'Material'}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-600">{item.quantity} {item.unit}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-600">{(item.unitPrice ?? item.unitCost) != null ? formatCurrency(item.unitPrice ?? item.unitCost, (project as any)?.currency || '$') : '—'}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                              {formatCurrency(item.quantity * (item.unitPrice ?? item.unitCost ?? 0), (project as any)?.currency || '$')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-sm font-black text-slate-600 uppercase tracking-wider">Total Amount</span>
                   <span className="text-xl font-black text-emerald-600">{(selectedPO.grandTotal ?? selectedPO.totalAmount) != null ? formatCurrency(selectedPO.grandTotal ?? selectedPO.totalAmount, (project as any)?.currency || '$') : '—'}</span>
                </div>
                {selectedPO.expectedDelivery && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Expected Delivery</p>
                      <p className="text-sm font-bold text-gray-900">{new Date(selectedPO.expectedDelivery).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {(selectedPO.status === 'Pending Approval' || selectedPO.status === 'Pending') && (
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleUpdatePOStatus(selectedPO._id, 'Rejected')}
                      disabled={updatingPOId === selectedPO._id}
                      className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdatePOStatus(selectedPO._id, 'Approved')}
                      disabled={updatingPOId === selectedPO._id}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {updatingPOId === selectedPO._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Approve</span>
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
                    <h3 className="text-lg font-bold text-gray-900">{historyMaterial.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Usage history</p>
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
                              {new Date(log.createdAt).toLocaleDateString()} · {log.usedByName}
                            </p>
                          </div>
                          <span className="text-sm font-black text-purple-600">
                            -{item?.quantity} {item?.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No usage history</p>
                    <p className="text-xs text-slate-400 mt-1">This material has not been consumed yet.</p>
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
