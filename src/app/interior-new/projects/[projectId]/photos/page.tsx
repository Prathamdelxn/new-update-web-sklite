'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorPhotosView from '@/features/interior-new/components/projects/InteriorPhotosView';

export default function InteriorPhotosPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorPhotosView projectId={projectId} />;
}
