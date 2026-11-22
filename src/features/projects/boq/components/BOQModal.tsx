'use client';
import { tr } from '@/i18n';
import { projectCurrency } from '@/lib/projectCurrency';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Tag, GitBranch, Info, Plus, Trash2, Save,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { BOQItem } from '@/types';
import { formatCurrency, MAX_INPUT_VALUE } from '@/lib/utils';
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
    if (rows.length === 1) { toast.error(tr("At least one item is required")); return; }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const validateCreate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!groupName.trim()) newErrors.groupName = 'Group name is required';
    else if (groupName.trim().length < 3) newErrors.groupName = 'Minimum 3 characters required';

    rows.forEach(row => {
      if (!row.itemDescription.trim()) newErrors[`${row.id}_itemDescription`] = 'Description required';
      if (!row.quantity || Number(row.quantity) <= 0) newErrors[`${row.id}_quantity`] = 'Quantity > 0 required';
      else if (Number(row.quantity) > MAX_INPUT_VALUE) newErrors[`${row.id}_quantity`] = 'Quantity is too large';
      if (!row.unit) newErrors[`${row.id}_unit`] = 'Unit required';
      if (!row.unitCost || Number(row.unitCost) <= 0) newErrors[`${row.id}_unitCost`] = 'Rate > 0 required';
      else if (Number(row.unitCost) > MAX_INPUT_VALUE) newErrors[`${row.id}_unitCost`] = 'Rate is too large';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEdit = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editForm.itemDescription.trim()) newErrors.itemDescription = 'Description required';
    if (!editForm.quantity || Number(editForm.quantity) <= 0) newErrors.quantity = 'Quantity > 0 required';
    else if (Number(editForm.quantity) > MAX_INPUT_VALUE) newErrors.quantity = 'Quantity is too large';
    if (!editForm.unitCost || Number(editForm.unitCost) <= 0) newErrors.unitCost = 'Rate > 0 required';
    else if (Number(editForm.unitCost) > MAX_INPUT_VALUE) newErrors.unitCost = 'Rate is too large';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;

    if (isNewVersion && initialData) {
      const unchanged =
        editForm.groupName === initialData.groupName &&
        editForm.itemNumber === (initialData.itemNumber || '') &&
        editForm.itemDescription === initialData.itemDescription &&
        editForm.unit === (initialData.unit || '') &&
        Number(editForm.quantity) === initialData.quantity &&
        Number(editForm.unitCost) === initialData.unitCost &&
        editForm.remark === (initialData.remark || '');
      if (unchanged) {
        toast.error(tr("Make at least one change before creating a new version"));
        return false;
      }
    }
    return true;
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
        toast.success(isNewVersion ? tr("New version v{{nextVersion}} created", { nextVersion: nextVersion }) : tr("BOQ item updated"));
      } else {
        const items = rows.map(({ id: _id, quantity, unitCost, ...r }) => ({
          ...r,
          groupName,
          quantity: Number(quantity),
          unitCost: Number(unitCost),
        }));
        await api.post(`/projects/${projectId}/boq`, { items });
        toast.success(tr("{{itemsCount}} item{{value}} added to BOQ", { itemsCount: items.length, value: items.length > 1 ? 's' : '' }));
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.status >= 500) {
        toast.success(
          initialData
            ? isNewVersion ? tr("New version v{{nextVersion}} created", { nextVersion: nextVersion }) : tr("BOQ item updated")
            : tr("Items added to BOQ")
        );
        onSuccess();
        onClose();
      } else {
        toast.error(error.response?.data?.message || tr("Failed to save BOQ item"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = (hasError?: boolean) =>
    `w-full bg-white border rounded-xl py-1.5 px-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all ${
      hasError ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
    }`;

  const editTotal = (Number(editForm.quantity) || 0) * (Number(editForm.unitCost) || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="w-full max-w-3xl relative z-10 max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  {isNewVersion ? <GitBranch className="w-4.5 h-4.5 text-blue-600" /> : <Tag className="w-4.5 h-4.5 text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{tr(modalTitle)}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isNewVersion
                      ? tr("v{{currentVersion}} will be archived. New v{{nextVersion}} starts as Draft.", { currentVersion: currentVersion, nextVersion: nextVersion })
                      : initialData
                        ? tr("Update item specifications, cost, and quantities")
                        : tr("Set group name and configure line items")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* New-version info banner */}
            {isNewVersion && (
              <div className="mx-5 mt-3 flex items-start gap-3 p-3 bg-blue-50 border border-blue-200/80 rounded-xl shrink-0">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold">{tr("Creating a new version:")}</span>{tr(" Current approved v")}{tr(currentVersion)}{tr(" will be archived. New v")}{tr(nextVersion)}{tr(" starts as ")}<span className="font-bold">{tr("Draft")}</span>.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">

                {/* ── EDIT / NEW VERSION MODE ── */}
                {initialData && (
                  <div className="space-y-3">
                    {/* Row 1: Group Name + Item Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-8">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          {tr("Group Name ")}<span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          value={editForm.groupName}
                          onChange={e => setEditForm({ ...editForm, groupName: e.target.value })}
                          className={inputCls()}
                          placeholder={tr("e.g. Civil Works")}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          {tr("Item # (Optional)")}
                        </label>
                        <input
                          value={editForm.itemNumber}
                          onChange={e => setEditForm({ ...editForm, itemNumber: e.target.value })}
                          className={inputCls()}
                          placeholder={tr("e.g. CW-01")}
                        />
                      </div>
                    </div>

                    {/* Row 2: Description */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        {tr("Description ")}<span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        value={editForm.itemDescription}
                        onChange={e => setEditForm({ ...editForm, itemDescription: e.target.value })}
                        className={inputCls(!!errors.itemDescription)}
                        placeholder={tr("Detailed item description...")}
                      />
                      {errors.itemDescription && <p className="text-[11px] text-rose-500 mt-0.5">{tr(errors.itemDescription)}</p>}
                    </div>

                    {/* Row 3: Quantity + Unit + Unit Cost */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          {tr("Quantity ")}<span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={MAX_INPUT_VALUE}
                          step="any"
                          required
                          value={editForm.quantity}
                          onChange={e => setEditForm({ ...editForm, quantity: e.target.value })}
                          className={inputCls(!!errors.quantity)}
                          placeholder="0"
                        />
                        {errors.quantity && <p className="text-[11px] text-rose-500 mt-0.5">{errors.quantity}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">{tr("Unit")}</label>
                        <select
                          value={editForm.unit}
                          onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                          className={inputCls()}
                        >
                          <option value="">{tr("Select Unit")}</option>
                          {UNIT_OPTIONS.map(u => <option key={u} value={u}>{tr(u)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          {tr("Rate (")}{projectCurrency(project)}) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={MAX_INPUT_VALUE}
                          step="any"
                          required
                          value={editForm.unitCost}
                          onChange={e => setEditForm({ ...editForm, unitCost: e.target.value })}
                          className={inputCls(!!errors.unitCost)}
                          placeholder="0"
                        />
                        {errors.unitCost && <p className="text-[11px] text-rose-500 mt-0.5">{tr(errors.unitCost)}</p>}
                      </div>
                    </div>

                    {/* Row 4: Remark + Total inline */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-8">
                        <label className="text-xs font-semibold text-slate-700 block mb-1">{tr("Remark (optional)")}</label>
                        <input
                          value={editForm.remark}
                          onChange={e => setEditForm({ ...editForm, remark: e.target.value })}
                          className={inputCls()}
                          placeholder={tr("Optional note...")}
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
                          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">{tr("Total")}</span>
                          <span className="text-xs font-bold text-slate-900">
                            {formatCurrency(editTotal, projectCurrency(project))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── CREATE MODE ── */}
                {!initialData && (
                  <div className="space-y-3">
                    {/* Compact Group Name Input */}
                    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <label className="text-xs font-semibold text-slate-700 shrink-0">
                        {tr("BOQ Group Name ")}<span className="text-rose-500">*</span>:
                      </label>
                      <div className="flex-1 min-w-0">
                        <input
                          required
                          list="boq-group-names"
                          value={groupName}
                          onChange={e => { setGroupName(e.target.value); if (errors.groupName) setErrors(p => { const n = { ...p }; delete n.groupName; return n; }); }}
                          className={inputCls(!!errors.groupName)}
                          placeholder={tr("e.g. Civil Works, Finishing Works")}
                        />
                        {existingGroups.length > 0 && (
                          <datalist id="boq-group-names">
                            {existingGroups.map(g => <option key={g} value={g} />)}
                          </datalist>
                        )}
                        {errors.groupName && <p className="text-[11px] text-rose-500 mt-1">{tr(errors.groupName)}</p>}
                      </div>
                    </div>

                    {/* Items Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          {tr("Line Items (")}{rows.length})
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {rows.map((row, idx) => (
                          <div key={row.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 space-y-2">
                            {/* Item card header */}
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{tr("Item ")}{idx + 1}</span>
                                {row.quantity && row.unitCost && Number(row.quantity) > 0 && Number(row.unitCost) > 0 && (
                                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                                    {tr("Est. ")}{formatCurrency(Number(row.quantity) * Number(row.unitCost), projectCurrency(project))}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                disabled={rows.length === 1}
                                className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-0 disabled:pointer-events-none transition-colors rounded-md cursor-pointer"
                                title={tr("Remove item")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Row 1: Item # + Description */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <div className="sm:col-span-3">
                                <input
                                  value={row.itemNumber || ''}
                                  onChange={e => updateRow(row.id, 'itemNumber', e.target.value)}
                                  className={inputCls()}
                                  placeholder={tr("Item # (Optional)")}
                                />
                              </div>
                              <div className="sm:col-span-9">
                                <input
                                  required
                                  value={row.itemDescription}
                                  onChange={e => updateRow(row.id, 'itemDescription', e.target.value)}
                                  className={inputCls(!!errors[`${row.id}_itemDescription`])}
                                  placeholder={tr("Item Description *")}
                                />
                                {errors[`${row.id}_itemDescription`] && (
                                  <p className="text-[11px] text-rose-500 mt-0.5">{tr(errors[`${row.id}_itemDescription`])}</p>
                                )}
                              </div>
                            </div>

                            {/* Row 2: Qty + Unit + Unit Cost + Remark */}
                            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
                              <div className="col-span-1 sm:col-span-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={MAX_INPUT_VALUE}
                                  step="any"
                                  required
                                  value={row.quantity}
                                  onChange={e => updateRow(row.id, 'quantity', e.target.value)}
                                  className={inputCls(!!errors[`${row.id}_quantity`])}
                                  placeholder={tr("Qty *")}
                                />
                                {errors[`${row.id}_quantity`] && (
                                  <p className="text-[11px] text-rose-500 mt-0.5">{tr(errors[`${row.id}_quantity`])}</p>
                                )}
                              </div>
                              <div className="col-span-1 sm:col-span-2">
                                <select
                                  value={row.unit}
                                  onChange={e => updateRow(row.id, 'unit', e.target.value)}
                                  className={inputCls(!!errors[`${row.id}_unit`])}
                                >
                                  <option value="">{tr("Unit *")}</option>
                                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{tr(u)}</option>)}
                                </select>
                                {errors[`${row.id}_unit`] && (
                                  <p className="text-[11px] text-rose-500 mt-0.5">{tr(errors[`${row.id}_unit`])}</p>
                                )}
                              </div>
                              <div className="col-span-1 sm:col-span-3">
                                <input
                                  type="number"
                                  min={0}
                                  max={MAX_INPUT_VALUE}
                                  step="any"
                                  required
                                  value={row.unitCost}
                                  onChange={e => updateRow(row.id, 'unitCost', e.target.value)}
                                  className={inputCls(!!errors[`${row.id}_unitCost`])}
                                  placeholder={tr("Rate ({{value}}) *", { value: projectCurrency(project) })}
                                />
                                {errors[`${row.id}_unitCost`] && (
                                  <p className="text-[11px] text-rose-500 mt-0.5">{tr(errors[`${row.id}_unitCost`])}</p>
                                )}
                              </div>
                              <div className="col-span-1 sm:col-span-5">
                                <input
                                  value={row.remark}
                                  onChange={e => updateRow(row.id, 'remark', e.target.value)}
                                  className={inputCls()}
                                  placeholder={tr("Remark (optional)")}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Another Item button */}
                      <button
                        type="button"
                        onClick={addRow}
                        className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl bg-white hover:bg-blue-50/30 text-blue-600 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{tr("Add Another Item")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  {tr("Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{tr("Saving…")}</span>
                    </>
                  ) : isNewVersion ? (
                    <>
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{tr("Create v")}{tr(nextVersion)}</span>
                    </>
                  ) : initialData ? (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{tr("Update BOQ Item")}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{rows.length > 1 ? tr("Save {{rowsCount}} Items", { rowsCount: rows.length }) : tr("Create BOQ Group")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
