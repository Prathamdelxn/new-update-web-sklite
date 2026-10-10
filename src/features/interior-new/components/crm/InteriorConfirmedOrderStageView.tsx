'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Receipt,
  FileText,
  Paperclip,
  UploadCloud,
  Trash2,
  Eye,
  Clock,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/upload';
import { InteriorQuotationPreviewModal } from '@/features/interior-new/components/crm/modals/InteriorQuotationPreviewModal';

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
  quotationRef: string;
  quotationTitle: string;
  quotationIndex: number;
  quoteAmount?: number | string;
  notes?: string;
  attachments: OrderAttachment[];
  sentAt?: string;
}

interface DispatchedTableRow {
  rowKey: string;
  id: string;
  quotationIndex: number;
  quotationTitle: string;
  quotationVersion: number;
  quotationStatus: string;
  quotationTotal: number;
  isPrimaryQuote: boolean;
  hasVendor: boolean;
  vendorId?: string;
  vendorName: string;
  vendorCategory?: string;
  vendorEmail?: string;
  sentAt?: string;
  attachments: OrderAttachment[];
}

interface Props {
  lead: any;
  currencySymbol: string;
  isReadOnly?: boolean;
  onRefresh: () => void;
  onOpenConfirmModal: () => void;
  onOpenQuotationModal: () => void;
}

export function InteriorConfirmedOrderStageView({
  lead,
  currencySymbol,
  isReadOnly = false,
  onRefresh,
  onOpenConfirmModal,
  onOpenQuotationModal,
}: Props) {
  const toast = useToast();
  const allQuotations: any[] = useMemo(() => lead?.quotations || [], [lead?.quotations]);

  // State of all vendor quotes grouped by quotation index
  const [vendorQuotesMap, setVendorQuotesMap] = useState<Record<number, VendorQuoteItem[]>>({});

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuoteFilter, setSelectedQuoteFilter] = useState<number | 'all'>('all');

  // File Uploading State
  const [uploadingVendorId, setUploadingVendorId] = useState<string | null>(null);
  const vendorFileInputRef = useRef<HTMLInputElement>(null);
  const [targetVendorForUpload, setTargetVendorForUpload] = useState<{ qIdx: number; vId: string } | null>(null);

  // General Attachment Uploader
  const [isUploadingGeneral, setIsUploadingGeneral] = useState(false);
  const generalFileInputRef = useRef<HTMLInputElement>(null);

  // Quotation Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewQuotationIndex, setPreviewQuotationIndex] = useState<number | null>(null);

  // Build Vendor Quotes Map for each quotation from lead data with robust normalization
  useEffect(() => {
    if (lead) {
      const initialMap: Record<number, VendorQuoteItem[]> = {};

      allQuotations.forEach((q: any, qIdx: number) => {
        const qTitle = q.title || `Quotation ${qIdx + 1}`;
        const vList: VendorQuoteItem[] = [];

        const isDuplicate = (name?: string, email?: string, id?: string) => {
          const normEmail = email?.trim().toLowerCase();
          const normName = name?.trim().toLowerCase();
          return vList.some((v) => {
            if (id && v.vendorId && v.vendorId === id) return true;
            if (normEmail && v.vendorEmail && v.vendorEmail.trim().toLowerCase() === normEmail) return true;
            if (normName && v.vendorName && v.vendorName.trim().toLowerCase() === normName) return true;
            return false;
          });
        };

        // 1. Existing confirmedOrder.vendorQuotations matching this quote
        if (Array.isArray(lead.confirmedOrder?.vendorQuotations)) {
          lead.confirmedOrder.vendorQuotations.forEach((vq: any) => {
            const matchesThisQuote =
              vq.quotationIndex === qIdx ||
              vq.quotationRef === qTitle ||
              vq.quotationRef === q.quotationNumber ||
              (allQuotations.length === 1 && !vq.quotationRef);

            if (matchesThisQuote && !isDuplicate(vq.vendorName, vq.vendorEmail, vq.vendorId)) {
              vList.push({
                id: vq.id || `vq-conf-${qIdx}-${Math.random().toString(36).slice(2, 7)}`,
                vendorId: vq.vendorId,
                vendorName: vq.vendorName || 'Vendor Partner',
                vendorCategory: vq.vendorCategory || 'Material Partner',
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

        // 2. Existing quotation vendorQuotes
        if (Array.isArray(q.vendorQuotes)) {
          q.vendorQuotes.forEach((vq: any) => {
            if (!isDuplicate(vq.vendorName, vq.vendorEmail, vq.vendorId)) {
              vList.push({
                id: vq.id || `vq-q-${qIdx}-${Math.random().toString(36).slice(2, 7)}`,
                vendorId: vq.vendorId,
                vendorName: vq.vendorName || 'Vendor Partner',
                vendorCategory: vq.vendorCategory || 'Material Partner',
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

        // 3. Sent vendors recorded in quotation phase
        if (Array.isArray(q.sentVendors)) {
          q.sentVendors.forEach((sv: any) => {
            if (!isDuplicate(sv.vendorName, sv.vendorEmail, sv.vendorId)) {
              vList.push({
                id: `vq-sent-${qIdx}-${Math.random().toString(36).slice(2, 7)}`,
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

        // 4. Quotation dispatches
        if (Array.isArray(q.dispatches)) {
          q.dispatches
            .filter((d: any) => d.recipientType === 'vendor')
            .forEach((d: any) => {
              if (!isDuplicate(d.recipientName, d.recipientEmail)) {
                vList.push({
                  id: `vq-disp-${qIdx}-${Math.random().toString(36).slice(2, 7)}`,
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
    }
  }, [lead, allQuotations]);

  // Helper to persist vendor quotes back to backend across all related collections
  const persistVendorQuotes = async (
    updatedMap: Record<number, VendorQuoteItem[]>,
    removedVendorInfo?: { qIdx: number; vendorEmail?: string; vendorName?: string; vendorId?: string }
  ) => {
    if (!lead || !lead._id) return;
    const allVendorQuotesFlat: VendorQuoteItem[] = [];
    Object.values(updatedMap).forEach((list) => {
      allVendorQuotesFlat.push(...list);
    });

    const updatedQuotations = allQuotations.map((q: any, qIdx: number) => {
      const vQuotesForQ = updatedMap[qIdx] || [];

      let updatedSentVendors = Array.isArray(q.sentVendors) ? [...q.sentVendors] : [];
      let updatedDispatches = Array.isArray(q.dispatches) ? [...q.dispatches] : [];

      if (removedVendorInfo && removedVendorInfo.qIdx === qIdx) {
        const { vendorEmail, vendorName, vendorId } = removedVendorInfo;
        const normEmail = vendorEmail?.trim().toLowerCase();
        const normName = vendorName?.trim().toLowerCase();

        updatedSentVendors = updatedSentVendors.filter((sv: any) => {
          const svEmail = sv.vendorEmail?.trim().toLowerCase();
          const svName = sv.vendorName?.trim().toLowerCase();
          if (vendorId && sv.vendorId && sv.vendorId === vendorId) return false;
          if (normEmail && svEmail && svEmail === normEmail) return false;
          if (normName && svName && svName === normName) return false;
          return true;
        });

        updatedDispatches = updatedDispatches.filter((d: any) => {
          if (d.recipientType !== 'vendor') return true;
          const dEmail = d.recipientEmail?.trim().toLowerCase();
          const dName = d.recipientName?.trim().toLowerCase();
          if (normEmail && dEmail && dEmail === normEmail) return false;
          if (normName && dName && dName === normName) return false;
          return true;
        });
      }

      return {
        ...q,
        vendorQuotes: vQuotesForQ,
        sentVendors: updatedSentVendors,
        dispatches: updatedDispatches,
      };
    });

    const updatedConfirmedOrder = lead.confirmedOrder
      ? {
          ...lead.confirmedOrder,
          vendorQuotations: allVendorQuotesFlat,
        }
      : undefined;

    try {
      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
        ...(updatedConfirmedOrder ? { confirmedOrder: updatedConfirmedOrder } : {}),
      });
      onRefresh();
    } catch (err: any) {
      console.error('Failed to sync vendor quotes:', err);
      toast.error('Failed to save vendor details');
    }
  };

  // Format Date & Time cleanly
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Trigger File Upload for a Specific Vendor
  const triggerVendorUpload = (qIdx: number, vId: string) => {
    setTargetVendorForUpload({ qIdx, vId });
    if (vendorFileInputRef.current) {
      vendorFileInputRef.current.value = '';
      vendorFileInputRef.current.click();
    }
  };

  // Handle Vendor Document Upload (Single File: PDF, Scan, Photo)
  const handleVendorFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!targetVendorForUpload) return;
    const { qIdx, vId } = targetVendorForUpload;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds 15MB limit.');
      return;
    }

    setUploadingVendorId(vId);

    try {
      const uploadedUrl = await uploadToCloudinary(file);
      if (!uploadedUrl) {
        throw new Error('Upload returned empty URL');
      }

      const newAttachment: OrderAttachment = {
        name: file.name,
        url: uploadedUrl,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const updatedMap = {
        ...vendorQuotesMap,
        [qIdx]: (vendorQuotesMap[qIdx] || []).map((item) => {
          if (item.id === vId) {
            return {
              ...item,
              attachments: [newAttachment], // Only 1 document allowed
            };
          }
          return item;
        }),
      };

      setVendorQuotesMap(updatedMap);
      await persistVendorQuotes(updatedMap);
      toast.success('Document uploaded successfully!');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('Failed to upload file to cloud storage. Please try again.');
    } finally {
      setUploadingVendorId(null);
      setTargetVendorForUpload(null);
      if (vendorFileInputRef.current) vendorFileInputRef.current.value = '';
    }
  };

  // Remove Attachment from a Vendor
  const handleRemoveVendorAttachment = async (qIdx: number, vId: string, attIdx: number) => {
    const updatedMap = {
      ...vendorQuotesMap,
      [qIdx]: (vendorQuotesMap[qIdx] || []).map((item) => {
        if (item.id === vId) {
          return {
            ...item,
            attachments: item.attachments.filter((_, i) => i !== attIdx),
          };
        }
        return item;
      }),
    };

    setVendorQuotesMap(updatedMap);
    await persistVendorQuotes(updatedMap);
    toast.success('Document removed');
  };

  // Remove a Vendor Row with clean cross-array clearing
  const handleRemoveVendorFromQuote = async (qIdx: number, vId: string) => {
    const itemToRemove = (vendorQuotesMap[qIdx] || []).find((item) => item.id === vId);
    const updatedMap = {
      ...vendorQuotesMap,
      [qIdx]: (vendorQuotesMap[qIdx] || []).filter((item) => item.id !== vId),
    };

    setVendorQuotesMap(updatedMap);
    await persistVendorQuotes(updatedMap, {
      qIdx,
      vendorEmail: itemToRemove?.vendorEmail,
      vendorName: itemToRemove?.vendorName,
      vendorId: itemToRemove?.vendorId,
    });
    toast.success('Vendor entry removed');
  };

  // General Attachments Upload
  const handleGeneralFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingGeneral(true);
    const newFiles: OrderAttachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`File "${file.name}" exceeds 15MB limit.`);
          continue;
        }

        const uploadedUrl = await uploadToCloudinary(file);
        if (!uploadedUrl) {
          throw new Error('Upload returned empty URL');
        }

        newFiles.push({
          name: file.name,
          url: uploadedUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }

      if (newFiles.length === 0) return;

      const existingAttachments = Array.isArray(lead.confirmedOrder?.attachments)
        ? lead.confirmedOrder.attachments
        : [];
      const updatedAttachments = [...existingAttachments, ...newFiles];

      await interiorCrmService.updateCustomer(lead._id, {
        confirmedOrder: {
          ...(lead.confirmedOrder || {}),
          attachments: updatedAttachments,
        },
      });

      toast.success(`${newFiles.length} file(s) uploaded`);
      onRefresh();
    } catch (err) {
      console.error('General file upload failed:', err);
      toast.error('Failed to upload general files to cloud storage.');
    } finally {
      setIsUploadingGeneral(false);
      if (generalFileInputRef.current) generalFileInputRef.current.value = '';
    }
  };

  const handleRemoveGeneralAttachment = async (idx: number) => {
    const existingAttachments = Array.isArray(lead.confirmedOrder?.attachments)
      ? lead.confirmedOrder.attachments
      : [];
    const updatedAttachments = existingAttachments.filter((_: any, i: number) => i !== idx);

    try {
      await interiorCrmService.updateCustomer(lead._id, {
        confirmedOrder: {
          ...(lead.confirmedOrder || {}),
          attachments: updatedAttachments,
        },
      });
      toast.success('Document removed');
      onRefresh();
    } catch {
      toast.error('Failed to remove document');
    }
  };

  // Flatten Table Rows: Combines Quotations and their respective Dispatched Vendors
  // ONLY include quotations that were dispatched to a vendor
  const tableRows: DispatchedTableRow[] = useMemo(() => {
    const rows: DispatchedTableRow[] = [];

    allQuotations.forEach((q: any, qIdx: number) => {
      const qTitle = q.title || `Quotation ${qIdx + 1}`;
      const qVersion = q.version || qIdx + 1;
      const qStatus = q.status || 'Draft';
      const qTotal = Number(q.grandTotal || q.totalAmount || 0);
      const isAccepted = qStatus === 'Accepted' || qStatus === 'Approved';
      const isPrimary =
        lead.confirmedOrder?.quotationIndex === qIdx || (isAccepted && !lead.confirmedOrder);
      const vendorList = vendorQuotesMap[qIdx] || [];

      if (vendorList.length > 0) {
        vendorList.forEach((v, vIdx) => {
          rows.push({
            rowKey: `${qIdx}-${v.id || vIdx}`,
            id: v.id,
            quotationIndex: qIdx,
            quotationTitle: qTitle,
            quotationVersion: qVersion,
            quotationStatus: qStatus,
            quotationTotal: qTotal,
            isPrimaryQuote: isPrimary,
            hasVendor: true,
            vendorId: v.vendorId,
            vendorName: v.vendorName || 'Vendor Partner',
            vendorCategory: v.vendorCategory,
            vendorEmail: v.vendorEmail,
            sentAt: v.sentAt,
            attachments: v.attachments || [],
          });
        });
      }
    });

    return rows;
  }, [allQuotations, vendorQuotesMap, lead.confirmedOrder]);

  // Filter Table Rows
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      if (selectedQuoteFilter !== 'all' && row.quotationIndex !== selectedQuoteFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuote = row.quotationTitle.toLowerCase().includes(query);
        const matchesVendor = row.vendorName.toLowerCase().includes(query);
        const matchesCategory = (row.vendorCategory || '').toLowerCase().includes(query);
        return matchesQuote || matchesVendor || matchesCategory;
      }
      return true;
    });
  }, [tableRows, selectedQuoteFilter, searchQuery]);

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={vendorFileInputRef}
        onChange={handleVendorFileUpload}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
      />
      <input
        type="file"
        multiple
        ref={generalFileInputRef}
        onChange={handleGeneralFileUpload}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
      />

      {/* 1. CLEAN TABLE CARD CONTAINER */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        {/* Table Top Bar: Search & Status Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[220px] sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quote or vendor..."
                className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter by Dispatched Quotation (Pills) */}
            {(() => {
              const uniqueDispatchedQuoteIndices = Array.from(
                new Set(tableRows.map((r) => r.quotationIndex))
              );
              if (uniqueDispatchedQuoteIndices.length <= 1) return null;

              return (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedQuoteFilter('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                      selectedQuoteFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                  >
                    All Quotes
                  </button>
                  {uniqueDispatchedQuoteIndices.map((idx) => {
                    const q = allQuotations[idx];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedQuoteFilter(idx)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                          selectedQuoteFilter === idx
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        )}
                      >
                        {q?.title || `Q${idx + 1}`}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900 font-bold">{filteredRows.length}</strong> dispatched quotation{filteredRows.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Professional Light Theme Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 select-none">
                <th className="py-3 px-3.5 text-center w-12 font-bold text-slate-400">#</th>
                <th className="py-3 px-4 min-w-[180px]">Quotation Name</th>
                <th className="py-3 px-4 min-w-[200px]">Dispatched Vendor</th>
                <th className="py-3 px-4 min-w-[170px]">Sent Date & Time</th>
                <th className="py-3 px-4 min-w-[220px]">Vendor Documents</th>
                <th className="py-3 px-3.5 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    <Receipt size={28} className="mx-auto text-slate-300 mb-2" />
                    {tableRows.length === 0 ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800 text-sm">
                          No Quotations Dispatched to Vendors Yet
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Quotations will automatically appear here as soon as they are sent to vendor partners.
                        </p>
                      </div>
                    ) : (
                      'No vendor dispatches match your search filter.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isUploadingThis = uploadingVendorId === row.id;

                  return (
                    <tr
                      key={row.rowKey}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* # Index */}
                      <td className="py-3.5 px-3.5 text-center font-mono text-xs text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Quotation Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {row.quotationTitle}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            v{row.quotationVersion}
                          </span>
                          {row.isPrimaryQuote && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" /> Primary
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dispatched Vendor */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">
                            {row.vendorName}
                          </p>
                          {row.vendorEmail && (
                            <p className="text-[11px] text-slate-500 font-normal truncate max-w-[200px]" title={row.vendorEmail}>
                              {row.vendorEmail}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Sent Date & Time */}
                      <td className="py-3.5 px-4">
                        {row.sentAt ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <Clock size={13} className="text-slate-400 shrink-0" />
                            <span>{formatDateTime(row.sentAt)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Vendor Documents */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap max-w-sm">
                          {row.attachments.map((doc, dIdx) => (
                            <div
                              key={dIdx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium transition-colors"
                            >
                              <FileText size={12} className="text-blue-600 shrink-0" />
                              <span className="max-w-[100px] truncate font-medium" title={doc.name}>
                                {doc.name}
                              </span>
                              {doc.url && (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-400 hover:text-blue-600 p-0.5 transition-colors"
                                  title="Preview file"
                                >
                                  <Eye size={12} />
                                </a>
                              )}
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveVendorAttachment(row.quotationIndex, row.id, dIdx)
                                  }
                                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
                                  title="Remove document"
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Show + Upload button only if no document is uploaded yet */}
                          {row.attachments.length === 0 && !isReadOnly && (
                            <button
                              type="button"
                              onClick={() => triggerVendorUpload(row.quotationIndex, row.id)}
                              disabled={isUploadingThis}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 rounded-md text-xs font-semibold transition-all shadow-2xs cursor-pointer shrink-0 active:scale-95"
                              title="Upload vendor PDF / photo document"
                            >
                              <UploadCloud size={12} className="text-slate-500" />
                              <span>{isUploadingThis ? 'Uploading...' : '+ Upload'}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewQuotationIndex(row.quotationIndex);
                              setIsPreviewModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                            title={`View full ${row.quotationTitle}`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          {row.hasVendor && !isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVendorFromQuote(row.quotationIndex, row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete vendor dispatch row"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. GENERAL CLIENT CONTRACT / WASTE ATTACHMENTS */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Paperclip size={14} className="text-blue-600" />
              <span>General Client Signed Contract & Waste Calculation Files</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Signed client proposals, floor plan execution attachments, or waste sheets.
            </p>
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => generalFileInputRef.current?.click()}
              disabled={isUploadingGeneral}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <UploadCloud size={13} className="text-slate-500" />
              {isUploadingGeneral ? 'Uploading...' : 'Upload General Docs'}
            </button>
          )}
        </div>

        {Array.isArray(lead.confirmedOrder?.attachments) && lead.confirmedOrder.attachments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {lead.confirmedOrder.attachments.map((file: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 flex items-center justify-between gap-2 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText size={13} />
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
                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      title="Preview"
                    >
                      <Eye size={13} />
                    </a>
                  )}
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGeneralAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
            No general signed contract or waste files attached yet.
          </div>
        )}
      </div>

      {/* MODAL: PREVIEW QUOTATION */}
      {previewQuotationIndex !== null && (
        <InteriorQuotationPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setPreviewQuotationIndex(null);
          }}
          lead={lead}
          quotationIndex={previewQuotationIndex}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
