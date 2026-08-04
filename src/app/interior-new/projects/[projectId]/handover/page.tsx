'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorHandoverView from '@/features/interior-new/components/projects/InteriorHandoverView';

export default function InteriorHandoverPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorHandoverView projectId={projectId} />;
}
