'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, User, ChevronRight } from 'lucide-react';
import api from '@/services/api.client';

interface AssignSnagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (user: any) => void;
  projectId: string;
}

export const AssignSnagModal: React.FC<AssignSnagModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  projectId,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchEligibleMembers = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/users?projectId=${projectId}&permission=snag:complete`);
        setUsers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching eligible snag completion users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEligibleMembers();
  }, [isOpen, projectId]);

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
            <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-start justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Assign to Complete Snag</h2>
                  <p className="text-xs text-slate-500 mt-1">Select an authorized user to resolve this snag.</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body / List */}
              <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <span className="text-xs text-slate-500 mt-3 font-semibold">Loading team members...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    No users with completion permissions found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((member) => (
                      <button
                        key={member._id}
                        type="button"
                        onClick={() => onAssign(member)}
                        className="w-full flex items-center space-x-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl transition-all text-left group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                          {member.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {member.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            {member.role?.name || 'Team Member'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
