import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BOQRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading: boolean;
}

export const BOQRejectionModal: React.FC<BOQRejectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading
}) => {
  const [reason, setReason] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-lg font-bold">Reject BOQ Item</h3>
          </div>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 mb-4">
            Please provide a reason for rejecting this item. The creator will see this reason and will need to update the item before re-submitting.
          </p>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              placeholder="E.g., The unit cost is higher than the approved budget."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all min-h-[100px] resize-none"
              autoFocus
            />
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
            onClick={() => onConfirm(reason)}
            disabled={isLoading || !reason.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-500 transition-all disabled:opacity-50 shadow-sm shadow-red-600/20"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};
