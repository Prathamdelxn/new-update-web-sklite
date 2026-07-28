'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, Map, Search, UserCheck, Check } from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export const SendForSurveyModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, projectId }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setSelectedUser(null);
    setSearch('');
    fetchUsers();
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users?permission=sitesurvey&projectId=${projectId}`);
      setUsers(Array.isArray(res.data) ? res.data : res.data?.users ?? []);
    } catch {
      toast.error('Failed to load eligible surveyors');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.patch(`/projects/${projectId}`, {
        siteSurveyor: selectedUser._id,
        status: 'Site Survey',
        auditAction: 'Update',
        auditDetails: `Site survey assigned to ${selectedUser.name}`,
      });
      toast.success(`Site survey assigned to ${selectedUser.name}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign surveyor');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Map className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Site Survey</p>
                    <h2 className="text-base font-bold text-gray-900">Assign Surveyor</h2>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-6 pt-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search surveyors..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* User list */}
              <SkeletonLoader loading={loading} preset="modal">
              <div className="px-6 pb-2 max-h-64 overflow-y-auto space-y-1.5">
                {filtered.length === 0 && !loading ? (
                  <div className="text-center py-10 text-sm text-slate-400">
                    {users.length === 0
                      ? 'No users with site survey permission found.'
                      : `No results for "${search}"`}
                  </div>
                ) : (
                  filtered.map(u => {
                    const isSelected = selectedUser?._id === u._id;
                    return (
                      <button
                        key={u._id}
                        onClick={() => setSelectedUser(isSelected ? null : u)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/40'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.role?.name || 'Surveyor'}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              </SkeletonLoader>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedUser || submitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 enabled:hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</>
                    : <><UserCheck className="w-4 h-4" /> Assign & Send</>
                  }
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
