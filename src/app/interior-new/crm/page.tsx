'use client';

import React from 'react';
import { InteriorShell } from '@/components/interior/InteriorShell';
import InteriorCrmView from '@/features/interior-new/components/crm/InteriorCrmView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';

export default function InteriorNewCrmPage() {
  const checked = useInteriorAuthGuard();
  if (!checked) return null;

  return (
    <InteriorShell>
      <InteriorCrmView />
    </InteriorShell>
  );
}
