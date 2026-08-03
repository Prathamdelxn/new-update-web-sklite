'use client';

import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { IssuesTab } from '@/features/projects/issues/components/IssuesTab';

export default function InteriorIssuesTabPage() {
  const { projectId } = useProjectContext();
  return <IssuesTab projectId={projectId} />;
}
