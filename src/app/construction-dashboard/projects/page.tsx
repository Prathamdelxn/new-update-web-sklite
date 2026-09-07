'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { SendForSurveyModal } from '@/features/projects/site-survey/components/SendForSurveyModal';
import { SurveyModal } from '@/features/projects/plans/components/SurveyModal';
import {
  Plus, Search, Filter, FolderOpen, RefreshCw, LayoutGrid, List,
  Briefcase, CheckCircle2, Clock, AlertTriangle, ArrowUpRight,
  MapPin, Calendar, Users, Building2, ChevronRight, X, Layers
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api.client';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission } from '@/lib/permissions';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { hasPendingPlans?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'progress'>('date');
  const [isSurveyAssignOpen, setIsSurveyAssignOpen] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [surveyProject, setSurveyProject] = useState<Project | null>(null);
  const toast = useToast();
  const pathname = usePathname();
  const { user } = useAuth();
  const canCreateProject = hasProjectPermission(user, null, 'projects:create');

  const fetchProjects = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);

      const response = await api.get('/projects');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.projects ?? response.data?.data ?? [];
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const handleFocus = () => fetchProjects(true);
    const handleVisibility = () => document.visibilityState === 'visible' && fetchProjects(true);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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

  // Status Counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: projects.length };
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [projects]);

  // Key KPI Metrics
  const kpiStats = useMemo(() => {
    const total = projects.length;
    const ongoing = projects.filter((p) => p.status === 'Ongoing' || p.status === 'Under Snagging').length;
    const planningOrSurvey = projects.filter((p) => p.status === 'Planning' || p.status === 'Site Survey' || p.status === 'Initialized').length;
    const completed = projects.filter((p) => p.status === 'Completed' || p.status === 'Handover Completed').length;
    return { total, ongoing, planningOrSurvey, completed };
  }, [projects]);

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const matchesSearch =
          (project.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (project.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          ((project as any).projectCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (project.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'progress') {
          return ((b as any).progress || 0) - ((a as any).progress || 0);
        }
        // Default: newest date
        const dateA = a.startDate ? new Date(a.startDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.startDate ? new Date(b.startDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  const filterTabs = [
    'All',
    'Ongoing',
    'Planning',
    'Site Survey',
    'Under Snagging',
    'Completed',
    'On Hold',
  ];

  return (
    <div className="space-y-3.5 max-w-[1600px] mx-auto">
      
      {/* ── Top Hero Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Projects <span className="text-indigo-600">Portfolio</span>
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Real-time monitoring, site tracking, and performance analytics across all construction sites.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchProjects(true)}
            disabled={isRefreshing || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all text-xs font-bold shadow-2xs cursor-pointer"
            title="Refresh projects"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isRefreshing || loading) && "animate-spin text-indigo-600")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canCreateProject && (
            <button
              onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Stat Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-300 p-3 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sites</span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">{kpiStats.total}</span>
            <span className="text-[10px] font-semibold text-slate-400">portfolios</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-3 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In Construction</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-150 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-emerald-600 tabular-nums">{kpiStats.ongoing}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">Live</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-3  hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Planning & Survey</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-150 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-indigo-600 tabular-nums">{kpiStats.planningOrSurvey}</span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">Pre-con</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-3  hover:border-teal-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed / Handed</span>
            <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 border border-teal-150 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-teal-600 tabular-nums">{kpiStats.completed}</span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">Delivered</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search, Filters & View Mode ── */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 border border-slate-300 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects, clients, codes or sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Sort & View Mode */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="date">Sort: Newest First</option>
              <option value="name">Sort: Project Name</option>
              <option value="progress">Sort: High Progress</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'grid'
                    ? "bg-white text-indigo-600 border border-slate-300"
                    : "text-slate-400 hover:text-slate-700"
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'list'
                    ? "bg-white text-indigo-600 border border-slate-300"
                    : "text-slate-400 hover:text-slate-700"
                )}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {filterTabs.map((tab) => {
            const count = statusCounts[tab] || 0;
            const isSelected = statusFilter === tab;

            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  "whitespace-nowrap px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-indigo-600 text-white "
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                )}
              >
                <span>{tab}</span>
                {count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums",
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Projects Content ── */}
      <SkeletonLoader loading={loading} preset="card-grid">
        {filteredProjects.length > 0 && !loading ? (
          viewMode === 'grid' ? (
            /* Grid View (4 in a row on desktop) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  onEdit={hasProjectPermission(user, project, 'projects:update') ? (p) => { setEditingProject(p); setIsModalOpen(true); } : undefined}
                  onDelete={hasProjectPermission(user, project, 'projects:delete') ? (p) => setDeletingProject(p) : undefined}
                  onSendForSurvey={hasProjectPermission(user, project, 'sitesurvey:manage') ? (p) => { setSurveyProject(p); setIsSurveyAssignOpen(true); } : undefined}
                  onCompleteSurvey={(p) => { setSurveyProject(p); setIsSurveyModalOpen(true); }}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-5">Project</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4">Start Date</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredProjects.map((project) => {
                      const initial = project.name?.charAt(0)?.toUpperCase() || 'P';
                      const progressVal = (project as any).progress || 15;
                      const catName =
                        (typeof project.category === 'object' && project.category ? (project.category as any).name : null) ||
                        (typeof (project as any).templateCategory === 'object' && (project as any).templateCategory ? (project as any).templateCategory.name : null) ||
                        (typeof (project as any).templateId === 'object' && (project as any).templateId?.category?.name ? (project as any).templateId.category.name : null) ||
                        (typeof (project as any).templateId === 'object' && (project as any).templateId?.name ? (project as any).templateId.name : null) ||
                        (project as any).categoryName ||
                        (project as any).customer?.propertyType ||
                        (typeof project.category === 'string' && (project.category as string).length < 24 && !/^[0-9a-fA-F]{24}$/.test(project.category) ? project.category : null) ||
                        (project as any).projectType ||
                        'General Construction';

                      return (
                        <tr key={project._id} className="hover:bg-indigo-50/30 transition-colors group">
                          {/* Project Name & Code */}
                          <td className="py-3.5 px-5">
                            <Link href={`/construction-dashboard/projects/${project._id}`} className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-slate-300 flex items-center justify-center text-indigo-700 font-extrabold shrink-0 ">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                  {project.name}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400 truncate">
                                  {project.clientName || 'General Client'}
                                </p>
                              </div>
                            </Link>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 bg-indigo-50/90 border border-indigo-200/80 text-indigo-700 px-2 py-0.5 rounded-md text-[10.5px] font-bold tracking-wide">
                              <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{catName}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span>{project.status}</span>
                            </span>
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-4 text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {(project.siteLocation && typeof project.siteLocation === 'object' && project.siteLocation.address?.trim() ? project.siteLocation.address : null) ||
                                  (typeof project.siteLocation === 'string' && (project.siteLocation as string).trim() ? project.siteLocation : null) ||
                                  (project as any).siteAddress ||
                                  (project as any).location ||
                                  (project as any).address ||
                                  (project.description && project.description.trim() ? project.description : null) ||
                                  'Location not specified'}
                              </span>
                            </div>
                          </td>

                          {/* Progress */}
                          <td className="py-3.5 px-4">
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                                <span>{progressVal}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full"
                                  style={{ width: `${progressVal}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Timeline */}
                          <td className="py-3.5 px-4 text-slate-500 font-semibold text-[11px]">
                            {project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>

                          {/* Action Arrow */}
                          <td className="py-3.5 px-5 text-right">
                            <Link
                              href={`/construction-dashboard/projects/${project._id}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 transition-all"
                              title="Open Project"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-dashed border-slate-300 rounded-3xl p-8 ">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 ">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {searchQuery || statusFilter !== 'All' ? 'No matching projects found' : 'No active projects yet'}
            </h3>
            <p className="text-slate-500 text-xs font-semibold max-w-sm mb-6">
              {searchQuery || statusFilter !== 'All'
                ? 'Try adjusting your search query or status filter to locate projects.'
                : 'Initialize your first construction site to track progress, drawings, site surveys, and milestones.'}
            </p>
            {canCreateProject && (
              <button
                onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold border border-slate-300 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create New Project</span>
              </button>
            )}
          </div>
        )}
      </SkeletonLoader>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
        onSuccess={fetchProjects}
        initialData={editingProject || undefined}
        projectId={editingProject?._id}
      />

      <SendForSurveyModal
        isOpen={isSurveyAssignOpen}
        onClose={() => setIsSurveyAssignOpen(false)}
        onSuccess={fetchProjects}
        projectId={surveyProject?._id || ''}
      />

      <SurveyModal
        isOpen={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        onSuccess={fetchProjects}
        projectId={surveyProject?._id || ''}
        project={surveyProject}
        projectType={surveyProject?.projectType}
      />

      <ConfirmModal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}