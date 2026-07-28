'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-red-50 border border-red-200 mb-8">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>

        <h1 className="text-8xl font-extrabold text-gray-900 mb-2">500</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Something Went Wrong</h2>
        <p className="text-slate-500 mb-3 leading-relaxed">
          An unexpected error occurred. The team has been notified. You can try refreshing the page or go back to the dashboard.
        </p>

        {error.digest && (
          <p className="text-[11px] font-mono text-slate-400 bg-gray-100 rounded-lg px-3 py-1.5 inline-block mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-200 text-slate-600 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
