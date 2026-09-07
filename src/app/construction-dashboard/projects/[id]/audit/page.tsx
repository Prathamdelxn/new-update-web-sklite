'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { AuditTab } from '@/features/projects/audit/components/AuditTab';

export default function AuditTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <AuditTab project={project} />;
}
