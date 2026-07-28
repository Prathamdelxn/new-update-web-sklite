'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { ChatTab } from '@/features/projects/chat/components/ChatTab';

export default function ChatTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <ChatTab projectId={projectId} />;
}
