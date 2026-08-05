'use client';

// Port of src/components/crm/WonProjectsView.tsx, rewired to interiorProjectService
// (interior-os backend's /projects list) instead of sky-lite's own /projects.

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowRight, User } from 'lucide-react';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';

export function InteriorWonProjectsView() {
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await interiorProjectService.getProjects();
      const list = res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];
      setProjects(list);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-[hsl(var(--muted-foreground))] animate-pulse">Loading converted projects...</div>;
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-3xl">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-400 mb-4">
          <Trophy size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] tracking-tight">No Converted Projects Yet</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 max-w-sm">
          Once a quotation is accepted and converted, the project will appear here for the execution team.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <div key={project.id || project._id} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 transition-all group flex flex-col">

          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-[hsl(var(--foreground))] group-hover:text-amber-600 transition-colors text-lg line-clamp-1">{project.name || project.projectName}</h3>
              <span className="text-xs font-mono font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md mt-1 flex items-center gap-1.5 w-fit">
                <User size={12} /> {project.client || project.customer?.name}
              </span>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 shrink-0">
              <Trophy size={20} />
            </div>
          </div>

          <div className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-2xl p-4 mt-auto space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Final Budget</span>
              <span className="text-sm font-black text-[hsl(var(--foreground))]">₹{(project.budget?.amount ?? project.totalBudget)?.toLocaleString('en-IN') || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Status</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-100 text-blue-700">
                {project.status || project.health || 'Active'}
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push(`/interior-new/projects/${project.id || project._id}`)}
            className="w-full mt-4 bg-amber-50 text-amber-700 font-bold text-sm py-3 rounded-xl hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            Open Project Details <ArrowRight size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
