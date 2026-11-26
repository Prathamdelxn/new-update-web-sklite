'use client';
import { tr } from '@/i18n';

import React from 'react';
import Link from 'next/link';
import {
  MessageCircle, Pencil, Trash2, AlertCircle,
  Send, ClipboardCheck, Calendar, MapPin, ArrowUpRight,
} from 'lucide-react';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';
import { useRouter } from 'next/navigation';
import { projectCurrency } from '@/lib/projectCurrency';

interface ProjectCardProps {
  project: Project & {
    hasPendingPlans?: boolean;
    siteLocation?: {
      address?: string;
      latitude?: number;
      longitude?: number;
    };
  };
  basePath?: string;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onSendForSurvey?: (project: Project) => void;
  onCompleteSurvey?: (project: Project) => void;
  allUsers?: any[];
}

// Interior project-card colours (on track / attention / problem / done)
const TONES = {
  good: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  warn: { badge: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  bad: { badge: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  done: { badge: 'bg-blue-50 text-blue-700 border-blue-200/80', dot: 'bg-blue-600', bar: 'bg-blue-600' },
};

const STATUS_PROGRESS: Record<string, number> = {
  'Initialized': 5, 'Planning': 15, 'Site Survey': 25, 'Ongoing': 50,
  'Under Snagging': 75, 'Snagging Completed': 90, 'Completed': 100,
  'Pending Handover': 95, 'Handover Rejected': 90, 'Handover Completed': 100,
  'On Hold': 40, 'Cancelled': 0,
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project, basePath = '/construction-dashboard/projects', onEdit, onDelete, onSendForSurvey, onCompleteSurvey, allUsers = [],
}) => {
  // Real progress from the API (work done); the stage table is only a fallback for old data
  const progress = (project as any).progress ?? STATUS_PROGRESS[project.status] ?? 10;
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role?.name === 'admin' || (user as any)?.role === 'admin' || (user as any)?.isAdmin;

  // Resolve category name gracefully
  const categoryName =
    (typeof project.category === 'object' && project.category ? (project.category as any).name : null) ||
    (typeof (project as any).templateCategory === 'object' && (project as any).templateCategory ? (project as any).templateCategory.name : null) ||
    (typeof (project as any).templateId === 'object' && (project as any).templateId?.category?.name ? (project as any).templateId.category.name : null) ||
    (typeof (project as any).templateId === 'object' && (project as any).templateId?.name ? (project as any).templateId.name : null) ||
    (project as any).categoryName ||
    (project as any).customer?.propertyType ||
    (typeof project.category === 'string' && (project.category as string).length < 24 && !/^[0-9a-fA-F]{24}$/.test(project.category) ? project.category : null) ||
    (project as any).projectType ||
    'General Construction';

  const surveyorId = typeof project.siteSurveyor === 'object'
    ? (project.siteSurveyor as any)?._id
    : project.siteSurveyor;
  const isAssignedSurveyor = !!(surveyorId && (user?.id === surveyorId || user?._id === surveyorId));


  const isFinished = project.status === 'Completed' || project.status === 'Handover Completed';

  const locationText =
    (project.siteLocation && typeof project.siteLocation === 'object' && project.siteLocation.address?.trim() ? project.siteLocation.address : null) ||
    (typeof project.siteLocation === 'string' && (project.siteLocation as string).trim() ? project.siteLocation : null) ||
    (project as any).siteAddress ||
    (project as any).location ||
    (project as any).address ||
    (project.description && project.description.trim() ? project.description : null) ||
    'Location not specified';

  // Same look as the Interior project card: status pill in the four interior colours
  const tone =
    isFinished ? TONES.done
    : ['Handover Rejected', 'Cancelled'].includes(project.status) ? TONES.bad
    : ['Under Snagging', 'Snagging Completed', 'On Hold', 'Pending Handover'].includes(project.status) ? TONES.warn
    : TONES.good;

  const budgetNumber =
    Number((project as any).budgetHistory?.[(project as any).budgetHistory.length - 1]?.amount ?? (project as any).budget ?? 0) || 0;
  const formattedBudget = (() => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: projectCurrency(project as any), maximumFractionDigits: 0 }).format(budgetNumber);
    } catch {
      return `${projectCurrency(project as any)} ${budgetNumber.toLocaleString()}`;
    }
  })();

  const fmtDate = (v?: string | Date) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const endDate = fmtDate((project as any).endDate);
  const startDate = fmtDate(project.startDate);
  const createdDate = fmtDate(project.createdAt as any);
  const dateText = endDate ? tr("Due {{date}}", { date: endDate })
    : startDate ? tr("Started {{date}}", { date: startDate })
    : createdDate ? tr("Created {{date}}", { date: createdDate })
    : tr("No target date");

  const subtitle = [project.clientName, locationText !== 'Location not specified' ? locationText : null].filter(Boolean).join(' · ');
  const href = `${basePath}/${project._id}`;
  const code = (project as any).projectCode || (project as any).code;
  const progressVal = Math.min(100, Math.max(0, Math.round(progress)));
  const showSurveyAlert = isAssignedSurveyor && (project.status === 'Site Survey' || project.status === 'Planning') && (project as any).surveyStatus !== 'Approved';

  const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={tr("Project: {{name}}, Status: {{status}}, Progress: {{progress}}%", { name: project.name, status: project.status, progress: progressVal })}
      onClick={() => router.push(href)}
      onMouseEnter={() => router.prefetch(href)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(href); } }}
      className={cn(
        'group relative flex flex-col justify-between h-full',
        'bg-white text-slate-800',
        'border border-slate-200/90 hover:border-blue-400',
        'rounded-2xl p-5 sm:p-6',
        'shadow-2xs hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
        'cursor-pointer transition-all duration-200 select-none space-y-5'
      )}
    >
      {/* Top row: code + type · status pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[0.6875rem] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
            {code ? tr(code) : tr("PRJ")}
          </span>
          <span className="text-xs font-medium text-slate-400 truncate max-w-[9rem]" title={categoryName}>
            {tr(categoryName)}
          </span>
        </div>
        <span className={cn('px-2 py-0.5 text-[0.6875rem] font-semibold rounded-full border inline-flex items-center gap-1.5 shrink-0', tone.badge)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', tone.dot)} />
          {tr(project.status)}
        </span>
      </div>

      {/* Name + client · location */}
      <div className="space-y-1">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug" title={project.name}>
          {tr(project.name)}
        </h3>
        {subtitle && (
          <p className="flex items-center gap-1.5 text-xs sm:text-[0.8125rem] text-slate-500 truncate pt-0.5" title={subtitle}>
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{tr(subtitle)}</span>
          </p>
        )}
        {/* Only when something needs attention */}
        {((!isAdmin && project.hasPendingPlans) || (project as any).projectType === 'Interior' || showSurveyAlert) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            {!isAdmin && project.hasPendingPlans && (
              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold border border-rose-200/80">
                <AlertCircle className="w-3 h-3" />{tr("Action required")}
              </span>
            )}
            {(project as any).projectType === 'Interior' && (
              <span className="bg-purple-50 border border-purple-200/80 text-purple-700 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold">
                {tr("Interior")}
              </span>
            )}
            {showSurveyAlert && (project as any).surveyStatus === 'Needs Attention' && (
              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold border border-rose-200/80">
                <AlertCircle className="w-3 h-3" />{tr("Survey rejected — attention needed")}
              </span>
            )}
            {showSurveyAlert && (project as any).surveyStatus === 'Submitted' && (project as any).surveyRejectionReason && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[0.625rem] font-semibold border border-emerald-200/80">
                <ClipboardCheck className="w-3 h-3" />{tr("Survey resolved — under review")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Budget & progress */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">{tr("Budget")}</span>
            <span className="text-base sm:text-lg font-bold text-slate-900">{tr(formattedBudget)}</span>
          </div>
          <div className="text-end">
            <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">{tr("Progress")}</span>
            <span className="text-sm sm:text-base font-bold text-slate-900">{tr(progressVal)}%</span>
          </div>
        </div>
        <div role="progressbar" aria-valuenow={progressVal} aria-valuemin={0} aria-valuemax={100} className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-500', tone.bar)} style={{ width: `${Math.max(progressVal, 2)}%` }} />
        </div>
      </div>

      {/* Footer: date · actions · View */}
      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs min-w-0 truncate">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{dateText}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {project.needSiteSurvey && !project.siteSurveyor && onSendForSurvey && (
            <button type="button" title={tr("Send for Survey")} onClick={(e) => { stop(e); onSendForSurvey(project); }}
              className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer">
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          {showSurveyAlert && onCompleteSurvey && (
            <button type="button" title={(project as any).surveyStatus ? tr("Edit Survey") : tr("Start Survey")} onClick={(e) => { stop(e); onCompleteSurvey(project); }}
              className="p-1.5 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer">
              <ClipboardCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <Link href={`${href}/chat`} title={tr("Team Chat")} onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer">
            <MessageCircle className="w-3.5 h-3.5" />
          </Link>
          {onEdit && (
            <button type="button" title={tr("Edit Project")} onClick={(e) => { stop(e); onEdit(project); }}
              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button type="button" title={tr("Delete Project")} onClick={(e) => { stop(e); onDelete(project); }}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="w-px h-3 bg-slate-200 mx-0.5" />
          <span className="text-blue-600 font-semibold inline-flex items-center gap-0.5 text-xs group-hover:text-blue-700">
            <span>{tr("View")}</span>
            <ArrowUpRight className="w-3 h-3 rtl:-scale-x-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </div>
      </div>

      {/* Pending plans dot */}
      {project.hasPendingPlans && (
        <span className="absolute top-2.5 end-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse pointer-events-none" />
      )}
    </div>
  );
};