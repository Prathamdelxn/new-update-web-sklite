'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FileText, Download, ImageIcon, Pencil } from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { formatCurrency } from '@/lib/utils';

interface TemplateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string | null;
  onEdit?: (template: any) => void;
}

export const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({
  isOpen,
  onClose,
  templateId,
  onEdit,
}) => {
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && templateId) {
      setLoading(true);
      api.get(`/templates/${templateId}`)
        .then(res => setTemplate(res.data))
        .catch(() => toast.error('Failed to load template details'))
        .finally(() => setLoading(false));
    } else {
      setTemplate(null);
    }
  }, [isOpen, templateId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl relative z-10"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Viewing Template</p>
                  <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                    {loading ? 'Loading…' : (template?.name || '—')}
                  </h2>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <SkeletonLoader loading={loading} preset="modal">
                  {template ? (
                    <div className="p-6 space-y-6">

                    {/* Hero card */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-blue-200 flex items-center justify-center shadow-sm">
                          <span className="text-2xl">🏗️</span>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">
                          {template.category?.name || 'General'}
                        </span>
                      </div>

                      <h3 className="text-2xl font-black text-gray-900 mb-2">{template.name}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed mb-5">
                        {template.description || `A professional template designed for ${template.category?.name || 'standard'} projects.`}
                      </p>

                      {/* Stats row */}
                      <div className="bg-white rounded-xl border border-blue-100 grid grid-cols-3 divide-x divide-blue-100">
                        <div className="px-4 py-3 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Budget Range</p>
                          <p className="text-sm font-black text-gray-900">
                            {template.minBudget || template.maxBudget
                              ? `${formatCurrency(template.minBudget || 0, '$')} – ${formatCurrency(template.maxBudget || 0, '$')}`
                              : '—'
                            }
                          </p>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Area</p>
                          <p className="text-sm font-black text-gray-900">
                            {template.area ? `${template.area.toLocaleString()} sqft` : '—'}
                          </p>
                        </div>
                        <div className="px-4 py-3 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Timeline</p>
                          <p className="text-sm font-black text-gray-900">
                            {template.estimatedDays ? `${template.estimatedDays} days` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Photos & Visuals */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Photos & Visuals</h4>
                      {template.images && template.images.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {template.images.map((img: string, idx: number) => (
                            <div key={idx} className="w-52 h-36 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                              <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-2 text-slate-400">
                          <ImageIcon className="w-8 h-8" />
                          <p className="text-sm font-semibold">No photos uploaded</p>
                        </div>
                      )}
                    </div>

                    {/* Plan Files */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Plan Files & Blueprints</h4>
                      {template.files && template.files.length > 0 ? (
                        <div className="space-y-2">
                          {template.files.map((file: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-blue-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{file.name || `Plan File ${idx + 1}`}</p>
                                <p className="text-[10px] text-slate-400">
                                  {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Architectural Plan'}
                                </p>
                              </div>
                              <a
                                href={file.url} target="_blank" rel="noopener noreferrer"
                                className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-2 text-slate-400">
                          <FileText className="w-8 h-8 text-blue-300" />
                          <p className="text-sm font-semibold">No files attached</p>
                        </div>
                      )}
                    </div>

                  </div>
                ) : null}
                </SkeletonLoader>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
                {template && onEdit && (
                  <button
                    onClick={() => { onClose(); onEdit(template); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Template
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
