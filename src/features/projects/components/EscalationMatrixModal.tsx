'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch, Loader2, Plus, Trash2, Save } from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface EscalationRule {
  level: number;
  user: string;
  role: string;
}

interface EscalationMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const EscalationMatrixModal: React.FC<EscalationMatrixModalProps> = ({ isOpen, onClose, projectId }) => {
  const [rules, setRules]     = useState<EscalationRule[]>([]);
  const [members, setMembers] = useState<{ _id: string; name: string; role?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const fetchMatrix = api.get(`/projects/${projectId}/escalation-matrix`)
      .then(res => res.data)
      .catch(err => {
        console.error("Error fetching escalation matrix:", err);
        toast.error("Failed to load escalation matrix");
        return null;
      });

    const fetchMembers = api.get(`/users?projectId=${projectId}`)
      .then(res => res.data)
      .catch(err => {
        console.error("Error fetching project members:", err);
        toast.error("Failed to load project members");
        return [];
      });

    Promise.all([fetchMatrix, fetchMembers])
      .then(([matrixData, rawUsers]) => {
        const processedMembers = Array.isArray(rawUsers) ? rawUsers.map((u: any) => ({
          _id: u._id,
          name: u.name || 'Member',
          role: u.role?.name || ''
        })) : [];
        setMembers(processedMembers);

        if (matrixData) {
          const isSaved = !!(matrixData._id || matrixData.id || matrixData.createdAt);
          if (isSaved && Array.isArray(matrixData.levels) && matrixData.levels.length > 0) {
            const mappedRules = matrixData.levels.map((lvl: any) => ({
              level: lvl.level,
              user: lvl.user?._id || lvl.user || '',
              role: lvl.role || lvl.user?.role?.name || ''
            }));
            setRules(mappedRules);
            return;
          }
        }
        setRules([]);
      })
      .catch((err) => {
        console.error("Unexpected error populating escalation matrix modal:", err);
        setRules([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  const updateRuleUser = (index: number, userId: string) => {
    const selectedMember = members.find(m => m._id === userId);
    setRules(prev => prev.map((r, i) => i === index ? {
      ...r,
      user: userId,
      role: selectedMember?.role || ''
    } : r));
  };

  const addLevel = () => {
    setRules(prev => [...prev, {
      level: prev.length + 1,
      user: '',
      role: '',
    }]);
  };

  const removeLevel = (index: number) => {
    setRules(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((r, idx) => ({
        ...r,
        level: idx + 1
      }));
    });
  };

  const handleSave = async () => {
    // Validate: make sure every escalation level has a person assigned
    for (let i = 0; i < rules.length; i++) {
      if (!rules[i].user) {
        toast.error(`Please assign the person for the Escalation Level ${rules[i].level}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payloadLevels = rules.map((r, idx) => ({
        level: idx + 1,
        user: r.user,
        role: r.role || ''
      }));

      await api.post(`/projects/${projectId}/escalation-matrix`, { levels: payloadLevels });
      toast.success('Escalation matrix saved');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save escalation matrix');
    } finally {
      setSaving(false);
    }
  };

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
            className="w-full max-w-2xl relative z-10"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200">
                    <GitBranch className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Escalation Matrix</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Configure sequential roles/members for issue escalations.</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                <SkeletonLoader loading={loading} preset="modal">
                  <div className="space-y-4">
                    {rules.map((rule, i) => (
                      <div
                        key={i}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                            Escalation Level {rule.level}
                          </span>
                          <button
                            onClick={() => removeLevel(i)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove level"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assign Person</label>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="relative flex-1">
                                <select
                                  value={rule.user}
                                  onChange={e => updateRuleUser(i, e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm"
                                >
                                  <option value="">Select Member</option>
                                  {members.map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                  ))}
                                </select>
                              </div>
                              {rule.role && (
                                <div className="shrink-0">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-100">
                                    {rule.role}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addLevel}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-bold text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Escalation Level</span>
                    </button>

                    <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-orange-800">How it works:</span> Escalation levels are sequential. When an issue is escalated, it progresses through the levels (Level 1, Level 2, Level 3, etc.) notifying and assigning the corresponding configured team member.
                      </p>
                    </div>
                  </div>
                </SkeletonLoader>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3 shrink-0">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm shadow-orange-600/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Matrix</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
