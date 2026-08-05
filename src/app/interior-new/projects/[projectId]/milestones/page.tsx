'use client';

import { useParams } from 'next/navigation';
import InteriorMilestonesView from '@/features/interior-new/components/projects/InteriorMilestonesView';

export default function Page() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorMilestonesView projectId={projectId} />;
}
