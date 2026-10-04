'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Vendor Management Page
// =============================================================================

import React from 'react';
import { InteriorShell } from '@/components/interior/InteriorShell';
import InteriorVendorsManagementView from '@/features/interior-new/components/InteriorVendorsManagementView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';

export default function InteriorVendorsPage() {
  const checked = useInteriorAuthGuard();
  if (!checked) return null;

  return (
    <InteriorShell>
      <InteriorVendorsManagementView />
    </InteriorShell>
  );
}
