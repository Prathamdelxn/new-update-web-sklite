'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteriorPurchaseOrdersView from '@/features/interior-new/components/projects/InteriorPurchaseOrdersView';

export default function InteriorPurchaseOrdersPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorPurchaseOrdersView projectId={projectId} />;
}
