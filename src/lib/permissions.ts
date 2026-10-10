// The Role editor saves `projects:<action>`, but default roles seeded at
// registration use `project:<action>` / `team:assign`. Treat them as equal
// (mirrors the backend's src/lib/permissions.js).
const PERMISSION_ALIASES: Record<string, string[]> = {
  'projects:view': ['project:view'],
  'projects:create': ['project:create'],
  'projects:update': ['project:update'],
  'projects:delete': ['project:delete'],
  'projects:approve': ['project:approve'],
  'projects:complete': ['project:complete'],
  'projects:assign': ['project:assign', 'team:assign'],
  // Site survey: older code/roles used `manage` for assign+approve and
  // `submit` for creating a survey.
  'sitesurvey:create': ['sitesurvey:submit'],
  'sitesurvey:approve': ['sitesurvey:manage'],
  'sitesurvey:assign': ['sitesurvey:manage'],
  // Snags & Issues: older code used singular `snag:*`; default roles were
  // seeded with `snags:resolve` / `snags:close` for completing.
  'snags:assign': ['snag:assign'],
  'snags:complete': ['snag:complete', 'snags:resolve', 'snags:close'],
};

export const permissionListIncludes = (perms: string[] | undefined, permission: string): boolean => {
  if (!Array.isArray(perms)) return false;
  if (perms.includes('*') || perms.includes(permission)) return true;
  return (PERMISSION_ALIASES[permission] || []).some((alias) => perms.includes(alias));
};

export const hasProjectPermission = (user: any, project: any, permission: string): boolean => {
  if (!user) return false;

  // 1. Check Global Admin or wildcard
  const globalPerms = user?.role?.permissions || [];
  if (user?.role?.name === 'Admin' || globalPerms.includes('*')) {
    return true;
  }

  // 2. Check Global Permission (if assigned globally)
  if (permissionListIncludes(globalPerms, permission)) {
    return true;
  }

  // 3. Check Project-specific Permission
  if (project && Array.isArray(project.members)) {
    const currentUserId = user?._id || user?.id;
    const myMember = project.members.find((m: any) => {
      const mUserId = m.user?._id || m.user;
      return mUserId === currentUserId;
    });

    if (myMember?.role?.permissions) {
      if (permissionListIncludes(myMember.role.permissions, permission)) {
        return true;
      }
    }
  }

  return false;
};

// Creating a project isn't tied to an existing project, so Create counts from
// the global role OR any of the user's project roles (mirrors POST /projects).
export const canCreateProjects = (user: any): boolean => hasAnyRolePermission(user, 'projects:create');

// True if the permission is on the user's global role OR on any of their
// project roles. Used for org-wide modules (Templates, Categories, creating
// projects) that aren't tied to one project — so a member whose access comes
// only from a project assignment still gets it. Mirrors the backend.
export function hasAnyRolePermission(user: any, permission: string): boolean {
  if (hasProjectPermission(user, null, permission)) return true;
  return (user?.projects || []).some((p: any) => {
    const role = p?.role;
    if (!role || typeof role !== 'object') return false;
    return role.name === 'Admin' || role.isSystemRole || permissionListIncludes(role.permissions, permission);
  });
}

// Whether any of the user's roles (global or per-project) lets them see projects.
// Without it the project list is empty and every project-scoped permission
// (site survey, BOQ, ...) is unreachable.
export const canViewAnyProject = (user: any): boolean => hasAnyRolePermission(user, 'projects:view');

export const hasAnyProjectPermissionPrefix = (user: any, project: any, prefix: string): boolean => {
  if (!user) return false;

  // 1. Check Global Admin or wildcard
  const globalPerms = user?.role?.permissions || [];
  if (user?.role?.name === 'Admin' || globalPerms.includes('*')) {
    return true;
  }

  // 2. Check Global Permission with prefix
  if (globalPerms.some((p: string) => p.startsWith(prefix))) {
    return true;
  }

  // 3. Check Project-specific Permission with prefix
  if (project && Array.isArray(project.members)) {
    const currentUserId = user?._id || user?.id;
    const myMember = project.members.find((m: any) => {
      const mUserId = m.user?._id || m.user;
      return mUserId === currentUserId;
    });

    if (myMember?.role?.permissions) {
      if (myMember.role.permissions.includes('*') || myMember.role.permissions.some((p: string) => p.startsWith(prefix))) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Check if the project is in a locked status, which should prevent any modifying actions.
 * Mirrors sky-lite (mobile) app/utils/permissions.js#isProjectLocked exactly.
 */
export const isProjectLocked = (project: any): boolean => {
  if (!project || !project.status) return false;
  return ['Completed', 'Handover Completed', 'Cancelled'].includes(project.status);
};

export const hasProjectPermissionWithMembers = (user: any, projectMembers: any[], permission: string): boolean => {
  if (!user) return false;

  const globalPerms = user?.role?.permissions || [];
  if (user?.role?.name === 'Admin' || permissionListIncludes(globalPerms, permission)) {
    return true;
  }

  if (projectMembers && Array.isArray(projectMembers)) {
    const currentUserId = user?._id || user?.id;
    const myMember = projectMembers.find((m: any) => {
      const mUserId = m.user?._id || m.user;
      return mUserId === currentUserId;
    });

    if (myMember?.role?.permissions) {
      if (permissionListIncludes(myMember.role.permissions, permission)) {
        return true;
      }
    }
  }

  return false;
};
