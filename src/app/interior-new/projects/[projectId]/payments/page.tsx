'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorPaymentsView from '@/features/interior-new/components/projects/InteriorPaymentsView';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';

export default function InteriorProjectPaymentsPage() {
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const projectId = params?.projectId as string;

  if (!checked || !projectId) return null;

  return <InteriorPaymentsView projectId={projectId} />;
}
