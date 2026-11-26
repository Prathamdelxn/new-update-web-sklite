'use client';
import { tr } from '@/i18n';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { SendForSurveyModal } from '@/features/projects/site-survey/components/SendForSurveyModal';
import { SurveyModal } from '@/features/projects/plans/components/SurveyModal';
import {
  Plus, Search, Filter, FolderOpen, RefreshCw, LayoutGrid, List,
  Briefcase, CheckCircle2, Clock, AlertTriangle, ArrowUpRight,
  MapPin, Calendar, Users, Building2, ChevronRight, X, Layers, ShieldAlert,
  ChevronDown, Check
} from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api.client';
import { Project } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CONSTRUCTION_PROJECTS_KEY, fetchConstructionProjects } from '@/features/projects/contexts/ProjectContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission, canCreateProjects, canViewAnyProject } from '@/lib/permissions';

type ProjectRow = Project & { hasPendingPlans?: boolean };
const NO_PROJECTS: ProjectRow[] = [];

export default function ProjectsPage() {
  const [manualRefresh, setManualRefresh] = useState(false);
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canCreateProject = canCreateProjects(user);
  // No Project Management > View on any role: the list is empty for that
  // reason, so tell the user what to ask their admin for.
  const lacksProjectView = !canViewAnyProject(user);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  // Cached list: coming back to Projects shows the cards instantly and refreshes in the
  // background (was a full skeleton + wait on every visit, and two refetches on tab focus).
  const projectsQuery = useQuery({
    queryKey: CONSTRUCTION_PROJECTS_KEY,
    queryFn: () => fetchConstructionProjects(queryClient) as Promise<ProjectRow[]>,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
  const projects = projectsQuery.data ?? NO_PROJECTS;
  const loading = projectsQuery.isPending;
  const isRefreshing = manualRefresh && projectsQuery.isFetching;

  useEffect(() => {
    if (!projectsQuery.error) return;
    console.error('Error fetching projects:', projectsQuery.error);
    toast.error(tr("Failed to load projects"));
    // toast once per failed fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsQuery.errorUpdatedAt]);

  /** Refresh the list (spinner on the Refresh button only when asked for). */
  const fetchProjects = async (showRefresh?: unknown) => {
    if (showRefresh === true) setManualRefresh(true);
    try {
      await projectsQuery.refetch();
    } finally {
      setManualRefresh(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await api.delete(`/projects/${deletingProject._id}`);
      toast.success(tr("\"{{name}}\" deleted", { name: deletingProject.name }));
      setDeletingProject(null);
      fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || tr("Failed to delete project"));
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
    <div className="space-y-3.5 w-full">
      
      {/* ── Top Hero Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {tr("Projects Management")}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {tr("Real-time monitoring, site tracking, and performance analytics across all construction sites.")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchProjects(true)}
            disabled={isRefreshing || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all text-xs font-bold shadow-2xs cursor-pointer"
            title={tr("Refresh projects")}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isRefreshing || loading) && "animate-spin text-blue-600")} />
            <span className="hidden sm:inline">{tr("Refresh")}</span>
          </button>

          {canCreateProject && (
            <button
              onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{tr("Create Project")}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Stat Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-300 p-3 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{tr("Total Sites")}</span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tabular-nums">{kpiStats.total}</span>
            <span className="text-[10px] font-semibold text-slate-400">{tr("portfolios")}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-3 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{tr("In Construction")}</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-150 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-600 tabular-nums">{tr(kpiStats.ongoing)}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">{tr("Live")}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-3  hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{tr("Planning & Survey")}</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-blue-600 tabular-nums">{tr(kpiStats.planningOrSurvey)}</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">{tr("Pre-con")}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-300 p-3  hover:border-teal-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{tr("Completed / Handed")}</span>
            <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 border border-teal-150 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-teal-600 tabular-nums">{tr(kpiStats.completed)}</span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">{tr("Delivered")}</span>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search, Filters & View Mode ── */}
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={tr("Search projects, clients, codes or sites...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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

          {/* Controls: Filter Button, Sort & View Mode */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            {/* Status Filter Dropdown */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  statusFilter !== 'All'
                    ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                    : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                )}
              >
                <Filter className={cn("w-3.5 h-3.5", statusFilter !== 'All' ? "text-blue-600" : "text-slate-500")} />
                <span>{statusFilter === 'All' ? tr("Filter Status") : statusFilter}</span>
                {statusFilter !== 'All' && statusCounts[statusFilter] !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-200/80 text-blue-800 tabular-nums">
                    {tr(statusCounts[statusFilter])}
                  </span>
                )}
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-slate-400", isFilterOpen && "rotate-180")} />
              </button>

              {isFilterOpen && (
                <div className="absolute end-0 sm:right-auto sm:start-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-30">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {tr("Filter by Status")}
                    </span>
                    {statusFilter !== 'All' && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('All');
                          setIsFilterOpen(false);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        {tr("Reset")}
                      </button>
                    )}
                  </div>
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {filterTabs.map((tab) => {
                      const count = statusCounts[tab] || 0;
                      const isSelected = statusFilter === tab;

                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setStatusFilter(tab);
                            setIsFilterOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-xs font-medium flex items-center justify-between text-start hover:bg-slate-50 transition-colors cursor-pointer",
                            isSelected && "bg-blue-50/70 text-blue-700 font-bold"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className={cn(isSelected ? "text-blue-900 font-semibold" : "text-slate-700")}>
                              {tr(tab)}
                            </span>
                          </div>
                          {count > 0 && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums",
                              isSelected ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                            )}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="date">{tr("Sort: Newest First")}</option>
              <option value="name">{tr("Sort: Project Name")}</option>
              <option value="progress">{tr("Sort: High Progress")}</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'grid'
                    ? "bg-white text-blue-600 border border-slate-300"
                    : "text-slate-400 hover:text-slate-700"
                )}
                title={tr("Grid view")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1 rounded-md text-xs font-bold transition-all cursor-pointer",
                  viewMode === 'list'
                    ? "bg-white text-blue-600 border border-slate-300"
                    : "text-slate-400 hover:text-slate-700"
                )}
                title={tr("List view")}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Projects Content ── */}
      <SkeletonLoader loading={loading} preset="card-grid">
        {filteredProjects.length > 0 && !loading ? (
          viewMode === 'grid' ? (
            /* Grid View (4 in a row on desktop) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  onEdit={hasProjectPermission(user, project, 'projects:update') ? (p) => { setEditingProject(p); setIsModalOpen(true); } : undefined}
                  onDelete={hasProjectPermission(user, project, 'projects:delete') ? (p) => setDeletingProject(p) : undefined}
                  onSendForSurvey={hasProjectPermission(user, project, 'sitesurvey:assign') ? (p) => { setSurveyProject(p); setIsSurveyAssignOpen(true); } : undefined}
                  onCompleteSurvey={hasProjectPermission(user, project, 'sitesurvey:create') || hasProjectPermission(user, project, 'sitesurvey:update') ? (p) => { setSurveyProject(p); setIsSurveyModalOpen(true); } : undefined}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-5">{tr("Project")}</th>
                      <th className="py-3 px-4">{tr("Category")}</th>
                      <th className="py-3 px-4">{tr("Status")}</th>
                      <th className="py-3 px-4">{tr("Location")}</th>
                      <th className="py-3 px-4">{tr("Progress")}</th>
                      <th className="py-3 px-4">{tr("Start Date")}</th>
                      <th className="py-3 px-5 text-end">{tr("Actions")}</th>
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
                        <tr key={project._id} className="hover:bg-blue-50/30 transition-colors group">
                          {/* Project Name & Code */}
                          <td className="py-3.5 px-5">
                            <Link href={`/construction-dashboard/projects/${project._id}`} className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-slate-300 flex items-center justify-center text-indigo-700 font-bold shrink-0 ">
                                {tr(initial)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                  {tr(project.name)}
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400 truncate">
                                  {project.clientName || tr("General Client")}
                                </p>
                              </div>
                            </Link>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 bg-indigo-50/90 border border-indigo-200/80 text-indigo-700 px-2 py-0.5 rounded-md text-[10.5px] font-bold tracking-wide">
                              <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{tr(catName)}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span>{tr(project.status)}</span>
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
                                  tr("Location not specified")}
                              </span>
                            </div>
                          </td>

                          {/* Progress */}
                          <td className="py-3.5 px-4">
                            <div className="w-32 space-y-1">
                              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                                <span>{tr(progressVal)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
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
                          <td className="py-3.5 px-5 text-end">
                            <Link
                              href={`/construction-dashboard/projects/${project._id}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-all"
                              title={tr("Open Project")}
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
        ) : lacksProjectView && projects.length === 0 ? (
          /* No project access — explain which permission is missing */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-dashed border-amber-300 rounded-2xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{tr("You don't have access to projects")}</h3>
            <p className="text-slate-500 text-xs font-semibold max-w-md">
              {tr("Your role doesn't include ")}<span className="text-slate-700">{tr("Project Management → View")}</span>{tr(", so no projects are shown. Your other permissions (like Site Survey) only work inside a project you can view.")}
            </p>
            <p className="text-slate-500 text-xs font-semibold max-w-md mt-2">
              {tr("Ask your admin to enable ")}<span className="text-slate-700">{tr("Project Management → View")}</span>{tr(" on your role.")}
            </p>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-dashed border-slate-300 rounded-2xl p-8 ">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 ">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {searchQuery || statusFilter !== 'All' ? tr("No matching projects found") : tr("No active projects yet")}
            </h3>
            <p className="text-slate-500 text-xs font-semibold max-w-sm mb-6">
              {searchQuery || statusFilter !== 'All'
                ? tr("Try adjusting your search query or status filter to locate projects.")
                : tr("Initialize your first construction site to track progress, drawings, site surveys, and milestones.")}
            </p>
            
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
        title={tr("Delete Project")}
        message={`Are you sure you want to delete "${deletingProject?.name}"? This cannot be undone and will remove all associated data.`}
        confirmText={tr("Delete")}
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}