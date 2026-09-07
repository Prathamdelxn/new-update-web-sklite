'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'success' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger': return <AlertTriangle className="w-10 h-10 text-red-500" />;
      case 'success': return <CheckCircle className="w-10 h-10 text-emerald-500" />;
      case 'info': return <Info className="w-10 h-10 text-blue-500" />;
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'danger': return 'bg-red-600 hover:bg-red-500 shadow-red-600/20';
      case 'success': return 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20';
      case 'info': return 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-6 sm:p-7 overflow-visible">
              <button
                onClick={onClose}
                className="absolute right-5 top-5 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-150 shadow-2xs">
                  {getIcon()}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1.5 tracking-tight">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{message}</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-md ${getConfirmButtonStyles()}`}
                >
                  {isLoading ? 'Processing...' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
