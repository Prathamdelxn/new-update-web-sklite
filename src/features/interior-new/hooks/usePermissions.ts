'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Permissions Hook
// Granular Role-Based Access Control (RBAC) across Project & CRM Pipeline Stages
// =============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getInteriorUser } from '@/lib/interiorAuth';

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
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = getInteriorUser();
    setCurrentUser(user);
  }, []);

  const isOrgAdmin = useMemo(() => {
    if (!currentUser) return true; // Default permissive in dev until user session loads
    const sysRole = currentUser.systemRole || currentUser.role;
    return (
      sysRole === 'super_admin' ||
      sysRole === 'org_admin' ||
      sysRole === 'admin' ||
      currentUser.role?.slug === 'admin'
    );
  }, [currentUser]);

  const userRoleKey = useMemo(() => {
    if (!currentUser) return 'admin';
    if (typeof currentUser.role === 'string') return currentUser.role.toLowerCase().replace(/[-\s]/g, '_');
    if (currentUser.role?.slug) return currentUser.role.slug.toLowerCase().replace(/[-\s]/g, '_');
    if (currentUser.systemRole) return currentUser.systemRole.toLowerCase().replace(/[-\s]/g, '_');
    return 'admin';
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
    return DEFAULT_ROLE_PERMISSIONS[userRoleKey] || DEFAULT_ROLE_PERMISSIONS.admin;
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
