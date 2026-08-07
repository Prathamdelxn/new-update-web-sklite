'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export interface PromptOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  prompt: (options: PromptOptions | string) => Promise<string | null>;
  alert: (message: string, title?: string) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'confirm' | 'prompt' | 'alert';
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    inputValue: string;
    placeholder: string;
    resolve: ((value: any) => void) | null;
  }>({
    isOpen: false,
    mode: 'confirm',
    title: 'Confirm Action',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    inputValue: '',
    placeholder: '',
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setModalState({
        isOpen: true,
        mode: 'confirm',
        title: opts.title || 'Are you sure?',
        message: opts.message,
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        type: opts.type || 'danger',
        inputValue: '',
        placeholder: '',
        resolve: resolve as any,
      });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions | string): Promise<string | null> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setModalState({
        isOpen: true,
        mode: 'prompt',
        title: opts.title || 'Input Required',
        message: opts.message,
        confirmText: opts.confirmText || 'Submit',
        cancelText: opts.cancelText || 'Cancel',
        type: 'info',
        inputValue: opts.defaultValue || '',
        placeholder: opts.placeholder || '',
        resolve: resolve as any,
      });
    });
  }, []);

  const alert = useCallback((message: string, title = 'Notice'): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        mode: 'alert',
        title,
        message,
        confirmText: 'OK',
        cancelText: '',
        type: 'info',
        inputValue: '',
        placeholder: '',
        resolve: resolve as any,
      });
    });
  }, []);

  const handleClose = (result: any) => {
    if (modalState.resolve) {
      modalState.resolve(result);
    }
    setModalState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  const getIcon = () => {
    switch (modalState.type) {
      case 'danger':
        return <AlertTriangle className="w-8 h-8 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-emerald-500" />;
      case 'info':
      default:
        return <Info className="w-8 h-8 text-blue-500" />;
    }
  };

  const getButtonStyles = () => {
    switch (modalState.type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25';
      case 'info':
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25';
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      <AnimatePresence>
        {modalState.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleClose(modalState.mode === 'prompt' ? null : false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleClose(modalState.mode === 'prompt' ? null : false)}
                className="absolute right-4 top-4 p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-4 rounded-2xl bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center">
                  {getIcon()}
                </div>

                <h3 className="text-xl font-extrabold text-[hsl(var(--foreground))] tracking-tight mb-2">
                  {modalState.title}
                </h3>

                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed mb-5">
                  {modalState.message}
                </p>

                {modalState.mode === 'prompt' && (
                  <input
                    type="text"
                    autoFocus
                    value={modalState.inputValue}
                    onChange={(e) => setModalState((prev) => ({ ...prev, inputValue: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleClose(modalState.inputValue);
                    }}
                    placeholder={modalState.placeholder}
                    className="w-full px-4 py-3 mb-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] focus:border-indigo-500 outline-none"
                  />
                )}

                <div className="flex items-center justify-end gap-3 w-full">
                  {modalState.mode !== 'alert' && (
                    <button
                      type="button"
                      onClick={() => handleClose(modalState.mode === 'prompt' ? null : false)}
                      className="flex-1 py-3 px-4 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] font-semibold text-sm transition-all border border-[hsl(var(--border))] active:scale-[0.98]"
                    >
                      {modalState.cancelText}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleClose(modalState.mode === 'prompt' ? modalState.inputValue : true)
                    }
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98] ${getButtonStyles()}`}
                  >
                    {modalState.confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
