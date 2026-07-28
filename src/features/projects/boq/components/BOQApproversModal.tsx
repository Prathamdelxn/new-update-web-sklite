'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Loader2, Check, Search, UserCheck, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface BOQApproversModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: any;
  projectId: string;
}

export const BOQApproversModal: React.FC<BOQApproversModalProps> = ({
  isOpen, onClose, onSuccess, item, projectId,
}) => {
  const [approvers, setApprovers] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  // Only one approver can be selected at a time (matches mobile flow)
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (!isOpen || !item) return;
    setSearch('');
    setSelectedApproverId(null);
    setLoading(true);
    
    // Fetch both approvers and project details in parallel
    Promise.all([
      api.get(`/projects/${projectId}/boq-approvers`),
      api.get(`/projects/${projectId}`)
    ])
      .then(([approversRes, projectRes]) => {
        setApprovers(Array.isArray(approversRes.data) ? approversRes.data : []);
        setProjectMembers(projectRes.data?.members || []);
      })
      .catch(() => toast.error('Failed to load approvers'))
      .finally(() => setLoading(false));
  }, [isOpen, item, projectId]);

  // ✅ FIXED: Correct "Send for Approval" flow — matches mobile's confirmSendForApproval()
  // Was previously: PATCH /projects/:id/boq/:itemId with { approvers: [...] } — WRONG
  //   - `approvers` field doesn't exist in the BOQ schema (silently ignored by MongoDB)
  //   - Never changed item status to "Pending"
  //   - Never set requestedApproverId
  //
  // Now: PATCH /projects/:id/boq/bulk-status with { itemIds: [item._id], status: 'Pending', requestedApproverId }
  //   - Marks item as Pending ✅
  //   - Records requestedApprover + requestedApproverName on the item ✅
  //   - Matches exact mobile behavior ✅
  const handleSendForApproval = async () => {
    if (!selectedApproverId) {
      toast.error('Please select an approver');
      return;
    }
    setSaving(true);
    
    // Compute display name of selected approver
    const user = approvers.find(u => u._id === selectedApproverId);
    let displayName = 'Unknown User';
    if (user) {
      const projectMemberData = projectMembers.find(m => m._id === user._id);
      displayName = projectMemberData?.name || user.name || 'Unknown User';
      if (displayName && displayName.length > 25 && !displayName.includes(' ') && user.email) {
        const emailPrefix = user.email.split('@')[0];
        displayName = emailPrefix
          .split(/[._-]/)
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      }
    }

    try {
      await api.patch(`/projects/${projectId}/boq/bulk-status`, {
        itemIds: [item._id],
        status: 'Pending',
        requestedApproverId: selectedApproverId,
        requestedApproverName: displayName,
      });
      toast.success('Item sent for approval');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send for approval');
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  const filtered = approvers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
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
            className="w-full max-w-md relative z-10"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                    <UserCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Send for Approval</h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[240px]">{item.itemDescription}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Info banner */}
                <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                  <Send className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-purple-700 leading-relaxed">
                    Select an approver. The item status will change to <span className="font-bold">Pending</span> and the selected person will be notified.
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search approvers..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>

                <SkeletonLoader loading={loading} preset="modal">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filtered.length === 0 && !loading && (
                      <p className="text-sm text-slate-400 text-center py-6">
                        {approvers.length === 0
                          ? 'No users have BOQ approve permission.'
                          : 'No approvers match your search.'}
                      </p>
                    )}
                    {filtered.map(user => {
                      const isSelected = selectedApproverId === user._id;
                      
                      // Match with project members to get the real decrypted name (same logic as mobile app)
                      const projectMemberData = projectMembers.find(m => m._id === user._id);
                      let displayName = projectMemberData?.name || user.name || 'Unknown User';
                      
                      // Fallback: If an Admin/Contractor user is not in the project members and their name is a raw hash, extract from email
                      // Hashes are typically very long (30+ chars) and contain no spaces.
                      if (displayName && displayName.length > 25 && !displayName.includes(' ') && user.email) {
                        const emailPrefix = user.email.split('@')[0];
                        displayName = emailPrefix
                          .split(/[._-]/)
                          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
                          .join(' ');
                      }
                      
                      return (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => setSelectedApproverId(isSelected ? null : user._id)}
                          className={cn(
                            'w-full flex items-center space-x-3 p-3 rounded-xl border transition-all text-left',
                            isSelected
                              ? 'bg-purple-50 border-purple-300'
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                            isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                          )}>
                            {isSelected ? <Check className="w-4 h-4" /> : displayName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                          </div>
                          {user.roleName && (
                            <span className="text-[10px] font-bold text-slate-400 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
                              {user.roleName}
                            </span>
                          )}

                        </button>
                      );
                    })}
                  </div>
                </SkeletonLoader>

                {selectedApproverId && (
                  <p className="text-xs text-purple-600 font-semibold text-center">
                    1 approver selected — item will be set to Pending
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
                  onClick={handleSendForApproval}
                  disabled={saving || !selectedApproverId}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm shadow-purple-600/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Send for Approval</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
