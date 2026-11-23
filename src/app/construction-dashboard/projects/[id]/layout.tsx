'use client';
import { tr } from '@/i18n';
import React, { useState, useRef, useEffect, useLayoutEffect, startTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ProjectProvider, useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { useAuth } from '@/providers/AuthContext';
import { useIsAdmin } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import {
  Info, FileText, Banknote, Package, Files, Map,
  AlertCircle, ShieldAlert, Calendar,
  TrendingUp, GanttChart, ClipboardList, CreditCard,
  ChevronLeft, Pencil, MessageSquare,
  ClipboardCheck, History, LayoutGrid, Sofa, LayoutDashboard, // Clock (Attendance tab, hidden),
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
  // Attendance hidden for now — no other module depends on it
  // { id: 'attendance',   name: 'Attendance',     icon: Clock },
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
  { id: 'finance',   label: 'Finance',   icon: Banknote,      tabIds: ['transactions'] },
  { id: 'site',      label: 'Site',      icon: Map,             tabIds: ['plans', 'documents', 'materials', 'site-survey' /* , 'attendance' */] },
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

// Tab highlight motion — same feel as the mobile app's Animated.spring (bounciness 4):
// accelerates, overshoots ~4% and settles. CSS linear() encodes the spring curve;
// older browsers get a close cubic-bezier with a small overshoot.
const TAB_SPRING = 'linear(0, 0.0228, 0.0816, 0.1643, 0.2608, 0.3631, 0.4654, 0.5631, 0.6534, 0.7342, 0.8047, 0.8646, 0.9141, 0.954, 0.9851, 1.0084, 1.0251, 1.0362, 1.0427, 1.0456, 1.0458, 1.0439, 1.0406, 1.0365, 1.0319, 1.0272, 1.0225, 1.0182, 1.0142, 1.0107, 1.0077, 1.0051, 1.0031, 1.0014, 1.0002, 0.9992, 0.9986, 0.9982, 0.998, 0.9979, 1)';
let springSupported: boolean | null = null;
function tabSpringEasing() {
  if (springSupported === null) {
    springSupported = typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)');
  }
  return springSupported ? TAB_SPRING : 'cubic-bezier(0.34, 1.25, 0.64, 1)';
}

// Skeleton shown while the project loads — same shape each tab uses for its own
// loading state, so the placeholder doesn't change shape when the tab takes over.
const TAB_SKELETON: Record<string, string> = {
  dashboard: 'dashboard', details: 'form', 'site-survey': 'form', plans: 'list', documents: 'list',
  boq: 'table', rooms: 'card-grid', ffe: 'table', milestones: 'list', materials: 'table', issues: 'list',
  risks: 'list', transactions: 'table', reports: 'list', audit: 'list', handover: 'list', chat: 'list',
  timeline: 'list', progress: 'list', budget: 'form', attendance: 'list',
};

const RESTRICTED_TABS = [
  'plans', 'rooms', 'ffe', 'boq', 'milestones', 'audit', 'materials', 'transactions', 'risks', 'issues', 'handover', 'attendance', 'reports'
];

// ── Inner layout ───────────────────────────────────────────────
function LayoutInner({ children }: { children: React.ReactNode }) {
  const { project, preview, loading, accessDenied, fetchProject, projectId } = useProjectContext();
  // Header can show the list's name/status straight away while the full project loads
  const headerInfo = project ?? preview;
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const visibleTabs = getVisibleTabs(headerInfo?.projectType, project?.siteSurveyor, isAdmin);
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
    if (tabId === activeTab) return;
    // Move the highlight now; start the (heavier) page render only after the
    // browser has painted the first animation frame, and as a non-urgent update.
    setPendingTab({ tab: tabId, from: activeTab });
    const href = `/construction-dashboard/projects/${projectId}/${tabId}`;
    requestAnimationFrame(() => requestAnimationFrame(() => startTransition(() => router.push(href))));
  };

  // Clicked tab wins until the URL actually changes, then the URL is the truth again
  const [pendingTab, setPendingTab] = useState<{ tab: string; from: string } | null>(null);
  const shownTab = pendingTab && pendingTab.from === activeTab ? pendingTab.tab : activeTab;

  // Preload every tab's page (production builds) so switching doesn't wait on the network
  const tabIdsKey = visibleTabs.map((t) => t.id).join(',');
  useEffect(() => {
    if (!projectId) return;
    tabIdsKey.split(',').forEach((id) => router.prefetch(`/construction-dashboard/projects/${projectId}/${id}`));
  }, [projectId, tabIdsKey, router]);

  // Sliding highlight: one element moved with a CSS transform (runs on the compositor,
  // so it stays smooth even while React renders the next tab)
  const [indicator, setIndicator] = useState<{ x: number; w: number; animate: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const measure = (animate: boolean) => {
      const btn = el.querySelector<HTMLElement>('[data-active="true"]');
      if (!btn) { setIndicator(null); return; }
      setIndicator((prev) => ({ x: btn.offsetLeft, w: btn.offsetWidth, animate: animate && !!prev }));
    };
    measure(true);
    // Re-measure without animating when labels/sizes change (language switch, resize)
    const ro = new ResizeObserver(() => measure(false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [shownTab, tabIdsKey]);

  // Keep the active tab centred in the bar, like the mobile app (only scrolls the
  // tab strip — never the page)
  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeBtn || el.scrollWidth <= el.clientWidth) return;
    const centred = activeBtn.offsetLeft + activeBtn.offsetWidth / 2 - el.clientWidth / 2;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = Math.max(0, Math.min(maxScroll, centred));
    // RTL strips scroll with negative scrollLeft (0 = right edge)
    const isRtl = getComputedStyle(el).direction === 'rtl';
    el.scrollTo({ left: isRtl ? target - maxScroll : target, behavior: 'smooth' });
  }, [shownTab]);

  const isSurveyPending = (project?.status === 'Site Survey' || (project?.status === 'Initialized' && project?.needSiteSurvey)) && (project as any)?.surveyStatus !== 'Approved';
  const isRestrictedTab = isSurveyPending && RESTRICTED_TABS.includes(activeTab);

  const isInteriorOrg =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior';
  const projectsListRoute = (project?.projectType === 'Interior' || (!project && isInteriorOrg)) ? '/interior-new/projects' : '/construction-dashboard/projects';

  const canEditProject = !isProjectLocked(project) && hasProjectPermission(user, project, 'projects:update');

  const headerContent = project ? (
    <div className="flex items-center justify-between w-full pe-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => router.push(projectsListRoute)}
          className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-2xs active:scale-95 transition-all duration-200 shrink-0 cursor-pointer"
          title={tr("Back to Projects")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm md:text-base font-black text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md">
          {tr(project.name)}
        </h1>
        <span className={cn(
          'hidden sm:inline-block shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
          statusBadgeColor[project.status] || 'bg-blue-50/80 text-blue-700 border-blue-200/60'
        )}>
          {tr(project.status)}
        </span>
        {project.projectType && (
          <span className="hidden md:inline shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-200/80">
            {tr(project.projectType)}
          </span>
        )}
      </div>
      {canEditProject && (
        <button
          onClick={() => setIsEditModalOpen(true)}
          title={tr("Edit project")}
          className="hidden sm:inline-flex shrink-0 p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-2xs active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  ) : null;

  // Loaded but nothing came back → not-found / access-denied card.
  // Otherwise the header and tab bar render straight away (like Interior); only the
  // name/status show skeleton bars, and the page content waits for the project.
  return (
    <>
      {!project && !loading ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-8 shadow-card">
          <h2 className="text-2xl font-bold text-slate-900">{accessDenied ? tr("Access denied") : tr("Project not found")}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {accessDenied
              ? tr("You don't have permission to view this project.")
              : tr("This project does not exist or has been removed.")}
          </p>
          <button
            onClick={() => router.push(projectsListRoute)}
            className="mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-blue-500 transition-colors"
          >
            {tr("Back to Projects")}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Project Workspace Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3 min-h-[58px]">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push(projectsListRoute)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
                title={tr("Back to Projects")}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                {headerInfo ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate max-w-xs sm:max-w-md">
                      {tr(headerInfo.name)}
                    </h1>
                    <span className={cn(
                      'shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border',
                      statusBadgeColor[headerInfo.status] || 'bg-blue-50 text-blue-700 border-blue-200/80'
                    )}>
                      {tr(headerInfo.status)}
                    </span>
                    {headerInfo.projectType && (
                      <span className="hidden sm:inline shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border bg-slate-50 text-slate-600 border-slate-200/80">
                        {tr(headerInfo.projectType)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2" aria-busy="true" aria-label={tr("Loading project")}>
                    <span className="inline-block h-4 w-48 rounded bg-slate-200/80 animate-pulse" />
                    <span className="inline-block h-5 w-16 rounded-md bg-slate-100 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
            {project && canEditProject && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                title={tr("Edit project")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-medium shrink-0 self-start sm:self-auto"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                <span>{tr("Edit Details")}</span>
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
                'relative flex items-center gap-1 overflow-x-auto scrollbar-hide select-none',
                !isGrabbing && 'scroll-smooth'
              )}
            >
              {indicator && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-0 bottom-0 left-0 rounded-lg bg-blue-600 pointer-events-none will-change-transform',
                    indicator.animate && 'transition-[transform,width] motion-reduce:transition-none'
                  )}
                  style={{
                    width: indicator.w,
                    transform: `translate3d(${indicator.x}px,0,0)`,
                    ...(indicator.animate ? { transitionDuration: '620ms', transitionTimingFunction: tabSpringEasing() } : {}),
                  }}
                />
              )}
              {visibleTabs.map((tab) => {
                const isActive = shownTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    data-active={isActive}
                    onClick={(e) => handleTabClick(tab.id, e)}
                    className={cn(
                      'group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 select-none cursor-pointer',
                      'transition-colors duration-300 ease-in-out',
                      isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    )}
                  >
                    <TabIcon className={cn("relative w-4 h-4 shrink-0 transition-colors duration-300 ease-in-out", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                    <span className="relative">{tr(tab.name)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!project ? (
            <SkeletonLoader loading preset={TAB_SKELETON[shownTab] ?? 'list'}>{null}</SkeletonLoader>
          ) : isRestrictedTab ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm mt-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{tr("Section Locked")}</h2>
              <p className="text-slate-500 text-sm max-w-sm text-center mb-6">
                {tr("Please complete and approve the Site Survey to unlock this section.")}
              </p>
              {visibleTabs.find(t => t.id === 'site-survey') && (
                <button
                  onClick={() => router.push(`/construction-dashboard/projects/${projectId}/site-survey`)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  <span>{tr("Go to Survey")}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            children
          )}

          {project && (
            <CreateProjectModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onSuccess={fetchProject}
              initialData={project}
              projectId={projectId}
            />
          )}
        </div>
      )}
    </>
  );
}

export default function ProjectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <LayoutInner>{children}</LayoutInner>
    </ProjectProvider>
  );
}
