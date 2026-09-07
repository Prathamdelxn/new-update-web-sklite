'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { TransactionsTab } from '@/features/projects/transactions/components/TransactionsTab';

export default function TransactionsTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <TransactionsTab projectId={projectId} />;
}
