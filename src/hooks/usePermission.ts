import { useAuth } from '@/providers/AuthContext';

export const usePermission = (permission: string): boolean => {
  const { user } = useAuth();
  if (!user?.role?.permissions) return false;
  return user.role.permissions.includes(permission);
};

export const useIsAdmin = (): boolean => {
  const { user } = useAuth();
  return user?.role?.name === 'Admin';
};

export const useRole = (): string => {
  const { user } = useAuth();
  return user?.role?.name ?? '';
};
