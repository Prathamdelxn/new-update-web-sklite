'use client';

import React, { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loading: (message: string) => string;
  dismiss: (toastId?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const success = (message: string) => {
    toast.success(message, {
      style: {
        background: 'rgba(15, 23, 42, 0.8)',
        color: '#fff',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
      },
      iconTheme: {
        primary: '#10B981',
        secondary: '#fff',
      },
    });
  };

  const error = (message: string) => {
    toast.error(message, {
      style: {
        background: 'rgba(15, 23, 42, 0.8)',
        color: '#fff',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
      },
      iconTheme: {
        primary: '#EF4444',
        secondary: '#fff',
      },
    });
  };

  const info = (message: string) => {
    toast(message, {
      style: {
        background: 'rgba(15, 23, 42, 0.8)',
        color: '#fff',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
      },
      icon: 'ℹ️',
    });
  };

  const loading = (message: string) => {
    return toast.loading(message, {
      style: {
        background: 'rgba(15, 23, 42, 0.8)',
        color: '#fff',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
      },
    });
  };

  const dismiss = (toastId?: string) => {
    toast.dismiss(toastId);
  };

  return (
    <ToastContext.Provider value={{ success, error, info, loading, dismiss }}>
      {children}
      <Toaster position="top-right" />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
