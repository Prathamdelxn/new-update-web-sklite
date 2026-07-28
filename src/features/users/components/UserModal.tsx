'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, UserPlus, UserCog, Mail, Lock, Phone, FolderOpen, Check, ChevronDown, Search, Eye, EyeOff, Copy, CheckCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { cn } from '@/lib/utils';
import 'react-phone-number-input/style.css';
import PhoneInput from 'react-phone-number-input';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all';

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; password: string } | null>(null);
  const [showCredsPassword, setShowCredsPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [projectRoles, setProjectRoles] = useState<Record<string, string>>({});
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
  });

  const toast = useToast();
  const isEditing = !!initialData;

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      try {
        const [rolesRes, projectsRes] = await Promise.all([
          api.get('/roles'),
          api.get('/projects'),
        ]);
        setRoles(rolesRes.data || []);
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data?.projects ?? []);
      } catch {
        // silent
      }
    };
    load();

    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        mobile: initialData.phoneNumber || initialData.mobile || '',
        password: '',
      });
      setSelectedRole(
        typeof initialData.role === 'object' ? initialData.role : null
      );
      
      const pRoles: Record<string, string> = {};
      const projArr: any[] = [];
      (initialData.projects || []).forEach((p: any) => {
        if (p.project) {
          projArr.push(p.project);
          if (p.role) pRoles[p.project._id || p.project] = p.role._id || p.role;
        } else if (p._id) {
          projArr.push(p);
        }
      });
      setSelectedProjects(projArr);
      setProjectRoles(pRoles);
    } else {
      setFormData({ name: '', email: '', mobile: '', password: '' });
      setSelectedRole(null);
      setSelectedProjects([]);
      setProjectRoles({});
    }
    setProjectSearch('');
  }, [isOpen, initialData]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleProject = (project: any) => {
    setSelectedProjects(prev => {
      const isSelected = prev.some(p => p._id === project._id);
      if (isSelected) {
        setProjectRoles(roles => {
          const newRoles = { ...roles };
          delete newRoles[project._id];
          return newRoles;
        });
        return prev.filter(p => p._id !== project._id);
      }
      return [...prev, project];
    });
  };

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please enter at least a name and email.');
      return;
    }
    setIsLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.mobile,
        roleId: selectedRole?._id,
        projects: selectedProjects.map(p => ({
          project: p._id,
          role: projectRoles[p._id] || undefined
        })),
      };
      if (formData.password) payload.password = formData.password;

      if (isEditing) {
        await api.patch(`/users/${initialData._id}`, payload);
        toast.success('Member updated successfully!');
        onSuccess();
        onClose();
      } else {
        payload.password = formData.password;
        await api.post('/users', payload);
        setCreatedCreds({ name: formData.name, email: formData.email, password: formData.password });
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || (isEditing ? 'Failed to update user' : 'Failed to onboard user'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              key="user-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              key="user-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg relative z-10"
            >
            <GlassCard className="border-gray-200" gradient>
              <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                      {isEditing ? <UserCog className="w-6 h-6 text-blue-600" /> : <UserPlus className="w-6 h-6 text-blue-600" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {isEditing ? 'Update Team Member' : 'Onboard New Member'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isEditing ? 'Update team member details.' : 'Invite a team member to the platform.'}
                      </p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-black text-blue-500 uppercase tracking-[1.5px] mb-3">Full Name</label>
                    <input
                      type="text" required value={formData.name}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      className="w-full h-[56px] bg-white/50 border border-blue-50/50 backdrop-blur-sm rounded-2xl px-4 text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" 
                      placeholder="e.g. Robert Fox"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-black text-blue-500 uppercase tracking-[1.5px] mb-3">Email Address</label>
                    <input
                      type="email" required value={formData.email}
                      onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                      className="w-full h-[56px] bg-white/50 border border-blue-50/50 backdrop-blur-sm rounded-2xl px-4 text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" 
                      placeholder="name@example.com"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-[11px] font-black text-blue-500 uppercase tracking-[1.5px] mb-3">Mobile Number</label>
                    <input
                      type="tel" required value={formData.mobile}
                      onChange={e => setFormData(f => ({ ...f, mobile: e.target.value }))}
                      className="w-full h-[56px] bg-white/50 border border-blue-50/50 backdrop-blur-sm rounded-2xl px-4 text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" 
                      placeholder="Enter mobile number"
                    />
                  </div>

                  {/* Password */}
                  {!isEditing && (
                    <div>
                      <label className="block text-[11px] font-black text-blue-500 uppercase tracking-[1.5px] mb-3">Password</label>
                      <div className="relative">
                        <input
                          type={showCredsPassword ? "text" : "password"} required={!isEditing} value={formData.password}
                          onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                          className="w-full h-[56px] bg-white/50 border border-blue-50/50 backdrop-blur-sm rounded-2xl pl-4 pr-12 text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" 
                          placeholder="Leave blank for default"
                        />
                        <button type="button" onClick={() => setShowCredsPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                          {showCredsPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  )}



                  {/* Footer */}
                  <div className="pt-2">
                    <button
                      type="submit" disabled={isLoading}
                      className="w-full h-[58px] rounded-[18px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-[16px] font-bold transition-all disabled:opacity-50 shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /><span>{isEditing ? 'Saving...' : 'Initializing...'}</span></>
                      ) : (
                        <span>{isEditing ? 'Save Changes' : 'Initialize Member'}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </GlassCard>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProjectPickerOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              key="project-picker-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsProjectPickerOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="project-picker-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md relative z-10"
            >
              <GlassCard className="border-gray-200 p-6" gradient>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Select Projects</h3>
                  <button onClick={() => setIsProjectPickerOpen(false)} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text" value={projectSearch}
                    onChange={e => setProjectSearch(e.target.value)}
                    className={`${inputCls} pl-10`} placeholder="Search projects..."
                    autoFocus
                  />
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {filteredProjects.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No projects found</p>
                  ) : filteredProjects.map((project, idx) => {
                    const isSelected = selectedProjects.some(p => p._id === project._id);
                    return (
                      <button
                        key={project._id || `project-${idx}`} type="button"
                        onClick={() => toggleProject(project)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all',
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-slate-700 hover:border-blue-200'
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{project.name}</p>
                          {project.status && (
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{project.status}</p>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button" onClick={() => setSelectedProjects([])}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all text-sm"
                  >
                    Clear All
                  </button>
                  <button
                    type="button" onClick={() => setIsProjectPickerOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all text-sm shadow-lg shadow-blue-600/20"
                  >
                    Done ({selectedProjects.length})
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credential reveal modal — shown after successful user creation */}
      <AnimatePresence>
        {createdCreds && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md relative z-10"
            >
              <GlassCard className="border-emerald-200 p-8" gradient>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Member Added!</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Share these login credentials securely.</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {([
                    { label: 'Full Name', value: createdCreds.name, field: 'name', secret: false },
                    { label: 'Email', value: createdCreds.email, field: 'email', secret: false },
                    { label: 'Password', value: createdCreds.password, field: 'password', secret: true },
                  ] as Array<{ label: string; value: string; field: string; secret: boolean }>).map(({ label, value, field, secret }) => (
                    <div key={field} className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                        <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                          {secret && !showCredsPassword ? '••••••••' : value}
                        </p>
                      </div>
                      {secret && (
                        <button type="button" onClick={() => setShowCredsPassword(v => !v)} className="p-1.5 text-slate-400 hover:text-gray-700 transition-colors">
                          {showCredsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                      <button type="button" onClick={() => copyToClipboard(value, field)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                        {copiedField === field ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-5">
                  Save this password now. It won't be shown again.
                </p>

                <button
                  type="button"
                  onClick={() => { setCreatedCreds(null); onClose(); }}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/20"
                >
                  Done
                </button>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
