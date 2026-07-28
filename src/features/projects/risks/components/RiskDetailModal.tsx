'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Cog, Coins, Users, Leaf, Scale, Truck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  risk: any;
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Critical': return '#EF4444';
    case 'Active': return '#F59E0B';
    case 'Monitored': return '#3B82F6';
    case 'Resolved': return '#10B981';
    default: return '#94A3B8';
  }
};

const getStatusTextClass = (status: string) => {
  switch (status) {
    case 'Critical':  return 'text-red-600';
    case 'Active':    return 'text-amber-600';
    case 'Monitored': return 'text-blue-600';
    case 'Resolved':  return 'text-emerald-600';
    default:          return 'text-slate-500';
  }
};

const getImpactColor = (label: string) => {
  switch (label) {
    case 'Low':       return '#10B981';
    case 'Medium':    return '#3B82F6';
    case 'High':      return '#F59E0B';
    case 'Very High': return '#EF4444';
    default:          return '#94A3B8';
  }
};

const getImpactColorClass = (label: string) => {
  switch (label) {
    case 'Low':       return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'Medium':    return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'High':      return 'text-amber-600 bg-amber-50 border-amber-100';
    case 'Very High': return 'text-red-600 bg-red-50 border-red-100';
    default:          return 'text-slate-600 bg-slate-50 border-slate-100';
  }
};

export const RiskDetailModal: React.FC<RiskDetailModalProps> = ({
  isOpen, onClose, risk,
}) => {
  if (!risk) return null;

  const categoryObj = CATEGORIES.find(c => c.name === risk.category);
  const CategoryIcon = categoryObj?.icon || AlertCircle;
  const statusColor = getStatusColor(risk.status);

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
            className="w-full max-w-xl relative z-10"
          >
            <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-start justify-between shrink-0">
                <div className="flex items-start space-x-4">
                  <div 
                    className="p-3 rounded-2xl border shrink-0"
                    style={{
                      borderColor: `${statusColor}20`,
                      backgroundColor: `${statusColor}10`,
                      color: statusColor
                    }}
                  >
                    <CategoryIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: statusColor }}>
                        {risk.category}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-[10px] font-bold text-slate-500">P: {risk.probability}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-[10px] font-bold text-slate-500">I: {risk.impact}</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 leading-snug">{risk.title}</h2>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status & Impact Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Status
                    </span>
                    <span className={cn('text-sm font-semibold', getStatusTextClass(risk.status))}>
                      {risk.status}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Impact
                    </span>
                    <span className={cn('text-sm font-semibold')} style={{ color: getImpactColor(risk.impact) }}>
                      {risk.impact}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Description
                  </span>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed">
                    {risk.description || 'No description provided.'}
                  </div>
                </div>

                {/* Mitigation progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mitigation Progress
                    </span>
                    <span className="text-sm font-black text-gray-900">{risk.mitigationProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 border border-slate-200/55 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${risk.mitigationProgress}%`,
                        backgroundColor: statusColor
                      }}
                    />
                  </div>
                  {risk.note && (
                    <p className="text-xs text-slate-500 italic mt-2 border-l-2 border-slate-200 pl-3 py-0.5">
                      "{risk.note}"
                    </p>
                  )}
                </div>

                {/* History log */}
                {risk.history && risk.history.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      History log
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {[...risk.history].reverse().map((h: any, i: number) => (
                        <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs">
                          <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-slate-400">
                            <span>{h.updatedBy?.name || 'System'}</span>
                            <span>{new Date(h.timestamp).toLocaleDateString()}</span>
                          </div>
                          {h.note && <p className="text-slate-700 italic mb-1">"{h.note}"</p>}
                          {h.oldStatus !== h.newStatus && (
                            <p className="text-[10px] text-slate-500">
                              Status changed: <span className="font-semibold">{h.oldStatus}</span> &rarr; <span className="font-semibold">{h.newStatus}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm"
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
