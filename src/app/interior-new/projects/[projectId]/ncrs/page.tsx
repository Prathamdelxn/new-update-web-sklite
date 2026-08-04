'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorNcrsView from '@/features/interior-new/components/projects/InteriorNcrsView';

export default function InteriorNcrsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorNcrsView projectId={projectId} />;
}
