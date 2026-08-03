'use client';

import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { MilestonesTab } from '@/features/projects/milestones/components/MilestonesTab';

export default function InteriorMilestonesTabPage() {
  const { projectId } = useProjectContext();
  return <MilestonesTab projectId={projectId} />;
}
