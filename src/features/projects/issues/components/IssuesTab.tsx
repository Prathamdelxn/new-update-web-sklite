'use client';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Clock,
  User,
  CheckCircle2,
  ChevronRight,
  Loader2,
  GitBranch,
  Pencil,
  Trash2,
  Calendar,
  Wrench,
  CheckCircle,
  ClipboardList,
  Eye,
  Lock,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission } from '@/lib/permissions';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { IssueModal } from '@/features/projects/issues/components/IssueModal';
import { IssueDetailModal } from '@/features/projects/issues/components/IssueDetailModal';
import { EscalationMatrixModal } from '@/features/projects/components/EscalationMatrixModal';
import { AssignSnagModal } from '@/features/projects/issues/components/AssignSnagModal';
import { CompleteSnagModal } from '@/features/projects/issues/components/CompleteSnagModal';

interface IssuesTabProps {
  projectId: string;
  initialType?: 'Issue' | 'Snag';
}

const STATUS_FILTERS = ['All', 'Open', 'In Progress', 'Escalated', 'Resolved', 'Closed', 'My Task'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export const IssuesTab: React.FC<IssuesTabProps> = ({ projectId, initialType = 'Issue' }) => {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<'Issue' | 'Snag'>(initialType);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [isEscalationOpen, setIsEscalationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [escalationMatrix, setEscalationMatrix] = useState<any>(null);

  // Snag specific modals
  const [assigningSnag, setAssigningSnag] = useState<any>(null);
  const [completingSnag, setCompletingSnag] = useState<any>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const toast = useToast();
  const { user } = useAuth();
  const { project, fetchProject } = useProjectContext();

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const endpoint = activeType === 'Snag'
        ? `/projects/${projectId}/snags`
        : `/projects/${projectId}/issues`;
      const response = await api.get(endpoint);
      setIssues(response.data || []);
    } catch (error) {
      toast.error(`Failed to load ${activeType.toLowerCase()}s`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEscalationMatrix = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/escalation-matrix`);
      if (response.data && response.data.levels && response.data.levels.length > 0) {
        const isSaved = !!(response.data._id || response.data.createdAt);
        if (isSaved) {
          setEscalationMatrix(response.data);
          return;
        }
      }
      setEscalationMatrix(null);
    } catch (error) {
      console.error('Failed to load escalation matrix:', error);
      setEscalationMatrix(null);
    }
  };

  useEffect(() => {
    if (activeType === 'Snag' && statusFilter === 'Escalated') {
      setStatusFilter('All');
    }
    fetchIssues();
  }, [projectId, activeType]);

  const handleDeleteIssue = async (e: React.MouseEvent, issueId: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete this ${activeType.toLowerCase()}? This cannot be undone.`)) return;
    setDeletingId(issueId);
    try {
      const endpoint = activeType === 'Snag' ? `/snags/${issueId}` : `/issues/${issueId}`;
      await api.delete(endpoint);
      toast.success(`${activeType} deleted`);
      fetchIssues();
    } catch (error: any) {
      if (error.response?.status >= 500) {
        toast.success(`${activeType} deleted`);
        fetchIssues();
      } else {
        toast.error(error.response?.data?.message || `Failed to delete ${activeType.toLowerCase()}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssignSnagForFixing = async (assignedUser: any) => {
    if (!assigningSnag) return;
    try {
      // 1. Update snag to "In Progress" and set assignedTo
      await api.patch(`/snags/${assigningSnag._id}`, {
        status: 'In Progress',
        assignedTo: assignedUser._id,
        resolutionDetails: `Assigned to ${assignedUser.name} for snag rectification.`
      });

      // 2. Update project status to "Ongoing" (or log status audit details)
      await api.patch(`/projects/${projectId}`, {
        auditAction: 'StatusChange',
        auditDetails: `Snag "${assigningSnag.title}" sent for fixing.`
      });

      toast.success('Snag assigned for fixing successfully!');
      setAssigningSnag(null);
      fetchIssues();
      fetchProject();
    } catch (error) {
      toast.error('Failed to assign snag');
    }
  };

  const handleCompleteSnagAction = async (proofUrl: string, details: string) => {
    if (!completingSnag) return;
    try {
      await api.patch(`/snags/${completingSnag._id}`, {
        status: 'Resolved',
        resolutionImage: proofUrl,
        resolutionDate: new Date(),
        resolutionDetails: details || 'Snag rectified by assignee.'
      });

      toast.success('Snag completed successfully!');
      setCompletingSnag(null);
      fetchIssues();
      fetchProject();
    } catch (error) {
      toast.error('Failed to complete snag');
    }
  };

  const handleBulkSendDrafts = async () => {
    const draftSnags = issues.filter(i => i.status === 'Draft');
    if (draftSnags.length === 0) return;

    if (!window.confirm(`Send all ${draftSnags.length} draft snags for fixing?`)) return;

    setBulkSubmitting(true);
    try {
      await Promise.all(
        draftSnags.map(snag =>
          api.patch(`/snags/${snag._id}`, {
            status: 'In Progress',
            resolutionDetails: 'Sent for rectification.'
          })
        )
      );

      await api.patch(`/projects/${projectId}`, {
        auditAction: 'SnagUpdated',
        auditDetails: `${draftSnags.length} snags updated to In Progress.`
      });

      toast.success(`${draftSnags.length} snags sent for fixing successfully!`);
      fetchIssues();
      fetchProject();
    } catch (error) {
      toast.error('Failed to bulk send snags');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleFinalizeSnagging = async () => {
    if (!window.confirm('Are you sure you want to finalize the snagging phase? This will set the project status to Snagging Completed.')) return;

    setFinalizing(true);
    try {
      await api.patch(`/projects/${projectId}`, {
        status: 'Snagging Completed',
        auditAction: 'StatusChange',
        auditDetails: 'Snagging phase finalized by inspector.'
      });

      toast.success('Snagging phase finalized successfully!');
      fetchIssues();
      fetchProject();
    } catch (error) {
      toast.error('Failed to finalize snagging phase');
    } finally {
      setFinalizing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'High': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'Medium': return 'text-amber-700 bg-amber-100 border-amber-200';
      default: return 'text-blue-700 bg-blue-100 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved':
      case 'Closed': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'In Progress': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'Escalated': return 'text-purple-700 bg-purple-100 border-purple-200';
      default: return 'text-slate-600 bg-gray-100 border-gray-200';
    }
  };

  const getSnagStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Resolved': return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
      case 'Draft': return 'text-slate-600 bg-slate-50 border border-slate-150';
      default: return 'text-amber-700 bg-amber-50 border border-amber-100';
    }
  };

  const getFilterActiveClass = (f: StatusFilter) => {
    switch (f) {
      case 'Escalated': return 'bg-purple-600 text-white border-purple-600';
      case 'Resolved':
      case 'Closed': return 'bg-emerald-600 text-white border-emerald-600';
      case 'In Progress': return 'bg-blue-500 text-white border-blue-500';
      case 'My Task': return 'bg-amber-50 text-white border-amber-500';
      default: return 'bg-blue-600 text-white border-blue-600';
    }
  };

  const typeIssues = issues;
  const currentUserId = user?.id || (user as any)?._id;

  const filteredIssues = typeIssues.filter(i => {
    if (!i.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter === 'All') return true;
    if (statusFilter === 'My Task') {
      const assignedId = i.assignedTo?._id || i.assignedTo;
      return assignedId === currentUserId;
    }
    return i.status === statusFilter;
  });

  // ── Permissions ────────────────────────────────────────────────────────
  const isInspector = ((project?.snaggedBy as any)?._id || project?.snaggedBy) === currentUserId;
  const canAssignSnagging = hasProjectPermission(user, project, 'snag:assign');
  const canCompleteSnag = hasProjectPermission(user, project, 'snag:complete');
  const isSnaggingActive = project?.status === 'Under Snagging' || project?.status === 'Snagging Completed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{activeType === 'Snag' ? 'Snag Tracker' : 'Issue Tracker'}</h3>
          <p className="text-sm text-slate-500 mt-1">{activeType === 'Snag' ? 'Track defects and snagging items on site.' : 'Report and track site issues and field problems.'}</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-xl">
            <button
              onClick={() => setActiveType('Issue')}
              className={cn('px-4 py-1.5 rounded-lg text-xs font-bold transition-all', activeType === 'Issue' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-gray-900')}
            >
              Issues
            </button>
            <button
              onClick={() => setActiveType('Snag')}
              className={cn('px-4 py-1.5 rounded-lg text-xs font-bold transition-all', activeType === 'Snag' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-gray-900')}
            >
              Snags
            </button>
          </div> */}
          {activeType === 'Issue' && (
            <button
              onClick={() => { fetchEscalationMatrix(); setIsEscalationOpen(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm font-bold text-orange-700 hover:bg-orange-100 transition-all"
            >
              <GitBranch className="w-4 h-4" />
              <span>Escalation Matrix</span>
            </button>
          )}
          {activeType === 'Snag' && project?.status === 'Under Snagging' && (
            <>
              {issues.filter(i => i.status === 'Draft').length > 0 && canAssignSnagging && (
                <button
                  onClick={handleBulkSendDrafts}
                  disabled={bulkSubmitting}
                  className="flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {bulkSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4" />
                  )}
                  <span>Send Drafts ({issues.filter(i => i.status === 'Draft').length})</span>
                </button>
              )}
              {isInspector && (
                <button
                  onClick={handleFinalizeSnagging}
                  disabled={finalizing}
                  className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {finalizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Finalize Snagging</span>
                </button>
              )}
            </>
          )}
          {(activeType === 'Issue' || isInspector || canAssignSnagging || user?.role?.name === 'Admin') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Report {activeType}</span>
            </button>
          )}
        </div>
      </div>

      {/* Render conditional snagging not started page if activeType is Snag and Snagging is not active */}
      {activeType === 'Snag' && !isSnaggingActive ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-full shadow-sm mb-4 text-amber-600">
            <ClipboardList className="w-10 h-10" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Snagging Phase Not Started</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm">
            The snagging inspection phase has not commenced for this project. Once initiated, quality tracking records will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Open / Draft', value: typeIssues.filter(i => i.status === 'Open' || i.status === 'Draft').length, color: 'text-blue-600' },
              { label: 'Critical', value: typeIssues.filter(i => i.priority === 'Critical').length, color: 'text-red-600' },
              { label: 'In Progress', value: typeIssues.filter(i => i.status === 'In Progress').length, color: 'text-amber-600' },
              { label: 'Resolved', value: typeIssues.filter(i => i.status === 'Resolved').length, color: 'text-emerald-600' },
            ].map((stat, i) => (
              <GlassCard key={i} className="p-4 border-gray-200" gradient>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <p className={cn('text-2xl font-black', stat.color)}>{stat.value}</p>
              </GlassCard>
            ))}
          </div>

          {/* Escalation Matrix Pathway (only for issues) */}
          {activeType === 'Issue' && escalationMatrix && escalationMatrix.levels && escalationMatrix.levels.length > 0 && (
            <GlassCard className="p-4 border-orange-100/50 bg-orange-50/10" gradient>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-2 shrink-0">
                  <div className="p-2 rounded-xl bg-orange-50 border border-orange-200">
                    <GitBranch className="w-4 h-4 text-orange-600 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Escalation Pathway</h4>
                    <p className="text-[10px] text-slate-500">Configured sequential progression for resolving critical issues.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {escalationMatrix.levels.map((lvl: any, idx: number) => {
                    const userName = lvl.user?.name || 'Unassigned';
                    const userRole = lvl.role || lvl.user?.role?.name || 'Member';
                    return (
                      <React.Fragment key={lvl._id || idx}>
                        {idx > 0 && (
                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm shrink-0">
                          <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-orange-100 text-orange-700 text-[10px] font-black">
                            L{lvl.level}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-gray-900 leading-tight">{userName}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none">{userRole}</p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          )}

          {/* Search + Filter */}
          <div className="space-y-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder={`Search ${activeType.toLowerCase()}s...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_FILTERS.map(f => {
                if (activeType === 'Snag' && f === 'Escalated') return null;
                const matches = typeIssues.filter(i => {
                  if (f === 'All') return true;
                  if (f === 'My Task') {
                    const assignedId = i.assignedTo?._id || i.assignedTo;
                    return assignedId === currentUserId;
                  }
                  return i.status === f;
                });

                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                      statusFilter === f
                        ? getFilterActiveClass(f)
                        : 'bg-white border-gray-200 text-slate-500 hover:border-gray-300 hover:text-gray-900'
                    )}
                  >
                    {f}
                    <span className="ml-1.5 opacity-70">
                      ({matches.length})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List/Grid of Cards */}
          <div className="space-y-4">
            {loading ? (
              <SkeletonLoader loading={true} preset="list"><div /></SkeletonLoader>
            ) : filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <CheckCircle2 className="w-16 h-16 text-slate-300 mb-4" />
                <h4 className="text-base font-bold text-slate-800">No {activeType.toLowerCase()}s found</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1.5">
                  {statusFilter !== 'All'
                    ? `No ${activeType.toLowerCase()}s match the "${statusFilter}" filter.`
                    : 'The tracking board is clear. All systems look good.'}
                </p>
              </div>
            ) : activeType === 'Snag' ? (
              /* Premium Cards Grid representation for Snags to match mobile snagging */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIssues.map((item) => {
                  const assignedId = item.assignedTo?._id || item.assignedTo;
                  const isAssignee = assignedId === currentUserId;
                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedIssue(item)}
                      className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <h4 className="text-sm font-bold text-slate-900 truncate flex-1 leading-snug">
                            {item.title}
                          </h4>
                          <span className={cn('px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0', getPriorityColor(item.priority))}>
                            {item.priority}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-3">
                          <span className={cn('px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider', getSnagStatusBadgeClass(item.status))}>
                            {item.status}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                          {item.description || 'No description provided.'}
                        </p>

                        {/* Evidence Photo */}
                        {item.images && item.images.length > 0 && (
                          <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 mb-4 bg-slate-50">
                            <img src={item.images[0]} alt="Evidence" className="w-full h-36 object-cover" />
                          </div>
                        )}
                      </div>

                      {/* Footer Actions / Info */}
                      <div className="flex flex-col space-y-3 pt-3 border-t border-slate-50 mt-2">
                        {/* User Assignment / Status Info */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Reported: {new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                          {item.assignedTo?.name && (
                            <span className="text-slate-700">Fixer: {item.assignedTo.name}</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end space-x-1.5" onClick={e => e.stopPropagation()}>
                          {item.status === 'Draft' && canAssignSnagging && (
                            <button
                              onClick={() => setAssigningSnag(item)}
                              className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl px-3 py-1.5 text-[10px] font-bold text-blue-600 transition-all shrink-0 shadow-sm"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Assign for Fixing</span>
                            </button>
                          )}

                          {item.status === 'Draft' && isInspector && (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => setEditingIssue(item)}
                                title="Edit snag"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteIssue(e, item._id)}
                                disabled={deletingId === item._id}
                                title="Delete snag"
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all disabled:opacity-40"
                              >
                                {deletingId === item._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}

                          {item.status === 'In Progress' && (isAssignee || canCompleteSnag) && (
                            <button
                              onClick={() => setCompletingSnag(item)}
                              className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl px-3 py-1.5 text-[10px] font-bold text-emerald-600 transition-all shrink-0 shadow-sm"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Complete Snag</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Original Issue tracker simple list cards */
              filteredIssues.map((issue) => (
                <GlassCard
                  key={issue._id}
                  onClick={() => setSelectedIssue(issue)}
                  className="p-5 border-gray-200 group hover:border-blue-500/50 transition-all cursor-pointer"
                  gradient
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <div className={cn(
                        'p-3 rounded-xl border flex items-center justify-center',
                        issue.priority === 'Critical' ? 'bg-red-100 border-red-200 text-red-600' : 'bg-gray-100 border-gray-200 text-slate-500'
                      )}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border', getPriorityColor(issue.priority))}>
                            {issue.priority}
                          </span>
                          {issue.category && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {issue.category}
                            </span>
                          )}
                          {issue.status === 'Escalated' && issue.escalationLevel > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-purple-100 border-purple-200 text-purple-700">
                              Level {issue.escalationLevel}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{issue.title}</h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold">
                            <User className="w-3 h-3" />
                            <span>Assigned: {issue.assignedTo?.name || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold">
                            <Clock className="w-3 h-3" />
                            <span>Reported {new Date(issue.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end space-x-2 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                      <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border', getStatusColor(issue.status))}>
                        {issue.status}
                      </span>
                      <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingIssue(issue)}
                          title="Edit issue"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteIssue(e, issue._id)}
                          disabled={deletingId === issue._id}
                          title="Delete issue"
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                        >
                          {deletingId === issue._id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setSelectedIssue(issue)}
                          className="p-2 rounded-lg bg-gray-100 text-slate-500 hover:text-gray-900 transition-all"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </>
      )}

      {/* CREATE / EDIT ISSUE OR SNAG MODAL */}
      <IssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchIssues}
        projectId={projectId}
        type={activeType}
      />

      <IssueModal
        isOpen={!!editingIssue}
        onClose={() => setEditingIssue(null)}
        onSuccess={() => { fetchIssues(); setEditingIssue(null); }}
        projectId={projectId}
        type={activeType}
        existingIssue={editingIssue}
      />

      {/* ISSUE / SNAG DETAIL MODAL */}
      <IssueDetailModal
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onSuccess={fetchIssues}
        issue={selectedIssue}
        projectId={projectId}
        type={activeType}
      />

      {/* ESCALATION MATRIX SETUP MODAL */}
      <EscalationMatrixModal
        isOpen={isEscalationOpen}
        onClose={() => { setIsEscalationOpen(false); fetchEscalationMatrix(); }}
        projectId={projectId}
      />

      {/* ASSIGN MEMBER FOR SNAG MODAL */}
      <AssignSnagModal
        isOpen={!!assigningSnag}
        onClose={() => setAssigningSnag(null)}
        onAssign={handleAssignSnagForFixing}
        projectId={projectId}
      />

      {/* COMPLETE SNAG PROOF MODAL */}
      <CompleteSnagModal
        isOpen={!!completingSnag}
        onClose={() => setCompletingSnag(null)}
        onComplete={handleCompleteSnagAction}
        snagTitle={completingSnag?.title || ''}
      />
    </div>
  );
};
