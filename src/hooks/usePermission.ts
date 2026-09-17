import { useAuth } from '@/providers/AuthContext';
import { getInteriorUser } from '@/lib/interiorAuth';

export const usePermission = (permission: string): boolean => {
  const { user } = useAuth();
  if (useIsAdmin()) return true;
  if (!user?.role?.permissions) return false;
  return user.role.permissions.includes(permission);
};

export const useIsAdmin = (): boolean => {
  const { user } = useAuth();
  const targetUser = user || (typeof window !== 'undefined' ? getInteriorUser() : null);
  if (!targetUser) return false;

  const roleName = String(targetUser.role?.name || (typeof targetUser.role === 'string' ? targetUser.role : '') || '').toLowerCase();
  const roleSlug = String(targetUser.role?.slug || '').toLowerCase();
  const sysRole = String((targetUser as any).systemRole || '').toLowerCase();

  return (
    roleName === 'admin' ||
    roleName === 'super admin' ||
    roleName === 'superadmin' ||
    roleName === 'org admin' ||
    roleName === 'org_admin' ||
    roleSlug === 'admin' ||
    roleSlug === 'org_admin' ||
    roleSlug === 'super_admin' ||
    roleSlug === 'superadmin' ||
    sysRole === 'admin' ||
    sysRole === 'super_admin' ||
    sysRole === 'superadmin' ||
    sysRole === 'org_admin'
  );
};

export const useRole = (): string => {
  const { user } = useAuth();
  const targetUser = user || (typeof window !== 'undefined' ? getInteriorUser() : null);
  return targetUser?.role?.name || targetUser?.role?.slug || (targetUser as any)?.systemRole || '';
};

