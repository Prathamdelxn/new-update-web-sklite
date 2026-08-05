'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorVendorsView from '@/features/interior-new/components/projects/InteriorVendorsView';

export default function InteriorVendorsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorVendorsView projectId={projectId} />;
}
