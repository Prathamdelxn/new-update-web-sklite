'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Loader2, Search, Check, ChevronDown, ChevronUp, ArrowRight, UserPlus, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  currentMembers: any[];
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen, onClose, onSuccess, projectId, currentMembers,
}) => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setWizardStep(1);
    setSelectedRoleId(null);
    setSelectedNewMembers([]);
    setExpandedRole(null);

    setLoading(true);
    Promise.all([
      api.get('/users'),
      api.get('/roles')
    ]).then(([usersRes, rolesRes]) => {
      setAllUsers(usersRes.data?.users || usersRes.data || []);
      const roles = rolesRes.data?.roles || rolesRes.data || [];
      setAvailableRoles(roles.filter((r: any) => r.name !== 'Admin'));
    }).catch(() => {
      toast.error('Failed to load data for team management');
    }).finally(() => {
      setLoading(false);
    });
  }, [isOpen, toast]);

  const existingMemberIds = new Set(currentMembers.map(m => m.user?._id || m.user || m._id));

  const filteredUsers = allUsers.filter(u =>
    !existingMemberIds.has(u._id) &&
    (u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedNewMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (selectedNewMembers.length === 0 || !selectedRoleId) {
      toast.error('Please select at least one user and a role');
      return;
    }
    
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/members`, {
        userIds: selectedNewMembers,
        roleId: selectedRoleId,
      });
      toast.success('Team members added successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add members');
    } finally {
      setSaving(false);
    }
  };

  // Render role permissions beautifully
  const renderPermissions = (permissions: string[]) => {
    if (!permissions || permissions.length === 0) {
      return <p className="text-[11px] text-slate-400 font-medium italic mb-4">No specific permissions defined.</p>;
    }

    const grouped: Record<string, string[]> = {};
    permissions.forEach(perm => {
      if (perm === '*') { 
        grouped['Admin'] = ['Full Access (*)']; 
        return; 
      }
      const parts = perm.split(':');
      const modName = (parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
      const action = parts.length > 1 ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'All';
      if (!grouped[modName]) grouped[modName] = [];
      grouped[modName].push(action);
    });

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(grouped).map((mod, idx) => (
          <div key={idx} className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
            <div className="text-[10px] font-bold text-slate-700">{mod}</div>
            <div className="text-[9px] font-medium text-slate-500">{grouped[mod].join(', ')}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-xl relative z-10"
          >
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center space-x-3">
                  {wizardStep === 2 && (
                    <button 
                      onClick={() => setWizardStep(1)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors mr-1"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Add Team Member</h2>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {wizardStep === 1 ? 'Step 1: Select Role' : 'Step 2: Assign Users'}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-slate-50/50 relative">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-sm font-medium text-slate-500">Loading data...</p>
                  </div>
                ) : (
                  <>
                    {/* STEP 1: SELECT ROLE */}
                    {wizardStep === 1 && (
                      <div className="space-y-3 pb-6">
                        {availableRoles.map(r => {
                          const isExpanded = expandedRole === r._id;
                          const isSelected = selectedRoleId === r._id;
                          return (
                            <div 
                              key={r._id} 
                              className={cn(
                                "bg-white rounded-2xl border transition-all duration-200 overflow-hidden",
                                isSelected ? "border-blue-400 ring-2 ring-blue-50" : "border-slate-200 hover:border-slate-300"
                              )}
                            >
                              <div 
                                className="p-4 flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedRole(isExpanded ? null : r._id)}
                              >
                                <div className="flex-1 pr-4">
                                  <h3 className={cn("text-base font-bold", isSelected ? "text-blue-700" : "text-slate-900")}>
                                    {r.name}
                                  </h3>
                                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                    {r.description || 'No description available.'}
                                  </p>
                                </div>
                                <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>
                              
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-slate-100"
                                  >
                                    <div className="p-4 bg-slate-50/50">
                                      {renderPermissions(r.permissions)}
                                      
                                      <button 
                                        onClick={() => {
                                          setSelectedRoleId(r._id);
                                          setWizardStep(2);
                                        }}
                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center space-x-2"
                                      >
                                        <span>Choose {r.name}</span>
                                        <ArrowRight className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* STEP 2: ASSIGN USERS */}
                    {wizardStep === 2 && (
                      <div className="space-y-4 pb-20">
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider block">Selected Role</span>
                            <span className="text-sm font-bold text-blue-900 block mt-0.5">
                              {availableRoles.find(r => r._id === selectedRoleId)?.name || 'Role'}
                            </span>
                          </div>
                          <button 
                            onClick={() => setWizardStep(1)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                          >
                            Change
                          </button>
                        </div>
                        
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          {filteredUsers.length === 0 ? (
                            <div className="text-center py-10 px-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Search className="w-5 h-5 text-slate-400" />
                              </div>
                              <p className="text-sm font-semibold text-slate-700">No available users found</p>
                              <p className="text-xs text-slate-500 mt-1">Try adjusting your search or they might already be in the project.</p>
                            </div>
                          ) : (
                            filteredUsers.map(u => {
                              const isSelected = selectedNewMembers.includes(u._id);
                              return (
                                <div
                                  key={u._id}
                                  onClick={() => toggleUserSelection(u._id)}
                                  className={cn(
                                    "flex items-center p-3 rounded-xl border transition-all cursor-pointer",
                                    isSelected ? "bg-blue-50 border-blue-300 ring-1 ring-blue-100" : "bg-white border-slate-200 hover:border-slate-300"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mr-3 transition-colors",
                                    isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                  )}>
                                    {u.name?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                  <div className="flex-1 min-w-0 pr-3">
                                    <p className={cn("text-sm font-bold truncate transition-colors", isSelected ? "text-blue-900" : "text-slate-900")}>
                                      {u.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                      {u.email}
                                    </p>
                                  </div>
                                  <div className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors",
                                    isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300 text-transparent"
                                  )}>
                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer Sticky (only for Step 2) */}
              {wizardStep === 2 && !loading && (
                <div className="p-5 bg-white border-t border-slate-100 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] relative z-20">
                  <button
                    onClick={handleSave}
                    disabled={saving || selectedNewMembers.length === 0}
                    className={cn(
                      "w-full h-12 flex items-center justify-center space-x-2 rounded-xl text-sm font-bold transition-all",
                      selectedNewMembers.length > 0 
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    {saving ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4.5 h-4.5" />
                        <span>
                          Assign {selectedNewMembers.length > 0 ? selectedNewMembers.length : ''} {selectedNewMembers.length === 1 ? 'User' : 'Users'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

