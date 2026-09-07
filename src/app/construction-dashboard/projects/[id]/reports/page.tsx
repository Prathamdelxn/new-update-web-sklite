'use client';

import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { ReportsTab } from '@/features/projects/reports/components/ReportsTab';

export default function ReportsTabPage() {
  const { projectId } = useProjectContext();
  return <ReportsTab projectId={projectId} />;
}
