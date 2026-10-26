'use client';

import React from 'react';
import InteriorSettingsView from '@/features/interior-new/components/InteriorSettingsView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';

export default function InteriorProfilePage() {
  const checked = useInteriorAuthGuard();
  if (!checked) return null;

  return <InteriorSettingsView />;
}
