'use client';
import { tr } from '@/i18n';
import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import api from '@/services/api.client';
import { Project } from '@/types';
import { useToast } from '@/providers/ToastContext';
import { useProjectSocket } from '@/hooks/useProjectSocket';
import { useSocket } from '@/providers/SocketContext';

/** Cache keys shared with the projects list (which seeds the preview). */
export const constructionProjectKey = (id: string) => ['construction-project', id] as const;
/** The organisation's project list (Projects page). Invalidate after creating/editing/deleting. */
export const CONSTRUCTION_PROJECTS_KEY = ['construction-projects'] as const;
export const constructionProjectPreviewKey = (id: string) => ['construction-project-preview', id] as const;
export type ProjectPreview = Pick<Project, '_id' | 'name' | 'status'> & { projectType?: string };

/** Loads the project list for CONSTRUCTION_PROJECTS_KEY (Dashboard + Projects share it), and
 *  primes each project's preview so its page shows name/status the moment it's opened. */
export async function fetchConstructionProjects(queryClient: QueryClient): Promise<Project[]> {
  const response = await api.get('/projects');
  const data: Project[] = Array.isArray(response.data)
    ? response.data
    : response.data?.projects ?? response.data?.data ?? [];
  data.forEach((p) => {
    if (p?._id) queryClient.setQueryData<ProjectPreview>(constructionProjectPreviewKey(p._id), {
      _id: p._id, name: p.name, status: p.status, projectType: p.projectType,
    });
  });
  return data;
}

interface ProjectContextType {
  project: Project | null;
  /** Name/status from the projects list, available before the full project loads (header only). */
  preview: ProjectPreview | null;
  loading: boolean;
  // True when the API refused the project (403) — the user lacks projects:view
  accessDenied: boolean;
  fetchProject: () => Promise<void>;
  projectId: string;
}

const ProjectContext = createContext<ProjectContextType>({
  project: null,
  preview: null,
  loading: true,
  accessDenied: false,
  fetchProject: async () => {},
  projectId: '',
});

const statusOf = (err: unknown) => (err as { response?: { status?: number } })?.response?.status;

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const projectId = params.id as string;
  const { joinProject, leaveProject } = useSocket();
  const queryClient = useQueryClient();
  const toast = useToast();

  useProjectSocket(projectId);

  // Cached like the Interior project: re-opening a project shows it instantly and
  // refreshes in the background instead of blanking the page.
  const query = useQuery({
    queryKey: constructionProjectKey(projectId),
    queryFn: async () => (await api.get(`/projects/${projectId}`)).data as Project,
    enabled: Boolean(projectId),
    staleTime: 30 * 1000,
    retry: (count, err) => ![403, 404].includes(statusOf(err) ?? 0) && count < 1,
  });

  const accessDenied = statusOf(query.error) === 403;

  useEffect(() => {
    if (!query.error || accessDenied) return;
    console.error('Error fetching project:', query.error);
    const msg = (query.error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    toast.error(msg || tr("Failed to load project"));
    // toast once per failed fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.errorUpdatedAt]);

  useEffect(() => {
    if (!projectId) return;
    joinProject(projectId);
    return () => leaveProject(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const { refetch } = query;
  // Same contract as before: resolves when the refresh is done, never throws
  const fetchProject = useCallback(async () => { await refetch(); }, [refetch]);

  const preview = queryClient.getQueryData<ProjectPreview>(constructionProjectPreviewKey(projectId)) ?? null;

  return (
    <ProjectContext.Provider
      value={{
        project: query.data ?? null,
        preview,
        loading: query.isLoading,
        accessDenied,
        fetchProject,
        projectId,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
