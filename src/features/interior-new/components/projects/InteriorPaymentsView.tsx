'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Project Payments & Financial View
// Dynamic: Fetches from & posts to interior-os-backend /payments API
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Input } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';
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
} from 'lucide-react';
import { validatePositiveNumber, validateNonEmpty, validateRequiredDate, ValidationErrors } from '@/lib/crmValidation';
import { interiorProjectService } from '@/services/interiorProject.service';

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
  const [activeCategory, setActiveCategory] = useState<'incoming' | 'outgoing' | 'debitNote'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Data loading
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [isOutgoingModalOpen, setIsOutgoingModalOpen] = useState(false);
  const [isDebitNoteModalOpen, setIsDebitNoteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Form 3: Debit Note
  const [debitNoteForm, setDebitNoteForm] = useState({
    debitNoteNo: genRef('DN'),
    vendorName: '',
    reason: '',
    amount: '',
    issueDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });
  const [debitNoteErrors, setDebitNoteErrors] = useState<ValidationErrors>({});

  // ---------------------------------------------------------------------------
  // Fetch all payments for this project
  // ---------------------------------------------------------------------------
  const loadPayments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await interiorProjectService.getPayments(projectId);
      // Backend returns { success: true, data: [...] }
      const list = res?.data ?? res ?? [];
      setPayments(list);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load payment records');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Derived lists per category
  const incomingPayments = payments.filter((p) => p.type === 'incoming');
  const outgoingPayments = payments.filter((p) => p.type === 'outgoing');
  const debitNotes = payments.filter((p) => p.type === 'debit_note');

  // ---------------------------------------------------------------------------
  // Submit Handlers (POST to backend)
  // ---------------------------------------------------------------------------
  const handleIncomingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: ValidationErrors = {
      amount: validatePositiveNumber(incomingForm.amount, 'Payment amount'),
      paymentDate: validateRequiredDate(incomingForm.paymentDate, 'Payment date'),
      referenceNo: validateNonEmpty(incomingForm.referenceNo, 'Reference / UTR number'),
    };
    setIncomingErrors(errors);
    if (Object.values(errors).some((err) => err !== null)) {
      toast.error('Please fix the errors in the incoming payment form');
      return;
    }

    setIsSubmitting(true);
    try {
      await interiorProjectService.createPayment(projectId, {
        type: 'incoming',
        invoiceNo: incomingForm.invoiceNo,
        milestoneName: incomingForm.milestoneName,
        amount: parseFloat(incomingForm.amount),
        paymentDate: incomingForm.paymentDate,
        paymentMethod: incomingForm.paymentMethod,
        referenceNo: incomingForm.referenceNo.trim(),
        remarks: incomingForm.remarks.trim(),
      });
      toast.success('Incoming client payment recorded successfully!');
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
      toast.error(err?.response?.data?.message ?? 'Failed to record incoming payment');
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
      toast.error('Please fix the errors in the outgoing payment form');
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
      toast.success('Outgoing vendor payment recorded successfully!');
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
      toast.error(err?.response?.data?.message ?? 'Failed to record outgoing payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDebitNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: ValidationErrors = {
      vendorName: validateNonEmpty(debitNoteForm.vendorName, 'Vendor name'),
      reason: validateNonEmpty(debitNoteForm.reason, 'Reason / defect details'),
      amount: validatePositiveNumber(debitNoteForm.amount, 'Debit amount'),
      issueDate: validateRequiredDate(debitNoteForm.issueDate, 'Issue date'),
    };
    setDebitNoteErrors(errors);
    if (Object.values(errors).some((err) => err !== null)) {
      toast.error('Please fix the errors in the debit note form');
      return;
    }

    setIsSubmitting(true);
    try {
      await interiorProjectService.createPayment(projectId, {
        type: 'debit_note',
        debitNoteNo: debitNoteForm.debitNoteNo,
        vendorName: debitNoteForm.vendorName.trim(),
        reason: debitNoteForm.reason.trim(),
        amount: parseFloat(debitNoteForm.amount),
        issueDate: debitNoteForm.issueDate,
        remarks: debitNoteForm.remarks.trim(),
      });
      toast.success('Debit note issued successfully!');
      setIsDebitNoteModalOpen(false);
      setDebitNoteForm({
        debitNoteNo: genRef('DN'),
        vendorName: '',
        reason: '',
        amount: '',
        issueDate: new Date().toISOString().split('T')[0],
        remarks: '',
      });
      setDebitNoteErrors({});
      await loadPayments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to issue debit note');
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

  const filteredDebitNotes = debitNotes.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (t.debitNoteNo ?? '').toLowerCase().includes(q) ||
      (t.vendorName ?? '').toLowerCase().includes(q) ||
      (t.reason ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || t.debitNoteStatus === statusFilter;
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
            Project Payments &amp; Financial Ledger
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Manage incoming client receipts, outgoing vendor payouts, and debit notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeCategory === 'incoming' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsIncomingModalOpen(true)}
              className="text-xs sm:text-sm font-semibold"
            >
              <ArrowDownLeft className="w-4 h-4 mr-1.5 text-emerald-300" /> Record Incoming Payment
            </Button>
          )}

          {activeCategory === 'outgoing' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsOutgoingModalOpen(true)}
              className="text-xs sm:text-sm font-semibold"
            >
              <ArrowUpRight className="w-4 h-4 mr-1.5 text-rose-300" /> Record Outgoing Payment
            </Button>
          )}

          {activeCategory === 'debitNote' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsDebitNoteModalOpen(true)}
              className="text-xs sm:text-sm font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Issue Debit Note
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Net Balance</span>
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
              ₹{Math.abs(
                incomingPayments.reduce((s, p) => s + p.amount, 0) -
                outgoingPayments.reduce((s, p) => s + p.amount, 0)
              ).toLocaleString('en-IN')}
            </p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Incoming minus outgoing</p>
        </div>

        {/* Total Incoming */}
        <div
          onClick={() => { setActiveCategory('incoming'); setStatusFilter('All'); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 cursor-pointer hover:border-emerald-400/60 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Total Incoming</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-7 w-24 rounded bg-[hsl(var(--muted))] animate-pulse" />
          ) : (
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              +₹{incomingPayments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
            </p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{incomingPayments.length} client receipt{incomingPayments.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Total Outgoing */}
        <div
          onClick={() => { setActiveCategory('outgoing'); setStatusFilter('All'); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 cursor-pointer hover:border-rose-400/60 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Total Outgoing</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-7 w-24 rounded bg-[hsl(var(--muted))] animate-pulse" />
          ) : (
            <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              -₹{outgoingPayments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
            </p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{outgoingPayments.length} vendor payout{outgoingPayments.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Debit Notes */}
        <div
          onClick={() => { setActiveCategory('debitNote'); setStatusFilter('All'); }}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex flex-col gap-2 cursor-pointer hover:border-amber-400/60 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Debit Notes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-7 w-24 rounded bg-[hsl(var(--muted))] animate-pulse" />
          ) : (
            <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              ₹{debitNotes.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
            </p>
          )}
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{debitNotes.length} debit note{debitNotes.length !== 1 ? 's' : ''} issued</p>
        </div>
      </div>

      {/* Main 3 Categories Navigation Tabs */}
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
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> Incoming Payments ({incomingPayments.length})
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
          <ArrowUpRight className="w-4 h-4 text-rose-400" /> Outgoing Payments ({outgoingPayments.length})
        </button>

        <button
          onClick={() => {
            setActiveCategory('debitNote');
            setStatusFilter('All');
          }}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeCategory === 'debitNote'
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-400" /> Debit Notes ({debitNotes.length})
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
                ? 'Search invoice, UTR, or milestone...'
                : activeCategory === 'outgoing'
                ? 'Search PO, vendor, or category...'
                : 'Search debit note, vendor, or reason...'
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
            <option value="All">All Statuses</option>
            {activeCategory === 'incoming' && (
              <>
                <option value="Completed">Completed</option>
                <option value="Pending Verification">Pending Verification</option>
              </>
            )}
            {activeCategory === 'outgoing' && (
              <>
                <option value="Paid">Paid</option>
                <option value="Processing">Processing</option>
              </>
            )}
            {activeCategory === 'debitNote' && (
              <>
                <option value="Issued">Issued</option>
                <option value="Adjusted">Adjusted</option>
                <option value="Settled">Settled</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-[hsl(var(--muted-foreground))]">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm font-medium">Loading payment records…</span>
        </div>
      )}

      {/* Category 1: Incoming Payments */}
      {!isLoading && activeCategory === 'incoming' && (
        <Card className="overflow-hidden p-0 border border-[hsl(var(--border))]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-xs uppercase font-semibold text-[hsl(var(--muted-foreground))] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Invoice / Milestone</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Method &amp; UTR</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredIncoming.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[hsl(var(--muted-foreground))] font-medium">
                      No incoming client payments match your search.
                    </td>
                  </tr>
                ) : (
                  filteredIncoming.map((tx) => (
                    <tr key={tx._id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[hsl(var(--foreground))] block text-xs sm:text-sm">
                          {tx.invoiceNo}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{tx.milestoneName}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[hsl(var(--foreground))]">
                        {formatDate(tx.paymentDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[hsl(var(--foreground))] block text-xs sm:text-sm">{tx.paymentMethod}</span>
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">Ref: {tx.referenceNo}</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                        +₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          {tx.incomingStatus ?? 'Completed'}
                        </span>
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
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-xs uppercase font-semibold text-[hsl(var(--muted-foreground))] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">PO Ref / Vendor</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Date &amp; Mode</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredOutgoing.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[hsl(var(--muted-foreground))] font-medium">
                      No outgoing vendor payouts match your search.
                    </td>
                  </tr>
                ) : (
                  filteredOutgoing.map((tx) => (
                    <tr key={tx._id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[hsl(var(--foreground))] block text-xs sm:text-sm">
                          {tx.vendorName}
                        </span>
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{tx.poNo}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[hsl(var(--foreground))]">
                        <span className="px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[hsl(var(--foreground))] block text-xs sm:text-sm">{formatDate(tx.paymentDate)}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{tx.paymentMethod} • {tx.referenceNo}</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-sm">
                        -₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            tx.outgoingStatus === 'Paid'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {tx.outgoingStatus ?? 'Paid'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Category 3: Debit Notes */}
      {!isLoading && activeCategory === 'debitNote' && (
        <Card className="overflow-hidden p-0 border border-[hsl(var(--border))]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-xs uppercase font-semibold text-[hsl(var(--muted-foreground))] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Debit Note # / Vendor</th>
                  <th className="px-5 py-3.5">Reason / Description</th>
                  <th className="px-5 py-3.5">Issue Date</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredDebitNotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[hsl(var(--muted-foreground))] font-medium">
                      No debit notes match your search.
                    </td>
                  </tr>
                ) : (
                  filteredDebitNotes.map((dn) => (
                    <tr key={dn._id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[hsl(var(--foreground))] block text-xs sm:text-sm">
                          {dn.debitNoteNo}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">{dn.vendorName}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[hsl(var(--foreground))] font-medium max-w-xs">
                        {dn.reason}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[hsl(var(--foreground))]">
                        {formatDate(dn.issueDate)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                        ₹{dn.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            dn.debitNoteStatus === 'Adjusted'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                              : dn.debitNoteStatus === 'Settled'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {dn.debitNoteStatus ?? 'Issued'}
                        </span>
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
                    <ArrowDownLeft className="w-5 h-5 text-emerald-500" /> Record Incoming Payment
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Log a client milestone receipt or advance payment.
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
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Contract Milestone</label>
                  <select
                    value={incomingForm.milestoneName}
                    onChange={(e) => setIncomingForm({ ...incomingForm, milestoneName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  >
                    <option value="Booking Advance (10%)">Booking Advance (10%)</option>
                    <option value="Design Approval & Site Start (30%)">Design Approval &amp; Site Start (30%)</option>
                    <option value="Carpentry & Midpoint (40%)">Carpentry &amp; Midpoint (40%)</option>
                    <option value="Final Handover (20%)">Final Handover (20%)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Amount (₹) *</label>
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
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Payment Date *</label>
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
                    {incomingErrors.paymentDate && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{incomingErrors.paymentDate}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Payment Mode</label>
                    <select
                      value={incomingForm.paymentMethod}
                      onChange={(e) => setIncomingForm({ ...incomingForm, paymentMethod: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="RTGS/NEFT">RTGS / NEFT</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Ref / UTR Number *</label>
                    <input
                      type="text"
                      value={incomingForm.referenceNo}
                      onChange={(e) => {
                        setIncomingForm({ ...incomingForm, referenceNo: e.target.value });
                        if (incomingErrors.referenceNo) setIncomingErrors({ ...incomingErrors, referenceNo: null });
                      }}
                      placeholder="e.g. HDFC10928301"
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        incomingErrors.referenceNo ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {incomingErrors.referenceNo && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{incomingErrors.referenceNo}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Remarks / Notes</label>
                  <textarea
                    rows={3}
                    value={incomingForm.remarks}
                    onChange={(e) => setIncomingForm({ ...incomingForm, remarks: e.target.value })}
                    placeholder="Enter transaction notes..."
                    className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsIncomingModalOpen(false)}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    isLoading={isSubmitting}
                    className="text-xs font-semibold"
                  >
                    Save Incoming Payment
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
                    <ArrowUpRight className="w-5 h-5 text-rose-500" /> Record Outgoing Payment
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Log a payout to a vendor, contractor, or material supplier.
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
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Vendor / Contractor Name *</label>
                  <input
                    type="text"
                    value={outgoingForm.vendorName}
                    onChange={(e) => {
                      setOutgoingForm({ ...outgoingForm, vendorName: e.target.value });
                      if (outgoingErrors.vendorName) setOutgoingErrors({ ...outgoingErrors, vendorName: null });
                    }}
                    placeholder="e.g. Royal Wood Suppliers"
                    className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                      outgoingErrors.vendorName ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                    }`}
                  />
                  {outgoingErrors.vendorName && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{outgoingErrors.vendorName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Expense Category</label>
                    <select
                      value={outgoingForm.category}
                      onChange={(e) => setOutgoingForm({ ...outgoingForm, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    >
                      <option value="Wood & Plywood">Wood &amp; Plywood</option>
                      <option value="Electrical Services">Electrical Services</option>
                      <option value="Hardware & Fittings">Hardware &amp; Fittings</option>
                      <option value="Plumbing & Sanitary">Plumbing &amp; Sanitary</option>
                      <option value="Paint & Finishes">Paint &amp; Finishes</option>
                      <option value="Civil Materials">Civil Materials</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Amount (₹) *</label>
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
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Payment Date *</label>
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
                    {outgoingErrors.paymentDate && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{outgoingErrors.paymentDate}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Ref / UTR Number *</label>
                    <input
                      type="text"
                      value={outgoingForm.referenceNo}
                      onChange={(e) => {
                        setOutgoingForm({ ...outgoingForm, referenceNo: e.target.value });
                        if (outgoingErrors.referenceNo) setOutgoingErrors({ ...outgoingErrors, referenceNo: null });
                      }}
                      placeholder="e.g. UTR-9812401"
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        outgoingErrors.referenceNo ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {outgoingErrors.referenceNo && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{outgoingErrors.referenceNo}</p>}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOutgoingModalOpen(false)}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    isLoading={isSubmitting}
                    className="text-xs font-semibold"
                  >
                    Save Outgoing Payment
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Issue Debit Note */}
      <AnimatePresence>
        {isDebitNoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDebitNoteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" /> Issue Debit Note
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Issue a deduction or adjustment against a vendor.
                  </p>
                </div>
                <button
                  onClick={() => setIsDebitNoteModalOpen(false)}
                  className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg text-[hsl(var(--muted-foreground))] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleDebitNoteSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Vendor / Party Name *</label>
                  <input
                    type="text"
                    value={debitNoteForm.vendorName}
                    onChange={(e) => {
                      setDebitNoteForm({ ...debitNoteForm, vendorName: e.target.value });
                      if (debitNoteErrors.vendorName) setDebitNoteErrors({ ...debitNoteErrors, vendorName: null });
                    }}
                    placeholder="e.g. Royal Wood Suppliers"
                    className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                      debitNoteErrors.vendorName ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                    }`}
                  />
                  {debitNoteErrors.vendorName && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{debitNoteErrors.vendorName}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Reason / Defect Detail *</label>
                  <textarea
                    rows={2}
                    value={debitNoteForm.reason}
                    onChange={(e) => {
                      setDebitNoteForm({ ...debitNoteForm, reason: e.target.value });
                      if (debitNoteErrors.reason) setDebitNoteErrors({ ...debitNoteErrors, reason: null });
                    }}
                    placeholder="e.g. Damaged Plywood Sheets Returned (5 sheets)"
                    className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none ${
                      debitNoteErrors.reason ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                    }`}
                  />
                  {debitNoteErrors.reason && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{debitNoteErrors.reason}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Amount (₹) *</label>
                    <input
                      type="number"
                      value={debitNoteForm.amount}
                      onChange={(e) => {
                        setDebitNoteForm({ ...debitNoteForm, amount: e.target.value });
                        if (debitNoteErrors.amount) setDebitNoteErrors({ ...debitNoteErrors, amount: null });
                      }}
                      placeholder="e.g. 45000"
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        debitNoteErrors.amount ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {debitNoteErrors.amount && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{debitNoteErrors.amount}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1 block">Issue Date *</label>
                    <input
                      type="date"
                      value={debitNoteForm.issueDate}
                      onChange={(e) => {
                        setDebitNoteForm({ ...debitNoteForm, issueDate: e.target.value });
                        if (debitNoteErrors.issueDate) setDebitNoteErrors({ ...debitNoteErrors, issueDate: null });
                      }}
                      className={`w-full px-3 py-2 rounded-lg border bg-[hsl(var(--background))] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] ${
                        debitNoteErrors.issueDate ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'
                      }`}
                    />
                    {debitNoteErrors.issueDate && <p className="text-xs text-[hsl(var(--destructive))] mt-1">{debitNoteErrors.issueDate}</p>}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDebitNoteModalOpen(false)}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    isLoading={isSubmitting}
                    className="text-xs font-semibold"
                  >
                    Issue Debit Note
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
