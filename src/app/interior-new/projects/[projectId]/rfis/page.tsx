'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorRfisView from '@/features/interior-new/components/projects/InteriorRfisView';

export default function InteriorRfisPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorRfisView projectId={projectId} />;
}
