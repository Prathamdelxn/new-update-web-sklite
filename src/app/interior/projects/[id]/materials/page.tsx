'use client';

import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { MaterialsTab } from '@/features/projects/materials/components/MaterialsTab';

export default function InteriorMaterialsTabPage() {
  const { projectId } = useProjectContext();
  return <MaterialsTab projectId={projectId} />;
}
