'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorProjectOverviewView from '@/features/interior-new/components/projects/InteriorProjectOverviewView';

export default function InteriorProjectOverviewPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorProjectOverviewView projectId={projectId} />;
}
