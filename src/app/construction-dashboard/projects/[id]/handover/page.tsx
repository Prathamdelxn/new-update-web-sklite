'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { HandoverTab } from '@/features/projects/handover/components/HandoverTab';

export default function HandoverTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  if (!project) return null;
  return <HandoverTab projectId={projectId} project={project} onUpdate={fetchProject} />;
}
