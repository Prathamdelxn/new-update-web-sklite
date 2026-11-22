'use client';
import { tr } from '@/i18n';

import { Info, X, CheckCircle2 } from 'lucide-react';

interface AppInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AppInfoModal({ open, onClose }: AppInfoModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-sm border border-slate-300 p-5 z-10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          {/* App Icon */}
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 border border-blue-150 flex items-center justify-center mb-3">
            <Info className="w-6 h-6 text-blue-600" />
          </div>

          {/* Title */}
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            {tr("SkyStruct Lite")}
          </h2>

          {/* Version Tag */}
          <div className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200">
            <span className="text-blue-700 font-bold text-[10.5px]">
              {tr("Version 2.1.0 (Arctic)")}
            </span>
          </div>

          {/* Description */}
          <p className="mt-3 text-slate-500 text-xs leading-relaxed">
            {tr("Enterprise construction and project management platform designed for site precision, collaboration, and scalability.")}
          </p>

          {/* App Details Table */}
          <div className="mt-4 space-y-1.5 text-xs text-slate-500 bg-slate-50/70 border border-slate-200/90 rounded-xl p-3">
            <div className="flex justify-between pb-1 border-b border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-400">{tr("Platform")}</span>
              <span className="font-bold text-slate-800 text-[11px]">{tr("Web Application")}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-400">{tr("Build")}</span>
              <span className="font-bold text-slate-800 text-[11px]">{tr("2.1.0-prod")}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[11px] font-semibold text-slate-400">{tr("Environment")}</span>
              <span className="font-bold text-emerald-700 text-[11px]">{tr("Production (Live)")}</span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 text-xs font-bold transition cursor-pointer"
          >
            {tr("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
