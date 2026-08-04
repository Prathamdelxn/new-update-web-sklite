'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorSnagsView from '@/features/interior-new/components/projects/InteriorSnagsView';

export default function InteriorSnagsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorSnagsView projectId={projectId} />;
}
