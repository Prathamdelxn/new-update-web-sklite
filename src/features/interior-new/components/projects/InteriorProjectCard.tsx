'use client';

// =============================================================================
// Sky-Lite Web — Interior-OS Compact Modern Project Card
// Clean, sleek, proportionate, and accessible with Bento metric sub-panel.
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  ArrowUpRight,
  User,
  Clock,
  Building2,
  AlertTriangle,
  Layers,
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
    badge: 'bg-amber-50 text-amber-800 border-amber-200/80',
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

  // Date formatting
  const formatDate = (dateVal?: string) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const city = project.location?.city || project.location?.address;

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(project);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="h-full"
    >
      <div
        role="article"
        tabIndex={0}
        aria-label={`Project: ${project.name}, Status: ${health.label}, Progress: ${progressVal}%`}
        onKeyDown={handleKeyDown}
        onClick={() => onOpen(project)}
        className={cn(
          'group relative flex flex-col justify-between h-full',
          'bg-white text-slate-800',
          'border border-slate-200/90 hover:border-blue-400',
          'rounded-xl p-4',
          'shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.02)]',
          'hover:shadow-[0_8px_20px_-4px_rgba(37,99,235,0.1),0_4px_8px_-2px_rgba(0,0,0,0.04)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
          'cursor-pointer transition-all duration-200 select-none space-y-3'
        )}
      >
        {/* Top Header Row: Code + Type + Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200/60">
              {project.code || 'PRJ'}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-[130px]">
              {project.type || 'Fit-Out'}
            </span>
          </div>

          <span
            className={cn(
              'px-2 py-0.5 text-[11px] font-medium rounded-full border inline-flex items-center gap-1.5 shrink-0',
              health.badge
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', health.dot)} />
            {health.label}
          </span>
        </div>

        {/* Project Title & Client/Location Meta */}
        <div className="space-y-1">
          <h3 className="text-[15px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug tracking-tight">
            {project.name}
          </h3>

          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
            {project.client && (
              <span className="flex items-center gap-1 truncate max-w-[130px]" title={project.client}>
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{project.client}</span>
              </span>
            )}
            {project.client && city && <span className="text-slate-300">•</span>}
            {city && (
              <span className="flex items-center gap-1 text-slate-500 truncate max-w-[130px]" title={city}>
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{city}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bento Stats Matrix */}
        <div className="rounded-lg bg-slate-50/80 border border-slate-200/70 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Contract Budget
              </span>
              <span className="text-sm font-bold text-slate-900 leading-tight">
                {formattedBudget}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                Progress
              </span>
              <span className="text-sm font-bold text-slate-900 leading-tight">
                {progressVal}%
              </span>
            </div>
          </div>

          {/* Slim Progress Bar */}
          <div
            role="progressbar"
            aria-valuenow={progressVal}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden"
          >
            <div
              className={cn('h-full rounded-full transition-all duration-500', health.bar)}
              style={{ width: `${Math.max(progressVal, 2)}%` }}
            />
          </div>

          {/* Timeline Row */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-200/50">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Start: {formatDate(project.startDate || project.createdAt)}</span>
            </span>
            {project.endDate && (
              <span className="text-right">
                Target: {formatDate(project.endDate)}
              </span>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(project);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View Project</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                aria-label={`Edit project ${project.name}`}
                title="Edit Project"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                aria-label={`Delete project ${project.name}`}
                title="Delete Project"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project);
                }}
                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InteriorProjectCard;
