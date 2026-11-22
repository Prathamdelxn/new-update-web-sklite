'use client';

import React from 'react';
import InteriorSettingsView from '@/features/interior-new/components/InteriorSettingsView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { I18nProvider } from '@/i18n/I18nProvider';

export default function InteriorProfilePage() {
  const checked = useInteriorAuthGuard();
  if (!checked) return null;

  // Same language / right-to-left handling as the rest of the interior app
  return (
    <I18nProvider>
      <InteriorSettingsView />
    </I18nProvider>
  );
}
