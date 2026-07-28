'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Loader2, CheckCircle2, XCircle, Clock, User, GitBranch } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';

interface BOQHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  projectId: string;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Approved': return { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', Icon: CheckCircle2 };
    case 'Rejected': return { color: 'text-red-700', bg: 'bg-red-100 border-red-200', Icon: XCircle };
    case 'Pending': return { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', Icon: Clock };
    default: return { color: 'text-slate-600', bg: 'bg-gray-100 border-gray-200', Icon: Clock };
  }
};

export const BOQHistoryModal: React.FC<BOQHistoryModalProps> = ({ isOpen, onClose, item, projectId }) => {
  const { project } = useProjectContext();
  // `versions` holds all historical versions of this BOQ item chain (newest first)
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    setLoading(true);
    // Correct endpoint: GET /projects/:id/boq/history/:historyId
    // historyId is set when the item was first created (version 1).
    // For v1 items historyId === _id, so the fallback is safe.
    const historyId = item.historyId || item._id;
    api.get(`/projects/${projectId}/boq/history/${historyId}`)
      .then(res => setVersions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [isOpen, item, projectId]);

  if (!item) return null;

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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <GitBranch className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Version History</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[260px]">{item.itemDescription}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Current item header */}
                <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                    <p className="text-sm font-bold text-gray-900">{item.itemNumber || '-'} — {item.groupName}</p>
                  </div>
                  {(() => { const s = getStatusStyle(item.status); return (
                    <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', s.bg, s.color)}>
                      {item.status}
                    </span>
                  );})()}
                </div>

                <SkeletonLoader loading={loading} preset="modal">
                  {versions.length > 0 ? (
                    <div className="relative space-y-4">
                    <div className="absolute left-5 top-2 bottom-2 w-px bg-gray-200" />
                    {versions.map((ver: any, i: number) => {
                      const s = getStatusStyle(ver.status);
                      const Icon = s.Icon;
                      const isLatest = i === 0;
                      return (
                        <div key={ver._id || i} className="flex items-start space-x-4 relative">
                          <div className={cn('w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shrink-0 z-10', s.bg)}>
                            <Icon className={cn('w-4 h-4', s.color)} />
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={cn('text-xs font-black uppercase tracking-widest', s.color)}>{ver.status}</span>
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  v{ver.version || 1}{isLatest ? ' (latest)' : ''}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {ver.createdAt ? new Date(ver.createdAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                              <div>
                                <span className="text-slate-400">Qty: </span>
                                <span className="font-semibold text-gray-700">{ver.quantity} {ver.unit}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Rate: </span>
                                <span className="font-semibold text-gray-700">{formatCurrency(Number(ver.unitCost), project?.currency || '$')}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Total: </span>
                                <span className="font-bold text-blue-600">{formatCurrency(Number(ver.totalCost), project?.currency || '$')}</span>
                              </div>
                            </div>
                            {ver.createdByName && (
                              <div className="flex items-center space-x-1.5 mt-2">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-600 font-semibold">{ver.createdByName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center border border-dashed border-gray-200 rounded-2xl">
                    <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No version history found.</p>
                  </div>
                )}
                </SkeletonLoader>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
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
