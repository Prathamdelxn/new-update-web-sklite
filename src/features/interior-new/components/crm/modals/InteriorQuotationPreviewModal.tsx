'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Quotation Detailed Split-View Modal
// Left Side: A4 Quotation Document & Line-item Scope of Work
// Right Side: Dynamic Integrated Sidebar (Overview / Inline Vendor Dispatch / Inline Client Send)
// =============================================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Printer,
  Mail,
  CheckCircle2,
  XCircle,
  Send,
  User,
  Building2,
  History,
  RotateCcw,
  ArrowLeft,
  Search,
  Check,
  Plus,
  Phone,
  Tag,
  Trash2,
  Building,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { useCurrency } from '@/hooks/useCurrency';
import { QuotationPreview } from '@/components/crm/QuotationPreview';
import { cn } from '@/lib/utils';

interface InteriorQuotationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  quotationIndex: number | null;
  onSuccess: () => void;
}

type SideViewMode = 'overview' | 'send_vendor' | 'send_client';

export function InteriorQuotationPreviewModal({
  isOpen,
  onClose,
  lead,
  quotationIndex,
  onSuccess,
}: InteriorQuotationPreviewModalProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const { formatExactCurrency } = useCurrency();

  // Navigation state inside the right sidebar
  const [sideView, setSideView] = useState<SideViewMode>('overview');

  // Status & Activity state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Vendor Dispatch State
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [isManualVendor, setIsManualVendor] = useState(false);
  const [manualVendorEmail, setManualVendorEmail] = useState('');
  const [manualVendorName, setManualVendorName] = useState('');
  const [vendorCustomSubject, setVendorCustomSubject] = useState('');
  const [vendorCustomMessage, setVendorCustomMessage] = useState('');
  const [isSendingVendor, setIsSendingVendor] = useState(false);

  // Client Send State
  const [clientRecipientEmail, setClientRecipientEmail] = useState('');
  const [clientAdditionalNote, setClientAdditionalNote] = useState('');
  const [isSendingClient, setIsSendingClient] = useState(false);

  // Local immediate dispatches state
  const [localDispatches, setLocalDispatches] = useState<any[]>([]);

  const [isDeletingQuotation, setIsDeletingQuotation] = useState(false);

  const quote = quotationIndex !== null && lead?.quotations?.[quotationIndex] ? lead.quotations[quotationIndex] : null;
  const qtnNumber = quote?.quotationNumber || `QTN-V${quote?.version || (quotationIndex !== null ? quotationIndex + 1 : 1)}`;
  const quoteTitle = quote?.title || `Quotation Option ${quotationIndex !== null ? quotationIndex + 1 : 1}`;
  const status = quote?.status || 'Generated';
  const grandTotal = Number(quote?.grandTotal || quote?.totalAmount || 0);
  const itemsCount = quote?.items?.length || 0;
  const isConverted =
    lead?.status === 'Won' ||
    lead?.status === 'Converted' ||
    lead?.status === 'Lost' ||
    Boolean(lead?.linkedProject);

  // Fetch activities for dispatch history
  const fetchActivities = useCallback(async () => {
    const leadId = lead?._id || lead?.id;
    if (!leadId) return;
    try {
      setIsLoadingActivities(true);
      const res = await interiorCrmService.getActivities(leadId);
      const list = Array.isArray(res) ? res : res?.data || [];
      setActivities(list);
    } catch (err) {
      console.error('Failed to load lead activities for quotation', err);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [lead?._id, lead?.id]);

  // Fetch vendors list
  const fetchVendors = useCallback(async () => {
    try {
      setIsLoadingVendors(true);
      const res: any = await interiorCrmService.getVendors();
      const list = Array.isArray(res) ? res : res?.data || [];
      setVendorsList(list);
    } catch (err) {
      console.error('Failed to load vendors', err);
      setVendorsList([]);
    } finally {
      setIsLoadingVendors(false);
    }
  }, []);

  useEffect(() => {
    const leadId = lead?._id || lead?.id;
    if (isOpen && leadId) {
      fetchActivities();
      setSideView('overview');
      setClientRecipientEmail(lead?.email || '');
      setClientAdditionalNote('');
      setLocalDispatches([]);
    }
  }, [isOpen, lead?._id, lead?.id, lead?.email, fetchActivities, quotationIndex]);

  // Dispatches recorded directly on THIS specific quotation
  const dispatchHistory = useMemo(() => {
    const rawItems: any[] = [];

    // 1. Locally added dispatches in current session
    localDispatches.forEach((ld) => rawItems.push(ld));

    // 2. Direct dispatches recorded on the quote itself
    if (Array.isArray(quote?.dispatches)) {
      quote.dispatches.forEach((d: any, idx: number) => {
        rawItems.push({
          _id: d._id || d.id || `direct-disp-${idx}`,
          type: 'email',
          recipientType: d.recipientType || (d.vendorName ? 'vendor' : 'customer'),
          recipientName: d.recipientName || d.vendorName || d.clientName || (d.recipientType === 'vendor' ? 'Vendor Partner' : lead?.name || 'Client'),
          recipientEmail: d.recipientEmail || d.vendorEmail || d.clientEmail || (d.recipientType === 'vendor' ? '' : lead?.email || ''),
          quotationTitle: quoteTitle,
          quotationNumber: qtnNumber,
          remarks: d.remarks || `Sent Quotation "${quoteTitle}" (${qtnNumber}) to ${d.recipientType === 'vendor' ? 'Vendor' : 'Client'} "${d.recipientName || d.vendorName || lead?.name}" (${d.recipientEmail || d.vendorEmail || lead?.email})`,
          createdAt: d.sentAt || d.createdAt || new Date().toISOString(),
        });
      });
    }

    // 3. Direct sentToClient recorded on quote
    if (quote?.sentToClient) {
      const stc = quote.sentToClient;
      rawItems.push({
        _id: `sent-client-${stc.sentAt || '1'}`,
        type: 'email',
        recipientType: 'customer',
        recipientName: stc.clientName || lead?.name || 'Client',
        recipientEmail: stc.clientEmail || lead?.email || '',
        quotationTitle: quoteTitle,
        quotationNumber: qtnNumber,
        remarks: `Sent Quotation "${quoteTitle}" (${qtnNumber}) to Client "${stc.clientName || lead?.name}" (${stc.clientEmail || lead?.email})`,
        createdAt: stc.sentAt || quote.updatedAt || new Date().toISOString(),
      });
    }

    // 4. Direct sentVendors recorded on quote
    if (Array.isArray(quote?.sentVendors)) {
      quote.sentVendors.forEach((sv: any, idx: number) => {
        rawItems.push({
          _id: sv._id || sv.id || `sent-v-${idx}`,
          type: 'email',
          recipientType: 'vendor',
          recipientName: sv.vendorName || 'Vendor Partner',
          recipientEmail: sv.vendorEmail || '',
          quotationTitle: quoteTitle,
          quotationNumber: qtnNumber,
          remarks: sv.remarks || `Sent Quotation "${quoteTitle}" (${qtnNumber}) to Vendor "${sv.vendorName}" (${sv.vendorEmail})`,
          createdAt: sv.sentAt || sv.createdAt || new Date().toISOString(),
        });
      });
    }

    // 5. Relevant activities belonging strictly to THIS quotation
    if (Array.isArray(activities)) {
      const quoteCreatedTime = quote?.createdAt ? new Date(quote.createdAt).getTime() - 120000 : 0;
      activities.forEach((act: any) => {
        const actTime = new Date(act.createdAt || act.completedDate || 0).getTime();
        if (quoteCreatedTime > 0 && actTime < quoteCreatedTime) return;

        const rem = act.remarks || '';
        const isEmailAct = act.type === 'Email' || act.type === 'Quotation' || rem.toLowerCase().includes('emailed quotation') || rem.toLowerCase().includes('sent quotation');
        const matchesThisQuote = rem.includes(quoteTitle) || rem.includes(qtnNumber) || (lead?.quotations?.length === 1 && isEmailAct);

        if (isEmailAct && matchesThisQuote) {
          const isVendor = rem.toLowerCase().includes('vendor');
          const emailMatch = rem.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const recEmail = emailMatch ? emailMatch[0] : (isVendor ? '' : lead?.email || '');

          rawItems.push({
            _id: act._id || act.id,
            type: 'email',
            recipientType: isVendor ? 'vendor' : 'customer',
            recipientName: isVendor ? 'Vendor Partner' : lead?.name || 'Client',
            recipientEmail: recEmail,
            quotationTitle: quoteTitle,
            quotationNumber: qtnNumber,
            remarks: rem,
            createdAt: act.createdAt || act.completedDate || new Date().toISOString(),
          });
        }
      });
    }

    // Deduplicate by remarks or matching email and similar timestamp
    const combined: any[] = [];
    rawItems.forEach((item) => {
      const isDuplicate = combined.some(
        (c) =>
          c.remarks === item.remarks ||
          (c.recipientEmail && c.recipientEmail === item.recipientEmail && c.createdAt && item.createdAt && Math.abs(new Date(c.createdAt).getTime() - new Date(item.createdAt).getTime()) < 5000)
      );
      if (!isDuplicate) {
        combined.push(item);
      }
    });

    return combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [activities, lead?.email, lead?.name, lead?.quotations?.length, localDispatches, qtnNumber, quote?.createdAt, quote?.dispatches, quote?.sentToClient, quote?.sentVendors, quote?.updatedAt, quoteTitle]);

  // Set of vendor IDs or emails that have already received this quotation
  const sentVendorIds = useMemo(() => {
    const sent = new Set<string>();
    dispatchHistory.forEach((item) => {
      const remarks = (item.remarks || '').toLowerCase();
      const recEmail = (item.recipientEmail || '').toLowerCase();
      const recName = (item.recipientName || '').toLowerCase();
      vendorsList.forEach((v) => {
        const vId = String(v._id || v.id || '');
        const vEmail = (v.email || v.contactEmail || '').toLowerCase();
        const vName = (v.name || v.companyName || '').toLowerCase();
        if (
          (vEmail && (remarks.includes(vEmail) || recEmail.includes(vEmail))) ||
          (vName && (remarks.includes(vName) || recName.includes(vName)))
        ) {
          if (vId) sent.add(vId);
        }
      });
    });
    return sent;
  }, [dispatchHistory, vendorsList]);

  // Categories list for vendor filters
  const vendorCategories = useMemo(() => {
    const cats = new Set<string>();
    vendorsList.forEach((v) => {
      const cat = v.vendorCategory || v.category;
      if (cat) cats.add(cat);
    });
    return ['All', ...Array.from(cats)];
  }, [vendorsList]);

  // Filtered vendors list
  const filteredVendors = useMemo(() => {
    return vendorsList.filter((v) => {
      const name = (v.name || v.companyName || '').toLowerCase();
      const contact = (v.contactPerson || '').toLowerCase();
      const email = (v.email || v.contactEmail || '').toLowerCase();
      const cat = (v.vendorCategory || v.category || 'Other').toLowerCase();
      const q = vendorSearchQuery.toLowerCase().trim();

      const matchesQuery = !q || name.includes(q) || contact.includes(q) || email.includes(q) || cat.includes(q);
      const matchesCat =
        selectedCategoryFilter === 'All' ||
        (v.vendorCategory || v.category || 'Other') === selectedCategoryFilter;

      return matchesQuery && matchesCat;
    });
  }, [vendorsList, vendorSearchQuery, selectedCategoryFilter]);

  // Open inline vendor send view
  const openVendorView = () => {
    if (vendorsList.length === 0) {
      fetchVendors();
    }
    setSelectedVendorId('');
    setManualVendorEmail('');
    setManualVendorName('');
    setIsManualVendor(false);
    const customerName = lead?.name || 'Customer';
    setVendorCustomSubject(`RFQ / Material Quotation Reference (${qtnNumber}) — ${customerName}`);
    setVendorCustomMessage(
      `Dear Vendor Partner,\n\nPlease find attached the quotation line items and specifications (${qtnNumber}) for project "${customerName}".\n\n• Scope: ${itemsCount} items\n• Reference Total: ${formatExactCurrency(grandTotal)}\n\nKindly review and share your availability and proposal at the earliest.`
    );
    setSideView('send_vendor');
  };

  // Open inline client send view
  const openClientView = () => {
    setClientRecipientEmail(lead?.email || '');
    setClientAdditionalNote('');
    setSideView('send_client');
  };

  // Status update handler (1-step approval)
  const handleStatusUpdate = async (newStatus: string) => {
    if (!quote || quotationIndex === null || !lead?.quotations) return;
    try {
      setIsUpdatingStatus(true);
      const updatedQuotations = [...lead.quotations];
      updatedQuotations[quotationIndex] = { ...quote, status: newStatus };

      let nextLeadStatus = lead.status;
      if (newStatus === 'Accepted' || newStatus === 'Approved') {
        nextLeadStatus = 'Booking Pending';
      } else if (newStatus === 'Rejected') {
        nextLeadStatus = 'Under Quotation';
      } else if (newStatus === 'Sent') {
        nextLeadStatus = 'Under Quotation';
      }

      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
        status: nextLeadStatus,
      });

      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Quotation ${qtnNumber} (${quoteTitle}) marked as "${newStatus}"`,
      });

      toast.success(`Quotation status updated to "${newStatus}".`);
      onSuccess();
      fetchActivities();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update quotation status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete Entire Quotation handler
  const handleDeleteQuotation = async () => {
    if (quotationIndex === null || !lead?.quotations || !quote) return;
    const ok = await confirm({
      title: `Delete Quotation?`,
      message: `Are you sure you want to delete "${quoteTitle}" (${qtnNumber}) with ${itemsCount} items (${formatExactCurrency(grandTotal)})? This action cannot be undone.`,
      confirmText: 'Delete Quotation',
      type: 'danger',
    });
    if (!ok) return;

    try {
      setIsDeletingQuotation(true);
      const updatedQuotations = lead.quotations.filter((_: any, i: number) => i !== quotationIndex);

      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
      });

      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Deleted Quotation: ${quoteTitle} (${qtnNumber})`,
      });

      toast.success(`Quotation "${quoteTitle}" deleted successfully.`);
      onClose();
      onSuccess();
    } catch (err: any) {
      console.error('Failed to delete quotation:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete quotation');
    } finally {
      setIsDeletingQuotation(false);
    }
  };

  // Send to Vendor handler
  const handleSendToVendor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let emailToSend = '';
    let nameToSend = '';

    if (isManualVendor) {
      if (!manualVendorEmail.trim() || !manualVendorEmail.includes('@')) {
        toast.error('Please enter a valid vendor email address.');
        return;
      }
      emailToSend = manualVendorEmail.trim();
      nameToSend = manualVendorName.trim() || 'Vendor Partner';
    } else {
      const selectedVendor = vendorsList.find((v) => (v._id || v.id) === selectedVendorId);
      if (!selectedVendor) {
        toast.error('Please select a vendor from the list.');
        return;
      }
      emailToSend = (selectedVendor.email || selectedVendor.contactEmail || '').trim();
      nameToSend = (selectedVendor.name || selectedVendor.companyName || '').trim();
      if (!emailToSend || !emailToSend.includes('@')) {
        toast.error(`Selected vendor "${nameToSend}" does not have a valid email address.`);
        return;
      }
    }

    setIsSendingVendor(true);
    try {
      await interiorCrmService.sendQuotationEmail(lead._id, {
        quotation: quote,
        recipientEmail: emailToSend,
        recipientType: 'vendor',
        recipientName: nameToSend,
        customSubject: vendorCustomSubject.trim() || undefined,
        customMessage: vendorCustomMessage.trim() || undefined,
        quotationIndex: typeof quotationIndex === 'number' ? quotationIndex : undefined,
      });

      // Update local quote state immediately for instant feedback
      const newVendorDispatch = {
        _id: `disp-vendor-${Date.now()}`,
        type: 'email',
        recipientType: 'vendor',
        recipientName: nameToSend,
        recipientEmail: emailToSend,
        quotationTitle: quoteTitle,
        quotationNumber: qtnNumber,
        sentAt: new Date().toISOString(),
        remarks: `Sent Quotation "${quoteTitle}" (${qtnNumber}) to Vendor "${nameToSend}" (${emailToSend})`,
        createdAt: new Date().toISOString(),
      };
      setLocalDispatches((prev) => [newVendorDispatch, ...prev]);

      if (quote) {
        if (!Array.isArray(quote.dispatches)) quote.dispatches = [];
        quote.dispatches.unshift(newVendorDispatch);

        const newSentVendor = {
          vendorId: selectedVendorId || undefined,
          vendorName: nameToSend,
          vendorEmail: emailToSend,
          quotationTitle: quoteTitle,
          quotationNumber: qtnNumber,
          sentAt: new Date().toISOString(),
        };
        if (!Array.isArray(quote.sentVendors)) quote.sentVendors = [];
        quote.sentVendors.unshift(newSentVendor);
      }

      toast.success(`Quotation copy dispatched to ${nameToSend} (${emailToSend})!`);
      setSelectedVendorId('');
      setManualVendorEmail('');
      setManualVendorName('');
      fetchActivities();
      onSuccess();
      setSideView('overview');
    } catch (err: any) {
      console.error('Failed to send quotation to vendor:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send quotation to vendor.');
    } finally {
      setIsSendingVendor(false);
    }
  };

  // Send to Client handler
  const handleSendToClient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailToSend = clientRecipientEmail.trim();
    if (!emailToSend || !emailToSend.includes('@')) {
      toast.error('Please enter a valid client email address.');
      return;
    }

    setIsSendingClient(true);
    try {
      await interiorCrmService.sendQuotationEmail(lead._id, {
        quotation: quote,
        recipientEmail: emailToSend,
        recipientType: 'customer',
        recipientName: lead.name,
        customMessage: clientAdditionalNote.trim() || undefined,
        quotationIndex: typeof quotationIndex === 'number' ? quotationIndex : undefined,
      });

      const newClientDispatch = {
        _id: `disp-client-${Date.now()}`,
        type: 'email',
        recipientType: 'customer',
        recipientName: lead.name,
        recipientEmail: emailToSend,
        quotationTitle: quoteTitle,
        quotationNumber: qtnNumber,
        sentAt: new Date().toISOString(),
        remarks: `Emailed Quotation "${quoteTitle}" (${qtnNumber}) to client ${emailToSend} for approval`,
        createdAt: new Date().toISOString(),
      };
      setLocalDispatches((prev) => [newClientDispatch, ...prev]);

      if (quote) {
        quote.status = 'Sent';
        if (!Array.isArray(quote.dispatches)) quote.dispatches = [];
        quote.dispatches.unshift(newClientDispatch);
      }

      toast.success(`Quotation sent to ${lead.name} (${emailToSend})! Status updated to 'Sent'.`);
      fetchActivities();
      onSuccess();
      setSideView('overview');
    } catch (err: any) {
      console.error('Failed to send quotation to client:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send quotation to client.');
    } finally {
      setIsSendingClient(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadgeConfig = (st: string) => {
    switch (st) {
      case 'Accepted':
      case 'Approved':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Client Approved',
        };
      case 'Rejected':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Rejected',
        };
      case 'Sent':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Sent to Client / Pending Approval',
        };
      case 'Generated':
      case 'Draft':
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Generated / Draft',
        };
    }
  };

  const isSentToClient =
    status === 'Sent' ||
    status === 'Accepted' ||
    status === 'Approved' ||
    Boolean(quote?.sentToClient) ||
    Boolean(
      Array.isArray(quote?.dispatches) &&
        quote.dispatches.some(
          (d: any) =>
            d.recipientType === 'customer' ||
            d.recipientType === 'client' ||
            (d.recipientEmail && d.recipientEmail === lead?.email)
        )
    ) ||
    localDispatches.some((d: any) => d.recipientType === 'customer' || d.recipientType === 'client');

  if (!isOpen || quotationIndex === null || !quote) return null;

  const statusConfig = getStatusBadgeConfig(status);

  return (
    <AnimatePresence>
      <div
        key="quotation-preview-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      >
        <motion.div
          key="quotation-preview-modal-content"
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-7xl my-auto bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92vh]"
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0 shadow-xs">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                    {quoteTitle}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {qtnNumber}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Client: <span className="font-bold text-slate-800">{lead?.name}</span> • Total Scope: <span className="font-bold text-slate-800">{itemsCount} Items</span> ({formatExactCurrency(grandTotal)})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                title="Print or Save PDF"
              >
                <Printer size={13} /> Print / PDF
              </button>

              {!isConverted && (
                <button
                  type="button"
                  disabled={isDeletingQuotation}
                  onClick={handleDeleteQuotation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Delete Quotation"
                >
                  <Trash2 size={13} /> {isDeletingQuotation ? 'Deleting...' : 'Delete'}
                </button>
              )}

              <div className="w-px h-5 bg-slate-200 mx-1" />

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main 2-Column Split View Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden">
            {/* LEFT SIDE: Pure A4 Document Preview (60-65% width) */}
            <div className="lg:col-span-7 xl:col-span-8 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 border-b lg:border-b-0 lg:border-r border-slate-200">
              <QuotationPreview
                lead={lead}
                quotationIndex={quotationIndex}
                hideToolbar={true}
                onSuccess={onSuccess}
              />
            </div>

            {/* RIGHT SIDE: Dynamic Integrated Sidebar (35-40% width) with smooth horizontal slide */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white relative overflow-hidden flex flex-col h-full">
              <motion.div
                className="flex w-[200%] h-full flex-1"
                animate={{ x: sideView === 'overview' ? '0%' : '-50%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260, mass: 0.85 }}
              >
                {/* SLIDE 1: OVERVIEW PANEL (100% of sidebar width) */}
                <div className="w-1/2 h-full overflow-y-auto p-5 sm:p-6 flex flex-col justify-between shrink-0 space-y-5">
                  <div className="space-y-5">
                    {/* STATUS & 1-STEP DECISION CARD (Only shown once sent to client) */}
                    {isSentToClient && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Quotation Status & Decision
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">v{quote?.version || 1}</span>
                        </div>

                        {/* 1-Step Status Decision & State Card */}
                        {status === 'Accepted' || status === 'Approved' ? (
                          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                                  Client Approved
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300">
                                Confirmed
                              </span>
                            </div>

                            <p className="text-[11px] text-emerald-700 leading-snug">
                              This quotation has been approved by the client.
                            </p>
                          </div>
                        ) : status === 'Rejected' ? (
                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                                  Quotation Rejected
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-rose-700 px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300">
                                Declined
                              </span>
                            </div>

                            <p className="text-[11px] text-rose-700 leading-snug">
                              This quotation was marked as rejected by the client.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className={cn('p-3 rounded-xl border flex items-center justify-between shadow-2xs', statusConfig.bg)}>
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full animate-pulse', statusConfig.dot)} />
                                <span className="text-xs font-black uppercase tracking-wider">
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>

                            {!isConverted && (
                              <div>
                                <div className="grid grid-cols-2 gap-2">
                                  {/* 1-Step Client Approved Button */}
                                  <button
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={() => handleStatusUpdate('Accepted')}
                                    className="py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                                  >
                                    <CheckCircle2 size={14} />
                                    <span>Client Approved</span>
                                  </button>

                                  {/* Mark Rejected */}
                                  <button
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={() => handleStatusUpdate('Rejected')}
                                    className="py-2.5 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                                  >
                                    <XCircle size={14} />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DISPATCH & SEND SECTION ("Where We Sent the Quotation") */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <History size={14} className="text-indigo-600" />
                          <span>Where We Sent the Quotation</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {dispatchHistory.length} {dispatchHistory.length === 1 ? 'Dispatch' : 'Dispatches'}
                        </span>
                      </div>

                      {/* Quick Inline Switch Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={openClientView}
                          className="py-2 px-2.5 rounded-xl text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-98"
                        >
                          <Send size={12} className="text-indigo-600" />
                          <span>{isSentToClient ? 'Resend to Client' : 'Send to Client'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={openVendorView}
                          className="py-2 px-2.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-98"
                        >
                          <Building2 size={12} className="text-emerald-600" />
                          <span>Send to Vendor</span>
                        </button>
                      </div>

                      {/* Dispatch History Items */}
                      {isLoadingActivities ? (
                        <div className="py-4 text-center text-xs text-slate-400">
                          Loading dispatch tracking...
                        </div>
                      ) : dispatchHistory.length === 0 ? (
                        <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-2">
                          <Mail size={22} className="text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">
                            Not Dispatched Yet
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Send this quotation to the client or any vendor partner directly from the options above.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {dispatchHistory.map((item, idx) => {
                            const isVendor = item.remarks?.toLowerCase().includes('vendor');
                            const dateStr = item.createdAt || item.completedDate || item.date;
                            const formattedDate = dateStr
                              ? new Date(dateStr).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Recent';

                            return (
                              <div
                                key={item._id ? `disp-${item._id}` : `disp-idx-${idx}`}
                                className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900 min-w-0">
                                    {isVendor ? (
                                      <Building2 size={13} className="text-emerald-600 shrink-0" />
                                    ) : (
                                      <User size={13} className="text-indigo-600 shrink-0" />
                                    )}
                                    <span className="truncate">
                                      {item.recipientName
                                        ? `${isVendor ? 'Vendor' : 'Client'}: ${item.recipientName}`
                                        : isVendor
                                        ? 'Vendor Partner Copy'
                                        : 'Client Approval Dispatch'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                    {formattedDate}
                                  </span>
                                </div>

                                {item.quotationTitle && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                      📄 {item.quotationTitle}
                                    </span>
                                    {item.recipientEmail && (
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        ✉️ {item.recipientEmail}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <p className="text-[11px] text-slate-600 leading-snug break-words">
                                  {item.remarks}
                                </p>

                                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                    <CheckCircle2 size={11} /> Dispatched via Email
                                  </span>
                                  <span className="text-slate-400 font-medium">PDF Attached</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* COMMERCIAL BREAKDOWN */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-2xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Commercial Breakdown
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Subtotal ({itemsCount} items):</span>
                          <span className="font-semibold text-slate-800">
                            {formatExactCurrency(Number(quote.subtotal || 0))}
                          </span>
                        </div>

                        {Boolean(quote.taxPercentage) && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>GST ({quote.taxPercentage}%):</span>
                            <span className="font-semibold text-slate-800">
                              {formatExactCurrency(Number(quote.tax || 0))}
                            </span>
                          </div>
                        )}

                        {Boolean(quote.discount || quote.discountAmount) && (
                          <div className="flex items-center justify-between text-emerald-600 font-semibold">
                            <span>Discount:</span>
                            <span>-{formatExactCurrency(Number(quote.discount || quote.discountAmount || 0))}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                          <span>Grand Total:</span>
                          <span className="text-indigo-600">
                            {formatExactCurrency(grandTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DANGER ZONE: DELETE QUOTATION */}
                    {!isConverted && (
                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={isDeletingQuotation}
                          onClick={handleDeleteQuotation}
                          className="w-full py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          <span>{isDeletingQuotation ? 'Deleting Quotation...' : 'Delete This Quotation'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* SLIDE 2: DISPATCH PANEL */}
                <div className="w-1/2 h-full overflow-y-auto p-5 sm:p-6 flex flex-col justify-between shrink-0 space-y-4 bg-slate-50/40 border-l border-slate-200">
                  {sideView === 'send_vendor' ? (
                    <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-3.5">
                        {/* Sub-header with Back Button */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <button
                            type="button"
                            onClick={() => setSideView('overview')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100"
                          >
                            <ArrowLeft size={14} /> Back
                          </button>
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
                            <Building2 size={14} className="text-emerald-600" />
                            <span>Send to Vendor</span>
                          </div>
                        </div>

                        {/* Mode Toggle: Directory vs Custom Email */}
                        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualVendor(false);
                              setManualVendorEmail('');
                            }}
                            className={cn(
                              'flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center',
                              !isManualVendor ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            )}
                          >
                            Select Vendor ({vendorsList.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsManualVendor(true);
                              setSelectedVendorId('');
                            }}
                            className={cn(
                              'flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center',
                              isManualVendor ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            )}
                          >
                            + Other Email
                          </button>
                        </div>

                        {!isManualVendor ? (
                          <div className="space-y-2.5">
                            {/* Search & Filter */}
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={vendorSearchQuery}
                                onChange={(e) => setVendorSearchQuery(e.target.value)}
                                placeholder="Search vendor by name, category, email..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                              />
                            </div>

                            {/* Category Pills */}
                            {vendorCategories.length > 2 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                {vendorCategories.map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategoryFilter(cat)}
                                    className={cn(
                                      'px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-colors cursor-pointer',
                                      selectedCategoryFilter === cat
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    )}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Scrollable Vendor List */}
                            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                              {isLoadingVendors ? (
                                <div className="py-8 text-center text-xs text-slate-400">Loading vendors...</div>
                              ) : filteredVendors.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-400">
                                  {vendorSearchQuery ? 'No vendors match your search' : 'No vendors found in directory'}
                                </div>
                              ) : (
                                filteredVendors.map((v) => {
                                  const vId = String(v._id || v.id);
                                  const isSelected = selectedVendorId === vId;
                                  const isAlreadySent = sentVendorIds.has(vId);
                                  const vName = v.name || v.companyName || 'Vendor';
                                  const vCat = v.vendorCategory || v.category || 'Vendor';
                                  const vEmail = v.email || v.contactEmail || '';

                                  return (
                                    <div
                                      key={vId}
                                      onClick={() => setSelectedVendorId((prev) => (prev === vId ? '' : vId))}
                                      className={cn(
                                        'p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2.5',
                                        isSelected
                                          ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400 shadow-2xs'
                                          : isAlreadySent
                                          ? 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                                          : 'bg-white hover:bg-slate-50 border-slate-200'
                                      )}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-900 truncate">{vName}</span>
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                                            {vCat}
                                          </span>
                                          {isAlreadySent && (
                                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 shrink-0">
                                              Already Sent
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                          {vEmail || 'No email saved'}
                                        </div>
                                      </div>

                                      <div
                                        className={cn(
                                          'w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
                                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                                        )}
                                      >
                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Recipient Name:</label>
                              <input
                                type="text"
                                value={manualVendorName}
                                onChange={(e) => setManualVendorName(e.target.value)}
                                placeholder="e.g. Apex Woodworks / John"
                                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Vendor Email Address <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={manualVendorEmail}
                                onChange={(e) => setManualVendorEmail(e.target.value)}
                                placeholder="vendor@company.com"
                                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          disabled={isSendingVendor || (!isManualVendor && !selectedVendorId) || (isManualVendor && !manualVendorEmail)}
                          onClick={handleSendToVendor}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                          <Send size={13} />
                          <span>
                            {isSendingVendor
                              ? 'Dispatching to Vendor...'
                              : selectedVendorId && sentVendorIds.has(selectedVendorId)
                              ? 'Resend Quotation to Vendor'
                              : 'Send Quotation to Vendor'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Sub-header with Back Button */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <button
                            type="button"
                            onClick={() => setSideView('overview')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100"
                          >
                            <ArrowLeft size={14} /> Back
                          </button>
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700">
                            <Send size={14} className="text-indigo-600" />
                            <span>Send to Client</span>
                          </div>
                        </div>

                        {/* Recipient Details */}
                        <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Name:</label>
                            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold text-slate-800">
                              {lead?.name || 'Customer'}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Client Email Address <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={clientRecipientEmail}
                              onChange={(e) => setClientRecipientEmail(e.target.value)}
                              placeholder="client@example.com"
                              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Additional Note */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Cover Note / Custom Message (Optional):
                          </label>
                          <textarea
                            rows={4}
                            value={clientAdditionalNote}
                            onChange={(e) => setClientAdditionalNote(e.target.value)}
                            placeholder="Dear client, please review our detailed interior proposal and quotation. Let us know if you have any questions..."
                            className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          disabled={isSendingClient || !clientRecipientEmail}
                          onClick={handleSendToClient}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                          <Send size={13} />
                          <span>{isSendingClient ? 'Sending for Client Approval...' : 'Send for Client Approval'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
