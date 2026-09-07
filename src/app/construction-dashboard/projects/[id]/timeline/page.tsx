'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { TimelineTab } from '@/features/projects/timeline/components/TimelineTab';

export default function TimelineTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <TimelineTab projectId={projectId} />;
}
