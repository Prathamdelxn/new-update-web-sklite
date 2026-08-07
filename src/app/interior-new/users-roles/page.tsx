'use client';

import React from 'react';
import { InteriorShell } from '@/components/interior/InteriorShell';
import InteriorUsersRolesView from '@/features/interior-new/components/InteriorUsersRolesView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';

export default function InteriorUsersRolesPage() {
  const checked = useInteriorAuthGuard();
  if (!checked) return null;

  return (
    <InteriorShell>
      <InteriorUsersRolesView />
    </InteriorShell>
  );
}
