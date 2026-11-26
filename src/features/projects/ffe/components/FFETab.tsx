'use client';
import { tr } from '@/i18n';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { projectCurrency } from '@/lib/projectCurrency';

import React, { useState, useEffect } from 'react';
import {
  Plus, Loader2, Sofa, Wrench, Settings, Tv, Lightbulb,
  Palette, Bath, LayoutGrid, Trash2, Edit2, X, Check,
  ChevronDown, ChevronUp, Eye, Layers, Tag, Building2, Package, FileText
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission } from '@/lib/permissions';

const FFE_CATEGORIES = ['Furniture', 'Fixture', 'Equipment', 'Appliance', 'Lighting', 'Decor', 'Sanitary', 'Other'] as const;
const FFE_STATUSES = ['Planned', 'Ordered', 'Delivered', 'Installed', 'Rejected'] as const;

const STATUS_META: Record<string, { color: string; bg: string; border: string }> = {
  Planned:   { color: 'text-slate-600',   bg: 'bg-slate-50',    border: 'border-slate-200' },
  Ordered:   { color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200' },
  Delivered: { color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  Installed: { color: 'text-emerald-700', bg: 'bg-emerald-50',   border: 'border-emerald-200' },
  Rejected:  { color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200' },
};

const CATEGORY_ICON: Record<string, React.ComponentType<any>> = {
  Furniture: Sofa,
  Fixture: Wrench,
  Equipment: Settings,
  Appliance: Tv,
  Lighting: Lightbulb,
  Decor: Palette,
  Sanitary: Bath,
  Other: LayoutGrid,
};

const emptyForm = {
  name: '',
  category: 'Other' as typeof FFE_CATEGORIES[number],
  quantity: 1,
  unit: 'nos',
  unitCost: '',
  status: 'Planned' as typeof FFE_STATUSES[number],
  brand: '',
  modelNo: '',
  supplier: '',
  finish: '',
  dimensions: '',
  poNumber: '',
  leadTimeDays: '',
  expectedDelivery: '',
  warrantyMonths: '',
  notes: '',
  room: '',
};

const formatCost = (n: number, currency?: string) => formatCurrency(n, projectCurrency({ currency }));

interface FFETabProps {
  projectId: string;
  project?: any;
}

export const FFETab: React.FC<FFETabProps> = ({ projectId, project }) => {
  const [items, setItems] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalCost: 0, byStatus: {} });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [detailItem, setDetailItem] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<any>(null);

  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = hasProjectPermission(user, project, 'ffe:manage');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ffeRes, roomsRes] = await Promise.allSettled([
        api.get(`/projects/${projectId}/ffe`),
        api.get(`/projects/${projectId}/rooms`),
      ]);
      if (ffeRes.status === 'fulfilled') {
        const data = ffeRes.value.data || {};
        setItems(data.items || []);
        setSummary({
          totalCost: data.totalCost || 0,
          byStatus: data.byStatus || {}
        });
      }
      if (roomsRes.status === 'fulfilled') {
        setRooms(roomsRes.value.data || []);
      }
    } catch {
      toast.error(tr("Failed to load FFE items"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name || '',
      category: item.category || 'Other',
      quantity: item.quantity || 1,
      unit: item.unit || 'nos',
      unitCost: item.unitCost != null ? item.unitCost.toString() : '',
      status: item.status || 'Planned',
      brand: item.brand || '',
      modelNo: item.modelNo || '',
      supplier: item.supplier || '',
      finish: item.finish || '',
      dimensions: item.dimensions || '',
      poNumber: item.poNumber || '',
      leadTimeDays: item.leadTimeDays != null ? item.leadTimeDays.toString() : '',
      expectedDelivery: item.expectedDelivery ? item.expectedDelivery.slice(0, 10) : '',
      warrantyMonths: item.warrantyMonths != null ? item.warrantyMonths.toString() : '',
      notes: item.notes || '',
      room: item.room?._id || item.room || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(tr("Item name is required"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity) || 1,
        unit: form.unit || 'nos',
        unitCost: form.unitCost !== '' ? Number(form.unitCost) : 0,
        status: form.status,
        brand: form.brand || undefined,
        modelNo: form.modelNo || undefined,
        supplier: form.supplier || undefined,
        finish: form.finish || undefined,
        dimensions: form.dimensions || undefined,
        poNumber: form.poNumber || undefined,
        leadTimeDays: form.leadTimeDays !== '' ? Number(form.leadTimeDays) : undefined,
        expectedDelivery: form.expectedDelivery || undefined,
        warrantyMonths: form.warrantyMonths !== '' ? Number(form.warrantyMonths) : undefined,
        notes: form.notes || undefined,
        room: form.room || null,
      };

      if (editing) {
        await api.patch(`/projects/${projectId}/ffe/${editing._id}`, payload);
        toast.success(tr("FFE item updated"));
      } else {
        await api.post(`/projects/${projectId}/ffe`, payload);
        toast.success(tr("FFE item added"));
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || tr("Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    setConfirmDeleteId(item);
  };

  const executeDelete = async (item: any) => {
    try {
      await api.delete(`/projects/${projectId}/ffe/${item._id}`);
      toast.success(tr("Item deleted"));
      fetchData();
    } catch {
      toast.error(tr("Failed to delete item"));
    }
  };

  const handleStatusChange = async (item: any, newStatus: string) => {
    try {
      await api.patch(`/projects/${projectId}/ffe/${item._id}`, { status: newStatus });
      toast.success(tr("Status updated to {{newStatus}}", { newStatus: newStatus }));
      if (detailItem && detailItem._id === item._id) {
        setDetailItem((prev: any) => prev ? { ...prev, status: newStatus } : null);
      }
      fetchData();
    } catch {
      toast.error(tr("Failed to update status"));
    }
  };

  // Calculations for layout
  const filteredItems = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory);
  const categoriesWithItems = ['All', ...FFE_CATEGORIES.filter(c => items.some(i => i.category === c))];
  const totalItems = items.length;
  const installedCount = summary.byStatus['Installed'] || 0;
  const overallProgress = totalItems ? Math.round((installedCount / totalItems) * 100) : 0;

  if (loading) {
    return (
      <SkeletonLoader loading preset="table">{null}</SkeletonLoader>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{tr("Furniture, Fixtures & Equipment")}</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
              {tr(totalItems)} {totalItems === 1 ? tr("item") : tr("items")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {tr("Track FFE procurement, specifications, cost and installation progress by room.")}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tr("Add FFE Item")}</span>
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500">{tr("Total Cost")}</span>
            <Package className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl font-semibold text-slate-900">{formatCost(summary.totalCost, project?.currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500">{tr("Installed")}</span>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900">{tr(overallProgress)}%</p>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
        {FFE_STATUSES.filter(s => s !== 'Installed').slice(0, 2).map(s => {
          const count = summary.byStatus[s] || 0;
          const sc = STATUS_META[s] || STATUS_META.Planned;
          return (
            <div key={s} className="bg-white rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-500">{tr(s)}</span>
                <span className={cn('w-2 h-2 rounded-full', sc.bg)} />
              </div>
              <p className="text-xl font-semibold text-slate-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Category Scrollable Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categoriesWithItems.map(c => {
          const Icon = c !== 'All' ? CATEGORY_ICON[c] : null;
          const isActive = activeCategory === c;
          return (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border whitespace-nowrap transition-colors cursor-pointer shrink-0",
                isActive
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tr(c)}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Item Cards */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl bg-white">
          <Sofa className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            {activeCategory === 'All'
              ? tr("Add furniture, fixtures & equipment to track costs and installation status")
              : tr("No {{activeCategory}} items added yet", { activeCategory: activeCategory })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredItems.map(item => {
            const totalItemCost = (item.unitCost || 0) * (item.quantity || 1);
            const sc = STATUS_META[item.status] || STATUS_META.Planned;
            const roomObj = rooms.find(r => r._id === (item.room?._id || item.room));
            const roomName = roomObj?.name;
            const CatIcon = CATEGORY_ICON[item.category] || LayoutGrid;
            return (
              <div
                key={item._id}
                onClick={() => setDetailItem(item)}
                className="bg-white hover:border-blue-200 hover:shadow-sm transition-all border border-slate-200 rounded-xl p-4 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Icon, Title & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm truncate">
                          {tr(item.name)}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {tr(item.category)}{roomName ? ` · ${roomName}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0", sc.color, sc.bg)}>
                      {tr(item.status)}
                    </span>
                  </div>

                  {/* Total Cost */}
                  <p className="text-lg font-bold text-slate-900 mb-2.5">
                    {formatCost(totalItemCost, project?.currency)}
                  </p>

                  {/* Specification Chips */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="px-1.5 py-0.5 bg-slate-50 rounded text-[11px] font-medium text-slate-500">
                      {tr("Qty: ")}{item.quantity} {tr(item.unit)}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-50 rounded text-[11px] font-medium text-slate-500">
                      {formatCost(item.unitCost || 0, project?.currency)}{tr("/unit")}
                    </span>
                    {item.brand && (
                      <span className="px-1.5 py-0.5 bg-slate-50 rounded text-[11px] font-medium text-slate-500 max-w-[120px] truncate" title={item.brand}>
                        {tr(item.brand)}
                      </span>
                    )}
                    {item.supplier && (
                      <span className="px-1.5 py-0.5 bg-slate-50 rounded text-[11px] font-medium text-slate-500 max-w-[120px] truncate" title={item.supplier}>
                        {tr(item.supplier)}
                      </span>
                    )}
                    {item.poNumber && (
                      <span className="px-1.5 py-0.5 bg-slate-50 rounded text-[11px] font-medium text-slate-500 max-w-[120px] truncate" title={`PO: ${item.poNumber}`}>
                        {tr("PO: ")}{tr(item.poNumber)}
                      </span>
                    )}
                    {item.expectedDelivery && (
                      <span className="px-1.5 py-0.5 bg-slate-50 rounded text-[11px] font-medium text-slate-500">
                        {tr("ETA: ")}{new Date(item.expectedDelivery).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Notes Snippet */}
                  {item.notes && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 pt-1.5 border-t border-slate-100 italic">
                      "{tr(item.notes)}"
                    </p>
                  )}
                </div>

                {/* Card Action Row */}
                <div
                  className="flex justify-end gap-1 mt-2 pt-2 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setDetailItem(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title={tr("View Details")}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title={tr("Edit FFE")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={tr("Delete FFE")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Viewer Modal */}
      {detailItem && (() => {
        const sc = STATUS_META[detailItem.status] || STATUS_META.Planned;
        const assignedRoom = rooms.find(r => r._id === (detailItem.room?._id || detailItem.room));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailItem(null)} />
            <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Detail Header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    {React.createElement(CATEGORY_ICON[detailItem.category] || LayoutGrid, { className: "w-6 h-6 text-blue-600" })}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 leading-tight">{tr(detailItem.name)}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider rounded-md">
                        {tr(detailItem.category)}
                      </span>
                      {assignedRoom?.name && (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-semibold uppercase tracking-wider rounded-md">
                          {tr(assignedRoom.name)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setDetailItem(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Status & Total Cost Strip */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Installation Status")}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{tr("Changing status to \"Installed\" increases overall FFE progress.")}</p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Total Cost")}</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatCost((detailItem.unitCost || 0) * (detailItem.quantity || 1), project?.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                    {FFE_STATUSES.map((st) => {
                      const isCurrent = detailItem.status === st;
                      const statusMeta = STATUS_META[st] || STATUS_META.Planned;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(detailItem, st)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                            isCurrent
                              ? `${statusMeta.bg} ${statusMeta.color} ${statusMeta.border} ring-2 ring-blue-500/20 shadow-xs`
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <span>{tr(st)}</span>
                          {isCurrent && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity & Pricing Grid */}
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">{tr("Quantity & Pricing")}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Quantity', value: `${detailItem.quantity} ${detailItem.unit || 'nos'}` },
                      { label: 'Unit Cost', value: formatCost(detailItem.unitCost || 0, project?.currency) },
                      { label: 'Unit Type', value: detailItem.unit || 'nos' },
                      { label: 'Subtotal', value: formatCost((detailItem.unitCost || 0) * (detailItem.quantity || 1), project?.currency), highlighted: true }
                    ].map((c, i) => (
                      <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr(c.label)}</p>
                        <p className={cn("text-sm font-semibold mt-1 text-slate-800", c.highlighted && "text-blue-600")}>{tr(c.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specifications Grid */}
                {(detailItem.brand || detailItem.modelNo || detailItem.supplier || detailItem.finish || detailItem.dimensions) && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">{tr("Specifications")}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {detailItem.brand && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Brand")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{tr(detailItem.brand)}</p>
                        </div>
                      )}
                      {detailItem.modelNo && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Model No")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{tr(detailItem.modelNo)}</p>
                        </div>
                      )}
                      {detailItem.supplier && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Supplier")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{tr(detailItem.supplier)}</p>
                        </div>
                      )}
                      {detailItem.finish && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Finish")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{tr(detailItem.finish)}</p>
                        </div>
                      )}
                      {detailItem.dimensions && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 col-span-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Dimensions")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{tr(detailItem.dimensions)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Procurement Grid */}
                {(detailItem.poNumber || detailItem.leadTimeDays != null || detailItem.expectedDelivery || detailItem.warrantyMonths != null) && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">{tr("Procurement")}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {detailItem.poNumber && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("PO / Order Ref")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{tr(detailItem.poNumber)}</p>
                        </div>
                      )}
                      {detailItem.leadTimeDays != null && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Lead Time")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{tr(detailItem.leadTimeDays)}{tr(" days")}</p>
                        </div>
                      )}
                      {detailItem.expectedDelivery && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Expected Delivery")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{new Date(detailItem.expectedDelivery).toLocaleDateString()}</p>
                        </div>
                      )}
                      {detailItem.warrantyMonths != null && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{tr("Warranty")}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{tr(detailItem.warrantyMonths)}{tr(" months")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes Block */}
                {detailItem.notes && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{tr("Notes")}</h4>
                    <div className="bg-slate-50/55 border border-slate-100 rounded-xl p-4 italic text-sm text-slate-600">
                      "{tr(detailItem.notes)}"
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isAdmin && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => {
                      const item = detailItem;
                      setDetailItem(null);
                      openEdit(item);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    {tr("Edit Item")}
                  </button>
                  <button
                    onClick={() => {
                      const item = detailItem;
                      setDetailItem(null);
                      handleDelete(item);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {tr("Delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Add / Edit Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{editing ? tr("Edit FFE Item") : tr("Add FFE Item")}</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                  {editing ? tr("Update Item Details") : tr("Track New Furniture, Fixture, or Equipment")}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Item Name *")}</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  placeholder={tr("e.g. Sofa Set")}
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Category")}</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  >
                    {FFE_CATEGORIES.map(c => <option key={c} value={c}>{tr(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Status")}</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  >
                    {FFE_STATUSES.map(s => <option key={s} value={s}>{tr(s)}</option>)}
                  </select>
                </div>
              </div>

              {/* Quantity, Unit, Unit Cost */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Quantity")}</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Unit Type")}</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder={tr("nos")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Unit Cost ({{currency}})", { currency: projectCurrency(project) })}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.unitCost}
                    onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Room Assignment */}
              {rooms.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Assign to Room")}</label>
                  <select
                    value={form.room}
                    onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  >
                    <option value="">{tr("— No Room Assigned —")}</option>
                    {rooms.map(r => (
                      <option key={r._id} value={r._id}>
                        {tr(r.name)} {r.floor ? tr("(Floor {{floor}})", { floor: r.floor }) : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specifications Split Divider */}
              <div className="relative py-2 shrink-0">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-widest"><span className="bg-white px-3 text-slate-400">{tr("Specifications (Optional)")}</span></div>
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Brand")}</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder={tr("e.g. IKEA")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Model No.")}</label>
                  <input
                    type="text"
                    value={form.modelNo}
                    onChange={e => setForm(f => ({ ...f, modelNo: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder={tr("e.g. SK-401")}
                  />
                </div>
              </div>

              {/* Supplier & Finish */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Supplier")}</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder={tr("e.g. ABC Decor")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Finish")}</label>
                  <input
                    type="text"
                    value={form.finish}
                    onChange={e => setForm(f => ({ ...f, finish: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder={tr("e.g. Matte Finish")}
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Dimensions")}</label>
                <input
                  type="text"
                  value={form.dimensions}
                  onChange={e => setForm(f => ({ ...f, dimensions: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  placeholder={tr("e.g. 200cm x 90cm x 75cm")}
                />
              </div>

              {/* Procurement Split Divider */}
              <div className="relative py-2 shrink-0">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-widest"><span className="bg-white px-3 text-slate-400">{tr("Procurement (Optional)")}</span></div>
              </div>

              {/* PO Number & Lead Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("PO / Order Ref")}</label>
                  <input
                    type="text"
                    value={form.poNumber}
                    onChange={e => setForm(f => ({ ...f, poNumber: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder={tr("e.g. PO-2024-0091")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Lead Time (days)")}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.leadTimeDays}
                    onChange={e => setForm(f => ({ ...f, leadTimeDays: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="e.g. 21"
                  />
                </div>
              </div>

              {/* Expected Delivery & Warranty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Expected Delivery")}</label>
                  <input
                    type="date"
                    value={form.expectedDelivery}
                    onChange={e => setForm(f => ({ ...f, expectedDelivery: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Warranty (months)")}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.warrantyMonths}
                    onChange={e => setForm(f => ({ ...f, warrantyMonths: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="e.g. 12"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{tr("Notes")}</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold resize-none"
                  placeholder={tr("Additional item descriptions, specification details, etc.")}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all"
                >
                  {tr("Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? tr("Save Changes") : tr("Add FFE Item")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-xl p-6 shadow-xl border border-slate-200 text-center">
            <h3 className="text-base font-bold text-slate-900 mb-2">{tr("Delete FFE Item")}</h3>
            <p className="text-sm text-slate-500 mb-6">{tr("Are you sure you want to delete \"")}{tr(confirmDeleteId.name)}{tr("\"? This action cannot be undone.")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all"
              >
                {tr("Cancel")}
              </button>
              <button
                onClick={() => {
                  const item = confirmDeleteId;
                  setConfirmDeleteId(null);
                  executeDelete(item);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all"
              >
                {tr("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
