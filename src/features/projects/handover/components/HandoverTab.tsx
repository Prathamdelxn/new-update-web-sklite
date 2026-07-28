'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Loader2, CheckCircle2, AlertTriangle, FileText,
  Download, Calendar, User, MessageSquare, Award, Clock, ChevronDown, ChevronUp,
  XOctagon, CheckCircle, Wrench, Pencil, Trash2, X, Briefcase
} from 'lucide-react';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { hasProjectPermission } from '@/lib/permissions';
import { DocumentViewer } from '@/features/projects/documents/components/DocumentViewer';
import { AssignSnagModal } from '@/features/projects/issues/components/AssignSnagModal';
import { CompleteSnagModal } from '@/features/projects/issues/components/CompleteSnagModal';
import { cn, formatCurrency } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';

interface HandoverTabProps {
  projectId: string;
  project: any;
  onUpdate: () => void;
}

export const HandoverTab: React.FC<HandoverTabProps> = ({ projectId, project, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [validationData, setValidationData] = useState<any>(null);
  
  // Snag list state (for Under Snagging status)
  const [snags, setSnags] = useState<any[]>([]);
  const [loadingSnags, setLoadingSnags] = useState(false);
  const [selectedSnagIds, setSelectedSnagIds] = useState<string[]>([]);
  
  // Modals visibility
  const [isApproverModalOpen, setIsApproverModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [approvers, setApprovers] = useState<any[]>([]);
  const [loadingApprovers, setLoadingApprovers] = useState(false);

  // Snag action modals
  const [assigningSnag, setAssigningSnag] = useState<any>(null);
  const [completingSnag, setCompletingSnag] = useState<any>(null);

  const toast = useToast();
  const { user } = useAuth();

  const currentStatus = project?.status;
  const currentUserId = user?.id || (user as any)?._id;

  const fetchSnags = useCallback(async () => {
    setLoadingSnags(true);
    try {
      const response = await api.get(`/projects/${projectId}/snags`);
      const filtered = (response.data || []).filter(
        (s: any) => s.status === 'Draft' || s.status === 'Open' || s.status === 'In Progress'
      );
      setSnags(filtered);
    } catch (e) {
      console.error('Error fetching snags:', e);
    } finally {
      setLoadingSnags(false);
    }
  }, [projectId]);

  const fetchApprovers = useCallback(async () => {
    setLoadingApprovers(true);
    try {
      const response = await api.get(`/users?projectId=${projectId}&permission=handover:approve`);
      setApprovers(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.error('Error fetching handover approvers:', e);
    } finally {
      setLoadingApprovers(false);
    }
  }, [projectId]);

  const validateHandoverReadiness = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Issues
      let issues: any[] = [];
      try {
        const issuesRes = await api.get(`/projects/${projectId}/issues`);
        issues = issuesRes.data || [];
      } catch (err: any) {
        if (err.response?.status !== 403) console.error("Error fetching issues:", err);
      }
      const openIssuesList = issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');

      // 2. Fetch Milestones
      let milestones: any[] = [];
      try {
        const milestonesRes = await api.get(`/projects/${projectId}/milestones`);
        milestones = milestonesRes.data || [];
      } catch (err: any) {
        if (err.response?.status !== 403) console.error("Error fetching milestones:", err);
      }
      const incompleteMilestonesList = milestones.filter(m => m.status !== 'Completed');
      const incompleteTasksList = milestones.flatMap(m => m.tasks || []).filter(t => !t.isCompleted);

      // 3. Fetch BOQ Items
      let boqItems: any[] = [];
      try {
        const boqRes = await api.get(`/projects/${projectId}/boq`);
        boqItems = boqRes.data || [];
      } catch (err: any) {
        if (err.response?.status !== 403) console.error("Error fetching BOQ:", err);
      }
      const latestBoq = boqItems.filter(b => b.isLatest !== false);
      const pendingBoqsList = latestBoq.filter(b => b.status !== 'Approved');

      // 4. Fetch Technical Plans
      let folders: any[] = [];
      try {
        const foldersRes = await api.get(`/projects/${projectId}/folders`);
        folders = foldersRes.data || [];
      } catch (err: any) {
        if (err.response?.status !== 403) console.error("Error fetching folders:", err);
      }
      const allPlans = folders.flatMap(f => f.documents || []);
      const pendingPlansList = allPlans.filter(doc => {
        const latestVer = doc.versions?.[doc.versions.length - 1];
        return latestVer && latestVer.approvalStatus !== 'Approved';
      });

      // 5. Fetch Risks
      let risks: any[] = [];
      try {
        const risksRes = await api.get(`/projects/${projectId}/risks`);
        risks = risksRes.data || [];
      } catch (err: any) {
        if (err.response?.status !== 403) console.error("Error fetching risks:", err);
      }
      const activeRisksList = risks.filter(r => r.status === 'Critical' || r.status === 'Active');

      setValidationData({
        totalIssues: issues.length,
        openIssuesList,
        milestonesList: milestones,
        incompleteMilestonesCount: incompleteMilestonesList.length,
        incompleteTasksCount: incompleteTasksList.length,
        totalBoqs: latestBoq.length,
        pendingBoqsList,
        totalPlans: allPlans.length,
        pendingPlansList,
        totalRisks: risks.length,
        activeRisksList,
        isValid: openIssuesList.length === 0 &&
          incompleteMilestonesList.length === 0 &&
          incompleteTasksList.length === 0 &&
          pendingBoqsList.length === 0 &&
          pendingPlansList.length === 0 &&
          activeRisksList.length === 0
      });
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (currentStatus === 'Under Snagging' || currentStatus === 'Snagging Completed') {
      fetchSnags();
      setLoading(false);
    } else {
      validateHandoverReadiness();
    }
  }, [currentStatus, fetchSnags, validateHandoverReadiness]);

  useEffect(() => {
    if (isApproverModalOpen) {
      fetchApprovers();
    }
  }, [isApproverModalOpen, fetchApprovers]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleToggleSelection = (id: string) => {
    setSelectedSnagIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllSnags = () => {
    if (selectedSnagIds.length === snags.length) {
      setSelectedSnagIds([]);
    } else {
      setSelectedSnagIds(snags.map(s => s._id));
    }
  };

  const handleBulkSendForFixing = async () => {
    if (selectedSnagIds.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const snagPromises = selectedSnagIds.map(id =>
        api.patch(`/snags/${id}`, {
          status: 'In Progress',
          resolutionDetails: 'Sent for rectification.'
        })
      );
      await Promise.all(snagPromises);

      await api.patch(`/projects/${projectId}`, {
        auditAction: 'SnagUpdated',
        auditDetails: `${selectedSnagIds.length} snags updated to In Progress.`
      });

      toast.success(`${selectedSnagIds.length} snags sent for fixing successfully!`);
      setSelectedSnagIds([]);
      fetchSnags();
      onUpdate();
    } catch (err) {
      toast.error('Failed to send snags for fixing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSnagForFixing = async (assignedUser: any) => {
    if (!assigningSnag || submitting) return;
    setSubmitting(true);
    try {
      await api.patch(`/snags/${assigningSnag._id}`, {
        status: 'In Progress',
        assignedTo: assignedUser._id,
        resolutionDetails: `Assigned to ${assignedUser.name} for snag rectification.`
      });
      await api.patch(`/projects/${projectId}`, {
        auditAction: 'StatusChange',
        auditDetails: `Snag "${assigningSnag.title}" sent for fixing.`
      });
      toast.success('Snag assigned successfully!');
      setAssigningSnag(null);
      fetchSnags();
      onUpdate();
    } catch (error) {
      toast.error('Failed to assign snag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSnagAction = async (proofUrl: string, details: string) => {
    if (!completingSnag || submitting) return;
    setSubmitting(true);
    try {
      await api.patch(`/snags/${completingSnag._id}`, {
        status: 'Resolved',
        resolutionImage: proofUrl,
        resolutionDate: new Date(),
        resolutionDetails: details || 'Snag rectified by assignee.'
      });
      toast.success('Snag completed successfully!');
      setCompletingSnag(null);
      fetchSnags();
      onUpdate();
    } catch (error) {
      toast.error('Failed to complete snag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestHandover = async (selectedUser: any) => {
    setSubmitting(true);
    try {
      await api.patch(`/projects/${projectId}`, {
        status: 'Pending Handover',
        handoverApprover: selectedUser._id,
        auditAction: 'StatusChange',
        auditDetails: `Handover completion requested from ${selectedUser.name}.`
      });
      toast.success('Handover requested successfully!');
      setIsApproverModalOpen(false);
      onUpdate();
    } catch (e) {
      toast.error('Failed to request handover');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReInitializeHandover = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/projects/${projectId}`, {
        status: 'Ongoing',
        handoverApprover: null,
        handoverRejectionReason: null,
        auditAction: 'StatusChange',
        auditDetails: `Handover validation re-initialized by ${user?.name}. Status reverted to Ongoing.`
      });
      toast.success('Handover validation re-initialized!');
      onUpdate();
    } catch (e) {
      toast.error('Failed to re-initialize handover');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveHandover = async (isApproved: boolean) => {
    if (!isApproved && !isRejectionModalOpen) {
      setIsRejectionModalOpen(true);
      return;
    }
    if (!isApproved && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setSubmitting(true);
    const newStatus = isApproved ? 'Completed' : 'Handover Rejected';
    try {
      await api.patch(`/projects/${projectId}`, {
        status: newStatus,
        handoverApprover: isApproved ? project.handoverApprover?._id || project.handoverApprover : null,
        handoverRejectionReason: isApproved ? null : rejectionReason,
        auditAction: 'StatusChange',
        auditDetails: isApproved
          ? `Handover verified and approved by ${user?.name}. Project is ready for closure.`
          : `Handover rejected by ${user?.name}. Reason: ${rejectionReason}. Project reverted.`
      });
      toast.success(`Handover ${isApproved ? 'Approved' : 'Rejected'}!`);
      setRejectionReason('');
      setIsRejectionModalOpen(false);
      onUpdate();
    } catch (e) {
      toast.error(`Failed to ${isApproved ? 'approve' : 'reject'} handover`);
    } finally {
      setSubmitting(false);
    }
  };

  const canViewHandover = hasProjectPermission(user, project, 'handover:view');

  if (!canViewHandover) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm mt-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <XOctagon className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm max-w-sm text-center mb-6">
          You do not have the required "Handover Management" permission to view this tab.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border rounded-3xl">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 mt-2 text-sm">Verifying project handover checklist...</p>
      </div>
    );
  }

  const isAssignedToMe = (project?.snaggedBy?._id || project?.snaggedBy) === currentUserId;
  const isInspector = (project?.snaggedBy?._id || project?.snaggedBy) === currentUserId;
  // ── Permissions ────────────────────────────────────────────────────────
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.permissions?.includes('*');
  const canAssignSnagging = hasProjectPermission(user, project, 'snag:assign');
  const canCompleteSnag = hasProjectPermission(user, project, 'snag:complete');

  const renderChecklistGroup = (
    title: string,
    status: 'ok' | 'pending',
    countMessage: string,
    pendingItems: any[],
    icon: React.ElementType,
    key: string,
    detailsRenderer: (items: any[]) => React.ReactNode
  ) => {
    const isExpanded = expandedSections[key];
    const isOk = status === 'ok';
    const Icon = icon;

    return (
      <div className="bg-white border border-slate-100/70 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center space-x-3 text-left">
            <div className={cn('p-2 rounded-xl border border-transparent shrink-0', isOk ? 'bg-emerald-50/80 text-emerald-600' : 'bg-amber-50/80 text-amber-600')}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-slate-800">{title}</h5>
              <p className={cn('text-xs mt-0.5 font-medium', isOk ? 'text-emerald-600' : 'text-amber-600')}>
                {countMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={cn('px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider', isOk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/20' : 'bg-amber-50 text-amber-700 border border-amber-200/20')}>
              {isOk ? 'PASSED' : 'PENDING'}
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-slate-100 bg-slate-50/30"
            >
              <div className="p-4 space-y-2">
                {pendingItems && pendingItems.length > 0 ? (
                  detailsRenderer(pendingItems)
                ) : (
                  <div className="flex items-center space-x-2 text-xs text-emerald-600 font-semibold py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All checks passed successfully.</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Render Completed View ──
  if (currentStatus === 'Completed') {
    const handoverAudit = project.auditTrail?.find(
      (log: any) => log.action === 'StatusChange' && log.details?.includes('Project Handover Completed')
    );
    const savedClientRep = handoverAudit?.details?.match(/Client Representative:\s*(.*?)(?=\.\s*\w+:|$)/)?.[1] || project.clientRepName || 'N/A';
    const savedHandoverDate = handoverAudit?.details?.match(/Handover Date:\s*(.*?)(?=\.\s*\w+:|$)/)?.[1] || 'N/A';
    const savedNotes = handoverAudit?.details?.match(/Notes:\s*(.*?)(?=\.\s*\w+:|$)/)?.[1] || 'None';
    const savedCertUrl = handoverAudit?.details?.match(/Certificate URL:\s*(.*?)(?=\.\s*\w+:|$)/)?.[1] || '';

    return (
      <div className="space-y-6">
        <GlassCard className="p-8 text-center border-emerald-200 overflow-hidden relative" gradient>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Award className="w-64 h-64 text-emerald-600" />
          </div>
          
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          
          <h3 className="text-2xl font-black text-emerald-900">Project Handover Completed!</h3>
          <p className="text-emerald-600 font-medium text-sm mt-1 max-w-md mx-auto">
            This project has successfully completed the structured handover process and is now securely archived.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
              <span className="text-emerald-700 font-black text-sm mt-1 block">COMPLETED</span>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Handover Date</span>
              <span className="text-slate-800 font-black text-sm mt-1 block">{savedHandoverDate}</span>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Client Rep</span>
              <span className="text-slate-800 font-black text-sm mt-1 block">{savedClientRep}</span>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Certificate</span>
              <span className="text-slate-800 font-black text-sm mt-1 block">ARCHIVED</span>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-6 border-gray-200" gradient>
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Completion Sign-Off
            </h4>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center py-6">
              <Award className="w-12 h-12 text-slate-400 mb-3" />
              {savedCertUrl ? (
                <a
                  href={savedCertUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Download Certificate
                </a>
              ) : (
                <span className="text-xs text-slate-400 italic">No document attached</span>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6 md:col-span-2 border-gray-200" gradient>
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-500" />
              Handover Execution Log
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 border flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Client Representative</span>
                  <span className="text-sm font-semibold text-gray-800">{savedClientRep}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 border flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Handover Date</span>
                  <span className="text-sm font-semibold text-gray-800">{savedHandoverDate}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 border flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Feedback / Comments</span>
                  <span className="text-sm text-slate-600 italic leading-relaxed">"{savedNotes}"</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── Render Handover Tab Layout ──
  return (
    <div className="space-y-6">
      {/* Tab Header Card */}
      <div className="flex items-center space-x-4 p-4.5 bg-white/85 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)]">
        <div className={cn(
          'p-2.5 rounded-xl border border-transparent shrink-0',
          currentStatus === 'Pending Handover' ? 'bg-amber-50/80 text-amber-600' :
          currentStatus === 'Handover Rejected' ? 'bg-red-50/80 text-red-600' : 'bg-blue-50/80 text-blue-600'
        )}>
          {currentStatus === 'Pending Handover' ? (
            <Clock className="w-7 h-7 animate-pulse" />
          ) : currentStatus === 'Handover Rejected' ? (
            <XOctagon className="w-7 h-7" />
          ) : (
            <Briefcase className="w-7 h-7" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Project Handover</h3>
          <p className="text-xs text-slate-500 mt-0.5">Sequential checklist verification and sign-off pathway.</p>
        </div>
      </div>

      {/* 1. Snagging management layout (Under Snagging / Snagging Completed) */}
      {(currentStatus === 'Under Snagging' || currentStatus === 'Snagging Completed') ? (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h4 className="text-sm font-bold text-slate-800">
                  {currentStatus === 'Snagging Completed' ? 'Snagging Completed' : 'Project Under Snagging'}
                </h4>
              </div>
              {snags.length > 0 && !isAssignedToMe && selectedSnagIds.length > 0 && (
                <button
                  onClick={handleBulkSendForFixing}
                  disabled={submitting}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition-all"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Send {selectedSnagIds.length} Snags for Fixing</span>
                </button>
              )}
            </div>

            {/* List of Snags */}
            {snags.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic bg-white border rounded-2xl">
                No pending snags found.
              </div>
            ) : isAssignedToMe ? (
              <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-white border rounded-2xl px-6">
                Snagging lists are managed by the inspector. Please complete your tasks in the Snags tab.
              </div>
            ) : (
              <div className="space-y-3 bg-white border border-slate-150 rounded-2xl p-4 max-h-[450px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-slate-600">Pending Snags ({snags.length})</span>
                  <button
                    onClick={handleSelectAllSnags}
                    className="text-xs font-bold text-blue-600 hover:text-blue-500"
                  >
                    {selectedSnagIds.length === snags.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {snags.map((snag) => {
                  const isSelected = selectedSnagIds.includes(snag._id);
                  const assignedId = snag.assignedTo?._id || snag.assignedTo;
                  const isAssignee = assignedId === currentUserId;
                  return (
                    <div
                      key={snag._id}
                      onClick={() => handleToggleSelection(snag._id)}
                      className={cn(
                        'flex items-center space-x-3 p-3 border rounded-xl cursor-pointer transition-all',
                        isSelected ? 'bg-blue-50/20 border-blue-200' : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by row onClick
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      />
                      {snag.images && snag.images.length > 0 && (
                        <img src={snag.images[0]} alt="Snag" className="w-10 h-10 object-cover rounded-lg border shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{snag.title}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Priority: {snag.priority} | Status: {snag.status}
                        </p>
                      </div>

                      {/* Card actions */}
                      <div className="flex items-center space-x-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {snag.status === 'Draft' && canAssignSnagging && (
                          <button
                            onClick={() => setAssigningSnag(snag)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-blue-100"
                          >
                            Assign
                          </button>
                        )}
                        {snag.status === 'In Progress' && (isAssignee || canCompleteSnag) && (
                          <button
                            onClick={() => setCompletingSnag(snag)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-100"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. Validation / Approver actions layout */
        <div className="space-y-6">
          {/* Readiness validation lists */}
          {validationData && (
            <div className="space-y-3">
              {!validationData.isValid && (
                <div className="bg-amber-50/60 border border-amber-200/30 rounded-xl p-3.5 mb-3 text-xs text-amber-800 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-bold">Project is not ready for handover!</p>
                    <p className="opacity-90 leading-relaxed">
                      Please resolve all issues, complete all milestones/tasks, and approve drawings, BOQ items, and active risks to initiate the handover process.
                    </p>
                  </div>
                </div>
              )}
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Handover Validation Checks</h4>
              
              {/* Checklist Group Cards */}
              {renderChecklistGroup(
                'Issues & Snags Target',
                validationData.openIssuesList.length === 0 ? 'ok' : 'pending',
                `${validationData.openIssuesList.length} Unresolved issues remaining`,
                validationData.openIssuesList,
                AlertTriangle,
                'issues',
                (items) => (
                  <div className="space-y-2">
                    {items.map((i: any) => (
                      <div key={i._id} className="flex items-center space-x-2 text-xs bg-white border border-slate-100 rounded-xl p-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="font-bold text-slate-700 flex-1 truncate">{i.title}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">P: {i.priority} | S: {i.status}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {renderChecklistGroup(
                'Milestones & Tasks Checklist',
                validationData.incompleteMilestonesCount === 0 && validationData.incompleteTasksCount === 0 ? 'ok' : 'pending',
                `${validationData.incompleteMilestonesCount} Incomplete milestones, ${validationData.incompleteTasksCount} incomplete tasks`,
                validationData.milestonesList.filter((m: any) => m.status !== 'Completed'),
                Calendar,
                'milestones',
                (items) => (
                  <div className="space-y-3">
                    {items.map((m: any) => {
                      const completedCount = (m.tasks || []).filter((t: any) => t.isCompleted).length;
                      const totalCount = (m.tasks || []).length;
                      return (
                        <div key={m._id} className="bg-white border border-slate-100 rounded-xl p-3 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{m.name}</span>
                            <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">{m.status}</span>
                          </div>
                          <div className="pl-1 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                              <span>Tasks: {completedCount}/{totalCount} Completed</span>
                            </div>
                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }} />
                            </div>
                            {m.tasks && m.tasks.length > 0 && (
                              <div className="grid grid-cols-1 gap-1 pt-1">
                                {m.tasks.map((task: any, idx: number) => (
                                  <div key={idx} className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
                                    <span className={cn('w-1 h-1 rounded-full shrink-0', task.isCompleted ? 'bg-blue-500' : 'bg-slate-300')} />
                                    <span className={cn(task.isCompleted && 'line-through opacity-70')}>{task.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {renderChecklistGroup(
                'BOQ Approval Target',
                validationData.pendingBoqsList.length === 0 ? 'ok' : 'pending',
                `${validationData.pendingBoqsList.length} Pending BOQ items remaining`,
                validationData.pendingBoqsList,
                FileText,
                'boqs',
                (items) => (
                  <div className="space-y-2">
                    {items.map((b: any) => (
                      <div key={b._id} className="flex items-center justify-between text-xs bg-white border border-slate-100 rounded-xl p-2.5">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="font-bold text-slate-700 truncate">{b.itemDescription}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-900 shrink-0 pl-2">
                          {formatCurrency(b.totalCost || 0, project?.currency || '$')}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {renderChecklistGroup(
                'Drawings & Plans Approval Target',
                validationData.pendingPlansList.length === 0 ? 'ok' : 'pending',
                `${validationData.pendingPlansList.length} Unapproved drawings remaining`,
                validationData.pendingPlansList,
                FileText,
                'drawings',
                (items) => (
                  <div className="space-y-2">
                    {items.map((p: any) => {
                      const latestVer = p.versions?.[p.versions.length - 1];
                      return (
                        <div key={p._id} className="flex items-center space-x-2 text-xs bg-white border border-slate-100 rounded-xl p-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                          <span className="font-bold text-slate-700 flex-1 truncate">{p.name}</span>
                          <span className="text-[9px] font-bold text-slate-400">Ver: v{latestVer?.versionNumber}</span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {renderChecklistGroup(
                'Risks Severity Checks',
                validationData.activeRisksList.length === 0 ? 'ok' : 'pending',
                `${validationData.activeRisksList.length} Active critical/active risks remaining`,
                validationData.activeRisksList,
                AlertTriangle,
                'risks',
                (items) => (
                  <div className="space-y-2">
                    {items.map((r: any) => (
                      <div key={r._id} className="flex items-center space-x-2 text-xs bg-white border border-slate-100 rounded-xl p-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="font-bold text-slate-700 flex-1 truncate">{r.title}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Impact: {r.impact} | Progress: {r.mitigationProgress}%</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* Verification / Approval Box */}
          <div className="border-t border-slate-100 pt-6">
            {currentStatus === 'Pending Handover' ? (
              (project.handoverApprover?._id || project.handoverApprover) === currentUserId ? (
                /* Approver box */
                <div className="bg-amber-50/20 border border-amber-200/30 rounded-2xl p-4.5 text-center space-y-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mx-auto border border-amber-100">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">Approve Handover Request</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      You have been requested to verify and approve this handover. Make sure all work progress meets the expectations.
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-3 max-w-xs mx-auto">
                    <button
                      onClick={() => handleApproveHandover(false)}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/10"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveHandover(true)}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-600/10"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ) : (
                /* Waiting for approver notice */
                <div className="bg-slate-50 border border-slate-200/40 rounded-3xl p-5 text-center space-y-3">
                  <div className="p-3 bg-white border text-slate-500 rounded-2xl w-fit mx-auto shadow-sm">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Handover Requested</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Handover completion has been requested. Currently waiting for approval from{' '}
                    <span className="font-semibold text-slate-800">
                      {project.handoverApprover?.name || 'Authorized Contact'}
                    </span>
                    .
                  </p>
                </div>
              )
            ) : currentStatus === 'Handover Rejected' ? (
              /* Handover Rejection box */
              <div className="space-y-4">
                <div className="bg-red-50/60 border border-red-200/30 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center space-x-2 text-red-700">
                    <XOctagon className="w-5 h-5 shrink-0" />
                    <h4 className="text-sm font-bold">Handover Request Rejected</h4>
                  </div>
                  <p className="text-xs text-red-600 font-medium bg-white/80 rounded-xl p-3.5 border border-red-100/30 leading-relaxed italic">
                    "{(project as any).handoverRejectionReason || 'No details provided.'}"
                  </p>
                </div>

                <button
                  onClick={handleReInitializeHandover}
                  disabled={submitting}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center space-x-2"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Re-initialize Handover Validation</span>
                </button>
              </div>
            ) : (
              /* Validation flow actions */
              <div className="space-y-4">
                {validationData?.isValid ? (
                  <button
                    onClick={() => setIsApproverModalOpen(true)}
                    disabled={submitting}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center space-x-2"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Request Project Handover</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 bg-slate-100 text-slate-400 rounded-xl text-sm font-bold cursor-not-allowed flex items-center justify-center space-x-2 border border-slate-200"
                  >
                    <ClipboardCheck className="w-4 h-4 text-slate-400" />
                    <span>Request Project Handover</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SELECT APPROVER MODAL */}
      <AnimatePresence>
        {isApproverModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsApproverModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Select Handover Approver</h3>
                    <p className="text-xs text-slate-500 mt-1">Select a member with approval permissions.</p>
                  </div>
                  <button onClick={() => setIsApproverModalOpen(false)} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
                  {loadingApprovers ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-500 mt-2 font-semibold">Loading members...</span>
                    </div>
                  ) : approvers.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      No members with `handover:approve` permissions found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {approvers.map((approver) => (
                        <button
                          key={approver._id}
                          type="button"
                          onClick={() => handleRequestHandover(approver)}
                          className="w-full flex items-center space-x-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-left transition-all group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                            {approver.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{approver.name}</p>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{approver.role?.name || 'Approver'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECTION NOTE MODAL */}
      <AnimatePresence>
        {isRejectionModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsRejectionModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-3xl border border-gray-150 shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <h3 className="text-lg font-bold text-gray-900">Rejection Details</h3>
                  <button onClick={() => setIsRejectionModalOpen(false)} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Rejection Reason *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Explain why this handover request is being rejected..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsRejectionModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveHandover(false)}
                      disabled={!rejectionReason.trim()}
                      className="flex-[2] py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Submit Rejection
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ASSIGN SNAG FOR FIXING MODAL */}
      <AssignSnagModal
        isOpen={!!assigningSnag}
        onClose={() => setAssigningSnag(null)}
        onAssign={handleAssignSnagForFixing}
        projectId={projectId}
      />

      {/* RESOLVE SNAG PROOF MODAL */}
      <CompleteSnagModal
        isOpen={!!completingSnag}
        onClose={() => setCompletingSnag(null)}
        onComplete={handleCompleteSnagAction}
        snagTitle={completingSnag?.title || ''}
      />
    </div>
  );
};
