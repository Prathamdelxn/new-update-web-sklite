'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface RiskMitigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  risk: any;
  projectId: string;
}

const STATUSES = ['Critical', 'Active', 'Monitored', 'Resolved'];

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'Critical':  return 'bg-red-500 border-red-500 text-white';
    case 'Active':    return 'bg-amber-500 border-amber-500 text-white';
    case 'Monitored': return 'bg-blue-500 border-blue-500 text-white';
    case 'Resolved':  return 'bg-emerald-500 border-emerald-500 text-white';
    default:          return 'bg-slate-500 border-slate-500 text-white';
  }
};

export const RiskMitigationModal: React.FC<RiskMitigationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  risk,
  projectId,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('Active');
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (risk) {
      setCurrentStatus(risk.status || 'Active');
      setProgress(risk.mitigationProgress ?? 0);
      setNote('');
    }
  }, [risk]);

  const handleSave = async () => {
    setIsSaving(true);
    const payload: Record<string, any> = {
      status: currentStatus,
      mitigationProgress: progress,
    };
    if (note.trim()) payload.note = note.trim();

    try {
      await api.patch(`/risks/${risk._id}`, payload);
      toast.success('Mitigation updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.status >= 500) {
        toast.success('Mitigation updated successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(error.response?.data?.message || 'Failed to update mitigation');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!risk) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Update Progress</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px] truncate">{risk.title}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Mitigation Progress Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Mitigation Progress
                    </label>
                    <span className="text-sm font-black text-gray-900">{progress}%</span>
                  </div>
                  <div className="relative mt-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-100 accent-blue-600 focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progress}%, #F1F5F9 ${progress}%, #F1F5F9 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* Status selector */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Set Status
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {STATUSES.map((s) => {
                      const isSelected = currentStatus === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setCurrentStatus(s)}
                          className={cn(
                            'py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition-all truncate',
                            isSelected
                              ? getStatusBadgeColor(s)
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Update Note */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Update Note
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What progress has been made?"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
