'use client';

import React from 'react';
import { Shell } from '@/components/layouts/Shell';
import { InteriorDashboardView } from '@/features/dashboard/components/InteriorDashboardView';

export default function InteriorDashboardPage() {
  return (
    <Shell>
      <InteriorDashboardView />
    </Shell>
  );
}
