'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { FFETab } from '@/features/projects/ffe/components/FFETab';

export default function FFEPage() {
  const { project, projectId } = useProjectContext();
  return <FFETab projectId={projectId} project={project} />;
}
