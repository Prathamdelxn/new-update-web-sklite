'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ProjectProvider, useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { useAuth } from '@/providers/AuthContext';
import { useIsAdmin } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import {
  Info, FileText, DollarSign, Package, Files, Map,
  AlertCircle, ShieldAlert, Calendar,
  TrendingUp, GanttChart, ClipboardList, CreditCard,
  ChevronLeft, Pencil, MessageSquare,
  ClipboardCheck, History, LayoutGrid, Sofa, LayoutDashboard, Clock,
  Lock, ArrowRight
} from 'lucide-react';

// ── All tab definitions ────────────────────────────────────────
const ALL_TABS = [
  { id: 'details',      name: 'Details',        icon: Info },
  { id: 'site-survey',  name: 'Survey',         icon: ClipboardList },
  { id: 'plans',        name: 'Design',         icon: Map },
  { id: 'documents',    name: 'Documents',      icon: Files },
  { id: 'boq',          name: 'BOQ',            icon: FileText },
  { id: 'rooms',        name: 'Rooms',          icon: LayoutGrid },
  { id: 'ffe',          name: 'FFE',            icon: Sofa },
  { id: 'milestones',   name: 'Milestone',      icon: Calendar },
  { id: 'materials',    name: 'Material',       icon: Package },
  { id: 'attendance',   name: 'Attendance',     icon: Clock },
  { id: 'issues',       name: 'Snags',          icon: AlertCircle },
  { id: 'risks',        name: 'Risk',           icon: ShieldAlert },
  { id: 'transactions', name: 'Transactions',   icon: CreditCard },
  { id: 'reports',      name: 'Reports',        icon: TrendingUp },
  { id: 'audit',        name: 'Audit',          icon: History },
  { id: 'handover',     name: 'Handover',       icon: ClipboardCheck },
  { id: 'chat',         name: 'Chat',           icon: MessageSquare },
] as const;

type TabId = typeof ALL_TABS[number]['id'];

type TabGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  tabIds: TabId[];
};

// ── Group definitions (order matters — first tab in group = default landing) ──
const TAB_GROUPS: TabGroup[] = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard, tabIds: [ 'details'] },
  { id: 'work',      label: 'Work',      icon: Calendar,        tabIds: ['boq', 'milestones', 'reports'] },
  { id: 'finance',   label: 'Finance',   icon: DollarSign,      tabIds: ['transactions'] },
  { id: 'site',      label: 'Site',      icon: Map,             tabIds: ['plans', 'documents', 'materials', 'site-survey', 'attendance'] },
  { id: 'quality',   label: 'Quality',   icon: ShieldAlert,     tabIds: ['issues', 'risks', 'handover', 'audit'] },
  { id: 'chat',      label: 'Chat',      icon: MessageSquare,   tabIds: ['chat'] },
  { id: 'interior',  label: 'Interior',  icon: Sofa,            tabIds: ['rooms', 'ffe'] },
];

// ── Builds visible tabs respecting project type & surveyor & admin role ──
function getVisibleTabs(projectType?: string, siteSurveyor?: any, isAdmin: boolean = false) {
  return ALL_TABS
    .filter(t => t.id !== 'site-survey' || !!siteSurveyor)
    .filter(t => (t.id !== 'rooms' && t.id !== 'ffe') || projectType === 'Interior')
    .filter(t => t.id !== 'audit' || isAdmin);
}

// ── Status badge colors ────────────────────────────────────────
const statusBadgeColor: Record<string, string> = {
  'Initialized':         'bg-blue-50 text-blue-700 border-blue-200/80',
  'Planning':            'bg-purple-50 text-purple-700 border-purple-200/80',
  'Site Survey':         'bg-cyan-50 text-cyan-700 border-cyan-200/80',
  'Ongoing':             'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  'Under Snagging':      'bg-amber-50 text-amber-700 border-amber-200/80',
  'Snagging Completed':  'bg-orange-50 text-orange-700 border-orange-200/80',
  'Completed':           'bg-green-50 text-green-700 border-green-200/80',
  'Pending Handover':    'bg-violet-50 text-violet-700 border-violet-200/80',
  'Handover Rejected':   'bg-rose-50 text-rose-700 border-rose-200/80',
  'Handover Completed':  'bg-teal-50 text-teal-700 border-teal-200/80',
  'On Hold':             'bg-slate-50 text-slate-600 border-slate-200/80',
  'Cancelled':           'bg-red-50 text-red-700 border-red-200/80',
};

const RESTRICTED_TABS = [
  'plans', 'rooms', 'ffe', 'boq', 'milestones', 'audit', 'materials', 'transactions', 'risks', 'issues', 'handover', 'attendance', 'reports'
];

// ── Inner layout ───────────────────────────────────────────────
function LayoutInner({ children }: { children: React.ReactNode }) {
  const { project, loading, accessDenied, fetchProject, projectId } = useProjectContext();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const visibleTabs = getVisibleTabs(project?.projectType, project?.siteSurveyor, isAdmin);
  const activeTab = (ALL_TABS as readonly { id: string }[]).find(t => pathname.includes(`/${t.id}`))?.id || 'dashboard';

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  // Mouse wheel horizontal scrolling
  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && e.deltaX === 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  // Hold & drag to scroll
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary mouse button
    const el = tabsContainerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    setIsGrabbing(true);
  };

  // Global mousemove and mouseup listeners to smoothly track drag even if cursor moves slightly outside the bar
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const el = tabsContainerRef.current;
      if (!el) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = x - startXRef.current;
      if (Math.abs(walk) > 4) {
        hasDraggedRef.current = true;
      }
      el.scrollLeft = scrollLeftRef.current - walk;
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsGrabbing(false);
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 80);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleTabClick = (tabId: string, e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    router.push(`/construction-dashboard/projects/${projectId}/${tabId}`);
  };

  // Auto-scroll active tab into view
  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>('[data-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTab]);

  const isSurveyPending = (project?.status === 'Site Survey' || (project?.status === 'Initialized' && project?.needSiteSurvey)) && (project as any)?.surveyStatus !== 'Approved';
  const isRestrictedTab = isSurveyPending && RESTRICTED_TABS.includes(activeTab);

  const isInteriorOrg =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior';
  const projectsListRoute = (project?.projectType === 'Interior' || (!project && isInteriorOrg)) ? '/interior-new/projects' : '/construction-dashboard/projects';

  const canEditProject = !isProjectLocked(project) && hasProjectPermission(user, project, 'projects:update');

  const headerContent = project ? (
    <div className="flex items-center justify-between w-full pr-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => router.push(projectsListRoute)}
          className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-2xs active:scale-95 transition-all duration-200 shrink-0 cursor-pointer"
          title="Back to Projects"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm md:text-base font-black text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md">
          {project.name}
        </h1>
        <span className={cn(
          'hidden sm:inline-block shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
          statusBadgeColor[project.status] || 'bg-blue-50/80 text-blue-700 border-blue-200/60'
        )}>
          {project.status}
        </span>
        {project.projectType && (
          <span className="hidden md:inline shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-200/80">
            {project.projectType}
          </span>
        )}
      </div>
      {canEditProject && (
        <button
          onClick={() => setIsEditModalOpen(true)}
          title="Edit project"
          className="hidden sm:inline-flex shrink-0 p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-2xs active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  ) : null;

  return (
    <SkeletonLoader loading={loading} preset="detail">
      {!project && !loading ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-8 shadow-card">
          <h2 className="text-2xl font-bold text-slate-900">{accessDenied ? 'Access denied' : 'Project not found'}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {accessDenied
              ? "You don't have permission to view this project."
              : 'This project does not exist or has been removed.'}
          </p>
          <button
            onClick={() => router.push(projectsListRoute)}
            className="mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-blue-500 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      ) : project ? (
        <div className="space-y-4">
          {/* ── Project Workspace Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push(projectsListRoute)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
                title="Back to Projects"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate max-w-xs sm:max-w-md">
                    {project.name}
                  </h1>
                  <span className={cn(
                    'shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border',
                    statusBadgeColor[project.status] || 'bg-blue-50 text-blue-700 border-blue-200/80'
                  )}>
                    {project.status}
                  </span>
                  {project.projectType && (
                    <span className="hidden sm:inline shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border bg-slate-50 text-slate-600 border-slate-200/80">
                      {project.projectType}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {canEditProject && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                title="Edit project"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-medium shrink-0 self-start sm:self-auto"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Details</span>
              </button>
            )}
          </div>

          {/* ── Navigation card (Hold & Drag to Scroll) ── */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-1.5 overflow-hidden">
            <div
              ref={tabsContainerRef}
              onMouseDown={handleMouseDown}
              onWheel={handleTabsWheel}
              className={cn(
                'flex items-center gap-1 overflow-x-auto scrollbar-hide select-none transition-[cursor]',
                isGrabbing ? 'cursor-grabbing' : 'cursor-grab',
                !isGrabbing && 'scroll-smooth'
              )}
            >
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    data-active={isActive}
                    onClick={(e) => handleTabClick(tab.id, e)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 select-none',
                      isGrabbing ? 'cursor-grabbing' : 'cursor-pointer',
                      isActive
                        ? 'bg-blue-600 text-white shadow-none'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    )}
                  >
                    <TabIcon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isRestrictedTab ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm mt-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Section Locked</h2>
              <p className="text-slate-500 text-sm max-w-sm text-center mb-6">
                Please complete and approve the Site Survey to unlock this section.
              </p>
              {visibleTabs.find(t => t.id === 'site-survey') && (
                <button
                  onClick={() => router.push(`/construction-dashboard/projects/${projectId}/site-survey`)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  <span>Go to Survey</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            children
          )}

          <CreateProjectModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={fetchProject}
            initialData={project || undefined}
            projectId={projectId}
          />
        </div>
      ) : null}
    </SkeletonLoader>
  );
}

export default function ProjectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <LayoutInner>{children}</LayoutInner>
    </ProjectProvider>
  );
}
