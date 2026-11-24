'use client';
import { tr } from '@/i18n';

// =============================================================================
// Sky-Lite Web — Interior-OS Project Payments & Financial View
// Dynamic: Fetches from & posts to interior-os-backend /payments API
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Input } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useConfirm } from '@/providers/ConfirmContext';
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Plus,
  Search,
  Filter,
  X,
  CreditCard,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Trash2,
  Download,
  Printer,
  Eye,
  FileCheck,
} from 'lucide-react';
import { validatePositiveNumber, validateNonEmpty, validateRequiredDate, ValidationErrors } from '@/lib/crmValidation';
import { interiorProjectService } from '@/services/interiorProject.service';
import { downloadInvoicePdf, printInvoice, generateInvoiceHtml } from '@/features/interior-new/utils/invoicePdfGenerator';
import { useProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';

// ---------------------------------------------------------------------------
// Types — mirrors what the backend stores
// ---------------------------------------------------------------------------
interface PaymentRecord {
  _id: string;
  type: 'incoming' | 'outgoing' | 'debit_note';
  // Incoming
  invoiceNo?: string;
  milestoneName?: string;
  paymentDate?: string;
  incomingStatus?: 'Completed' | 'Pending Verification';
  // Outgoing
  poNo?: string;
  vendorName?: string;
  category?: string;
  outgoingStatus?: 'Paid' | 'Processing';
  // Debit note
  debitNoteNo?: string;
  reason?: string;
  issueDate?: string;
  debitNoteStatus?: 'Issued' | 'Adjusted' | 'Settled';
  // Common
  amount: number;
  paymentMethod?: string;
  referenceNo?: string;
  remarks?: string;
  createdAt: string;
}

interface InteriorPaymentsViewProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(val?: string): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function genRef(prefix: string): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${Math.floor(100 + Math.random() * 900)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InteriorPaymentsView({ projectId }: InteriorPaymentsViewProps) {
  const toast = useToast();
  const { can: canDo } = useProjectPermissions(projectId);
  const { currencySymbol, formatExactCurrency } = useCurrency();
  const { confirm } = useConfirm();
  const [activeCategory, setActiveCategory] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Data loading
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Preview
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [isOutgoingModalOpen, setIsOutgoingModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<PaymentRecord | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generateInvoiceOnSave, setGenerateInvoiceOnSave] = useState(true);

  // Form 1: Incoming Payment
  const [incomingForm, setIncomingForm] = useState({
    milestoneName: 'Booking Advance (10%)',
    invoiceNo: genRef('INV'),
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer' as const,
    referenceNo: '',
    remarks: '',
  });
  const [incomingErrors, setIncomingErrors] = useState<ValidationErrors>({});

  // Form 2: Outgoing Payment
  const [outgoingForm, setOutgoingForm] = useState({
    poNo: genRef('PO'),
    vendorName: '',
    category: 'Wood & Plywood',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer' as const,
    referenceNo: '',
    remarks: '',
  });
  const [outgoingErrors, setOutgoingErrors] = useState<ValidationErrors>({});
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Fetch all payments for this project
  // ---------------------------------------------------------------------------
  const loadPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await interiorProjectService.getPayments(projectId);
      // Backend returns { success: true, data: [...] }
      const list = res?.data ?? res ?? [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? tr("Failed to load payment records"));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const handleDeletePayment = async (paymentId: string) => {
    const ok = await confirm({
      title: tr("Delete Payment Record"),
      message: tr("Are you sure you want to delete this payment record? This action cannot be undone."),
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    try {
      setIsLoading(true);
      const res = await interiorProjectService.deletePayment(projectId, paymentId);
      if (res?.success) {
        toast.success(tr("Payment record deleted successfully"));
        loadPayments();
      } else {
        toast.error(res?.message || tr("Failed to delete payment"));
      }
    } catch (err: any) {
      console.error('Delete payment failed', err);
      toast.error(err?.response?.data?.message || tr("Failed to delete payment"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadPurchaseOrders = useCallback(async () => {
    try {
      const res = await interiorProjectService.getPurchaseOrders(projectId);
      if (res?.success && res?.data) {
        setPurchaseOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load purchase orders for payments', err);
    }
  }, [projectId]);

  useEffect(() => {
    loadPayments();
    loadPurchaseOrders();
    interiorProjectService
      .getProjectDetails(projectId)
      .then((res) => {
        if (res?.data) setProject(res.data);
        else if (res) setProject(res);
      })
      .catch((e) => console.error('Failed to load project details for invoice', e));
  }, [loadPayments, loadPurchaseOrders, projectId]);

  const handleDownloadInvoice = async (record: PaymentRecord) => {
    try {
      setIsDownloadingPdf(record._id);
      toast.success(tr("Generating PDF invoice..."));
      await downloadInvoicePdf(record, project, currencySymbol);
    } catch (err) {
      console.error('PDF download error', err);
      toast.error(tr("Failed to generate PDF invoice"));
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  const handlePrintInvoice = (record: PaymentRecord) => {
    printInvoice(record, project, currencySymbol).catch((err) => {
      console.error('Print invoice error', err);
      toast.error(tr("Failed to open print preview"));
    });
  };

  const handlePoSelect = (poId: string) => {
    setSelectedPoId(poId);
    if (!poId) {
      setOutgoingForm({
        ...outgoingForm,
        poNo: genRef('PO'),
        vendorName: '',
        category: 'Wood & Plywood',
        amount: '',
      });
      return;
    }
    const po = purchaseOrders.find((p) => p._id === poId || p.poNumber === poId);
    if (po) {
      const alreadyPaid = payments
        .filter((p) => p.type === 'outgoing' && p.poNo === po.poNumber)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const remaining = Math.max(0, (po.amount || 0) - alreadyPaid);

      setOutgoingForm({
        ...outgoingForm,
        poNo: po.poNumber || po._id,
        vendorName: po.vendorName || po.vendorId?.name || '',
        category: po.materialName || 'Wood & Plywood',
        amount: remaining > 0 ? remaining.toString() : (po.amount || 0).toString(),
        remarks: `Payment against PO ${po.poNumber} (${po.materialName || 'Materials'})`,
      });
    }
  };

  // Derived lists per category
  const incomingPayments = payments.filter((p) => p.type === 'incoming');
  const outgoingPayments = payments.filter((p) => p.type === 'outgoing');

  // ---------------------------------------------------------------------------
  // Submit Handlers (POST to backend)
  // ---------------------------------------------------------------------------
  const handleIncomingSubmit = async (e?: React.FormEvent, forceGenerateInvoice?: boolean) => {
    if (e) e.preventDefault();
    const errors: ValidationErrors = {
      amount: validatePositiveNumber(incomingForm.amount, 'Payment amount'),
      paymentDate: validateRequiredDate(incomingForm.paymentDate, 'Payment date'),
      referenceNo: validateNonEmpty(incomingForm.referenceNo, 'Reference / UTR number'),
    };
    setIncomingErrors(errors);
    if (Object.values(errors).some((err) => err !== null)) {
      toast.error(tr("Please fix the errors in the incoming payment form"));
      return;
    }

    const shouldGenInvoice = forceGenerateInvoice ?? generateInvoiceOnSave;

    setIsSubmitting(true);
    try {
      const payload = {
        type: 'incoming' as const,
        invoiceNo: incomingForm.invoiceNo,
        milestoneName: incomingForm.milestoneName,
        amount: parseFloat(incomingForm.amount),
        paymentDate: incomingForm.paymentDate,
        paymentMethod: incomingForm.paymentMethod,
        referenceNo: incomingForm.referenceNo.trim(),
        remarks: incomingForm.remarks.trim(),
      };

      const res = await interiorProjectService.createPayment(projectId, payload);

      const createdRecord: PaymentRecord = {
        _id: res?.data?._id || 'temp-' + Date.now(),
        ...payload,
        incomingStatus: 'Completed',
        createdAt: new Date().toISOString(),
      };

      if (shouldGenInvoice) {
        toast.success(tr("Payment recorded! Generating PDF invoice..."));
        try {
          await downloadInvoicePdf(createdRecord, project, currencySymbol);
        } catch (pdfErr) {
          console.error('Failed to generate PDF', pdfErr);
          toast.error(tr("Payment saved, but PDF invoice generation failed."));
        }
      } else {
        toast.success(tr("Incoming client payment recorded successfully!"));
      }

      setIsIncomingModalOpen(false);
      setIncomingForm({
        milestoneName: 'Booking Advance (10%)',
        invoiceNo: genRef('INV'),
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        referenceNo: '',
        remarks: '',
      });
      setIncomingErrors({});
      await loadPayments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? tr("Failed to record incoming payment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOutgoingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: ValidationErrors = {
      vendorName: validateNonEmpty(outgoingForm.vendorName, 'Vendor / Contractor name'),
      amount: validatePositiveNumber(outgoingForm.amount, 'Payout amount'),
      paymentDate: validateRequiredDate(outgoingForm.paymentDate, 'Payment date'),
      referenceNo: validateNonEmpty(outgoingForm.referenceNo, 'Reference / UTR number'),
    };
    setOutgoingErrors(errors);
    if (Object.values(errors).some((err) => err !== null)) {
      toast.error(tr("Please fix the errors in the outgoing payment form"));
      return;
    }

    setIsSubmitting(true);
    try {
      await interiorProjectService.createPayment(projectId, {
        type: 'outgoing',
        poNo: outgoingForm.poNo,
        vendorName: outgoingForm.vendorName.trim(),
        category: outgoingForm.category,
        amount: parseFloat(outgoingForm.amount),
        paymentDate: outgoingForm.paymentDate,
        paymentMethod: outgoingForm.paymentMethod,
        referenceNo: outgoingForm.referenceNo.trim(),
        remarks: outgoingForm.remarks.trim(),
      });
      toast.success(tr("Outgoing vendor payment recorded successfully!"));
      setIsOutgoingModalOpen(false);
      setOutgoingForm({
        poNo: genRef('PO'),
        vendorName: '',
        category: 'Wood & Plywood',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        referenceNo: '',
        remarks: '',
      });
      setOutgoingErrors({});
      await loadPayments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? tr("Failed to record outgoing payment"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered lists (client-side search & status filter)
  // ---------------------------------------------------------------------------
  const filteredIncoming = incomingPayments.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (t.invoiceNo ?? '').toLowerCase().includes(q) ||
      (t.milestoneName ?? '').toLowerCase().includes(q) ||
      (t.referenceNo ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || t.incomingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOutgoing = outgoingPayments.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (t.poNo ?? '').toLowerCase().includes(q) ||
      (t.vendorName ?? '').toLowerCase().includes(q) ||
      (t.category ?? '').toLowerCase().includes(q) ||
      (t.referenceNo ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || t.outgoingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-[hsl(var(--primary))]" />
            {tr("Project Payments & Financial Ledger")}
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {tr("Manage incoming client receipts and outgoing vendor payouts.")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeCategory === 'incoming' && (
            canDo('financials', 'create') && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsIncomingModalOpen(true)}
                className="text-xs sm:text-sm font-semibold"
              >
                <ArrowDownLeft className="w-4 h-4 me-1.5 text-emerald-300" />{tr(" Record Incoming Payment")}
              </Button>
            )
          )}

          {activeCategory === 'outgoing' && (
            canDo('financials', 'create') && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsOutgoingModalOpen(true)}
                className="text-xs sm:text-sm font-semibold"
              >
                <ArrowUpRight className="w-4 h-4 me-1.5 text-rose-300" />{tr(" Record Outgoing Payment")}
              </Button>
            )
          )}

        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Balance */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">{tr("Net Balance")}</span>
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.12)] flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-7 w-24 rounded bg-[hsl(var(--muted))] animate-pulse" />
          ) : (
            <p className={`text-xl font-bold tracking-tight ${
              incomingPayments.reduce((s, p) => s + p.amount, 0) - outgoingPayments.reduce((s, p) => s + p.amount, 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {incomingPayments.reduce((s, p) => s + p.amount, 0) - outgoingPayments.reduce((s, p) => s + p.amount, 0) < 0 ? '-' : ''}
              {tr(currencySymbol)} {Math.abs(
                incomingPayments.reduce((s, p) => s + p.amount, 0) -
                outgoingPayments.reduce((s, p) => s + p.amount, 0)
              ).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{tr("Incoming minus outgoing")}</p>
        </div>

        {/* Total Incoming */}
        <div
          onClick={() => { setActiveCategory('incoming'); setStatusFilter('All'); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 cursor-pointer hover:border-emerald-400/60 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">{tr("Total Incoming")}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-7 w-24 rounded bg-[hsl(var(--muted))] animate-pulse" />
          ) : (
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              +{tr(currencySymbol)} {incomingPayments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{incomingPayments.length}{tr(" client receipt")}{incomingPayments.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Total Outgoing */}
        <div
          onClick={() => { setActiveCategory('outgoing'); setStatusFilter('All'); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 cursor-pointer hover:border-rose-400/60 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">{tr("Total Outgoing")}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-7 w-24 rounded bg-[hsl(var(--muted))] animate-pulse" />
          ) : (
            <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              -{tr(currencySymbol)} {outgoingPayments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{outgoingPayments.length}{tr(" vendor payout")}{outgoingPayments.length !== 1 ? 's' : ''}</p>
        </div>

      </div>

      {/* Category Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3 overflow-x-auto">
        <button
          onClick={() => {
            setActiveCategory('incoming');
            setStatusFilter('All');
          }}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeCategory === 'incoming'
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />{tr(" Incoming Payments (")}{incomingPayments.length})
        </button>

        <button
          onClick={() => {
            setActiveCategory('outgoing');
            setStatusFilter('All');
          }}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeCategory === 'outgoing'
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-rose-400" />{tr(" Outgoing Payments (")}{outgoingPayments.length})
        </button>

      </div>

      {/* Shared Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeCategory === 'incoming'
                ? tr("Search invoice, UTR, or milestone...")
                : tr("Search PO, vendor, or category...")
            }
            icon={<Search className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            <option value="All">{tr("All Statuses")}</option>
            {activeCategory === 'incoming' && (
              <>
                <option value="Completed">{tr("Completed")}</option>
                <option value="Pending Verification">{tr("Pending Verification")}</option>
              </>
            )}
            {activeCategory === 'outgoing' && (
              <>
                <option value="Paid">{tr("Paid")}</option>
                <option value="Processing">{tr("Processing")}</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="w-6 h-6 animate-spin me-2" />
          <span className="text-sm font-medium">{tr("Loading payment records…")}</span>
        </div>
      )}

      {/* Category 1: Incoming Payments */}
      {!isLoading && activeCategory === 'incoming' && (
        <Card className="overflow-hidden p-0 border border-[hsl(var(--border))]">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-xs uppercase font-semibold text-[hsl(var(--muted-foreground))] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">{tr("Invoice / Milestone")}</th>
                  <th className="px-5 py-3.5">{tr("Date")}</th>
                  <th className="px-5 py-3.5">{tr("Method & UTR")}</th>
                  <th className="px-5 py-3.5">{tr("Amount")}</th>
                  <th className="px-5 py-3.5 text-center">{tr("Status")}</th>
                  <th className="px-5 py-3.5 text-end">{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredIncoming.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[hsl(var(--muted-foreground))] font-medium">
                      {tr("No incoming client payments match your search.")}
                    </td>
                  </tr>
                ) : (
                  filteredIncoming.map((tx) => (
                    <tr key={tx._id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[hsl(var(--foreground))] block text-xs sm:text-sm">
                          {tr(tx.invoiceNo)}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{tr(tx.milestoneName)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[hsl(var(--foreground))]">
                        {formatDate(tx.paymentDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[hsl(var(--foreground))] block text-xs sm:text-sm">{tr(tx.paymentMethod)}</span>
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{tr("Ref: ")}{tr(tx.referenceNo)}</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                        +{tr(currencySymbol)} {tx.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          {tx.incomingStatus ?? tr("Completed")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewInvoice(tx)}
                            title={tr("View / Print Invoice")}
                            className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canDo('financials', 'export') && (
                            <button
                              onClick={() => handleDownloadInvoice(tx)}
                              disabled={isDownloadingPdf === tx._id}
                              title={tr("Download PDF Invoice")}
                              className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isDownloadingPdf === tx._id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {canDo('financials', 'delete') && (
                            <button
                              onClick={() => handleDeletePayment(tx._id)}
                              title={tr("Delete payment record")}
                              className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Category 2: Outgoing Payments */}
      {!isLoading && activeCategory === 'outgoing' && (
        <Card className="overflow-hidden p-0 border border-[hsl(var(--border))]">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-xs uppercase font-semibold text-[hsl(var(--muted-foreground))] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">{tr("PO Ref / Vendor")}</th>
                  <th className="px-5 py-3.5">{tr("Category")}</th>
                  <th className="px-5 py-3.5">{tr("Date & Mode")}</th>
                  <th className="px-5 py-3.5">{tr("Amount")}</th>
                  <th className="px-5 py-3.5 text-center">{tr("Status")}</th>
                  <th className="px-5 py-3.5 text-end">{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredOutgoing.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[hsl(var(--muted-foreground))] font-medium">
                      {tr("No outgoing vendor payouts match your search.")}
                    </td>
                  </tr>
                ) : (
                  filteredOutgoing.map((tx) => (
                    <tr key={tx._id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[hsl(var(--foreground))] block text-xs sm:text-sm">
                          {tr(tx.vendorName)}
                        </span>
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{tr(tx.poNo)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[hsl(var(--foreground))]">
                        <span className="px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                          {tr(tx.category)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[hsl(var(--foreground))] block text-xs sm:text-sm">{formatDate(tx.paymentDate)}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{tr(tx.paymentMethod)} • {tr(tx.referenceNo)}</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
                        -{tr(currencySymbol)} {tx.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            tx.outgoingStatus === 'Paid'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {tx.outgoingStatus ?? tr("Paid")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-end">
                        {canDo('financials', 'delete') && (
                          <button
                            onClick={() => handleDeletePayment(tx._id)}
                            title={tr("Delete payment record")}
                            className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}


      {/* Modal 1: Record Incoming Client Payment */}
      <AnimatePresence>
        {isIncomingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsIncomingModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-500" />{tr(" Record Incoming Payment")}
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    {tr("Log a client milestone receipt or advance payment.")}
                  </p>
                </div>
                <button
                  onClick={() => setIsIncomingModalOpen(false)}
                  className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg text-[hsl(var(--muted-foreground))] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleIncomingSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Contract Milestone")}</label>
                  <select
                    value={incomingForm.milestoneName}
                    onChange={(e) => setIncomingForm({ ...incomingForm, milestoneName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  >
                    <option value="Booking Advance (10%)">{tr("Booking Advance (10%)")}</option>
                    <option value="Design Approval & Site Start (30%)">{tr("Design Approval & Site Start (30%)")}</option>
                    <option value="Carpentry & Midpoint (40%)">{tr("Carpentry & Midpoint (40%)")}</option>
                    <option value="Final Handover (20%)">{tr("Final Handover (20%)")}</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Amount (")}{tr(currencySymbol)}) *</label>
                    <input
                      type="number"
                      value={incomingForm.amount}
                      onChange={(e) => {
                        setIncomingForm({ ...incomingForm, amount: e.target.value });
                        if (incomingErrors.amount) setIncomingErrors({ ...incomingErrors, amount: null });
                      }}
                      placeholder="e.g. 250000"
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        incomingErrors.amount ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {incomingErrors.amount && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{incomingErrors.amount}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Payment Date *")}</label>
                    <input
                      type="date"
                      value={incomingForm.paymentDate}
                      onChange={(e) => {
                        setIncomingForm({ ...incomingForm, paymentDate: e.target.value });
                        if (incomingErrors.paymentDate) setIncomingErrors({ ...incomingErrors, paymentDate: null });
                      }}
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        incomingErrors.paymentDate ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {incomingErrors.paymentDate && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{tr(incomingErrors.paymentDate)}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Payment Mode")}</label>
                    <select
                      value={incomingForm.paymentMethod}
                      onChange={(e) => setIncomingForm({ ...incomingForm, paymentMethod: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="Bank Transfer">{tr("Bank Transfer")}</option>
                      <option value="UPI">{tr("UPI")}</option>
                      <option value="RTGS/NEFT">{tr("RTGS / NEFT")}</option>
                      <option value="Cheque">{tr("Cheque")}</option>
                      <option value="Cash">{tr("Cash")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Ref / Transaction Number *")}</label>
                    <input
                      type="text"
                      value={incomingForm.referenceNo}
                      onChange={(e) => {
                        setIncomingForm({ ...incomingForm, referenceNo: e.target.value });
                        if (incomingErrors.referenceNo) setIncomingErrors({ ...incomingErrors, referenceNo: null });
                      }}
                      placeholder={tr("e.g. WIRE-89210928 / CHQ-4401")}
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        incomingErrors.referenceNo ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {incomingErrors.referenceNo && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{tr(incomingErrors.referenceNo)}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Remarks / Notes")}</label>
                  <textarea
                    rows={3}
                    value={incomingForm.remarks}
                    onChange={(e) => setIncomingForm({ ...incomingForm, remarks: e.target.value })}
                    placeholder={tr("Enter transaction notes...")}
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
                  />
                </div>

                {/* Auto-generate Invoice Option */}
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
                  <input
                    type="checkbox"
                    id="generateInvoiceCheckbox"
                    checked={generateInvoiceOnSave}
                    onChange={(e) => setGenerateInvoiceOnSave(e.target.checked)}
                    className="w-4 h-4 rounded text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))] cursor-pointer accent-[hsl(var(--primary))]"
                  />
                  <label htmlFor="generateInvoiceCheckbox" className="text-xs text-[hsl(var(--foreground))] font-medium cursor-pointer select-none">
                    {tr("Auto-generate & download official PDF invoice upon saving")}
                  </label>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsIncomingModalOpen(false)}
                    className="text-xs font-semibold"
                  >
                    {tr("Cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={isSubmitting}
                    onClick={() => handleIncomingSubmit(undefined, true)}
                    className="text-xs font-semibold flex items-center gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <Download className="w-3.5 h-3.5" />{tr(" Save & Generate Invoice")}
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    isLoading={isSubmitting}
                    className="text-xs font-semibold"
                  >
                    {tr("Save Payment")}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Record Outgoing Vendor Payout */}
      <AnimatePresence>
        {isOutgoingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOutgoingModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-rose-500" />{tr(" Record Outgoing Payment")}
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    {tr("Log a payout to a vendor, contractor, or material supplier.")}
                  </p>
                </div>
                <button
                  onClick={() => setIsOutgoingModalOpen(false)}
                  className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg text-[hsl(var(--muted-foreground))] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleOutgoingSubmit} className="space-y-4">
                {purchaseOrders && purchaseOrders.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">
                      {tr("Link Purchase Order (PO)")}
                    </label>
                    <select
                      value={selectedPoId}
                      onChange={(e) => handlePoSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/30 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="">{tr("-- Direct Payment (No PO) --")}</option>
                      {purchaseOrders.map((po) => {
                        const paidForPo = payments
                          .filter((p) => p.type === 'outgoing' && p.poNo === po.poNumber)
                          .reduce((sum, p) => sum + (p.amount || 0), 0);
                        const remaining = Math.max(0, (po.amount || 0) - paidForPo);
                        return (
                          <option key={po._id} value={po._id}>
                            {tr(po.poNumber)} - {tr(po.materialName)} ({po.vendorName || tr("Vendor")}{tr(") • Total: ")}{tr(currencySymbol)} {(po.amount || 0).toLocaleString()}{remaining < (po.amount || 0) ? tr(" (Bal: {{currencySymbol}} {{remaining}})", { currencySymbol: currencySymbol, remaining: remaining.toLocaleString() }) : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Vendor / Contractor Name *")}</label>
                  <input
                    type="text"
                    value={outgoingForm.vendorName}
                    onChange={(e) => {
                      setOutgoingForm({ ...outgoingForm, vendorName: e.target.value });
                      if (outgoingErrors.vendorName) setOutgoingErrors({ ...outgoingErrors, vendorName: null });
                    }}
                    placeholder={tr("e.g. Apex Timber & Woodworks")}
                    className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                      outgoingErrors.vendorName ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                    }`}
                  />
                  {outgoingErrors.vendorName && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{tr(outgoingErrors.vendorName)}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Expense Category")}</label>
                    <select
                      value={outgoingForm.category}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="Wood & Plywood">{tr("Wood & Plywood")}</option>
                      <option value="Electrical Services">{tr("Electrical Services")}</option>
                      <option value="Hardware & Fittings">{tr("Hardware & Fittings")}</option>
                      <option value="Plumbing & Sanitary">{tr("Plumbing & Sanitary")}</option>
                      <option value="Paint & Finishes">{tr("Paint & Finishes")}</option>
                      <option value="Civil Materials">{tr("Civil Materials")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Amount (")}{tr(currencySymbol)}) *</label>
                    <input
                      type="number"
                      value={outgoingForm.amount}
                      onChange={(e) => {
                        setOutgoingForm({ ...outgoingForm, amount: e.target.value });
                        if (outgoingErrors.amount) setOutgoingErrors({ ...outgoingErrors, amount: null });
                      }}
                      placeholder="e.g. 150000"
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        outgoingErrors.amount ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {outgoingErrors.amount && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{outgoingErrors.amount}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Payment Date *")}</label>
                    <input
                      type="date"
                      value={outgoingForm.paymentDate}
                      onChange={(e) => {
                        setOutgoingForm({ ...outgoingForm, paymentDate: e.target.value });
                        if (outgoingErrors.paymentDate) setOutgoingErrors({ ...outgoingErrors, paymentDate: null });
                      }}
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        outgoingErrors.paymentDate ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {outgoingErrors.paymentDate && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{tr(outgoingErrors.paymentDate)}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">{tr("Ref / Transaction Number *")}</label>
                    <input
                      type="text"
                      value={outgoingForm.referenceNo}
                      onChange={(e) => {
                        setOutgoingForm({ ...outgoingForm, referenceNo: e.target.value });
                        if (outgoingErrors.referenceNo) setOutgoingErrors({ ...outgoingErrors, referenceNo: null });
                      }}
                      placeholder={tr("e.g. TXN-9812401")}
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        outgoingErrors.referenceNo ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {outgoingErrors.referenceNo && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{tr(outgoingErrors.referenceNo)}</p>}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOutgoingModalOpen(false)}
                    className="text-xs font-semibold"
                  >
                    {tr("Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    isLoading={isSubmitting}
                    className="text-xs font-semibold"
                  >
                    {tr("Save Outgoing Payment")}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 4: Invoice Preview & Print */}
      <AnimatePresence>
        {previewInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPreviewInvoice(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-3xl z-10 max-h-[92vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[hsl(var(--foreground))]">
                      {tr("Payment Invoice & Receipt")}
                    </h2>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {tr(previewInvoice.invoiceNo)} &bull; {tr(previewInvoice.milestoneName)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canDo('financials', 'export') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintInvoice(previewInvoice)}
                      className="text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />{tr(" Print")}
                    </Button>
                  )}
                  {canDo('financials', 'export') && (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={isDownloadingPdf === previewInvoice._id}
                      onClick={() => handleDownloadInvoice(previewInvoice)}
                      className="text-xs font-semibold flex items-center gap-1.5"
                    >
                      {isDownloadingPdf === previewInvoice._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {tr("Download PDF")}
                    </Button>
                  )}
                  <button
                    onClick={() => setPreviewInvoice(null)}
                    className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg text-[hsl(var(--muted-foreground))] transition-colors cursor-pointer ms-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-white shadow-inner p-1 min-h-[30rem]">
                <iframe
                  srcDoc={generateInvoiceHtml(previewInvoice, project, currencySymbol)}
                  title={tr("Invoice Preview")}
                  className="w-full h-[32.5rem] rounded-lg border-0 bg-white"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
