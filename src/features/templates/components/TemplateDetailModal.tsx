'use client';
import { tr } from '@/i18n';

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
        .catch(() => toast.error(tr("Failed to load template details")))
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
            <div className="bg-white rounded-xl border border-slate-300 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{tr("Viewing Template")}</p>
                  <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                    {loading ? tr("Loading…") : (template?.name || '—')}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <SkeletonLoader loading={loading} preset="modal">
                  {template ? (
                    <div className="p-5 space-y-5">

                    {/* Hero card */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                          <span className="text-xl">🏗️</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 text-[10.5px] font-bold">
                          {template.category?.name || tr("General")}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-1">{tr(template.name)}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        {template.description || tr("A standardized template configured for {{value}} project delivery.", { value: template.category?.name || 'general' })}
                      </p>

                      {/* Stats row */}
                      <div className="bg-white rounded-lg border border-slate-200/90 grid grid-cols-3 divide-x divide-slate-100 shadow-2xs">
                        <div className="px-3 py-2 text-center">
                          <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{tr("Budget Range")}</p>
                          <p className="text-xs font-bold text-slate-900">
                            {template.minBudget || template.maxBudget
                              ? `${formatCurrency(template.minBudget || 0, '$')} – ${formatCurrency(template.maxBudget || 0, '$')}`
                              : '—'
                            }
                          </p>
                        </div>
                        <div className="px-3 py-2 text-center">
                          <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{tr("Est. Area")}</p>
                          <p className="text-xs font-bold text-slate-900">
                            {template.area ? `${template.area.toLocaleString()} sqft` : '—'}
                          </p>
                        </div>
                        <div className="px-3 py-2 text-center">
                          <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{tr("Timeline")}</p>
                          <p className="text-xs font-bold text-slate-900">
                            {template.estimatedDays ? `${template.estimatedDays} days` : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Photos & Visuals */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{tr("Photos & Visuals")}</h4>
                      {template.images && template.images.length > 0 ? (
                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
                          {template.images.map((img: string, idx: number) => (
                            <div key={idx} className="w-48 h-32 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
                              <img loading="lazy" decoding="async" src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center gap-1.5 text-slate-400 bg-slate-50/50">
                          <ImageIcon className="w-7 h-7 text-slate-300" />
                          <p className="text-xs font-semibold">{tr("No photos uploaded")}</p>
                        </div>
                      )}
                    </div>

                    {/* Plan Files */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{tr("Plan Files & Documents")}</h4>
                      {template.files && template.files.length > 0 ? (
                        <div className="space-y-2">
                          {template.files.map((file: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">{file.name || tr("Plan File {{value}}", { value: idx + 1 })}</p>
                                <p className="text-[10px] font-semibold text-slate-400">
                                  {file.size ? `${(file.size / 1024).toFixed(1)} KB` : tr("Architectural Plan")}
                                </p>
                              </div>
                              <a
                                href={file.url} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title={tr("Download")}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center gap-1.5 text-slate-400 bg-slate-50/50">
                          <FileText className="w-7 h-7 text-slate-300" />
                          <p className="text-xs font-semibold">{tr("No files attached")}</p>
                        </div>
                      )}
                    </div>

                  </div>
                ) : null}
                </SkeletonLoader>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                >
                  {tr("Close")}
                </button>
                {template && onEdit && (
                  <button
                    onClick={() => { onClose(); onEdit(template); }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{tr("Edit Template")}</span>
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
