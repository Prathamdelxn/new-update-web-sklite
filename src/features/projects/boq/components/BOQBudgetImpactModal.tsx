import React from 'react';
import { X, TrendingUp, TrendingDown, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BudgetImpactData {
  oldAmount: number;
  newAmount: number;
  difference: number;
  reason: string;
  itemId: string | null;
}

interface BOQBudgetImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  impactData: BudgetImpactData | null;
}

export const BOQBudgetImpactModal: React.FC<BOQBudgetImpactModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  impactData
}) => {
  if (!isOpen || !impactData) return null;

  const isIncrease = impactData.difference >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700">
            <Info className="w-5 h-5" />
            <h3 className="text-lg font-bold">Budget Impact Warning</h3>
          </div>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <p className="text-sm text-slate-600">
            Approving this revised BOQ item will update the project's overall budget. Please review the financial impact before confirming.
          </p>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Previous Cost</p>
              <p className="text-lg font-bold text-slate-500">${impactData.oldAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-8 border-t-2 border-dashed border-gray-200" />
            <div className="space-y-1 text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Cost</p>
              <p className="text-lg font-bold text-gray-900">${impactData.newAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className={cn(
            "rounded-xl p-4 flex items-start gap-3",
            isIncrease ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
              isIncrease ? "bg-amber-100" : "bg-emerald-100"
            )}>
              {isIncrease ? <TrendingUp className="w-5 h-5 text-amber-600" /> : <TrendingDown className="w-5 h-5 text-emerald-600" />}
            </div>
            <div>
              <p className="font-bold">
                Budget {isIncrease ? 'Increase' : 'Decrease'} of ${Math.abs(impactData.difference).toLocaleString('en-IN')}
              </p>
              <p className="text-xs opacity-80 mt-1 italic leading-snug">
                "{impactData.reason}"
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-sm shadow-indigo-600/20"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Approve & Update Budget
          </button>
        </div>
      </div>
    </div>
  );
};
