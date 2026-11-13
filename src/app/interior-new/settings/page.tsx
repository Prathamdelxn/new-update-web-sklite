'use client';

import React from 'react';
import { InteriorShell } from '@/components/interior/InteriorShell';
import InteriorSettingsView from '@/features/interior-new/components/InteriorSettingsView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';

export default function InteriorSettingsPage() {
  const checked = useInteriorAuthGuard();
  if (!checked) return null;

  return (
    <InteriorShell>
      <InteriorSettingsView />
    </InteriorShell>
  );
}
