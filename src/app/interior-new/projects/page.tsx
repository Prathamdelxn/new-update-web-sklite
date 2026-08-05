'use client';

import React from 'react';
import { InteriorShell } from '@/components/interior/InteriorShell';
import InteriorNewProjectsView from '@/features/interior-new/components/InteriorNewProjectsView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';

export default function InteriorNewProjectsPage() {
  const checked = useInteriorAuthGuard();
  if (!checked) return null;

  return (
    <InteriorShell>
      <InteriorNewProjectsView />
    </InteriorShell>
  );
}
