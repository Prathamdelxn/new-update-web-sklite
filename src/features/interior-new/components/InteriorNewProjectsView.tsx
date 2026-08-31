'use client';

// =============================================================================
// Sky-Lite Web — Interior-New Projects Dashboard & Cards (Senior Developer UI/UX)
// High-performance, executive fit-out project management view with KPI ribbon,
// smart filtering/sorting, glassmorphic cards, and seamless transitions.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  Users,
  ArrowUpRight,
  TrendingUp,
  Clock,
  AlertTriangle,
  X,
  Loader2,
  Pencil,
  Trash2,
  Wallet,
  Building2,
  Sparkles,
  Layers,
  Activity,
  EyeClosed,
  EyeIcon,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/interior/ui';
import { cn } from '@/lib/utils';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';

const healthConfig = {
  'on-track': {
    label: 'On Track',
    color: 'bg-emerald-500',
    barGradient: 'from-emerald-500 to-teal-400',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
    glowColor: 'shadow-emerald-500/10',
    dotColor: 'bg-emerald-500',
  },
  'at-risk': {
    label: 'At Risk',
    color: 'bg-amber-500',
    barGradient: 'from-amber-500 to-orange-400',
    textColor: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
    glowColor: 'shadow-amber-500/10',
    dotColor: 'bg-amber-500',
  },
  delayed: {
    label: 'Delayed',
    color: 'bg-rose-500',
    barGradient: 'from-rose-500 to-pink-500',
    textColor: 'text-rose-700 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-200 dark:border-rose-800/50',
    glowColor: 'shadow-rose-500/10',
    dotColor: 'bg-rose-500',
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-500',
    barGradient: 'from-blue-500 to-indigo-500',
    textColor: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800/50',
    glowColor: 'shadow-blue-500/10',
    dotColor: 'bg-blue-500',
  },
};

const emptyFormData = {
  name: '',
  client: '',
  type: 'Commercial Office',
  startDate: '',
  endDate: '',
  budgetAmount: '',
  description: '',
  city: '',
  address: '',
  templateId: '',
};

type SortOption = 'newest' | 'budget-high' | 'budget-low' | 'progress-high' | 'progress-low' | 'name';
type FilterStatus = 'all' | 'on-track' | 'at-risk' | 'delayed' | 'completed';

export default function InteriorNewProjectsView() {
  const toast = useToast();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProjectId(null);
    setFormData(emptyFormData);
  };

  const loadProjects = useCallback(async () => {
    try {
      const res = await interiorApiClient.get('/projects');
      setProjects(res.data?.success && res.data?.data ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load interior-os projects', err);
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadProjects(),
      interiorApiClient
        .get('/templates')
        .then((res) => setTemplates(res.data?.success && res.data?.data?.templates ? res.data.data.templates : []))
        .catch(() => setTemplates([])),
    ]).finally(() => setLoading(false));
  }, [loadProjects]);

  const handleEditProject = (project: any) => {
    setEditingProjectId(project.id || project._id);
    setFormData({
      name: project.name || '',
      client: project.client || '',
      type: project.type || 'Commercial Office',
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      budgetAmount: (project.budget?.amount ?? project.budget ?? project.totalBudget ?? '').toString(),
      city: project.location?.city || '',
      address: project.location?.address || '',
      description: project.description || '',
      templateId: project.templateId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteProject = (project: any) => {
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      setDeleteLoading(true);
      const id = projectToDelete.id || projectToDelete._id;
      await interiorApiClient.delete(`/projects/${id}`);
      toast.success('Project deleted successfully');
      setProjectToDelete(null);
      await loadProjects();
    } catch (err) {
      console.error('Failed to delete project', err);
      toast.error('Failed to delete project');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      const budgetNum = parseFloat(formData.budgetAmount) || 0;
      const payload = {
        name: formData.name,
        client: formData.client,
        type: formData.type,
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        budget: { amount: budgetNum, currency: 'INR' },
        totalBudget: budgetNum,
        location: { city: formData.city, address: formData.address },
        description: formData.description,
        templateId: formData.templateId || undefined,
      };

      if (editingProjectId) {
        await interiorApiClient.put(`/projects/${editingProjectId}`, payload);
        toast.success('Project updated successfully!');
      } else {
        await interiorApiClient.post('/projects', payload);
        toast.success('Project created successfully!');
      }
      handleCloseDialog();
      await loadProjects();
    } catch (err) {
      console.error('Failed to save project', err);
      toast.error('Failed to save project');
    } finally {
      setCreateLoading(false);
    }
  };

  // Safe Budget Value Extractor
  const getProjectBudget = useCallback((project: any): number => {
    if (!project) return 0;
    if (typeof project.budget === 'number') return project.budget;
    if (typeof project.budget?.amount === 'number') return project.budget.amount;
    if (typeof project.totalBudget === 'number') return project.totalBudget;
    const parsed = Number(project.budget?.amount || project.budget || project.totalBudget || 0);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  const formatBudget = useCallback((amount: any) => {
    const num = typeof amount === 'number' ? amount : Number(amount) || 0;
    if (!num || num <= 0) return '₹ 0';
    if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} Lakh`;
    return `₹ ${num.toLocaleString('en-IN')}`;
  }, []);

  // Format date helper
  const formatDate = (dateVal: any) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p: any) => {
        // Search filter
        const matchSearch =
          !search ||
          p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.client?.toLowerCase().includes(search.toLowerCase()) ||
          p.code?.toLowerCase().includes(search.toLowerCase()) ||
          p.location?.city?.toLowerCase().includes(search.toLowerCase());

        // Status filter
        let matchStatus = true;
        if (statusFilter === 'on-track') matchStatus = p.health === 'on-track' || (!p.health && p.status === 'active');
        else if (statusFilter === 'at-risk') matchStatus = p.health === 'at-risk';
        else if (statusFilter === 'delayed') matchStatus = p.health === 'delayed';
        else if (statusFilter === 'completed') matchStatus = p.status === 'completed' || p.progress === 100;

        // Type filter
        const matchType = typeFilter === 'all' || p.type === typeFilter;

        return matchSearch && matchStatus && matchType;
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || b.startDate || 0).getTime() - new Date(a.createdAt || a.startDate || 0).getTime();
        }
        if (sortBy === 'budget-high') {
          return getProjectBudget(b) - getProjectBudget(a);
        }
        if (sortBy === 'budget-low') {
          return getProjectBudget(a) - getProjectBudget(b);
        }
        if (sortBy === 'progress-high') {
          return (b.progress || 0) - (a.progress || 0);
        }
        if (sortBy === 'progress-low') {
          return (a.progress || 0) - (b.progress || 0);
        }
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
  }, [projects, search, statusFilter, typeFilter, sortBy, getProjectBudget]);

  // Executive KPI Metrics
  const stats = useMemo(() => {
    const total = projects.length;
    const totalPipelineValue = projects.reduce((sum, p) => sum + getProjectBudget(p), 0);
    const onTrackCount = projects.filter((p) => p.health === 'on-track' || (!p.health && p.status === 'active')).length;
    const atRiskCount = projects.filter((p) => p.health === 'at-risk' || p.health === 'delayed').length;
    const completedCount = projects.filter((p) => p.status === 'completed' || p.progress === 100).length;
    const avgProgress = total > 0 ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / total) : 0;
    const totalSnags = projects.reduce((sum, p) => sum + (p.openSnags || 0), 0);

    return {
      total,
      totalPipelineValue,
      onTrackCount,
      atRiskCount,
      completedCount,
      avgProgress,
      totalSnags,
      healthRatio: total > 0 ? Math.round((onTrackCount / total) * 100) : 100,
    };
  }, [projects, getProjectBudget]);

  const openProject = (project: any) => {
    const id = project.id || project._id;
    if (!id) {
      toast.error('This project has no valid identifier.');
      return;
    }
    router.push(`/interior-new/projects/${id}`);
  };

  const projectTypes = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.type) set.add(p.type);
    });
    return Array.from(set);
  }, [projects]);

  if (loading) {
    return (
      <div className="interior-os-theme flex flex-col items-center justify-center min-h-[65vh] gap-3">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))] animate-spin" />
          <Building2 className="w-5 h-5 text-[hsl(var(--primary))] absolute animate-pulse" />
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-[hsl(var(--muted-foreground))]">Loading Project Portfolio...</p>
      </div>
    );
  }

  return (
    <div className="interior-os-theme min-h-screen py-3.5 sm:p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      
      {/* ── 1. Page Header & Primary Action ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[hsl(var(--border)/0.6)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] flex items-center justify-center text-white shadow-md shadow-[hsl(var(--primary)/0.25)]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
                  Projects Portfolio
                </h1>
                <span className="px-2 py-0.5 text-xs font-bold font-mono rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                  {projects.length} Total
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                Executive overview, tracking progress, commercial budgets, and fit-out delivery schedules.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            onClick={() => {
              handleCloseDialog();
              setIsDialogOpen(true);
            }}
            className="shadow-lg shadow-[hsl(var(--primary)/0.2)] hover:shadow-xl hover:shadow-[hsl(var(--primary)/0.3)] transition-all font-semibold gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Project
          </Button>
        </div>
      </div>

      {/* ── 2. Controls & Filter Bar ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[hsl(var(--card))] border border-gray-300 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Status Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Projects', count: projects.length },
              { id: 'on-track', label: 'On Track', count: stats.onTrackCount },
              { id: 'at-risk', label: 'At Risk', count: stats.atRiskCount },
              { id: 'completed', label: 'Completed', count: stats.completedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as FilterStatus)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border',
                  statusFilter === tab.id
                    ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm shadow-[hsl(var(--primary)/0.3)]'
                    : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border-gray-300 hover:border-[hsl(var(--border)/0.8)]'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold',
                    statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Switcher & Actions */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl border border-gray-300 bg-[hsl(var(--muted)/0.5)]">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  viewMode === 'grid'
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-xs font-bold'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  viewMode === 'list'
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-xs font-bold'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Line: Search + Sort Dropdown + Type Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-[hsl(var(--border)/0.5)]">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search by project name, code, client, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1.5 focus:ring-[hsl(var(--primary))]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Project Type Filter */}
          {projectTypes.length > 0 && (
            <div className="relative sm:w-44">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1.5 focus:ring-[hsl(var(--primary))]"
              >
                <option value="all">All Types</option>
                {projectTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort By Dropdown */}
          <div className="relative sm:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1.5 focus:ring-[hsl(var(--primary))]"
            >
              <option value="newest">Sort: Recently Added</option>
              <option value="budget-high">Sort: Budget (High → Low)</option>
              <option value="budget-low">Sort: Budget (Low → High)</option>
              <option value="progress-high">Sort: Progress (High → Low)</option>
              <option value="progress-low">Sort: Progress (Low → High)</option>
              <option value="name">Sort: Project Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. Main Projects Display (Grid vs List) ── */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 sm:p-16 border border-dashed border-[hsl(var(--border))] rounded-3xl bg-[hsl(var(--card))] max-w-xl mx-auto text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No Projects Found</h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] max-w-sm mt-1">
              {search || statusFilter !== 'all'
                ? 'No projects match your active search or filter criteria. Try resetting filters.'
                : 'Create your first interior fit-out project to begin tracking milestones and budgets.'}
            </p>
          </div>
          {search || statusFilter !== 'all' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              onClick={() => {
                handleCloseDialog();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── GRID CARDS VIEW ── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4"
        >
          {filteredProjects.map((project: any, i: number) => {
            const healthType = project.status === 'completed' || project.progress === 100
              ? 'completed'
              : (project.health || 'on-track');
            const health = (healthConfig as any)[healthType] || healthConfig['on-track'];
            const budgetVal = getProjectBudget(project);
            const progressVal = Math.round(project.progress || 0);
            const openSnags = project.openSnags || 0;
            const openRFIs = project.openRFIs || 0;
            const city = project.location?.city || project.location?.address;

            return (
              <motion.div
                key={project.id || project._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                onClick={() => openProject(project)}
                className="cursor-pointer group h-full"
              >
                <div className="h-full flex flex-col justify-between rounded-2xl bg-[hsl(var(--card))] border border-gray-300 hover:border-[hsl(var(--primary)/0.45)] shadow-sm hover:shadow-xl hover:shadow-[hsl(var(--primary)/0.08)] transition-all duration-300 overflow-hidden relative">
                  
                  {/* Top Ambient Glow Line */}
        

                  <div className="p-4 sm:p-5.5 flex-1 flex flex-col justify-between space-y-4">
                    
                    {/* 1. Header Row: Icon + Code/Type + Health Badge + Actions */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.2)] flex items-center justify-center shrink-0 text-[hsl(var(--primary))] shadow-xs group-hover:scale-105 transition-transform">
                            <Building2 className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]">
                                {project.code || 'PRJ'}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.15)] truncate max-w-[140px]">
                                {project.type || 'Commercial Office'}
                              </span>
                            </div>

                            <h3 className="text-base sm:text-md font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-1 leading-snug tracking-tight">
                              {project.name}
                            </h3>
                          </div>
                        </div>

                        {/* Health Badge & Quick Action Menu */}
                       
                      </div>

                      {/* Client and City Meta */}
                      <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] mt-2 flex-wrap">
                       
                        {city && (
                          <>
                           
                            <span className="flex items-center gap-1 truncate max-w-[150px]">
                              <MapPin className="w-3 h-3 text-rose-500/80 shrink-0" />
                              {city}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 2. Structured Middle Showcase Panel: Budget & Execution Progress */}
                    <div className="rounded-xl bg-[hsl(var(--muted)/0.65)] border border-[hsl(var(--border)/0.9)] p-3.5 space-y-3">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                            Contract Budget
                          </span>
                          <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                            {formatBudget(budgetVal)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                            Progress
                          </span>
                          <span className="text-base font-black font-mono text-[hsl(var(--foreground))] leading-tight">
                            {progressVal}%
                          </span>
                        </div>
                      </div>

                      {/* Smooth Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden p-0.5 border border-[hsl(var(--border)/0.5)]">
                        <motion.div
                          className={cn('h-full rounded-full bg-gradient-to-r', health.barGradient)}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(progressVal, 2)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>

                      {/* Timeline Dates */}
                      <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))] pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[hsl(var(--primary))]" />
                          <span>Start: {formatDate(project.startDate || project.createdAt)}</span>
                        </span>
                        {project.endDate && (
                          <span className="text-right">
                            Target: {formatDate(project.endDate)}
                          </span>
                        )}
                      </div>
                    </div>

                 
                  </div>

                  {/* 4. Card Bottom Action Bar */}
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] group-hover:bg-[hsl(var(--primary)/0.04)] transition-colors">
                   

                    <span className="text-xs font-bold text-[hsl(var(--primary))] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <div className='bg-blue-600 p-2 rounded-lg text-white'>View Project </div> 
                    </span>
                     <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors flex items-center gap-1.5">
                       <button
                              title="Edit Project"
                              className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProject(project);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Delete Project"
                              className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* ── TABLE LIST VIEW ── */
        <Card className="overflow-hidden border border-[hsl(var(--border))] rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Project & Code</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Health Status</th>
                  <th className="py-3.5 px-4">Progress</th>
                  <th className="py-3.5 px-4">Contract Budget</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Team</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredProjects.map((project: any) => {
                  const healthType = project.status === 'completed' || project.progress === 100
                    ? 'completed'
                    : (project.health || 'on-track');
                  const health = (healthConfig as any)[healthType] || healthConfig['on-track'];
                  const budgetVal = getProjectBudget(project);
                  const progressVal = Math.round(project.progress || 0);

                  return (
                    <tr
                      key={project.id || project._id}
                      onClick={() => openProject(project)}
                      className="hover:bg-[hsl(var(--muted)/0.4)] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0 font-bold font-mono text-xs">
                            {project.code?.slice(-3) || 'PRJ'}
                          </div>
                          <div>
                            <p className="font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-1">
                              {project.name}
                            </p>
                            <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                              {project.code} • {project.type || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[hsl(var(--foreground)/0.9)]">
                        {project.client || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 text-[10px] font-bold rounded-full border inline-flex items-center gap-1.5',
                            health.bgColor,
                            health.textColor,
                            health.borderColor
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', health.dotColor)} />
                          {health.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 max-w-[120px]">
                          <div className="flex-1 h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full bg-gradient-to-r', health.barGradient)}
                              style={{ width: `${progressVal}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-[hsl(var(--foreground))]">
                            {progressVal}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBudget(budgetVal)}
                      </td>
                      <td className="py-3.5 px-4 text-[hsl(var(--muted-foreground))] text-xs font-medium">
                        {formatDate(project.startDate || project.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-[hsl(var(--muted-foreground))] text-xs">
                        {project.location?.city || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[hsl(var(--muted-foreground))] text-xs">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{project.teamSize || 1}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-[hsl(var(--muted-foreground))] hover:text-blue-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProject(project);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-[hsl(var(--muted-foreground))] hover:text-rose-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ArrowUpRight className="w-4 h-4 ml-1 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── 5. Create / Edit Project Modal Dialog ── */}
      <AnimatePresence>
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl overflow-hidden border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                      {editingProjectId ? 'Edit Project Parameters' : 'Create New Interior Fit-Out'}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {editingProjectId ? 'Update budget, timeline, and location' : 'Configure project delivery specifications'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDialog}
                  className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProject}>
                <div className="p-5 sm:p-6 space-y-4 max-h-[72vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                        Project Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        maxLength={80}
                        placeholder="e.g. DLF Cyber Park Tower C — 4th Floor"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                        Client / Customer Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        maxLength={60}
                        placeholder="e.g. DLF Limited"
                        value={formData.client}
                        onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                        Project Category / Type
                      </label>
                      <select
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1.5 focus:ring-[hsl(var(--primary))]"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="Commercial Office">Commercial Office</option>
                        <option value="Residential">Residential</option>
                        <option value="Tech Office">Tech Office</option>
                        <option value="Co-working Space">Co-working Space</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                        WBS / Room Template (Optional)
                      </label>
                      <select
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1.5 focus:ring-[hsl(var(--primary))]"
                        value={formData.templateId}
                        onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                      >
                        <option value="">No Template (Empty Project)</option>
                        {templates.map((t: any) => (
                          <option key={t._id} value={t._id}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dates & Timeline */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[hsl(var(--border)/0.5)]">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[hsl(var(--primary))]" /> Start Date <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" /> Target Completion Date <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Budget & City */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[hsl(var(--border)/0.5)]">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Contract Budget (INR) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        type="number"
                        placeholder="e.g. 1500000"
                        value={formData.budgetAmount}
                        onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> City
                      </label>
                      <Input
                        maxLength={50}
                        placeholder="e.g. Gurugram"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Site Address
                    </label>
                    <Input
                      maxLength={120}
                      placeholder="e.g. Cyber City, Building 10, Sector 24"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                      Project Notes & Scope Description
                    </label>
                    <textarea
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1.5 focus:ring-[hsl(var(--primary))]"
                      placeholder="Specify fit-out highlights, architectural scope..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLoading} className="font-semibold shadow-md">
                    {createLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editingProjectId ? 'Save Changes' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 6. Delete Confirmation Modal Dialog ── */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 text-rose-500 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[hsl(var(--foreground))]">Delete Project</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Irreversible operation</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-2 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-[hsl(var(--foreground))]">{projectToDelete.name}</span>? All linked tasks, milestones, and reports will be soft-deleted.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <Button variant="outline" onClick={() => setProjectToDelete(null)} disabled={deleteLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold border-transparent shadow-md shadow-rose-500/20"
                >
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
