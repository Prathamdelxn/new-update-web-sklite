'use client';

// =============================================================================
// Sky-Lite Web — Project BOQ Builder Modal
// Professional, Section-Based Hierarchical BOQ Builder & Specification Editor
// Identical to CRM BOQ Builder with Multi-Section Groups, Technical Specs,
// Brand/Makes, UOMs, Drawing & Image Attachments, Subtotals, and Scope Notes.
// Backed directly by interiorProjectService.
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
  Paperclip,
  ImageIcon,
  UploadCloud,
  Check,
  Eye,
  Download,
} from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { parseMaxBudget } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { uploadToCloudinary } from '@/lib/upload';
import {
  BOQ_UNITS,
  BOQ_CATEGORIES,
  BoqAttachment,
  BoqSection,
  BoqItem,
} from '@/features/interior-new/components/crm/modals/InteriorBoqBuilderModal';

interface InteriorProjectBoqBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectBudget?: number | string;
  existingBoq?: any | null;
  isReadOnly?: boolean;
  onSuccess: () => void;
}

export function InteriorProjectBoqBuilderModal({
  isOpen,
  onClose,
  projectId,
  projectBudget,
  existingBoq = null,
  isReadOnly = false,
  onSuccess,
}: InteriorProjectBoqBuilderModalProps) {
  const toast = useToast();
  const { currencySymbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingSecId, setUploadingSecId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<BoqAttachment | null>(null);
  const [notes, setNotes] = useState('');
  const [sections, setSections] = useState<BoqSection[]>([]);
  const [items, setItems] = useState<BoqItem[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isEditing = Boolean(existingBoq && existingBoq._id);

  // Initialize or populate data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingBoq) {
        let rawSections: BoqSection[] = [];
        let rawItems: BoqItem[] = [];

        if (Array.isArray(existingBoq.sections) && existingBoq.sections.length > 0) {
          rawSections = existingBoq.sections.map((sec: any, sIdx: number) => ({
            id: sec.id || sec.sectionId || `sec-${Date.now()}-${sIdx + 1}`,
            sectionNumber: sec.sectionNumber || String(sIdx + 1),
            sectionTitle: sec.sectionTitle || sec.name || '',
            scopeDescription: sec.scopeDescription || sec.sectionScope || '',
            attachments: sec.attachments || [],
            isCollapsed: false,
          }));
        }

        if (Array.isArray(existingBoq.items) && existingBoq.items.length > 0) {
          rawItems = existingBoq.items.map((it: any, idx: number) => {
            const assignedSecId =
              it.sectionId ||
              rawSections.find((s) => s.sectionTitle === it.category || s.sectionNumber === it.sectionNumber)?.id ||
              rawSections[0]?.id ||
              'sec-1';

            const qty = Number(it.quantity) || 0;
            const rate = Number(it.rate) || 0;
            const amount = it.amount !== undefined ? Number(it.amount) : qty * rate;

            return {
              id: it._id || it.id || `item-${Date.now()}-${idx}`,
              sectionId: assignedSecId,
              itemCode: it.itemCode || String(it.serialNumber || idx + 1),
              category: it.category || '',
              itemName: it.itemName || '',
              description: it.description || '',
              brandMakes: it.brandMakes || '',
              quantity: qty,
              unit: it.unit || 'SQ M',
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
              { id: 'sec-1', sectionNumber: '1', sectionTitle: 'Civil Work', scopeDescription: '', attachments: [], isCollapsed: false },
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
              category: 'Civil Work',
              itemName: '',
              description: '',
              brandMakes: '',
              quantity: 0,
              unit: 'SQ M',
              rate: 0,
              amount: 0,
              remarks: '',
            },
          ];
        }

        setItems(rawItems);
        setNotes(existingBoq.notes || '');
      } else {
        // Fresh initial BOQ
        const initialSecId = 'sec-1';
        setSections([
          { id: initialSecId, sectionNumber: '1', sectionTitle: 'Civil Work', scopeDescription: '', attachments: [], isCollapsed: false },
        ]);
        setItems([
          {
            id: `item-${Date.now()}`,
            sectionId: initialSecId,
            itemCode: '1',
            category: 'Civil Work',
            itemName: '',
            description: '',
            brandMakes: '',
            quantity: 0,
            unit: 'SQ M',
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
    }
  }, [isOpen, existingBoq]);

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
      unit: 'SQ M',
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
    const sec = sections.find((s) => s.id === secId);

    const newItem: BoqItem = {
      id: `item-${Date.now()}`,
      sectionId: secId,
      itemCode: nextCode,
      category: sec?.sectionTitle || '',
      itemName: '',
      description: '',
      brandMakes: '',
      quantity: 0,
      unit: 'SQ M',
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
          updated.amount = q * r;
        }

        return updated;
      })
    );
  };

  const removeItem = (itemId: string) => {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;

    const countInSection = items.filter((i) => i.sectionId === targetItem.sectionId).length;
    if (countInSection <= 1) {
      toast.error('Each section must have at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Standard Template Quick Inserter
  const handleApplyStandardTemplate = () => {
    const standardPackages = [
      {
        sectionNumber: '1',
        sectionTitle: 'Civil & Masonry Works',
        scopeDescription: 'Dismantling, debris removal, brickwork, IPS flooring, and core site preparation.',
        items: [
          { itemCode: '1.1', category: 'Civil & Masonry Works', itemName: 'Demolition & Surface Chipping', description: 'Careful removal of existing plaster and floor screed with safe debris clearance.', brandMakes: 'Site Standard', quantity: 1, unit: 'LOT', rate: 15000, remarks: 'Includes carting away debris' },
          { itemCode: '1.2', category: 'Civil & Masonry Works', itemName: 'Waterproofing & Coba Treatment', description: 'Brickbat coba waterproofing with cementitious polymer slurry coat.', brandMakes: 'Dr. Fixit / Fosroc', quantity: 120, unit: 'SQFT', rate: 85, remarks: '5-year leakage warranty' },
        ],
      },
      {
        sectionNumber: '2',
        sectionTitle: 'Woodwork & Modular Carpentry',
        scopeDescription: 'Factory-pressed commercial ply/HDHMR furniture, modular carcass, and premium laminates.',
        items: [
          { itemCode: '2.1', category: 'Woodwork & Modular Carpentry', itemName: 'Modular Kitchen Base & Wall Units', description: 'BWP marine ply carcass with 1mm anti-scratch laminate and soft-close hinges.', brandMakes: 'Greenlam / Century / Hettich', quantity: 45, unit: 'SQFT', rate: 1850, remarks: 'Includes tandem boxes & cutlery trays' },
          { itemCode: '2.2', category: 'Woodwork & Modular Carpentry', itemName: 'Master Bedroom Wardrobe', description: 'Full-height wardrobe with loft, internal drawers, and profile handles.', brandMakes: 'Merino / Hafele', quantity: 70, unit: 'SQFT', rate: 1650, remarks: 'Internal LED sensor lights' },
        ],
      },
      {
        sectionNumber: '3',
        sectionTitle: 'False Ceiling & POP Works',
        scopeDescription: 'Gypsum false ceiling framing, cove lighting provisions, and putty preparation.',
        items: [
          { itemCode: '3.1', category: 'False Ceiling & POP Works', itemName: 'Gypsum Board False Ceiling', description: '12.5mm Saint-Gobain Gyproc board on GI perimeter framing with light cutouts.', brandMakes: 'Saint-Gobain Gyproc', quantity: 450, unit: 'SQFT', rate: 110, remarks: 'Includes step cove detailing' },
        ],
      },
      {
        sectionNumber: '4',
        sectionTitle: 'Electrical & SITC Lighting',
        scopeDescription: 'Concealed wiring, DB dressing, modular switches, and architectural light fixtures.',
        items: [
          { itemCode: '4.1', category: 'Electrical & SITC Lighting', itemName: 'Modular Point Wiring', description: 'FRLS copper multi-strand wiring in rigid PVC conduits with earthing.', brandMakes: 'Polycab / Havells', quantity: 35, unit: 'Nos', rate: 950, remarks: '6A / 16A points included' },
          { itemCode: '4.2', category: 'Electrical & SITC Lighting', itemName: 'Architectural LED COB Lights', description: 'Recessed anti-glare warm white 7W/12W spotlights.', brandMakes: 'Philips / Wipro', quantity: 24, unit: 'Nos', rate: 650, remarks: '3000K warm white' },
        ],
      },
      {
        sectionNumber: '5',
        sectionTitle: 'Painting & Surface Finishes',
        scopeDescription: 'Two coats acrylic putty, primer, and royal luxury emulsion with texture accent wall.',
        items: [
          { itemCode: '5.1', category: 'Painting & Surface Finishes', itemName: 'Royale Luxury Interior Emulsion', description: 'Surface sanding, 2 coats primer, 2 coats Asian Paints Royale with smooth roller finish.', brandMakes: 'Asian Paints Royale', quantity: 1200, unit: 'SQFT', rate: 38, remarks: 'Includes masking and site cleaning' },
        ],
      },
    ];

    const newSections: BoqSection[] = [];
    const newItems: BoqItem[] = [];

    standardPackages.forEach((pkg, sIdx) => {
      const secId = `sec-std-${Date.now()}-${sIdx + 1}`;
      newSections.push({
        id: secId,
        sectionNumber: pkg.sectionNumber,
        sectionTitle: pkg.sectionTitle,
        scopeDescription: pkg.scopeDescription,
        attachments: [],
        isCollapsed: false,
      });

      pkg.items.forEach((it, iIdx) => {
        newItems.push({
          id: `item-std-${Date.now()}-${sIdx + 1}-${iIdx + 1}`,
          sectionId: secId,
          itemCode: it.itemCode,
          category: it.category,
          itemName: it.itemName,
          description: it.description,
          brandMakes: it.brandMakes,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          amount: it.quantity * it.rate,
          remarks: it.remarks,
        });
      });
    });

    setSections(newSections);
    setItems(newItems);
    toast.success('Applied standard interior section templates with specifications!');
  };

  // Computations
  const getSectionSubtotal = (secId: string) => {
    return items
      .filter((i) => i.sectionId === secId)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const totalAmount = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const maxBudget = projectBudget ? parseMaxBudget(String(projectBudget)) : 0;
  const isOverBudget = Boolean(maxBudget && maxBudget > 0 && totalAmount > maxBudget);
  const budgetExcess = isOverBudget ? totalAmount - (maxBudget || 0) : 0;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      return toast.error('This BOQ is preserved in read-only mode.');
    }

    if (sections.length === 0 || items.length === 0) {
      return toast.error('Please add at least one section/category and line item to the BOQ.');
    }

    if (sections.some((s) => !s.sectionTitle || !s.sectionTitle.trim())) {
      return toast.error('Please provide a category/section name for all sections.');
    }

    if (items.some((i) => !i.itemName || !i.itemName.trim())) {
      return toast.error('Please provide an Item Name for all line items.');
    }

    if (items.some((i) => !i.quantity || Number(i.quantity) <= 0)) {
      return toast.error('Quantity must be greater than 0 for all rows.');
    }

    setIsSubmitting(true);

    try {
      const formattedSections = sections.map((s) => ({
        id: s.id,
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
          serialNumber: idx + 1,
          itemCode: it.itemCode || String(idx + 1),
          sectionNumber: sec?.sectionNumber || '',
          sectionTitle: sec?.sectionTitle || it.category || 'Civil Work',
          sectionScope: sec?.scopeDescription || '',
          category: it.category || sec?.sectionTitle || 'Civil Work',
          itemName: it.itemName.trim(),
          description: it.description?.trim() || '',
          brandMakes: it.brandMakes?.trim() || '',
          quantity: Number(it.quantity) || 0,
          unit: it.unit || 'SQ M',
          rate: Number(it.rate) || 0,
          amount: Number(it.amount) || (Number(it.quantity) || 0) * (Number(it.rate) || 0),
          remarks: it.remarks?.trim() || '',
        };
      });

      const payload = {
        notes,
        sections: formattedSections,
        items: formattedItems,
      };

      if (isEditing && existingBoq?._id) {
        const res = await interiorProjectService.updateBoq(projectId, existingBoq._id, payload);
        if (res.success) {
          toast.success('BOQ updated successfully with full sections & specifications!');
          onSuccess();
          onClose();
        }
      } else {
        const res = await interiorProjectService.createBoq(projectId, payload);
        if (res.success) {
          toast.success('New BOQ Version created successfully with section hierarchy!');
          onSuccess();
          onClose();
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to save BOQ');
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
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {isReadOnly
                      ? `View BOQ Version (${existingBoq?.versionLabel || 'v1.0'})`
                      : isEditing
                      ? `Edit BOQ Version (${existingBoq?.versionLabel || 'Draft'})`
                      : 'Create New BOQ Version'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    {existingBoq?.versionLabel || 'New'}
                  </span>
                  {isReadOnly && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Approved & Locked
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {isReadOnly
                    ? 'This BOQ version is locked for modifications.'
                    : 'Manage multi-section groups, specifications, brand/makes, drawing attachments, and unit rates.'}
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
              {sections.map((section) => {
                const sectionItems = items.filter((i) => i.sectionId === section.id);
                const subTotal = getSectionSubtotal(section.id);
                const isUploading = uploadingSecId === section.id;

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
                            title="Section Number (e.g. 1, 2, A)"
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
                            {currencySymbol}{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                        {/* Section Scope Notes */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span>Section Scope of Work / Technical Notes (Optional)</span>
                          </label>
                          <textarea
                            disabled={isReadOnly}
                            rows={2}
                            value={section.scopeDescription}
                            onChange={(e) => updateSection(section.id, 'scopeDescription', e.target.value)}
                            placeholder="Describe scope, surface preparation, approvals, work methods, inclusions/exclusions for this section..."
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition disabled:bg-slate-50 resize-none leading-relaxed"
                          />
                        </div>

                        {/* Section Attachments */}
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                              <Paperclip className="w-3 h-3 text-blue-600" />
                              <span>Drawings & Image Attachments ({(section.attachments || []).length})</span>
                            </span>

                            {!isReadOnly && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  ref={(el) => {
                                    fileInputRefs.current[section.id] = el;
                                  }}
                                  onChange={(e) => handleFileUpload(section.id, e)}
                                  accept="image/*,.pdf,.dwg,.dxf"
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => fileInputRefs.current[section.id]?.click()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                                >
                                  {isUploading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UploadCloud className="w-3 h-3" />
                                  )}
                                  <span>Upload File</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Render Attached Badges */}
                          {(section.attachments || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {section.attachments?.map((att, attIdx) => (
                                <div
                                  key={attIdx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 border border-slate-200 text-slate-800 shadow-2xs group hover:bg-slate-200/70 transition"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <button
                                    type="button"
                                    onClick={() => setPreviewAttachment(att)}
                                    className="hover:underline truncate max-w-[200px] text-left cursor-pointer"
                                    title={att.name}
                                  >
                                    {att.name}
                                  </button>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-slate-400 hover:text-blue-600 p-0.5 ml-0.5"
                                    title="Open raw file"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </a>
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => removeAttachment(section.id, attIdx)}
                                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded ml-0.5 cursor-pointer"
                                      title="Remove attachment"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Line Items Table */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-blue-600" />
                              <span>Section Line Items</span>
                            </span>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => addItemToSection(section.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Row</span>
                              </button>
                            )}
                          </div>

                          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
                            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                              <thead>
                                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                                  <th className="p-2 w-14 text-center">Code</th>
                                  <th className="p-2 w-48">Item Description</th>
                                  <th className="p-2">Technical Specification</th>
                                  <th className="p-2 w-20 text-right">Qty</th>
                                  <th className="p-2 w-28 text-center">UOM</th>
                                  <th className="p-2 w-24 text-right">Rate ({currencySymbol})</th>
                                  <th className="p-2 w-28 text-right">Amount ({currencySymbol})</th>
                                  <th className="p-2 w-36">Remarks</th>
                                  {!isReadOnly && <th className="p-2 w-10 text-center" />}
                                </tr>
                              </thead>
                              <tbody>
                                {sectionItems.map((item, rowIdx) => (
                                  <tr
                                    key={item.id}
                                    className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                                  >
                                    {/* Code */}
                                    <td className="p-1.5 align-top">
                                      <input
                                        disabled={isReadOnly}
                                        value={item.itemCode}
                                        onChange={(e) => updateItem(item.id, 'itemCode', e.target.value)}
                                        placeholder={String(rowIdx + 1)}
                                        className="w-full h-8 px-1 text-center font-mono text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white disabled:bg-transparent"
                                      />
                                    </td>

                                    {/* Item Name / Headline */}
                                    <td className="p-1.5 align-top">
                                      <textarea
                                        required
                                        disabled={isReadOnly}
                                        rows={2}
                                        value={item.itemName}
                                        onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                                        placeholder="Headline / Title *"
                                        className="w-full text-xs font-semibold p-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 resize-none placeholder:font-normal placeholder:text-slate-400"
                                      />
                                    </td>

                                    {/* Technical Specification */}
                                    <td className="p-1.5 align-top">
                                      <textarea
                                        disabled={isReadOnly}
                                        rows={2}
                                        value={item.description}
                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        placeholder="Detailed materials, dimensions, thickness, fittings..."
                                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50 resize-none leading-tight placeholder:text-slate-400"
                                      />
                                    </td>

                                    {/* Qty */}
                                    <td className="p-1.5 align-top">
                                      <input
                                        type="number"
                                        required
                                        min={0.01}
                                        step="any"
                                        disabled={isReadOnly}
                                        value={item.quantity === 0 ? '' : item.quantity}
                                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                        placeholder="0"
                                        className="w-full h-8 px-2 text-right font-mono font-bold text-xs text-slate-900 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50"
                                      />
                                    </td>

                                    {/* Unit (UOM) */}
                                    <td className="p-1.5 align-top">
                                      <select
                                        disabled={isReadOnly}
                                        value={item.unit}
                                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                        className="w-full h-8 px-1.5 text-[11px] font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50 cursor-pointer"
                                      >
                                        {BOQ_UNITS.map((u) => (
                                          <option key={u.value} value={u.value}>
                                            {u.label}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* Rate */}
                                    <td className="p-1.5 align-top">
                                      <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        disabled={isReadOnly}
                                        value={item.rate === 0 ? '' : item.rate}
                                        onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                                        placeholder="0"
                                        className="w-full h-8 px-2 text-right font-mono text-xs text-slate-900 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 disabled:bg-slate-50"
                                      />
                                    </td>

                                    {/* Amount */}
                                    <td className="p-1.5 align-top text-right">
                                      <div className="h-8 flex items-center justify-end px-2 font-mono font-bold text-xs text-slate-900 bg-slate-50 rounded-lg border border-slate-200/60">
                                        {item.amount?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                      </div>
                                    </td>

                                    {/* Remarks */}
                                    <td className="p-1.5 align-top">
                                      <textarea
                                        disabled={isReadOnly}
                                        rows={2}
                                        value={item.remarks}
                                        onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                                        placeholder="Notes, inclusions..."
                                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-50 resize-none placeholder:text-slate-400"
                                      />
                                    </td>

                                    {/* Delete Row Button */}
                                    {!isReadOnly && (
                                      <td className="p-1.5 align-middle text-center">
                                        <button
                                          type="button"
                                          onClick={() => removeItem(item.id)}
                                          disabled={sectionItems.length <= 1}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer disabled:opacity-30"
                                          title="Delete line item"
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
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bottom Add Section Button */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addSection}
                  className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center gap-2 transition bg-white/60 hover:bg-blue-50/50 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Scope Section</span>
                </button>
              )}

              {/* Terms & Overall Scope Notes */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>BOQ Notes, Special Conditions & Payment Terms</span>
                </label>
                <textarea
                  disabled={isReadOnly}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter custom remarks, exclusions, payment milestones, brand substitution guidelines, or site constraints..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition disabled:bg-slate-50 leading-relaxed"
                />
              </div>

              {/* Budget Warning Banner if over client budget */}
              {isOverBudget && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Project Budget Alert: </span>
                    <span>
                      Total BOQ cost ({currencySymbol}{totalAmount.toLocaleString('en-IN')}) exceeds targeted budget ({currencySymbol}{maxBudget?.toLocaleString('en-IN')}) by {currencySymbol}{budgetExcess.toLocaleString('en-IN')}.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Grand Total</span>
                  <span className="text-base sm:text-lg font-black font-mono text-slate-900">
                    {currencySymbol} {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <div className="text-xs text-slate-500 hidden sm:block">
                  <span>{sections.length} Sections</span> • <span>{items.length} Items</span>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                >
                  {isReadOnly ? 'Close' : 'Cancel'}
                </button>

                {!isReadOnly && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isEditing ? 'Save BOQ Version' : 'Create BOQ Version'}</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <span className="font-bold text-xs text-slate-900 truncate">{previewAttachment.name}</span>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-slate-900">
              {previewAttachment.url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[75vh] object-contain rounded-lg"
                />
              ) : (
                <iframe
                  src={previewAttachment.url}
                  title={previewAttachment.name}
                  className="w-full h-[75vh] rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
