'use client';
import { tr } from '@/i18n';

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
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

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
  /** Project tab: save through the project Confirm Order endpoint instead of the CRM lead. */
  saveUpdates?: (updates: Record<string, any>) => Promise<unknown>;
  /** Project tab: editing follows Confirm Order → Update (defaults to CRM Quotations → Update). */
  canEdit?: boolean;
}

export function InteriorConfirmedOrderStageView({
  lead,
  currencySymbol,
  isReadOnly = false,
  onRefresh,
  onOpenConfirmModal,
  onOpenQuotationModal,
  saveUpdates,
  canEdit,
}: Props) {
  const toast = useToast();
  const { hasPermission: canDo } = usePermissions();
  const canEditOrder = canEdit ?? canDo('crm_quotations', 'update');
  const leadId = lead?._id || lead?.id || '';
  const saveLeadUpdates = (updates: Record<string, any>) =>
    saveUpdates ? saveUpdates(updates) : interiorCrmService.updateCustomer(leadId, updates);
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
      await saveLeadUpdates({
        quotations: updatedQuotations,
        ...(updatedConfirmedOrder ? { confirmedOrder: updatedConfirmedOrder } : {}),
      });
      onRefresh();
    } catch (err: any) {
      console.error('Failed to sync vendor quotes:', err);
      toast.error(tr("Failed to save vendor details"));
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
      toast.error(tr("File size exceeds 15MB limit."));
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
      toast.success(tr("Document uploaded successfully!"));
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error(tr("Failed to upload file to cloud storage. Please try again."));
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
    toast.success(tr("Document removed"));
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
    toast.success(tr("Vendor entry removed"));
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
          toast.error(tr("File \"{{name}}\" exceeds 15MB limit.", { name: file.name }));
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

      await saveLeadUpdates({
        confirmedOrder: {
          ...(lead.confirmedOrder || {}),
          attachments: updatedAttachments,
        },
      });

      toast.success(tr("{{newFilesCount}} file(s) uploaded", { newFilesCount: newFiles.length }));
      onRefresh();
    } catch (err) {
      console.error('General file upload failed:', err);
      toast.error(tr("Failed to upload general files to cloud storage."));
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
      await saveLeadUpdates({
        confirmedOrder: {
          ...(lead.confirmedOrder || {}),
          attachments: updatedAttachments,
        },
      });
      toast.success(tr("Document removed"));
      onRefresh();
    } catch {
      toast.error(tr("Failed to remove document"));
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

      {/* 1. THE CONFIRMED ORDER (one per lead / project) */}
      {lead?.confirmedOrder && (() => {
        const co = lead.confirmedOrder;
        const q = typeof co.quotationIndex === 'number' ? allQuotations[co.quotationIndex] : null;
        const agreed = Number(co.agreedAmount || 0);
        const advance = Number(co.advanceReceived || 0);
        const money = (n: number) =>
          `${currencySymbol} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        const stats = [
          {
            label: tr('Accepted quotation'),
            value: q ? tr(q.title || `Quotation ${co.quotationIndex + 1}`) : '—',
            sub: q ? `v${q.version || co.quotationIndex + 1}` : undefined,
          },
          { label: tr('Agreed amount'), value: agreed ? money(agreed) : '—' },
          { label: tr('Advance received'), value: advance ? money(advance) : '—' },
          { label: tr('Balance due'), value: agreed ? money(Math.max(agreed - advance, 0)) : '—' },
        ];
        return (
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Receipt size={16} className="text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700">{tr('Confirmed Order')}</p>
                <p className="text-sm font-bold text-slate-900 truncate" title={co.title}>{tr(co.title || 'Confirmed Order')}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {co.orderNumber && (
                  <span className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-[0.6875rem] font-mono font-semibold text-slate-700">
                    {co.orderNumber}
                  </span>
                )}
                {co.confirmedAt && (
                  <span className="inline-flex items-center gap-1 text-[0.6875rem] text-slate-500 font-medium">
                    <Clock size={12} className="text-slate-400" />
                    {formatDateTime(co.confirmedAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-100">
              {stats.map((s) => (
                <div key={s.label} className="bg-white px-4 py-3 min-w-0">
                  <p className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900 truncate" title={s.value}>
                    {s.value}
                    {s.sub && <span className="ms-1.5 align-middle px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-slate-100 text-slate-600 border border-slate-200">{s.sub}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 2. VENDORS — grouped under the quotation they were sent */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        {/* Top bar: title, search, quotation filter */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <p className="text-sm font-bold text-slate-900 shrink-0">
              {tr('Vendors on this order')}
              <span className="ms-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[0.6875rem] font-bold align-middle">{filteredRows.length}</span>
            </p>

            {/* Filter by quotation (only when vendors span several quotations) */}
            {(() => {
              const uniqueDispatchedQuoteIndices = Array.from(new Set(tableRows.map((r) => r.quotationIndex)));
              if (uniqueDispatchedQuoteIndices.length <= 1) return null;
              return (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedQuoteFilter('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                      selectedQuoteFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    )}
                  >
                    {tr("All Quotes")}
                  </button>
                  {uniqueDispatchedQuoteIndices.map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedQuoteFilter(idx)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                        selectedQuoteFilter === idx ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      )}
                    >
                      {`v${allQuotations[idx]?.version || idx + 1}`}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr("Search quote or vendor...")}
              className="w-full ps-8.5 pe-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <Receipt size={28} className="mx-auto text-slate-300 mb-2" />
            {tableRows.length === 0 ? (
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 text-sm">{tr("No Quotations Dispatched to Vendors Yet")}</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {tr("Quotations will automatically appear here as soon as they are sent to vendor partners.")}
                </p>
              </div>
            ) : (
              tr("No vendor dispatches match your search filter.")
            )}
          </div>
        ) : (
          Array.from(new Set(filteredRows.map((r) => r.quotationIndex))).map((qIdx) => {
            const groupRows = filteredRows.filter((r) => r.quotationIndex === qIdx);
            const head = groupRows[0];
            return (
              <div key={qIdx} className="border-b last:border-b-0 border-slate-200">
                {/* Quotation header — shown once */}
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center gap-2">
                  <FileText size={14} className="text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-xs sm:text-[0.8125rem] min-w-0 truncate" title={head.quotationTitle}>
                    {tr(head.quotationTitle)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-white text-slate-700 border border-slate-200">
                    v{head.quotationVersion}
                  </span>
                  {head.isPrimaryQuote && (
                    <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-600" />{tr("Accepted")}
                    </span>
                  )}
                  <div className="ms-auto flex items-center gap-3">
                    {head.quotationTotal > 0 && (
                      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        {currencySymbol} {head.quotationTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewQuotationIndex(qIdx);
                        setIsPreviewModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                      title={tr("View full {{quotationTitle}}", { quotationTitle: head.quotationTitle })}
                    >
                      <Eye size={13} />
                      <span>{tr("View quotation")}</span>
                    </button>
                  </div>
                </div>

                {/* One row per vendor */}
                <div className="divide-y divide-slate-100">
                  {groupRows.map((row) => {
                    const isUploadingThis = uploadingVendorId === row.id;
                    return (
                      <div
                        key={row.rowKey}
                        className="px-4 py-3 grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_2rem] gap-x-4 gap-y-2 items-center hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Vendor */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                            {(row.vendorName || '?').trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-[0.8125rem] truncate" title={row.vendorName}>{tr(row.vendorName)}</p>
                            {row.vendorEmail && (
                              <p className="text-[0.6875rem] text-slate-500 truncate" title={row.vendorEmail}>{row.vendorEmail}</p>
                            )}
                          </div>
                        </div>

                        {/* Sent */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium min-w-0">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{row.sentAt ? formatDateTime(row.sentAt) : '—'}</span>
                        </div>

                        {/* Vendor documents */}
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {row.attachments.map((doc, dIdx) => (
                            <div
                              key={dIdx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium transition-colors max-w-full"
                            >
                              <FileText size={12} className="text-blue-600 shrink-0" />
                              <span className="max-w-[8rem] truncate" title={doc.name}>{doc.name}</span>
                              {doc.url && (
                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600 p-0.5 transition-colors" title={tr("Preview file")}>
                                  <Eye size={12} />
                                </a>
                              )}
                              {!isReadOnly && canEditOrder && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVendorAttachment(row.quotationIndex, row.id, dIdx)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
                                  title={tr("Remove document")}
                                >
                                  <X size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                          {row.attachments.length === 0 && (
                            !isReadOnly && canEditOrder ? (
                              <button
                                type="button"
                                onClick={() => triggerVendorUpload(row.quotationIndex, row.id)}
                                disabled={isUploadingThis}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-dashed border-slate-300 hover:border-slate-400 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0"
                                title={tr("Upload vendor PDF / photo document")}
                              >
                                <UploadCloud size={12} className="text-slate-500" />
                                <span>{isUploadingThis ? tr("Uploading...") : tr("+ Upload")}</span>
                              </button>
                            ) : (
                              <span className="text-[0.6875rem] text-slate-400">{tr("No documents")}</span>
                            )
                          )}
                        </div>

                        {/* Remove vendor */}
                        <div className="flex md:justify-end">
                          {row.hasVendor && !isReadOnly && canEditOrder && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVendorFromQuote(row.quotationIndex, row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={tr("Delete vendor dispatch row")}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. GENERAL CLIENT CONTRACT / WASTE ATTACHMENTS */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Paperclip size={14} className="text-blue-600" />
              <span>{tr("General Client Signed Contract & Waste Calculation Files")}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {tr("Signed client proposals, floor plan execution attachments, or waste sheets.")}
            </p>
          </div>

          {!isReadOnly && (
            (canEditOrder) && (
              <button
                type="button"
                onClick={() => generalFileInputRef.current?.click()}
                disabled={isUploadingGeneral}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              >
                <UploadCloud size={13} className="text-slate-500" />
                {isUploadingGeneral ? tr("Uploading...") : tr("Upload General Docs")}
              </button>
            )
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
                      {tr(file.name)}
                    </p>
                    {file.size && (
                      <span className="text-[0.625rem] text-slate-400">
                        {(file.size / 1024).toFixed(0)}{tr(" KB")}
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
                      title={tr("Preview")}
                    >
                      <Eye size={13} />
                    </a>
                  )}
                  {!isReadOnly && (
                    (canEditOrder) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGeneralAttachment(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                        title={tr("Remove")}
                      >
                        <Trash2 size={13} />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400">
            {tr("No general signed contract or waste files attached yet.")}
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
