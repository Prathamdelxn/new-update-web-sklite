'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shell } from '@/components/layouts/Shell';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ProjectProvider, useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { useAuth } from '@/providers/AuthContext';
import { cn } from '@/lib/utils';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import {
  Info, FileText, DollarSign, Package, Files, Map,
  AlertCircle, ShieldAlert, Calendar,
  TrendingUp, GanttChart, ClipboardList, CreditCard,
  ChevronLeft, Pencil, MessageSquare, ChevronDown,
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
  { id: 'payments',     name: 'Payments',       icon: CreditCard },
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
  { id: 'finance',   label: 'Finance',   icon: DollarSign,      tabIds: ['transactions', 'payments'] },
  { id: 'site',      label: 'Site',      icon: Map,             tabIds: ['plans', 'documents', 'materials', 'site-survey', 'attendance'] },
  { id: 'quality',   label: 'Quality',   icon: ShieldAlert,     tabIds: ['issues', 'risks', 'handover', 'audit'] },
  { id: 'chat',      label: 'Chat',      icon: MessageSquare,   tabIds: ['chat'] },
  { id: 'interior',  label: 'Interior',  icon: Sofa,            tabIds: ['rooms', 'ffe'] },
];

// ── Builds visible tabs respecting project type & surveyor ──
function getVisibleTabs(projectType?: string, siteSurveyor?: any) {
  return ALL_TABS
    .filter(t => t.id !== 'site-survey' || !!siteSurveyor)
    .filter(t => t.id !== 'rooms' && t.id !== 'ffe' || projectType === 'Interior');
}

// ── Status badge colors ────────────────────────────────────────
const statusBadgeColor: Record<string, string> = {
  'Initialized':         'bg-blue-50/80 text-blue-700 border-blue-200/60 shadow-[0_1px_2px_rgba(59,130,246,0.02)]',
  'Planning':            'bg-purple-50/80 text-purple-700 border-purple-200/60 shadow-[0_1px_2px_rgba(168,85,247,0.02)]',
  'Site Survey':         'bg-cyan-50/80 text-cyan-700 border-cyan-200/60 shadow-[0_1px_2px_rgba(6,182,212,0.02)]',
  'Ongoing':             'bg-emerald-50/80 text-emerald-700 border-emerald-200/60 shadow-[0_1px_2px_rgba(16,185,129,0.02)]',
  'Under Snagging':      'bg-amber-50/80 text-amber-700 border-amber-200/60 shadow-[0_1px_2px_rgba(245,158,11,0.02)]',
  'Snagging Completed':  'bg-orange-50/80 text-orange-700 border-orange-200/60 shadow-[0_1px_2px_rgba(249,115,22,0.02)]',
  'Completed':           'bg-green-50/80 text-green-700 border-green-200/60 shadow-[0_1px_2px_rgba(34,197,94,0.02)]',
  'Pending Handover':    'bg-violet-50/80 text-violet-700 border-violet-200/60 shadow-[0_1px_2px_rgba(139,92,246,0.02)]',
  'Handover Rejected':   'bg-rose-50/80 text-rose-700 border-rose-200/60 shadow-[0_1px_2px_rgba(244,63,94,0.02)]',
  'Handover Completed':  'bg-teal-50/80 text-teal-700 border-teal-200/60 shadow-[0_1px_2px_rgba(20,184,166,0.02)]',
  'On Hold':             'bg-slate-50 text-slate-600 border-slate-200/60 shadow-[0_1px_2px_rgba(100,116,139,0.02)]',
  'Cancelled':           'bg-red-50/80 text-red-700 border-red-200/60 shadow-[0_1px_2px_rgba(239,68,68,0.02)]',
};

const RESTRICTED_TABS = [
  'plans', 'rooms', 'ffe', 'boq', 'milestones', 'audit', 'materials', 'transactions', 'risks', 'issues', 'handover', 'attendance', 'reports'
];

// ── Inner layout ───────────────────────────────────────────────
function LayoutInner({ children }: { children: React.ReactNode }) {
  const { project, loading, fetchProject, projectId } = useProjectContext();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleTabs = getVisibleTabs(project?.projectType, project?.siteSurveyor);
  const visibleGroups = TAB_GROUPS.filter(g => g.tabIds.some(id => visibleTabs.some(t => t.id === id)));
  const activeTab = (ALL_TABS as readonly { id: string }[]).find(t => pathname.includes(`/${t.id}`))?.id || 'dashboard';

  const isSurveyPending = (project?.status === 'Site Survey' || (project?.status === 'Initialized' && project?.needSiteSurvey)) && (project as any)?.surveyStatus !== 'Approved';
  const isRestrictedTab = isSurveyPending && RESTRICTED_TABS.includes(activeTab);

  const isInteriorOrg =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior';
  const projectsListRoute = (project?.projectType === 'Interior' || (!project && isInteriorOrg)) ? '/interior-new/projects' : '/projects';

  const canEditProject = !isProjectLocked(project) && hasProjectPermission(user, project, 'projects:update');

  const headerContent = project ? (
    <div className="flex items-center justify-between w-full pr-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => router.push(projectsListRoute)}
          className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-200 shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-extrabold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md">
          {project.name}
        </h1>
        <span className={cn(
          'hidden sm:inline-block shrink-0 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border',
          statusBadgeColor[project.status] || 'bg-blue-50/80 text-blue-700 border-blue-200/60'
        )}>
          {project.status}
        </span>
        {project.projectType && (
          <span className="hidden md:inline shrink-0 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-200/80">
            {project.projectType}
          </span>
        )}
      </div>
      {canEditProject && (
        <button
          onClick={() => setIsEditModalOpen(true)}
          title="Edit project"
          className="hidden sm:inline-flex shrink-0 p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
    </div>
  ) : null;

  return (
    <Shell headerContent={headerContent}>
      <SkeletonLoader loading={loading} preset="detail">
        {!project && !loading ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
            <button
              onClick={() => router.push(projectsListRoute)}
              className="mt-4 text-blue-600 font-medium hover:text-blue-700"
            >
              Back to Projects
            </button>
          </div>
        ) : project ? (
          <>
            <div className="space-y-0">
              {/* ── Navigation card with Nested Tabs & Dropdowns ── */}
              <div ref={dropdownContainerRef} className="relative z-30 bg-white/85 backdrop-blur-md border border-slate-200/60 rounded-2xl p-2 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] mb-5 space-y-2">
                {/* Row 1: Category Groups with Dropdowns */}
                <div className="flex items-center gap-1.5 overflow-visible flex-wrap sm:flex-nowrap">
                  {visibleGroups.map((group) => {
                    const groupTabs = visibleTabs.filter(t => group.tabIds.includes(t.id));
                    if (groupTabs.length === 0) return null;

                    const isGroupActive = groupTabs.some(t => t.id === activeTab);
                    const isDropdownOpen = openDropdown === group.id;
                    const GroupIcon = group.icon;

                    // Single tab group (direct navigation)
                    if (groupTabs.length === 1) {
                      const tab = groupTabs[0];
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={group.id}
                          onClick={() => {
                            setOpenDropdown(null);
                            router.push(`/projects/${projectId}/${tab.id}`);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 select-none cursor-pointer',
                            isGroupActive
                              ? 'bg-blue-600 text-white shadow-sm border border-blue-700/10'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
                          )}
                        >
                          <TabIcon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isGroupActive ? "text-white" : "text-slate-400")} />
                          <span className="inline">{group.label}</span>
                        </button>
                      );
                    }

                    // Multi-tab group with dropdown & click-to-navigate
                    return (
                      <div key={group.id} className="relative shrink-0">
                        <button
                          onClick={() => setOpenDropdown(isDropdownOpen ? null : group.id)}
                          className={cn(
                            'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 select-none cursor-pointer',
                            isGroupActive
                              ? 'bg-blue-600 text-white shadow-sm border border-blue-700/10'
                              : isDropdownOpen
                              ? 'bg-slate-200 text-slate-900'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
                          )}
                        >
                          <GroupIcon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isGroupActive ? "text-white" : "text-slate-400")} />
                          <span className="inline">{group.label}</span>
                          <ChevronDown className={cn(
                            "w-3.5 h-3.5 transition-transform duration-200 shrink-0",
                            isDropdownOpen && "rotate-180",
                            isGroupActive ? "text-white/90" : "text-slate-400"
                          )} />
                        </button>

                        <AnimatePresence>
                          {isDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.96 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 mt-1.5 min-w-[190px] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 overflow-hidden"
                            >
                              {groupTabs.map((tab) => {
                                const isItemActive = tab.id === activeTab;
                                const ItemIcon = tab.icon;
                                return (
                                  <button
                                    key={tab.id}
                                    onClick={() => {
                                      setOpenDropdown(null);
                                      router.push(`/projects/${projectId}/${tab.id}`);
                                    }}
                                    className={cn(
                                      'flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-left transition-colors cursor-pointer',
                                      isItemActive
                                        ? 'bg-blue-50 text-blue-700 font-bold'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    )}
                                  >
                                    <ItemIcon className={cn("w-3.5 h-3.5 shrink-0", isItemActive ? "text-blue-600" : "text-slate-400")} />
                                    <span>{tab.name}</span>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Row 2: Sub-tabs of Active Group (Nested Sub-Navigation) */}
                {(() => {
                  const activeGroupObj = visibleGroups.find(g => g.tabIds.includes(activeTab as any));
                  const subTabs = visibleTabs.filter(t => activeGroupObj?.tabIds.includes(t.id));
                  if (!subTabs || subTabs.length <= 1) return null;

                  return (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 shrink-0">
                        {activeGroupObj?.label}:
                      </span>
                      {subTabs.map((tab) => {
                        const isSubActive = tab.id === activeTab;
                        const SubIcon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => router.push(`/projects/${projectId}/${tab.id}`)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer',
                              isSubActive
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                            )}
                          >
                            <SubIcon className={cn("w-3 h-3 shrink-0", isSubActive ? "text-white" : "text-slate-500")} />
                            <span>{tab.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
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
                      onClick={() => router.push(`/projects/${projectId}/site-survey`)}
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
            </div>

            <CreateProjectModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onSuccess={fetchProject}
              initialData={project || undefined}
              projectId={projectId}
            />
          </>
        ) : null}
      </SkeletonLoader>
    </Shell>
  );
}

export default function ProjectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <LayoutInner>{children}</LayoutInner>
    </ProjectProvider>
  );
}
