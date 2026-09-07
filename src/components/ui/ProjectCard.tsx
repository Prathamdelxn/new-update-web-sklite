'use client';

import React from 'react';
import Link from 'next/link';
import {
  MessageCircle, Pencil, Trash2, AlertCircle,
  Send, ClipboardCheck, Calendar, MapPin, Layers,
  CheckCircle2, Clock, Target, Building2, 
  Briefcase, FolderOpen, ArrowUpRight
} from 'lucide-react';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthContext';

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

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  'Initialized': { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', icon: Clock },
  'Planning': { color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', icon: Target },
  'Site Survey': { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', icon: MapPin },
  'Ongoing': { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: Briefcase },
  'Under Snagging': { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: AlertCircle },
  'Snagging Completed': { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: CheckCircle2 },
  'Completed': { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle2 },
  'Pending Handover': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: FolderOpen },
  'Handover Rejected': { color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', icon: AlertCircle },
  'Handover Completed': { color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', icon: CheckCircle2 },
  'On Hold': { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Clock },
  'Cancelled': { color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', icon: AlertCircle },
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
  const progress = STATUS_PROGRESS[project.status] ?? (project as any).progress ?? 10;
  const { user } = useAuth();
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

  const statusStyle = statusConfig[project.status] || {
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    icon: Target
  };
  const StatusIcon = statusStyle.icon;

  const isFinished = project.status === 'Completed' || project.status === 'Handover Completed';

  const locationText =
    (project.siteLocation && typeof project.siteLocation === 'object' && project.siteLocation.address?.trim() ? project.siteLocation.address : null) ||
    (typeof project.siteLocation === 'string' && (project.siteLocation as string).trim() ? project.siteLocation : null) ||
    (project as any).siteAddress ||
    (project as any).location ||
    (project as any).address ||
    (project.description && project.description.trim() ? project.description : null) ||
    'Location not specified';

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200/90 hover:border-indigo-400/80 hover:shadow-md transition-all duration-200 flex flex-col h-full overflow-hidden">
      
      {/* Top Accent Stripe on hover */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <Link href={`${basePath}/${project._id}`} className="flex flex-col flex-1 p-4 pb-3 outline-none">
        
        {/* ── Top Header Row ── */}
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Building Icon Avatar */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 border border-indigo-100/90 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-indigo-300 group-hover:bg-indigo-50 transition-all shadow-2xs">
              <Building2 className="w-4 h-4 text-indigo-600 group-hover:text-indigo-700 transition-colors" />
            </div>
            
            {/* Title & Category Subtitle */}
            <div className="min-w-0 flex-1">
              <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                {project.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  {categoryName}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div 
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0 shadow-2xs"
            style={{
              backgroundColor: statusStyle.bg,
              color: statusStyle.color,
              border: `1px solid ${statusStyle.border}`
            }}
          >
            <StatusIcon className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[85px]">{project.status}</span>
          </div>
        </div>

        {/* ── Location Row ── */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50/80 rounded-lg px-2.5 py-1.5 border border-slate-100 mb-2.5 font-medium">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate text-[11.5px]" title={locationText}>{locationText}</span>
        </div>

        {/* ── Meta Badges Row ── */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {(project as any).projectCode && (
            <span className="inline-flex items-center gap-1 bg-slate-100/90 text-slate-600 px-2 py-0.5 rounded text-[9.5px] font-bold tracking-wide border border-slate-200/70">
              <FolderOpen className="w-2.5 h-2.5 text-slate-400" />
              {(project as any).projectCode}
            </span>
          )}

          {project.clientName && (
            <span className="inline-flex items-center bg-slate-100/80 text-slate-600 px-2 py-0.5 rounded text-[9.5px] font-bold tracking-wide border border-slate-200/60 truncate max-w-[120px]" title={project.clientName}>
              Client: {project.clientName}
            </span>
          )}

          {!isAdmin && project.hasPendingPlans && (
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[9.5px] font-extrabold tracking-wide border border-rose-200/80 animate-pulse">
              <AlertCircle className="w-2.5 h-2.5" />
              ACTION REQ
            </span>
          )}

          {(project as any).projectType === 'Interior' && (
            <span className="bg-purple-50 border border-purple-200/80 text-purple-600 px-2 py-0.5 rounded text-[9.5px] font-extrabold tracking-wide">
              INTERIOR
            </span>
          )}

          {isFinished && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[9.5px] font-bold border border-emerald-200/80">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Done
            </span>
          )}
        </div>

        {/* ── Progress Section ── */}
        <div className="mt-auto pt-2.5 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Progress</span>
            <span className={cn(
              "font-extrabold tabular-nums text-xs",
              isFinished ? "text-emerald-600" : "text-indigo-600"
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isFinished
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600'
              )}
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
        </div>

        {/* Surveyor Alert */}
        {isAssignedSurveyor && (project.status === 'Site Survey' || project.status === 'Planning') && (project as any).surveyStatus !== 'Approved' && (
          <div className="mt-2.5">
            {(project as any).surveyStatus === 'Needs Attention' && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 p-1.5 rounded-lg text-[10.5px] font-bold text-rose-700">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="truncate">Survey Rejected — Attention needed</span>
              </div>
            )}
            {(project as any).surveyStatus === 'Submitted' && (project as any).surveyRejectionReason && (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 p-1.5 rounded-lg text-[10.5px] font-bold text-emerald-700">
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Survey Resolved — Under review</span>
              </div>
            )}
          </div>
        )}
      </Link>

      {/* ── Footer Action Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/60">
        
        {/* Date */}
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate text-[10.5px]">
            {project.startDate
              ? new Date(project.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : (project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {project.needSiteSurvey && !project.siteSurveyor && onSendForSurvey && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendForSurvey(project); }}
              className="w-7.5 h-7.5 flex items-center justify-center rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200/80 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Send for Survey"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}

          {isAssignedSurveyor && (project.status === 'Site Survey' || project.status === 'Planning') && (project as any).surveyStatus !== 'Approved' && onCompleteSurvey && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCompleteSurvey(project); }}
              className="w-7.5 h-7.5 flex items-center justify-center rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200/80 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title={(project as any).surveyStatus ? 'Edit Survey' : 'Start Survey'}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
            </button>
          )}

          <Link
            href={`${basePath}/${project._id}/chat`}
            onClick={(e) => e.stopPropagation()}
            className="w-7.5 h-7.5 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200/90 hover:border-emerald-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Team Chat"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </Link>

          {onEdit && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}
              className="w-7.5 h-7.5 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/90 hover:border-indigo-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Edit Project"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(project); }}
              className="w-7.5 h-7.5 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/90 hover:border-rose-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

        
        </div>
      </div>

      {/* Floating Action Beacon if pending plans */}
      {project.hasPendingPlans && (
        <div className="absolute top-2.5 right-2.5 w-3 h-3 bg-rose-500 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse pointer-events-none z-10">
          <AlertCircle className="w-2 h-2 text-white" />
        </div>
      )}
    </div>
  );
};