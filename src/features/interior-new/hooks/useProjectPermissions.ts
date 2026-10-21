'use client';

// =============================================================================
// Interior — permissions inside one project
// The backend (lib/rbac `can`) allows an action in a project when the user is
// an org admin, or a member whose org role + project role allow it. This hook
// mirrors that so screens can hide what the server would refuse.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import interiorApiClient from '@/services/interiorApi.client';
import { permissionsAllow, type PermissionAction, type RolePermission } from '@/features/interior-new/lib/permissionCatalog';
import { usePermissions, PERMISSIONS_CHANGED_EVENT } from './usePermissions';

interface ProjectAccess {
  isMember: boolean;
  isAdmin: boolean;
  roleName?: string;
  permissions: RolePermission[];
}

const CACHE_MS = 10_000;
const cache = new Map<string, { at: number; data: ProjectAccess }>();
const inflight = new Map<string, Promise<ProjectAccess>>();

function loadProjectAccess(projectId: string, force = false): Promise<ProjectAccess> {
  const hit = cache.get(projectId);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.data);
  const running = inflight.get(projectId);
  if (running) return running;
  const p = interiorApiClient
    .get(`/projects/${projectId}/members/me`)
    .then((res) => {
      const d = res?.data?.data ?? res?.data ?? {};
      const data: ProjectAccess = {
        isMember: !!d.isMember,
        isAdmin: !!d.isAdmin,
        roleName: d.roleName,
        permissions: Array.isArray(d.permissions) ? d.permissions : [],
      };
      const before = cache.get(projectId)?.data;
      cache.set(projectId, { at: Date.now(), data });
      // Role in this project changed while the page was open: let the shell reload the page
      if (before && JSON.stringify(before) !== JSON.stringify(data) && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(PERMISSIONS_CHANGED_EVENT));
      }
      return data;
    })
    .catch(() => ({ isMember: false, isAdmin: false, permissions: [] as RolePermission[] }))
    .finally(() => inflight.delete(projectId));
  inflight.set(projectId, p);
  return p;
}

export function useProjectPermissions(projectId?: string | null) {
  const { isOrgAdmin } = usePermissions();
  const [access, setAccess] = useState<ProjectAccess | null>(() =>
    projectId ? cache.get(projectId)?.data ?? null : null
  );

  useEffect(() => {
    if (!projectId || isOrgAdmin) return;
    let alive = true;
    const load = (force = false) =>
      loadProjectAccess(projectId, force).then((d) => {
        if (alive) setAccess(d);
      });
    load();
    // Every user refresh (the ~15s poll in usePermissions, role edits, returning to
    // the tab) reloads project permissions too, so grants / revokes apply live
    const onUpdate = () => load(true);
    window.addEventListener('interior-user-updated', onUpdate);
    window.addEventListener('focus', onUpdate);
    return () => {
      alive = false;
      window.removeEventListener('interior-user-updated', onUpdate);
      window.removeEventListener('focus', onUpdate);
    };
  }, [projectId, isOrgAdmin]);

  /** Allowed in this project? `false` while loading, so buttons don't flash. */
  const can = useCallback(
    (module: string, action: PermissionAction = 'read'): boolean => {
      if (isOrgAdmin) return true;
      if (!access) return false;
      if (access.isAdmin) return true;
      return permissionsAllow(access.permissions, module, action);
    },
    [isOrgAdmin, access]
  );

  return {
    can,
    isAdmin: isOrgAdmin || !!access?.isAdmin,
    isMember: isOrgAdmin || !!access?.isMember,
    loading: !isOrgAdmin && !access,
  };
}

/** Clear cached project permissions (after a member's role changes). */
export function invalidateProjectPermissions(projectId?: string) {
  if (projectId) cache.delete(projectId);
  else cache.clear();
}
