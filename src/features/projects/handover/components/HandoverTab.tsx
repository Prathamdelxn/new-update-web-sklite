'use client';
import { tr } from '@/i18n';
import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import { projectCurrency } from '@/lib/projectCurrency';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Loader2, CheckCircle2, AlertTriangle, FileText,
  Download, Calendar, User, MessageSquare, Award, Clock, ChevronDown, ChevronUp,
  XOctagon, CheckCircle, Wrench, Pencil, Trash2, X, Briefcase
} from 'lucide-react';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import { DocumentViewer } from '@/features/projects/documents/components/DocumentViewer';
import { AssignSnagModal } from '@/features/projects/issues/components/AssignSnagModal';
import { CompleteSnagModal } from '@/features/projects/issues/components/CompleteSnagModal';
import { cn, formatCurrency } from '@/lib/utils';

interface HandoverTabProps {
  projectId: string;
  project: any;
  onUpdate: () => void;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
  bg,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  bg: string;
  sub?: string;
}) => (
  <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 flex items-center gap-3.5 min-w-0 transition-colors duration-200 hover:border-blue-200 shadow-none">
    <div className={cn('w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border', bg)}>
      <Icon className={cn('w-5 h-5', accent)} />
    </div>
    <div className="min-w-0">
      <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{tr(value)}</div>
      <div className="text-xs text-slate-500 font-medium truncate">{tr(label)}</div>
      {sub && <div className="text-[11px] text-slate-400 font-normal truncate mt-0.5">{tr(sub)}</div>}
    </div>
  </div>
);

export const HandoverTab: React.FC<HandoverTabProps> = ({ projectId, project, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [validationData, setValidationData] = useState<any>(null);

  const checksPassedCount = useMemo(() => {
    if (!validationData) return 0;
    let count = 0;
    if (validationData.openIssuesList?.length === 0) count++;
    if (validationData.incompleteMilestonesCount === 0 && validationData.incompleteTasksCount === 0) count++;
    if (validationData.pendingBoqsList?.length === 0) count++;
    if (validationData.pendingPlansList?.length === 0) count++;
    if (validationData.activeRisksList?.length === 0) count++;
    return count;
  }, [validationData]);

  // Snag list state (for Under Snagging status)
  const [snags, setSnags] = useState<any[]>([]);
  const [loadingSnags, setLoadingSnags] = useState(false);
  const [selectedSnagIds, setSelectedSnagIds] = useState<string[]>([]);

  // Modals visibility
  const [isApproverModalOpen, setIsApproverModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Handover completion sign-off form
  const [isCompletionFormOpen, setIsCompletionFormOpen] = useState(false);
  const [clientRepName, setClientRepName] = useState('');
  const [handoverDate, setHandoverDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [handoverNotes, setHandoverNotes] = useState('');
  const [certificateFiles, setCertificateFiles] = useState<{ file: File; previewUrl: string | null }[]>([]);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

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
      // Only people who can actually approve a handover are offered as approvers
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
    if (currentStatus === 'Under Snagging') {
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

      toast.success(tr("{{selectedSnagIdsCount}} snags sent for fixing successfully!", { selectedSnagIdsCount: selectedSnagIds.length }));
      setSelectedSnagIds([]);
      fetchSnags();
      onUpdate();
    } catch (err) {
      toast.error(tr("Failed to send snags for fixing"));
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
      toast.success(tr("Snag assigned successfully!"));
      setAssigningSnag(null);
      fetchSnags();
      onUpdate();
    } catch (error) {
      toast.error(tr("Failed to assign snag"));
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
      toast.success(tr("Snag completed successfully!"));
      setCompletingSnag(null);
      fetchSnags();
      onUpdate();
    } catch (error) {
      toast.error(tr("Failed to complete snag"));
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
      toast.success(tr("Handover requested successfully!"));
      setIsApproverModalOpen(false);
      onUpdate();
    } catch (e) {
      toast.error(tr("Failed to request handover"));
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
      toast.success(tr("Handover validation re-initialized!"));
      onUpdate();
    } catch (e) {
      toast.error(tr("Failed to re-initialize handover"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectHandover = async () => {
    if (!isRejectionModalOpen) {
      setIsRejectionModalOpen(true);
      return;
    }
    if (!rejectionReason.trim()) {
      toast.error(tr("Please provide a rejection reason"));
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/projects/${projectId}`, {
        status: 'Handover Rejected',
        handoverApprover: null,
        handoverRejectionReason: rejectionReason,
        auditAction: 'StatusChange',
        auditDetails: `Handover rejected by ${user?.name}. Reason: ${rejectionReason}. Project reverted.`
      });
      toast.success(tr("Handover Rejected!"));
      setRejectionReason('');
      setIsRejectionModalOpen(false);
      onUpdate();
    } catch (e) {
      toast.error(tr("Failed to reject handover"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCertificatesAdd = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const additions = Array.from(files).map(file => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setCertificateFiles(prev => [...prev, ...additions]);
  };

  const removeCertificateAt = (index: number) => {
    setCertificateFiles(prev => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearCertificates = () => {
    setCertificateFiles(prev => {
      prev.forEach(c => { if (c.previewUrl) URL.revokeObjectURL(c.previewUrl); });
      return [];
    });
  };

  const handleConfirmCompletion = async () => {
    if (!clientRepName.trim()) {
      toast.error(tr("Please enter the client representative name"));
      return;
    }
    if (!handoverDate) {
      toast.error(tr("Please select the handover date"));
      return;
    }

    setSubmitting(true);
    try {
      let certificateUrls: string[] | undefined;
      if (certificateFiles.length > 0) {
        setUploadingCertificate(true);
        certificateUrls = await Promise.all(certificateFiles.map(c => uploadToCloudinary(c.file)));
        setUploadingCertificate(false);
      }

      await api.patch(`/projects/${projectId}`, {
        status: 'Completed',
        handoverApprover: project.handoverApprover?._id || project.handoverApprover,
        handoverRejectionReason: null,
        clientRepName: clientRepName.trim(),
        handoverDate,
        handoverNotes: handoverNotes.trim(),
        ...(certificateUrls ? { handoverCertificateUrls: certificateUrls } : {}),
        auditAction: 'StatusChange',
        auditDetails: `Handover verified and approved by ${user?.name}. Client representative: ${clientRepName.trim()}. Project is ready for closure.`
      });
      toast.success(tr("Handover Approved!"));
      setIsCompletionFormOpen(false);
      setClientRepName('');
      setHandoverNotes('');
      clearCertificates();
      onUpdate();
    } catch (e: any) {
      console.error('Handover completion failed:', e);
      toast.error(e?.response?.data?.message || e?.message || tr("Failed to approve handover"));
    } finally {
      setSubmitting(false);
      setUploadingCertificate(false);
    }
  };

  const canViewHandover = hasProjectPermission(user, project, 'handover:view');
  const canApproveHandover = !isProjectLocked(project) && hasProjectPermission(user, project, 'handover:approve');

  if (!canViewHandover) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-none mt-2">
        <div className="w-12 h-12 bg-red-50 border border-red-200 text-red-500 rounded-xl flex items-center justify-center mb-3">
          <XOctagon className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">{tr("Access Denied")}</h2>
        <p className="text-slate-500 text-xs max-w-sm text-center">
          {tr("You do not have the required \"Handover Management\" permission to view this tab.")}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <SkeletonLoader loading preset="list">{null}</SkeletonLoader>
    );
  }

  const isAssignedToMe = (project?.snaggedBy?._id || project?.snaggedBy) === currentUserId;
  const isInspector = (project?.snaggedBy?._id || project?.snaggedBy) === currentUserId;
  // ── Permissions ────────────────────────────────────────────────────────
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.permissions?.includes('*');
  const isLocked = isProjectLocked(project);
  const canAssignSnagging = !isLocked && hasProjectPermission(user, project, 'snags:assign');
  const canCompleteSnag = !isLocked && hasProjectPermission(user, project, 'snags:complete');

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
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-none hover:border-blue-300 transition-colors">
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors cursor-pointer select-none text-start"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-9 h-9 rounded-lg border shrink-0 flex items-center justify-center',
              isOk ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60' : 'bg-amber-50 text-amber-600 border-amber-200/60'
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h5 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">{tr(title)}</h5>
              <p className={cn('text-xs mt-0.5 font-medium truncate', isOk ? 'text-emerald-600' : 'text-amber-600')}>
                {tr(countMessage)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider border',
              isOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-amber-50 text-amber-700 border-amber-200/60'
            )}>
              {isOk ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              <span>{isOk ? tr("PASSED") : tr("PENDING")}</span>
            </span>
            <div className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-100 bg-slate-50/40"
            >
              <div className="p-3.5 sm:p-4 space-y-2">
                {pendingItems && pendingItems.length > 0 ? (
                  detailsRenderer(pendingItems)
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold py-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{tr("All validation criteria in this section have passed successfully.")}</span>
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
    const savedClientRep = project.clientRepName || 'N/A';
    const savedHandoverDate = project.handoverDate
      ? new Date(project.handoverDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A';
    const savedNotes = project.handoverNotes || 'None';
    const savedCertUrls: string[] = Array.isArray(project.handoverCertificateUrls) ? project.handoverCertificateUrls : [];

    return (
      <div className="space-y-4 sm:space-y-5">
        <div className="p-6 sm:p-8 text-center bg-white border border-emerald-200/80 rounded-xl overflow-hidden relative shadow-none">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{tr("Project Handover Completed")}</h3>
          <p className="text-emerald-700 font-medium text-xs sm:text-sm mt-1 max-w-md mx-auto">
            {tr("This project has successfully completed the structured handover process and is now verified and archived.")}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-start">
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tr("Status")}</span>
              <span className="text-emerald-700 font-bold text-xs sm:text-sm mt-0.5 block">{tr("COMPLETED")}</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tr("Handover Date")}</span>
              <span className="text-slate-800 font-bold text-xs sm:text-sm mt-0.5 block">{tr(savedHandoverDate)}</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tr("Client Rep")}</span>
              <span className="text-slate-800 font-bold text-xs sm:text-sm mt-0.5 block truncate">{tr(savedClientRep)}</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tr("Certificate")}</span>
              <span className="text-slate-800 font-bold text-xs sm:text-sm mt-0.5 block">{savedCertUrls.length > 0 ? tr("ARCHIVED ({{savedCertUrlsCount}})", { savedCertUrlsCount: savedCertUrls.length }) : tr("NONE")}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-none">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              {tr("Completion Sign-Off")}
            </h4>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center justify-center py-6 gap-2.5">
              <Award className="w-10 h-10 text-slate-400" />
              {savedCertUrls.length > 0 ? (
                savedCertUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-none w-full justify-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {savedCertUrls.length > 1 ? `Certificate ${i + 1}` : tr("Download Certificate")}
                  </a>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">{tr("No document attached")}</span>
              )}
            </div>
          </div>

          <div className="p-5 md:col-span-2 bg-white border border-slate-200/80 rounded-xl shadow-none">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              {tr("Handover Execution Log")}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tr("Client Representative")}</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">{tr(savedClientRep)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tr("Handover Date")}</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">{tr(savedHandoverDate)}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{tr("Feedback / Comments")}</span>
                  <span className="text-xs sm:text-sm text-slate-600 italic leading-relaxed">"{tr(savedNotes)}"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Handover Tab Layout ──
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Header Card ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3.5 shadow-none">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-lg border flex items-center justify-center shrink-0',
            currentStatus === 'Pending Handover' ? 'bg-amber-50 text-amber-600 border-amber-200' :
            currentStatus === 'Handover Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
            'bg-blue-50 text-blue-600 border-blue-100'
          )}>
            {currentStatus === 'Pending Handover' ? (
              <Clock className="w-5 h-5 animate-pulse" />
            ) : currentStatus === 'Handover Rejected' ? (
              <XOctagon className="w-5 h-5" />
            ) : (
              <Briefcase className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{tr("Project Handover")}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{tr("Sequential checklist verification and sign-off pathway")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-md border',
            currentStatus === 'Pending Handover' ? 'bg-amber-50 text-amber-700 border-amber-200/80' :
            currentStatus === 'Handover Rejected' ? 'bg-red-50 text-red-700 border-red-200/80' :
            'bg-slate-100 text-slate-700 border-slate-200/60'
          )}>
            {tr("Status: ")}<span className="font-bold">{currentStatus || tr("In Progress")}</span>
          </span>

          {validationData && (
            <span className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-md border',
              checksPassedCount === 5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' : 'bg-blue-50 text-blue-700 border-blue-200/80'
            )}>
              {tr(checksPassedCount)}{tr("/5 Checks Passed")}
            </span>
          )}
        </div>
      </div>

      {/* ── Stat Cards Overview ── */}
      {validationData && currentStatus !== 'Under Snagging' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={tr("Readiness Score")}
            value={`${Math.round((checksPassedCount / 5) * 100)}%`}
            icon={ClipboardCheck}
            accent={checksPassedCount === 5 ? "text-emerald-600" : "text-blue-600"}
            bg={checksPassedCount === 5 ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"}
            sub={`${checksPassedCount} of 5 criteria met`}
          />
          <StatCard
            label={tr("Issues & Snags")}
            value={validationData.openIssuesList.length}
            icon={AlertTriangle}
            accent={validationData.openIssuesList.length === 0 ? "text-emerald-600" : "text-amber-600"}
            bg={validationData.openIssuesList.length === 0 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}
            sub={validationData.openIssuesList.length === 0 ? "all issues resolved" : "unresolved remaining"}
          />
          <StatCard
            label={tr("Incomplete Milestones")}
            value={validationData.incompleteMilestonesCount}
            icon={Calendar}
            accent={validationData.incompleteMilestonesCount === 0 && validationData.incompleteTasksCount === 0 ? "text-emerald-600" : "text-blue-600"}
            bg={validationData.incompleteMilestonesCount === 0 && validationData.incompleteTasksCount === 0 ? "bg-emerald-50 border-emerald-100" : "bg-blue-50 border-blue-100"}
            sub={`${validationData.incompleteTasksCount} incomplete tasks`}
          />
          <StatCard
            label={tr("Pending Approvals")}
            value={validationData.pendingBoqsList.length + validationData.pendingPlansList.length}
            icon={FileText}
            accent={validationData.pendingBoqsList.length + validationData.pendingPlansList.length === 0 ? "text-emerald-600" : "text-purple-600"}
            bg={validationData.pendingBoqsList.length + validationData.pendingPlansList.length === 0 ? "bg-emerald-50 border-emerald-100" : "bg-purple-50 border-purple-100"}
            sub="drawings & BOQ items"
          />
        </div>
      )}

      {/* 1. Snagging management layout (Under Snagging / Snagging Completed) */}
      {currentStatus === 'Under Snagging' ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-none">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h4 className="text-sm font-bold text-slate-800">
                  {tr("Project Under Snagging")}
                </h4>
              </div>
              {snags.length > 0 && !isAssignedToMe && !isLocked && selectedSnagIds.length > 0 && (
                <button
                  onClick={handleBulkSendForFixing}
                  disabled={submitting}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-semibold shadow-none transition-colors cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{tr("Send ")}{selectedSnagIds.length}{tr(" Snags for Fixing")}</span>
                </button>
              )}
            </div>

            {/* List of Snags */}
            {snags.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50 border border-slate-100 rounded-xl">
                {tr("No pending snags found.")}
              </div>
            ) : isAssignedToMe ? (
              <div className="text-center py-10 text-slate-500 text-xs font-semibold bg-slate-50 border border-slate-100 rounded-xl px-6">
                {tr("Snagging lists are managed by the inspector. Please complete your tasks in the Snags tab.")}
              </div>
            ) : (
              <div className="space-y-3 bg-white border border-slate-200/80 rounded-xl p-4 max-h-[450px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-slate-600">{tr("Pending Snags (")}{snags.length})</span>
                  <button
                    onClick={handleSelectAllSnags}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    {selectedSnagIds.length === snags.length ? tr("Deselect All") : tr("Select All")}
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
                        <img loading="lazy" decoding="async" src={snag.images[0]} alt={tr("Snag")} className="w-10 h-10 object-cover rounded-lg border shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{tr(snag.title)}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {tr("Priority: ")}{tr(snag.priority)}{tr(" | Status: ")}{tr(snag.status)}
                        </p>
                      </div>

                      {/* Card actions */}
                      <div className="flex items-center space-x-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {snag.status === 'Draft' && canAssignSnagging && (
                          <button
                            onClick={() => setAssigningSnag(snag)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded-md text-[10.5px] font-semibold border border-blue-200/60 cursor-pointer"
                          >
                            {tr("Assign")}
                          </button>
                        )}
                        {snag.status === 'In Progress' && !isLocked && (isAssignee || canCompleteSnag) && (
                          <button
                            onClick={() => setCompletingSnag(snag)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-md text-[10.5px] font-semibold border border-emerald-200/60 cursor-pointer"
                          >
                            {tr("Resolve")}
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
        <div className="space-y-4 sm:space-y-5">
          {/* Readiness validation lists */}
          {validationData && (
            <div className="space-y-3">
              {!validationData.isValid && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-none">
                  <div className="w-8 h-8 rounded-lg bg-amber-100/80 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-amber-900">{tr("Project Not Ready for Handover")}</p>
                    <p className="text-amber-700 leading-relaxed font-normal">
                      {tr("Resolve all open issues, complete remaining milestones/tasks, and approve drawings, BOQ items, and active risks to initiate the handover sign-off process.")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider ms-0.5">{tr("Handover Validation Checks")}</h4>
                <span className="text-xs text-slate-400 font-medium">{tr(checksPassedCount)}{tr(" of 5 passed")}</span>
              </div>

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
                        <span className="font-bold text-slate-700 flex-1 truncate">{tr(i.title)}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">P: {tr(i.priority)} | S: {tr(i.status)}</span>
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
                            <span className="font-bold text-slate-800">{tr(m.name)}</span>
                            <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">{tr(m.status)}</span>
                          </div>
                          <div className="ps-1 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                              <span>{tr("Tasks: ")}{tr(completedCount)}/{tr(totalCount)}{tr(" Completed")}</span>
                            </div>
                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }} />
                            </div>
                            {m.tasks && m.tasks.length > 0 && (
                              <div className="grid grid-cols-1 gap-1 pt-1">
                                {m.tasks.map((task: any, idx: number) => (
                                  <div key={idx} className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium">
                                    <span className={cn('w-1 h-1 rounded-full shrink-0', task.isCompleted ? 'bg-blue-500' : 'bg-slate-300')} />
                                    <span className={cn(task.isCompleted && 'line-through opacity-70')}>{tr(task.title)}</span>
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
                          <span className="font-bold text-slate-700 truncate">{tr(b.itemDescription)}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-900 shrink-0 ps-2">
                          {formatCurrency(b.totalCost || 0, projectCurrency(project))}
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
                          <span className="font-bold text-slate-700 flex-1 truncate">{tr(p.name)}</span>
                          <span className="text-[9px] font-bold text-slate-400">{tr("Ver: v")}{tr(latestVer?.versionNumber)}</span>
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
                        <span className="font-bold text-slate-700 flex-1 truncate">{tr(r.title)}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{tr("Impact: ")}{tr(r.impact)}{tr(" | Progress: ")}{tr(r.mitigationProgress)}%</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* Verification / Approval Box */}
          <div className="border-t border-slate-200/80 pt-4">
            {currentStatus === 'Pending Handover' ? (
              // Approve/Reject: the designated approver, and only with Handover > Approve
              (project.handoverApprover?._id || project.handoverApprover) === currentUserId && canApproveHandover ? (
                /* Approver box */
                <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-5 text-center space-y-3 shadow-none">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit mx-auto border border-amber-200">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">{tr("Approve Handover Request")}</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {tr("You have been requested to verify and approve this handover. Make sure all work deliverables meet expectations.")}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 max-w-xs mx-auto pt-1">
                    <button
                      onClick={() => handleRejectHandover()}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-none cursor-pointer"
                    >
                      {tr("Reject")}
                    </button>
                    <button
                      onClick={() => setIsCompletionFormOpen(true)}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-none cursor-pointer"
                    >
                      {tr("Approve")}
                    </button>
                  </div>
                </div>
              ) : (
                /* Waiting for approver notice */
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 text-center space-y-2 shadow-none">
                  <div className="p-2.5 bg-slate-50 border border-slate-200/80 text-slate-500 rounded-xl w-fit mx-auto">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{tr("Handover Requested")}</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {tr("Handover completion has been requested. Currently waiting for review from")}{' '}
                    <span className="font-bold text-slate-800">
                      {project.handoverApprover?.name || tr("Authorized Contact")}
                    </span>
                    .
                  </p>
                </div>
              )
            ) : currentStatus === 'Handover Rejected' ? (
              /* Handover Rejection box */
              <div className="space-y-3">
                <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-4 space-y-2 shadow-none">
                  <div className="flex items-center gap-2 text-red-700">
                    <XOctagon className="w-4 h-4 shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold">{tr("Handover Request Rejected")}</h4>
                  </div>
                  <p className="text-xs text-red-700 font-medium bg-white/90 rounded-lg p-3 border border-red-100 leading-relaxed italic">
                    "{(project as any).handoverRejectionReason || tr("No details provided.")}"
                  </p>
                </div>

                <button
                  onClick={handleReInitializeHandover}
                  disabled={submitting}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>{tr("Re-initialize Handover Validation")}</span>
                </button>
              </div>
            ) : (
              /* Validation flow actions */
              <div className="space-y-3">
                {validationData?.isValid ? (
                  <button
                    onClick={() => {
                      if (isLocked || !hasProjectPermission(user, project, 'handover:create')) {
                        toast.error(tr("You don't have permission to initialize handover completion."));
                        return;
                      }
                      if (!hasProjectPermission(user, project, 'handover:assign')) {
                        toast.error(tr("You don't have permission to assign a handover approver."));
                        return;
                      }
                      setIsApproverModalOpen(true);
                    }}
                    disabled={submitting}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>{tr("Request Project Handover")}</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 bg-slate-100 text-slate-400 rounded-xl text-xs sm:text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2 border border-slate-200 shadow-none"
                  >
                    <ClipboardCheck className="w-4 h-4 text-slate-400" />
                    <span>{tr("Request Project Handover (Pending ")}{5 - checksPassedCount}{tr(" Checks)")}</span>
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-none overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tr("Select Handover Approver")}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{tr("Pick a project member to review and approve this handover.")}</p>
                  </div>
                  <button onClick={() => setIsApproverModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 min-h-[200px]">
                  {loadingApprovers ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-500 mt-2 font-medium">{tr("Loading members...")}</span>
                    </div>
                  ) : approvers.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic">
                      {tr("No project members found.")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {approvers.map((approver) => {
                        const projectEntry = approver.projects?.find(
                          (p: any) => String(p.project?._id || p.project) === String(projectId)
                        );
                        const roleName = projectEntry?.role?.name || approver.role?.name || 'Member';
                        return (
                          <button
                            key={approver._id}
                            type="button"
                            onClick={() => handleRequestHandover(approver)}
                            className="w-full flex items-center space-x-3 p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200 rounded-xl text-start transition-all group cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {approver.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{tr(approver.name)}</p>
                              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{tr(roleName)}</p>
                            </div>
                          </button>
                        );
                      })}
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-none overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="text-base font-bold text-slate-900">{tr("Rejection Details")}</h3>
                  <button onClick={() => setIsRejectionModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {tr("Rejection Reason *")}
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder={tr("Explain why this handover request is being rejected...")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRejectionModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {tr("Cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectHandover()}
                      disabled={!rejectionReason.trim()}
                      className="flex-[2] py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {tr("Submit Rejection")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HANDOVER COMPLETION SIGN-OFF MODAL */}
      <AnimatePresence>
        {isCompletionFormOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCompletionFormOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-none overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{tr("Handover Completion Sign-Off")}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{tr("Record who accepted the handover and archive a certificate.")}</p>
                  </div>
                  <button onClick={() => setIsCompletionFormOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {tr("Client Representative *")}
                    </label>
                    <input
                      type="text"
                      required
                      value={clientRepName}
                      onChange={e => setClientRepName(e.target.value)}
                      placeholder={tr("Name of the person accepting the handover")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {tr("Handover Date *")}
                    </label>
                    <input
                      type="date"
                      required
                      value={handoverDate}
                      onChange={e => setHandoverDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {tr("Feedback / Comments")}
                    </label>
                    <textarea
                      rows={3}
                      value={handoverNotes}
                      onChange={e => setHandoverNotes(e.target.value)}
                      placeholder={tr("Any closing notes from the client or the team...")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {tr("Completion Certificates (optional)")}
                    </label>

                    {certificateFiles.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {certificateFiles.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50">
                            {c.previewUrl ? (
                              <img loading="lazy" decoding="async" src={c.previewUrl} alt={tr("Certificate preview")} className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <span className="text-xs text-slate-700 truncate flex-1 font-medium">{tr(c.file.name)}</span>
                            <button
                              type="button"
                              onClick={() => removeCertificateAt(i)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title={tr("Remove")}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 rounded-xl cursor-pointer transition-all">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        className="hidden"
                        onChange={e => { handleCertificatesAdd(e.target.files); e.target.value = ''; }}
                      />
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500">
                        {certificateFiles.length > 0 ? tr("Click to attach more (image or PDF)") : tr("Click to attach certificates (image or PDF) — multiple allowed")}
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCompletionFormOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {tr("Cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCompletion}
                      disabled={submitting || uploadingCertificate || !clientRepName.trim() || !handoverDate}
                      className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {(submitting || uploadingCertificate) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {uploadingCertificate ? tr("Uploading…") : tr("Confirm & Complete Handover")}
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
