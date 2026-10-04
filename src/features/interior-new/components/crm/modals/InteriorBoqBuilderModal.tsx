'use client';

// =============================================================================
// Sky-Lite Web — Interior CRM BOQ Builder Modal
// Professional, Section-Based Hierarchical BOQ Builder & Specification Editor
// Supporting Multi-Section Groups, Technical Specs, Brand/Makes, UOMs,
// Drawing & Image Attachments, Optional Rates & Scope Notes
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
  UploadCloud,
  FileCode,
  Check,
  Eye,
  Download,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { parseMaxBudget } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { uploadToCloudinary } from '@/lib/upload';
import { BoqDrawingViewerModal } from '@/components/crm/BoqDrawingViewerModal';

export const BOQ_UNITS = [
  { value: 'SQ M', label: 'SQ M (Square Meter)' },
  { value: 'Rn M', label: 'Rn M (Running Meter)' },
  { value: 'Nos', label: 'Nos (Numbers / Units)' },
  { value: 'Trip', label: 'Trip (Vehicle / Trips)' },
  { value: 'CUM', label: 'CUM (Cubic Meter)' },
  { value: 'SQFT', label: 'SQFT (Square Feet)' },
  { value: 'RMT', label: 'RMT (Running Meter)' },
  { value: 'RFT', label: 'RFT (Running Feet)' },
  { value: 'CFT', label: 'CFT (Cubic Feet)' },
  { value: 'KG', label: 'KG (Kilogram)' },
  { value: 'TON', label: 'TON (Metric Ton)' },
  { value: 'LTR', label: 'LTR (Liters)' },
  { value: 'BAGS', label: 'BAGS (Bags)' },
  { value: 'BOX', label: 'BOX (Boxes)' },
  { value: 'LOT', label: 'LOT (Lot / Lumpsum)' },
  { value: 'LS', label: 'LS (Lump Sum)' },
  { value: 'SET', label: 'SET (Set)' },
];

export const BOQ_CATEGORIES = [
  'Civil Work',
  'Dismantling & Demolition',
  'Flooring & Tiling',
  'Reception Area Works',
  'Woodwork & Carpentry',
  'False Ceiling & POP',
  'Painting & Texture',
  'Electrical & SITC Lighting',
  'Plumbing & Sanitary',
  'HVAC & Air Conditioning',
  'Glass & Partitions',
  'Furniture & Fixtures',
  'Kitchen & Platforms',
  'Waterproofing & Coba',
  'Other',
];

export interface BoqAttachment {
  name: string;
  url: string;
  fileType?: string;
  drawingId?: string;
}

export interface BoqSection {
  id: string;
  sectionNumber: string; // e.g. "3", "A", "B", "5"
  sectionTitle: string;  // e.g. "Civil Work", "Dismantling - Salvagable Items"
  scopeDescription: string; // Scope paragraph
  attachments?: BoqAttachment[];
  isCollapsed?: boolean;
}

export interface BoqItem {
  id: string;
  sectionId: string;
  itemCode: string; // e.g. "1", "1a", "2", "2a"
  category: string;
  itemName: string; // Short / Headline title
  description: string; // Full technical specification
  brandMakes: string;
  quantity: number;
  unit: string;
  rate: number; // Optional (0 if unpriced)
  amount: number;
  remarks: string; // e.g. "scrap will be taken away"
}

interface BoqBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  existingBoqs?: any[];
  editingBoqIndex?: number | null;
  isReadOnly?: boolean;
  budgetRange?: string;
  designFiles?: any[]; // Uploaded drawings from CRM Lead
  onSuccess: () => void;
}

export function InteriorBoqBuilderModal({
  isOpen,
  onClose,
  customerId,
  existingBoqs = [],
  editingBoqIndex = null,
  isReadOnly = false,
  budgetRange,
  designFiles = [],
  onSuccess,
}: BoqBuilderModalProps) {
  const toast = useToast();
  const { currencySymbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingSecId, setUploadingSecId] = useState<string | null>(null);
  const [activeDrawingPickerSecId, setActiveDrawingPickerSecId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<BoqAttachment | null>(null);
  const [notes, setNotes] = useState('');
  const [sections, setSections] = useState<BoqSection[]>([]);
  const [items, setItems] = useState<BoqItem[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isEditing =
    editingBoqIndex !== null &&
    editingBoqIndex !== undefined &&
    editingBoqIndex >= 0 &&
    Boolean(existingBoqs && existingBoqs[editingBoqIndex]);

  // If editing, use the specified BOQ. If creating a new version, inherit from the latest / active BOQ
  const sourceBoq = isEditing
    ? existingBoqs[editingBoqIndex!]
    : existingBoqs && existingBoqs.length > 0
    ? existingBoqs[existingBoqs.length - 1]
    : null;

  const currentVersionNumber = isEditing
    ? sourceBoq?.version || editingBoqIndex! + 1
    : (existingBoqs?.length || 0) + 1;

  // Initialize BOQ Data
  useEffect(() => {
    if (isOpen) {
      if (sourceBoq) {
        const rawSections =
          sourceBoq.sections && Array.isArray(sourceBoq.sections) && sourceBoq.sections.length > 0
            ? sourceBoq.sections.map((s: any, idx: number) => {
                const matchedItem = sourceBoq.items?.find(
                  (i: any) => i.sectionTitle === s.sectionTitle || i.category === s.sectionTitle
                );
                return {
                  id: isEditing ? (s.sectionId || s.id || `sec-${idx + 1}`) : `sec-${Date.now()}-${idx + 1}`,
                  sectionNumber: s.sectionNumber || String(idx + 1),
                  sectionTitle: s.sectionTitle || '',
                  scopeDescription: s.scopeDescription || s.sectionScope || matchedItem?.sectionScope || '',
                  attachments: s.attachments ? [...s.attachments] : [],
                  isCollapsed: false,
                };
              })
            : [];

        let rawItems: BoqItem[] = [];

        if (sourceBoq.items && Array.isArray(sourceBoq.items) && sourceBoq.items.length > 0) {
          rawItems = sourceBoq.items.map((it: any, idx: number) => {
            const qty = Number(it.quantity) || 0;
            const rate = Number(it.rate) || 0;
            const amount = Number(it.amount) || qty * rate;

            // Map to new section IDs if creating a new cloned version
            let assignedSecId = it.sectionId || (rawSections[0]?.id || 'sec-1');
            if (!isEditing && rawSections.length > 0) {
              const matchedSec = rawSections.find(
                (s: any) => s.sectionTitle === (it.sectionTitle || it.category)
              );
              assignedSecId = matchedSec ? matchedSec.id : rawSections[0].id;
            }

            return {
              id: isEditing ? (it.id || `item-${Date.now()}-${idx}`) : `item-${Date.now()}-${idx}`,
              sectionId: assignedSecId,
              itemCode: it.itemCode || String(it.serialNumber || idx + 1),
              category: it.category || '',
              itemName: it.itemName || '',
              description: it.description || '',
              brandMakes: it.brandMakes || '',
              quantity: qty,
              unit: it.unit || '',
              rate: rate,
              amount: amount,
              remarks: it.remarks || '',
            };
          });
        }

        // If no sections existed before, create default sections from categories
        if (rawSections.length === 0) {
          if (rawItems.length > 0) {
            const categories = Array.from(new Set(rawItems.map((i) => i.category || 'Civil Work')));
            const newSecs = categories.map((cat, idx) => {
              const sampleItem = rawItems.find((i) => i.category === cat);
              return {
                id: `sec-${Date.now()}-${idx + 1}`,
                sectionNumber: String(idx + 1),
                sectionTitle: cat,
                scopeDescription: (sampleItem as any)?.sectionScope || '',
                attachments: [],
                isCollapsed: false,
              };
            });
            rawItems = rawItems.map((it) => {
              const matchedSec = newSecs.find((s) => s.sectionTitle === it.category);
              return { ...it, sectionId: matchedSec ? matchedSec.id : newSecs[0].id };
            });
            setSections(newSecs);
          } else {
            setSections([
              { id: 'sec-1', sectionNumber: '1', sectionTitle: '', scopeDescription: '', attachments: [], isCollapsed: false },
            ]);
          }
        } else {
          setSections(rawSections);
        }

        if (rawItems.length === 0) {
          const defaultSecId = rawSections[0]?.id || 'sec-1';
          rawItems = [
            {
              id: `item-${Date.now()}`,
              sectionId: defaultSecId,
              itemCode: '1',
              category: '',
              itemName: '',
              description: '',
              brandMakes: '',
              quantity: 0,
              unit: '',
              rate: 0,
              amount: 0,
              remarks: '',
            },
          ];
        }

        setItems(rawItems);
        setNotes(sourceBoq.notes || '');
      } else {
        // Fresh initial BOQ (no previous versions exist)
        const initialSecId = 'sec-1';
        setSections([
          { id: initialSecId, sectionNumber: '1', sectionTitle: '', scopeDescription: '', attachments: [], isCollapsed: false },
        ]);
        setItems([
          {
            id: `item-${Date.now()}`,
            sectionId: initialSecId,
            itemCode: '1',
            category: '',
            itemName: '',
            description: '',
            brandMakes: '',
            quantity: 0,
            unit: '',
            rate: 0,
            amount: 0,
            remarks: '',
          },
        ]);
        setNotes('');
      }
    } else {
      setNotes('');
      setSections([]);
      setItems([]);
      setActiveDrawingPickerSecId(null);
    }
  }, [isOpen, editingBoqIndex, existingBoqs]);

  // Section Handlers
  const addSection = () => {
    const nextIndex = sections.length + 1;
    const newSecId = `sec-${Date.now()}`;
    const newSection: BoqSection = {
      id: newSecId,
      sectionNumber: String(nextIndex),
      sectionTitle: '',
      scopeDescription: '',
      attachments: [],
      isCollapsed: false,
    };

    const newItem: BoqItem = {
      id: `item-${Date.now()}-1`,
      sectionId: newSecId,
      itemCode: '1',
      category: '',
      itemName: '',
      description: '',
      brandMakes: '',
      quantity: 0,
      unit: '',
      rate: 0,
      amount: 0,
      remarks: '',
    };

    setSections((prev) => [...prev, newSection]);
    setItems((prev) => [...prev, newItem]);
  };

  const updateSection = (secId: string, field: keyof BoqSection, value: any) => {
    setSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, [field]: value } : s))
    );
  };

  const removeSection = (secId: string) => {
    if (sections.length <= 1) {
      toast.error('BOQ must have at least one section.');
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== secId));
    setItems((prev) => prev.filter((it) => it.sectionId !== secId));
  };

  // Attachments Handlers
  const handleFileUpload = async (secId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSecId(secId);
    try {
      toast.info(`Uploading ${file.name}...`);
      const secureUrl = await uploadToCloudinary(file);
      
      const newAttachment: BoqAttachment = {
        name: file.name,
        url: secureUrl,
        fileType: file.type || file.name.split('.').pop() || 'file',
      };

      setSections((prev) =>
        prev.map((s) =>
          s.id === secId
            ? { ...s, attachments: [...(s.attachments || []), newAttachment] }
            : s
        )
      );

      toast.success(`Attached ${file.name} to section`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachment');
    } finally {
      setUploadingSecId(null);
      if (fileInputRefs.current[secId]) {
        fileInputRefs.current[secId]!.value = '';
      }
    }
  };

  const handleLinkDrawing = (secId: string, drawing: any) => {
    const drawingUrl = drawing.url || (drawing.versions && drawing.versions[drawing.versions.length - 1]?.url);
    if (!drawingUrl) {
      toast.error('Drawing does not have a valid file URL.');
      return;
    }

    const drawingName = drawing.title || drawing.name || 'Drawing Document';
    const newAttachment: BoqAttachment = {
      name: drawingName,
      url: drawingUrl,
      fileType: drawing.fileType || drawing.category || '2D',
      drawingId: drawing._id || drawing.id,
    };

    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== secId) return s;
        const exists = (s.attachments || []).some(
          (a) => a.url === drawingUrl || (a.drawingId && a.drawingId === newAttachment.drawingId)
        );
        if (exists) {
          toast.info('This drawing is already attached to this section.');
          return s;
        }
        return { ...s, attachments: [...(s.attachments || []), newAttachment] };
      })
    );

    setActiveDrawingPickerSecId(null);
    toast.success(`Linked ${drawingName} to section`);
  };

  const removeAttachment = (secId: string, index: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId
          ? { ...s, attachments: (s.attachments || []).filter((_, i) => i !== index) }
          : s
      )
    );
  };

  // Item Handlers
  const addItemToSection = (secId: string) => {
    const sectionItems = items.filter((i) => i.sectionId === secId);
    const nextCode = String(sectionItems.length + 1);

    const newItem: BoqItem = {
      id: `item-${Date.now()}`,
      sectionId: secId,
      itemCode: nextCode,
      category: '',
      itemName: '',
      description: '',
      brandMakes: '',
      quantity: 0,
      unit: '',
      rate: 0,
      amount: 0,
      remarks: '',
    };

    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (itemId: string, field: keyof BoqItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };

        if (field === 'quantity' || field === 'rate') {
          const q = field === 'quantity' ? Number(value) || 0 : Number(item.quantity) || 0;
          const r = field === 'rate' ? Number(value) || 0 : Number(item.rate) || 0;
          updated.amount = Math.round(q * r * 100) / 100;
        }

        return updated;
      })
    );
  };

  const removeItem = (itemId: string, secId: string) => {
    const sectionItems = items.filter((i) => i.sectionId === secId);
    if (sectionItems.length <= 1) {
      toast.error('Each section must have at least one item.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Computations
  const getSectionSubtotal = (secId: string) => {
    return items
      .filter((i) => i.sectionId === secId)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const totalAmount = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const maxBudget = parseMaxBudget(budgetRange);
  const isOverBudget = Boolean(maxBudget && maxBudget > 0 && totalAmount > maxBudget);
  const budgetExcess = isOverBudget ? totalAmount - (maxBudget || 0) : 0;

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      return toast.error('BOQ cannot be edited because the quotation has already been approved.');
    }

    if (sections.length === 0 || items.length === 0) {
      return toast.error('Please add at least one section/category and line item to the BOQ.');
    }

    if (sections.some((s) => !s.sectionTitle || !s.sectionTitle.trim())) {
      return toast.error('Please provide a category/section name for all sections.');
    }

    if (items.some((i) => !i.itemName || !i.itemName.trim())) {
      return toast.error('Please provide an Item Short Description for all line items.');
    }

    if (items.some((i) => !i.quantity || Number(i.quantity) <= 0)) {
      return toast.error('Quantity must be greater than 0 for all rows.');
    }

    setIsSubmitting(true);

    try {
      const formattedSections = sections.map((s) => ({
        sectionId: s.id,
        sectionNumber: s.sectionNumber,
        sectionTitle: s.sectionTitle.trim(),
        scopeDescription: s.scopeDescription?.trim() || '',
        subTotal: getSectionSubtotal(s.id),
        attachments: s.attachments || [],
      }));

      const formattedItems = items.map((it, idx) => {
        const sec = sections.find((s) => s.id === it.sectionId);
        return {
          id: it.id,
          serialNumber: idx + 1,
          itemCode: it.itemCode || String(idx + 1),
          sectionNumber: sec?.sectionNumber || '',
          sectionTitle: sec?.sectionTitle || '',
          sectionScope: sec?.scopeDescription || '',
          category: it.category || sec?.sectionTitle || 'Civil Work',
          itemName: it.itemName.trim(),
          description: it.description?.trim() || '',
          brandMakes: it.brandMakes?.trim() || '',
          quantity: Number(it.quantity) || 0,
          unit: it.unit || 'SQ M',
          rate: Number(it.rate) || 0,
          amount: Number(it.amount) || 0,
          remarks: it.remarks?.trim() || '',
        };
      });

      const updatedBoqs = [...(existingBoqs || [])];

      if (isEditing && editingBoqIndex !== null && editingBoqIndex >= 0 && updatedBoqs[editingBoqIndex]) {
        const currentBoq = updatedBoqs[editingBoqIndex];
        updatedBoqs[editingBoqIndex] = {
          ...currentBoq,
          sections: formattedSections,
          items: formattedItems,
          totalAmount,
          notes,
          updatedAt: new Date(),
        };
      } else {
        const newVersion = (existingBoqs?.length || 0) + 1;
        updatedBoqs.push({
          version: newVersion,
          sections: formattedSections,
          items: formattedItems,
          totalAmount,
          notes,
          status: 'draft',
          createdAt: new Date(),
        });
      }

      await interiorCrmService.updateCustomer(customerId, {
        boqs: updatedBoqs,
        status: 'Under BOQ Creation',
      });

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'System Update',
        status: 'Completed',
        remarks: isEditing
          ? `BOQ Version ${sourceBoq?.version || editingBoqIndex! + 1} updated with ${sections.length} sections.`
          : `BOQ Version ${updatedBoqs.length} added with ${sections.length} sections and ${items.length} items.`,
        completedDate: new Date(),
      });

      toast.success(isEditing ? 'BOQ updated successfully!' : 'New BOQ version created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save BOQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 6 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 6 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-6xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {isReadOnly
                      ? `View BOQ (Version ${currentVersionNumber})`
                      : isEditing
                      ? `Edit BOQ (Version ${currentVersionNumber})`
                      : `New BOQ Version (Version ${currentVersionNumber})`}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    v{currentVersionNumber}
                  </span>
                  {isReadOnly && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Approved & Locked
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {isReadOnly
                    ? 'This BOQ is preserved in read-only mode.'
                    : 'Manage multi-section groups, drawings & image attachments, specifications, units, quantities, and rates.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addSection}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-40 shrink-0"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/40">
              
              {/* Sections Accordion List */}
              {sections.map((section, secIdx) => {
                const sectionItems = items.filter((i) => i.sectionId === section.id);
                const subTotal = getSectionSubtotal(section.id);
                const isUploading = uploadingSecId === section.id;
                const isDrawingPickerOpen = activeDrawingPickerSecId === section.id;

                return (
                  <div
                    key={section.id}
                    className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all"
                  >
                    {/* Section Header Band */}
                    <div className="p-3 sm:p-4 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => updateSection(section.id, 'isCollapsed', !section.isCollapsed)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-200/70 transition"
                        >
                          {section.isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>

                        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          <input
                            disabled={isReadOnly}
                            value={section.sectionNumber}
                            onChange={(e) => updateSection(section.id, 'sectionNumber', e.target.value)}
                            placeholder="Sec #"
                            className="w-16 h-7 px-2 text-xs font-mono font-bold text-center text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50"
                            title="Section Number / Code (e.g. 3, A, 5)"
                          />
                          <input
                            required
                            disabled={isReadOnly}
                            list={`boq-categories-${section.id}`}
                            value={section.sectionTitle}
                            onChange={(e) => updateSection(section.id, 'sectionTitle', e.target.value)}
                            placeholder="Category / Section Name *"
                            className="flex-1 min-w-[180px] h-7 px-2.5 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 placeholder:font-normal placeholder:text-slate-400"
                          />
                          <datalist id={`boq-categories-${section.id}`}>
                            {BOQ_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                            {sectionItems.length} {sectionItems.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[11px] font-semibold text-slate-500 mr-2">Subtotal:</span>
                          <span className="text-xs font-bold font-mono text-slate-900">
                            {currencySymbol}{subTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {!isReadOnly && sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSection(section.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Section"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {!section.isCollapsed && (
                      <div className="p-3 sm:p-4 space-y-3.5">
                        {/* Section Scope of Work Notes */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span>Section Scope of Work / Overview Note (Optional)</span>
                          </label>
                          {isReadOnly ? (
                            section.scopeDescription ? (
                              <div className="w-full px-3.5 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed whitespace-pre-wrap">
                                {section.scopeDescription}
                              </div>
                            ) : (
                              <div className="w-full px-3.5 py-2 text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                                No scope overview note entered for this section.
                              </div>
                            )
                          ) : (
                            <textarea
                              rows={2}
                              value={section.scopeDescription || ''}
                              onChange={(e) => updateSection(section.id, 'scopeDescription', e.target.value)}
                              placeholder="e.g. This scope of work covers the careful removal and dismantling of items that are identified as salvageable for reuse or safe disposal..."
                              className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition resize-y placeholder:text-slate-400"
                            />
                          )}
                        </div>

                        {/* Drawing & Image Attachments Bar */}
                        <div className="p-2.5 bg-blue-50/40 border border-blue-100 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                              <span>Attached Drawings & Reference Images</span>
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded-md font-mono">
                                {section.attachments?.length || 0}
                              </span>
                            </div>

                            {!isReadOnly && (
                              <div className="flex items-center gap-1.5">
                                {/* Direct File Upload Trigger */}
                                <input
                                  type="file"
                                  ref={(el) => {
                                    fileInputRefs.current[section.id] = el;
                                  }}
                                  onChange={(e) => handleFileUpload(section.id, e)}
                                  accept="image/*,.pdf,.dwg,.dxf,.skp"
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => fileInputRefs.current[section.id]?.click()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-50"
                                >
                                  {isUploading ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                  ) : (
                                    <UploadCloud className="w-3 h-3 text-blue-600" />
                                  )}
                                  <span>{isUploading ? 'Uploading...' : 'Upload Drawing / Image'}</span>
                                </button>

                                {/* Select from Existing Lead Drawings */}
                                {designFiles && designFiles.length > 0 && (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveDrawingPickerSecId(
                                          isDrawingPickerOpen ? null : section.id
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition cursor-pointer"
                                    >
                                      <FileCode className="w-3 h-3 text-indigo-600" />
                                      <span>Link Lead Drawing</span>
                                    </button>

                                    {/* Dropdown Popover */}
                                    {isDrawingPickerOpen && (
                                      <div className="absolute right-0 top-full mt-1.5 z-30 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1 max-h-56 overflow-y-auto">
                                        <div className="text-[10px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
                                          Select Lead Drawing
                                        </div>
                                        {designFiles.map((df: any) => {
                                          const drawingUrl =
                                            df.url || (df.versions && df.versions[df.versions.length - 1]?.url);
                                          const isAlreadyAttached = (section.attachments || []).some(
                                            (a) => a.url === drawingUrl || a.drawingId === (df._id || df.id)
                                          );

                                          return (
                                            <button
                                              key={df._id || df.id || df.name}
                                              type="button"
                                              onClick={() => handleLinkDrawing(section.id, df)}
                                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition ${
                                                isAlreadyAttached
                                                  ? 'bg-slate-50 text-slate-400 cursor-default'
                                                  : 'hover:bg-blue-50 text-slate-800 hover:text-blue-700 cursor-pointer'
                                              }`}
                                            >
                                              <div className="min-w-0 flex-1 truncate">
                                                <div className="font-semibold truncate">{df.title || df.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                  {df.category || '2D'} • v{df.currentVersion || 1}
                                                </div>
                                              </div>
                                              {isAlreadyAttached && (
                                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Attached Files List */}
                          {section.attachments && section.attachments.length > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              {section.attachments.map((att, attIdx) => {
                                const isImg =
                                  att.url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ||
                                  (att.fileType && att.fileType.includes('image'));

                                return (
                                  <div
                                    key={attIdx}
                                    className="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs group hover:border-blue-300 transition"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachment(att)}
                                      className="flex items-center gap-1.5 cursor-pointer text-left hover:opacity-80 transition"
                                      title="Click to preview image/drawing in modal"
                                    >
                                      {isImg ? (
                                        <img
                                          src={att.url}
                                          alt={att.name}
                                          className="w-5 h-5 rounded object-cover border border-slate-100 shrink-0"
                                        />
                                      ) : (
                                        <FileCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      )}
                                      <span className="font-medium truncate max-w-[130px]" title={att.name}>
                                        {att.name}
                                      </span>
                                    </button>

                                    {/* In-Modal Preview Button */}
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachment(att)}
                                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                      title="Preview in modal"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                 

                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => removeAttachment(section.id, attIdx)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                        title="Remove drawing"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              No drawings or images attached to this section yet.
                            </p>
                          )}
                        </div>

                        {/* Section Items Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                                  <th className="py-2 px-2.5 w-14 text-center text-slate-400">Sr. No</th>
                                  <th className="py-2 px-3 min-w-[280px]">Item Description & Technical Specifications</th>
                                  <th className="py-2 px-2.5 w-24 text-center">Unit</th>
                                  <th className="py-2 px-2.5 w-20 text-center">Qty</th>
                                  <th className="py-2 px-2.5 w-28 text-right">Rate ({currencySymbol}) <span className="text-[9px] font-normal lowercase opacity-70">(opt)</span></th>
                                  <th className="py-2 px-2.5 w-28 text-right">Amount ({currencySymbol})</th>
                                  <th className="py-2 px-2.5 min-w-[160px]">Remarks / Disposal</th>
                                  {!isReadOnly && <th className="py-2 px-2 w-9 text-center" />}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {sectionItems.map((item, itemIdx) => (
                                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors align-top">
                                    {/* Item Code / Sr. No */}
                                    <td className="py-2 px-2 text-center font-mono">
                                      <input
                                        disabled={isReadOnly}
                                        value={item.itemCode}
                                        onChange={(e) => updateItem(item.id, 'itemCode', e.target.value)}
                                        placeholder="1"
                                        className="w-10 h-7 px-1 text-xs font-mono font-bold text-center text-slate-700 bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 disabled:bg-slate-50"
                                      />
                                    </td>

                                    {/* Item Description + Tech Specs */}
                                    <td className="py-2 px-2.5 space-y-1.5">
                                      <input
                                        required
                                        disabled={isReadOnly}
                                        value={item.itemName}
                                        onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                                        placeholder="Item Short Description*"
                                        className="w-full h-7 px-2.5 text-xs capitalize font-bold text-slate-900 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 placeholder:text-slate-400 placeholder:font-normal disabled:bg-slate-50 transition"
                                      />

                                      <textarea
                                        rows={2}
                                        disabled={isReadOnly}
                                        value={item.description}
                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        placeholder="Item Long Description..."
                                        className="w-full px-2.5 py-1 text-[11px] capitalize text-slate-600 bg-slate-50/60 border border-slate-200/80 rounded-md outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400 disabled:bg-slate-50 transition resize-y"
                                      />
                                    </td>

                                    {/* Unit */}
                                    <td className="py-2 px-2 text-center">
                                      <input
                                        list={`boq-units-${item.id}`}
                                        disabled={isReadOnly}
                                        value={item.unit || ''}
                                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                        placeholder="Unit"
                                        className="w-full h-7 px-1 text-xs font-bold uppercase tracking-wider text-center text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 transition"
                                      />
                                      <datalist id={`boq-units-${item.id}`}>
                                        {BOQ_UNITS.map((u) => (
                                          <option key={u.value} value={u.value}>
                                            {u.label}
                                          </option>
                                        ))}
                                      </datalist>
                                    </td>

                                    {/* Quantity */}
                                    <td className="py-2 px-2 text-center">
                                      <input
                                        type="number"
                                        required
                                        min={0.01}
                                        step="any"
                                        disabled={isReadOnly}
                                        value={item.quantity || ''}
                                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                        className="w-full h-7 px-1 text-xs font-mono font-bold text-center text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 transition"
                                      />
                                    </td>

                                    {/* Rate */}
                                    <td className="py-2 px-2 text-right">
                                      <div className="relative flex items-center">
                                        <span className="absolute left-2 text-[11px] text-slate-400 font-semibold pointer-events-none">
                                          {currencySymbol}
                                        </span>
                                        <input
                                          type="number"
                                          min={0}
                                          step="any"
                                          disabled={isReadOnly}
                                          value={item.rate !== undefined && item.rate !== null && item.rate !== 0 ? item.rate : ''}
                                          onChange={(e) => updateItem(item.id, 'rate', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-full h-7 pl-5 pr-1.5 text-xs font-mono font-bold text-right text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 placeholder:text-slate-400 disabled:bg-slate-50 transition"
                                        />
                                      </div>
                                    </td>

                                    {/* Amount */}
                                    <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 text-xs">
                                      {currencySymbol}{(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Remarks / Scope Note */}
                                    <td className="py-2 px-2">
                                      <textarea
                                        rows={2}
                                        disabled={isReadOnly}
                                        value={item.remarks}
                                        onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                                        placeholder="e.g. scrap will be taken away"
                                        className="w-full px-2 py-1 text-[10px] text-slate-600 bg-slate-50/50 border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400 disabled:bg-slate-50 transition resize-y"
                                      />
                                    </td>

                                    {/* Delete Row */}
                                    {!isReadOnly && (
                                      <td className="py-2 px-1 text-center">
                                        <button
                                          type="button"
                                          onClick={() => removeItem(item.id, section.id)}
                                          disabled={sectionItems.length === 1}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition cursor-pointer"
                                          title="Remove line item"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Section Footer */}
                          <div className="p-2.5 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between gap-3">
                            {!isReadOnly ? (
                              <button
                                type="button"
                                onClick={() => addItemToSection(section.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-blue-600" />
                                <span>Add Item to Section</span>
                              </button>
                            ) : (
                              <div />
                            )}

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-600">Sub Total of Section:</span>
                              <span className="text-xs font-extrabold font-mono text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                {currencySymbol}{subTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add New Section Button */}
              {!isReadOnly && (
                <div className="text-center py-2">
                  <button
                    type="button"
                    onClick={addSection}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 rounded-xl transition cursor-pointer shadow-2xs active:scale-[0.99]"
                  >
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Add New Section / Scope Category</span>
                  </button>
                </div>
              )}

              {/* Overall Remarks / Scope Terms */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 shadow-2xs">
                <label className="text-xs font-bold text-slate-800 block">
                  Overall BOQ Terms, Exclusions & Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  disabled={isReadOnly}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add general terms, payment milestones, exclusions, site access conditions, or warranty clauses..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition resize-none disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Fixed Bottom Over Budget Warning Alert */}
            {isOverBudget && (
              <div className="px-6 py-2.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-900 shrink-0 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="truncate">
                    <strong>Over Budget Warning:</strong> Exceeds estimated budget ({budgetRange}) by{' '}
                    <strong className="font-bold font-mono">
                      {currencySymbol}{budgetExcess.toLocaleString('en-US')}
                    </strong>
                  </span>
                </div>
                {maxBudget && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800 shrink-0 font-mono">
                    +{(((totalAmount - maxBudget) / maxBudget) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-600 font-medium hidden sm:flex items-center gap-2">
                <span>{sections.length} sections</span>
                <span>•</span>
                <span>{items.length} total items</span>
                <span>•</span>
                <span>
                  Grand Total:{' '}
                  <strong className="text-slate-900 font-black font-mono text-sm">
                    {currencySymbol}{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {isReadOnly ? 'Close' : 'Cancel'}
                </button>

                {!isReadOnly && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 shadow-sm rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving BOQ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{isEditing ? 'Update BOQ' : 'Save BOQ Version'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </motion.div>

        {/* In-Modal Architectural Drawing Studio Lightbox */}
        <BoqDrawingViewerModal
          isOpen={Boolean(previewAttachment)}
          onClose={() => setPreviewAttachment(null)}
          attachment={previewAttachment}
          title="BOQ Attachment Preview"
        />
      </div>
    </AnimatePresence>
  );
}
