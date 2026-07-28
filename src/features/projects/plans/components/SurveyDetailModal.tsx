'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Map, Zap, Droplets, DollarSign, User, Calendar,
  Mountain, CheckCircle2, XCircle, AlertCircle, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurveyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: any;
}

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Approved: { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: CheckCircle2 },
  'Needs Attention': { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', icon: AlertCircle },
  Draft: { color: 'text-slate-600', bg: 'bg-gray-100 border-gray-200', icon: FileText },
  Submitted: { color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200', icon: FileText },
};

export const SurveyDetailModal: React.FC<SurveyDetailModalProps> = ({ isOpen, onClose, survey }) => {
  if (!survey) return null;

  const status = statusConfig[survey.status] || statusConfig['Draft'];
  const StatusIcon = status.icon;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 w-40">{label}</span>
      <span className="text-sm text-gray-900 text-right flex-1">{value || '—'}</span>
    </div>
  );

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
            className="w-full max-w-lg relative z-10"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <Map className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Site Survey Report</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {survey.createdAt ? new Date(survey.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Banner */}
              <div className={cn('mx-6 mt-5 p-4 rounded-2xl border flex items-center space-x-3', status.bg)}>
                <StatusIcon className={cn('w-5 h-5 shrink-0', status.color)} />
                <div>
                  <p className={cn('text-sm font-bold', status.color)}>{survey.status || 'Draft'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Survey Status</p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Site Assessment */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Site Assessment</h3>
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-0">
                    <InfoRow label="Terrain Notes" value={survey.terrainNotes} />
                    <InfoRow label="Accessibility" value={survey.accessibility} />
                    <InfoRow label="Soil Type" value={survey.soilType} />
                    <InfoRow label="Elevation" value={survey.elevation ? `${survey.elevation} m` : null} />
                    <InfoRow label="Site Area" value={survey.siteArea ? `${survey.siteArea} sq.m` : null} />
                  </div>
                </div>

                {/* Utilities */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Utilities & Resources</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Power Supply', value: survey.powerAvailable, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                      { label: 'Water Supply', value: survey.waterAvailable, icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                      { label: 'Budget Impact', value: survey.affectsBudget, icon: DollarSign, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                      { label: 'Road Access', value: survey.roadAccess, icon: Mountain, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                    ].map(({ label, value, icon: Icon, color, bg }) => (
                      <div key={label} className={cn('p-4 rounded-2xl border flex items-center space-x-3', value ? bg : 'bg-gray-50 border-gray-200')}>
                        <Icon className={cn('w-5 h-5 shrink-0', value ? color : 'text-gray-300')} />
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                          <p className={cn('text-sm font-bold mt-0.5', value ? 'text-gray-900' : 'text-gray-400')}>
                            {value ? 'Available' : 'Not Available'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Surveyor */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Conducted By</h3>
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {survey.surveyor?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{survey.surveyor?.name || 'Assigned Surveyor'}</p>
                      <p className="text-xs text-slate-500">{survey.surveyor?.email || survey.surveyor?.role?.name || 'Site Surveyor'}</p>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {survey.remarks && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Remarks & Observations</h3>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <p className="text-sm text-amber-800 leading-relaxed italic">"{survey.remarks}"</p>
                    </div>
                  </div>
                )}

                {/* Photos */}
                {survey.photos?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Site Photos ({survey.photos.length})</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {survey.photos.map((photo: string, i: number) => (
                        <a key={i} href={photo} target="_blank" rel="noreferrer">
                          <img src={photo} alt={`Site photo ${i + 1}`} className="w-full h-24 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-gray-100 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
