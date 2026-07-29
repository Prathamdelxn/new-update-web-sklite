'use client';

import React from 'react';
import { Shell } from '@/components/layouts/Shell';
import { OverviewDashboard } from '@/features/dashboard/components/OverviewDashboard';
import { InteriorDashboardView } from '@/features/dashboard/components/InteriorDashboardView';
import { useAuth } from '@/providers/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const isInterior =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior';

  return (
    <Shell>
      {isInterior ? <InteriorDashboardView /> : <OverviewDashboard />}
    </Shell>
  );
}
