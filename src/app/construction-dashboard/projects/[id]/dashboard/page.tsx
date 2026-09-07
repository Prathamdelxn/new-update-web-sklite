'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { ProjectDashboardTab } from '@/features/projects/dashboard/components/ProjectDashboardTab';

export default function ProjectDashboardPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <ProjectDashboardTab projectId={projectId} />;
}
