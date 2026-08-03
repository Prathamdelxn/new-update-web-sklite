'use client';

import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { FFETab } from '@/features/projects/ffe/components/FFETab';

export default function InteriorFFEPage() {
  const { project, projectId } = useProjectContext();
  return <FFETab projectId={projectId} project={project} />;
}
