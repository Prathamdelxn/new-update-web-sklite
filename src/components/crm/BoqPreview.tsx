'use client';

import React from 'react';
import { Printer, Pencil, Lock, Layers, CheckCircle2, FileText, Tag, Calculator, AlertTriangle } from 'lucide-react';
import { cn, parseMaxBudget } from '@/lib/utils';

interface BoqPreviewProps {
  lead: any;
  boqIndex: number;
  onSuccess?: () => void;
  onEdit?: () => void;
}

const getCategoryBadgeClass = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('floor')) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  if (cat.includes('carpent') || cat.includes('wood') || cat.includes('furnit')) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  if (cat.includes('elect') || cat.includes('light')) return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
  if (cat.includes('plumb') || cat.includes('sanit')) return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20';
  if (cat.includes('paint') || cat.includes('wall')) return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
  if (cat.includes('ceil') || cat.includes('rcp')) return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
  if (cat.includes('civil') || cat.includes('mason') || cat.includes('demolit')) return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
  if (cat.includes('hardw') || cat.includes('glass') || cat.includes('metal')) return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
  return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20';
};

export function BoqPreview({ lead, boqIndex, onEdit }: BoqPreviewProps) {
  const boq = lead?.boqs?.[boqIndex];
  const hasAcceptedQuote = lead?.quotations && lead.quotations.some((q: any) => q.status === 'Accepted');
  const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead?.status || '') || Boolean(lead?.linkedProject);
  const isLocked = isQuotationApproved;

  const maxBudget = parseMaxBudget(lead?.budgetRange || lead?.estimatedBudget || lead?.budget);
  const totalBoqAmount = boq?.totalAmount || 0;
  const isOverBudget = Boolean(maxBudget && maxBudget > 0 && totalBoqAmount > maxBudget);
  const excessAmount = isOverBudget ? totalBoqAmount - (maxBudget || 0) : 0;
  const excessPercentage = isOverBudget && maxBudget ? ((totalBoqAmount - maxBudget) / maxBudget) * 100 : 0;

  const categorySubtotals = React.useMemo(() => {
    if (!boq?.items) return [];
    const map = new Map<string, { count: number; total: number }>();
    for (const it of boq.items) {
      const cat = it.category || 'General';
      const existing = map.get(cat) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(it.amount) || (Number(it.quantity) * Number(it.rate)) || 0;
      map.set(cat, existing);
    }
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [boq?.items]);

  const handlePrint = () => {
    window.print();
  };

  if (!boq) return null;

  return (
    <div className="space-y-4">
      {/* Category Breakdown Chips */}
      {categorySubtotals.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x print:hidden">
          {categorySubtotals.map((cat) => (
            <div
              key={cat.name}
              className={cn(
                "px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 shrink-0 bg-[hsl(var(--card))]",
                getCategoryBadgeClass(cat.name)
              )}
            >
              <Tag size={12} />
              <span>{cat.name}</span>
              <span className="opacity-60 text-[10px]">({cat.count})</span>
              <span className="font-extrabold text-[hsl(var(--foreground))]">₹{cat.total.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      {/* BOQ Render Container */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] font-extrabold text-[11px] uppercase tracking-wider border-b border-[hsl(var(--border))]">
                <th className="p-3.5 w-12 text-center">#</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 min-w-[200px]">Item Description & Specs</th>
                <th className="p-3.5 text-right">Quantity</th>
                <th className="p-3.5 text-center">Unit</th>
                <th className="p-3.5 text-right">Rate (₹)</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {boq.items?.map((item: any, idx: number) => (
                <tr key={item._id || idx} className="hover:bg-[hsl(var(--muted)/0.25)] transition-colors group">
                  <td className="p-3.5 text-center font-mono font-bold text-[hsl(var(--muted-foreground))]">{item.serialNumber || idx + 1}</td>
                  <td className="p-3.5">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg font-extrabold text-[10px] border tracking-wider uppercase inline-block",
                      getCategoryBadgeClass(item.category)
                    )}>
                      {item.category || 'General'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-xs text-[hsl(var(--foreground))] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.itemName}</div>
                    {item.description && (
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-relaxed">{item.description}</div>
                    )}
                  </td>
                  <td className="p-3.5 text-right font-bold text-xs">{item.quantity?.toLocaleString('en-IN')}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">
                      {item.unit || 'Nos'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-semibold text-xs text-[hsl(var(--muted-foreground))]">
                    ₹{item.rate?.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3.5 text-right font-black text-xs text-[hsl(var(--foreground))]">
                    ₹{item.amount?.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes Footer */}
        {isOverBudget && (
          <div className="p-3 sm:p-4 bg-rose-500/[0.08] border-t border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                <strong>Over Target Budget Warning:</strong> Current BOQ total of ₹{totalBoqAmount.toLocaleString('en-IN')} exceeds estimated target budget of ₹{maxBudget?.toLocaleString('en-IN')} ({lead?.budgetRange || 'Estimate'}) by <strong className="font-extrabold text-rose-600 dark:text-rose-400">₹{excessAmount.toLocaleString('en-IN')}</strong>.
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 shrink-0">
              +{excessPercentage.toFixed(1)}% Over Budget
            </span>
          </div>
        )}

        <div className="p-4 sm:p-5 bg-[hsl(var(--muted)/0.2)] border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Estimator Remarks & Assumptions
            </p>
            <p className="text-xs text-[hsl(var(--foreground))] font-medium whitespace-pre-wrap leading-relaxed">
              {boq.notes || 'Standard specifications applied based on 2D layouts and design requirements.'}
            </p>
          </div>

          <div className={cn(
            "flex items-center gap-4 self-end sm:self-auto border p-3 sm:p-4 rounded-2xl shrink-0 shadow-xs transition-colors",
            isOverBudget
              ? "bg-rose-500/[0.06] border-rose-500/30"
              : "bg-[hsl(var(--card))] border-[hsl(var(--border))]"
          )}>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
                  Total BOQ Amount
                </span>
                {isOverBudget && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Exceeded
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xl sm:text-2xl font-black",
                isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"
              )}>
                ₹{(boq.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="p-2.5 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-all active:scale-95 cursor-pointer print:hidden"
              title="Print BOQ Document"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

