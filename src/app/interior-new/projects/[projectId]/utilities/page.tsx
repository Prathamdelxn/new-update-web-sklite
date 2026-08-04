'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorUtilitiesView from '@/features/interior-new/components/projects/InteriorUtilitiesView';

export default function InteriorUtilitiesPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorUtilitiesView projectId={projectId} />;
}
