'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Users & Roles Management
// Matches the exact format and corporate ledger table UI of Audit Management:
// Executive ribbon, 4 KPI metric cards, quick segments, filter controls card,
// clean non-colorful table ledger with integrated pagination & inspection modal.
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Button, Input } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';
import { InteriorRolesManager } from '@/features/interior-new/components/InteriorRolesManager';
import { cn } from '@/lib/utils';
import {
  Users,
  Search,
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
  Edit3,
  Trash2,
  Lock,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  FileCode,
  Layers,
  Globe,
  Clock,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

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

export interface OrgRole {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: Permission[];
  isSystem?: boolean;
}

export const DEFAULT_ORG_ROLES: OrgRole[] = [
  { _id: 'admin', name: 'Admin', slug: 'admin', permissions: [] },
  { _id: 'project_manager', name: 'Project Manager', slug: 'project-manager', permissions: [] },
  { _id: 'sales_executive', name: 'Sales / CRM Executive', slug: 'sales-executive', permissions: [] },
  { _id: 'designer', name: 'Designer / Architect', slug: 'designer', permissions: [] },
  { _id: 'quantity_surveyor', name: 'Quantity Surveyor', slug: 'quantity-surveyor', permissions: [] },
  { _id: 'site_engineer', name: 'Site Engineer', slug: 'site-engineer', permissions: [] },
  { _id: 'sub_contractor', name: 'Sub Contractor', slug: 'sub-contractor', permissions: [] },
  { _id: 'client_representative', name: 'Client Representative', slug: 'client-representative', permissions: [] },
  { _id: 'viewer', name: 'Viewer', slug: 'viewer', permissions: [] },
];

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
  role?: { _id?: string; name: string; slug: string; permissions: Permission[] };
  projectAssignments: ProjectAssignment[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Action & Status badge styling (matching Audit Management)
// ---------------------------------------------------------------------------
const ACTION_COLORS: Record<string, string> = {
  create:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  read:    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
  update:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  delete:  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
  approve: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
  export:  'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25',
  manage:  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
};

const SYSTEM_ROLE_LABELS: Record<string, { label: string; badgeClass: string }> = {
  super_admin: { label: 'Super Admin', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25' },
  org_admin:   { label: 'Org Admin',   badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25' },
  manager:     { label: 'Manager',     badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25' },
  member:      { label: 'Member',      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25' },
  viewer:      { label: 'Viewer',      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25' },
};

const PROJECT_ROLE_LABELS: Record<string, string> = {
  project_manager: 'Project Manager',
  site_engineer: 'Site Engineer',
  quantity_surveyor: 'Quantity Surveyor',
  designer: 'Designer',
  client_representative: 'Client Rep.',
  sub_contractor: 'Sub Contractor',
  viewer: 'Viewer',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25',
  inactive:  'bg-slate-500/10 text-slate-600 border border-slate-500/25',
  completed: 'bg-blue-500/10 text-blue-600 border border-blue-500/25',
  'on-hold': 'bg-amber-500/10 text-amber-600 border border-amber-500/25',
};

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'U';
}

const isNonAdminRole = (r: OrgRole) => {
  const slug = (r.slug || '').toLowerCase();
  const name = (r.name || '').toLowerCase();
  return (
    slug !== 'admin' &&
    slug !== 'org_admin' &&
    slug !== 'administrator' &&
    name !== 'admin' &&
    name !== 'administrator' &&
    name !== 'org admin'
  );
};

// ---------------------------------------------------------------------------
// Quick Segment Options
// ---------------------------------------------------------------------------
const QUICK_SEGMENTS = [
  { id: 'all',        label: 'All Members' },
  { id: 'active',     label: 'Active Accounts' },
  { id: 'assigned',   label: 'Assigned to Projects' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'admin',      label: 'Admins & Managers' },
];

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
  roleId: string;
}

const INITIAL_FORM: AddUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  designation: '',
  department: '',
  roleId: '',
};

function AddUserModal({
  roles,
  onClose,
  onSuccess,
}: {
  roles: OrgRole[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const { isOrgAdmin } = usePermissions();
  const roleFilterFn = isOrgAdmin ? () => true : isNonAdminRole;
  const availableRoles = (roles && roles.length > 0 ? roles : DEFAULT_ORG_ROLES).filter(roleFilterFn);
  const [modalRoles, setModalRoles] = useState<OrgRole[]>(() => availableRoles);
  const [form, setForm] = useState<AddUserForm>(() => ({
    ...INITIAL_FORM,
    roleId: availableRoles[0]?._id || availableRoles[0]?.slug || 'project_manager',
  }));
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    interiorProjectService
      .getRoles()
      .then((res) => {
        const raw = res?.data ?? res ?? [];
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        const filtered = list.filter(roleFilterFn);
        if (filtered.length > 0) {
          setModalRoles(filtered);
          setForm((prev) => {
            const hasMatch = filtered.some((r: OrgRole) => r._id === prev.roleId || r.slug === prev.roleId);
            return hasMatch && prev.roleId ? prev : { ...prev, roleId: filtered[0]._id || filtered[0].slug };
          });
        }
      })
      .catch((e) => console.error('AddUserModal fetch roles error:', e));
  }, [isOrgAdmin]);

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
      const selectedRole = modalRoles.find((r) => r._id === form.roleId || r.slug === form.roleId);
      const systemRole = (selectedRole?.slug === 'admin' || selectedRole?.slug === 'org_admin') ? 'org_admin' : 'member';

      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.roleId || undefined,
        designation: form.designation.trim() || undefined,
        department: form.department.trim() || undefined,
        systemRole,
      };
      if (form.password.trim())  payload.password = form.password.trim();
      if (form.phone.trim())     payload.phone    = form.phone.trim();

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

  const fieldCls = 'w-full px-3.5 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <UserPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Add New Member</h2>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Create an account and assign organization permissions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[hsl(var(--accent))] rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">First Name *</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="John" className={fieldCls} required />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Last Name *</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Doe" className={fieldCls} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input type="email" value={form.email} onChange={set('email')} placeholder="john.doe@company.com" className={`${fieldCls} pl-9`} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Initial Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Leave blank for default: welcome123"
                className={`${fieldCls} pl-9 pr-9`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Default password is <span className="font-mono font-semibold text-[hsl(var(--foreground))]">welcome123</span></p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className={`${fieldCls} pl-9`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Designation</label>
              <input value={form.designation} onChange={set('designation')} placeholder="e.g. Senior Architect" className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Department</label>
              <input value={form.department} onChange={set('department')} placeholder="e.g. Fit-Out Operations" className={fieldCls} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Organization Role *</label>
            <select value={form.roleId} onChange={set('roleId')} className={fieldCls} required>
              {modalRoles.map((r) => (
                <option key={r._id || r.slug} value={r._id || r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[hsl(var(--border))]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8.5 text-xs font-semibold">
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm" disabled={saving} className="h-8.5 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{saving ? 'Creating...' : 'Create Member'}</span>
            </Button>
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
  roleId: string;
  status: string;
}

function EditUserModal({
  user,
  roles,
  onClose,
  onSuccess,
}: {
  user: UserWithProjects;
  roles: OrgRole[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const { isOrgAdmin } = usePermissions();
  const isEditingAdmin = isOrgAdmin || user.systemRole === 'org_admin' || user.systemRole === 'super_admin' || user.role?.slug === 'admin';
  const roleFilterFn = isEditingAdmin ? () => true : isNonAdminRole;
  const availableRoles = (roles && roles.length > 0 ? roles : DEFAULT_ORG_ROLES).filter(roleFilterFn);
  const [modalRoles, setModalRoles] = useState<OrgRole[]>(() => availableRoles);
  const matchedRole = user.role?._id 
    ? availableRoles.find(r => r._id === user.role?._id) 
    : availableRoles.find(r => r.name.toLowerCase() === user.role?.name?.toLowerCase() || r.slug === user.systemRole || r._id === user.systemRole);

  const [form, setForm] = useState<EditUserForm>({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    password: '',
    phone: user.phone || '',
    designation: user.designation || '',
    department: user.department || '',
    roleId: matchedRole?._id || matchedRole?.slug || availableRoles[0]?._id || 'project_manager',
    status: user.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    interiorProjectService
      .getRoles()
      .then((res) => {
        const raw = res?.data ?? res ?? [];
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        const filtered = list.filter(roleFilterFn);
        if (filtered.length > 0) setModalRoles(filtered);
      })
      .catch((e) => console.error('EditUserModal fetch roles error:', e));
  }, [isEditingAdmin]);

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
      const selectedRole = modalRoles.find((r) => r._id === form.roleId || r.slug === form.roleId);
      const systemRole = (selectedRole?.slug === 'admin' || selectedRole?.slug === 'org_admin') ? 'org_admin' : (user.systemRole || 'member');

      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.roleId || undefined,
        designation: form.designation?.trim() || undefined,
        department: form.department?.trim() || undefined,
        systemRole,
        status: form.status,
      };
      if (form.password && form.password.trim()) payload.password = form.password.trim();
      payload.phone = form.phone ? form.phone.trim() : '';

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

  const fieldCls = 'w-full px-3.5 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] focus:border-[hsl(var(--primary))] transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Edit3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Edit User Account</h2>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Update profile details, permissions, and status</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[hsl(var(--accent))] rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">First Name *</label>
              <input value={form.firstName} onChange={set('firstName')} placeholder="John" className={fieldCls} required />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Last Name *</label>
              <input value={form.lastName} onChange={set('lastName')} placeholder="Doe" className={fieldCls} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" className={`${fieldCls} pl-9`} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">New Password (leave blank to keep current)</label>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className={`${fieldCls} pl-9`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Designation</label>
              <input value={form.designation} onChange={set('designation')} placeholder="e.g. Senior Architect" className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Department</label>
              <input value={form.department} onChange={set('department')} placeholder="e.g. Design Studio" className={fieldCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Role *</label>
              <select value={form.roleId} onChange={set('roleId')} className={fieldCls} required>
                {modalRoles.map((r) => (
                  <option key={r._id || r.slug} value={r._id || r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">Account Status</label>
              <select value={form.status} onChange={set('status')} className={fieldCls}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[hsl(var(--border))]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8.5 text-xs font-semibold">
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm" disabled={saving} className="h-8.5 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 z-10 space-y-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">Delete User Account</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Are you sure you want to remove <strong className="text-[hsl(var(--foreground))] font-bold">{user.firstName} {user.lastName}</strong> ({user.email})?
          {user.projectAssignments.length > 0 && (
            <span className="block mt-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium text-[11px]">
              Warning: User has {user.projectAssignments.length} project assignment{user.projectAssignments.length > 1 ? 's' : ''} that will also be detached.
            </span>
          )}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs font-semibold">
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="h-8 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{deleting ? 'Deleting...' : 'Delete'}</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Granular User Inspector Modal (Matching Audit Management Inspector)
// ---------------------------------------------------------------------------
function UserInspectorModal({
  user,
  onClose,
  onEdit,
}: {
  user: UserWithProjects;
  onClose: () => void;
  onEdit: () => void;
}) {
  const toast = useToast();
  const [modalTab, setModalTab] = useState<'overview' | 'projects' | 'json'>('overview');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const initials = getInitials(user.firstName, user.lastName);
  const sysRole = SYSTEM_ROLE_LABELS[user.systemRole] ?? { label: user.systemRole, badgeClass: 'bg-slate-500/10 text-slate-600 border-slate-500/25' };
  const displayRoleName = user.role?.name || sysRole.label;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-[hsl(var(--card-foreground))]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {initials}
            </div>
            <div>
              <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <span>{user.firstName} {user.lastName}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                  #{user._id.slice(-6)}
                </span>
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {user.email} · Registered on {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(user, null, 2))}
              className="h-8.5 rounded-xl text-xs font-bold gap-1.5"
            >
              {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
            </Button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <button
            onClick={() => setModalTab('overview')}
            className={cn(
              'pb-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-[1px]',
              modalTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Profile & Account</span>
          </button>

          <button
            onClick={() => setModalTab('projects')}
            className={cn(
              'pb-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-[1px]',
              modalTab === 'projects'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Project Assignments ({user.projectAssignments.length})</span>
          </button>

          <button
            onClick={() => setModalTab('json')}
            className={cn(
              'pb-3 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 -mb-[1px]',
              modalTab === 'json'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            )}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Raw Object</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {modalTab === 'overview' && (
            <div className="space-y-5">
              {/* Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-[hsl(var(--accent)/0.5)] border border-[hsl(var(--border))] text-xs">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                    Full Name
                  </span>
                  <span className="font-bold text-[hsl(var(--foreground))] text-sm mt-0.5 block">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                    Assigned Role
                  </span>
                  <span className="font-bold text-[hsl(var(--foreground))] text-sm mt-0.5 block">
                    {displayRoleName}
                  </span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                    Account Status
                  </span>
                  <span className="font-bold text-[hsl(var(--foreground))] text-sm mt-0.5 block capitalize">
                    {user.status}
                  </span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                    Designation
                  </span>
                  <span className="font-semibold text-[hsl(var(--foreground))] text-xs mt-0.5 block">
                    {user.designation || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                    Department
                  </span>
                  <span className="font-semibold text-[hsl(var(--foreground))] text-xs mt-0.5 block">
                    {user.department || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase text-[10px] tracking-wider block">
                    Contact Phone
                  </span>
                  <span className="font-mono text-xs text-[hsl(var(--foreground))] mt-0.5 block">
                    {user.phone || '—'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
                  Close
                </Button>
                <Button variant="default" size="sm" onClick={() => { onClose(); onEdit(); }} className="text-xs font-semibold gap-1.5 shadow-xs cursor-pointer">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Member</span>
                </Button>
              </div>
            </div>
          )}

          {modalTab === 'projects' && (
            <div className="space-y-3">
              {user.projectAssignments.length === 0 ? (
                <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">
                  <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No project assignments linked to this member.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {user.projectAssignments.map((asgn) => (
                    <div
                      key={asgn.projectId}
                      className="p-4 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))] flex items-center justify-center shrink-0">
                            <Building2 className="w-4.5 h-4.5 text-[hsl(var(--primary))]" />
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-[hsl(var(--foreground))]">{asgn.projectName}</h5>
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                              Role: <span className="font-semibold text-[hsl(var(--foreground))]">{PROJECT_ROLE_LABELS[asgn.projectRole] ?? asgn.projectRole}</span>
                              {asgn.projectType && ` · ${asgn.projectType}`}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PROJECT_STATUS_COLORS[asgn.projectStatus] ?? 'bg-slate-100 text-slate-600'}`}>
                          {asgn.projectStatus}
                        </span>
                      </div>

                      {asgn.permissions.length > 0 && (
                        <div className="pt-2 border-t border-[hsl(var(--border)/0.6)]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-1.5">
                            Module Permissions ({asgn.permissions.length} modules)
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {asgn.permissions.map((p) => (
                              <span key={p.module} className="px-2 py-1 rounded-md text-[10px] font-semibold bg-[hsl(var(--accent)/0.6)] border border-[hsl(var(--border))] flex items-center gap-1">
                                <span className="font-bold text-[hsl(var(--foreground))] capitalize">{p.module.replace(/_/g, ' ')}:</span>
                                <span className="text-[hsl(var(--muted-foreground))]">{p.actions.join(', ')}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {modalTab === 'json' && (
            <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-[400px]">
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------
export default function InteriorUsersRolesView() {
  const toast = useToast();
  const { isOrgAdmin, hasPermission, currentUser } = usePermissions();
  const showUsersTab = isOrgAdmin || hasPermission('users', 'read');
  const showRolesTab = isOrgAdmin || hasPermission('roles', 'read');
  const canAddUsers = isOrgAdmin || hasPermission('users', 'create');
  const canManageUsers = isOrgAdmin || hasPermission('users', 'update');
  const canDeleteUsers = isOrgAdmin || hasPermission('users', 'delete');

  const [selectedTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const activeTab: 'users' | 'roles' | null =
    selectedTab === 'users' && showUsersTab ? 'users' : showRolesTab ? 'roles' : showUsersTab ? 'users' : null;

  const [users, setUsers] = useState<UserWithProjects[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>(DEFAULT_ORG_ROLES);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination (Matching Audit Management format)
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [activeSegment, setActiveSegment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithProjects | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithProjects | null>(null);
  const [inspectedUser, setInspectedUser] = useState<UserWithProjects | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      const res = await interiorProjectService.getRoles();
      const raw = res?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      if (list.length > 0) {
        setRoles(list);
      }
    } catch (err: any) {
      console.error('Failed to load organization roles:', err);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (!showUsersTab) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const res = await interiorProjectService.getUsersWithProjects();
      setUsers(res?.data ?? res ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [showUsersTab]);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [loadUsers, loadRoles]);

  // Handle Quick Segment Switch
  const handleSegmentChange = (segId: string) => {
    setActiveSegment(segId);
    setPage(1);
    if (segId === 'all') {
      setStatusFilter('all');
      setRoleFilter('all');
    } else if (segId === 'active') {
      setStatusFilter('active');
    } else if (segId === 'admin') {
      setStatusFilter('all');
      setRoleFilter('admin');
    }
  };

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.designation ?? '').toLowerCase().includes(q) ||
        (u.department ?? '').toLowerCase().includes(q) ||
        u.projectAssignments.some((a) => a.projectName.toLowerCase().includes(q));

      const matchesRole =
        roleFilter === 'all' ||
        u.role?.name === roleFilter ||
        u.role?.slug === roleFilter ||
        u.systemRole === roleFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        u.status === statusFilter;

      let matchesSegment = true;
      if (activeSegment === 'assigned') {
        matchesSegment = u.projectAssignments.length > 0;
      } else if (activeSegment === 'unassigned') {
        matchesSegment = u.projectAssignments.length === 0;
      } else if (activeSegment === 'admin') {
        matchesSegment =
          u.systemRole === 'org_admin' ||
          u.systemRole === 'super_admin' ||
          u.role?.slug === 'admin' ||
          u.systemRole === 'manager';
      }

      return matchesSearch && matchesRole && matchesStatus && matchesSegment;
    });
  }, [users, searchTerm, roleFilter, statusFilter, activeSegment]);

  // Pagination calculation
  const totalCount = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredUsers.slice(start, start + limit);
  }, [filteredUsers, page, limit]);

  // KPI Metrics
  const totalProjects = useMemo(() => {
    return [...new Set(users.flatMap((u) => u.projectAssignments.map((a) => a.projectId)))].length;
  }, [users]);
  const activeUsers = useMemo(() => users.filter((u) => u.status === 'active').length, [users]);

  // Pagination pills with ellipsis helper
  const paginationRange = useMemo<(number | string)[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  }, [page, totalPages]);

  return (
    <div className="interior-os-theme p-4 lg:p-6 space-y-4 gradient-mesh min-h-full max-w-[1600px] mx-auto font-sans">
      {/* ── 1. Executive Header Ribbon (Matching Audit Management) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-2.5">
            Users &amp; Roles
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
              {users.length} members
            </span>
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Organization user directory, role permissions matrix, and project assignment access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Segment Switcher: Users vs Roles */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 bg-white shadow-xs mr-1">
            {showUsersTab && (
              <button
                onClick={() => { setActiveTab('users'); setPage(1); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/80 transition-colors'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users ({users.length})</span>
              </button>
            )}
            {showRolesTab && (
              <button
                onClick={() => setActiveTab('roles')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                  activeTab === 'roles'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100/80 transition-colors'
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Roles ({roles.length})</span>
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { loadUsers(); loadRoles(); }}
            disabled={isLoading}
            className="gap-1.5 h-8.5 text-xs bg-[hsl(var(--card))] shadow-xs cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            <span>Sync</span>
          </Button>

          {activeTab === 'users' && canAddUsers && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddUserOpen(true)}
              className="gap-1.5 h-8.5 text-xs shadow-xs font-semibold cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. KPI Stat Metrics Overview (Matching Audit Management) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs hover:border-[hsl(var(--primary)/0.3)] transition-colors">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
                Total Members
              </span>
              <div className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                {isLoading ? '—' : users.length}
              </div>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Organization Roster
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs hover:border-[hsl(var(--primary)/0.3)] transition-colors">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
                Active Accounts
              </span>
              <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? '—' : activeUsers}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Live authorized access
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs hover:border-[hsl(var(--primary)/0.3)] transition-colors">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
                Projects Covered
              </span>
              <div className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                {isLoading ? '—' : totalProjects}
              </div>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                Active project assignments
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs hover:border-[hsl(var(--primary)/0.3)] transition-colors">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block">
                Configured Roles
              </span>
              <div className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                {roles.length}
              </div>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                Permission matrix presets
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════ USERS TAB ═══════════════════════════════════ */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-4">
            {/* ── Quick Segment Filter Bar ── */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {QUICK_SEGMENTS.map((seg) => {
                const isActive = activeSegment === seg.id;
                return (
                  <button
                    key={seg.id}
                    onClick={() => handleSegmentChange(seg.id)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50'
                    )}
                  >
                    {seg.label}
                  </button>
                );
              })}
            </div>

            {/* ── Search & Filter Controls Card (Matching Audit Management) ── */}
            <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
              <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  {/* Search Input */}
                  <div className="md:col-span-6 relative">
                    <Input
                      placeholder="Search member by name, email, designation, department..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      icon={<Search className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
                      className="bg-[hsl(var(--background))] h-9 rounded-lg text-xs"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setPage(1);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Role Filter Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 px-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    >
                      <option value="all">All Roles</option>
                      {roles.map((r) => (
                        <option key={r._id || r.slug} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Account Status Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 px-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Table Ledger View (Matching Audit Management) ── */}
            {isLoading ? (
              <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl shadow-none">
                <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="w-7 h-7 text-[hsl(var(--primary))] animate-spin mb-3" />
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Loading Directory...</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Fetching organization members and project permissions
                  </p>
                </CardContent>
              </Card>
            ) : filteredUsers.length === 0 ? (
              <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl shadow-xs">
                <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--accent))] flex items-center justify-center mb-3 border border-[hsl(var(--border))]">
                    <Users className="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No users found</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mt-1">
                    No members match your active filters or search terms.
                  </p>
                  {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || activeSegment !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 rounded-lg font-semibold text-xs h-8 cursor-pointer"
                      onClick={() => {
                        setSearchTerm('');
                        setRoleFilter('all');
                        setStatusFilter('all');
                        setActiveSegment('all');
                        setPage(1);
                      }}
                    >
                      Reset All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* ── UNIFIED TABLE & PAGINATION CONTAINER ── */
              <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        <th className="py-3 px-4">Member / User</th>
                        <th className="py-3 px-4">Assigned Role</th>
                        <th className="py-3 px-4">Department / Designation</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Projects</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                      {paginatedUsers.map((user) => {
                        const initials = getInitials(user.firstName, user.lastName);
                        const sysRole = SYSTEM_ROLE_LABELS[user.systemRole] ?? { label: user.systemRole, badgeClass: 'bg-slate-500/10 text-slate-600 border-slate-500/25' };
                        const displayRoleName = user.role?.name || sysRole.label;
                        const isSelf = currentUser && (
                          String((currentUser as any).id || (currentUser as any)._id) === String(user._id) ||
                          (currentUser as any).email?.toLowerCase() === user.email?.toLowerCase()
                        );

                        return (
                          <tr
                            key={user._id}
                            onClick={() => setInspectedUser(user)}
                            className="hover:bg-[hsl(var(--accent)/0.4)] transition-colors group cursor-pointer"
                          >
                            {/* Member / User Profile (Clean Non-Colorful Avatar) */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                {/* Member Avatar - Blue Theme */}
                                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-[hsl(var(--foreground))] group-hover:text-blue-600 transition-colors truncate max-w-[160px]">
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate max-w-[160px] font-mono">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Assigned Role */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.7)] text-[hsl(var(--foreground))]">
                                <Crown className="w-3 h-3 text-[hsl(var(--primary))]" />
                                <span>{displayRoleName}</span>
                              </span>
                            </td>

                            {/* Department / Designation */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-semibold text-xs text-[hsl(var(--foreground))]">
                                {user.designation || '—'}
                              </div>
                              <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                {user.department || 'General'}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {user.status === 'active' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 capitalize">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span>{user.status}</span>
                                </span>
                              )}
                            </td>

                            {/* Projects Covered */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[hsl(var(--accent)/0.6)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))]">
                                <Building2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                                <span>{user.projectAssignments.length} {user.projectAssignments.length === 1 ? 'project' : 'projects'}</span>
                              </div>
                            </td>

                            {/* Created Date */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-xs text-[hsl(var(--foreground))] font-medium">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </div>
                            </td>

                            {/* Actions / Inspection */}
                            <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 rounded-md text-[11px] font-bold gap-1 shadow-2xs bg-[hsl(var(--card))] group-hover:border-[hsl(var(--primary))] cursor-pointer"
                                  onClick={() => setInspectedUser(user)}
                                >
                                  <Eye className="w-3 h-3 text-[hsl(var(--primary))]" />
                                  <span>Inspect</span>
                                </Button>

                                {canManageUsers && (
                                  <button
                                    onClick={() => setEditingUser(user)}
                                    title="Edit User"
                                    className="p-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-blue-600 hover:bg-blue-50/60 transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {canDeleteUsers && !isSelf && (
                                  <button
                                    onClick={() => setDeletingUser(user)}
                                    title="Delete User"
                                    className="p-1.5 rounded-lg border border-rose-500/20 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Integrated Pagination Footer (Matching Audit Management) ── */}
                <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Left: Range and Rows per Page */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                      Showing <strong className="text-[hsl(var(--foreground))]">{(page - 1) * limit + 1}</strong> –{' '}
                      <strong className="text-[hsl(var(--foreground))]">{Math.min(page * limit, totalCount)}</strong> of{' '}
                      <strong className="text-[hsl(var(--foreground))]">{totalCount}</strong> members
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                      <span>Per page:</span>
                      <select
                        value={limit}
                        onChange={(e) => {
                          setLimit(Number(e.target.value));
                          setPage(1);
                        }}
                        className="h-7 px-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs font-bold text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Page Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page <= 1}
                      title="First Page"
                      className="w-7 h-7 rounded-md flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      title="Previous Page"
                      className="w-7 h-7 rounded-md flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {paginationRange.map((item: number | string, index: number) => {
                      if (item === '...') {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="w-7 h-7 flex items-center justify-center text-[11px] font-bold text-[hsl(var(--muted-foreground))]"
                          >
                            ...
                          </span>
                        );
                      }

                      const pageNum = Number(item);
                      const isActive = page === pageNum;

                      return (
                        <button
                          key={`page-${pageNum}`}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            'min-w-[28px] h-7 px-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer border',
                            isActive
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      title="Next Page"
                      className="w-7 h-7 rounded-md flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages}
                      title="Last Page"
                      className="w-7 h-7 rounded-md flex items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════ ROLES TAB ═══════════════════════════════════ */}
        {activeTab === 'roles' && (
          <motion.div key="roles" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <InteriorRolesManager roles={roles} onChanged={loadRoles} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {isAddUserOpen && (
          <AddUserModal roles={roles} onClose={() => setIsAddUserOpen(false)} onSuccess={loadUsers} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingUser && (
          <EditUserModal user={editingUser} roles={roles} onClose={() => setEditingUser(null)} onSuccess={loadUsers} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingUser && (
          <DeleteUserModal user={deletingUser} onClose={() => setDeletingUser(null)} onSuccess={loadUsers} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectedUser && (
          <UserInspectorModal
            user={inspectedUser}
            onClose={() => setInspectedUser(null)}
            onEdit={() => {
              const u = inspectedUser;
              setInspectedUser(null);
              setEditingUser(u);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
