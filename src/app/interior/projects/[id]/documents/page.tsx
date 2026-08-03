'use client';

import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { DocumentsTab } from '@/features/projects/documents/components/DocumentsTab';

export default function InteriorDocumentsTabPage() {
  const { projectId } = useProjectContext();
  return <DocumentsTab projectId={projectId} />;
}
