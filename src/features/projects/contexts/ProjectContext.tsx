'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/services/api.client';
import { Project } from '@/types';
import { useToast } from '@/providers/ToastContext';
import { useProjectSocket } from '@/hooks/useProjectSocket';
import { useSocket } from '@/providers/SocketContext';

interface ProjectContextType {
  project: Project | null;
  loading: boolean;
  fetchProject: () => Promise<void>;
  projectId: string;
}

const ProjectContext = createContext<ProjectContextType>({
  project: null,
  loading: true,
  fetchProject: async () => {},
  projectId: '',
});

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const params = useParams();
  const projectId = params.id as string;
  const { joinProject, leaveProject } = useSocket();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useProjectSocket(projectId);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (err: any) {
      console.error('Error fetching project:', err);
      toast.error(err?.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      joinProject(projectId);
      return () => leaveProject(projectId);
    }
  }, [projectId]);

  return (
    <ProjectContext.Provider value={{ project, loading, fetchProject, projectId }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);
