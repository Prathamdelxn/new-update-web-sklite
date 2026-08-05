'use client';

import React from 'react';
import { InteriorShell } from '@/components/interior/InteriorShell';
import InteriorNewDashboardView from '@/features/interior-new/components/InteriorNewDashboardView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';

export default function InteriorNewPage() {
  const checked = useInteriorAuthGuard();
  if (!checked) return null;

  return (
    <InteriorShell>
      <InteriorNewDashboardView />
    </InteriorShell>
  );
}
