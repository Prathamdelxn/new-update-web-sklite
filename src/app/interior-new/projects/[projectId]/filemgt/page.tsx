'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorFilemgtView from '@/features/interior-new/components/projects/InteriorFilemgtView';

export default function InteriorFilemgtPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorFilemgtView projectId={projectId} />;
}
