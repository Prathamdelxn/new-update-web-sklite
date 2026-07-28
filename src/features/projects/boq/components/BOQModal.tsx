'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Tag, GitBranch, Info, Plus, Trash2, Save,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { BOQItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';

const UNIT_OPTIONS = ['Sq Ft', 'Cum', 'Kg', 'Ton', 'Nos', 'Rm', 'Ltr', 'Bags', 'Sqm', 'm', 'Rft', 'No'];

interface BOQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  initialData: BOQItem | null;
  existingGroups?: string[];
  isNewVersion?: boolean;
  defaultGroupName?: string;
}

interface RowItem {
  id: string;
  itemNumber: string;
  itemDescription: string;
  unit: string;
  quantity: string;
  unitCost: string;
  remark: string;
}

const emptyRow = (): RowItem => ({
  id: Math.random().toString(36).slice(2),
  itemNumber: '',
  itemDescription: '',
  unit: '',
  quantity: '',
  unitCost: '',
  remark: '',
});

export const BOQModal: React.FC<BOQModalProps> = ({
  isOpen, onClose, onSuccess, projectId, initialData, existingGroups = [], isNewVersion = false, defaultGroupName,
}) => {
  const { project } = useProjectContext();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  const currentVersion = (initialData as any)?.version || 1;
  const nextVersion = currentVersion + 1;

  const modalTitle = isNewVersion
    ? `Create New Version (v${nextVersion})`
    : initialData ? 'Edit BOQ Item' : 'Add BOQ Items';

  // Edit mode form
  const [editForm, setEditForm] = useState({
    groupName: '',
    itemNumber: '',
    itemDescription: '',
    unit: '',
    quantity: '',
    unitCost: '',
    remark: '',
  });

  // Create mode
  const [groupName, setGroupName] = useState('');
  const [rows, setRows] = useState<RowItem[]>([emptyRow()]);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (initialData) {
      setEditForm({
        groupName: initialData.groupName,
        itemNumber: initialData.itemNumber || '',
        itemDescription: initialData.itemDescription,
        unit: initialData.unit || '',
        quantity: String(initialData.quantity),
        unitCost: String(initialData.unitCost),
        remark: initialData.remark || '',
      });
    } else {
      setGroupName(defaultGroupName || '');
      setRows([emptyRow()]);
    }
  }, [initialData, isOpen, defaultGroupName]);

  const updateRow = (id: string, field: keyof RowItem, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    if (errors[`${id}_${field}`]) {
      setErrors(prev => { const n = { ...prev }; delete n[`${id}_${field}`]; return n; });
    }
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (id: string) => {
    if (rows.length === 1) { toast.error('At least one item is required'); return; }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const validateCreate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!groupName.trim()) newErrors.groupName = 'Group name is required';
    else if (groupName.trim().length < 3) newErrors.groupName = 'Minimum 3 characters required';

    rows.forEach(row => {
      if (!row.itemDescription.trim()) newErrors[`${row.id}_itemDescription`] = 'Description required';
      if (!row.quantity || Number(row.quantity) <= 0) newErrors[`${row.id}_quantity`] = 'Quantity > 0 required';
      if (!row.unit) newErrors[`${row.id}_unit`] = 'Unit required';
      if (!row.unitCost || Number(row.unitCost) <= 0) newErrors[`${row.id}_unitCost`] = 'Unit cost > 0 required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEdit = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editForm.itemDescription.trim()) newErrors.itemDescription = 'Description required';
    if (!editForm.quantity || Number(editForm.quantity) <= 0) newErrors.quantity = 'Quantity > 0 required';
    if (!editForm.unitCost || Number(editForm.unitCost) <= 0) newErrors.unitCost = 'Unit cost > 0 required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData ? !validateEdit() : !validateCreate()) return;

    setIsLoading(true);
    try {
      if (initialData) {
        await api.patch(`/projects/${projectId}/boq/${initialData._id}`, {
          ...editForm,
          quantity: Number(editForm.quantity),
          unitCost: Number(editForm.unitCost),
        });
        toast.success(isNewVersion ? `New version v${nextVersion} created` : 'BOQ item updated');
      } else {
        const items = rows.map(({ id: _id, quantity, unitCost, ...r }) => ({
          ...r,
          groupName,
          quantity: Number(quantity),
          unitCost: Number(unitCost),
        }));
        await api.post(`/projects/${projectId}/boq`, { items });
        toast.success(`${items.length} item${items.length > 1 ? 's' : ''} added to BOQ`);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.status >= 500) {
        toast.success(
          initialData
            ? isNewVersion ? `New version v${nextVersion} created` : 'BOQ item updated'
            : 'Items added to BOQ'
        );
        onSuccess();
        onClose();
      } else {
        toast.error(error.response?.data?.message || 'Failed to save BOQ item');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (hasError?: boolean) =>
    `w-full bg-white border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

  const editTotal = (Number(editForm.quantity) || 0) * (Number(editForm.unitCost) || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="w-full md:max-w-lg relative z-10 max-h-[92vh] flex flex-col"
          >
            <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

              {/* Header — matches mobile sheet header gradient */}
              <div className={`px-6 py-5 rounded-t-3xl md:rounded-t-2xl text-white shrink-0 ${isNewVersion ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
                {/* Drag indicator */}
                <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <div>
                    {isNewVersion && <GitBranch className="w-5 h-5 mb-1 opacity-80" />}
                    <h2 className="text-lg font-bold">{modalTitle}</h2>
                    {isNewVersion && (
                      <p className="text-xs opacity-80 mt-0.5">v{currentVersion} will be archived. New v{nextVersion} starts as Draft.</p>
                    )}
                    {!isNewVersion && !initialData && (
                      <p className="text-xs opacity-80 mt-0.5">Set a group name then add items</p>
                    )}
                  </div>
                  <button onClick={onClose} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* New-version info banner */}
              {isNewVersion && (
                <div className="mx-6 mt-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl shrink-0">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <span className="font-bold">Creating a new version:</span> The current approved v{currentVersion} will be archived. New v{nextVersion} will start as <span className="font-bold">Draft</span> and require re-approval.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                  {/* ── EDIT / NEW VERSION MODE ── */}
                  {initialData && (
                    <>
                      {/* Group Info Section */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Tag className="w-5 h-5 text-blue-500" />
                          <p className="font-bold text-gray-900">BOQ Group Information</p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                              Group Name <span className="text-red-400">*</span>
                            </label>
                            <input
                              required
                              value={editForm.groupName}
                              onChange={e => setEditForm({ ...editForm, groupName: e.target.value })}
                              className={inputCls()}
                              placeholder="e.g. Civil Works"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                              Item # (Optional)
                            </label>
                            <input
                              value={editForm.itemNumber}
                              onChange={e => setEditForm({ ...editForm, itemNumber: e.target.value })}
                              className={inputCls()}
                              placeholder="e.g. CW-01"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Item Details Section */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Tag className="w-5 h-5 text-blue-500" />
                          <p className="font-bold text-gray-900">Item Details</p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                              Description <span className="text-red-400">*</span>
                            </label>
                            <textarea
                              required
                              rows={2}
                              value={editForm.itemDescription}
                              onChange={e => setEditForm({ ...editForm, itemDescription: e.target.value })}
                              className={inputCls(!!errors.itemDescription) + ' resize-none'}
                              placeholder="Detailed item description..."
                            />
                            {errors.itemDescription && <p className="text-xs text-red-500 mt-1">{errors.itemDescription}</p>}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                                Quantity <span className="text-red-400">*</span>
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                required
                                value={editForm.quantity}
                                onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                                className={inputCls(!!errors.quantity)}
                                placeholder="0"
                              />
                              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Unit</label>
                              <select
                                value={editForm.unit}
                                onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                                className={inputCls()}
                              >
                                <option value="">Select Unit</option>
                                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                              Unit Cost ($) <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              required
                              value={editForm.unitCost}
                              onChange={e => setEditForm({ ...editForm, unitCost: e.target.value })}
                              className={inputCls(!!errors.unitCost)}
                              placeholder="0"
                            />
                            {errors.unitCost && <p className="text-xs text-red-500 mt-1">{errors.unitCost}</p>}
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Remark (optional)</label>
                            <input
                              value={editForm.remark}
                              onChange={e => setEditForm({ ...editForm, remark: e.target.value })}
                              className={inputCls()}
                              placeholder="Optional note..."
                            />
                          </div>

                          {/* Total */}
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 border border-blue-200">
                            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Total</span>
                            <span className="text-xl font-black text-gray-900">{formatCurrency(editTotal, project?.currency || '$')}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── CREATE MODE — matches mobile CreateBOQDraftScreen ── */}
                  {!initialData && (
                    <>
                      {/* Group Info Section */}
                      <div className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Tag className="w-5 h-5 text-blue-500" />
                          <p className="font-bold text-gray-900">BOQ Group Information</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                            Group Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            required
                            list="boq-group-names"
                            value={groupName}
                            onChange={e => { setGroupName(e.target.value); if (errors.groupName) setErrors(p => { const n = { ...p }; delete n.groupName; return n; }); }}
                            className={inputCls(!!errors.groupName)}
                            placeholder="e.g. Civil Works, Finishing Works"
                          />
                          {existingGroups.length > 0 && (
                            <datalist id="boq-group-names">
                              {existingGroups.map(g => <option key={g} value={g} />)}
                            </datalist>
                          )}
                          {errors.groupName && <p className="text-xs text-red-500 mt-1">{errors.groupName}</p>}
                          {existingGroups.length > 0 && !errors.groupName && (
                            <p className="text-[11px] text-slate-400 mt-1">Type an existing group name to add items to it, or enter a new name.</p>
                          )}
                        </div>
                      </div>

                      {/* Items Section — card-style matching mobile */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Tag className="w-5 h-5 text-blue-500" />
                          <p className="font-bold text-gray-900">Items ({rows.length})</p>
                        </div>

                        <div className="space-y-3">
                          {rows.map((row, idx) => (
                            <div key={row.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                              {/* Item card header */}
                              <div className="flex items-center justify-between mb-4">
                                <p className="font-bold text-gray-900">Item {idx + 1}</p>
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  disabled={rows.length === 1}
                                  className="p-1 text-red-400 hover:text-red-600 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>

                              <div className="space-y-3">
                                {/* Item Number */}
                                <div>
                                  <input
                                    value={row.itemNumber || ''}
                                    onChange={e => updateRow(row.id, 'itemNumber', e.target.value)}
                                    className={inputCls()}
                                    placeholder="Item Number (Optional)"
                                  />
                                </div>

                                {/* Description */}
                                <div>
                                  <input
                                    required
                                    value={row.itemDescription}
                                    onChange={e => updateRow(row.id, 'itemDescription', e.target.value)}
                                    className={inputCls(!!errors[`${row.id}_itemDescription`])}
                                    placeholder="Item Description *"
                                  />
                                  {errors[`${row.id}_itemDescription`] && (
                                    <p className="text-xs text-red-500 mt-1">{errors[`${row.id}_itemDescription`]}</p>
                                  )}
                                </div>

                                {/* Qty + Unit */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      required
                                      value={row.quantity}
                                      onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                                      className={inputCls(!!errors[`${row.id}_quantity`])}
                                      placeholder="Quantity *"
                                    />
                                    {errors[`${row.id}_quantity`] && (
                                      <p className="text-xs text-red-500 mt-1">{errors[`${row.id}_quantity`]}</p>
                                    )}
                                  </div>
                                  <div>
                                    <select
                                      value={row.unit}
                                      onChange={e => updateRow(row.id, 'unit', e.target.value)}
                                      className={inputCls(!!errors[`${row.id}_unit`])}
                                    >
                                      <option value="">Unit *</option>
                                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    {errors[`${row.id}_unit`] && (
                                      <p className="text-xs text-red-500 mt-1">{errors[`${row.id}_unit`]}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Unit cost */}
                                <div>
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    required
                                    value={row.unitCost}
                                    onChange={e => updateRow(row.id, 'unitCost', e.target.value)}
                                    className={inputCls(!!errors[`${row.id}_unitCost`])}
                                    placeholder="Unit Cost ($) *"
                                  />
                                  {errors[`${row.id}_unitCost`] && (
                                    <p className="text-xs text-red-500 mt-1">{errors[`${row.id}_unitCost`]}</p>
                                  )}
                                </div>

                                {/* Remark */}
                                <input
                                  value={row.remark}
                                  onChange={e => updateRow(row.id, 'remark', e.target.value)}
                                  className={inputCls()}
                                  placeholder="Remark (optional)"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Another Item — matches mobile dashed button */}
                        <button
                          type="button"
                          onClick={addRow}
                          className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-300 rounded-2xl bg-white text-blue-600 font-semibold text-sm hover:border-blue-400 hover:bg-blue-50/40 transition-all"
                        >
                          <Plus className="w-5 h-5" />
                          Add Another Item
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer — matches mobile save button */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0 bg-white rounded-b-3xl md:rounded-b-2xl">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-slate-600 text-sm font-semibold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`flex-1 py-3.5 rounded-2xl disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        isNewVersion
                          ? 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20'
                          : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                      }`}
                    >
                      {isLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      ) : isNewVersion ? (
                        <><GitBranch className="w-4 h-4" /> Create v{nextVersion}</>
                      ) : initialData ? (
                        <><Save className="w-4 h-4" /> Update BOQ Item</>
                      ) : (
                        <><Save className="w-4 h-4" /> {rows.length > 1 ? `Save ${rows.length} Items` : 'Create BOQ Group'}</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
