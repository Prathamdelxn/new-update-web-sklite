'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorProcurementView from '@/features/interior-new/components/projects/InteriorProcurementView';

export default function InteriorProcurementPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorProcurementView projectId={projectId} />;
}
