'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Loader2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { cn } from '@/lib/utils';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const MODULES = [
  { id: 'projects',     title: 'Project Management',         icon: '🏗️' },
  { id: 'financials',   title: 'Financials & Payments',      icon: '💰' },
  { id: 'inventory',    title: 'Material Management',        icon: '📦' },
  { id: 'users',        title: 'User Management',            icon: '👥' },
  { id: 'plans',        title: 'Plan Management',            icon: '📐' },
  { id: 'annotations',  title: 'Plan Annotations',           icon: '✏️' },
  { id: 'sitesurvey',   title: 'Site Survey Management',     icon: '📋' },
  { id: 'budget',       title: 'Budget Management',          icon: '📊' },
  { id: 'land',         title: 'Land Documents Mgmt',        icon: '📄' },
  { id: 'boq',          title: 'BOQ Management',             icon: '🗂️' },
  { id: 'tasks',        title: 'Task Management',            icon: '✅' },
  { id: 'workprogress', title: 'Work Progress',              icon: '📈' },
  { id: 'reports',      title: 'Reports Management',         icon: '📊' },
  { id: 'risks',        title: 'Risk & Escalation Matrix',   icon: '🚨' },
  { id: 'handover',     title: 'Handover Management',        icon: '🤝' },
  { id: 'snags',        title: 'Snags & Issues Management',  icon: '🔍' },
  { id: 'transactions', title: 'Transaction Management',     icon: '💳' },
  { id: 'category',     title: 'Category Management',        icon: '📁' },
  { id: 'template',     title: 'Template Management',        icon: '📑' },
  { id: 'rooms',        title: 'Room Management',            icon: '🚪' },
  { id: 'ffe',          title: 'FF&E Management',            icon: '🛋️' },
];

const ACTIONS = [
  { id: 'view',     label: 'View',     color: 'blue' },
  { id: 'create',   label: 'Create',   color: 'sky' },
  { id: 'update',   label: 'Update',   color: 'amber' },
  { id: 'delete',   label: 'Delete',   color: 'red' },
  { id: 'approve',  label: 'Approve',  color: 'purple' },
  { id: 'complete', label: 'Complete', color: 'emerald' },
  { id: 'assign',   label: 'Assign',   color: 'indigo' },
];

const ACTION_STYLES: Record<string, { active: string; dot: string }> = {
  view:     { active: 'bg-blue-50 border-blue-200 text-blue-700',       dot: 'bg-blue-500' },
  create:   { active: 'bg-sky-50 border-sky-200 text-sky-700',          dot: 'bg-sky-400' },
  update:   { active: 'bg-amber-50 border-amber-200 text-amber-700',    dot: 'bg-amber-500' },
  delete:   { active: 'bg-red-50 border-red-200 text-red-700',          dot: 'bg-red-500' },
  approve:  { active: 'bg-purple-50 border-purple-200 text-purple-700', dot: 'bg-purple-500' },
  complete: { active: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  assign:   { active: 'bg-indigo-50 border-indigo-200 text-indigo-700', dot: 'bg-indigo-500' },
};

type PermMap = Record<string, Record<string, boolean>>;

const DEFAULT_ACTIONS = { view: false, create: false, update: false, delete: false, approve: false, complete: false, assign: false };
const FULL_ACCESS      = { view: true,  create: true,  update: true,  delete: true,  approve: true,  complete: true,  assign: true };
const READ_ONLY        = { view: true,  create: false, update: false, delete: false, approve: false, complete: false, assign: false };

function emptyPerms(): PermMap {
  return Object.fromEntries(MODULES.map(m => [m.id, { ...DEFAULT_ACTIONS }]));
}

function fromBackend(flat: string[]): PermMap {
  const nested = emptyPerms();
  if (flat.includes('*')) {
    MODULES.forEach(m => { nested[m.id] = { ...FULL_ACCESS }; });
    return nested;
  }
  flat.forEach(p => {
    const [mod, action] = p.split(':');
    if (mod && action && nested[mod]) nested[mod][action] = true;
  });
  return nested;
}

function toBackend(nested: PermMap): string[] {
  const flat: string[] = [];
  Object.entries(nested).forEach(([mod, actions]) => {
    Object.entries(actions).forEach(([action, enabled]) => {
      if (enabled) flat.push(`${mod}:${action}`);
    });
  });
  return flat;
}

export const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<PermMap>(emptyPerms());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  const isAdmin = initialData?.name?.toLowerCase().includes('admin');

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name || '');
    setDescription(initialData?.description || '');
    setPermissions(fromBackend(initialData?.permissions || []));
    setExpandedIds(new Set());
  }, [isOpen, initialData]);

  const toggle = (moduleId: string, actionId: string) => {
    if (isAdmin) return;
    setPermissions(prev => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [actionId]: !prev[moduleId][actionId] },
    }));
  };

  const applyPreset = (preset: 'full' | 'readonly') => {
    if (isAdmin) return;
    const val = preset === 'full' ? FULL_ACCESS : READ_ONLY;
    setPermissions(Object.fromEntries(MODULES.map(m => [m.id, { ...val }])));
  };

  const clearAll = () => {
    if (isAdmin) return;
    setPermissions(emptyPerms());
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Role name is required'); return; }
    setIsLoading(true);
    try {
      const payload = { name, description, permissions: toBackend(permissions) };
      if (initialData) {
        await api.patch(`/roles/${initialData._id}`, payload);
        toast.success('Role updated successfully');
      } else {
        await api.post('/roles', payload);
        toast.success('Role created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  const totalEnabled = Object.values(permissions).reduce(
    (sum, mod) => sum + Object.values(mod).filter(Boolean).length, 0
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
            className="w-full max-w-3xl relative z-10"
          >
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg">
              <div className="p-6 max-h-[92vh] overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {initialData ? 'Edit Role' : 'Create New Role'}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Configure access levels per module</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name + Description */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Role Name</label>
                      <input
                        type="text" required value={name}
                        onChange={e => setName(e.target.value)}
                        disabled={isAdmin}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md py-2.5 px-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                        placeholder="e.g. Project Manager"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</label>
                      <input
                        type="text" value={description}
                        onChange={e => setDescription(e.target.value)}
                        disabled={isAdmin}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md py-2.5 px-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                        placeholder="Brief purpose of this role"
                      />
                    </div>
                  </div>

                  {/* Permissions section */}
                  <div className="space-y-3">
                    {/* Section header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Module Permissions</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{totalEnabled} permission{totalEnabled !== 1 ? 's' : ''} enabled across {MODULES.length} modules</p>
                      </div>
                      {!isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => applyPreset('readonly')}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 border border-gray-200 text-slate-600 hover:bg-gray-200 transition-all">
                            Read Only
                          </button>
                          <button type="button" onClick={() => applyPreset('full')}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-all">
                            Full Access
                          </button>
                          <button type="button" onClick={clearAll}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all">
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Admin lock notice */}
                    {isAdmin && (
                      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                        <p className="text-sm font-semibold text-blue-700">This is a protected system role. Permissions are locked and cannot be modified.</p>
                      </div>
                    )}

                    {/* Module cards */}
                    <div className="space-y-2">
                      {MODULES.map(module => {
                        const modPerms = permissions[module.id] || { ...DEFAULT_ACTIONS };
                        const activeCount = Object.values(modPerms).filter(Boolean).length;
                        const isExpanded = expandedIds.has(module.id);

                        return (
                          <div key={module.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                            {/* Module header — clickable */}
                            <button
                              type="button"
                              onClick={() => toggleExpand(module.id)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-base leading-none">{module.icon}</span>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{module.title}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {activeCount === 0 ? 'No access defined' : `${activeCount} of ${ACTIONS.length} permissions enabled`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Active count badge */}
                                {activeCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-sm text-[9px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                    {activeCount}/{ACTIONS.length}
                                  </span>
                                )}
                                {isExpanded
                                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                                }
                              </div>
                            </button>

                            {/* Action chips — expanded */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-gray-100 grid grid-cols-3 gap-2">
                                {ACTIONS.map(action => {
                                  const isActive = modPerms[action.id];
                                  const styles = ACTION_STYLES[action.id];
                                  return (
                                    <button
                                      key={action.id}
                                      type="button"
                                      onClick={() => toggle(module.id, action.id)}
                                      disabled={isAdmin}
                                      className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-all text-left',
                                        isActive ? styles.active : 'bg-gray-50 border-gray-200 text-slate-500 hover:border-gray-300',
                                        isAdmin && 'cursor-not-allowed opacity-70'
                                      )}
                                    >
                                      <span className={cn('w-2 h-2 rounded-full shrink-0', isActive ? styles.dot : 'bg-gray-300')} />
                                      {action.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 flex gap-3 border-t border-gray-200">
                    <button type="button" onClick={onClose}
                      className="flex-1 py-2.5 rounded-md bg-gray-100 hover:bg-gray-200 text-slate-600 font-medium transition-all">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || isAdmin}
                      className="flex-1 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                        : <span>{isAdmin ? 'Role Locked' : initialData ? 'Save Changes' : 'Create Role'}</span>
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
