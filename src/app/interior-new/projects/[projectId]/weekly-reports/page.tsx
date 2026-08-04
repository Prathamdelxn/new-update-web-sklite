'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorWeeklyReportsView from '@/features/interior-new/components/projects/InteriorWeeklyReportsView';

export default function InteriorWeeklyReportsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorWeeklyReportsView projectId={projectId} />;
}
