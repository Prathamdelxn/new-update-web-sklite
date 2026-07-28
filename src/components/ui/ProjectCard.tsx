'use client';

import React from 'react';
import Link from 'next/link';
import {
  MessageCircle, Pencil, Trash2, AlertCircle,
  Send, ClipboardCheck, Calendar, Users, MapPin,
} from 'lucide-react';
import { Project } from '@/types';
import { GlassCard } from './GlassCard';
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
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onSendForSurvey?: (project: Project) => void;
  onCompleteSurvey?: (project: Project) => void;
  allUsers?: any[];
}

const statusColors: Record<string, string> = {
  'Initialized':         'bg-blue-50 text-blue-750 border-blue-200/60',
  'Planning':            'bg-purple-50 text-purple-755 border-purple-200/60',
  'Site Survey':         'bg-cyan-50 text-cyan-755 border-cyan-200/60',
  'Ongoing':             'bg-emerald-50 text-emerald-755 border-emerald-200/60',
  'Under Snagging':      'bg-amber-50 text-amber-755 border-amber-200/60',
  'Snagging Completed':  'bg-orange-50 text-orange-755 border-orange-200/60',
  'Completed':           'bg-green-50 text-green-755 border-green-200/60',
  'Pending Handover':    'bg-violet-50 text-violet-755 border-violet-200/60',
  'Handover Rejected':   'bg-rose-50 text-rose-755 border-rose-200/60',
  'Handover Completed':  'bg-teal-50 text-teal-755 border-teal-200/60',
  'On Hold':             'bg-slate-100 text-slate-700 border-slate-200/60',
  'Cancelled':           'bg-red-50 text-red-755 border-red-200/60',
};

const STATUS_PROGRESS: Record<string, number> = {
  'Initialized': 5, 'Planning': 15, 'Site Survey': 25, 'Ongoing': 50,
  'Under Snagging': 75, 'Snagging Completed': 90, 'Completed': 100,
  'Pending Handover': 95, 'Handover Rejected': 90, 'Handover Completed': 100,
  'On Hold': 40, 'Cancelled': 0,
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project, onEdit, onDelete, onSendForSurvey, onCompleteSurvey, allUsers = [],
}) => {
  const progress = STATUS_PROGRESS[project.status] ?? 10;
  const { user } = useAuth();
  const isAdmin = user?.role?.name === 'admin' || (user as any)?.role === 'admin' || (user as any)?.isAdmin;

  const categoryName = typeof project.category === 'string'
    ? project.category
    : (project.category as any)?.name || '';

  const surveyorId = typeof project.siteSurveyor === 'object'
    ? (project.siteSurveyor as any)?._id
    : project.siteSurveyor;
  const isAssignedSurveyor = !!(surveyorId && (user?.id === surveyorId || user?._id === surveyorId));

  const statusColor = statusColors[project.status] || 'text-blue-700 bg-blue-100 border-blue-200';
  const endDate = project.endDate ? new Date(project.endDate) : null;
  const isOverdue = endDate && endDate < new Date() && project.status !== 'Completed' && project.status !== 'Handover Completed' && project.status !== 'Cancelled';

  // Standardize progress color
  const isFinished = project.status === 'Completed' || project.status === 'Handover Completed';
  const progressColorClass = isFinished ? 'bg-emerald-500' : 'bg-blue-600';

  return (
    <div
      className="group hover:border-blue-200 hover:shadow-md transition-all duration-300 flex flex-col h-full shadow-sm relative p-0 overflow-hidden rounded-xl bg-white border border-gray-200"
    >
      <Link href={`/projects/${project._id}`} className="flex flex-col flex-1 outline-none">
        
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-4 border-b border-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 block truncate">
                {categoryName || 'General'}
              </span>
              <h3 className="text-base font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug tracking-tight mt-0.5">
                {project.name}
              </h3>
            </div>
          </div>
          <span className={cn(
            'px-2 py-1 rounded-md text-[9px] font-medium uppercase tracking-wider border shrink-0',
            statusColor
          )}>
            {project.status?.replace(/ /g, '')}
          </span>
        </div>

        {/* ── White Body ── */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Location + Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[50%]">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{project.description || 'Global Site'}</span>
              </div>
              
              {(project as any).projectCode && (
                <div className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500">
                  {(project as any).projectCode}
                </div>
              )}
              
              {!isAdmin && project.hasPendingPlans && (
                <div className="bg-red-50 border border-red-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-red-600">
                  ACTION REQUIRED
                </div>
              )}
              
              {(project as any).projectType === 'Interior' && (
                <div className="bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-purple-600">
                  INTERIOR
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-slate-500 tracking-wider">PROGRESS</span>
                <span className="text-[10px] font-semibold text-slate-700">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', progressColorClass)}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Surveyor Alerts */}
            {isAssignedSurveyor && (project.status === 'Site Survey' || project.status === 'Planning') && (project as any).surveyStatus !== 'Approved' && (
              <div className="flex flex-col gap-1.5 mt-2">
                {(project as any).surveyStatus === 'Needs Attention' && (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 p-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-[10px] font-bold text-red-600">Survey Rejected</span>
                  </div>
                )}
                {(project as any).surveyStatus === 'Submitted' && (project as any).surveyRejectionReason && (
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 p-2 rounded-lg">
                    <ClipboardCheck className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[10px] font-bold text-green-600">Rejection Resolved</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* ── Footer Actions ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
        
        {/* Date */}
        <div className="flex items-center gap-1.5 text-blue-500">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">
            {project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {project.needSiteSurvey && !project.siteSurveyor && onSendForSurvey && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSendForSurvey(project); }}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-600 hover:bg-blue-100 transition-colors"
              title="Send for Survey"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}

          {isAssignedSurveyor && (project.status === 'Site Survey' || project.status === 'Planning') && (project as any).surveyStatus !== 'Approved' && onCompleteSurvey && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCompleteSurvey(project); }}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-600 hover:bg-blue-100 transition-colors"
              title={(project as any).surveyStatus ? 'Edit Survey' : 'Start Survey'}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/projects/${project._id}/chat`; }}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors relative"
            title="Chat"
          >
            <MessageCircle className="w-4 h-4" />
            {/* If there were unread messages, add a badge here */}
          </button>

          {onEdit && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(project); }}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(project); }}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pending plans badge top-right floating */}
      {project.hasPendingPlans && (
        <div className="absolute top-2 right-2 w-4.5 h-4.5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse pointer-events-none z-10">
          <AlertCircle className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
};
