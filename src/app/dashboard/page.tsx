'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layouts/Shell';
import { OverviewDashboard } from '@/features/dashboard/components/OverviewDashboard';
import { useAuth } from '@/providers/AuthContext';
import { isInteriorSession } from '@/lib/interiorAuth';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isInterior =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior' ||
    isInteriorSession();

  useEffect(() => {
    if (!loading && isInterior) {
      router.replace('/interior-new');
    }
  }, [loading, isInterior, router]);

  if (loading || isInterior) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFF]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Shell>
      <OverviewDashboard />
    </Shell>
  );
}
