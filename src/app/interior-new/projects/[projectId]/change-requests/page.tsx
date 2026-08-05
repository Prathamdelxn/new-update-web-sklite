'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorChangeRequestsView from '@/features/interior-new/components/projects/InteriorChangeRequestsView';

export default function InteriorChangeRequestsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorChangeRequestsView projectId={projectId} />;
}
