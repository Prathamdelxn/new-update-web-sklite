'use client';

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
  Ordered:   { color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-150' },
  Delivered: { color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-150' },
  Installed: { color: 'text-emerald-700', bg: 'bg-emerald-50',   border: 'border-emerald-150' },
  Rejected:  { color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-150' },
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
  colorCode: '',
  dimensions: '',
  notes: '',
  room: '',
};

const formatCost = (n: number, currency: string = '$') => formatCurrency(n, currency);

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
      toast.error('Failed to load FFE items');
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
      colorCode: item.colorCode || '',
      dimensions: item.dimensions || '',
      notes: item.notes || '',
      room: item.room?._id || item.room || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Item name is required');
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
        colorCode: form.colorCode || undefined,
        dimensions: form.dimensions || undefined,
        notes: form.notes || undefined,
        room: form.room || null,
      };

      if (editing) {
        await api.patch(`/projects/${projectId}/ffe/${editing._id}`, payload);
        toast.success('FFE item updated');
      } else {
        await api.post(`/projects/${projectId}/ffe`, payload);
        toast.success('FFE item added');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
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
      toast.success('Item deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete item');
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">FFE</h2>
          <p className="text-xs text-slate-500 mt-1">{totalItems} items tracked</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add FFE
          </button>
        )}
      </div>

      {/* Cost + Progress Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-black text-blue-500 tracking-wider uppercase mb-1">TOTAL FFE COST</p>
            <h3 className="text-3xl font-black text-slate-900">{formatCost(summary.totalCost, project?.currency)}</h3>
          </div>
          <div className="flex flex-col items-start md:items-end">
            <span className="text-2xl font-black text-blue-600">{overallProgress}%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">installed</span>
          </div>
        </div>

        {/* Progress Bar */}
        {totalItems > 0 && (
          <div className="w-full h-2.5 bg-blue-200/50 rounded-full overflow-hidden mb-4">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                overallProgress === 100 ? "bg-emerald-500" : "bg-blue-600"
              )}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        )}

        {/* Status chip summaries */}
        <div className="flex flex-wrap gap-2">
          {FFE_STATUSES.map(s => {
            const count = summary.byStatus[s] || 0;
            if (count === 0) return null;
            const sc = STATUS_META[s] || STATUS_META.Planned;
            return (
              <div key={s} className={cn("px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border", sc.bg, sc.color, sc.border)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                {count} {s}
              </div>
            );
          })}
          {totalItems === 0 && (
            <span className="text-xs font-medium text-slate-400">No items yet</span>
          )}
        </div>
      </div>

      {/* Category Scrollable Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categoriesWithItems.map(c => {
          const Icon = c !== 'All' ? CATEGORY_ICON[c] : null;
          const isActive = activeCategory === c;
          return (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border whitespace-nowrap transition-all",
                isActive
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Item Cards */}
      {filteredItems.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-gray-250 rounded-2xl bg-slate-50/50">
          <Sofa className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">
            {activeCategory === 'All'
              ? 'Add furniture, fixtures & equipment to track costs and installation status'
              : `No ${activeCategory} items added yet`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const totalItemCost = (item.unitCost || 0) * (item.quantity || 1);
            const sc = STATUS_META[item.status] || STATUS_META.Planned;
            const roomObj = rooms.find(r => r._id === (item.room?._id || item.room));
            const roomName = roomObj?.name;
            return (
              <div
                key={item._id}
                onClick={() => setDetailItem(item)}
                className="bg-white hover:shadow-md transition-all duration-200 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Category & Room Row */}
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-wider uppercase mb-2">
                    <span className="text-blue-600">{item.category}</span>
                    {roomName && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400">{roomName}</span>
                      </>
                    )}
                  </div>

                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base line-clamp-1">
                      {item.name}
                    </h4>
                    <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase shrink-0 border", sc.color, sc.bg, sc.border)}>
                      {item.status}
                    </span>
                  </div>

                  {/* Total Cost */}
                  <p className="text-lg font-black text-slate-900 mb-4">
                    {formatCost(totalItemCost, project?.currency)}
                  </p>

                  {/* Specification Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-500 flex items-center gap-1">
                      Qty: {item.quantity} {item.unit}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-505">
                      {formatCost(item.unitCost || 0, project?.currency)}/unit
                    </span>
                    {item.brand && (
                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-505 max-w-[120px] truncate" title={item.brand}>
                        {item.brand}
                      </span>
                    )}
                    {item.supplier && (
                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-505 max-w-[120px] truncate" title={item.supplier}>
                        {item.supplier}
                      </span>
                    )}
                    {item.colorCode && (
                      <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-505 flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-200 shrink-0"
                          style={{ backgroundColor: item.colorCode.startsWith('#') ? item.colorCode : `#${item.colorCode}` }}
                        />
                        {item.colorCode}
                      </span>
                    )}
                  </div>

                  {/* Notes Snippet */}
                  {item.notes && (
                    <p className="text-xs text-slate-450 line-clamp-2 mt-2 pt-2 border-t border-slate-100 italic">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Card Action Row */}
                <div
                  className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setDetailItem(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit FFE"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete FFE"
                      >
                        <Trash2 className="w-4 h-4" />
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
            <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-150 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Detail Header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    {React.createElement(CATEGORY_ICON[detailItem.category] || LayoutGrid, { className: "w-6 h-6 text-blue-600" })}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{detailItem.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-md">
                        {detailItem.category}
                      </span>
                      {assignedRoom?.name && (
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-650 text-[10px] font-black uppercase tracking-wider rounded-md">
                          {assignedRoom.name}
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
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border",
                    sc.color, sc.bg, sc.border
                  )}>
                    {detailItem.status}
                  </span>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Cost</p>
                    <p className="text-xl font-black text-slate-900">
                      {formatCost((detailItem.unitCost || 0) * (detailItem.quantity || 1), project?.currency)}
                    </p>
                  </div>
                </div>

                {/* Quantity & Pricing Grid */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quantity & Pricing</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Quantity', value: `${detailItem.quantity} ${detailItem.unit || 'nos'}` },
                      { label: 'Unit Cost', value: formatCost(detailItem.unitCost || 0, project?.currency) },
                      { label: 'Unit Type', value: detailItem.unit || 'nos' },
                      { label: 'Subtotal', value: formatCost((detailItem.unitCost || 0) * (detailItem.quantity || 1), project?.currency), highlighted: true }
                    ].map((c, i) => (
                      <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[9px] font-bold text-slate-405 uppercase tracking-widest">{c.label}</p>
                        <p className={cn("text-sm font-black mt-1 text-slate-800", c.highlighted && "text-blue-600")}>{c.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specifications Grid */}
                {(detailItem.brand || detailItem.modelNo || detailItem.supplier || detailItem.finish || detailItem.dimensions || detailItem.colorCode) && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Specifications</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {detailItem.brand && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-bold text-slate-405 uppercase tracking-widest">Brand</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{detailItem.brand}</p>
                        </div>
                      )}
                      {detailItem.modelNo && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-bold text-slate-405 uppercase tracking-widest">Model No</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{detailItem.modelNo}</p>
                        </div>
                      )}
                      {detailItem.supplier && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-bold text-slate-405 uppercase tracking-widest">Supplier</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{detailItem.supplier}</p>
                        </div>
                      )}
                      {detailItem.finish && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                          <p className="text-[9px] font-bold text-slate-405 uppercase tracking-widest">Finish</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{detailItem.finish}</p>
                        </div>
                      )}
                      {detailItem.dimensions && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 col-span-2">
                          <p className="text-[9px] font-bold text-slate-405 uppercase tracking-widest">Dimensions</p>
                          <p className="text-sm font-bold text-slate-800 mt-1">{detailItem.dimensions}</p>
                        </div>
                      )}
                      {detailItem.colorCode && (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 col-span-2">
                          <p className="text-[9px] font-bold text-slate-405 uppercase tracking-widest">Color Code</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-slate-200"
                              style={{ backgroundColor: detailItem.colorCode.startsWith('#') ? detailItem.colorCode : `#${detailItem.colorCode}` }}
                            />
                            <span className="text-sm font-bold text-slate-800">{detailItem.colorCode}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes Block */}
                {detailItem.notes && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes</h4>
                    <div className="bg-slate-50/55 border border-slate-100 rounded-xl p-4 italic text-sm text-slate-600">
                      "{detailItem.notes}"
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
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl text-sm font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Item
                  </button>
                  <button
                    onClick={() => {
                      const item = detailItem;
                      setDetailItem(null);
                      handleDelete(item);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 text-red-650 rounded-2xl text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
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
          <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-150 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900">{editing ? 'Edit FFE Item' : 'Add FFE Item'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {editing ? 'Update Item Details' : 'Track New Furniture, Fixture, or Equipment'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Item Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  placeholder="e.g. Sofa Set"
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  >
                    {FFE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  >
                    {FFE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Quantity, Unit, Unit Cost */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Unit Type</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="nos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Unit Cost ($)</label>
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
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Assign to Room</label>
                  <select
                    value={form.room}
                    onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                  >
                    <option value="">— No Room Assigned —</option>
                    {rooms.map(r => (
                      <option key={r._id} value={r._id}>
                        {r.name} {r.floor ? `(Floor ${r.floor})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specifications Split Divider */}
              <div className="relative py-2 shrink-0">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white px-3 text-slate-400">Specifications (Optional)</span></div>
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="e.g. IKEA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Model No.</label>
                  <input
                    type="text"
                    value={form.modelNo}
                    onChange={e => setForm(f => ({ ...f, modelNo: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="e.g. SK-401"
                  />
                </div>
              </div>

              {/* Supplier & Finish */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Supplier</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="e.g. ABC Decor"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Finish</label>
                  <input
                    type="text"
                    value={form.finish}
                    onChange={e => setForm(f => ({ ...f, finish: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="e.g. Matte Finish"
                  />
                </div>
              </div>

              {/* Color Code & Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Color Code</label>
                  <input
                    type="text"
                    value={form.colorCode}
                    onChange={e => setForm(f => ({ ...f, colorCode: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="e.g. #FFFFFF"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Dimensions</label>
                  <input
                    type="text"
                    value={form.dimensions}
                    onChange={e => setForm(f => ({ ...f, dimensions: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold"
                    placeholder="e.g. 200cm x 90cm x 75cm"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold resize-none"
                  placeholder="Additional item descriptions, specification details, etc."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? 'Save Changes' : 'Add FFE Item'}
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
          <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-150 text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete FFE Item</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete "{confirmDeleteId.name}"? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-655 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const item = confirmDeleteId;
                  setConfirmDeleteId(null);
                  executeDelete(item);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-655 hover:bg-red-500 text-white font-bold text-sm transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
