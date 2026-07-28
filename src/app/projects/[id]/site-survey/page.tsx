'use client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { SurveyTab } from '@/features/projects/plans/components/SurveyTab';

export default function SurveyTabPage() {
  const { project, projectId, fetchProject } = useProjectContext();
  return <SurveyTab projectId={projectId} siteSurveyorId={typeof project?.siteSurveyor === "string" ? project.siteSurveyor : (project?.siteSurveyor as any)?._id} projectStatus={project?.status as any} projectType={project?.projectType} />;
}
