'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Users & Roles View
// Toggle between: Users (with project assignments) | Roles (default role matrix)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  ShieldCheck,
  Loader2,
  Building2,
  Crown,
  UserCheck,
  X,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  MinusCircle,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  Edit3,
  Trash2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Permission {
  module: string;
  actions: string[];
}

interface ProjectAssignment {
  projectId: string;
  projectName: string;
  projectStatus: string;
  projectType: string;
  projectRole: string;
  permissions: Permission[];
}

interface UserWithProjects {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  systemRole: string;
  avatar?: string;
  status: string;
  role?: { name: string; slug: string; permissions: Permission[] };
  projectAssignments: ProjectAssignment[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Static role & module data (mirrors backend project-permissions.ts)
// ---------------------------------------------------------------------------
const ALL_MODULES = [
  { key: 'projects',         label: 'Project Config' },
  { key: 'wbs',              label: 'WBS Hierarchy' },
  { key: 'tasks',            label: 'Tasks' },
  { key: 'milestones',       label: 'Milestones' },
  { key: 'dpr',              label: 'Daily Progress' },
  { key: 'weekly_reports',   label: 'Weekly Reports' },
  { key: 'procurement',      label: 'Procurement' },
  { key: 'purchase_orders',  label: 'Purchase Orders' },
  { key: 'drawings',         label: 'Drawings' },
  { key: 'rfis',             label: 'RFIs' },
  { key: 'mom',              label: 'Minutes of Meeting' },
  { key: 'risks',            label: 'Risks' },
  { key: 'snags',            label: 'Snags' },
  { key: 'ncrs',             label: 'NCRs' },
  { key: 'utilities',        label: 'Utilities' },
  { key: 'photos',           label: 'Site Photos' },
  { key: 'handover',         label: 'Handover' },
  { key: 'users',            label: 'Team / Members' },
  { key: 'filemgt',          label: 'File Management' },
  { key: 'financials',       label: 'Payments & Financials' },
];

const ALL_ACTIONS = ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];

type ProjectRoleKey = 'project_manager' | 'site_engineer' | 'quantity_surveyor' | 'designer' | 'sub_contractor' | 'client_representative' | 'viewer';

const full  = ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];
const crud  = ['create', 'read', 'update', 'delete'];
const cru   = ['create', 'read', 'update'];
const ro    = ['read'];
const none: string[] = [];

// Role permission matrix (mirrors backend project-permissions.ts)
const ROLE_MATRIX: Record<ProjectRoleKey, Record<string, string[]>> = {
  project_manager: {
    projects: full, wbs: full, tasks: full, milestones: full, dpr: full,
    weekly_reports: full, procurement: full, purchase_orders: full, drawings: full,
    rfis: full, mom: full, risks: full, snags: full, ncrs: full, utilities: full,
    photos: full, handover: full, users: full, filemgt: full, financials: full,
  },
  site_engineer: {
    projects: ro, wbs: ro, tasks: cru, milestones: ro, dpr: crud, weekly_reports: crud,
    procurement: ro, purchase_orders: ro, drawings: ro, rfis: crud, mom: crud,
    risks: crud, snags: crud, ncrs: crud, utilities: crud, photos: crud,
    handover: ro, users: ro, filemgt: crud, financials: ro,
  },
  quantity_surveyor: {
    projects: ro, wbs: ro, tasks: ro, milestones: ro, dpr: ro, weekly_reports: ro,
    procurement: crud, purchase_orders: crud, drawings: ro, rfis: ro, mom: ro,
    risks: ro, snags: ro, ncrs: ro, utilities: crud, photos: ro,
    handover: ro, users: none, filemgt: crud, financials: crud,
  },
  designer: {
    projects: ro, wbs: ro, tasks: ro, milestones: ro, dpr: none, weekly_reports: none,
    procurement: none, purchase_orders: none, drawings: crud, rfis: crud, mom: ro,
    risks: ro, snags: ro, ncrs: ro, utilities: none, photos: crud,
    handover: ro, users: none, filemgt: crud, financials: ro,
  },
  sub_contractor: {
    projects: ro, wbs: none, tasks: cru, milestones: none, dpr: ro, weekly_reports: none,
    procurement: ro, purchase_orders: ro, drawings: ro, rfis: ro, mom: none,
    risks: none, snags: ro, ncrs: ro, utilities: none, photos: ro,
    handover: none, users: none, filemgt: ro, financials: ro,
  },
  client_representative: {
    projects: ro, wbs: ro, tasks: ro, milestones: ro, dpr: ro, weekly_reports: ro,
    procurement: ro, purchase_orders: ro, drawings: ro, rfis: ro, mom: ro,
    risks: ro, snags: ro, ncrs: ro, utilities: ro, photos: ro,
    handover: ro, users: none, filemgt: ro, financials: ro,
  },
  viewer: {
    projects: ro, wbs: ro, tasks: ro, milestones: ro, dpr: ro, weekly_reports: ro,
    procurement: ro, purchase_orders: ro, drawings: ro, rfis: ro, mom: ro,
    risks: ro, snags: ro, ncrs: ro, utilities: ro, photos: ro,
    handover: ro, users: none, filemgt: ro, financials: ro,
  },
};

const ROLE_DEFS: { key: ProjectRoleKey; label: string; desc: string }[] = [
  { key: 'project_manager',       label: 'Project Manager',     desc: 'Full access to all modules' },
  { key: 'site_engineer',         label: 'Site Engineer',       desc: 'Field-focused CRUD + own tasks' },
  { key: 'quantity_surveyor',     label: 'Quantity Surveyor',   desc: 'Procurement & financials focused' },
  { key: 'designer',              label: 'Designer',            desc: 'Drawings, RFIs & photos access' },
  { key: 'sub_contractor',        label: 'Sub Contractor',      desc: 'Own tasks + limited read' },
  { key: 'client_representative', label: 'Client Rep.',         desc: 'Read-heavy + project config read' },
  { key: 'viewer',                label: 'Viewer',              desc: 'Read-only across all modules' },
];

// Action badge styling
const ACTION_COLORS: Record<string, string> = {
  create:  'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  read:    'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  update:  'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  delete:  'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  approve: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  export:  'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  manage:  'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SYSTEM_ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' },
  org_admin:   { label: 'Org Admin',   color: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' },
  manager:     { label: 'Manager',     color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' },
  member:      { label: 'Member',      color: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
  viewer:      { label: 'Viewer',      color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
};

const PROJECT_ROLE_LABELS: Record<string, string> = {
  project_manager: 'Project Manager', site_engineer: 'Site Engineer',
  quantity_surveyor: 'Quantity Surveyor', designer: 'Designer',
  client_representative: 'Client Rep.', sub_contractor: 'Sub Contractor', viewer: 'Viewer',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
  inactive:  'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  completed: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400',
  'on-hold': 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400',
};

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}
function getAvatarColor(name: string) {
  const colors = ['bg-violet-500','bg-blue-500','bg-emerald-500','bg-rose-500','bg-amber-500','bg-teal-500','bg-pink-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ---------------------------------------------------------------------------
// Add User Modal
// ---------------------------------------------------------------------------
interface AddUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  designation: string;
  department: string;
  systemRole: string;
}

const INITIAL_FORM: AddUserForm = {
  firstName: '', lastName: '', email: '', password: '',
  phone: '', designation: '', department: '', systemRole: 'member',
};

function AddUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<AddUserForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (field: keyof AddUserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error('First name, last name and email are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        systemRole: form.systemRole,
      };
      if (form.password.trim())  payload.password    = form.password.trim();
      if (form.phone.trim())      payload.phone       = form.phone.trim();
      if (form.designation.trim()) payload.designation = form.designation.trim();
      if (form.department.trim())  payload.department  = form.department.trim();

      await interiorProjectService.createUser(payload);
      toast.success(`User ${form.firstName} ${form.lastName} created successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = 'w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--muted)/0.5)] flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Add New User</h2>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Invite a team member to your organisation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[hsl(var(--muted))] rounded-lg text-[hsl(var(--muted-foreground))] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">First Name *</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="John" className={fieldCls} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Last Name *</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Doe" className={fieldCls} required />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input type="email" value={form.email} onChange={set('email')} placeholder="john@company.com" className={`${fieldCls} pl-9`} required />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Leave blank for Welcome@123"
                className={`${fieldCls} pl-9 pr-9`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors p-0.5 rounded focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Default password is <span className="font-mono font-semibold">Welcome@123</span> if left blank</p>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input value={form.phone} onChange={set('phone')} placeholder="+971 50 000 0000" className={`${fieldCls} pl-9`} />
            </div>
          </div>

          {/* Designation & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Designation</label>
              <input value={form.designation} onChange={set('designation')} placeholder="e.g. Site Engineer" className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Department</label>
              <input value={form.department} onChange={set('department')} placeholder="e.g. Operations" className={fieldCls} />
            </div>
          </div>

          {/* System Role */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">System Role</label>
            <select value={form.systemRole} onChange={set('systemRole')} className={fieldCls}>
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="org_admin">Org Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit User Modal
// ---------------------------------------------------------------------------
interface EditUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  designation?: string;
  department?: string;
  systemRole: string;
  status: string;
}

function EditUserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: UserWithProjects;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<EditUserForm>({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    password: '',
    phone: user.phone || '',
    designation: user.designation || '',
    department: user.department || '',
    systemRole: user.systemRole || 'member',
    status: user.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (field: keyof EditUserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error('First name, last name and email are required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        systemRole: form.systemRole,
        status: form.status,
      };
      if (form.password && form.password.trim()) payload.password = form.password.trim();
      payload.phone = form.phone ? form.phone.trim() : '';
      payload.designation = form.designation ? form.designation.trim() : '';
      payload.department = form.department ? form.department.trim() : '';

      await interiorProjectService.updateUser(user._id, payload);
      toast.success(`User ${form.firstName} ${form.lastName} updated successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = 'w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--muted)/0.5)] flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Edit User</h2>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Update profile details and system access</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[hsl(var(--muted))] rounded-lg text-[hsl(var(--muted-foreground))] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">First Name *</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="John" className={fieldCls} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Last Name *</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Doe" className={fieldCls} required />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" className={`${fieldCls} pl-9`} required />
            </div>
          </div>

          {/* Reset Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">New Password (leave blank to keep current)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                className={`${fieldCls} pl-9 pr-9`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors p-0.5 rounded focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className={`${fieldCls} pl-9`} />
            </div>
          </div>

          {/* Designation & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Designation</label>
              <input value={form.designation} onChange={set('designation')} placeholder="e.g. Project Manager" className={fieldCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Department</label>
              <input value={form.department} onChange={set('department')} placeholder="e.g. Operations" className={fieldCls} />
            </div>
          </div>

          {/* System Role & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">System Role</label>
              <select value={form.systemRole} onChange={set('systemRole')} className={fieldCls}>
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="org_admin">Org Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Account Status</label>
              <select value={form.status} onChange={set('status')} className={fieldCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete User Confirm Modal
// ---------------------------------------------------------------------------
function DeleteUserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: UserWithProjects;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await interiorProjectService.deleteUser(user._id);
      toast.success(`User ${user.firstName} ${user.lastName} deleted successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 z-10 space-y-4 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Delete User</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Are you sure you want to remove <strong className="text-[hsl(var(--foreground))]">{user.firstName} {user.lastName}</strong> ({user.email})?
          {user.projectAssignments.length > 0 && (
            <span className="block mt-1 text-amber-600 dark:text-amber-400 font-semibold">
              Warning: User has {user.projectAssignments.length} project assignment{user.projectAssignments.length > 1 ? 's' : ''} that will also be removed.
            </span>
          )}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {deleting ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Permission Detail Modal (for Users tab)
// ---------------------------------------------------------------------------
function PermissionsModal({ assignment, onClose }: { assignment: ProjectAssignment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 z-10 space-y-4 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[hsl(var(--primary))]" /> Permissions — {assignment.projectName}
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Role: <span className="font-semibold text-[hsl(var(--foreground))]">{PROJECT_ROLE_LABELS[assignment.projectRole] ?? assignment.projectRole}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[hsl(var(--muted))] rounded-lg text-[hsl(var(--muted-foreground))] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
          {assignment.permissions.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6">No custom permissions set</p>
          ) : (
            assignment.permissions.map((perm) => (
              <div key={perm.module} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-[hsl(var(--muted)/0.4)]">
                <span className="text-xs font-semibold text-[hsl(var(--foreground))] capitalize">{perm.module.replace(/_/g, ' ')}</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {perm.actions.map((action) => (
                    <span key={action} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ACTION_COLORS[action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Row (expandable)
// ---------------------------------------------------------------------------
function UserRow({ user, onUserUpdated }: { user: UserWithProjects; onUserUpdated: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ProjectAssignment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const initials = getInitials(user.firstName, user.lastName);
  const avatarBg = getAvatarColor(user.firstName + user.lastName);
  const sysRole = SYSTEM_ROLE_LABELS[user.systemRole] ?? { label: user.systemRole, color: 'bg-slate-100 text-slate-600' };

  return (
    <>
      {selectedAssignment && (
        <AnimatePresence>
          <PermissionsModal assignment={selectedAssignment} onClose={() => setSelectedAssignment(null)} />
        </AnimatePresence>
      )}
      {isEditOpen && (
        <AnimatePresence>
          <EditUserModal user={user} onClose={() => setIsEditOpen(false)} onSuccess={onUserUpdated} />
        </AnimatePresence>
      )}
      {isDeleteOpen && (
        <AnimatePresence>
          <DeleteUserModal user={user} onClose={() => setIsDeleteOpen(false)} onSuccess={onUserUpdated} />
        </AnimatePresence>
      )}
      <motion.div layout className="border border-[hsl(var(--border))] rounded-xl overflow-hidden bg-[hsl(var(--card))]">
        <div onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[hsl(var(--muted)/0.4)] transition-colors">
          <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[hsl(var(--foreground))]">{user.firstName} {user.lastName}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sysRole.color}`}>{sysRole.label}</span>
              {user.status !== 'active' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">{user.status}</span>
              )}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate">{user.email}</p>
            {(user.designation || user.department) && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">{[user.designation, user.department].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user.role && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]">
                <Crown className="w-3 h-3 text-[hsl(var(--primary))]" />
                <span className="text-[11px] font-semibold text-[hsl(var(--foreground))]">{user.role.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))]">
              <FolderKanban className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
              <span className="text-[11px] font-semibold text-[hsl(var(--foreground))]">{user.projectAssignments.length}</span>
            </div>

            {/* Edit & Delete Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditOpen(true);
                }}
                className="p-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
                title="Edit User Details"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteOpen(true);
                }}
                className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                title="Delete User"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {expanded ? <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="border-t border-[hsl(var(--border))] overflow-hidden">
              <div className="p-4 space-y-3">
                {user.projectAssignments.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] italic py-2 text-center">Not assigned to any project yet.</p>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide mb-2">
                      Project Assignments ({user.projectAssignments.length})
                    </p>
                    <div className="space-y-2">
                      {user.projectAssignments.map((asgn) => (
                        <div key={asgn.projectId} className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))]">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-[hsl(var(--primary))]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[hsl(var(--foreground))] truncate">{asgn.projectName}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${PROJECT_STATUS_COLORS[asgn.projectStatus] ?? 'bg-slate-100 text-slate-500'}`}>{asgn.projectStatus}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <div className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{PROJECT_ROLE_LABELS[asgn.projectRole] ?? asgn.projectRole}</span>
                              </div>
                              {asgn.projectType && <span className="text-[11px] text-[hsl(var(--muted-foreground))]">· {asgn.projectType}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.15)]">
                              <ShieldCheck className="w-3 h-3 text-[hsl(var(--primary))]" />
                              <span className="text-[11px] font-semibold text-[hsl(var(--primary))]">{asgn.permissions.length} modules</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedAssignment(asgn); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors border border-[hsl(var(--border))] cursor-pointer">
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Role Card (expandable — for Roles tab)
// ---------------------------------------------------------------------------
function RoleCard({ roleDef }: { roleDef: typeof ROLE_DEFS[number] }) {
  const [expanded, setExpanded] = useState(false);
  const matrix = ROLE_MATRIX[roleDef.key];
  const totalModules = ALL_MODULES.length;
  const modulesWithAccess = ALL_MODULES.filter((m) => (matrix[m.key] ?? []).length > 0).length;
  const fullAccessCount = ALL_MODULES.filter((m) => (matrix[m.key] ?? []).join(',') === full.join(',')).length;

  return (
    <motion.div layout className="border border-[hsl(var(--border))] rounded-xl overflow-hidden bg-[hsl(var(--card))]">
      {/* Header */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[hsl(var(--muted)/0.4)] transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[hsl(var(--foreground))]">{roleDef.label}</span>
            {roleDef.key === 'project_manager' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">FULL ACCESS</span>
            )}
          </div>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">{roleDef.desc}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            <span className="text-xs font-bold text-[hsl(var(--foreground))]">{modulesWithAccess}/{totalModules}</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">modules</span>
          </div>
          {fullAccessCount > 0 && (
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">{fullAccessCount}</span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">full</span>
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
        </div>
      </div>

      {/* Expanded permission matrix */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[hsl(var(--card))] border-t border-[hsl(var(--border))]">
              {/* Action legend */}
              <div className="flex flex-wrap gap-1.5 px-5 pt-4 pb-2">
                {ALL_ACTIONS.map((a) => (
                  <span key={a} className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${ACTION_COLORS[a]}`}>{a}</span>
                ))}
              </div>

              {/* Module rows */}
              <div className="divide-y divide-[hsl(var(--border))]">
                {ALL_MODULES.map((mod) => {
                  const actions: string[] = matrix[mod.key] ?? [];
                  const hasAccess = actions.length > 0;
                  return (
                    <div key={mod.key} className="flex items-center gap-3 px-5 py-2.5">
                      {/* Module name */}
                      <div className="w-36 shrink-0 flex items-center gap-1.5">
                        {hasAccess
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          : <MinusCircle className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] opacity-40 shrink-0" />
                        }
                        <span className={`text-xs font-semibold ${hasAccess ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] opacity-50'}`}>
                          {mod.label}
                        </span>
                      </div>

                      {/* Action pills */}
                      <div className="flex flex-wrap gap-1">
                        {hasAccess ? (
                          actions.map((action) => (
                            <span key={action} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ACTION_COLORS[action] ?? 'bg-slate-100 text-slate-600'}`}>
                              {action}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-40 italic">no access</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="h-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------
export default function InteriorUsersRolesView() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<UserWithProjects[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await interiorProjectService.getUsersWithProjects();
      setUsers(res?.data ?? res ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.designation ?? '').toLowerCase().includes(q) ||
      (u.department ?? '').toLowerCase().includes(q) ||
      u.projectAssignments.some((a) => a.projectName.toLowerCase().includes(q));
    const matchesRole = roleFilter === 'All' || u.systemRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalProjects = [...new Set(users.flatMap((u) => u.projectAssignments.map((a) => a.projectId)))].length;
  const activeUsers  = users.filter((u) => u.status === 'active').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-2.5">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[hsl(var(--primary))]" />
            Users &amp; Roles
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Team members with project assignments, and role permission matrix.
          </p>
        </div>
        {activeTab === 'users' && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={loadUsers} className="text-xs font-semibold" isLoading={isLoading}>
              Refresh
            </Button>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddUserOpen && (
          <AddUserModal onClose={() => setIsAddUserOpen(false)} onSuccess={loadUsers} />
        )}
      </AnimatePresence>

      {/* ── Tab toggle ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Users
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Roles
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════ USERS TAB ═══════════════════════════════════ */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{isLoading ? '—' : users.length}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-medium">Total Users</p>
              </div>
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{isLoading ? '—' : activeUsers}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-medium">Active</p>
              </div>
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center">
                <p className="text-2xl font-bold text-[hsl(var(--primary))]">{isLoading ? '—' : totalProjects}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-medium">Projects Covered</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-80">
                <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, or project..."
                  icon={<Search className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />} />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] w-full sm:w-auto">
                <option value="All">All System Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="org_admin">Org Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              {(searchQuery || roleFilter !== 'All') && (
                <button onClick={() => { setSearchQuery(''); setRoleFilter('All'); }}
                  className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer shrink-0">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              <span className="ml-auto text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                {filteredUsers.length} of {users.length} users
              </span>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm font-medium">Loading users…</span>
              </div>
            )}

            {/* User list */}
            {!isLoading && (
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No users match your search.</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <UserRow key={user._id} user={user} onUserUpdated={loadUsers} />
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════ ROLES TAB ═══════════════════════════════════ */}
        {activeTab === 'roles' && (
          <motion.div key="roles" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-5">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
              <ShieldCheck className="w-4 h-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--foreground))]">Default Project Roles</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  These are the built-in permission presets automatically assigned when a user is added to a project. Click any role to expand its full permission matrix.
                </p>
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
              {ROLE_DEFS.map((r) => (
                <div key={r.key} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 text-center">
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">{r.label}</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    {ALL_MODULES.filter((m) => (ROLE_MATRIX[r.key][m.key] ?? []).length > 0).length} modules
                  </p>
                </div>
              ))}
            </div>

            {/* Role cards */}
            <div className="space-y-3">
              {ROLE_DEFS.map((roleDef) => (
                <RoleCard key={roleDef.key} roleDef={roleDef} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
