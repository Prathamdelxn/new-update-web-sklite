'use client';

import { useParams } from 'next/navigation';
import InteriorTasksView from '@/features/interior-new/components/projects/InteriorTasksView';

export default function TasksPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  if (!projectId) return null;

  return <InteriorTasksView projectId={projectId} />;
}
