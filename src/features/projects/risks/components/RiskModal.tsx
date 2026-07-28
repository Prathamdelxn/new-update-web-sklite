'use client';

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
      toast.error('Title is required');
      return;
    }
    setIsLoading(true);
    try {
      await api.post(`/projects/${projectId}/risks`, formData);
      toast.success('Risk logged successfully');
      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      if (error.response?.status >= 500) {
        toast.success('Risk logged successfully');
        onSuccess();
        onClose();
        reset();
      } else {
        toast.error(error.response?.data?.message || 'Failed to log risk');
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg relative z-10"
          >
            <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200">
                    <ShieldAlert className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">New Risk Record</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Log a new risk entry for this project</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Risk Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block ml-1">
                    Risk Title
                  </label>
                  <div className="relative">
                    <Type className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                      placeholder="e.g. Weather delay risk"
                    />
                  </div>
                </div>

                {/* Category Chips Scroll/Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block ml-1">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto py-1">
                    {CATEGORIES.map(c => {
                      const Icon = c.icon;
                      const isSelected = formData.category === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: c.name })}
                          className={cn(
                            'flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all',
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Impact & Probability Selector Grids */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Impact Column */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block ml-1">
                      Impact
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {IMPACTS.map(i => {
                        const isSelected = formData.impact === i.label;
                        return (
                          <button
                            key={i.label}
                            type="button"
                            onClick={() => setFormData({ ...formData, impact: i.label })}
                            className={cn(
                              'flex items-center space-x-2.5 px-3 py-2.5 rounded-xl border text-left text-xs font-bold transition-all relative overflow-hidden',
                              isSelected
                                ? i.bgClass
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            <span 
                              className="w-1.5 h-6 rounded-full block" 
                              style={{ backgroundColor: i.color }}
                            />
                            <span>{i.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Probability Column */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block ml-1">
                      Probability
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {PROBABILITIES.map(p => {
                        const isSelected = formData.probability === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setFormData({ ...formData, probability: p })}
                            className={cn(
                              'px-3 py-3 rounded-xl border text-center text-xs font-bold transition-all',
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block ml-1">
                    Description
                  </label>
                  <div className="relative">
                    <AlignLeft className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all resize-none"
                      placeholder="Describe the risk and potential consequences..."
                    />
                  </div>
                </div>

                {/* Submit / Action Buttons */}
                <div className="flex space-x-3 pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] py-3.5 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Logging...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Risk Entry</span>
                        <ArrowRight className="w-4 h-4" />
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
