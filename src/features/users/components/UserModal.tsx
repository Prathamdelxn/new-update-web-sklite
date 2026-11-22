'use client';
import { tr } from '@/i18n';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  UserPlus,
  UserCog,
  User,
  Mail,
  Lock,
  Phone,
  FolderOpen,
  Check,
  ChevronDown,
  Search,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  Shield,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { cn } from '@/lib/utils';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
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
        setProjects(
          Array.isArray(projectsRes.data)
            ? projectsRes.data
            : projectsRes.data?.projects ?? []
        );
      } catch {
        // silent error handling for initial load
      }
    };
    load();

    if (initialData) {
      const roleName = typeof initialData.role === 'object' ? initialData.role?.name : (typeof initialData.role === 'string' ? initialData.role : '');
      const isTargetAdmin =
        roleName?.toLowerCase() === 'admin' ||
        initialData.isAdmin === true ||
        initialData.isSystemRole === true ||
        (typeof initialData.role === 'object' && (
          initialData.role?.name?.toLowerCase() === 'admin' ||
          initialData.role?.permissions?.includes('*') ||
          initialData.role?.isSystemRole === true
        ));

      if (isTargetAdmin) {
        toast.error(tr("Admin accounts are system-protected and cannot be edited."));
        onClose();
        return;
      }

      Promise.resolve().then(() => {
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
          }
        });
        setSelectedProjects(projArr);
        setProjectRoles(pRoles);
      });
    } else {
      Promise.resolve().then(() => {
        setFormData({ name: '', email: '', mobile: '', password: '' });
        setSelectedRole(null);
        setSelectedProjects([]);
        setProjectRoles({});
      });
    }
    setProjectSearch('');
    setShowCredsPassword(false);
  }, [isOpen, initialData]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleProject = (project: any) => {
    setSelectedProjects((prev) => {
      const isSelected = prev.some((p) => p._id === project._id);
      if (isSelected) {
        setProjectRoles((roles) => {
          const newRoles = { ...roles };
          delete newRoles[project._id];
          return newRoles;
        });
        return prev.filter((p) => p._id !== project._id);
      }
      return [...prev, project];
    });
  };

  const removeProject = (projectId: string) => {
    setSelectedProjects((prev) => prev.filter((p) => p._id !== projectId));
    setProjectRoles((roles) => {
      const next = { ...roles };
      delete next[projectId];
      return next;
    });
  };

  const filteredProjects = projects.filter((p) =>
    p.name?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error(tr("Please enter full name and email address."));
      return;
    }

    const cleanPhone = formData.mobile.trim().replace(/[\s-]/g, '');
    if (!cleanPhone) {
      toast.error(tr("Please enter a mobile phone number."));
      return;
    }
    if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
      toast.error(
        tr("Please enter a valid mobile number (e.g. +91 9876543210 or 10 digits).")
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNumber: cleanPhone,
        roleId: selectedRole?._id || undefined,
        projects: selectedProjects.map((p) => ({
          project: p._id,
          role: projectRoles[p._id] || undefined,
        })),
      };

      if (isEditing) {
        if (formData.password?.trim()) {
          payload.password = formData.password.trim();
        }
        await api.patch(`/users/${initialData._id}`, payload);
        toast.success(tr("Team member updated successfully!"));
        onSuccess();
        onClose();
      } else {
        const finalPassword = formData.password?.trim() || 'welcome123';
        payload.password = finalPassword;
        await api.post('/users', payload);
        setCreatedCreds({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: finalPassword,
        });
        onSuccess();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          (isEditing ? tr("Failed to update user") : tr("Failed to onboard user"))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Container — Compact, 2-column landscape design to avoid scrolling */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-3xl relative z-10"
            >
              <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden flex flex-col">
                
                {/* ── Modal Header ── */}
                <div className="px-5 py-3.5 border-b border-slate-150 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-50 via-white to-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center shrink-0">
                      {isEditing ? (
                        <UserCog className="w-4.5 h-4.5 stroke-[2]" />
                      ) : (
                        <UserPlus className="w-4.5 h-4.5 stroke-[2]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-150">
                          {isEditing ? tr("Member Management") : tr("Team Onboarding")}
                        </span>
                      </div>
                      <h2 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
                        {isEditing ? tr("Update Team Member") : tr("Onboard New Member")}
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title={tr("Close modal")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* ── Form Body: Side-by-Side Panels (Non-scrollable on desktop) ── */}
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* ── Left Column: Personal & Contact Information ── */}
                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                            {tr("Identity & Contact")}
                          </h3>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {tr("Personal Info")}
                        </span>
                      </div>

                      {/* Full Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {tr("Full Name ")}<span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((f) => ({ ...f, name: e.target.value }))
                            }
                            placeholder={tr("e.g. Robert Fox")}
                            className="w-full ps-8.5 pe-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {tr("Email Address ")}<span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) =>
                              setFormData((f) => ({ ...f, email: e.target.value }))
                            }
                            placeholder={tr("name@company.com")}
                            className="w-full ps-8.5 pe-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                          />
                        </div>
                      </div>

                      {/* Mobile Number & Password in a tight sub-grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Mobile Number */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {tr("Mobile ")}<span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="tel"
                              required
                              value={formData.mobile}
                              onChange={(e) =>
                                setFormData((f) => ({ ...f, mobile: e.target.value }))
                              }
                              placeholder="+91..."
                              className="w-full ps-7.5 pe-2 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                            />
                          </div>
                        </div>

                        {/* Password */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                            {isEditing ? tr("New Password") : tr("Password")}
                            <span className="text-slate-400 font-normal ms-0.5 text-[10px]">
                              {isEditing ? tr("(Option)") : tr("(Default)")}
                            </span>
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type={showCredsPassword ? 'text' : 'password'}
                              value={formData.password}
                              onChange={(e) =>
                                setFormData((f) => ({
                                  ...f,
                                  password: e.target.value,
                                }))
                              }
                              placeholder={isEditing ? tr("Unchanged") : tr("welcome123")}
                              className="w-full ps-7.5 pe-7 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCredsPassword((v) => !v)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                              title={showCredsPassword ? tr("Hide") : tr("Show")}
                            >
                              {showCredsPassword ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Right Column: Organisation Role & Project Scopes ── */}
                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 space-y-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                            {tr("Access & Permissions")}
                          </h3>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {tr("Role & Scope")}
                        </span>
                      </div>

                      {/* Global Role */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            {tr("Global Organisation Role")}
                          </label>
                          <span className="text-[10px] text-slate-400">{tr("System-wide")}</span>
                        </div>
                        <div className="relative">
                          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          <select
                            value={selectedRole?._id || ''}
                            onChange={(e) =>
                              setSelectedRole(
                                roles.find((r) => r._id === e.target.value) || null
                              )
                            }
                            className="w-full ps-8.5 pe-8 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300 appearance-none cursor-pointer"
                          >
                            <option value="">{tr("No global role (project-scoped access)")}</option>
                            {roles.map((role) => (
                              <option key={role._id} value={role._id}>
                                {tr(role.name)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Project Assignments */}
                      <div className="flex-1 flex flex-col pt-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                            <label className="text-[11px] font-bold text-slate-700">
                              {tr("Assigned Projects")}
                            </label>
                            <span className="text-[9.5px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full">
                              {selectedProjects.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsProjectPickerOpen(true)}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>{selectedProjects.length > 0 ? tr("Edit Selection") : tr("+ Assign")}</span>
                          </button>
                        </div>

                        {selectedProjects.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => setIsProjectPickerOpen(true)}
                            className="flex-1 min-h-[76px] border border-dashed border-slate-200/90 rounded-lg bg-white/70 hover:bg-blue-50/50 hover:border-blue-300 transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer group"
                          >
                            <FolderOpen className="w-4 h-4 text-slate-300 group-hover:text-blue-500 mb-0.5 transition-colors" />
                            <p className="text-xs font-bold text-slate-600 group-hover:text-blue-600">
                              {tr("Assign Projects")}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {tr("Restrict access to specific projects")}
                            </p>
                          </button>
                        ) : (
                          <div className="space-y-1.5 max-h-[82px] overflow-y-auto custom-scrollbar pe-0.5">
                            {selectedProjects.map((project) => (
                              <div
                                key={project._id}
                                className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200/90 rounded-lg hover:border-slate-300 transition-all"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {tr(project.name)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <select
                                    value={projectRoles[project._id] || ''}
                                    onChange={(e) =>
                                      setProjectRoles((prev) => ({
                                        ...prev,
                                        [project._id]: e.target.value,
                                      }))
                                    }
                                    className="text-[10.5px] font-semibold bg-slate-50 border border-slate-200 rounded py-0.5 px-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                  >
                                    <option value="">{tr("Global role")}</option>
                                    {roles.map((role) => (
                                      <option key={role._id} value={role._id}>
                                        {tr(role.name)}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => removeProject(project._id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title={tr("Remove project")}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Sticky Modal Footer ── */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400">
                      <span className="text-rose-500 font-bold">*</span>{tr(" Required fields marked")}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        {tr("Cancel")}
                      </button>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>
                              {isEditing ? tr("Saving...") : tr("Initializing...")}
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>
                              {isEditing ? tr("Save Changes") : tr("Initialize Member")}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Project Picker Sub-Modal ── */}
      <AnimatePresence>
        {isProjectPickerOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProjectPickerOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-150 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-50 via-white to-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center shrink-0">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {tr("Select Projects")}
                      </h3>
                      <p className="text-[10.5px] font-semibold text-slate-400">
                        {tr("Choose projects to assign this member")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsProjectPickerOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder={tr("Search projects by name...")}
                      className="w-full ps-9 pe-3 py-1.5 bg-slate-50/70 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                      autoFocus
                    />
                  </div>

                  {/* Project List */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pe-1 max-h-56">
                    {filteredProjects.length === 0 ? (
                      <div className="text-center py-6">
                        <FolderOpen className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-500">
                          {tr("No matching projects found")}
                        </p>
                      </div>
                    ) : (
                      filteredProjects.map((project, idx) => {
                        const isSelected = selectedProjects.some(
                          (p) => p._id === project._id
                        );
                        return (
                          <button
                            key={project._id || `proj-${idx}`}
                            type="button"
                            onClick={() => toggleProject(project)}
                            className={cn(
                              'w-full flex items-center justify-between p-2.5 rounded-xl border text-start transition-all cursor-pointer',
                              isSelected
                                ? 'bg-blue-50/70 border-blue-300'
                                : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                            )}
                          >
                            <div className="min-w-0 pe-2">
                              <p
                                className={cn(
                                  'text-xs font-bold truncate',
                                  isSelected ? 'text-blue-900' : 'text-slate-800'
                                )}
                              >
                                {tr(project.name)}
                              </p>
                              {project.status && (
                                <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">
                                  {tr(project.status)}
                                </span>
                              )}
                            </div>
                            <div
                              className={cn(
                                'w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all',
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              )}
                            >
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedProjects([])}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                  >
                    {tr("Clear All")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProjectPickerOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold transition-all border border-slate-300 cursor-pointer"
                  >
                    {tr("Apply Selection (")}{selectedProjects.length})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Credential Reveal Modal ── */}
      <AnimatePresence>
        {createdCreds && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {tr("Success")}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
                      {tr("Member Onboarded!")}
                    </h3>
                    <p className="text-[10.5px] font-medium text-slate-500">
                      {tr("Share these initial credentials securely with the member.")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-3.5">
                  {[
                    {
                      label: 'Full Name',
                      value: createdCreds.name,
                      field: 'name',
                      secret: false,
                      icon: User,
                    },
                    {
                      label: 'Email Address',
                      value: createdCreds.email,
                      field: 'email',
                      secret: false,
                      icon: Mail,
                    },
                    {
                      label: 'Initial Password',
                      value: createdCreds.password,
                      field: 'password',
                      secret: true,
                      icon: Lock,
                    },
                  ].map(({ label, value, field, secret, icon: Icon }) => (
                    <div
                      key={field}
                      className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl"
                    >
                      <div className="w-6.5 h-6.5 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          {tr(label)}
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate mt-0.5 font-mono">
                          {secret && !showCredsPassword ? '••••••••••••' : value}
                        </p>
                      </div>
                      {secret && (
                        <button
                          type="button"
                          onClick={() => setShowCredsPassword((v) => !v)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title={
                            showCredsPassword
                              ? tr("Hide password")
                              : tr("Show password")
                          }
                        >
                          {showCredsPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(value, field)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        title={tr("Copy to clipboard")}
                      >
                        {copiedField === field ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-[10.5px] font-semibold mb-4">
                  <span className="shrink-0 text-sm">⚠️</span>
                  <span className="leading-relaxed">
                    {tr("Save or copy these credentials now. For security purposes, this password will not be displayed again.")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedCreds(null);
                    onClose();
                  }}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs border border-emerald-600/30 transition-all cursor-pointer"
                >
                  {tr("Done & Close")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
