'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface InteriorDeleteLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  leadName?: string;
  isLoading?: boolean;
}

export const InteriorDeleteLeadModal: React.FC<InteriorDeleteLeadModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 md:p-7 overflow-hidden"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="absolute right-4 top-4 p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Animated Trash Icon Header */}
              <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-8 h-8" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-extrabold text-[hsl(var(--foreground))] tracking-tight mb-2">
                Delete Lead
              </h3>

              {/* Description */}
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed mb-4">
                Are you sure you want to delete{' '}
                {leadName ? (
                  <span className="font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md border border-[hsl(var(--border))]">
                    <span className="font-bold text-[hsl(var(--foreground))] truncate max-w-[200px] inline-block align-bottom" title={leadName}>{leadName}</span>
                  </span>
                ) : (
                  'this lead'
                )}
                ?
              </p>

              <div className="w-full p-3 mb-6 bg-rose-500/5 border border-rose-500/15 rounded-2xl text-left flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-600 font-medium leading-normal">
                  This action cannot be undone. All site visits, requirements, quotations, and activity history for this lead will be permanently deleted.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] font-semibold text-sm transition-all border border-[hsl(var(--border))] disabled:opacity-50 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Lead</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
