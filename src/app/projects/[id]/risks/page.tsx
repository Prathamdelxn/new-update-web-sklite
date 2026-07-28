'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { RisksTab } from '@/features/projects/risks/components/RisksTab';

export default function RisksTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <RisksTab projectId={projectId} />;
}
