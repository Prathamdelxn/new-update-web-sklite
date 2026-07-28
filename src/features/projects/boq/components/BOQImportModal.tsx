'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Upload, FileSpreadsheet, Download,
  CheckCircle2, AlertTriangle, ChevronRight, RotateCcw
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';

interface BOQImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

interface PreviewItem {
  groupName: string;
  itemNumber: string;
  itemDescription: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  remark: string;
}

type Step = 'upload' | 'preview' | 'importing';

const TEMPLATE_COLUMNS = ['Group Name', 'Item Number', 'Item Description', 'Unit', 'Quantity', 'Unit Cost', 'Remark'];

const downloadTemplate = () => {
  const sample = [
    ['Concrete Works', 'CW-01', 'M20 Grade Concrete for Foundation', 'Cum', 50, 6500, 'As per drawing'],
    ['Steel Works', 'SW-01', 'Fe500 TMT Bars 12mm dia', 'MT', 2.5, 65000, ''],
    ['Masonry', 'MA-01', 'Brick Masonry in CM 1:6', 'Sqm', 120, 850, ''],
  ];
  const header = TEMPLATE_COLUMNS.join(',');
  const rows = sample.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'BOQ_Template.csv';
  a.click();
  URL.revokeObjectURL(url);
};

export const BOQImportModal: React.FC<BOQImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreviewItems([]);
    setEstimatedTotal(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sendFile = async (selectedFile: File, action: 'preview' | 'confirm') => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('action', action);
    return api.post(`/projects/${projectId}/boq/import`, formData);
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreviewing(true);
    try {
      const res = await sendFile(selectedFile, 'preview');
      setPreviewItems(res.data.preview ?? []);
      setEstimatedTotal(res.data.estimatedTotal ?? 0);
      setStep('preview');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to parse file. Check column names match the template.');
      setFile(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleConfirm = async () => {
    if (!file) return;
    setStep('importing');
    try {
      await sendFile(file, 'confirm');
      toast.success(`${previewItems.length} BOQ items imported successfully!`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
      setStep('preview');
    }
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
            className="w-full max-w-2xl relative z-10"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      {step === 'upload' ? 'Step 1 of 2' : step === 'preview' ? 'Step 2 of 2' : 'Importing'}
                    </p>
                    <h2 className="text-base font-bold text-gray-900">
                      {step === 'upload' ? 'Upload BOQ Sheet' : step === 'preview' ? 'Preview & Confirm' : 'Importing BOQ…'}
                    </h2>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                {/* ── Step 1: Upload ── */}
                {step === 'upload' && (
                  <div className="space-y-4">
                    {/* Template download */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-blue-800">Required columns</p>
                        <p className="text-xs text-blue-600 mt-0.5">{TEMPLATE_COLUMNS.join(' · ')}</p>
                      </div>
                      <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Template
                      </button>
                    </div>

                    {/* Drop zone */}
                    <label
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all ${
                        dragOver
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                      }`}
                    >
                      <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                        onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                      />
                      {previewing ? (
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                            <Upload className="w-7 h-7 text-slate-400" />
                          </div>
                          <p className="text-sm font-bold text-gray-900 mb-1">
                            {dragOver ? 'Drop it here' : 'Click or drag & drop'}
                          </p>
                          <p className="text-xs text-slate-400">.xlsx · .xls · .csv — max 5 MB</p>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {/* ── Step 2: Preview ── */}
                {step === 'preview' && (
                  <div className="space-y-4">
                    {/* Summary bar */}
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-bold text-emerald-800">{previewItems.length} items ready to import</p>
                          <p className="text-xs text-emerald-600">from <span className="font-semibold">{file?.name}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estimated Total</p>
                        <p className="text-lg font-black text-emerald-700">${estimatedTotal.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Preview table */}
                    <div className="overflow-auto rounded-xl border border-gray-200 max-h-64">
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <tr>
                            {['Group', 'Item #', 'Description', 'Unit', 'Qty', 'Unit Cost', 'Total'].map(h => (
                              <th key={h} className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewItems.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-700">{item.groupName}</td>
                              <td className="px-3 py-2 font-mono text-slate-500">{item.itemNumber || '-'}</td>
                              <td className="px-3 py-2 text-gray-900 max-w-[200px] truncate">{item.itemDescription}</td>
                              <td className="px-3 py-2 text-slate-500">{item.unit || '-'}</td>
                              <td className="px-3 py-2 text-right font-bold text-slate-600">{item.quantity}</td>
                              <td className="px-3 py-2 text-right text-slate-500">${Number(item.unitCost).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-bold text-blue-600">${Number(item.totalCost).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {previewItems.length === 0 && (
                      <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-700">No rows found. Make sure your columns match the template exactly.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Importing ── */}
                {step === 'importing' && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                    <p className="text-sm font-bold text-gray-700">Importing {previewItems.length} items…</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {step !== 'importing' && (
                <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                  {step === 'preview' && (
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 text-sm font-semibold transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Change File
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  {step === 'preview' && (
                    <button
                      onClick={handleConfirm}
                      disabled={previewItems.length === 0}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Import {previewItems.length} Items
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
