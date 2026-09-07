'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { PlansTab } from '@/features/projects/plans/components/PlansTab';

export default function PlansTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <PlansTab projectId={projectId} />;
}
