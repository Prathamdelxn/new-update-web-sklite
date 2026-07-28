'use client';

import React from 'react';
import { Shell } from '@/components/layouts/Shell';
import { OverviewDashboard } from '@/features/dashboard/components/OverviewDashboard';

export default function DashboardPage() {
  return (
    <Shell>
      <OverviewDashboard />
    </Shell>
  );
}
