'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { AttendanceTab } from '@/features/projects/attendance/components/AttendanceTab';

export default function AttendanceTabPage() {
  const { projectId } = useProjectContext();
  return <AttendanceTab projectId={projectId} />;
}
