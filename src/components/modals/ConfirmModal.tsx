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
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 overflow-visible">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-slate-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="mb-4 p-3 rounded-2xl bg-gray-50 border border-gray-200">
                  {getIcon()}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-3 px-4 rounded-xl text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg ${getConfirmButtonStyles()}`}
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
