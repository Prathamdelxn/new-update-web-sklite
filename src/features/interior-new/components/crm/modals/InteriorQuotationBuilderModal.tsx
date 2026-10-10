'use client';

// =============================================================================
// Sky-Lite Web — Interior CRM Quotation Builder Modal
// Creates single or multiple quotations linked to BOQ estimation with:
// - All BOQ Items (Full Scope)
// - By Section / Category Selection
// - Granular Line-Item / Sub-Item Picking
// - Custom Items & Multi-Quotation Option Naming
// - Margin / Markup Applicator, Discount, Tax & Proforma Emailing
// =============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Tag,
  Info,
  CheckCheck,
  LayoutGrid,
  ListChecks,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { cn, parseMaxBudget } from '@/lib/utils';

export interface StructuredSection {
  id: string;
  sectionNumber: string;
  sectionTitle: string;
  items: any[];
  subTotal: number;
}

export interface QuotationItem {
  id?: string;
  boqItemId?: string;
  sectionTitle?: string;
  category?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  total: number;
}

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerEmail?: string;
  existingQuotations?: any[];
  existingBoqs?: any[];
  editingQuotationIndex?: number | null;
  lead?: any;
  onSuccess: () => void;
}

export function InteriorQuotationBuilderModal({
  isOpen,
  onClose,
  customerId,
  customerEmail = '',
  existingQuotations = [],
  existingBoqs = [],
  editingQuotationIndex = null,
  lead,
  onSuccess,
}: QuotationBuilderModalProps) {
  const toast = useToast();
  const { currencySymbol, currencyCode } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = editingQuotationIndex !== null && editingQuotationIndex !== undefined && editingQuotationIndex >= 0;
  const targetEditQuote = isEditing && existingQuotations ? existingQuotations[editingQuotationIndex] : null;

  // Available BOQs
  const boqList = useMemo(() => {
    return existingBoqs && existingBoqs.length > 0
      ? existingBoqs
      : lead?.boqs && lead.boqs.length > 0
      ? lead.boqs
      : [];
  }, [existingBoqs, lead?.boqs]);

  // Default to approved BOQ or latest BOQ
  const defaultBoqIdx = useMemo(() => {
    if (boqList.length === 0) return 0;
    const approvedIdx = boqList.findIndex((b: any) => b.status === 'approved');
    return approvedIdx !== -1 ? approvedIdx : boqList.length - 1;
  }, [boqList]);

  const [selectedBoqIndex, setSelectedBoqIndex] = useState<number>(defaultBoqIdx);
  const activeBoq = boqList[selectedBoqIndex] || null;

  // Quotation Metadata State
  const [quotationTitle, setQuotationTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QuotationItem[]>([
    { description: '', quantity: 1, unit: 'Nos', unitPrice: 0, total: 0 },
  ]);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Scope Selection UI Mode: 'all' | 'categories' | 'items' | 'custom'
  const [scopeMode, setScopeMode] = useState<'all' | 'categories' | 'items' | 'custom'>('all');
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<Record<string, boolean>>({});
  const [selectedBoqItemIds, setSelectedBoqItemIds] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Parse BOQ structured sections and items
  const structuredBoqSections = useMemo<StructuredSection[]>(() => {
    if (!activeBoq) return [];
    if (activeBoq.sections && Array.isArray(activeBoq.sections) && activeBoq.sections.length > 0) {
      return activeBoq.sections.map((sec: any, idx: number) => {
        const secItems = (activeBoq.items || []).filter(
          (it: any) =>
            it.sectionId === (sec.sectionId || sec.id) ||
            it.sectionTitle === sec.sectionTitle ||
            it.category === sec.sectionTitle
        );
        const subTotal = secItems.reduce(
          (sum: number, it: any) =>
            sum + (Number(it.amount) || Number(it.quantity || 0) * Number(it.rate || 0) || 0),
          0
        );
        return {
          id: sec.sectionId || sec.id || `sec-${idx}`,
          sectionNumber: sec.sectionNumber || String(idx + 1),
          sectionTitle: sec.sectionTitle || `Section ${idx + 1}`,
          items: secItems,
          subTotal,
        };
      });
    }

    // Fallback: group by category
    const categories: string[] = Array.from(
      new Set<string>((activeBoq.items || []).map((it: any) => (it.category || 'General Works') as string))
    );
    return categories.map((cat, idx) => {
      const catItems = (activeBoq.items || []).filter((it: any) => (it.category || 'General Works') === cat);
      const subTotal = catItems.reduce(
        (sum: number, it: any) =>
          sum + (Number(it.amount) || Number(it.quantity || 0) * Number(it.rate || 0) || 0),
        0
      );
      return {
        id: `cat-${idx}`,
        sectionNumber: String(idx + 1),
        sectionTitle: cat,
        items: catItems,
        subTotal,
      };
    });
  }, [activeBoq]);

  const allBoqItems = useMemo(() => {
    return activeBoq?.items && Array.isArray(activeBoq.items) ? activeBoq.items : [];
  }, [activeBoq]);

  // Initialize or reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setTitleError(null);
      if (isEditing && targetEditQuote) {
        // Edit mode prefill
        setQuotationTitle(targetEditQuote.title || `Quotation ${editingQuotationIndex + 1}`);
        setItems(
          targetEditQuote.items && targetEditQuote.items.length > 0
            ? targetEditQuote.items.map((it: any) => ({
                ...it,
                quantity: Number(it.quantity) || 1,
                unitPrice: Number(it.unitPrice) || 0,
                total: Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
              }))
            : [{ description: '', quantity: 1, unit: 'Nos', unitPrice: 0, total: 0 }]
        );
        setTaxPercentage(Number(targetEditQuote.taxPercentage) || 0);
        setDiscount(Number(targetEditQuote.discount) || 0);
        setNotes(targetEditQuote.notes || '');
        setScopeMode(targetEditQuote.scopeMode || 'custom');
      } else {
        // Create mode
        setSelectedBoqIndex(defaultBoqIdx);
        setQuotationTitle('');
        setTaxPercentage(0);
        setDiscount(0);
        setNotes('1. 50% mobilization advance upon signing contract.\n2. 40% against work progress milestones.\n3. 10% on successful handover and snag completion.\n4. Proposal validity: 30 days from date of issue.');

        // By default select all categories & items
        if (activeBoq && allBoqItems.length > 0) {
          const catMap: Record<string, boolean> = {};
          const itemMap: Record<string, boolean> = {};
          const expMap: Record<string, boolean> = {};

          structuredBoqSections.forEach((sec) => {
            catMap[sec.sectionTitle] = true;
            expMap[sec.id] = true;
            sec.items.forEach((it: any, itIdx: number) => {
              const itId = it.id || it._id || `${sec.id}-item-${itIdx}`;
              itemMap[itId] = true;
            });
          });

          setSelectedCategoryNames(catMap);
          setSelectedBoqItemIds(itemMap);
          setExpandedSections(expMap);

          // Populate quotation items from full BOQ
          populateQuotationItems(itemMap);
        } else {
          setItems([{ description: '', quantity: 1, unit: 'Nos', unitPrice: 0, total: 0 }]);
        }
      }
    }
  }, [isOpen, defaultBoqIdx, isEditing, targetEditQuote]);

  // Convert selected BOQ items into Quotation line items
  const populateQuotationItems = (selectedMap: Record<string, boolean>) => {
    if (!activeBoq || allBoqItems.length === 0) return;

    const newQuoteItems: QuotationItem[] = [];

    structuredBoqSections.forEach((sec) => {
      sec.items.forEach((it: any, itIdx: number) => {
        const itId = it.id || it._id || `${sec.id}-item-${itIdx}`;
        if (selectedMap[itId]) {
          const qty = Number(it.quantity) || 1;
          const unitPrice = Number(it.rate) || 0;
          newQuoteItems.push({
            id: `qi-${Date.now()}-${itIdx}`,
            boqItemId: itId,
            sectionTitle: sec.sectionTitle,
            category: it.category || sec.sectionTitle,
            description: it.itemName || it.name || it.title || (it.description ? it.description.split('\n')[0] : 'Item'),
            quantity: qty,
            unit: it.unit || 'Nos',
            unitPrice: unitPrice,
            total: qty * unitPrice,
          });
        }
      });
    });

    if (newQuoteItems.length > 0) {
      setItems(newQuoteItems);
    } else {
      setItems([{ description: '', quantity: 1, unit: 'Nos', unitPrice: 0, total: 0 }]);
    }
  };

  // Toggle Entire Category
  const toggleCategory = (categoryTitle: string, isChecked: boolean) => {
    const updatedCatMap = { ...selectedCategoryNames, [categoryTitle]: isChecked };
    setSelectedCategoryNames(updatedCatMap);

    const updatedItemMap = { ...selectedBoqItemIds };
    const sec = structuredBoqSections.find((s) => s.sectionTitle === categoryTitle);
    if (sec) {
      sec.items.forEach((it: any, itIdx: number) => {
        const itId = it.id || it._id || `${sec.id}-item-${itIdx}`;
        updatedItemMap[itId] = isChecked;
      });
    }

    setSelectedBoqItemIds(updatedItemMap);
    populateQuotationItems(updatedItemMap);
  };

  // Toggle Individual Item
  const toggleItem = (itemId: string, categoryTitle: string, isChecked: boolean) => {
    const updatedItemMap = { ...selectedBoqItemIds, [itemId]: isChecked };
    setSelectedBoqItemIds(updatedItemMap);

    // Check if all items in category are checked
    const sec = structuredBoqSections.find((s) => s.sectionTitle === categoryTitle);
    if (sec) {
      const allSelected = sec.items.every((it: any, idx: number) => {
        const id = it.id || it._id || `${sec.id}-item-${idx}`;
        return Boolean(updatedItemMap[id]);
      });
      setSelectedCategoryNames((prev) => ({ ...prev, [categoryTitle]: allSelected }));
    }

    populateQuotationItems(updatedItemMap);
  };

  // Quick Scope Mode Handlers
  const handleSelectAllScope = () => {
    setScopeMode('all');
    const catMap: Record<string, boolean> = {};
    const itemMap: Record<string, boolean> = {};

    structuredBoqSections.forEach((sec) => {
      catMap[sec.sectionTitle] = true;
      sec.items.forEach((it: any, itIdx: number) => {
        const itId = it.id || it._id || `${sec.id}-item-${itIdx}`;
        itemMap[itId] = true;
      });
    });

    setSelectedCategoryNames(catMap);
    setSelectedBoqItemIds(itemMap);
    populateQuotationItems(itemMap);
    toast.success('Selected all BOQ categories and items.');
  };

  // Item Table Handlers
  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      item.total = qty * price;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const addCustomItem = () => {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unit: 'Nos', unitPrice: 0, total: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ description: '', quantity: 1, unit: 'Nos', unitPrice: 0, total: 0 }]);
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // Calculation metrics with financial rounding precision
  const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
  const subtotal = round2(items.reduce((acc, item) => acc + (Number(item.total) || 0), 0));
  const tax = round2((subtotal * (Number(taxPercentage) || 0)) / 100);
  const grandTotal = Math.max(0, round2(subtotal + tax - (Number(discount) || 0)));

  const maxBudget = parseMaxBudget(lead?.budgetRange || lead?.estimatedBudget || lead?.budget);
  const isOverBudget = Boolean(maxBudget && maxBudget > 0 && grandTotal > maxBudget);

  const selectedItemCount = Object.values(selectedBoqItemIds).filter(Boolean).length;
  const totalBoqItemCount = allBoqItems.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quotationTitle.trim()) {
      setTitleError('Please enter a quotation title');
      titleInputRef.current?.focus();
      return;
    }
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
      return toast.error('Please add at least one line item to the quotation.');
    }
    if (items.some((i) => i.quantity <= 0 || isNaN(i.quantity))) {
      return toast.error('Quantity must be greater than 0 for all items.');
    }
    if (items.some((i) => i.unitPrice < 0 || isNaN(i.unitPrice))) {
      return toast.error('Unit price cannot be negative.');
    }
    if (discount < 0 || isNaN(discount)) {
      return toast.error('Discount cannot be negative.');
    }
    if (discount > subtotal + tax) {
      return toast.error('Discount cannot exceed subtotal plus tax.');
    }
    if (grandTotal <= 0) {
      return toast.error('Grand total amount must be greater than zero.');
    }

    setIsSubmitting(true);

    try {
      const updatedQuotations = [...(existingQuotations || [])];

      if (isEditing && editingQuotationIndex !== null && editingQuotationIndex !== undefined) {
        const quotationPayload = {
          ...(targetEditQuote || {}),
          title: quotationTitle.trim() || targetEditQuote?.title || `Quotation ${editingQuotationIndex + 1}`,
          sourceBoqVersion: activeBoq?.version || targetEditQuote?.sourceBoqVersion || 1,
          scopeMode: scopeMode,
          items: items.map((it) => ({
            description: it.description.trim(),
            category: it.category || 'General Scope',
            sectionTitle: it.sectionTitle || '',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'Nos',
            unitPrice: Number(it.unitPrice) || 0,
            total: Number(it.total) || 0,
            boqItemId: it.boqItemId,
          })),
          subtotal,
          taxPercentage: Number(taxPercentage) || 0,
          tax,
          discount: Number(discount) || 0,
          grandTotal,
          notes,
          updatedAt: new Date(),
        };

        updatedQuotations[editingQuotationIndex] = quotationPayload;

        await interiorCrmService.updateCustomer(customerId, {
          quotations: updatedQuotations,
        });

        await interiorCrmService.createActivity({
          customer: customerId,
          type: 'Status Change',
          status: 'Completed',
          remarks: `Updated Quotation ("${quotationPayload.title}") for ${currencySymbol} ${grandTotal.toLocaleString()} (${items.length} items).`,
          completedDate: new Date(),
        });

        toast.success(`Quotation "${quotationPayload.title}" updated successfully!`);
      } else {
        const newQuotationNum = updatedQuotations.length + 1;
        const quotationPayload = {
          version: newQuotationNum,
          title: quotationTitle.trim() || `Quotation ${newQuotationNum}`,
          sourceBoqVersion: activeBoq?.version || 1,
          scopeMode: scopeMode,
          items: items.map((it) => ({
            description: it.description.trim(),
            category: it.category || 'General Scope',
            sectionTitle: it.sectionTitle || '',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'Nos',
            unitPrice: Number(it.unitPrice) || 0,
            total: Number(it.total) || 0,
            boqItemId: it.boqItemId,
          })),
          subtotal,
          taxPercentage: Number(taxPercentage) || 0,
          tax,
          discount: Number(discount) || 0,
          grandTotal,
          notes,
          status: 'Generated',
          createdAt: new Date(),
        };

        updatedQuotations.push(quotationPayload);

        await interiorCrmService.updateCustomer(customerId, {
          quotations: updatedQuotations,
          status: 'Under Quotation',
        });

        await interiorCrmService.createActivity({
          customer: customerId,
          type: 'Status Change',
          status: 'Completed',
          remarks: `Created Quotation ("${quotationPayload.title}") for ${currencySymbol} ${grandTotal.toLocaleString()} (${items.length} items).`,
          completedDate: new Date(),
        });

        toast.success(`Quotation "${quotationPayload.title}" created successfully!`);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-5xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* 1. Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-indigo-500/[0.03] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center font-bold shadow-2xs">
                <Calculator size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                    {isEditing ? 'Edit Quotation' : 'Quotation Builder'}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 font-mono">
                    {isEditing ? `Quotation #${(editingQuotationIndex || 0) + 1}` : `Quotation #${(existingQuotations?.length || 0) + 1}`}
                  </span>
                  {activeBoq && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Linked to BOQ
                    </span>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  {isEditing ? 'Modify scope items, rates, quantities, taxes, and payment conditions.' : 'Import entire BOQ, pick specific categories, or select particular line items.'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[hsl(var(--muted))] rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* 2. Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* A. Quotation Title & Version Picker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                  <Tag size={13} className={titleError ? "text-rose-500" : "text-indigo-500"} /> Quotation Title <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={quotationTitle}
                  onChange={(e) => {
                    setQuotationTitle(e.target.value);
                    if (titleError && e.target.value.trim()) {
                      setTitleError(null);
                    }
                  }}
                  onBlur={() => {
                    if (!quotationTitle.trim()) {
                      setTitleError('Quotation title is required');
                    }
                  }}
                  placeholder="Enter Quotation Title"
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border bg-[hsl(var(--background))] text-xs font-bold text-[hsl(var(--foreground))] outline-none transition-all",
                    titleError
                      ? "border-rose-500 bg-rose-50/10 dark:bg-rose-950/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                      : "border-[hsl(var(--border))] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  )}
                />
                {titleError && (
                  <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{titleError}</span>
                  </p>
                )}
              </div>

              {boqList.length > 1 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <FileSpreadsheet size={13} className="text-indigo-500" /> Source BOQ Version
                  </label>
                  <select
                    value={selectedBoqIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedBoqIndex(idx);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {boqList.map((b: any, idx: number) => (
                      <option key={idx} value={idx}>
                        Version {b.version || idx + 1} ({b.status === 'approved' ? 'Approved' : 'Draft'}) — {currencySymbol} {(b.totalAmount || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* B. BOQ Linking & Scope Selector System */}
            {activeBoq && allBoqItems.length > 0 && (
              <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-2xl p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold">
                      <Layers size={15} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">
                        Select Scope from BOQ v{activeBoq.version || 1}
                      </h4>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {selectedItemCount} of {totalBoqItemCount} items selected ({structuredBoqSections.length} categories)
                      </p>
                    </div>
                  </div>

                  {/* Quick Mode Filters */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAllScope}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        scopeMode === 'all'
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                      )}
                    >
                      <CheckCheck size={14} className={scopeMode === 'all' ? 'text-white' : 'text-indigo-500'} />
                      All Items
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeMode('categories')}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        scopeMode === 'categories'
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                      )}
                    >
                      <LayoutGrid size={13} className={scopeMode === 'categories' ? 'text-white' : 'text-indigo-500'} />
                      By Category
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeMode('items')}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        scopeMode === 'items'
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                      )}
                    >
                      <ListChecks size={14} className={scopeMode === 'items' ? 'text-white' : 'text-indigo-500'} />
                      Pick Particular Items
                    </button>
                  </div>
                </div>

                {/* Scope Selection View: By Category */}
                {scopeMode === 'categories' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {structuredBoqSections.map((sec) => {
                      const isCatSelected = Boolean(selectedCategoryNames[sec.sectionTitle]);
                      return (
                        <div
                          key={sec.id}
                          onClick={() => toggleCategory(sec.sectionTitle, !isCatSelected)}
                          className={cn(
                            "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs",
                            isCatSelected
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:text-indigo-200"
                              : "bg-[hsl(var(--card))] border-[hsl(var(--border))] opacity-75 hover:opacity-100"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isCatSelected ? (
                              <CheckSquare size={16} className="text-indigo-600 shrink-0" />
                            ) : (
                              <Square size={16} className="text-slate-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{sec.sectionTitle}</p>
                              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                {sec.items.length} {sec.items.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold shrink-0">
                            {currencySymbol} {sec.subTotal.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Scope Selection View: Granular Particular Items */}
                {scopeMode === 'items' && (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {structuredBoqSections.map((sec) => {
                      const isExpanded = Boolean(expandedSections[sec.id]);
                      const isCatSelected = Boolean(selectedCategoryNames[sec.sectionTitle]);
                      return (
                        <div key={sec.id} className="border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] overflow-hidden shadow-2xs">
                          <div className="p-2.5 bg-[hsl(var(--muted)/0.5)] flex items-center justify-between gap-2">
                            <div
                              onClick={() => setExpandedSections((prev) => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                              className="flex items-center gap-2 cursor-pointer select-none min-w-0"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span className="text-xs font-bold text-[hsl(var(--foreground))] truncate">
                                {sec.sectionTitle}
                              </span>
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                ({sec.items.length} items)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCategory(sec.sectionTitle, !isCatSelected)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 cursor-pointer"
                            >
                              {isCatSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="divide-y divide-[hsl(var(--border))] p-1">
                              {sec.items.map((it: any, itIdx: number) => {
                                const itId = it.id || it._id || `${sec.id}-item-${itIdx}`;
                                const isItemSelected = Boolean(selectedBoqItemIds[itId]);
                                return (
                                  <div
                                    key={itId}
                                    onClick={() => toggleItem(itId, sec.sectionTitle, !isItemSelected)}
                                    className={cn(
                                      "p-2 flex items-start gap-2.5 rounded-lg transition-colors cursor-pointer text-xs",
                                      isItemSelected ? "bg-indigo-500/[0.06]" : "hover:bg-[hsl(var(--muted)/0.5)]"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isItemSelected}
                                      onChange={() => {}} // Handled by div onClick
                                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-[hsl(var(--foreground))] truncate">
                                        {it.itemName}
                                      </p>
                                      {it.description && (
                                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1">
                                          {it.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-mono font-bold text-[hsl(var(--foreground))]">
                                        {currencySymbol} {(Number(it.amount) || Number(it.quantity || 0) * Number(it.rate || 0)).toLocaleString()}
                                      </p>
                                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                        {it.quantity} {it.unit || 'Nos'} × {currencySymbol} {it.rate}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* C. Line Items Table & Pricing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">
                    Quotation Line Items ({items.length})
                  </h3>
                </div>
              </div>

              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-xs">
                <div className="grid grid-cols-12 gap-2 p-3 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  <div className="col-span-6">Item Description & Scope</div>
                  <div className="col-span-2 text-center">Unit / Qty</div>
                  <div className="col-span-2 text-right">Unit Price ({currencySymbol})</div>
                  <div className="col-span-2 text-right pr-2">Total ({currencySymbol})</div>
                </div>

                <div className="p-3 space-y-2.5 max-h-72 overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center group">
                      {/* Description & Category */}
                      <div className="col-span-6 flex items-start gap-1.5">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors mt-1 cursor-pointer shrink-0"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="w-full space-y-1">
                          <textarea
                            rows={1}
                            required
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Item description / specification"
                            className="w-full px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] focus:border-indigo-500 outline-none resize-none leading-relaxed"
                          />
                          {item.category && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unit & Qty */}
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="text"
                          value={item.unit || 'Nos'}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          placeholder="Unit"
                          className="w-12 px-1.5 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[11px] font-bold text-center focus:border-indigo-500 outline-none uppercase"
                        />
                        <input
                          type="number"
                          required
                          min="0.1"
                          step="any"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-bold text-center focus:border-indigo-500 outline-none font-mono"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-bold text-right focus:border-indigo-500 outline-none font-mono"
                        />
                      </div>

                      {/* Total */}
                      <div className="col-span-2 text-right font-mono font-extrabold text-xs text-[hsl(var(--foreground))] pr-2">
                        {currencySymbol} {(Number(item.total) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-[hsl(var(--muted)/0.3)] border-t border-[hsl(var(--border))]">
                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl transition-colors w-full justify-center border border-indigo-200 border-dashed cursor-pointer"
                  >
                    <Plus size={14} /> Add Custom Line Item
                  </button>
                </div>
              </div>
            </div>

            {/* D. Financial Summary, Taxes, Discount & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Left Side: Client Terms & Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider flex items-center gap-1">
                  Payment Terms & Conditions
                </label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment milestones, timeline, advance requirements, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] focus:border-indigo-500 outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Right Side: Calculation Totals */}
              <div className="bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                  <span>Scope Subtotal ({items.length} items)</span>
                  <span className="font-mono font-bold text-[hsl(var(--foreground))]">
                    {currencySymbol} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                    Tax / VAT %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                      className="w-14 px-2 py-0.5 text-xs rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-center focus:border-indigo-500 outline-none font-mono font-bold"
                    />
                  </span>
                  <span className="font-mono font-semibold text-[hsl(var(--muted-foreground))]">
                    + {currencySymbol} {tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[hsl(var(--muted-foreground))]">
                    Discount ({currencySymbol})
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-28 px-2 py-0.5 text-xs rounded border border-[hsl(var(--border))] text-right focus:border-indigo-500 outline-none text-rose-600 font-mono font-bold bg-[hsl(var(--background))]"
                  />
                </div>

                <div className="pt-3 border-t border-[hsl(var(--border))] flex justify-between items-center">
                  <div>
                    <span className="text-xs font-extrabold text-[hsl(var(--foreground))] block">
                      Grand Total Quotation
                    </span>
                    {isOverBudget && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={11} /> Over Target Budget
                      </span>
                    )}
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {currencySymbol} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Modal Footer */}
          <div className="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {isEditing ? `Editing Quotation #${(editingQuotationIndex || 0) + 1}` : `Creates Quotation #${(existingQuotations?.length || 0) + 1}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save size={14} />
                {isSubmitting ? (isEditing ? 'Updating Quotation...' : 'Creating Quotation...') : (isEditing ? 'Update Quotation' : 'Create & Save Quotation')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
