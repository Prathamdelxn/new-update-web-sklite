'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorVariationOrdersView from '@/features/interior-new/components/projects/InteriorVariationOrdersView';

export default function InteriorVariationOrdersPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorVariationOrdersView projectId={projectId} />;
}
