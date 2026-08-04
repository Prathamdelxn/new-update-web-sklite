'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorMomView from '@/features/interior-new/components/projects/InteriorMomView';

export default function InteriorMomPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorMomView projectId={projectId} />;
}
