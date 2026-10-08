'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  Receipt,
  FileText,
  Paperclip,
  UploadCloud,
  Trash2,
  Eye,
  Building2,
  Plus,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  DollarSign,
  CheckCircle2,
  Tag,
  Mail,
  Phone,
  Layers,
  Send,
  Check,
  AlertCircle,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/upload';

interface OrderAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

interface VendorQuoteItem {
  id: string;
  vendorId?: string;
  vendorName: string;
  vendorCategory?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  quotationRef: string; // e.g., "Quotation 1"
  quotationTitle: string;
  quotationIndex: number;
  quoteAmount?: number | string;
  notes?: string;
  attachments: OrderAttachment[];
  sentAt?: string;
  isCustomAdded?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  onSuccess: () => void;
}

export function InteriorCreateConfirmOrderModal({ isOpen, onClose, lead, onSuccess }: Props) {
  const toast = useToast();
  const { currencySymbol, formatExactCurrency } = useCurrency();

  const allQuotations: any[] = useMemo(() => lead?.quotations || [], [lead?.quotations]);

  // Essential Order Fields
  const [orderTitle, setOrderTitle] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedQuoteIdx, setSelectedQuoteIdx] = useState<number>(0);
  const [agreedAmount, setAgreedAmount] = useState<number | string>('');
  const [advanceAmount, setAdvanceAmount] = useState<number | string>('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General Order Attachments (Signed Contract / Waste / Technical Specs)
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vendor Directory
  const [vendorsList, setVendorsList] = useState<any[]>([]);

  // State of all vendor quotes grouped by quotation
  const [vendorQuotesMap, setVendorQuotesMap] = useState<Record<number, VendorQuoteItem[]>>({});

  // Active vendor uploading state
  const [uploadingVendorId, setUploadingVendorId] = useState<string | null>(null);
  const vendorFileInputRef = useRef<HTMLInputElement>(null);
  const [targetVendorForUpload, setTargetVendorForUpload] = useState<{ qIdx: number; vId: string } | null>(null);

  // Adding new vendor to a specific quotation
  const [addingVendorForQIdx, setAddingVendorForQIdx] = useState<number | null>(null);
  const [newVendorId, setNewVendorId] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorCategory, setNewVendorCategory] = useState('Carpentry / Woodwork');
  const [newVendorEmail, setNewVendorEmail] = useState('');

  // Fetch registered vendors
  useEffect(() => {
    if (isOpen) {
      interiorCrmService
        .getVendors()
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setVendorsList(list);
        })
        .catch(() => setVendorsList([]));
    }
  }, [isOpen]);

  // Initialize Data when Lead or Modal Opens
  useEffect(() => {
    if (isOpen && lead) {
      // 1. Pick default quotation index (prefer Accepted/Approved/Sent, else 0)
      let defaultIdx = 0;
      if (allQuotations.length > 0) {
        const accIdx = allQuotations.findIndex((q: any) => q.status === 'Accepted' || q.status === 'Approved');
        if (accIdx >= 0) defaultIdx = accIdx;
        else {
          const sentIdx = allQuotations.findIndex((q: any) => q.status === 'Sent');
          if (sentIdx >= 0) defaultIdx = sentIdx;
        }
      }
      setSelectedQuoteIdx(defaultIdx);

      const targetQuote = allQuotations[defaultIdx];
      const qTotal = targetQuote ? Number(targetQuote.grandTotal || 0) : 0;

      const defaultTitle = lead.confirmedOrder?.title || `${lead.name} - ${targetQuote?.title || 'Confirmed Order'}`;
      setOrderTitle(defaultTitle);

      const generatedOrderRef = `ORD-${(lead.leadNumber || '2026').replace(/[^a-zA-Z0-9-]/g, '')}-${String(Date.now()).slice(-4)}`;
      setOrderNumber(lead.confirmedOrder?.orderNumber || generatedOrderRef);
      setAgreedAmount(lead.confirmedOrder?.agreedAmount || qTotal || '');
      setAdvanceAmount(lead.confirmedOrder?.advanceReceived || (qTotal ? Math.round(qTotal * 0.1) : ''));
      setRemarks(lead.confirmedOrder?.remarks || '');
      setAttachments(lead.confirmedOrder?.attachments || []);

      // 2. Build vendor quotes map for EVERY quotation
      const initialMap: Record<number, VendorQuoteItem[]> = {};

      allQuotations.forEach((q: any, qIdx: number) => {
        const qTitle = q.title || `Quotation ${qIdx + 1}`;
        const vList: VendorQuoteItem[] = [];

        // A. Existing confirmed order vendor quotations matching this quote
        if (Array.isArray(lead.confirmedOrder?.vendorQuotations)) {
          lead.confirmedOrder.vendorQuotations.forEach((vq: any) => {
            const matchesThisQuote =
              vq.quotationIndex === qIdx ||
              vq.quotationRef === qTitle ||
              vq.quotationRef === q.quotationNumber ||
              (allQuotations.length === 1 && !vq.quotationRef);

            if (matchesThisQuote) {
              vList.push({
                id: vq.id || `vq-conf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                vendorId: vq.vendorId,
                vendorName: vq.vendorName || 'Vendor Partner',
                vendorCategory: vq.vendorCategory || 'Material / Execution',
                vendorEmail: vq.vendorEmail,
                vendorPhone: vq.vendorPhone,
                quotationRef: qTitle,
                quotationTitle: qTitle,
                quotationIndex: qIdx,
                quoteAmount: vq.quoteAmount !== undefined ? vq.quoteAmount : '',
                notes: vq.notes || '',
                attachments: Array.isArray(vq.attachments) ? vq.attachments : [],
                sentAt: vq.sentAt,
                isCustomAdded: vq.isCustomAdded,
              });
            }
          });
        }

        // B. Existing quotation vendorQuotes
        if (Array.isArray(q.vendorQuotes)) {
          q.vendorQuotes.forEach((vq: any) => {
            const alreadyExists = vList.some(
              (v) => (v.vendorEmail && v.vendorEmail === vq.vendorEmail) || v.vendorName === vq.vendorName
            );
            if (!alreadyExists) {
              vList.push({
                id: vq.id || `vq-quote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                vendorId: vq.vendorId,
                vendorName: vq.vendorName || 'Vendor Partner',
                vendorCategory: vq.vendorCategory || 'Material / Execution',
                vendorEmail: vq.vendorEmail,
                vendorPhone: vq.vendorPhone,
                quotationRef: qTitle,
                quotationTitle: qTitle,
                quotationIndex: qIdx,
                quoteAmount: vq.quoteAmount !== undefined ? vq.quoteAmount : '',
                notes: vq.notes || '',
                attachments: Array.isArray(vq.attachments) ? vq.attachments : [],
                sentAt: vq.sentAt,
              });
            }
          });
        }

        // C. Dispatched vendors in quotation phase (quote.sentVendors or quote.dispatches)
        if (Array.isArray(q.sentVendors)) {
          q.sentVendors.forEach((sv: any) => {
            const alreadyExists = vList.some(
              (v) => (sv.vendorEmail && v.vendorEmail === sv.vendorEmail) || v.vendorName === sv.vendorName
            );
            if (!alreadyExists) {
              vList.push({
                id: `vq-sent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                vendorId: sv.vendorId,
                vendorName: sv.vendorName || 'Vendor Partner',
                vendorCategory: sv.vendorCategory || 'Material Partner',
                vendorEmail: sv.vendorEmail,
                vendorPhone: sv.vendorPhone,
                quotationRef: qTitle,
                quotationTitle: qTitle,
                quotationIndex: qIdx,
                quoteAmount: '',
                notes: '',
                attachments: [],
                sentAt: sv.sentAt,
              });
            }
          });
        }

        if (Array.isArray(q.dispatches)) {
          q.dispatches
            .filter((d: any) => d.recipientType === 'vendor')
            .forEach((d: any) => {
              const alreadyExists = vList.some(
                (v) => (d.recipientEmail && v.vendorEmail === d.recipientEmail) || v.vendorName === d.recipientName
              );
              if (!alreadyExists) {
                vList.push({
                  id: `vq-disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  vendorName: d.recipientName || 'Vendor Partner',
                  vendorCategory: 'Material Partner',
                  vendorEmail: d.recipientEmail,
                  quotationRef: qTitle,
                  quotationTitle: qTitle,
                  quotationIndex: qIdx,
                  quoteAmount: '',
                  notes: '',
                  attachments: [],
                  sentAt: d.sentAt,
                });
              }
            });
        }

        initialMap[qIdx] = vList;
      });

      setVendorQuotesMap(initialMap);
      setAddingVendorForQIdx(null);
    }
  }, [isOpen, lead, allQuotations]);

  // Sync agreed amount when user switches quotation
  const handleSelectQuote = (idx: number) => {
    setSelectedQuoteIdx(idx);
    const q = allQuotations[idx];
    if (q) {
      const qTotal = Number(q.grandTotal || 0);
      setAgreedAmount(qTotal);
      setAdvanceAmount(Math.round(qTotal * 0.1));
    }
  };

  // General File Uploads (Signed Contract / Waste Specs)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    const newFiles: OrderAttachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let uploadedUrl = '';
        try {
          uploadedUrl = await uploadToCloudinary(file);
        } catch {
          uploadedUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        newFiles.push({
          name: file.name,
          url: uploadedUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }
      setAttachments((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} general order document(s) attached!`);
    } catch {
      toast.error('Failed to upload files');
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Trigger File Upload for a Specific Vendor Card
  const triggerVendorUpload = (qIdx: number, vId: string) => {
    setTargetVendorForUpload({ qIdx, vId });
    if (vendorFileInputRef.current) {
      vendorFileInputRef.current.value = '';
      vendorFileInputRef.current.click();
    }
  };

  // Handle Vendor Offline Document Upload (PDFs, Scans, Photos)
  const handleVendorFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!targetVendorForUpload) return;
    const { qIdx, vId } = targetVendorForUpload;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingVendorId(vId);
    const newFiles: OrderAttachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let uploadedUrl = '';
        try {
          uploadedUrl = await uploadToCloudinary(file);
        } catch {
          uploadedUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        newFiles.push({
          name: file.name,
          url: uploadedUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }

      setVendorQuotesMap((prev) => {
        const currentList = prev[qIdx] || [];
        const updatedList = currentList.map((item) => {
          if (item.id === vId) {
            return {
              ...item,
              attachments: [...(item.attachments || []), ...newFiles],
            };
          }
          return item;
        });
        return { ...prev, [qIdx]: updatedList };
      });

      toast.success(`${newFiles.length} offline document(s) attached to vendor!`);
    } catch {
      toast.error('Failed to upload vendor documents');
    } finally {
      setUploadingVendorId(null);
      setTargetVendorForUpload(null);
      if (vendorFileInputRef.current) vendorFileInputRef.current.value = '';
    }
  };

  // Remove Attachment from a Specific Vendor Card
  const handleRemoveVendorAttachment = (qIdx: number, vId: string, attIdx: number) => {
    setVendorQuotesMap((prev) => {
      const currentList = prev[qIdx] || [];
      const updatedList = currentList.map((item) => {
        if (item.id === vId) {
          return {
            ...item,
            attachments: item.attachments.filter((_, i) => i !== attIdx),
          };
        }
        return item;
      });
      return { ...prev, [qIdx]: updatedList };
    });
  };

  // Update Vendor Quote Amount or Notes inline
  const handleUpdateVendorField = (qIdx: number, vId: string, field: 'quoteAmount' | 'notes', value: any) => {
    setVendorQuotesMap((prev) => {
      const currentList = prev[qIdx] || [];
      const updatedList = currentList.map((item) => {
        if (item.id === vId) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return { ...prev, [qIdx]: updatedList };
    });
  };

  // Remove a Vendor Card from a Quotation
  const handleRemoveVendorFromQuote = (qIdx: number, vId: string) => {
    setVendorQuotesMap((prev) => {
      const currentList = prev[qIdx] || [];
      return {
        ...prev,
        [qIdx]: currentList.filter((item) => item.id !== vId),
      };
    });
  };

  // Add a new Vendor to a specific Quotation
  const handleAddNewVendorToQuote = (qIdx: number) => {
    const vName = newVendorName.trim();
    if (!vName) {
      toast.error('Please enter or select a vendor name.');
      return;
    }

    const targetQuote = allQuotations[qIdx];
    const qTitle = targetQuote?.title || `Quotation ${qIdx + 1}`;

    const newEntry: VendorQuoteItem = {
      id: `vq-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vendorId: newVendorId || undefined,
      vendorName: vName,
      vendorCategory: newVendorCategory.trim() || 'Material Partner',
      vendorEmail: newVendorEmail.trim() || undefined,
      quotationRef: qTitle,
      quotationTitle: qTitle,
      quotationIndex: qIdx,
      quoteAmount: '',
      notes: '',
      attachments: [],
      isCustomAdded: true,
    };

    setVendorQuotesMap((prev) => ({
      ...prev,
      [qIdx]: [...(prev[qIdx] || []), newEntry],
    }));

    toast.success(`"${vName}" added to ${qTitle}!`);
    setNewVendorId('');
    setNewVendorName('');
    setNewVendorCategory('Carpentry / Woodwork');
    setNewVendorEmail('');
    setAddingVendorForQIdx(null);
  };

  // Select registered vendor into the Add Form
  const handleSelectRegisteredVendor = (vId: string) => {
    setNewVendorId(vId);
    if (!vId) return;
    const found = vendorsList.find((v) => (v._id || v.id) === vId);
    if (found) {
      setNewVendorName(found.name || found.companyName || '');
      setNewVendorCategory(found.vendorCategory || found.category || 'Material Partner');
      setNewVendorEmail(found.email || found.contactEmail || '');
    }
  };

  // Submit Confirmed Order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !lead._id) return;

    if (allQuotations.length === 0) {
      toast.error('No quotation found for this lead. Please create a quotation first.');
      return;
    }

    const selectedQuote = allQuotations[selectedQuoteIdx];
    if (!selectedQuote) {
      toast.error('Please select a quotation for this confirmed order.');
      return;
    }

    const numAgreedAmount = Number(agreedAmount) || Number(selectedQuote?.grandTotal || 0);
    const numAdvanceAmount = Number(advanceAmount) || 0;

    // Collect all vendor quotations across all quotation cards
    const allVendorQuotesFlat: VendorQuoteItem[] = [];
    Object.values(vendorQuotesMap).forEach((list) => {
      allVendorQuotesFlat.push(...list);
    });

    setIsSubmitting(true);
    try {
      // 1. Update quotation status to 'Accepted' in allQuotations & link vendor quotes
      const targetVersion = selectedQuote.version;
      const targetNumber = selectedQuote.quotationNumber;
      const targetId = selectedQuote._id;

      const updatedQuotations = allQuotations.map((q: any, qIdx: number) => {
        const isTarget =
          (targetId && q._id === targetId) ||
          (targetNumber && q.quotationNumber === targetNumber) ||
          (targetVersion !== undefined && q.version === targetVersion) ||
          qIdx === selectedQuoteIdx;

        const vendorQuotesForThisQ = vendorQuotesMap[qIdx] || [];

        return {
          ...q,
          status: isTarget ? 'Accepted' : q.status,
          vendorQuotes: vendorQuotesForThisQ.length > 0 ? vendorQuotesForThisQ : q.vendorQuotes || [],
          updatedAt: new Date().toISOString(),
        };
      });

      // 2. Build confirmed order payload
      const confirmedOrderPayload = {
        title: orderTitle.trim() || `${lead.name} - Confirmed Order`,
        orderNumber: orderNumber.trim() || `ORD-${lead.leadNumber || '2026'}`,
        quotationIndex: selectedQuoteIdx,
        quotationTitle: selectedQuote?.title || `Quotation ${selectedQuoteIdx + 1}`,
        quotationVersion: selectedQuote?.version || selectedQuoteIdx + 1,
        agreedAmount: numAgreedAmount,
        advanceReceived: numAdvanceAmount,
        confirmationType: 'Confirmed Order',
        remarks: remarks.trim(),
        attachments,
        vendorQuotations: allVendorQuotesFlat, // ✅ All vendor quotes with offline documents linked per quotation
        confirmedAt: new Date().toISOString(),
      };

      // 3. Update customer in CRM
      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
        status: 'Booking Pending',
        confirmedOrder: confirmedOrderPayload,
      });

      // 4. Log CRM activity
      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Confirmed Order Created: "${confirmedOrderPayload.title}" (Ref #${confirmedOrderPayload.orderNumber}) | Value: ${currencySymbol} ${numAgreedAmount.toLocaleString()} | Linked Vendor Quotes: ${allVendorQuotesFlat.length} across ${allQuotations.length} quotation(s) | Attachments: ${attachments.length}`,
      });

      toast.success('✅ Order confirmed and vendor documents linked successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create confirmed order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
      />

      {/* Hidden File Input for uploading offline documents to a specific vendor card */}
      <input
        type="file"
        multiple
        ref={vendorFileInputRef}
        onChange={handleVendorFileUpload}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 sm:p-7 z-[70] max-h-[94vh] overflow-y-auto flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Create Confirmed Order
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Commercial Sign-off & Vendor Quotes
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review quotations, manage vendors who received each quotation, and attach their offline reply documents for <strong className="text-slate-800">{lead?.name}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          {/* TOP COMMERCIAL BAR: Title, Number, Agreed Amount, Advance */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Order Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  placeholder="e.g. Turnkey Execution - 3BHK Luxury Interior"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Order Ref #
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ORD-2026-XXXX"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Final Client Agreed Amount ({currencySymbol}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={agreedAmount}
                  onChange={(e) => setAgreedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Advance Payment Received ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* MAIN SECTION: QUOTATIONS & VENDORS SENT CARDS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Receipt size={16} className="text-indigo-600" />
                  <span>Quotations & Vendor Dispatch Cards</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select the primary approved quotation, and attach offline documents/rates from each vendor that received the quotation.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {allQuotations.length} Quotation{allQuotations.length === 1 ? '' : 's'}
              </span>
            </div>

            {allQuotations.length === 0 ? (
              <div className="p-5 text-center bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <AlertCircle size={20} className="mx-auto text-amber-600" />
                <p className="text-xs font-bold text-amber-900">No Quotations Found</p>
                <p className="text-xs text-amber-700">
                  Create a quotation in the CRM leads page before confirming this order.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allQuotations.map((quote: any, qIdx: number) => {
                  const isSelectedForOrder = selectedQuoteIdx === qIdx;
                  const qTitle = quote.title || `Quotation ${qIdx + 1}`;
                  const qVersion = quote.version || qIdx + 1;
                  const qTotal = Number(quote.grandTotal || quote.totalAmount || 0);
                  const qItemsCount = quote.items?.length || 0;
                  const vendorQuotesList = vendorQuotesMap[qIdx] || [];
                  const isAddingVendorHere = addingVendorForQIdx === qIdx;

                  return (
                    <div
                      key={qIdx}
                      className={cn(
                        'rounded-2xl border transition-all overflow-hidden shadow-xs',
                        isSelectedForOrder
                          ? 'border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-500/15'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      {/* Quotation Header Bar */}
                      <div
                        onClick={() => handleSelectQuote(qIdx)}
                        className={cn(
                          'p-4 flex items-center justify-between gap-3 cursor-pointer border-b',
                          isSelectedForOrder
                            ? 'bg-indigo-50/70 border-indigo-200/80'
                            : 'bg-slate-50/80 border-slate-200/80'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="radio"
                            name="selectedQuotationRadio"
                            checked={isSelectedForOrder}
                            onChange={() => handleSelectQuote(qIdx)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-slate-900 truncate">
                                {qTitle}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                v{qVersion}
                              </span>
                              {isSelectedForOrder ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                                  <CheckCircle2 size={11} /> Primary Approved Quotation
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {qItemsCount} Scope Items • Status: <strong className="text-slate-700">{quote.status || 'Generated'}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-900 font-mono">
                            {currencySymbol} {qTotal.toLocaleString()}
                          </p>
                          <span className="text-[11px] font-semibold text-indigo-600">
                            {vendorQuotesList.length} Vendor{vendorQuotesList.length === 1 ? '' : 's'} Linked
                          </span>
                        </div>
                      </div>

                      {/* Vendors Sent & Offline Documents Body */}
                      <div className="p-4 space-y-3.5 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                            <Building2 size={14} className="text-indigo-600" />
                            <span>Vendors Sent for {qTitle}:</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isAddingVendorHere) setAddingVendorForQIdx(null);
                              else {
                                setAddingVendorForQIdx(qIdx);
                                setNewVendorId('');
                                setNewVendorName('');
                                setNewVendorCategory('Carpentry / Woodwork');
                                setNewVendorEmail('');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
                          >
                            <Plus size={12} />
                            {isAddingVendorHere ? 'Cancel' : '+ Add Vendor to this Quote'}
                          </button>
                        </div>

                        {/* Inline Form to Add a New Vendor to THIS Quotation */}
                        <AnimatePresence>
                          {isAddingVendorHere && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2.5 overflow-hidden"
                            >
                              <div className="text-[11px] font-bold text-indigo-900">
                                Link a New Vendor Partner to {qTitle}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">
                                    Vendor Directory
                                  </label>
                                  {vendorsList.length > 0 ? (
                                    <select
                                      value={newVendorId}
                                      onChange={(e) => handleSelectRegisteredVendor(e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                                    >
                                      <option value="">-- Choose Vendor or type below --</option>
                                      {vendorsList.map((v) => (
                                        <option key={v._id || v.id} value={v._id || v.id}>
                                          {v.name || v.companyName} ({v.vendorCategory || v.category || 'Vendor'})
                                        </option>
                                      ))}
                                    </select>
                                  ) : null}
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">
                                    Vendor Name <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={newVendorName}
                                    onChange={(e) => setNewVendorName(e.target.value)}
                                    placeholder="e.g. ABC Woodcrafts Ltd"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">
                                    Trade Category
                                  </label>
                                  <input
                                    type="text"
                                    value={newVendorCategory}
                                    onChange={(e) => setNewVendorCategory(e.target.value)}
                                    placeholder="e.g. Carpentry, False Ceiling"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setAddingVendorForQIdx(null)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200/60"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddNewVendorToQuote(qIdx)}
                                  className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                                >
                                  Add Vendor Card
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Vendor Cards List under this Quotation */}
                        {vendorQuotesList.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2.5">
                            {vendorQuotesList.map((vq) => {
                              const hasDocs = Array.isArray(vq.attachments) && vq.attachments.length > 0;
                              const isThisUploading = uploadingVendorId === vq.id;

                              return (
                                <div
                                  key={vq.id}
                                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2.5"
                                >
                                  {/* Vendor Top Bar */}
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black text-slate-900">
                                          {vq.vendorName}
                                        </span>
                                        {vq.vendorCategory && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {vq.vendorCategory}
                                          </span>
                                        )}
                                        {vq.sentAt && (
                                          <span className="text-[10px] text-slate-400 font-medium">
                                            Sent {new Date(vq.sentAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                      {vq.vendorEmail && (
                                        <p className="text-[11px] text-slate-500 font-mono">
                                          ✉️ {vq.vendorEmail}
                                        </p>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveVendorFromQuote(qIdx, vq.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                      title="Remove this vendor card"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>

                                  {/* Vendor Rate & Notes Inputs */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">
                                        Vendor Quoted Rate ({currencySymbol})
                                      </label>
                                      <input
                                        type="number"
                                        value={vq.quoteAmount || ''}
                                        onChange={(e) =>
                                          handleUpdateVendorField(qIdx, vq.id, 'quoteAmount', e.target.value)
                                        }
                                        placeholder="e.g. 18500"
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 uppercase">
                                        Offline Specs / Scope Notes
                                      </label>
                                      <input
                                        type="text"
                                        value={vq.notes || ''}
                                        onChange={(e) =>
                                          handleUpdateVendorField(qIdx, vq.id, 'notes', e.target.value)
                                        }
                                        placeholder="e.g. Included ply delivery, 1 year warranty, offline paper invoice provided"
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-normal text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                                      />
                                    </div>
                                  </div>

                                  {/* Offline Documents Upload Section for THIS Vendor */}
                                  <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {hasDocs ? (
                                        vq.attachments.map((doc, dIdx) => (
                                          <div
                                            key={dIdx}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 font-medium shadow-2xs"
                                          >
                                            <FileText size={12} className="text-indigo-600 shrink-0" />
                                            <span className="max-w-[130px] truncate" title={doc.name}>
                                              {doc.name}
                                            </span>
                                            {doc.url && (
                                              <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-slate-400 hover:text-indigo-600 ml-0.5"
                                                title="Preview document"
                                              >
                                                <Eye size={11} />
                                              </a>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveVendorAttachment(qIdx, vq.id, dIdx)}
                                              className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                              title="Remove document"
                                            >
                                              <X size={11} />
                                            </button>
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-[11px] text-slate-400 italic">
                                          No offline documents (PDF/photo) uploaded yet for {vq.vendorName}.
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => triggerVendorUpload(qIdx, vq.id)}
                                      disabled={isThisUploading}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
                                    >
                                      <UploadCloud size={12} className="text-indigo-600" />
                                      <span>{isThisUploading ? 'Uploading...' : '+ Attach Offline PDF / Photo'}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
                            No vendors were dispatched {qTitle}. Click <strong className="text-indigo-600 font-semibold cursor-pointer" onClick={() => setAddingVendorForQIdx(qIdx)}>+ Add Vendor to this Quote</strong> to attach offline vendor quotes.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GENERAL CLIENT ATTACHMENTS (Waste Calculation / Signed Contract) */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip size={14} className="text-blue-600" /> General Client Contract / Signed Documents
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Attach signed client agreement, waste calculation sheets, or general project files.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <UploadCloud size={13} className="text-blue-600" />
                {isUploadingAttachment ? 'Uploading...' : 'Upload General Files'}
              </button>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              />
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate" title={file.name}>
                          {file.name}
                        </p>
                        {file.size && (
                          <span className="text-[10px] text-slate-400">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Preview"
                        >
                          <Eye size={13} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remarks / Order Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Order Remarks / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Client confirmed execution schedule starting next Monday."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-normal text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || allQuotations.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <ShieldCheck size={15} />
              {isSubmitting ? 'Saving Confirmed Order...' : 'Confirm Order & Link Vendor Quotes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
