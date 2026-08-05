'use client';

import { useParams } from 'next/navigation';
import InteriorDprView from '@/features/interior-new/components/projects/InteriorDprView';

export default function Page() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorDprView projectId={projectId} />;
}
