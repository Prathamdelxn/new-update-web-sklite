export const hasProjectPermission = (user: any, project: any, permission: string): boolean => {
  if (!user) return false;

  // 1. Check Global Admin or wildcard
  const globalPerms = user?.role?.permissions || [];
  if (user?.role?.name === 'Admin' || globalPerms.includes('*')) {
    return true;
  }

  // 2. Check Global Permission (if assigned globally)
  if (globalPerms.includes(permission)) {
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
      if (myMember.role.permissions.includes('*') || myMember.role.permissions.includes(permission)) {
        return true;
      }
    }
  }

  return false;
};

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

export const hasProjectPermissionWithMembers = (user: any, projectMembers: any[], permission: string): boolean => {
  if (!user) return false;

  const globalPerms = user?.role?.permissions || [];
  if (user?.role?.name === 'Admin' || globalPerms.includes('*') || globalPerms.includes(permission)) {
    return true;
  }

  if (projectMembers && Array.isArray(projectMembers)) {
    const currentUserId = user?._id || user?.id;
    const myMember = projectMembers.find((m: any) => {
      const mUserId = m.user?._id || m.user;
      return mUserId === currentUserId;
    });

    if (myMember?.role?.permissions) {
      if (myMember.role.permissions.includes('*') || myMember.role.permissions.includes(permission)) {
        return true;
      }
    }
  }

  return false;
};
