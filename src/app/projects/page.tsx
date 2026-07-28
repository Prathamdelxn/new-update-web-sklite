// 'use client';

// import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

// import React, { useState, useEffect } from 'react';
// import { Shell } from '@/components/layouts/Shell';
// import { ProjectCard } from '@/components/ui/ProjectCard';
// import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
// import { ConfirmModal } from '@/components/modals/ConfirmModal';
// import { Plus, Search, Filter, LayoutGrid, List, FolderOpen, ArrowRight } from 'lucide-react';
// import Link from 'next/link';
// import api from '@/services/api.client';
// import { Project } from '@/types';
// import { cn } from '@/lib/utils';
// import { useToast } from '@/providers/ToastContext';

// export default function ProjectsPage() {
//   const [projects, setProjects] = useState<(Project & { hasPendingPlans?: boolean })[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingProject, setEditingProject] = useState<Project | null>(null);
//   const [deletingProject, setDeletingProject] = useState<Project | null>(null);
//   const [isDeleting, setIsDeleting] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState('All');
//   const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
//   const toast = useToast();

//   const fetchProjects = async () => {
//     try {
//       const response = await api.get('/projects');
//       const data = Array.isArray(response.data)
//         ? response.data
//         : response.data?.projects ?? response.data?.data ?? [];
//       setProjects(data);
//     } catch (error) {
//       console.error('Error fetching projects:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { fetchProjects(); }, []);

//   const handleDelete = async () => {
//     if (!deletingProject) return;
//     setIsDeleting(true);
//     try {
//       await api.delete(`/projects/${deletingProject._id}`);
//       toast.success(`"${deletingProject.name}" deleted`);
//       setDeletingProject(null);
//       fetchProjects();
//     } catch (error: any) {
//       toast.error(error.response?.data?.message || 'Failed to delete project');
//     } finally {
//       setIsDeleting(false);
//     }
//   };

//   const filteredProjects = projects.filter(project => {
//     const matchesSearch =
//       project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       project.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
//     const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
//     return matchesSearch && matchesStatus;
//   });

//   const statuses = ['All', 'Initialized', 'Planning', 'Site Survey', 'In Progress', 'Under Snagging', 'Snagging Completed', 'Completed', 'On Hold', 'Cancelled'];

//   const statusColorMap: Record<string, string> = {
//     'In Progress':        'text-emerald-700 bg-emerald-100 border-emerald-200',
//     'Completed':          'text-green-700 bg-green-100 border-green-200',
//     'Planning':           'text-purple-700 bg-purple-100 border-purple-200',
//     'On Hold':            'text-slate-600 bg-gray-100 border-gray-200',
//     'Cancelled':          'text-red-700 bg-red-100 border-red-200',
//     'Initialized':        'text-blue-700 bg-blue-100 border-blue-200',
//     'Site Survey':        'text-cyan-700 bg-cyan-100 border-cyan-200',
//     'Under Snagging':     'text-amber-700 bg-amber-100 border-amber-200',
//     'Snagging Completed': 'text-orange-700 bg-orange-100 border-orange-200',
//   };

//   return (
//     <Shell>
//       <div className="space-y-6">
//         {/* Header */}
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//           <div>
//             <h1 className="text-3xl font-black text-gray-900">Projects</h1>
//             <p className="text-slate-500 mt-1">Manage and track your construction projects.</p>
//           </div>
//           <button
//             onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
//             className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-[0.98] shadow-sm shadow-blue-600/20"
//           >
//             <Plus className="w-5 h-5" />
//             <span>New Project</span>
//           </button>
//         </div>

//         {/* Toolbar */}
//         <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
//           <div className="flex flex-col sm:flex-row gap-3">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//               <input
//                 type="text"
//                 placeholder="Search projects or clients..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
//               />
//             </div>

//             <div className="flex items-center space-x-2">
//               <div className="relative">
//                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//                 <select
//                   value={statusFilter}
//                   onChange={(e) => setStatusFilter(e.target.value)}
//                   className="bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-8 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
//                 >
//                   {statuses.map(status => <option key={status} value={status}>{status}</option>)}
//                 </select>
//               </div>

//               <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
//                 <button
//                   onClick={() => setViewMode('grid')}
//                   className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-gray-700')}
//                 >
//                   <LayoutGrid className="w-4 h-4" />
//                 </button>
//                 <button
//                   onClick={() => setViewMode('list')}
//                   className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-gray-700')}
//                 >
//                   <List className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Projects Grid / List */}
//         <SkeletonLoader loading={loading} preset="card-grid">
//           {filteredProjects.length > 0 && !loading ? (
//             viewMode === 'grid' ? (
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
//                 {filteredProjects.map((project) => (
//                   <ProjectCard
//                     key={project._id}
//                     project={project}
//                     onEdit={(p) => { setEditingProject(p); setIsModalOpen(true); }}
//                     onDelete={(p) => setDeletingProject(p)}
//                   />
//                 ))}
//               </div>
//             ) : (
//               /* ─────────────────────────────────────────────
//                * FIX (Issue 4 — list view responsiveness):
//                * Mobile (< md): stacked card layout per row
//                * Desktop (≥ md): fixed-column table layout
//                * ───────────────────────────────────────────── */
//               <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
//                 {/* Table header — md+ only */}
//                 <div className="hidden md:grid md:grid-cols-[1fr_120px_110px_120px_110px] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
//                   {['Project', 'Client', 'Timeline', 'Status', ''].map(h => (
//                     <span key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
//                   ))}
//                 </div>

//                 {filteredProjects.map((project, i) => {
//                   const statusColor = statusColorMap[project.status] || 'text-blue-700 bg-blue-100 border-blue-200';
//                   const startStr = project.startDate
//                     ? new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
//                     : 'TBD';
//                   const endStr = project.endDate
//                     ? new Date(project.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
//                     : 'TBD';

//                   return (
//                     <div
//                       key={project._id}
//                       className={cn(
//                         'border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors',
//                         i % 2 !== 0 ? 'bg-gray-50/40' : ''
//                       )}
//                     >
//                       {/* Mobile: stacked card */}
//                       <div className="md:hidden px-5 py-4 space-y-2.5">
//                         <div className="flex items-start justify-between gap-3">
//                           <div className="min-w-0">
//                             <p className="text-sm font-bold text-gray-900 truncate">{project.name}</p>
//                             <p className="text-[10px] text-slate-500 truncate mt-0.5">{project.description || 'No description'}</p>
//                           </div>
//                           <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border', statusColor)}>
//                             {project.status}
//                           </span>
//                         </div>
//                         <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
//                           {project.clientName && <span className="font-medium">{project.clientName}</span>}
//                           <span className="text-slate-400">{startStr} → {endStr}</span>
//                         </div>
//                         <div className="flex items-center gap-4 pt-1">
//                           <Link
//                             href={`/projects/${project._id}`}
//                             className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
//                           >
//                             Open <ArrowRight className="w-3.5 h-3.5" />
//                           </Link>
//                           <button
//                             onClick={() => { setEditingProject(project); setIsModalOpen(true); }}
//                             className="text-xs font-bold text-slate-500 hover:text-gray-900 transition-colors"
//                           >
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => setDeletingProject(project)}
//                             className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
//                           >
//                             Delete
//                           </button>
//                         </div>
//                       </div>

//                       {/* Desktop: table row */}
//                       <div className="hidden md:grid md:grid-cols-[1fr_120px_110px_120px_110px] gap-4 px-6 py-4 items-center">
//                         <div className="min-w-0">
//                           <p className="text-sm font-bold text-gray-900 truncate">{project.name}</p>
//                           <p className="text-[10px] text-slate-500 truncate mt-0.5">{project.description || 'No description'}</p>
//                         </div>
//                         <p className="text-xs text-slate-600 truncate">{project.clientName || '—'}</p>
//                         <div>
//                           <p className="text-[10px] font-bold text-slate-500">{startStr}</p>
//                           <p className="text-[10px] text-slate-400">→ {endStr}</p>
//                         </div>
//                         <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border w-fit', statusColor)}>
//                           {project.status}
//                         </span>
//                         <div className="flex items-center gap-2">
//                           <Link
//                             href={`/projects/${project._id}`}
//                             className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors flex items-center gap-1"
//                           >
//                             <span>Open</span>
//                             <ArrowRight className="w-3.5 h-3.5" />
//                           </Link>
//                           <button
//                             onClick={() => { setEditingProject(project); setIsModalOpen(true); }}
//                             className="text-xs font-bold text-slate-500 hover:text-gray-900 transition-colors"
//                           >
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => setDeletingProject(project)}
//                             className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
//                           >
//                             Del
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )
//           ) : (
//             <div className="flex flex-col items-center justify-center py-20 text-center">
//               <div className="p-6 rounded-full bg-gray-100 mb-6">
//                 <FolderOpen className="w-16 h-16 text-gray-300" />
//               </div>
//               <h3 className="text-xl font-bold text-gray-900 mb-2">No projects found</h3>
//               <p className="text-slate-500 max-w-xs">
//                 {searchQuery || statusFilter !== 'All'
//                   ? "We couldn't find any projects matching your criteria."
//                   : "Get started by creating your first construction project."}
//               </p>
//               {!searchQuery && statusFilter === 'All' && (
//                 <button
//                   onClick={() => setIsModalOpen(true)}
//                   className="mt-6 text-blue-600 font-bold hover:text-blue-700 transition-colors"
//                 >
//                   Create a project now &rarr;
//                 </button>
//               )}
//             </div>
//           )}
//         </SkeletonLoader>
//       </div>

//       <CreateProjectModal
//         isOpen={isModalOpen}
//         onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
//         onSuccess={fetchProjects}
//         initialData={editingProject || undefined}
//         projectId={editingProject?._id}
//       />

//       <ConfirmModal
//         isOpen={!!deletingProject}
//         onClose={() => setDeletingProject(null)}
//         onConfirm={handleDelete}
//         title="Delete Project"
//         message={`Are you sure you want to delete "${deletingProject?.name}"? This cannot be undone and will remove all associated data.`}
//         confirmText="Delete"
//         type="danger"
//         isLoading={isDeleting}
//       />
//     </Shell>
//   );
// }
'use client';
 
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
 
import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layouts/Shell';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { SendForSurveyModal } from '@/features/projects/site-survey/components/SendForSurveyModal';
import { SurveyModal } from '@/features/projects/plans/components/SurveyModal';
import { Plus, Search, Filter, LayoutGrid, List, FolderOpen, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '@/services/api.client';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
 
export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { hasPendingPlans?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSurveyAssignOpen, setIsSurveyAssignOpen] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [surveyProject, setSurveyProject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const toast = useToast();
  const pathname = usePathname();
 
  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.projects ?? response.data?.data ?? [];
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const r = await api.get('/users');
      setAllUsers(r.data?.users || r.data || []);
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };
 
  useEffect(() => {
    fetchProjects();
    fetchUsers();
    
    // Refresh on focus and visibility change to ensure fresh data after returning from other pages
    const handleFocus = () => fetchProjects();
    const handleVisibility = () => document.visibilityState === 'visible' && fetchProjects();
    
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
 
  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
 
  const statuses = ['All', 'Initialized', 'Planning', 'Site Survey', 'Ongoing', 'Under Snagging', 'Snagging Completed', 'Completed', 'Pending Handover', 'Handover Rejected', 'Handover Completed', 'On Hold', 'Cancelled'];

  const statusColorMap: Record<string, string> = {
    'Ongoing':             'text-emerald-700 bg-emerald-100 border-emerald-200',
    'Completed':           'text-green-700 bg-green-100 border-green-200',
    'Planning':            'text-purple-700 bg-purple-100 border-purple-200',
    'On Hold':             'text-slate-600 bg-gray-100 border-gray-200',
    'Cancelled':           'text-red-700 bg-red-100 border-red-200',
    'Initialized':         'text-blue-700 bg-blue-100 border-blue-200',
    'Site Survey':         'text-cyan-700 bg-cyan-100 border-cyan-200',
    'Under Snagging':      'text-amber-700 bg-amber-100 border-amber-200',
    'Snagging Completed':  'text-orange-700 bg-orange-100 border-orange-200',
    'Pending Handover':    'text-violet-700 bg-violet-100 border-violet-200',
    'Handover Rejected':   'text-rose-700 bg-rose-100 border-rose-200',
    'Handover Completed':  'text-teal-700 bg-teal-100 border-teal-200',
  };
 
  const [showFilters, setShowFilters] = useState(false);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              My <span className="text-blue-600">Projects</span>
            </h1>
            <p className="text-slate-500 mt-1">Manage and track your construction projects.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
              className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all active:scale-[0.95] shadow-sm shadow-blue-600/20"
              title="New Project"
            >
              <Plus className="w-5 h-5" />
            </button>
            {/* Notification bell would go here if implemented on web */}
          </div>
        </div>
 
        {/* Toolbar */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects or clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 backdrop-blur-md border border-white/80 shadow-sm rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
 
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center justify-center w-11 h-11 rounded-xl transition-all shadow-sm active:scale-95",
                showFilters ? "bg-slate-800 text-white" : "bg-white/60 backdrop-blur-md border border-white/80 text-slate-500 hover:text-slate-700"
              )}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Chips */}
          {showFilters && (
            <div className="flex overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide gap-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95",
                    statusFilter === status 
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" 
                      : "bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>
 
        {/* Projects Grid */}
        <SkeletonLoader loading={loading} preset="card-grid">
          {filteredProjects.length > 0 && !loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  onEdit={(p) => { setEditingProject(p); setIsModalOpen(true); }}
                  onDelete={(p) => setDeletingProject(p)}
                  onSendForSurvey={(p) => { setSurveyProject(p); setIsSurveyAssignOpen(true); }}
                  onCompleteSurvey={(p) => { setSurveyProject(p); setIsSurveyModalOpen(true); }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm">
              <FolderOpen className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-1">No active projects</h3>
              <p className="text-slate-400 text-sm max-w-xs mb-6">
                {searchQuery || statusFilter !== 'All'
                  ? "We couldn't find any projects matching your search."
                  : "Start a new project to track your construction progress."}
              </p>
              {!searchQuery && statusFilter === 'All' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all active:scale-95 shadow-sm shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              )}
            </div>
          )}
        </SkeletonLoader>
      </div>
 
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
    </Shell>
  );
}