'use client';

// =============================================================================
// Interior — Roles & Permissions manager (live roles, editable)
// Roles come from the backend (/roles). Org admins — or users whose role has
// Roles > Create/Update/Delete — can manage them. The Admin role is locked and
// built-in roles can't be deleted (the API enforces the same rules).
// =============================================================================

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, ChevronDown, ChevronUp, Plus, Pencil, Trash2, Lock, Loader2, X, CheckCircle2, MinusCircle,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorProjectService } from '@/services/interiorProject.service';
import { usePermissions, refreshInteriorUser } from '@/features/interior-new/hooks/usePermissions';
import {
  PERMISSION_ACTIONS, PERMISSION_MODULES, MODULE_CATEGORIES, permissionsAllow, moduleActions,
  type RolePermission, type PermissionAction,
} from '@/features/interior-new/lib/permissionCatalog';

export interface ManagedRole {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: RolePermission[];
  isSystem?: boolean;
}

type Matrix = Record<string, Set<PermissionAction>>;

// The six real actions. The backend's 'manage' just means "all of them", so the
// editor shows it as every box ticked (Full access) instead of a separate column.
const ACTION_COLUMNS = PERMISSION_ACTIONS.filter((a) => a.key !== 'manage');
const ALL_ACTIONS = ACTION_COLUMNS.map((a) => a.key);

// Only the actions the module offers ('manage' = all of them)
const actionsOf = (moduleKey: string, actions: string[] = []): PermissionAction[] => {
  const offered = moduleActions(moduleKey);
  return actions.includes('manage') ? [...offered] : offered.filter((a) => actions.includes(a));
};

const toMatrix = (perms: RolePermission[] = []): Matrix => {
  const m: Matrix = {};
  perms.forEach((p) => { m[p.module] = new Set(actionsOf(p.module, p.actions)); });
  return m;
};
const fromMatrix = (m: Matrix): RolePermission[] =>
  Object.entries(m)
    .filter(([, set]) => set.size > 0)
    .map(([module, set]) => ({ module, actions: ALL_ACTIONS.filter((a) => set.has(a)) }));

const isAdminRole = (r: ManagedRole) => r.slug === 'admin';

// Every project tab sits behind opening the project, which needs Project Config → View.
// Any project-module permission therefore also turns that on (it stays on while they're set).
const PROJECT_MODULE_KEYS = PERMISSION_MODULES.filter((m) => m.category === 'Project Execution' && m.key !== 'projects').map((m) => m.key);
const withProjectView = (m: Matrix): Matrix => {
  const needsProject = PROJECT_MODULE_KEYS.some((k) => (m[k]?.size ?? 0) > 0);
  if (!needsProject || m.projects?.has('read')) return m;
  return { ...m, projects: new Set([...(m.projects ?? []), 'read' as PermissionAction]) };
};

// ---------------------------------------------------------------------------
// Role editor modal
// ---------------------------------------------------------------------------
function RoleEditorModal({ role, onClose, onSaved }: { role: ManagedRole | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isEdit = !!role;
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [matrix, setMatrix] = useState<Matrix>(() => toMatrix(role?.permissions));
  const [saving, setSaving] = useState(false);

  const has = (module: string, action: PermissionAction) => matrix[module]?.has(action) ?? false;

  const toggle = (module: string, action: PermissionAction) => {
    setMatrix((prev) => {
      const next: Matrix = { ...prev, [module]: new Set(prev[module] ?? []) };
      const set = next[module];
      if (set.has(action)) {
        set.delete(action);
        // Without View nothing else in the module is usable
        if (action === 'read') set.clear();
      } else {
        set.add(action);
        // Any action implies being able to view the module
        if (action !== 'read') set.add('read');
      }
      return withProjectView(next);
    });
  };

  const setRow = (module: string, actions: PermissionAction[]) =>
    setMatrix((prev) => withProjectView({ ...prev, [module]: new Set(actions) }));

  const rowCount = (module: string) => matrix[module]?.size ?? 0;
  const toggleFull = (module: string) => {
    const offered = moduleActions(module);
    setRow(module, rowCount(module) === offered.length ? [] : [...offered]);
  };

  const applyPreset = (preset: 'read' | 'full' | 'clear') => {
    const next: Matrix = {};
    PERMISSION_MODULES.forEach((m) => {
      next[m.key] = new Set(
        preset === 'full' ? [...moduleActions(m.key)] : preset === 'read' ? (['read'] as PermissionAction[]) : []
      );
    });
    setMatrix(withProjectView(next));
  };

  const enabledModules = PERMISSION_MODULES.filter((m) => rowCount(m.key) > 0).length;

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const permissions = fromMatrix(matrix);
      if (isEdit) {
        await interiorProjectService.updateRole(role!._id, {
          ...(role!.isSystem ? {} : { name: name.trim() }),
          description: description.trim(),
          permissions,
        });
        toast.success('Role updated');
      } else {
        await interiorProjectService.createRole({ name: name.trim(), description: description.trim(), permissions });
        toast.success('Role created');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = 'w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{isEdit ? 'Edit Role' : 'New Role'}</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{enabledModules} of {PERMISSION_MODULES.length} modules enabled</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[hsl(var(--muted))]"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1.5">Role name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={isEdit && role!.isSystem} className={fieldCls} placeholder="e.g. Site Supervisor" />
              {isEdit && role!.isSystem && <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">Built-in roles can&apos;t be renamed.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-1.5">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={fieldCls} placeholder="What this role is for" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Module permissions</p>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => applyPreset('read')} className="px-3 py-1.5 rounded-md text-xs font-medium bg-[hsl(var(--muted))] hover:opacity-80">Read Only</button>
              <button type="button" onClick={() => applyPreset('full')} className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Full Access</button>
              <button type="button" onClick={() => applyPreset('clear')} className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">Clear All</button>
            </div>
          </div>

          {MODULE_CATEGORIES.map((category) => (
            <div key={category} className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
              <div className="px-4 py-2 bg-[hsl(var(--muted)/0.4)] text-xs font-bold text-[hsl(var(--foreground))]">
                {category}
                {category === 'Project Execution' && (
                  <span className="block mt-0.5 text-[10px] font-normal text-[hsl(var(--muted-foreground))]">
                    Project Config → View is turned on automatically with any project module — it&apos;s needed to open a project.
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[hsl(var(--muted-foreground))]">
                      <th className="text-left font-semibold px-4 py-2 min-w-[180px]">Module</th>
                      {ACTION_COLUMNS.map((a) => (
                        <th key={a.key} className="font-semibold px-2 py-2 text-center whitespace-nowrap">{a.label}</th>
                      ))}
                      <th className="font-semibold px-2 py-2 text-center whitespace-nowrap border-l border-[hsl(var(--border)/0.6)]" title="Tick to give every action in this module">Full access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MODULES.filter((m) => m.category === category).map((m) => (
                      <tr key={m.key} className="border-t border-[hsl(var(--border)/0.6)]">
                        <td className="px-4 py-2 font-medium text-[hsl(var(--foreground))]">{m.label}</td>
                        {ACTION_COLUMNS.map((a) => (
                          <td key={a.key} className="px-2 py-2 text-center">
                            {!moduleActions(m.key).includes(a.key) ? (
                              <span className="text-[hsl(var(--muted-foreground)/0.5)]" title={`${m.label} has no ${a.label.toLowerCase()} action`}>—</span>
                            ) : (
                            <input
                              type="checkbox"
                              checked={has(m.key, a.key)}
                              onChange={() => toggle(m.key, a.key)}
                              className="w-4 h-4 accent-[hsl(var(--primary))] cursor-pointer"
                              aria-label={`${m.label} ${a.label}`}
                            />
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center border-l border-[hsl(var(--border)/0.6)]">
                          <input
                            type="checkbox"
                            checked={rowCount(m.key) === moduleActions(m.key).length}
                            ref={(el) => { if (el) el.indeterminate = rowCount(m.key) > 0 && rowCount(m.key) < moduleActions(m.key).length; }}
                            onChange={() => toggleFull(m.key)}
                            className="w-4 h-4 accent-[hsl(var(--primary))] cursor-pointer"
                            aria-label={`${m.label} full access`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-[hsl(var(--border))]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[hsl(var(--muted))] hover:opacity-80">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role card (expandable)
// ---------------------------------------------------------------------------
function RoleCard({
  role, canEdit, canDelete, onEdit, onDelete,
}: { role: ManagedRole; canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const locked = isAdminRole(role);
  const modulesWithAccess = PERMISSION_MODULES.filter((m) => permissionsAllow(role.permissions, m.key, 'read')).length;

  return (
    <motion.div layout className="border border-[hsl(var(--border))] rounded-xl overflow-hidden bg-[hsl(var(--card))]">
      <div className="flex items-center gap-4 p-4">
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[hsl(var(--foreground))]">{role.name}</span>
              {locked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Lock className="w-2.5 h-2.5" /> FULL ACCESS · LOCKED
                </span>
              )}
              {role.isSystem && !locked && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">BUILT-IN</span>
              )}
            </div>
            {role.description && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate">{role.description}</p>}
          </div>
          <span className="hidden sm:inline px-2 py-0.5 rounded bg-[hsl(var(--muted)/0.5)] text-xs font-semibold text-[hsl(var(--foreground))] shrink-0">
            {locked ? PERMISSION_MODULES.length : modulesWithAccess}/{PERMISSION_MODULES.length} modules
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit && !locked && (
            <button onClick={onEdit} title="Edit role" className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-blue-600 hover:bg-blue-50"><Pencil className="w-3.5 h-3.5" /></button>
          )}
          {canDelete && !role.isSystem && (
            <button onClick={onDelete} title="Delete role" className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-[hsl(var(--border))] overflow-hidden">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSION_MODULES.map((m) => {
                const actions = locked
                  ? [...moduleActions(m.key)]
                  : actionsOf(m.key, (role.permissions || []).find((p) => p.module === m.key)?.actions);
                const hasAccess = actions.length > 0;
                const full = actions.length === moduleActions(m.key).length;
                return (
                  <div key={m.key} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${hasAccess ? 'border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)]' : 'border-dashed border-[hsl(var(--border)/0.5)] opacity-40'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {hasAccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <MinusCircle className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />}
                      <span className="font-medium truncate">{m.label}</span>
                    </div>
                    <div className="flex gap-0.5 shrink-0 ml-2">
                      {full
                        ? <span className="px-1.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">Full</span>
                        : hasAccess
                        ? actions.map((a) => (
                            <span key={a} title={PERMISSION_ACTIONS.find((x) => x.key === a)?.label} className="px-1 rounded text-[9px] font-bold bg-blue-50 text-blue-700">
                              {PERMISSION_ACTIONS.find((x) => x.key === a)?.short}
                            </span>
                          ))
                        : <span className="text-[10px] text-[hsl(var(--muted-foreground))]">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Manager (Roles tab)
// ---------------------------------------------------------------------------
export function InteriorRolesManager({ roles, onChanged: onRolesChanged }: { roles: ManagedRole[]; onChanged: () => void }) {
  const toast = useToast();
  // Reload the list, and re-read my own permissions in case my role changed
  const onChanged = () => {
    onRolesChanged();
    refreshInteriorUser(true);
  };
  const { isOrgAdmin, hasPermission } = usePermissions();
  const canCreate = isOrgAdmin || hasPermission('roles', 'create');
  const canUpdate = isOrgAdmin || hasPermission('roles', 'update');
  const canDelete = isOrgAdmin || hasPermission('roles', 'delete');

  const [editing, setEditing] = useState<ManagedRole | null | 'new'>(null);
  const [deleting, setDeleting] = useState<ManagedRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sorted = useMemo(
    () => [...roles].sort((a, b) => Number(isAdminRole(b)) - Number(isAdminRole(a)) || Number(!!b.isSystem) - Number(!!a.isSystem)),
    [roles]
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await interiorProjectService.deleteRole(deleting._id);
      toast.success(`Role "${deleting.name}" deleted`);
      setDeleting(null);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[hsl(var(--foreground))]">Organization roles</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              A user&apos;s global role applies across the organization (CRM, vendors, templates). Inside a project, members also get the role assigned to them on that project.
            </p>
          </div>
        </div>
        {canCreate && (
          <button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 shrink-0">
            <Plus className="w-3.5 h-3.5" /> New Role
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sorted.map((role) => (
          <RoleCard
            key={role._id}
            role={role}
            canEdit={canUpdate}
            canDelete={canDelete}
            onEdit={() => setEditing(role)}
            onDelete={() => setDeleting(role)}
          />
        ))}
        {sorted.length === 0 && <p className="text-sm text-center text-[hsl(var(--muted-foreground))] py-10">No roles found.</p>}
      </div>

      {editing && (
        <RoleEditorModal role={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={onChanged} />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isDeleting && setDeleting(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xl">
            <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Delete role?</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1.5">
              &ldquo;{deleting.name}&rdquo; will be removed. Roles still assigned to users or project members can&apos;t be deleted.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDeleting(null)} disabled={isDeleting} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[hsl(var(--muted))]">Cancel</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteriorRolesManager;
