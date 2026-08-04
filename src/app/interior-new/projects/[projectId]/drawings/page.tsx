'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorDrawingsView from '@/features/interior-new/components/projects/InteriorDrawingsView';

export default function InteriorDrawingsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorDrawingsView projectId={projectId} />;
}
