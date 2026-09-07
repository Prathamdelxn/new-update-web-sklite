'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { ProjectDetailsTab } from '@/features/projects/details/components/ProjectDetailsTab';

export default function ProjectDetailsTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <ProjectDetailsTab />;
}
