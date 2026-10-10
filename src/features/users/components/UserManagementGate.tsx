'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission } from '@/lib/permissions';

// User Management is org-wide, so only the global role counts here.
export const useUserManagementPermissions = () => {
  const { user } = useAuth();
  return {
    canView: hasProjectPermission(user, null, 'users:view'),
    canCreate: hasProjectPermission(user, null, 'users:create'),
    canUpdate: hasProjectPermission(user, null, 'users:update'),
    canDelete: hasProjectPermission(user, null, 'users:delete'),
  };
};

// Shows the page only to users whose role has User Management > View.
export const UserManagementGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading } = useAuth();
  const { canView } = useUserManagementPermissions();

  if (loading) return null;
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
        </div>
        <p className="text-sm font-bold text-slate-700">You don't have access to Team & Roles</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Ask your admin to enable <span className="font-semibold">User Management → View</span> on your role.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};
