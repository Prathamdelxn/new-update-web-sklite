'use client';
import { tr, getLang } from '@/i18n';
import { projectCurrency } from '@/lib/projectCurrency';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Trash2,
  Edit2,
  DownloadCloud,
  Loader2,
  CreditCard,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  Lock,
} from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useSocket } from '@/providers/SocketContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import { Transaction, MaterialPurchase } from '@/types';
import { formatCurrency, formatExactCurrency, MAX_INPUT_VALUE } from '@/lib/utils';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { exportPdf, getPdfOrg, pdfHeaderHtml, pdfSlug, PDF_BASE_CSS, PDF_TERMS } from '@/lib/pdf/pdfExport';

interface TransactionsTabProps {
  projectId: string;
}

type TxType = 'Incoming' | 'Outgoing' | 'Debit Note';
type FilterType = 'All' | 'Incoming' | 'Outgoing' | 'Debit Note';

interface LedgerItem {
  _id: string;
  type: string;
  amount: number;
  partyName: string;
  referenceNumber?: string;
  description?: string;
  date: string;
  paymentMethod?: string;
  category?: string;
  invoiceUrl?: string;
  isPurchase?: boolean;
  linkedPurchase?: string | null;
}

const TX_TYPES: { value: TxType; label: string; description: string; color: string; bg: string; icon: React.ElementType }[] = [
  { value: 'Incoming', label: 'Incoming Funds', description: 'Money received from client or HO', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: ArrowDownLeft },
  { value: 'Outgoing', label: 'Outgoing Payment', description: 'Money paid to vendor or labor', color: 'text-red-600', bg: 'bg-red-50', icon: ArrowUpRight },
  { value: 'Debit Note', label: 'Debit Note', description: 'Adjustments or refunds received', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
];

const FILTERS: FilterType[] = ['All', 'Incoming', 'Outgoing', 'Debit Note'];

function getTxMeta(item: LedgerItem) {
  switch (item.type) {
    case 'Incoming': return { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: ArrowDownLeft, prefix: '+' };
    case 'Outgoing': return { color: 'text-red-600', bg: 'bg-red-50', icon: ArrowUpRight, prefix: '-' };
    case 'Debit Note': return { color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle, prefix: '+' };
    default: return { color: 'text-blue-600', bg: 'bg-blue-50', icon: CreditCard, prefix: '' };
  }
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({ projectId }) => {
  const { project } = useProjectContext();
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'Admin' || (user?.role?.permissions?.includes('*') ?? false);
  const isLocked = isProjectLocked(project);
  const canView = isAdmin || hasProjectPermission(user, project, 'transactions:view');
  const canCreate = !isLocked && (isAdmin || hasProjectPermission(user, project, 'transactions:create'));
  const canUpdate = !isLocked && (isAdmin || hasProjectPermission(user, project, 'transactions:update'));
  const canDelete = !isLocked && (isAdmin || hasProjectPermission(user, project, 'transactions:delete'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');

  const [showTypeSheet, setShowTypeSheet] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<TxType>('Incoming');
  const [amount, setAmount] = useState('');
  const [partyName, setPartyName] = useState('');
  const [description, setDescription] = useState('');

  const [deleteTarget, setDeleteTarget]     = useState<string | null>(null);
  const [deleteIsPurchase, setDeleteIsPurchase] = useState(false);
  const [deleting, setDeleting]             = useState(false);

  const toast = useToast();
  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, purchaseRes] = await Promise.all([
        api.get(`/projects/${projectId}/transactions`),
        api.get(`/projects/${projectId}/material-purchase`),
      ]);
      setTransactions(txRes.data);
      setPurchases(purchaseRes.data);
    } catch {
      toast.error(tr("Failed to load financial data"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    socket.on('transactions:updated', fetchData);
    return () => { socket.off('transactions:updated', fetchData); };
  }, [socket, fetchData]);

  const ledger: LedgerItem[] = transactions
    .filter((t) => t.type === 'Incoming' || t.type === 'Outgoing' || t.type === 'Debit Note' || t.type === 'Purchase Payment')
    .map((t) => ({
      _id: t._id,
      type: t.type,
      amount: t.amount,
      partyName: t.partyName,
      referenceNumber: t.referenceNumber,
      description: t.description,
      date: t.date,
      paymentMethod: t.paymentMethod,
      category: t.category,
      invoiceUrl: t.invoiceUrl,
      linkedPurchase: (typeof t.linkedPurchase === 'object' && t.linkedPurchase !== null
        ? (t.linkedPurchase as any)._id
        : t.linkedPurchase) ?? null,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = ledger.filter((item) => {
    const matchFilter =
      activeFilter === 'All' ||
      item.type === activeFilter;
    const matchSearch =
      !search ||
      item.partyName.toLowerCase().includes(search.toLowerCase()) ||
      (item.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchFilter && matchSearch;
  });

  const totals = ledger.reduce(
    (acc, item) => {
      if (item.type === 'Outgoing') {
        acc.outgoing += item.amount;
      } else if (item.type === 'Incoming' || item.type === 'Debit Note') {
        acc.incoming += item.amount;
      }
      return acc;
    },
    { incoming: 0, outgoing: 0 }
  );
  const netBalance = totals.incoming - totals.outgoing;

  const openForm = (type: TxType) => {
    setEditingTxId(null);
    setTxType(type);
    setAmount('');
    setPartyName('');
    setDescription('');
    setShowTypeSheet(false);
    setTimeout(() => setShowFormModal(true), 150);
  };

  const handleEdit = (item: LedgerItem) => {
    setEditingTxId(item._id);
    setTxType(item.type as TxType);
    setAmount(item.amount.toString());
    setPartyName(item.partyName || '');
    setDescription(item.description || '');
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount)) || !partyName.trim()) {
      toast.error(tr("Amount and party name are required"));
      return;
    }
    if (parseFloat(amount) > MAX_INPUT_VALUE) {
      toast.error(tr("Amount is too large"));
      return;
    }
    setSubmitting(true);
    try {
      if (editingTxId) {
        await api.patch(`/transactions/${editingTxId}`, {
          type: txType,
          amount: parseFloat(amount),
          partyName,
          description,
        });
        toast.success(tr("Transaction updated successfully"));
      } else {
        await api.post(`/projects/${projectId}/transactions`, {
          type: txType,
          amount: parseFloat(amount),
          partyName,
          description,
        });
        toast.success(tr("Transaction recorded successfully"));
      }
      setShowFormModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || tr("Failed to save transaction"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint = deleteIsPurchase
        ? `/material-purchase/${deleteTarget}`
        : `/transactions/${deleteTarget}`;
      await api.delete(endpoint);
      toast.success(deleteIsPurchase ? tr("Purchase deleted") : tr("Transaction deleted"));
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      if (err.response?.status >= 500) {
        toast.success(deleteIsPurchase ? tr("Purchase deleted") : tr("Transaction deleted"));
        setDeleteTarget(null);
        fetchData();
      } else {
        toast.error(err.response?.data?.message || tr("Failed to delete record"));
      }
    } finally {
      setDeleting(false);
    }
  };

  const generateTransactionHTML = (txData: LedgerItem, project: any) => {
    const isIncoming = txData.type === 'Incoming';
    const mainColor = isIncoming ? '#10B981' : '#EF4444';
    const bgColor = isIncoming ? '#ECFDF5' : '#FEF2F2';
    const rtl = getLang() === 'ar';
    const title = isIncoming ? tr('OFFICIAL RECEIPT') : tr('PAYMENT VOUCHER');
    
    // Formatting numbers for the HTML
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return `
      <html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}">
        <head>
          <style>
            body { font-family: ${rtl ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Helvetica', sans-serif"}; padding: 40px; color: #333; direction: ${rtl ? 'rtl' : 'ltr'}; }
            ${rtl ? '.doc-type, .label { letter-spacing: normal !important; text-transform: none !important; }' : ''}
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${mainColor}; padding-bottom: 20px; }
            .title-box { text-align: end; }
            .company-name { color: ${mainColor}; font-size: 28px; font-weight: bold; margin-bottom: 4px; }
            .doc-type { font-size: 20px; font-weight: 800; color: #1E293B; letter-spacing: 1px; }
            .info-section { display: flex; justify-content: space-between; margin-top: 40px; }
            .info-block { flex: 1; }
            .label { color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
            .value { font-size: 15px; font-weight: 600; color: #0F172A; }
            .amount-card { margin-top: 50px; background: ${bgColor}; padding: 40px; border-radius: 20px; text-align: center; border: 1px solid ${mainColor}40; }
            .amount-label { font-size: 13px; color: #64748B; margin-bottom: 10px; font-weight: bold; }
            .amount-value { font-size: 42px; color: #0F172A; font-weight: 900; }
            .details-section { margin-top: 40px; padding: 20px; background: #F8FAFF; border-radius: 12px; }
            .footer { margin-top: 80px; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 20px; color: #94A3B8; font-size: 11px; }
            ${PDF_BASE_CSS}
            .stamp { display: inline-block; margin-top: 20px; padding: 10px 20px; border: 3px double ${mainColor}; color: ${mainColor}; font-weight: bold; border-radius: 8px; transform: rotate(-5deg); opacity: 0.8; }
          </style>
        </head>
        <body>
          ${pdfHeaderHtml({
            docType: title,
            org: getPdfOrg('construction'),
            meta: [
              [tr('Date'), new Date().toLocaleDateString(rtl ? 'ar' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
              [tr('Reference No.'), txData.referenceNumber],
            ],
          })}
          <div class="info-section">
            <div class="info-block">
              <div class="label">${tr('Project Site')}</div>
              <div class="value">${project?.name || tr('N/A')}</div>
            </div>
            <div class="info-block" style="text-align: center;">
              <div class="label">${tr('Reference No.')}</div>
              <div class="value">${txData.referenceNumber || tr('N/A')}</div>
            </div>
            <div class="info-block" style="text-align: end;">
              <div class="label">${isIncoming ? tr('Received From') : tr('Paid To')}</div>
              <div class="value">${txData.partyName}</div>
            </div>
          </div>
          <div class="amount-card">
            <div class="amount-label">${tr('TOTAL TRANSACTION VALUE')}</div>
            <div class="amount-value">${projectCurrency(project)} ${formatNumber(txData.amount)}</div>
            <div class="stamp">${isIncoming ? tr('FUNDS RECEIVED') : tr('PAYMENT RELEASED')}</div>
          </div>
          <div class="details-section">
            <div class="label">${tr('Transaction Particulars')}</div>
            <div style="font-size: 14px; color: #334155; line-height: 1.6; min-height: 60px;">
              ${txData.description || tr('General transaction recorded for project expenditures/receipts.')}
            </div>
            <div style="margin-top: 15px; display: flex; gap: 20px;">
              <div><span class="label">${tr('Payment Mode:')}</span> <span class="value" style="font-size: 13px;">${tr(txData.paymentMethod || 'Bank Transfer')}</span></div>
              <div><span class="label">${tr('Category:')}</span> <span class="value" style="font-size: 13px;">${tr(txData.category || 'Uncategorized')}</span></div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadInvoice = async (item: LedgerItem) => {
    if (item.invoiceUrl) {
      window.open(item.invoiceUrl, '_blank');
    } else {
      toast.success(tr("Generating and downloading invoice..."));
      const htmlContent = generateTransactionHTML(item, project);
      
      try {
        await exportPdf({
          html: htmlContent,
          filename: `${item.type === 'Incoming' ? 'Receipt' : 'Voucher'}_${pdfSlug(item.referenceNumber || item._id)}.pdf`,
          terms: PDF_TERMS.voucher,
        });
      } catch (err) {
        console.error('Error generating PDF:', err);
        toast.error(tr("Failed to generate PDF invoice."));
      }
    }
  };

  // Loading state handled by Skeleton wrapper

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-slate-500">{tr("You don't have permission to view the Transaction Management module.")}</p>
      </div>
    );
  }

  return (
    <SkeletonLoader loading={loading} preset="table">
      <div className="space-y-6">
        {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <div className="md:col-span-1 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 flex flex-col items-center justify-center">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{tr("Net Balance")}</span>
          </div>
          <p className={`text-3xl font-bold mt-1 text-center break-all ${netBalance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            {formatExactCurrency(netBalance, projectCurrency(project as any))}
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{tr("Inflow")}</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1 break-all">{formatExactCurrency(totals.incoming, projectCurrency(project as any))}</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{tr("Outflow")}</p>
            <p className="text-2xl font-bold text-red-600 mt-1 break-all">{formatExactCurrency(totals.outgoing, projectCurrency(project as any))}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 w-full sm:w-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-2xs ${
                activeFilter === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {tr(f)}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={tr("Search records...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 ps-9 pe-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            />
          </div>
          {canCreate && (
          <button
            onClick={() => setShowTypeSheet(true)}
            className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tr("Add Record")}</span>
          </button>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{tr("Financial Ledger")}</p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">{tr("No records found")}</h3>
            <p className="text-slate-500 text-sm">
              {search ? tr("No records match your search.") : tr("Add a transaction to get started.")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const { color, bg, icon: Icon, prefix } = getTxMeta(item);
              return (
                <div key={item._id} className="flex items-center px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${bg} flex items-center justify-center shrink-0 me-3 sm:me-4`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{tr(item.partyName)}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                      {tr(item.type)}
                      {item.paymentMethod && !item.isPurchase && ` · ${item.paymentMethod}`}
                      {' · '}
                      {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {item.description && (
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{tr(item.description)}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-4 ms-3 sm:ms-4 min-w-0 max-w-[45%] sm:max-w-[55%]">
                    <p className={`text-sm sm:text-base font-bold ${color} tabular-nums break-all text-end`}>
                      {tr(prefix)}{formatExactCurrency(item.amount, projectCurrency(project as any))}
                    </p>
                    <button
                      onClick={() => handleDownloadInvoice(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all shrink-0"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    {item.linkedPurchase ? (
                      <span
                        title={tr("Auto-generated from a Purchase Order — edit or cancel the PO to change this entry")}
                        className="p-1.5 rounded-lg text-slate-300 shrink-0"
                      >
                        <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </span>
                    ) : (
                      <>
                        {!item.isPurchase && canUpdate && (
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all shrink-0"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => { setDeleteIsPurchase(!!item.isPurchase); setDeleteTarget(item._id); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Type Selection Sheet */}
      {showTypeSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowTypeSheet(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-gray-900">{tr("Record Transaction")}</h3>
              <button onClick={() => setShowTypeSheet(false)} className="p-2 rounded-xl text-slate-400 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {TX_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => openForm(t.value)}
                  className="w-full flex items-center space-x-4 p-4 rounded-2xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-start group"
                >
                  <div className={`w-12 h-12 rounded-xl ${t.bg} flex items-center justify-center shrink-0`}>
                    <t.icon className={`w-6 h-6 ${t.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{tr(t.label)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{tr(t.description)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Form */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFormModal(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{editingTxId ? tr("Edit") : tr("New")} {tr(txType)}</h3>
              <button onClick={() => setShowFormModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{tr("Amount ({{currency}}) *", { currency: projectCurrency(project as any) })}</label>
                <input
                  type="number"
                  min={0}
                  max={MAX_INPUT_VALUE}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  {txType === 'Incoming' ? tr("Received From") : txType === 'Outgoing' ? tr("Paid To") : tr("Issued To")} *
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder={tr("Name of party...")}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{tr("Description / Remarks (Optional)")}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={tr("Enter any notes...")}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
              <button
                onClick={handleSave}
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm shadow-blue-600/20"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{tr("Save Transaction")}</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl p-8 shadow-2xl w-full max-w-sm mx-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">{tr("Delete ")}{deleteIsPurchase ? tr("Purchase") : tr("Transaction")}</h3>
            <p className="text-slate-500 text-sm text-center mb-6">{tr("This will permanently remove this ")}{deleteIsPurchase ? tr("purchase order") : tr("financial record")}{tr(". This action cannot be undone.")}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
              >
                {tr("Cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors flex items-center justify-center"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : tr("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </SkeletonLoader>
  );
};
