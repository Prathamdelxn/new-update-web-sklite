'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { BudgetTab } from '@/features/projects/budget/components/BudgetTab';

export default function BudgetTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  if (!project) return null;
  return <BudgetTab project={project} onUpdate={fetchProject} />;
}
