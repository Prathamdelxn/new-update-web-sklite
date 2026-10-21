'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Permissions Hook
// Granular Role-Based Access Control (RBAC) across Project & CRM Pipeline Stages
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getInteriorUser } from '@/lib/interiorAuth';
import interiorApiClient from '@/services/interiorApi.client';

// Role permissions are saved at login. Re-read them from /auth/me (throttled,
// shared by every component using this hook) so role changes an admin makes
// apply without logging out — mirrors the construction AuthContext refresh.
const USER_UPDATED_EVENT = 'interior-user-updated';
const REFRESH_INTERVAL_MS = 10_000; // minimum gap between refreshes
const POLL_INTERVAL_MS = 15_000; // background re-check while the tab is visible
let lastRefreshAt = 0;
let refreshInFlight: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

// One shared poller for the whole app: permission changes an admin makes (grant
// or revoke) reach open screens within ~15s without a page refresh.
function startPermissionPolling() {
  if (typeof window === 'undefined' || pollTimer) return;
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') refreshInteriorUser();
  }, POLL_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshInteriorUser();
  });
}

export function refreshInteriorUser(force = false): Promise<void> {
  if (typeof window === 'undefined' || !localStorage.getItem('interiorAccessToken')) return Promise.resolve();
  if (refreshInFlight) return refreshInFlight;
  if (!force && Date.now() - lastRefreshAt < REFRESH_INTERVAL_MS) return Promise.resolve();
  lastRefreshAt = Date.now();
  refreshInFlight = interiorApiClient
    .get('/auth/me')
    .then((res) => {
      const fresh = res?.data?.data?.user ?? res?.data?.user;
      if (!fresh) return;
      const merged = { ...(getInteriorUser() || {}), ...fresh };
      localStorage.setItem('interiorUser', JSON.stringify(merged));
      window.dispatchEvent(new Event(USER_UPDATED_EVENT));
    })
    .catch(() => { /* keep the cached user */ })
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'manage';

export type CrmPhase =
  | 'crm_leads'
  | 'crm_followups'
  | 'crm_site_visits'
  | 'crm_requirements'
  | 'crm_drawings'
  | 'crm_boq'
  | 'crm_quotations';

// Default role matrix for quick frontend fallback when offline or before role hydration
const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  admin: {
    crm_leads: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
    crm_followups: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
    crm_site_visits: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
    crm_requirements: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
    crm_drawings: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
    crm_boq: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
    crm_quotations: ['create', 'read', 'update', 'delete', 'approve', 'export', 'manage'],
  },
  project_manager: {
    crm_leads: ['create', 'read', 'update', 'delete', 'export', 'manage'],
    crm_followups: ['create', 'read', 'update', 'delete', 'manage'],
    crm_site_visits: ['create', 'read', 'update', 'manage'],
    crm_requirements: ['create', 'read', 'update', 'manage'],
    crm_drawings: ['create', 'read', 'update', 'approve', 'manage'],
    crm_boq: ['create', 'read', 'update', 'approve', 'manage'],
    crm_quotations: ['create', 'read', 'update', 'export', 'manage'],
  },
  sales_executive: {
    crm_leads: ['create', 'read', 'update', 'export', 'manage'],
    crm_followups: ['create', 'read', 'update', 'delete', 'manage'],
    crm_site_visits: ['create', 'read', 'update', 'manage'],
    crm_requirements: ['read'],
    crm_drawings: ['read'],
    crm_boq: ['read'],
    crm_quotations: ['create', 'read', 'update', 'export', 'manage', 'approve'],
  },
  site_engineer: {
    crm_leads: ['read'],
    crm_followups: ['create', 'read', 'update'],
    crm_site_visits: ['create', 'read', 'update', 'manage'],
    crm_requirements: ['read'],
    crm_drawings: ['read'],
    crm_boq: ['read'],
    crm_quotations: ['read'],
  },
  quantity_surveyor: {
    crm_leads: ['read'],
    crm_followups: ['read'],
    crm_site_visits: ['read'],
    crm_requirements: ['read'],
    crm_drawings: ['read'],
    crm_boq: ['create', 'read', 'update', 'delete', 'export', 'manage'],
    crm_quotations: ['create', 'read', 'update', 'export', 'approve'],
  },
  designer: {
    crm_leads: ['read'],
    crm_followups: ['read'],
    crm_site_visits: ['create', 'read', 'update'],
    crm_requirements: ['create', 'read', 'update', 'manage'],
    crm_drawings: ['create', 'read', 'update', 'delete', 'approve', 'manage'],
    crm_boq: ['read'],
    crm_quotations: ['read'],
  },
  sub_contractor: {
    crm_leads: [],
    crm_followups: [],
    crm_site_visits: [],
    crm_requirements: [],
    crm_drawings: ['read'],
    crm_boq: [],
    crm_quotations: [],
  },
  client_representative: {
    crm_leads: ['read'],
    crm_followups: ['read'],
    crm_site_visits: ['read'],
    crm_requirements: ['read'],
    crm_drawings: ['read'],
    crm_boq: ['read'],
    crm_quotations: ['read'],
  },
  viewer: {
    crm_leads: ['read'],
    crm_followups: ['read'],
    crm_site_visits: ['read'],
    crm_requirements: ['read'],
    crm_drawings: ['read'],
    crm_boq: ['read'],
    crm_quotations: ['read'],
  },
};

export function usePermissions() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      return getInteriorUser();
    }
    return null;
  });

  useEffect(() => {
    const sync = () => setCurrentUser(getInteriorUser());
    sync();
    refreshInteriorUser();
    startPermissionPolling();
    const onFocus = () => refreshInteriorUser();
    window.addEventListener(USER_UPDATED_EVENT, sync);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, sync);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const isOrgAdmin = useMemo(() => {
    if (!currentUser) return false;
    const sysRole = String(currentUser.systemRole || (typeof currentUser.role === 'string' ? currentUser.role : currentUser.role?.slug || currentUser.role?.name) || '').toLowerCase();
    const roleSlug = String(currentUser.role?.slug || (typeof currentUser.role === 'string' ? currentUser.role : '') || '').toLowerCase();
    const roleName = String(currentUser.role?.name || '').toLowerCase();
    return (
      sysRole === 'super_admin' ||
      sysRole === 'org_admin' ||
      sysRole === 'admin' ||
      sysRole === 'superadmin' ||
      roleSlug === 'admin' ||
      roleSlug === 'org_admin' ||
      roleSlug === 'super_admin' ||
      roleSlug === 'superadmin' ||
      roleName === 'admin' ||
      roleName === 'org admin' ||
      roleName === 'super admin' ||
      roleName === 'superadmin'
    );
  }, [currentUser]);

  const userRoleKey = useMemo(() => {
    if (!currentUser) return 'viewer';
    if (typeof currentUser.role === 'string') return currentUser.role.toLowerCase().replace(/[-\s]/g, '_');
    if (currentUser.role?.slug) return currentUser.role.slug.toLowerCase().replace(/[-\s]/g, '_');
    if (currentUser.systemRole) return currentUser.systemRole.toLowerCase().replace(/[-\s]/g, '_');
    return 'viewer';
  }, [currentUser]);

  const userPermissions = useMemo(() => {
    if (isOrgAdmin) return null; // Admin has universal access
    if (currentUser?.role?.permissions && Array.isArray(currentUser.role.permissions)) {
      const map: Record<string, string[]> = {};
      currentUser.role.permissions.forEach((p: { module: string; actions: string[] }) => {
        map[p.module] = p.actions;
      });
      return map;
    }
    // Unknown / custom roles get the least access (read-only), never Admin's
    return DEFAULT_ROLE_PERMISSIONS[userRoleKey] || DEFAULT_ROLE_PERMISSIONS.viewer;
  }, [isOrgAdmin, currentUser, userRoleKey]);

  /**
   * Check if the current user has permission for a module and action
   */
  const hasPermission = useCallback(
    (module: string, action: PermissionAction = 'read'): boolean => {
      if (isOrgAdmin) return true;
      if (!userPermissions) return true;
      const actions = userPermissions[module] || [];
      return actions.includes(action) || actions.includes('manage');
    },
    [isOrgAdmin, userPermissions]
  );

  /**
   * Helper to check if user can view a specific CRM tab / stage
   */
  const canAccessCrmTab = useCallback(
    (tab: 'all' | 'followup' | 'site' | 'requirements' | 'drawing' | 'boq' | 'quotations'): boolean => {
      if (isOrgAdmin) return true;
      const tabModuleMap: Record<string, string> = {
        all: 'crm_leads',
        followup: 'crm_followups',
        site: 'crm_site_visits',
        requirements: 'crm_requirements',
        drawing: 'crm_drawings',
        boq: 'crm_boq',
        quotations: 'crm_quotations',
      };
      const moduleKey = tabModuleMap[tab] || 'crm_leads';
      return hasPermission(moduleKey, 'read');
    },
    [isOrgAdmin, hasPermission]
  );

  return {
    currentUser,
    userRole: userRoleKey,
    isOrgAdmin,
    hasPermission,
    canAccessCrmTab,
  };
}
