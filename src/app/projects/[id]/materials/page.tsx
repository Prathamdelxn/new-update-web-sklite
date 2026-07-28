'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { MaterialsTab } from '@/features/projects/materials/components/MaterialsTab';

export default function MaterialsTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <MaterialsTab projectId={projectId} />;
}
