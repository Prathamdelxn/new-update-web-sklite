'use client';

import { Info, X } from 'lucide-react';

interface AppInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AppInfoModal({
  open,
  onClose,
}: AppInfoModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95 duration-200">

        {/* Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <div className="text-center">

          {/* App Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
            <Info className="w-10 h-10 text-blue-600" />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-slate-900">
            Sky Lite
          </h2>

          {/* Version */}
          <div className="inline-flex items-center mt-4 px-4 py-1.5 rounded-full bg-blue-50">
            <span className="text-blue-600 font-semibold text-sm">
              Version 2.1.0 (Arctic)
            </span>
          </div>

          {/* Description */}
          <p className="mt-6 text-slate-500 text-base leading-7 px-2">
            Sky Lite is a comprehensive construction and project
            management platform designed for precision,
            collaboration and scalability.
          </p>

          {/* App Details */}
          <div className="mt-6 space-y-2 text-sm text-slate-500">

            <div className="flex justify-between border-b pb-2">
              <span>Platform</span>
              <span className="font-medium text-slate-700">Web</span>
            </div>

            <div className="flex justify-between border-b pb-2">
              <span>Build</span>
              <span className="font-medium text-slate-700">2.1.0</span>
            </div>

            <div className="flex justify-between">
              <span>Environment</span>
              <span className="font-medium text-slate-700">Production</span>
            </div>

          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-3.5 text-base font-semibold transition"
          >
            Close
          </button>

        </div>
      </div>
    </div>
  );
}