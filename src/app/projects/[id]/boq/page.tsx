'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { BOQTab } from '@/features/projects/boq/components/BOQTab';

export default function BOQTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <BOQTab projectId={projectId} />;
}
