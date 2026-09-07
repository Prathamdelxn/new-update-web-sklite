'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { DocumentsTab } from '@/features/projects/documents/components/DocumentsTab';

export default function DocumentsTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <DocumentsTab projectId={projectId} />;
}
