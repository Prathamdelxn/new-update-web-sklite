'use client';

// Port of interior-os-frontend's projects/[projectId]/members/page.tsx.
// Simplifications vs source:
//  - No useProjectPermissions gating (not ported to sky-lite) — actions are
//    always shown, matching the pattern used in InteriorProjectOverviewView.
//  - No useConfirm modal (not ported) — uses window.confirm instead, same as
//    the filemgt source page does for its own delete confirmations.
//  - Role-default permission presets (projectService.getDefaultPermissions in
//    the source app) have no equivalent endpoint in interiorProject.service.ts,
//    so "Reset to Defaults" and auto-loading defaults on role change are
//    stubbed with a "Coming soon" toast instead of fetching real presets.

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Loader2,
  Mail,
  Shield,
  Briefcase,
  X,
  Lock,
  Search,
  Trash2,
  Settings2,
  RotateCcw,
  Check,
  ChevronDown,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';
import { PERMISSION_MODULES, moduleActions } from '@/features/interior-new/lib/permissionCatalog';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { useProjectPermissions, invalidateProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';
import { refreshInteriorUser } from '@/features/interior-new/hooks/usePermissions';
import { memberRoleLabel as roleLabelFor, isVirtualAdminMember } from '@/features/interior-new/lib/memberRoleLabel';

interface Permission {
  module: string;
  actions: string[];
}

interface OrgRoleOption {
  _id: string;
  name: string;
  slug: string;
  permissions: Permission[];
}

interface ProjectMember {
  _id: string;
  projectRole: string;
  // Org role used as this member's project role (populated by the API)
  roleId?: OrgRoleOption | string | null;
  permissions: Permission[];
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    name?: string;
    email?: string;
    role?: any;
    avatar?: string;
    designation?: string;
    department?: string;
    systemRole: string;
  };
}

const ROLE_COLORS: Record<string, string> = {
  project_manager: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  site_engineer: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  quantity_surveyor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  designer: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
  sub_contractor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  client_representative: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  viewer: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
};

const ROLE_LABELS: Record<string, string> = {
  project_manager: 'Project Manager',
  site_engineer: 'Site Engineer',
  quantity_surveyor: 'Quantity Surveyor',
  designer: 'Designer',
  sub_contractor: 'Sub Contractor',
  client_representative: 'Client Rep',
  viewer: 'Viewer',
};

const ALL_ROLES = [
  'project_manager', 'site_engineer', 'quantity_surveyor',
  'designer', 'sub_contractor', 'client_representative', 'viewer',
];

// Same project sections as the role editor (shared catalog)
const PROJECT_MODULES: { module: string; label: string }[] = PERMISSION_MODULES
  .filter((m) => m.category === 'Project Execution')
  .map((m) => ({ module: m.key, label: m.label }));

const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'];

const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  project_manager: PROJECT_MODULES.map(m => ({ module: m.module, actions: [...PERMISSION_ACTIONS] })),
  viewer: PROJECT_MODULES.map(m => ({ module: m.module, actions: ['read'] })),
  site_engineer: PROJECT_MODULES.map(m => ({ 
    module: m.module, 
    actions: ['projects', 'users', 'filemgt'].includes(m.module) ? ['read'] : ['create', 'read', 'update'] 
  })),
  quantity_surveyor: PROJECT_MODULES.map(m => ({ 
    module: m.module, 
    actions: ['boq', 'procurement', 'purchase_orders', 'payments', 'variation_orders'].includes(m.module) ? ['create', 'read', 'update', 'approve', 'export'] : ['read'] 
  })),
  designer: PROJECT_MODULES.map(m => ({
    module: m.module,
    actions: ['drawings', 'rfis', 'filemgt', 'photos', 'model'].includes(m.module) ? ['create', 'read', 'update', 'delete'] : ['read']
  })),
  sub_contractor: PROJECT_MODULES.map(m => ({
    module: m.module,
    actions: ['tasks', 'dpr', 'rfis', 'filemgt', 'photos'].includes(m.module) ? ['create', 'read', 'update'] : ['read']
  })),
  client_representative: PROJECT_MODULES.map(m => ({
    module: m.module,
    actions: ['projects', 'milestones', 'drawings', 'photos', 'snags', 'weekly_reports'].includes(m.module) ? ['read', 'approve'] : ['read']
  }))
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  read: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
  update: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  delete: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
  approve: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30',
  export: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30',
  manage: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-500/15 dark:text-fuchsia-400 dark:border-fuchsia-500/30',
};

interface InteriorMembersViewProps {
  projectId: string;
}

export default function InteriorMembersView({ projectId }: InteriorMembersViewProps) {
  const toast = useToast();
  const { can: canDo } = useProjectPermissions(projectId);
  const { confirm } = useConfirm();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    projectRole: 'viewer', roleId: '', designation: '', department: '',
  });
  const [isInviting, setIsInviting] = useState(false);
  const [showInvitePassword, setShowInvitePassword] = useState(false);

  // Add existing user state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);
  const [orgUsersLoading, setOrgUsersLoading] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('viewer');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [permModalMember, setPermModalMember] = useState<ProjectMember | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<Permission[]>([]);
  const [editedRole, setEditedRole] = useState('');
  const [isSavingPerms, setIsSavingPerms] = useState(false);
  // Project roles come from the organization's roles (Users & Roles → Roles)
  const [orgRoles, setOrgRoles] = useState<OrgRoleOption[]>([]);
  const [permMode, setPermMode] = useState<'role' | 'custom'>('role');

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getProjectMembers(projectId);
      if (res?.success) setMembers(res.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    if (!projectId) return;
    fetchMembers();
  }, [projectId, fetchMembers]);

  useEffect(() => {
    interiorProjectService.getRoles()
      .then((res: any) => {
        const raw = res?.data ?? res ?? [];
        const list: OrgRoleOption[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setOrgRoles(list);
        // Default new members to the read-only Viewer role
        const viewer = list.find((r) => r.slug === 'viewer') || list[0];
        if (viewer) {
          setAddMemberRole((prev) => prev && list.some((r) => r._id === prev) ? prev : viewer._id);
          setInviteForm((prev) => ({ ...prev, roleId: prev.roleId || viewer._id }));
        }
      })
      .catch(() => setOrgRoles([]));
  }, []);

  // A member's role id (linked) — or the built-in role matching their preset
  const memberRoleId = (m: ProjectMember): string => {
    if (m.roleId && typeof m.roleId === 'object') return m.roleId._id;
    if (typeof m.roleId === 'string' && m.roleId) return m.roleId;
    const slug = (m.projectRole || '').replace(/_/g, '-');
    return orgRoles.find((r) => r.slug === slug)?._id || '';
  };
  const memberRoleLabel = (m: ProjectMember): string => roleLabelFor(m);

  const fetchOrgUsers = useCallback(async () => {
    setOrgUsersLoading(true);
    try {
      const res = await interiorProjectService.getOrgUsers();
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setOrgUsers(list);
    } catch {
      toast.error('Failed to load organisation users');
    } finally {
      setOrgUsersLoading(false);
    }
  }, [toast]);

  const openAddMemberModal = () => {
    setAddMemberSearch('');
    setAddMemberUserId('');
    setAddMemberRole('viewer');
    setIsAddMemberOpen(true);
    fetchOrgUsers();
  };

  const handleAddExistingMember = async () => {
    if (!addMemberUserId) { toast.error('Please select a user'); return; }
    setIsAddingMember(true);
    try {
      const chosen = orgRoles.find((r) => r._id === addMemberRole);
      await interiorProjectService.addProjectMember(
        projectId,
        chosen ? { userId: addMemberUserId, roleId: chosen._id } : { userId: addMemberUserId, projectRole: addMemberRole }
      );
      toast.success('Member added to project');
      setIsAddMemberOpen(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.firstName || !inviteForm.lastName || !inviteForm.email) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsInviting(true);
    try {
      const res = await interiorProjectService.inviteProjectMember(projectId, inviteForm);
      if (res?.success) {
        toast.success('User created and added to project');
        setIsInviteModalOpen(false);
        setInviteForm({ firstName: '', lastName: '', email: '', password: '', projectRole: 'viewer', roleId: orgRoles.find((r) => r.slug === 'viewer')?._id || '', designation: '', department: '' });
        fetchMembers();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    const ok = await confirm({
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the project? They will lose access to all tasks and documents.',
      confirmText: 'Remove Member',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await interiorProjectService.deleteProjectMember(projectId, memberId);
      if (res?.success) {
        toast.success('Member removed from project');
        fetchMembers();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove member');
    }
  };

  const openPermissionsModal = useCallback((member: ProjectMember) => {
    setPermModalMember(member);
    const linked = member.roleId && typeof member.roleId === 'object' ? member.roleId : null;
    setEditedPermissions(JSON.parse(JSON.stringify((linked ? linked.permissions : member.permissions) || [])));
    setEditedRole(memberRoleId(member));
    // Linked members follow their role; older members keep their own permissions until a role is picked
    setPermMode(linked ? 'role' : 'custom');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgRoles]);

  const closePermissionsModal = () => {
    setPermModalMember(null);
    setEditedPermissions([]);
    setEditedRole('');
  };

  const togglePermissionAction = (moduleName: string, action: string) => {
    // Hand-picking permissions makes them custom for this member (no role link)
    setPermMode('custom');
    setEditedPermissions((prev) => {
      const existingIndex = prev.findIndex((p) => p.module === moduleName);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newActions = existing.actions.includes(action)
          ? existing.actions.filter((a) => a !== action)
          : [...existing.actions, action];

        if (newActions.length === 0) {
          return ensureProjectView(prev.filter((p) => p.module !== moduleName));
        }

        const updated = [...prev];
        updated[existingIndex] = { ...existing, actions: newActions };
        return ensureProjectView(updated);
      }
      return ensureProjectView([...prev, { module: moduleName, actions: [action] }]);
    });
  };

  // Opening the project needs Project Config → View, so any other project
  // permission keeps it on (same rule as the role editor)
  const ensureProjectView = (perms: Permission[]): Permission[] => {
    const needsProject = perms.some((p) => p.module !== 'projects' && p.actions.length > 0);
    const projectPerm = perms.find((p) => p.module === 'projects');
    if (!needsProject || projectPerm?.actions.includes('read')) return perms;
    return projectPerm
      ? perms.map((p) => (p.module === 'projects' ? { ...p, actions: [...p.actions, 'read'] } : p))
      : [...perms, { module: 'projects', actions: ['read'] }];
  };

  const hasAction = (moduleName: string, action: string): boolean => {
    const perm = editedPermissions.find((p) => p.module === moduleName);
    return perm ? perm.actions.includes(action) : false;
  };

  const handleRoleChange = (roleId: string) => {
    setEditedRole(roleId);
    const role = orgRoles.find((r) => r._id === roleId);
    setEditedPermissions(JSON.parse(JSON.stringify(role?.permissions || [])));
    setPermMode('role');
    if (role) toast.success(`Using the "${role.name}" role's permissions`);
  };

  const handleSavePermissions = async () => {
    if (!permModalMember) return;
    setIsSavingPerms(true);
    try {
      // Role mode → link the org role (its permissions apply live);
      // custom mode → save these exact permissions for this member only
      const payload: any = permMode === 'role' && editedRole
        ? { roleId: editedRole }
        : { permissions: editedPermissions };
      const res = await interiorProjectService.updateProjectMember(projectId, permModalMember._id, payload);
      if (res?.success) {
        toast.success('Permissions updated successfully');
        // Apply the change to open screens right away (this browser)
        invalidateProjectPermissions(projectId);
        refreshInteriorUser(true);
        closePermissionsModal();
        fetchMembers();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update permissions');
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleResetToDefaults = () => {
    const role = orgRoles.find((r) => r._id === editedRole);
    setEditedPermissions(JSON.parse(JSON.stringify(role?.permissions || [])));
    setPermMode('role');
    toast.success(`Reset to the "${role?.name || 'selected'}" role's permissions`);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.userId?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.userId?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.projectRole?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Team & Access Control</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Manage users, assign project roles, and configure granular permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDo('users', 'create') && (
            <button
              onClick={openAddMemberModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-xl transition-all shadow-sm active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          )}
          {canDo('users', 'create') && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--primary))] rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Member
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[hsl(var(--card))] p-4 rounded-2xl border border-[hsl(var(--border))] shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
          />
        </div>
        <div className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
          {members.length} {members.length === 1 ? 'Member' : 'Members'}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl border-dashed">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
          </div>
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">No members found</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm mt-1">
            {searchQuery ? 'Try adjusting your search query.' : 'Start by adding members to collaborate on this project.'}
          </p>
          {!searchQuery && (
            canDo('users', 'create') && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] hover:bg-[hsl(var(--primary)/0.2)] rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            )
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredMembers.map((member) => {
              const linkedRole = member.roleId && typeof member.roleId === 'object' ? member.roleId : null;
              const effectivePerms = (linkedRole && Array.isArray(linkedRole.permissions) && linkedRole.permissions.length > 0)
                ? linkedRole.permissions
                : member.permissions;
              const permCount = effectivePerms?.reduce((acc: number, p: any) => acc + (p.actions?.length || 0), 0) || 0;
              return (
                <motion.div
                  key={member._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 hover:border-[hsl(var(--primary)/0.5)] transition-all hover:shadow-md group relative"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    {canDo('users', 'update') && !isVirtualAdminMember(member) && (
                      <button
                        onClick={() => openPermissionsModal(member)}
                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit Permissions"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDo('users', 'delete') && !isVirtualAdminMember(member) && (
                      <button
                        onClick={() => handleDeleteMember(member._id)}
                        className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
                      {member.userId?.firstName?.[0]}{member.userId?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0 pr-12">
                      <h3 className="font-semibold text-[hsl(var(--foreground))] truncate">
                        {member.userId?.firstName} {member.userId?.lastName}
                      </h3>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        {member.userId?.email}
                      </p>
                      {member.userId?.designation && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 shrink-0" />
                          {member.userId?.designation}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between">
                    <span className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-full border',
                      ROLE_COLORS[member.projectRole] || ROLE_COLORS.viewer
                    )}>
                      {memberRoleLabel(member)}
                    </span>

                    {canDo('users', 'update') && !isVirtualAdminMember(member) && (
                      <button
                        onClick={() => openPermissionsModal(member)}
                        className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] flex items-center gap-1 bg-[hsl(var(--muted))] px-2 py-0.5 rounded-full hover:bg-[hsl(var(--primary)/0.1)] hover:text-[hsl(var(--primary))] transition-colors cursor-pointer"
                      >
                        <Shield className="w-3 h-3" />
                        {permCount} permissions
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Existing Member Modal */}
      <AnimatePresence>
        {isAddMemberOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isAddingMember && setIsAddMemberOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              {/* Header */}
              <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.3)]">
                <div>
                  <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Add Existing Member</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Select a user from your organisation and assign a project role.</p>
                </div>
                <button onClick={() => setIsAddMemberOpen(false)} disabled={isAddingMember}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={addMemberSearch}
                    onChange={(e) => { setAddMemberSearch(e.target.value); setAddMemberUserId(''); }}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                {/* User list */}
                <div className="max-h-60 overflow-y-auto rounded-xl border border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
                  {orgUsersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--primary))]" />
                    </div>
                  ) : (() => {
                    const alreadyAdded = new Set(members.map((m) => m.userId?._id));
                    const filtered = orgUsers.filter((u) => {
                      if (alreadyAdded.has(u._id)) return false;
                      const q = addMemberSearch.toLowerCase();
                      if (!q) return true;
                      return (
                        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                        (u.email ?? '').toLowerCase().includes(q)
                      );
                    });
                    if (filtered.length === 0) {
                      return (
                        <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                          {addMemberSearch ? 'No users match your search.' : 'All organisation users are already members.'}
                        </div>
                      );
                    }
                    return filtered.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => setAddMemberUserId(u._id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          addMemberUserId === u._id
                            ? 'bg-[hsl(var(--primary)/0.1)] border-l-2 border-[hsl(var(--primary))]'
                            : 'hover:bg-[hsl(var(--muted)/0.5)]'
                        )}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.6)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{u.email}</p>
                        </div>
                        {addMemberUserId === u._id && (
                          <Check className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                        )}
                      </button>
                    ));
                  })()}
                </div>

                {/* Role selector */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">Project Role</label>
                  <select
                    value={addMemberRole}
                    onChange={(e) => setAddMemberRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  >
                    {orgRoles.length === 0 && <option value="">Loading roles…</option>}
                    {orgRoles.map((r) => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setIsAddMemberOpen(false)} disabled={isAddingMember}
                    className="px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddExistingMember}
                    disabled={!addMemberUserId || isAddingMember}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isAddingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {isAddingMember ? 'Adding...' : 'Add to Project'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Member Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isInviting && setIsInviteModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.3)]">
                <div>
                  <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Create Project Member</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Create a new user with login credentials and assign them to this project.
                  </p>
                </div>
                <button onClick={() => !isInviting && setIsInviteModalOpen(false)} className="p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors" disabled={isInviting}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInvite} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">First Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">Last Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <input type="email" required value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                      placeholder="user@example.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">Temporary Password <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                    <input
                      type={showInvitePassword ? 'text' : 'password'}
                      minLength={8}
                      value={inviteForm.password}
                      onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                      className="w-full pl-9 pr-9 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                      placeholder="Leave blank to use welcome123"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInvitePassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors p-0.5 rounded focus:outline-none cursor-pointer"
                      title={showInvitePassword ? 'Hide password' : 'Show password'}
                    >
                      {showInvitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">Project Role <span className="text-red-500">*</span></label>
                  <select value={inviteForm.roleId} onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]">
                    {orgRoles.length === 0 && <option value="">Loading roles…</option>}
                    {orgRoles.map((r) => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Default permissions will be auto-assigned based on this role. You can customize them afterwards.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">Designation (Optional)</label>
                    <input type="text" value={inviteForm.designation} onChange={(e) => setInviteForm({ ...inviteForm, designation: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                      placeholder="e.g. Lead Architect" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">Department (Optional)</label>
                    <input type="text" value={inviteForm.department} onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                      placeholder="e.g. Engineering" />
                  </div>
                </div>
                <div className="pt-4 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setIsInviteModalOpen(false)} disabled={isInviting}
                    className="px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isInviting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {isInviting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permissions Editor Modal */}
      <AnimatePresence>
        {permModalMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSavingPerms && closePermissionsModal()} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
            >
              <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.3)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] flex items-center justify-center text-white font-bold shadow-inner">
                    {permModalMember.userId?.firstName?.[0]}{permModalMember.userId?.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                      {permModalMember.userId?.firstName} {permModalMember.userId?.lastName}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {permModalMember.userId?.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => !isSavingPerms && closePermissionsModal()} className="p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors" disabled={isSavingPerms}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 pt-5 pb-3 border-b border-[hsl(var(--border))] shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">Project Role:</label>
                    <div className="relative">
                      <select
                        value={editedRole}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-1.5 text-sm font-medium bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] cursor-pointer"
                      >
                        {!editedRole && <option value="">Select a role…</option>}
                        {orgRoles.map((r) => (
                          <option key={r._id} value={r._id}>{r.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))] pointer-events-none" />
                    </div>
                    {permMode === 'custom' ? (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20" title="These permissions apply to this member only and won't follow role changes">
                        Custom permissions
                      </span>
                    ) : editedRole !== memberRoleId(permModalMember) ? (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                        Role changed
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={handleResetToDefaults}
                    disabled={isSavingPerms}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.8)] rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Defaults
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto px-6 py-4">
                <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[hsl(var(--muted)/0.5)]">
                        <th className="text-left py-3 px-4 font-semibold text-[hsl(var(--foreground))] border-b border-[hsl(var(--border))] w-48">Module</th>
                        {PERMISSION_ACTIONS.map((action) => (
                          <th key={action} className="text-center py-3 px-2 font-medium text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))] capitalize text-xs">
                            {action}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PROJECT_MODULES.map((mod, idx) => (
                        <tr key={mod.module} className={cn(
                          'hover:bg-[hsl(var(--muted)/0.3)] transition-colors',
                          idx % 2 === 0 ? 'bg-transparent' : 'bg-[hsl(var(--muted)/0.15)]'
                        )}>
                          <td className="py-2.5 px-4 font-medium text-[hsl(var(--foreground))] border-b border-[hsl(var(--border)/0.5)] text-xs">
                            {mod.label}
                          </td>
                          {PERMISSION_ACTIONS.map((action) => {
                            const active = hasAction(mod.module, action);
                            if (action !== 'manage' && !moduleActions(mod.module).includes(action as any)) {
                              return (
                                <td key={action} className="text-center py-2.5 px-2 border-b border-[hsl(var(--border)/0.5)] text-[hsl(var(--muted-foreground)/0.5)]">—</td>
                              );
                            }
                            return (
                              <td key={action} className="text-center py-2.5 px-2 border-b border-[hsl(var(--border)/0.5)]">
                                <button
                                  onClick={() => togglePermissionAction(mod.module, action)}
                                  disabled={isSavingPerms}
                                  className={cn(
                                    'w-7 h-7 rounded-lg border flex items-center justify-center transition-all disabled:cursor-not-allowed',
                                    active
                                      ? ACTION_COLORS[action] || 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                      : 'bg-transparent border-[hsl(var(--border))] text-transparent hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--primary)/0.05)]'
                                  )}
                                >
                                  {active && <Check className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border-t border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--muted)/0.2)] shrink-0">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {editedPermissions.reduce((acc, p) => acc + p.actions.length, 0)} total permissions across {editedPermissions.length} modules
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={closePermissionsModal} disabled={isSavingPerms}
                    className="px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSavePermissions} disabled={isSavingPerms}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                    {isSavingPerms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isSavingPerms ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
