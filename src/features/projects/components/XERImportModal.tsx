'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileText, CheckCircle2, Loader2,
  AlertTriangle, RotateCcw, Download,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';

interface XERImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

type Step = 'upload' | 'importing' | 'done';

export const XERImportModal: React.FC<XERImportModalProps> = ({
  isOpen, onClose, onSuccess, projectId,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const reset = () => {
    setStep('upload');
    setFile(null);
    setImportedCount(0);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleImport = async (selectedFile: File) => {
    setStep('importing');
    setError(null);
    try {
      const fileContent = await selectedFile.text();
      const res = await api.post(`/projects/${projectId}/milestones/import-xer`, { fileContent });
      const count = res.data?.milestones?.length ?? 0;
      setImportedCount(count);
      setStep('done');
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to import XER file';
      setError(msg);
      setStep('upload');
    }
  };

  const handleFileSelect = (f: File) => {
    if (!f.name.endsWith('.xer')) {
      toast.error('Please select a valid .xer file');
      return;
    }
    setFile(f);
    handleImport(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg relative z-10"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Primavera P6</p>
                    <h2 className="text-base font-bold text-gray-900">Import XER File</h2>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">

                {/* ── Upload step ── */}
                {step === 'upload' && (
                  <div className="space-y-4">
                    {/* Info banner */}
                    <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl">
                      <p className="text-sm font-bold text-violet-800">What happens when you import?</p>
                      <ul className="mt-1.5 space-y-1 text-xs text-violet-700">
                        <li>· WBS top-level nodes become <strong>Milestones</strong></li>
                        <li>· Activity tasks become <strong>Milestone sub-tasks</strong></li>
                        <li>· Dates and status are mapped from P6 fields</li>
                      </ul>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    )}

                    {/* Drop zone */}
                    <label
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all ${
                        dragOver
                          ? 'border-violet-400 bg-violet-50'
                          : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/40'
                      }`}
                    >
                      <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        accept=".xer"
                        onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                      />
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <Upload className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-gray-900 mb-1">
                        {dragOver ? 'Drop it here' : 'Click or drag & drop'}
                      </p>
                      <p className="text-xs text-slate-400">.xer — Primavera P6 export</p>
                    </label>
                  </div>
                )}

                {/* ── Importing step ── */}
                {step === 'importing' && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-700">Parsing & importing milestones…</p>
                      <p className="text-xs text-slate-400 mt-1">{file?.name}</p>
                    </div>
                  </div>
                )}

                {/* ── Done step ── */}
                {step === 'done' && (
                  <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900">Import Complete</p>
                      <p className="text-sm text-slate-500 mt-1">
                        <span className="font-bold text-emerald-600">{importedCount}</span> milestone{importedCount !== 1 ? 's' : ''} created from <span className="font-semibold">{file?.name}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                {step === 'done' ? (
                  <>
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 text-sm font-semibold transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Import Another
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-sm"
                    >
                      Done
                    </button>
                  </>
                ) : step === 'upload' ? (
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
