'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorBoqView from '@/features/interior-new/components/projects/InteriorBoqView';

export default function InteriorBoqPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorBoqView projectId={projectId} />;
}
