'use client';

import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { TransactionsTab } from '@/features/projects/transactions/components/TransactionsTab';

export default function InteriorTransactionsTabPage() {
  const { projectId } = useProjectContext();
  return <TransactionsTab projectId={projectId} />;
}
