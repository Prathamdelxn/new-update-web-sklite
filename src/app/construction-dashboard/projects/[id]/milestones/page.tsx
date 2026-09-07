'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { MilestonesTab } from '@/features/projects/milestones/components/MilestonesTab';

export default function MilestonesTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <MilestonesTab projectId={projectId} />;
}
