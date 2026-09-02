'use client';

// Port of interior-os-frontend's projects/[projectId]/layout.tsx banner + tab
// nav, minus the permission-based tab filtering (no project-membership system
// ported yet — all tabs are shown to any authenticated interior-os user).

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Folder, Calendar, MapPin, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteriorProjectBannerProps {
  projectId: string;
  project: any;
  loading?: boolean;
}

function SkeletonBar({ className }: { className?: string }) {
  return <span className={cn('inline-block bg-[hsl(var(--muted))] rounded animate-pulse', className)} />;
}

const CATEGORIES = (projectId: string) => [
  {
    name: 'General',
    icon: '📋',
    items: [
      { label: 'Overview', href: `/interior-new/projects/${projectId}`, exact: true },
      { label: 'File Management', href: `/interior-new/projects/${projectId}/filemgt` },
            { label: 'Site Details', href: `/interior-new/projects/${projectId}/sitedetails` },

      { label: 'Quotation', href: `/interior-new/projects/${projectId}/quotation` },
            { label: 'Team & Members', href: `/interior-new/projects/${projectId}/members` },

    ],
  },
   {
    name: 'Site Assets',
    icon: '📂',
    items: [
      { label: 'Drawings', href: `/interior-new/projects/${projectId}/drawings` },
      { label: 'RFIs Tracker', href: `/interior-new/projects/${projectId}/rfis` },
      // { label: 'Utility Checks', href: `/interior-new/projects/${projectId}/utilities` },
    ],
  },
  {
    name: 'Execution',
    icon: '📐',
    items: [
      { label: 'WBS Hierarchy', href: `/interior-new/projects/${projectId}/wbs` },
      { label: 'Milestones', href: `/interior-new/projects/${projectId}/milestones` },
      { label: 'Tasks', href: `/interior-new/projects/${projectId}/tasks` },
      { label: 'DPR Log', href: `/interior-new/projects/${projectId}/dpr` },
      { label: 'Weekly Reports', href: `/interior-new/projects/${projectId}/weekly-reports` },
      { label: 'MOM', href: `/interior-new/projects/${projectId}/mom` },
      { label: 'Timeline (Gantt)', href: `/interior-new/projects/${projectId}/timeline` },
    ],
  },
  {
    name: 'Commercials',
    icon: '💰',
    items: [
      { label: 'Bills of Quantity (BOQ)', href: `/interior-new/projects/${projectId}/boq` },
      { label: 'Variation Orders', href: `/interior-new/projects/${projectId}/variation-orders` },
      { label: 'Procurement', href: `/interior-new/projects/${projectId}/procurement` },
      { label: 'Vendors', href: `/interior-new/projects/${projectId}/vendors` },
      { label: 'Payments', href: `/interior-new/projects/${projectId}/payments` },
    ],
  },
  {
    name: 'Quality & Safety',
    icon: '🔍',
    items: [
      { label: 'Snags Logger', href: `/interior-new/projects/${projectId}/snags` },
      { label: 'Risks Matrix', href: `/interior-new/projects/${projectId}/risks` },
    ],
  },
 
  {
    name: 'Handover',
    icon: '🔑',
    items: [
      { label: 'Project Handover', href: `/interior-new/projects/${projectId}/handover` },
    ],
  },
];

export function InteriorProjectBanner({ projectId, project, loading }: InteriorProjectBannerProps) {
  const pathname = usePathname();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = CATEGORIES(projectId);

  return (
    <div className="px-3.5 sm:px-6 pt-3.5 sm:pt-6 pb-0 lg:px-8 lg:pt-8 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] space-y-3 sm:space-y-4">
      <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
        <Link href="/interior-new/projects" className="hover:text-[hsl(var(--primary))] transition-colors">
          Projects
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {loading ? <SkeletonBar className="h-3.5 w-14" /> : <span className="font-medium text-[hsl(var(--foreground))]">{project?.code}</span>}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
            <Folder className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            {loading ? (
              <SkeletonBar className="h-6 w-48" />
            ) : (
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight truncate">{project?.name}</h1>
            )}
            <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium mt-0.5">
              {loading ? (
                <SkeletonBar className="h-3 w-28" />
              ) : (
                <>Client: <span className="text-[hsl(var(--foreground))]">{project?.client}</span></>
              )}
            </p>
          </div>
        </div>

        {!loading && (
          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-center flex-wrap">
            {project?.health && (
              <span
                className={cn(
                  'px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full border capitalize',
                  project.health === 'on-track' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  project.health === 'at-risk' && 'bg-amber-50 text-amber-700 border-amber-200',
                  project.health === 'delayed' && 'bg-red-50 text-red-700 border-red-200'
                )}
              >
                {project.healthLabel || project.health.replace('-', ' ')}
              </span>
            )}
            <span
              className={cn(
                'px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full border',
                project?.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              )}
            >
              {project?.status === 'active' ? 'Active' : 'On Hold'}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5 pt-1 text-xs text-[hsl(var(--muted-foreground))]">
        {loading ? (
          <SkeletonBar className="h-3.5 w-64" />
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
              {project?.location?.city || project?.location?.address ? `${project.location.city || project.location.address}, ${project.location.country || 'India'}` : 'Location not set'}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
              {project?.startDate && project?.endDate
                ? `${new Date(project.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(project.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : 'Dates not set'}
            </div>
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
              {project?.type || 'General Fit-out'}
            </div>
          </>
        )}
      </div>

      <div ref={containerRef} className="flex items-center gap-x-4 sm:gap-x-6 gap-y-2 pt-2.5 sm:pt-4 border-b border-[hsl(var(--border))] pb-2 overflow-x-auto scrollbar-none touch-pan-x flex-nowrap">
        {categories.map((cat) => {
          const isActive = cat.items.some((item) => ('exact' in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/')));

          return (
            <div key={cat.name} className="relative shrink-0">
              <button
                onClick={() => setOpenCategory(openCategory === cat.name ? null : cat.name)}
                className={cn(
                  'relative pb-2.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap focus:outline-none',
                  isActive ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', openCategory === cat.name && 'rotate-180')} />
                {isActive && <motion.div layoutId="activeProjectTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))]" />}
              </button>

              <AnimatePresence>
                {openCategory === cat.name && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-w-[calc(100vw-32px)] py-1 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))]"
                  >
                    {cat.items.map((item) => {
                      const itemActive = 'exact' in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenCategory(null)}
                          className={cn(
                            'flex items-center w-full px-3.5 py-2 text-xs sm:text-sm transition-colors hover:bg-[hsl(var(--muted)/0.5)]',
                            itemActive ? 'text-[hsl(var(--primary))] font-semibold bg-[hsl(var(--muted)/0.25)]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
