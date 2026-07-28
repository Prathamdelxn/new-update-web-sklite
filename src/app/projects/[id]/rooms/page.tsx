'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { RoomsTab } from '@/features/projects/rooms/components/RoomsTab';

export default function RoomsPage() {
  const { project, projectId } = useProjectContext();
  return <RoomsTab projectId={projectId} project={project} />;
}
