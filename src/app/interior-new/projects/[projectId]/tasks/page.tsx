'use client';

import { useParams } from 'next/navigation';
import InteriorTasksView from '@/features/interior-new/components/projects/InteriorTasksView';

export default function Page() {
  const params = useParams();
  const projectId = params?.projectId as string;
  return <InteriorTasksView projectId={projectId} />;
}
