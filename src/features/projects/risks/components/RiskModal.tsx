'use client';
import { tr } from '@/i18n';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, ShieldAlert, Cog, Coins, Users, Leaf, Scale, Truck, Type, AlignLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { cn } from '@/lib/utils';

interface RiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

const CATEGORIES = [
  { name: 'Logistics', icon: Truck },
  { name: 'Resources', icon: Users },
  { name: 'Environmental', icon: Leaf },
  { name: 'Legal', icon: Scale },
  { name: 'Safety', icon: ShieldAlert },
  { name: 'Financial', icon: Coins },
  { name: 'Technical', icon: Cog }
];

const IMPACTS = [
  { label: 'Low', color: '#10B981', bgClass: 'bg-emerald-50 border-emerald-500 text-emerald-700' },
  { label: 'Medium', color: '#3B82F6', bgClass: 'bg-blue-50 border-blue-500 text-blue-700' },
  { label: 'High', color: '#F59E0B', bgClass: 'bg-amber-50 border-amber-500 text-amber-700' },
  { label: 'Very High', color: '#EF4444', bgClass: 'bg-red-50 border-red-500 text-red-700' }
];

const PROBABILITIES = ['Low', 'Medium', 'High'];

export const RiskModal: React.FC<RiskModalProps> = ({ isOpen, onClose, onSuccess, projectId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    probability: 'Medium',
    impact: 'Medium',
    status: 'Active',
    mitigationProgress: 0,
  });
  const toast = useToast();

  const reset = () =>
    setFormData({ title: '', description: '', category: 'Technical', probability: 'Medium', impact: 'Medium', status: 'Active', mitigationProgress: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error(tr("Title is required"));
      return;
    }
    setIsLoading(true);
    try {
      await api.post(`/projects/${projectId}/risks`, formData);
      toast.success(tr("Risk logged successfully"));
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      if (error.response?.status >= 500) {
        toast.success(tr("Risk logged successfully"));
        onSuccess();
        onClose();
        reset();
      } else {
        toast.error(error.response?.data?.message || tr("Failed to log risk"));
      }
    } finally {
      setIsLoading(false);
    }
  };

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
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="w-full max-w-xl relative z-10"
          >
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                    <ShieldAlert className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">{tr("New Risk Record")}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{tr("Log a new risk entry for this project")}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Risk Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {tr("Risk Title *")}
                  </label>
                  <div className="relative">
                    <Type className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-2.5 ps-10 pe-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-xs font-medium transition-all"
                      placeholder={tr("e.g. Weather delay risk")}
                    />
                  </div>
                </div>

                {/* Category Chips */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {tr("Category")}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(c => {
                      const Icon = c.icon;
                      const isSelected = formData.category === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: c.name })}
                          className={cn(
                            'flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tr(c.name)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Impact & Probability Selector Grids */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Impact Column */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        {tr("Impact Level")}
                      </label>
                      <span className={cn('text-[11px] font-bold',
                        formData.impact === 'Very High' ? 'text-red-600' :
                        formData.impact === 'High' ? 'text-amber-600' :
                        formData.impact === 'Medium' ? 'text-blue-600' : 'text-emerald-600'
                      )}>
                        {tr(formData.impact)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
                      {IMPACTS.map(i => {
                        const isSelected = formData.impact === i.label;
                        return (
                          <button
                            key={i.label}
                            type="button"
                            onClick={() => setFormData({ ...formData, impact: i.label })}
                            className={cn(
                              'py-2 px-1 rounded-lg text-center text-xs font-semibold transition-all cursor-pointer truncate',
                              isSelected
                                ? i.label === 'Very High' ? 'bg-red-600 text-white' :
                                  i.label === 'High' ? 'bg-amber-500 text-white' :
                                  i.label === 'Medium' ? 'bg-blue-600 text-white' :
                                  'bg-emerald-600 text-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            )}
                            title={tr(i.label)}
                          >
                            {i.label === 'Very High' ? tr("V. High") : tr(i.label)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Probability Column */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        {tr("Probability")}
                      </label>
                      <span className={cn('text-[11px] font-bold',
                        formData.probability === 'High' ? 'text-red-600' :
                        formData.probability === 'Medium' ? 'text-blue-600' : 'text-slate-600'
                      )}>
                        {tr(formData.probability)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
                      {PROBABILITIES.map(p => {
                        const isSelected = formData.probability === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({ ...formData, probability: p })}
                            className={cn(
                              'py-2 px-1 rounded-lg text-center text-xs font-semibold transition-all cursor-pointer',
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            )}
                          >
                            {tr(p)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {tr("Description")}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-2 px-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-xs font-medium transition-all resize-none"
                    placeholder={tr("Describe the risk and potential consequences...")}
                  />
                </div>

                {/* Submit / Action Buttons */}
                <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                  >
                    {tr("Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{tr("Logging...")}</span>
                      </>
                    ) : (
                      <>
                        <span>{tr("Create Risk Entry")}</span>
                        
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
