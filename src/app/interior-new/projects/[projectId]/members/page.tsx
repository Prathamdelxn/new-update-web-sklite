'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorMembersView from '@/features/interior-new/components/projects/InteriorMembersView';

export default function InteriorMembersPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorMembersView projectId={projectId} />;
}
