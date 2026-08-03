'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Shell } from '@/components/layouts/Shell';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { ProjectProvider, useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { useAuth } from '@/providers/AuthContext';
import { cn } from '@/lib/utils';
import {
  Info, FileText, DollarSign, Package, Files, Map,
  AlertCircle, ShieldAlert, Calendar,
  TrendingUp, ClipboardList, CreditCard,
  ChevronLeft, Pencil, MessageSquare,
  ClipboardCheck, History, LayoutGrid, Sofa, LayoutDashboard, Clock,
  Lock, ArrowRight
} from 'lucide-react';

// ── Interior Tabs List (Interior-First Order) ─────────────────────
const INTERIOR_TABS = [
  { id: 'details',      name: 'Details',        icon: Info },
  { id: 'site-survey',  name: 'Survey',         icon: ClipboardList },
  { id: 'rooms',        name: 'Rooms',          icon: LayoutGrid },
  { id: 'ffe',          name: 'FFE',            icon: Sofa },
  { id: 'plans',        name: 'Drawings',       icon: Map },
  { id: 'boq',          name: 'BOQ',            icon: FileText },
  { id: 'materials',    name: 'Material',       icon: Package },
  { id: 'milestones',   name: 'Milestones',     icon: Calendar },
  { id: 'issues',       name: 'Snags',          icon: AlertCircle },
  { id: 'transactions', name: 'Transactions',   icon: CreditCard },
  { id: 'documents',    name: 'Documents',      icon: Files },
  { id: 'attendance',   name: 'Attendance',     icon: Clock },
  { id: 'reports',      name: 'Reports',        icon: TrendingUp },
  { id: 'handover',     name: 'Handover',       icon: ClipboardCheck },
  { id: 'chat',         name: 'Chat',           icon: MessageSquare },
] as const;

const statusBadgeColor: Record<string, string> = {
  'Initialized':         'bg-blue-50/80 text-blue-700 border-blue-200/60',
  'Planning':            'bg-purple-50/80 text-purple-700 border-purple-200/60',
  'Site Survey':         'bg-cyan-50/80 text-cyan-700 border-cyan-200/60',
  'Ongoing':             'bg-emerald-50/80 text-emerald-700 border-emerald-200/60',
  'Under Snagging':      'bg-amber-50/80 text-amber-700 border-amber-200/60',
  'Snagging Completed':  'bg-orange-50/80 text-orange-700 border-orange-200/60',
  'Completed':           'bg-green-50/80 text-green-700 border-green-200/60',
  'Pending Handover':    'bg-violet-50/80 text-violet-700 border-violet-200/60',
  'Handover Rejected':   'bg-rose-50/80 text-rose-700 border-rose-200/60',
  'Handover Completed':  'bg-teal-50/80 text-teal-700 border-teal-200/60',
  'On Hold':             'bg-slate-50 text-slate-600 border-slate-200/60',
  'Cancelled':           'bg-red-50/80 text-red-700 border-red-200/60',
};

const RESTRICTED_TABS = [
  'plans', 'rooms', 'ffe', 'boq', 'milestones', 'materials', 'transactions', 'issues', 'handover', 'attendance', 'reports'
];

function InteriorLayoutInner({ children }: { children: React.ReactNode }) {
  const { project, loading, fetchProject, projectId } = useProjectContext();
  const router = useRouter();
  const pathname = usePathname();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const activeTab = (INTERIOR_TABS as readonly { id: string }[]).find(t => pathname.includes(`/${t.id}`))?.id || 'details';
  const isSurveyPending = (project?.status === 'Site Survey' || (project?.status === 'Initialized' && project?.needSiteSurvey)) && (project as any)?.surveyStatus !== 'Approved';
  const isRestrictedTab = isSurveyPending && RESTRICTED_TABS.includes(activeTab);

  const headerContent = project ? (
    <div className="flex items-center justify-between w-full pr-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => router.push('/interior/projects')}
          className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
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
        <span className="hidden md:inline shrink-0 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border bg-blue-50 text-blue-700 border-blue-200/80">
          Interior Fit-out
        </span>
      </div>
      <button
        onClick={() => setIsEditModalOpen(true)}
        title="Edit project"
        className="shrink-0 p-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-100 shadow-xs active:scale-95 transition-all cursor-pointer"
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
            <h2 className="text-2xl font-bold text-gray-900">Interior Project not found</h2>
            <button
              onClick={() => router.push('/interior/projects')}
              className="mt-4 text-blue-600 font-medium hover:text-blue-700"
            >
              Back to Interior Projects
            </button>
          </div>
        ) : project ? (
          <>
            <div className="space-y-0">
              {/* Navigation Card */}
              <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl p-1 shadow-xs mb-3">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                  {INTERIOR_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => router.push(`/interior/projects/${projectId}/${tab.id}`)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 select-none cursor-pointer',
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs border border-blue-700/20'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
                        )}
                      >
                        <TabIcon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400")} />
                        <span>{tab.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isRestrictedTab ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xs mt-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-slate-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Section Locked</h2>
                  <p className="text-slate-500 text-sm max-w-sm text-center mb-6">
                    Please complete and approve the Site Survey to unlock this interior section.
                  </p>
                  <button
                    onClick={() => router.push(`/interior/projects/${projectId}/site-survey`)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-xs"
                  >
                    <span>Go to Site Survey</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
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

export default function InteriorProjectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <InteriorLayoutInner>{children}</InteriorLayoutInner>
    </ProjectProvider>
  );
}
