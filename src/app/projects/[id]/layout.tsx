'use client';
import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Shell } from '@/components/layouts/Shell';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ProjectProvider, useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { cn } from '@/lib/utils';
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
  { id: 'plans',        name: 'Drawings',       icon: Map },
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const visibleTabs = getVisibleTabs(project?.projectType, project?.siteSurveyor);
  const activeTab = (ALL_TABS as readonly { id: string }[]).find(t => pathname.includes(`/${t.id}`))?.id || 'dashboard';

  const isSurveyPending = project?.status === 'Site Survey' || (project?.status === 'Initialized' && project?.needSiteSurvey);
  const isRestrictedTab = isSurveyPending && RESTRICTED_TABS.includes(activeTab);

  const headerContent = project ? (
    <div className="flex items-center justify-between w-full pr-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => router.push('/projects')}
          className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-200 shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-extrabold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md">
          {project.name}
        </h1>
        <span className={cn(
          'shrink-0 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border',
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
      <button
        onClick={() => setIsEditModalOpen(true)}
        title="Edit project"
        className="shrink-0 p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-95 transition-all duration-200 cursor-pointer"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  return (
    <Shell headerContent={headerContent}>
      <SkeletonLoader loading={loading} preset="detail">
        {!project && !loading ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
            <button
              onClick={() => router.push('/projects')}
              className="mt-4 text-blue-600 font-medium hover:text-blue-700"
            >
              Back to Projects
            </button>
          </div>
        ) : project ? (
          <>
            <div className="space-y-0">
              {/* ── Navigation card ── */}
              <div className="bg-white/85 backdrop-blur-md border border-slate-200/60 rounded-2xl p-1.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] mb-5">
                {/* Row 2: All Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  {visibleTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => router.push(`/projects/${projectId}/${tab.id}`)}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 select-none cursor-pointer',
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm border border-blue-700/10'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
                        )}
                      >
                        <TabIcon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                        <span className="inline">{tab.name}</span>
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
