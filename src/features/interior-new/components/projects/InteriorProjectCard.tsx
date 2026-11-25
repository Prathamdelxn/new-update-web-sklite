'use client';
import { tr } from '@/i18n';

// =============================================================================
// Sky-Lite Web — Interior-OS Modern Streamlined Project Card
// Optimized, clean, lightweight UI with essential metrics and zero visual clutter.
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Pencil,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InteriorProject {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  type?: string;
  client?: string;
  status?: string;
  health?: 'on-track' | 'at-risk' | 'delayed' | 'completed' | string;
  progress?: number;
  budget?: number | { amount?: number };
  totalBudget?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  location?: {
    city?: string;
    address?: string;
  };
  openSnags?: number;
  openRFIs?: number;
}

interface InteriorProjectCardProps {
  project: InteriorProject;
  index?: number;
  onOpen: (project: InteriorProject) => void;
  onEdit?: (project: InteriorProject) => void;
  onDelete?: (project: InteriorProject) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  formatCurrency?: (amount: number) => string;
}

// Compact Health Config with WCAG AA Contrast
const healthConfig = {
  'on-track': {
    label: 'On Track',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  'at-risk': {
    label: 'At Risk',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  delayed: {
    label: 'Delayed',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dot: 'bg-blue-600',
    bar: 'bg-blue-600',
  },
};

export const InteriorProjectCard: React.FC<InteriorProjectCardProps> = ({
  project,
  index = 0,
  onOpen,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  formatCurrency,
}) => {
  // Extract budget number
  const budgetNumber = React.useMemo(() => {
    if (typeof project.budget === 'number') return project.budget;
    if (typeof project.budget?.amount === 'number') return project.budget.amount;
    if (typeof project.totalBudget === 'number') return project.totalBudget;
    const parsed = Number(project.budget?.amount || project.budget || project.totalBudget || 0);
    return isNaN(parsed) ? 0 : parsed;
  }, [project]);

  // Budget display string
  const formattedBudget = React.useMemo(() => {
    if (formatCurrency) return formatCurrency(budgetNumber);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(budgetNumber);
  }, [budgetNumber, formatCurrency]);

  // Progress percentage (bounded 0 - 100)
  const progressVal = Math.min(Math.max(Math.round(project.progress || 0), 0), 100);

  // Health type resolution
  const healthType =
    project.status === 'completed' || progressVal === 100
      ? 'completed'
      : (project.health as keyof typeof healthConfig) || 'on-track';

  const health = healthConfig[healthType] || healthConfig['on-track'];

  // Clean date formatter
  const formatDate = (dateVal?: string) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Single meaningful deadline / date to avoid visual clutter
  const deadlineText = React.useMemo(() => {
    if (project.endDate) {
      const formatted = formatDate(project.endDate);
      if (formatted) return `Due ${formatted}`;
    }
    if (project.startDate) {
      const formatted = formatDate(project.startDate);
      if (formatted) return `Started ${formatted}`;
    }
    if (project.createdAt) {
      const formatted = formatDate(project.createdAt);
      if (formatted) return `Created ${formatted}`;
    }
    return 'No target date';
  }, [project.endDate, project.startDate, project.createdAt]);

  const city = project.location?.city || project.location?.address;
  const clientSubtitle = [project.client, city].filter(Boolean).join(' · ');

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(project);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.2 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="h-full"
    >
      <div
        role="article"
        tabIndex={0}
        aria-label={tr("Project: {{name}}, Status: {{label}}, Progress: {{progressVal}}%", { name: project.name, label: health.label, progressVal: progressVal })}
        onKeyDown={handleKeyDown}
        onClick={() => onOpen(project)}
        className={cn(
          'group relative flex flex-col justify-between h-full',
          'bg-white text-slate-800',
          'border border-slate-200/90 hover:border-blue-400',
          'rounded-2xl p-5 sm:p-6',
          'shadow-2xs hover:shadow-md hover:shadow-blue-500/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
          'cursor-pointer transition-all duration-200 select-none space-y-5'
        )}
      >
        {/* Top Row: Monospace Code + Type + Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[0.6875rem] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
              {project.code || tr("PRJ")}
            </span>
            {project.type && (
              <span className="text-xs font-medium text-slate-400 truncate max-w-[7.5rem]" title={project.type}>
                {tr(project.type)}
              </span>
            )}
          </div>

          <span
            className={cn(
              'px-2 py-0.5 text-[0.6875rem] font-semibold rounded-full border inline-flex items-center gap-1.5 shrink-0',
              health.badge
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', health.dot)} />
            {tr(health.label)}
          </span>
        </div>

        {/* Project Title & Client/Location Subtitle */}
        <div className="space-y-1">
          <h3
            className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
            title={project.name}
          >
            {tr(project.name)}
          </h3>
          {clientSubtitle && (
            <p className="flex items-center gap-1.5 text-xs sm:text-[0.8125rem] text-slate-500 truncate pt-0.5" title={clientSubtitle}>
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{tr(clientSubtitle)}</span>
            </p>
          )}
        </div>

        {/* Essential Metrics: Budget & Progress (Clean & Modern, No Box-in-Box) */}
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                {tr("Budget")}
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-900">
                {tr(formattedBudget)}
              </span>
            </div>

            <div className="text-end">
              <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                {tr("Progress")}
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900">
                {tr(progressVal)}%
              </span>
            </div>
          </div>

          {/* Slim Progress Bar */}
          <div
            role="progressbar"
            aria-valuenow={progressVal}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"
          >
            <div
              className={cn('h-full rounded-full transition-all duration-500', health.bar)}
              style={{ width: `${Math.max(progressVal, 2)}%` }}
            />
          </div>
        </div>

        {/* Clean Footer Row: Single Deadline on Left + Actions on Right */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs min-w-0 truncate">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{tr(deadlineText)}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canEdit && onEdit && (
              <button
                type="button"
                aria-label={tr("Edit project {{name}}", { name: project.name })}
                title={tr("Edit Project")}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {canDelete && onDelete && (
              <button
                type="button"
                aria-label={tr("Delete project {{name}}", { name: project.name })}
                title={tr("Delete Project")}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project);
                }}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="w-px h-3 bg-slate-200 mx-0.5" />

            <span className="text-blue-600 font-semibold inline-flex items-center gap-0.5 text-xs group-hover:text-blue-700">
              <span>{tr("View")}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InteriorProjectCard;
