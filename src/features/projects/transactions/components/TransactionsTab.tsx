'use client';

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
} from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useSocket } from '@/providers/SocketContext';
import { Transaction, MaterialPurchase } from '@/types';
import { formatCurrency, formatExactCurrency } from '@/lib/utils';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';

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
      toast.error('Failed to load financial data');
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
    .filter((t) => t.type === 'Incoming' || t.type === 'Outgoing' || t.type === 'Debit Note')
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
      toast.error('Amount and party name are required');
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
        toast.success('Transaction updated successfully');
      } else {
        await api.post(`/projects/${projectId}/transactions`, {
          type: txType,
          amount: parseFloat(amount),
          partyName,
          description,
        });
        toast.success('Transaction recorded successfully');
      }
      setShowFormModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save transaction');
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
      toast.success(deleteIsPurchase ? 'Purchase deleted' : 'Transaction deleted');
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      if (err.response?.status >= 500) {
        toast.success(deleteIsPurchase ? 'Purchase deleted' : 'Transaction deleted');
        setDeleteTarget(null);
        fetchData();
      } else {
        toast.error(err.response?.data?.message || 'Failed to delete record');
      }
    } finally {
      setDeleting(false);
    }
  };

  const generateTransactionHTML = (txData: LedgerItem, project: any) => {
    const isIncoming = txData.type === 'Incoming';
    const mainColor = isIncoming ? '#10B981' : '#EF4444';
    const bgColor = isIncoming ? '#ECFDF5' : '#FEF2F2';
    const title = isIncoming ? 'OFFICIAL RECEIPT' : 'PAYMENT VOUCHER';
    
    // Formatting numbers for the HTML
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${mainColor}; padding-bottom: 20px; }
            .title-box { text-align: right; }
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
            .stamp { display: inline-block; margin-top: 20px; padding: 10px 20px; border: 3px double ${mainColor}; color: ${mainColor}; font-weight: bold; border-radius: 8px; transform: rotate(-5deg); opacity: 0.8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-name">Sky-Lite</div>
              <div style="font-size: 13px; color: #64748B;">Construction Management Solutions</div>
            </div>
            <div class="title-box">
              <div class="doc-type">${title}</div>
              <div style="font-size: 13px; color: #64748B; margin-top: 5px;">Date: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
          <div class="info-section">
            <div class="info-block">
              <div class="label">Project Site</div>
              <div class="value">${project?.name || 'N/A'}</div>
            </div>
            <div class="info-block" style="text-align: center;">
              <div class="label">Reference No.</div>
              <div class="value">${txData.referenceNumber || 'N/A'}</div>
            </div>
            <div class="info-block" style="text-align: right;">
              <div class="label">${isIncoming ? 'Received From' : 'Paid To'}</div>
              <div class="value">${txData.partyName}</div>
            </div>
          </div>
          <div class="amount-card">
            <div class="amount-label">TOTAL TRANSACTION VALUE</div>
            <div class="amount-value">${project?.currency || '$'} ${formatNumber(txData.amount)}</div>
            <div class="stamp">${isIncoming ? 'FUNDS RECEIVED' : 'PAYMENT RELEASED'}</div>
          </div>
          <div class="details-section">
            <div class="label">Transaction Particulars</div>
            <div style="font-size: 14px; color: #334155; line-height: 1.6; min-height: 60px;">
              ${txData.description || 'General transaction recorded for project expenditures/receipts.'}
            </div>
            <div style="margin-top: 15px; display: flex; gap: 20px;">
              <div><span class="label">Payment Mode:</span> <span class="value" style="font-size: 13px;">${txData.paymentMethod || 'Bank Transfer'}</span></div>
              <div><span class="label">Category:</span> <span class="value" style="font-size: 13px;">${txData.category || 'Uncategorized'}</span></div>
            </div>
          </div>
          <div class="footer">
            This document is a digitally generated ${title.toLowerCase()} from the Sky-Lite Web Platform.<br/>
            &copy; ${new Date().getFullYear()} Sky-Lite Systems. All rights reserved.
          </div>
        </body>
      </html>
    `;
  };

  const handleDownloadInvoice = async (item: LedgerItem) => {
    if (item.invoiceUrl) {
      window.open(item.invoiceUrl, '_blank');
    } else {
      toast.success('Generating and downloading invoice...');
      const htmlContent = generateTransactionHTML(item, project);
      
      try {
        // Dynamically import to avoid SSR issues
        const html2pdf = (await import('html2pdf.js')).default;
        
        const element = document.createElement('div');
        element.innerHTML = htmlContent;
        
        const opt = {
          margin:       0,
          filename:     `tx_inv_${item._id}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { scale: 2 },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
        };

        html2pdf().set(opt).from(element).save();
      } catch (err) {
        console.error('Error generating PDF:', err);
        toast.error('Failed to generate PDF invoice.');
      }
    }
  };

  // Loading state handled by Skeleton wrapper

  return (
    <SkeletonLoader loading={loading} preset="table">
      <div className="space-y-6">
        {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center justify-center">
          <div className="flex items-center space-x-2 mb-1">
            <Wallet className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Balance</span>
          </div>
          <p className={`text-3xl font-black mt-1 ${netBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatExactCurrency(netBalance, (project as any)?.currency || '$')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inflow</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{formatExactCurrency(totals.incoming, (project as any)?.currency || '$')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outflow</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{formatExactCurrency(totals.outgoing, (project as any)?.currency || '$')}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 w-full sm:w-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                activeFilter === f
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowTypeSheet(true)}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shadow-blue-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Financial Ledger</p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No records found</h3>
            <p className="text-slate-500 text-sm">
              {search ? 'No records match your search.' : 'Add a transaction to get started.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const { color, bg, icon: Icon, prefix } = getTxMeta(item);
              return (
                <div key={item._id} className="flex items-center px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${bg} flex items-center justify-center shrink-0 mr-3 sm:mr-4`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{item.partyName}</p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                      {item.type}
                      {item.paymentMethod && !item.isPurchase && ` · ${item.paymentMethod}`}
                      {' · '}
                      {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {item.description && (
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-4 ml-3 sm:ml-4">
                    <p className={`text-sm sm:text-base font-black ${color} tabular-nums whitespace-nowrap`}>
                      {prefix}{formatExactCurrency(item.amount, (project as any)?.currency || '$')}
                    </p>
                    <button
                      onClick={() => handleDownloadInvoice(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all shrink-0"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    {!item.isPurchase && (
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => { setDeleteIsPurchase(!!item.isPurchase); setDeleteTarget(item._id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
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
              <h3 className="text-xl font-black text-gray-900">Record Transaction</h3>
              <button onClick={() => setShowTypeSheet(false)} className="p-2 rounded-xl text-slate-400 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {TX_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => openForm(t.value)}
                  className="w-full flex items-center space-x-4 p-4 rounded-2xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <div className={`w-12 h-12 rounded-xl ${t.bg} flex items-center justify-center shrink-0`}>
                    <t.icon className={`w-6 h-6 ${t.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700">{t.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
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
              <h3 className="text-xl font-black text-gray-900">{editingTxId ? 'Edit' : 'New'} {txType}</h3>
              <button onClick={() => setShowFormModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Amount ($) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  {txType === 'Incoming' ? 'Received From' : txType === 'Outgoing' ? 'Paid To' : 'Issued To'} *
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Name of party..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Description / Remarks (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter any notes..."
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
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Save Transaction</span>}
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
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">Delete {deleteIsPurchase ? 'Purchase' : 'Transaction'}</h3>
            <p className="text-slate-500 text-sm text-center mb-6">This will permanently remove this {deleteIsPurchase ? 'purchase order' : 'financial record'}. This action cannot be undone.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors flex items-center justify-center"
              >
                {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </SkeletonLoader>
  );
};
