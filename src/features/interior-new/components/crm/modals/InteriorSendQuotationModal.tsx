'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  User,
  Building2,
  Mail,
  FileText,
  CheckCircle2,
  Paperclip,
  Search,
  Check,
  Plus,
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  quotation: any;
  quotationIndex?: number | null;
  initialTarget?: SendTarget;
  onSuccess: () => void;
}

type SendTarget = 'customer' | 'vendor' | 'other';

export function InteriorSendQuotationModal({
  isOpen,
  onClose,
  customerId,
  customerName = 'Lead / Customer',
  customerEmail = '',
  customerPhone = '',
  quotation,
  quotationIndex = null,
  initialTarget = 'customer',
  onSuccess,
}: Props) {
  const { formatExactCurrency } = useCurrency();
  const toast = useToast();

  const [sendTarget, setSendTarget] = useState<SendTarget>(initialTarget);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [isManualRecipient, setIsManualRecipient] = useState(false);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; name?: string }>({});

  const qtnNumber = quotation?.quotationNumber || `QTN-V${quotation?.version || 1}`;
  const qtnTitle = quotation?.title || `Quotation v${quotation?.version || 1}`;
  const grandTotal = Number(quotation?.grandTotal || quotation?.totalAmount || 0);
  const itemsCount = quotation?.items?.length || 0;
  const attachmentFilename = `${qtnNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  // Auto-generate subject & message for vendor / others
  const generateAutoContent = useCallback((target: SendTarget, targetName?: string) => {
    const nameToUse = (targetName || (target === 'customer' ? customerName : 'Partner')).trim();
    const formattedAmount = formatExactCurrency(grandTotal);

    if (target === 'vendor') {
      return {
        subject: `RFQ / Material Quotation Reference (${qtnNumber}) — Project: ${customerName}`,
        message: `Dear ${nameToUse || 'Vendor Partner'},\n\nPlease find attached the quotation line items and material specifications (${qtnNumber}) for project "${customerName}".\n\n• Project Name: ${customerName}\n• Scope Breakdown: ${itemsCount} items\n• Reference Amount: ${formattedAmount}\n\nKindly review the itemized quantities and specifications in the attached document. Please share your availability, lead time, and best proposal at the earliest.\n\nBest regards,\nProcurement & Site Execution\nSkyStruct Interior`,
      };
    } else {
      return {
        subject: `Quotation & Scope of Work (${qtnNumber}) — ${customerName}`,
        message: `Hello ${nameToUse || ''},\n\nPlease find attached the official interior quotation and line-item breakdown (${qtnNumber}) for project "${customerName}".\n\n• Client: ${customerName}\n• Total Amount: ${formattedAmount}\n• Items: ${itemsCount} items\n\nKindly inspect the attached document and let us know if you need any adjustments.\n\nRegards,\nSkyStruct Interior`,
      };
    }
  }, [customerName, qtnNumber, grandTotal, itemsCount, formatExactCurrency]);

  // Reset & load vendors
  useEffect(() => {
    if (isOpen) {
      setSendTarget(initialTarget || 'customer');
      setRecipientEmail(initialTarget === 'customer' ? (customerEmail || '') : '');
      setRecipientName(initialTarget === 'customer' ? (customerName || '') : '');
      setAdditionalNote('');
      setSelectedVendorId('');
      setVendorSearchQuery('');
      setSelectedCategoryFilter('All');
      setIsManualRecipient(false);
      setErrors({});

      const auto = generateAutoContent('vendor', '');
      setCustomSubject(auto.subject);
      setCustomMessage(auto.message);

      // Fetch vendors if available
      setIsLoadingVendors(true);
      interiorCrmService
        .getVendors()
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setVendorsList(list);
        })
        .catch(() => {
          setVendorsList([]);
        })
        .finally(() => {
          setIsLoadingVendors(false);
        });
    }
  }, [isOpen, customerEmail, customerName, generateAutoContent]);

  // Handle target switch
  const handleTargetChange = (target: SendTarget) => {
    setSendTarget(target);
    setErrors({});

    let defaultName = '';
    let defaultEmail = '';

    if (target === 'customer') {
      defaultName = customerName || '';
      defaultEmail = customerEmail || '';
      setIsManualRecipient(false);
    } else {
      setSelectedVendorId('');
      setIsManualRecipient(false);
      const auto = generateAutoContent(target, defaultName);
      setCustomSubject(auto.subject);
      setCustomMessage(auto.message);
    }

    setRecipientEmail(defaultEmail);
    setRecipientName(defaultName);
  };

  const handleSelectVendorCard = (vendor: any) => {
    const vendorId = vendor._id || vendor.id;
    setSelectedVendorId(vendorId);
    setIsManualRecipient(false);

    const vName = vendor.name || vendor.companyName || '';
    const vEmail = vendor.email || vendor.contactEmail || '';
    setRecipientName(vName);
    setRecipientEmail(vEmail);
    setErrors({});

    const auto = generateAutoContent('vendor', vName);
    setCustomSubject(auto.subject);
    setCustomMessage(auto.message);
  };

  const handleSwitchToManualRecipient = () => {
    setIsManualRecipient(true);
    setSelectedVendorId('');
    setRecipientName('');
    setRecipientEmail('');
    setErrors({});
    const auto = generateAutoContent('other', '');
    setCustomSubject(auto.subject);
    setCustomMessage(auto.message);
  };

  // Vendor list filtering
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    vendorsList.forEach((v) => {
      const cat = v.vendorCategory || v.category;
      if (cat) cats.add(cat);
    });
    return ['All', ...Array.from(cats)];
  }, [vendorsList]);

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

  const selectedVendorObj = useMemo(() => {
    return vendorsList.find((v) => (v._id || v.id) === selectedVendorId);
  }, [vendorsList, selectedVendorId]);

  const validate = () => {
    const errs: { email?: string; name?: string } = {};
    const emailToValidate = (sendTarget === 'customer' ? (customerEmail || recipientEmail) : recipientEmail).trim();

    if (!emailToValidate) {
      errs.email = sendTarget === 'customer'
        ? 'Lead/Customer has no email address. Please update lead email or choose Vendor/Other.'
        : 'Recipient email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToValidate)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (sendTarget !== 'customer' && !recipientName.trim()) {
      errs.name = 'Please select a vendor from the list or enter recipient details.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors before sending.');
      return;
    }

    setIsSubmitting(true);

    try {
      const emailToSend = (sendTarget === 'customer' ? (customerEmail || recipientEmail) : recipientEmail).trim();
      const nameToSend = (sendTarget === 'customer' ? (customerName || recipientName) : recipientName).trim();
      const messageToSend = sendTarget === 'customer' ? additionalNote.trim() : (additionalNote.trim() || customMessage.trim());
      const subjectToSend = sendTarget === 'customer' ? undefined : (customSubject.trim() || undefined);

      await interiorCrmService.sendQuotationEmail(customerId, {
        quotation,
        recipientEmail: emailToSend,
        recipientType: sendTarget,
        recipientName: nameToSend,
        customSubject: subjectToSend,
        customMessage: messageToSend || undefined,
        quotationIndex: typeof quotationIndex === 'number' ? quotationIndex : undefined,
      });

      if (sendTarget === 'customer') {
        toast.success(`Quotation sent to ${emailToSend} for approval! Status updated to 'Sent'.`);
      } else {
        toast.success(`Quotation copy dispatched to ${nameToSend || emailToSend}!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to send quotation email:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send quotation email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Send Quotation Document
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">
                    {qtnNumber}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Deliver formatted quotation document with itemized breakdown & pricing
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quotation Mini Summary Banner */}
          <div className="px-6 pt-3 shrink-0">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{qtnTitle}</div>
                  <div className="text-[11px] text-slate-500">
                    {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'} • Client: <span className="font-semibold text-slate-700">{customerName}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Amount</div>
                <div className="text-xs sm:text-sm font-extrabold text-indigo-600">
                  {formatExactCurrency(grandTotal)}
                </div>
              </div>
            </div>

           
          </div>

          {/* Body Form with Scrollable Content and Sticky Bottom Action Bar */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable inputs container */}
            <div className="px-6 py-3.5 space-y-3.5 overflow-y-auto flex-1 min-h-0">
              {/* Recipient Target Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Recipient Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Customer */}
                  <button
                    type="button"
                    onClick={() => handleTargetChange('customer')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      sendTarget === 'customer'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full mb-1">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      {sendTarget === 'customer' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Send to Lead / Customer</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        For Quotation Approval (sets status to <span className="font-semibold text-indigo-600">Sent</span>)
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Vendor / Others */}
                  <button
                    type="button"
                    onClick={() => handleTargetChange('vendor')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      sendTarget !== 'customer'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full mb-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      {sendTarget !== 'customer' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Send to Vendor or Others</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Pick a vendor from list for Material RFQ / Partner copy
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* IF SEND TARGET IS CUSTOMER: Clean & Minimal View */}
              {sendTarget === 'customer' ? (
                <div className="space-y-3.5">
                  {/* Client Recipient Info Card */}
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    !customerEmail ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{customerEmail || <span className="text-rose-600 font-semibold">No email address on lead profile</span>}</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Lead Client
                    </span>
                  </div>

                  {errors.email && (
                    <p className="text-[11px] text-rose-500 font-medium px-1">{errors.email}</p>
                  )}

                  {/* Additional Note Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Additional Note / Remarks (Optional)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Included in email & PDF</span>
                    </label>
                    <textarea
                      rows={3}
                      value={additionalNote}
                      onChange={(e) => setAdditionalNote(e.target.value)}
                      placeholder="Add an optional personal note, payment terms, or review remarks (e.g. 'Looking forward to your feedback and approval to commence work')..."
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none leading-relaxed shadow-2xs"
                    />
                  </div>
                </div>
              ) : (
                /* IF SEND TARGET IS VENDOR OR OTHER: Rich Vendor List Selection */
                <div className="space-y-3.5">
                  {/* Toggle between Registered Vendor List & Manual Custom Recipient */}
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      {isManualRecipient ? 'Custom Recipient Details' : 'Choose Vendor from List'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (isManualRecipient) {
                          setIsManualRecipient(false);
                        } else {
                          handleSwitchToManualRecipient();
                        }
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isManualRecipient ? (
                        <>🏢 Back to Vendor List</>
                      ) : (
                        <>✉️ Or Enter Custom Email Manually</>
                      )}
                    </button>
                  </div>

                  {!isManualRecipient ? (
                    /* VENDOR LIST VIEW */
                    <div className="space-y-2.5">
                      {/* Search & Category Filter */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={vendorSearchQuery}
                            onChange={(e) => setVendorSearchQuery(e.target.value)}
                            placeholder="Search vendors by name, category, email..."
                            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        {categoriesList.length > 2 && (
                          <select
                            value={selectedCategoryFilter}
                            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                          >
                            {categoriesList.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Vendors Scrollable Cards List */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        {isLoadingVendors ? (
                          <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs">
                            <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-2" />
                            Loading registered vendors...
                          </div>
                        ) : filteredVendors.length === 0 ? (
                          <div className="p-6 text-center">
                            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-700">No vendors found</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {vendorSearchQuery
                                ? 'No vendors match your search filters.'
                                : 'No registered vendors available in system yet.'}
                            </p>
                            <button
                              type="button"
                              onClick={handleSwitchToManualRecipient}
                              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Enter Recipient Email Manually
                            </button>
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 p-1">
                            {filteredVendors.map((v) => {
                              const vId = v._id || v.id;
                              const isSelected = selectedVendorId === vId;
                              const vName = v.name || v.companyName || 'Unnamed Vendor';
                              const vEmail = v.email || v.contactEmail;
                              const vCategory = v.vendorCategory || v.category || 'General';
                              const vContact = v.contactPerson;
                              const vPhone = v.phoneNumber || v.phone;

                              return (
                                <div
                                  key={vId}
                                  onClick={() => handleSelectVendorCard(v)}
                                  className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-indigo-50 border border-indigo-300 shadow-xs'
                                      : 'hover:bg-white border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white font-bold'
                                          : 'bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900 truncate">
                                          {vName}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                          {vCategory}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 truncate">
                                        {vEmail && (
                                          <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3 text-slate-400" />
                                            <span className="truncate">{vEmail}</span>
                                          </span>
                                        )}
                                        {vContact && (
                                          <span className="text-slate-400">
                                            • {vContact}
                                          </span>
                                        )}
                                        {vPhone && (
                                          <span className="text-slate-400">
                                            • {vPhone}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0 pl-2">
                                    {isSelected ? (
                                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                        <Check className="w-3 h-3" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full border border-slate-300 hover:border-slate-400" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Selected Vendor Confirmation / Missing Selection notice */}
                      {selectedVendorObj ? (
                        <div className="p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div className="min-w-0 truncate">
                              <span className="font-bold text-indigo-950">
                                Selected: {selectedVendorObj.name || selectedVendorObj.companyName}
                              </span>
                              <span className="text-[11px] text-indigo-700 block truncate">
                                Sending to: {selectedVendorObj.email || <span className="text-rose-600 font-semibold">No email (please edit)</span>}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedVendorId('')}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 bg-white border border-slate-200 rounded-lg cursor-pointer shrink-0"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        errors.name && (
                          <p className="text-[11px] text-rose-500 font-medium px-1">
                            {errors.name}
                          </p>
                        )
                      )}

                      {errors.email && (
                        <p className="text-[11px] text-rose-500 font-medium px-1">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* MANUAL CUSTOM RECIPIENT FIELDS */
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Recipient / Company Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => {
                              setRecipientName(e.target.value);
                              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                            }}
                            placeholder="e.g. Apex Hardware Supplies"
                            className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                              errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-indigo-500'
                            }`}
                          />
                          {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Recipient Email Address <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => {
                              setRecipientEmail(e.target.value);
                              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                            }}
                            placeholder="vendor@example.com"
                            className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                              errors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-indigo-500'
                            }`}
                          />
                          {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Note Input for Vendor */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Additional Note / RFQ Instructions (Optional)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Included in email & PDF</span>
                    </label>
                    <textarea
                      rows={2}
                      value={additionalNote}
                      onChange={(e) => setAdditionalNote(e.target.value)}
                      placeholder="Add delivery timeline requirements, site location notes, or proposal deadlines..."
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none leading-relaxed shadow-2xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Actions Bar */}
            <div className="px-6 py-3 bg-slate-50/90 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending with Attachment...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {sendTarget === 'customer'
                        ? quotation?.status === 'Sent'
                          ? 'Resend for Customer Approval'
                          : 'Send for Customer Approval'
                        : selectedVendorObj
                        ? `Send Quotation to ${selectedVendorObj.name || 'Vendor'}`
                        : 'Send to Vendor / Other'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
