'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface UserPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (userIds: string[], users: any[]) => void;
  title: string;
  description?: string;
  initialSelected?: string[];
  confirmLabel?: string;
  accentColor?: 'blue' | 'purple' | 'emerald' | 'orange';
  endpoint?: string;
}

const accentMap = {
  blue: { icon: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-600', selectedItem: 'bg-blue-50 border-blue-300', avatar: 'bg-blue-600', count: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' },
  purple: { icon: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600', selectedItem: 'bg-purple-50 border-purple-300', avatar: 'bg-purple-600', count: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20' },
  emerald: { icon: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-600', selectedItem: 'bg-emerald-50 border-emerald-300', avatar: 'bg-emerald-600', count: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' },
  orange: { icon: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-600', selectedItem: 'bg-orange-50 border-orange-300', avatar: 'bg-orange-600', count: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20' },
};

export const UserPickerModal: React.FC<UserPickerModalProps> = ({
  isOpen, onClose, onSelect, title, description, initialSelected = [], confirmLabel = 'Confirm', accentColor = 'blue', endpoint,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useToast();
  const accent = accentMap[accentColor];

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelected(new Set(initialSelected));
    setLoading(true);
    const fetchUrl = endpoint || '/users';
    api.get(fetchUrl)
      .then(r => setUsers(r.data?.users || r.data || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [isOpen, endpoint]);

  const toggle = (userId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleConfirm = () => {
    const ids = Array.from(selected);
    const selectedUsers = users.filter(u => selected.has(u._id));
    onSelect(ids, selectedUsers);
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn('p-2.5 rounded-xl border', accent.icon)}>
                    <Users className={cn('w-5 h-5', accent.iconColor)} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{title}</h2>
                    {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <SkeletonLoader loading={loading} preset="modal">
                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {filtered.length === 0 && !loading && (
                      <p className="text-sm text-slate-400 text-center py-6">No users found.</p>
                    )}
                    {filtered.map(user => {
                      const isSelected = selected.has(user._id);
                      return (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => toggle(user._id)}
                          className={cn(
                            'w-full flex items-center space-x-3 p-3 rounded-xl border transition-all text-left',
                            isSelected ? accent.selectedItem : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                            isSelected ? `${accent.avatar} text-white` : 'bg-gray-200 text-gray-700'
                          )}>
                            {isSelected ? <Check className="w-4 h-4" /> : user.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                          </div>
                          {(user.role?.name || user.roleName) && (
                            <span className="text-[10px] font-bold text-slate-400 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
                              {user.role?.name || user.roleName}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </SkeletonLoader>

                {selected.size > 0 && (
                  <p className={cn('text-xs font-semibold text-center', accent.count)}>
                    {selected.size} user{selected.size > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className={cn('flex items-center space-x-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm', accent.btn)}
                >
                  <span>{confirmLabel}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
