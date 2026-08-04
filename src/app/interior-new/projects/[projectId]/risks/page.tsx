'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorRisksView from '@/features/interior-new/components/projects/InteriorRisksView';

export default function InteriorRisksPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorRisksView projectId={projectId} />;
}
