'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { DPRTab } from '@/features/projects/progress/components/DPRTab';

export default function DPRTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <DPRTab projectId={projectId} />;
}
