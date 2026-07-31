'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shell } from '@/components/layouts/Shell';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { Project } from '@/types';
import { cn } from '@/lib/utils';

import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  FolderOpen,
  ArrowRight,
  FolderKanban,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  Layers,
  Palette
} from 'lucide-react';

export default function InteriorProjectsPage() {
  const toast = useToast();
  const pathname = usePathname();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.projects ?? response.data?.data ?? [];
      setProjects(data);
    } catch (error) {
      console.error('Error fetching interior projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [pathname]);

  const handleDelete = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await api.delete(`/projects/${deletingProject._id}`);
      toast.success(`"${deletingProject.name}" deleted`);
      setDeletingProject(null);
      fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['All', 'Initialized', 'Planning', 'Site Survey', 'Ongoing', 'Completed', 'On Hold'];

  return (
    <Shell>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        {/* Executive Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5">
              <span>Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 font-bold">Projects</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Interior Projects
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Manage active interior fit-out projects, client handovers, moodboards, and schedules.
            </p>
          </div>

          <button
            onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Create Interior Project
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 border border-slate-200/80 rounded-2xl shadow-2xs">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium outline-none focus:border-blue-600 transition"
              >
                {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition",
                  viewMode === 'grid' ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-700"
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg transition",
                  viewMode === 'list' ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-700"
                )}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <SkeletonLoader loading={loading} preset="card-grid">
          {filteredProjects.length > 0 && !loading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onEdit={(p) => { setEditingProject(p); setIsModalOpen(true); }}
                    onDelete={(p) => setDeletingProject(p)}
                  />
                ))}
              </div>
            ) : (
              /* List Table View */
              <GlassCard className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Project Name</th>
                        <th className="py-3.5 px-4">Client</th>
                        <th className="py-3.5 px-4">Timeline</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredProjects.map((project) => {
                        const startStr = project.startDate
                          ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'TBD';
                        const endStr = project.endDate
                          ? new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'TBD';

                        return (
                          <tr key={project._id} className="hover:bg-slate-50/70 transition">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">
                                  <FolderKanban className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <Link href={`/projects/${project._id}`} className="font-bold text-slate-900 hover:text-blue-600 transition truncate block">
                                    {project.name}
                                  </Link>
                                  <p className="text-[11px] text-slate-400 truncate">{project.description || 'Interior Fit-out Project'}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 font-semibold text-slate-700">
                              {project.clientName || '—'}
                            </td>

                            <td className="py-4 px-4 text-slate-500 text-[11px]">
                              {startStr} → {endStr}
                            </td>

                            <td className="py-4 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold">
                                {project.status || 'Ongoing'}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`/projects/${project._id}`}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                                >
                                  Open <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => { setEditingProject(project); setIsModalOpen(true); }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                  title="Edit Project"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingProject(project)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                  title="Delete Project"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-200/80 rounded-3xl shadow-2xs p-6">
              <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 mb-4">
                <FolderOpen className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No interior projects found</h3>
              <p className="text-slate-500 text-xs max-w-xs mb-6">
                {searchQuery || statusFilter !== 'All'
                  ? "No interior projects matched your filter criteria."
                  : "Start a new interior fit-out project to manage moodboards, timelines, and sign-offs."}
              </p>
              {!searchQuery && statusFilter === 'All' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Create First Interior Project
                </button>
              )}
            </div>
          )}
        </SkeletonLoader>

        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
          onSuccess={fetchProjects}
          initialData={editingProject || undefined}
          projectId={editingProject?._id}
        />

        <ConfirmModal
          isOpen={!!deletingProject}
          onClose={() => setDeletingProject(null)}
          onConfirm={handleDelete}
          title="Delete Interior Project"
          message={`Are you sure you want to delete "${deletingProject?.name}"? This will permanently remove the project.`}
          confirmText="Delete"
          type="danger"
          isLoading={isDeleting}
        />
      </div>
    </Shell>
  );
}
