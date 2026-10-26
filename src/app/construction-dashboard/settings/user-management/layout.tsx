'use client';

import { UserManagementGate } from '@/features/users/components/UserManagementGate';

// Every page under Settings > User Management needs User Management > View
export default function UserManagementLayout({ children }: { children: React.ReactNode }) {
  return <UserManagementGate>{children}</UserManagementGate>;
}
