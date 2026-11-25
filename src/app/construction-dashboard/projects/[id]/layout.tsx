'use client';
import { tr } from '@/i18n';
import React, { useState, useRef, useEffect, startTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ProjectProvider, useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { useAuth } from '@/providers/AuthContext';
import { useIsAdmin } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { InteriorPageHeader } from '@/components/interior/InteriorPageHeader';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import {
  Info, FileText, Banknote, Package, Files, Map,
  AlertCircle, ShieldAlert, Calendar,
  TrendingUp, ClipboardList, CreditCard,
  ChevronLeft, Pencil, MessageSquare,
  ClipboardCheck, History, LayoutGrid, Sofa, LayoutDashboard, // Clock (Attendance tab, hidden),
  Lock, ArrowRight, ChevronDown
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

// ── Navigation groups (like the interior project header): a few groups with dropdowns
//    instead of one long strip of 16 tabs that had to be dragged / scrolled sideways ──
const TAB_GROUPS: TabGroup[] = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard, tabIds: ['details'] },
  { id: 'planning',  label: 'Planning',  icon: Map,             tabIds: ['site-survey', 'plans', 'documents', 'boq', 'rooms', 'ffe'] },
  { id: 'execution', label: 'Execution', icon: Calendar,        tabIds: ['milestones', 'materials', 'issues', 'risks'] },
  { id: 'finance',   label: 'Finance',   icon: Banknote,        tabIds: ['transactions', 'reports'] },
  { id: 'closeout',  label: 'Closeout',  icon: ClipboardCheck,  tabIds: ['handover', 'audit'] },
  { id: 'chat',      label: 'Chat',      icon: MessageSquare,   tabIds: ['chat'] },
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

  // Which group dropdown is open; closes on outside click / Escape
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openGroup) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenGroup(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openGroup]);

  const handleTabClick = (tabId: string) => {
    setOpenGroup(null);
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

  const isSurveyPending = (project?.status === 'Site Survey' || (project?.status === 'Initialized' && project?.needSiteSurvey)) && (project as any)?.surveyStatus !== 'Approved';
  const isRestrictedTab = isSurveyPending && RESTRICTED_TABS.includes(activeTab);

  const isInteriorOrg =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior';
  const projectsListRoute = (project?.projectType === 'Interior' || (!project && isInteriorOrg)) ? '/interior-new/projects' : '/construction-dashboard/projects';

  const canEditProject = !isProjectLocked(project) && hasProjectPermission(user, project, 'projects:update');

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
          {/* ── Project title, status and "Edit Details" live in the top bar (frees a whole row) ── */}
          <InteriorPageHeader
            leading={
              <button
                onClick={() => router.push(projectsListRoute)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
                title={tr("Back to Projects")}
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
            }
            title={
              headerInfo ? (
                tr(headerInfo.name)
              ) : (
                <span className="inline-block h-4 w-48 rounded bg-slate-200/80 animate-pulse align-middle" aria-label={tr("Loading project")} />
              )
            }
            badge={
              headerInfo ? (
                <>
                  <span className={cn(
                    'shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border',
                    statusBadgeColor[headerInfo.status] || 'bg-blue-50 text-blue-700 border-blue-200/80'
                  )}>
                    {tr(headerInfo.status)}
                  </span>
                  {headerInfo.projectType && (
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border bg-slate-50 text-slate-600 border-slate-200/80">
                      {tr(headerInfo.projectType)}
                    </span>
                  )}
                </>
              ) : undefined
            }
            actions={
              project && canEditProject ? (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  title={tr("Edit project")}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-medium shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>{tr("Edit Details")}</span>
                </button>
              ) : undefined
            }
          />

          {/* ── Grouped navigation (dropdowns, no sideways scrolling) ── */}
          <nav ref={navRef} className="relative z-20 bg-white border border-slate-200/80 rounded-xl px-1.5 py-1.5 flex flex-wrap items-center gap-1">
            {TAB_GROUPS.map((group) => {
              const tabs = group.tabIds
                .map((id) => visibleTabs.find((t) => t.id === id))
                .filter(Boolean) as (typeof visibleTabs)[number][];
              if (tabs.length === 0) return null;
              const activeInGroup = tabs.find((t) => t.id === shownTab);
              const GroupIcon = activeInGroup?.icon || group.icon;
              const single = tabs.length === 1;
              const isOpen = openGroup === group.id;
              return (
                <div key={group.id} className="relative">
                  <button
                    type="button"
                    onClick={() => (single ? handleTabClick(tabs[0].id) : setOpenGroup(isOpen ? null : group.id))}
                    aria-expanded={single ? undefined : isOpen}
                    className={cn(
                      'flex items-center gap-2 h-9 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer',
                      activeInGroup ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    )}
                  >
                    <GroupIcon className={cn('w-4 h-4 shrink-0', activeInGroup ? 'text-white' : 'text-slate-400')} />
                    <span>{tr(activeInGroup && !single ? activeInGroup.name : group.label)}</span>
                    {!single && <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180', activeInGroup ? 'text-white/80' : 'text-slate-400')} />}
                  </button>

                  {isOpen && !single && (
                    <div className="absolute top-full start-0 mt-1.5 z-50 min-w-[13rem] py-1.5 rounded-xl border border-slate-200 bg-white shadow-xl">
                      <div className="px-3 pt-0.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{tr(group.label)}</div>
                      {tabs.map((tab) => {
                        const TabIcon = tab.icon;
                        const locked = isSurveyPending && RESTRICTED_TABS.includes(tab.id);
                        const active = shownTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleTabClick(tab.id)}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-start transition-colors cursor-pointer',
                              active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                            )}
                          >
                            <TabIcon className={cn('w-4 h-4 shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
                            <span className="flex-1">{tr(tab.name)}</span>
                            {locked && <Lock className="w-3.5 h-3.5 text-slate-400" aria-label={tr('Locked until the site survey is approved')} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

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
