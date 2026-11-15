'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { TeamManagementModal } from '@/features/projects/components/TeamManagementModal';
import { SendForSurveyModal } from '@/features/projects/site-survey/components/SendForSurveyModal';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthContext';
import { useSocket } from '@/providers/SocketContext';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import { useToast } from '@/providers/ToastContext';
import {
  Map,
  Users,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  DollarSign,
  ChevronRight,
  User,
  X,
  Plus,
  Loader2,
  Check,
  History,
  TrendingUp,
  Send,
  GitPullRequest,
  Wallet,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCompact, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { motion } from 'framer-motion';



export function ProjectDetailsTab() {
  const { project: typedProject, projectId, fetchProject } = useProjectContext();
  const project = typedProject as any;
  const { user } = useAuth();
  const toast = useToast();
  const { socket } = useSocket();
  const router = useRouter();

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [showBudgetHist, setShowBudgetHist] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Budget Change Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(null);
  const [budgetApprovers, setBudgetApprovers] = useState<any[]>([]);
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Budget Action confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: (() => Promise<void>) | null;
    type: 'success' | 'destructive' | 'default';
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: null,
    type: 'default'
  });

  const fetchBudgetApprovers = async () => {
    try {
      setIsLoadingApprovers(true);
      const res = await api.get(`/projects/${projectId}/budget-approvers`);
      const approvers = res.data?.approvers || [];
      setBudgetApprovers(approvers);
      if (approvers.length > 0) {
        setSelectedApproverId(approvers[0]._id);
      }
    } catch (e) {
      console.error('Failed to fetch budget approvers:', e);
    } finally {
      setIsLoadingApprovers(false);
    }
  };

  const handleOpenRequestModal = () => {
    setRequestAmount('');
    setRequestReason('');
    fetchBudgetApprovers();
    setShowRequestModal(true);
  };

  // Helper to get latest approved base budget (so pending requests never overwrite the current budget)
  const currentBaseBudget = useMemo(() => {
    if (!project) return 0;
    const history = project.budgetHistory || [];
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if (entry.approvalStatus === 'Approved') {
        return Number(entry.amount) || 0;
      }
    }
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      if (entry.approvalStatus !== 'Pending' && entry.approvalStatus !== 'Rejected') {
        return Number(entry.amount) || 0;
      }
    }
    return Number(project.budget ?? project.totalBudget ?? 0);
  }, [project]);

  // Find any pending change request in history
  const pendingBh = useMemo(() => {
    return project?.budgetHistory?.find((bh: any) => bh.approvalStatus === 'Pending');
  }, [project]);

  // Derive the added change request amount and the proposed new total budget
  const { pendingAddedAmount, pendingTotalBudget } = useMemo(() => {
    if (!pendingBh) return { pendingAddedAmount: 0, pendingTotalBudget: currentBaseBudget };
    const rawPending = Number(pendingBh.amount) || 0;
    // If rawPending >= currentBaseBudget, then rawPending was stored as the proposed total
    if (rawPending >= currentBaseBudget && currentBaseBudget > 0) {
      return {
        pendingAddedAmount: rawPending - currentBaseBudget,
        pendingTotalBudget: rawPending,
      };
    }
    // If rawPending < currentBaseBudget, it was entered as just the incremental addition
    return {
      pendingAddedAmount: rawPending,
      pendingTotalBudget: currentBaseBudget + rawPending,
    };
  }, [pendingBh, currentBaseBudget]);

  const handleRequestBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addedAmount = Number(requestAmount);
    if (!requestAmount || isNaN(addedAmount) || addedAmount <= 0) {
      toast.error('Please enter a valid change request budget amount');
      return;
    }
    if (!requestReason.trim()) {
      toast.error('Please provide a reason / justification');
      return;
    }

    // Change request cycle: New Total Budget = Current Budget + Added Change Req Budget
    const calculatedTotalBudget = currentBaseBudget + addedAmount;

    try {
      setIsSubmittingRequest(true);
      const res = await api.post(`/projects/${projectId}/budget-request`, {
        amount: calculatedTotalBudget, // New proposed total budget (current + added)
        addedAmount: addedAmount,       // Explicit added change request amount
        changeRequestAmount: addedAmount,
        currentBudget: currentBaseBudget,
        reason: requestReason.trim(),
        approverId: selectedApproverId || undefined,
      });

      if (res.status === 200 || res.status === 201) {
        toast.success(`Change request submitted: +${formatCurrency(addedAmount, project.currency || '$')} (New Total: ${formatCurrency(calculatedTotalBudget, project.currency || '$')})`);
        setShowRequestModal(false);
        setRequestAmount('');
        setRequestReason('');
        await fetchProject();
      } else {
        toast.error('Failed to submit budget request');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit budget request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Socket updates
  useEffect(() => {
    if (!socket || !fetchProject) return;
    
    const handleUpdate = () => {
      fetchProject();
    };

    socket.on('project:updated', handleUpdate);
    socket.on('budget:updated', handleUpdate);

    return () => {
      socket.off('project:updated', handleUpdate);
      socket.off('budget:updated', handleUpdate);
    };
  }, [socket, fetchProject]);

  if (!project) return null;

  const canApproveBudget = !isProjectLocked(project) && hasProjectPermission(user, project, 'budget:approve');
  const canAssignMembers = !isProjectLocked(project) && hasProjectPermission(user, project, 'projects:assign');
  const canAssignSurveyor = !isProjectLocked(project) && hasProjectPermission(user, project, 'sitesurvey:assign');
  const pendingRequests = project.budgetHistory?.filter((bh: any) => bh.approvalStatus === 'Pending') || [];

  const calculateDaysRemaining = () => {
    if (!project.endDate) return 'N/A';
    const end = new Date(project.endDate).getTime();
    const now = new Date().getTime();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleBudgetAction = (budgetId: string, action: 'Approved' | 'Rejected') => {
    const targetBh = project?.budgetHistory?.find((bh: any) => bh._id === budgetId);
    let resolvedTotal = targetBh ? Number(targetBh.amount) : 0;
    let addedDisplay = 0;
    if (targetBh) {
      if (resolvedTotal >= currentBaseBudget && currentBaseBudget > 0) {
        addedDisplay = resolvedTotal - currentBaseBudget;
      } else {
        addedDisplay = resolvedTotal;
        resolvedTotal = currentBaseBudget + resolvedTotal;
      }
    }

    setConfirmModal({
      visible: true,
      title: `${action === 'Approved' ? 'Approve' : 'Reject'} Budget Change Request`,
      message: action === 'Approved'
        ? `Are you sure you want to approve this change request of +${formatCurrency(addedDisplay, project.currency || '$')}? The new total budget will become ${formatCurrency(resolvedTotal, project.currency || '$')}.`
        : `Are you sure you want to reject this budget change request?`,
      confirmText: action,
      type: action === 'Approved' ? 'success' : 'destructive',
      onConfirm: async () => {
        try {
          setIsProcessing(true);
          const res = await api.patch(`/projects/${project._id}/budget-action`, {
            budgetId,
            action,
            newBudget: resolvedTotal,
            amount: resolvedTotal,
          });

          if (res.status === 200 || res.status === 204) {
            toast.success(`Budget request ${action.toLowerCase()} successfully`);
            await fetchProject();
          } else {
            toast.error('Failed to update budget status');
          }
        } catch (e: any) {
          toast.error(e.response?.data?.message || 'Network error occurred');
        } finally {
          setIsProcessing(false);
          setConfirmModal((prev) => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const daysRem = calculateDaysRemaining();

  return (
    <div className="space-y-4">
      {/* ── Site Survey Action Banner ── */}
      {(project.needSiteSurvey || project.status === 'Site Survey' || project.status === 'Initialized' || project.surveyStatus) && (() => {
        const surveyStatus = project.surveyStatus;
        const surveyorName = typeof project.siteSurveyor === 'object' ? (project.siteSurveyor as any)?.name : 'Assigned Surveyor';

        if (surveyStatus === 'Approved') {
          return (
            <div className="p-3.5 sm:p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">Site Survey Completed & Approved</h4>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200/60">
                      Approved
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {project.siteSurveyor ? `Assigned to: ${surveyorName} • ` : ''}Survey report has been approved by management.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const surveyPath = project.projectType === 'Interior'
                    ? `/interior-new/projects/${projectId}/site-survey`
                    : `/construction-dashboard/projects/${projectId}/site-survey`;
                  router.push(surveyPath);
                }}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                <span>View Survey Report</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        if (surveyStatus === 'Submitted') {
          return (
            <div className="p-3.5 sm:p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <Compass className="w-4.5 h-4.5 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">Site Survey Submitted</h4>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-semibold border border-blue-200/60">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Assigned to: {surveyorName} • Awaiting manager review & approval.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const surveyPath = project.projectType === 'Interior'
                    ? `/interior-new/projects/${projectId}/site-survey`
                    : `/construction-dashboard/projects/${projectId}/site-survey`;
                  router.push(surveyPath);
                }}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                <span>View Survey Report</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        if (surveyStatus === 'Needs Attention') {
          return (
            <div className="p-3.5 sm:p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">Site Survey Needs Attention</h4>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200/60">
                      Needs Revision
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Assigned to: {surveyorName} • {project.surveyRejectionReason ? `Reason: ${project.surveyRejectionReason}` : 'Revision required.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const surveyPath = project.projectType === 'Interior'
                    ? `/interior-new/projects/${projectId}/site-survey`
                    : `/construction-dashboard/projects/${projectId}/site-survey`;
                  router.push(surveyPath);
                }}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                <span>View Survey Report</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        return (
          <div className="p-3.5 sm:p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <Map className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">Site Survey Required</h4>
                  {project.siteSurveyor ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200/60">
                      Surveyor Assigned
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200/60">
                      Surveyor Pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {project.siteSurveyor
                    ? `Assigned to: ${surveyorName}`
                    : 'Assign an authorized surveyor to record site measurements & interior diagnostics before design work.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {!project.siteSurveyor ? (
                canAssignSurveyor && (
                <button
                  onClick={() => setIsSurveyModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Assign Surveyor & Send</span>
                </button>
                )
              ) : (
                <button
                  onClick={() => {
                    const surveyPath = project.projectType === 'Interior'
                      ? `/interior-new/projects/${projectId}/site-survey`
                      : `/construction-dashboard/projects/${projectId}/site-survey`;
                    router.push(surveyPath);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <span>View Survey Report</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Pending Budget Change Request Banner ── */}
      {pendingBh && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-3.5 sm:p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h4 className="text-xs font-bold text-amber-900">Budget Change Request Pending</h4>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-amber-200/80 text-amber-800 border border-amber-300/60">
                  +{formatCurrency(pendingAddedAmount, project.currency || '$')} Added
                </span>
                <span className="text-xs font-medium text-amber-900">
                  New Proposed Total: {formatCurrency(pendingTotalBudget, project.currency || '$')} <span className="font-normal text-amber-700">(Current Base: {formatCurrency(currentBaseBudget, project.currency || '$')})</span>
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {pendingBh.reason || 'A budget modification request has been submitted for review.'}
              </p>
            </div>
          </div>

          {canApproveBudget && (
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                disabled={isProcessing}
                onClick={() => handleBudgetAction(pendingBh._id, 'Rejected')}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg border border-amber-300 text-amber-900 bg-white hover:bg-amber-100/50 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Reject
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleBudgetAction(pendingBh._id, 'Approved')}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Approve (+{formatCurrency(pendingAddedAmount, project.currency || '$')})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Under Snagging Banner ── */}
      {project.status === 'Under Snagging' && (
        <div className="flex items-center space-x-3 p-3.5 sm:p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-white border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-800">Project Under Snagging</h4>
            <p className="text-xs text-amber-600 mt-0.5">
              Quality assurance audits are ongoing. Check Handover tab for status.
            </p>
          </div>
        </div>
      )}

      {/* ── Snagging Completed Banner ── */}
      {project.status === 'Snagging Completed' && (
        <div className="flex items-center space-x-3 p-3.5 sm:p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-800">Snagging Completed</h4>
            <p className="text-xs text-emerald-600 mt-0.5">
              The quality inspection phase is finished. Ready for handover operations.
            </p>
          </div>
        </div>
      )}

      {/* ── Bento Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Bento Card 1: Project Details Hero */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/80 lg:col-span-2 flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                {project.status || 'Planning'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {project.category?.name || 'General'}
              </span>
            </div>
            
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-2.5 flex items-center flex-wrap gap-2">
              {project.name}
              {project.projectCode && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {project.projectCode}
                </span>
              )}
            </h2>
            <p className="text-slate-500 mt-1 text-xs leading-relaxed font-normal">
              {project.description || 'No description provided.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-lg p-3 mt-4">
            <div>
              <span className="text-[10.5px] font-medium text-slate-500 block">Start Date</span>
              <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] font-medium text-slate-500 block">Target Date</span>
              <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Bento Card 2: Total Budget */}
        <div
          onClick={() => setShowBudgetHist(true)}
          className={cn(
            "p-4 sm:p-5 rounded-xl bg-white border flex flex-col justify-between cursor-pointer transition-all group relative",
            pendingBh ? "border-amber-300 bg-amber-50/20" : "border-slate-200/80 hover:border-blue-300"
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Budget</span>
              <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105", pendingBh ? "bg-amber-100 border-amber-200 text-amber-600" : "bg-blue-50 border-blue-100 text-blue-600")}>
                <History className="w-3.5 h-3.5" />
              </div>
            </div>
            
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-3">
              {formatCurrency(project.budgetHistory?.[project.budgetHistory.length - 1]?.amount || 0, project.currency || '$')}
            </h3>
            <div className="flex flex-col gap-1 mt-0.5">
              <p className="text-[11px] text-slate-500 font-normal">Latest Approved Base Budget</p>
              {pendingBh && (
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-amber-100 border border-amber-200 text-amber-800 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 animate-pulse" />
                    <span>+{formatCurrency(pendingAddedAmount, project.currency || '$')} Change Req</span>
                  </span>
                  <span className="text-[10px] font-medium text-amber-700">
                    (Proposed: {formatCurrency(pendingTotalBudget, project.currency || '$')})
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-4">
            <span className="text-xs font-medium text-blue-600 group-hover:text-blue-700 transition-colors flex items-center space-x-1">
              <span>Lifecycle Log</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
            {!isProjectLocked(project) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenRequestModal();
                }}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Change Req</span>
              </button>
            )}
          </div>
        </div>

        {/* Bento Card 3: Days Remaining */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 block">Days Remaining</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-3">
              {daysRem !== 'N/A' ? `${daysRem} Days` : 'N/A'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">Time Remaining Until Target Handover</p>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-400 mt-4 pt-3 border-t border-slate-100">
            <span className="text-[10.5px] font-medium text-slate-400">Scheduled Target Handover</span>
          </div>
        </div>

        {/* Bento Card 4: Project Area */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between transition-all">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 block">Project Area</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Map className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-3">
                {project.area ? `${Number(project.area).toLocaleString()} ${project.areaUnit ? project.areaUnit.toUpperCase() : 'SQFT'}` : 'N/A'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">Total Site Area</p>
            </div>
            
            {project?.siteLocation?.latitude != null && project?.siteLocation?.longitude != null && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${project.siteLocation.latitude},${project.siteLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200/60 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>View Location</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Bento Card 5: Coordination Team */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/80 lg:col-span-2 flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Coordination Team</h3>
              </div>
              {canAssignMembers && (
                <button
                  onClick={() => setIsTeamModalOpen(true)}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Creator display */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-medium text-white shrink-0">
                  {(project.createdBy?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {project.createdBy?.name || 'Manager'}
                  </p>
                  <p className="text-[10px] text-blue-600 truncate font-medium">Admin</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {project.createdBy?.email || 'admin@creator'}
                  </p>
                </div>
              </div>

              {/* Members display */}
              {project.members?.filter((m: any) => {
                if (!m.user) return false;
                const u = m.user || m;
                return u.email !== project.createdBy?.email;
              }).map((member: any, i: number) => {
                const u = member.user || member;
                const name = u.name || member.name || 'Member';
                const email = u.email || member.email || '—';
                const roleName = member.role?.name || 'Member';
                
                return (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center text-xs font-medium text-blue-600 shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">{name}</p>
                      <p className="text-[10px] text-blue-600 truncate font-medium">{roleName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Budget & Change Request Management ── */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600 shrink-0">
            <Wallet className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900">Project Budget & Changes</h4>
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Base: {formatCurrency(currentBaseBudget, project.currency || '$')}
              </span>
              {pendingBh && (
                <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  +{formatCurrency(pendingAddedAmount, project.currency || '$')} Pending → {formatCurrency(pendingTotalBudget, project.currency || '$')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit change requests to add to base budget (Current Budget + Added Change Req) or inspect lifecycle logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowBudgetHist(true)}
            className="flex-1 md:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-200 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Lifecycle Log</span>
          </button>
          {!isProjectLocked(project) && (
            <button
              type="button"
              onClick={handleOpenRequestModal}
              className="flex-1 md:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Request Budget Change</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Budget History Modal ── */}
      {showBudgetHist && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-300 max-w-lg w-full max-h-[80vh] flex flex-col p-5 relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Budget Lifecycle</h3>
                <p className="text-xs text-slate-500 mt-0.5">Historical log & pending requests</p>
              </div>
              <div className="flex items-center gap-2">
                {!isProjectLocked(project) && (
                  <button
                    onClick={() => {
                      setShowBudgetHist(false);
                      handleOpenRequestModal();
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Request Change</span>
                  </button>
                )}
                <button
                  onClick={() => setShowBudgetHist(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Active Base Budget Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10.5px] font-medium text-slate-500">Current Active Base Budget</p>
                  <p className="text-base font-bold text-slate-900">
                    {formatCurrency(currentBaseBudget, project.currency || '$')}
                  </p>
                </div>
              </div>
              {pendingRequests.length > 0 && (
                <span className="text-[10px] font-semibold text-red-600 bg-red-100/80 px-2 py-0.5 rounded-md border border-red-200">
                  +{formatCurrency(pendingAddedAmount, project.currency || '$')} PENDING
                </span>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {project.budgetHistory?.slice().reverse().map((bh: any, i: number) => {
                const badgeColor =
                  bh.approvalStatus === 'Approved'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : bh.approvalStatus === 'Pending'
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-red-50 text-red-600 border-red-100';

                const isPending = bh.approvalStatus === 'Pending';
                const rawAmount = Number(bh.amount) || 0;
                let displayTotal = rawAmount;
                let displayAdded: number | null = null;

                if (isPending) {
                  if (rawAmount >= currentBaseBudget && currentBaseBudget > 0) {
                    displayTotal = rawAmount;
                    displayAdded = rawAmount - currentBaseBudget;
                  } else {
                    displayAdded = rawAmount;
                    displayTotal = currentBaseBudget + rawAmount;
                  }
                }

                return (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-bold text-blue-600">
                          {formatCurrency(displayTotal, project.currency || '$')}
                        </span>
                        {displayAdded !== null && displayAdded > 0 && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            +{formatCurrency(displayAdded, project.currency || '$')} Change Req
                          </span>
                        )}
                      </div>
                      <span className={cn('text-[9.5px] font-semibold px-2 py-0.5 rounded-md border', badgeColor)}>
                        {bh.approvalStatus || 'Approved'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">{bh.reason}</p>

                    {bh.approvalStatus === 'Pending' && canApproveBudget && (
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleBudgetAction(bh._id, 'Rejected')}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleBudgetAction(bh._id, 'Approved')}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Approve (+{formatCurrency(displayAdded ?? pendingAddedAmount, project.currency || '$')})</span>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="border-t border-slate-200/50 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>By: {bh.updatedByName || 'System'}</span>
                      <span>{new Date(bh.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
              {(!project.budgetHistory || project.budgetHistory.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-xs font-normal">
                  No budget lifecycle updates recorded.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Request Budget Change Modal ── */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-300 max-w-lg w-full p-5 relative space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <GitPullRequest className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Request Budget Change</h3>
                  <p className="text-xs text-slate-500">
                    Cycle: <span className="font-medium text-slate-700">Current Budget + Added Change Req Budget</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[10.5px] font-medium text-slate-500 block">
                Budget Addition Preview
              </span>
              <div className="grid grid-cols-3 gap-2 items-center text-center">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                  <span className="text-[9.5px] font-medium text-slate-400 block">Current Budget</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block truncate">
                    {formatCurrency(currentBaseBudget, project.currency || '$')}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    +
                  </div>
                  <span className="text-[9.5px] font-medium text-blue-600 mt-0.5 truncate">Change Req</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
                  <span className="text-[9.5px] font-medium text-emerald-600 block">New Proposed</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 block truncate">
                    {formatCurrency(currentBaseBudget + (Number(requestAmount) > 0 ? Number(requestAmount) : 0), project.currency || '$')}
                  </span>
                </div>
              </div>
              {Number(requestAmount) > 0 && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-normal">Added to project:</span>
                  <span className="font-semibold text-blue-700">+{formatCurrency(Number(requestAmount), project.currency || '$')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleRequestBudgetSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Added Change Request Budget ({project.currency || '$'})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-medium text-sm">
                    {project.currency || '$'}
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="e.g. 50000 (amount to add to current budget)"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter the additional funds required for this change request. This amount is added to the current base budget.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason / Justification for Change
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe why the additional budget is required (e.g. additional client requirements, scope addition)..."
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-normal text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Approver Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Assign Approver
                </label>
                {isLoadingApprovers ? (
                  <div className="p-3 flex items-center justify-center text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading eligible approvers...
                  </div>
                ) : budgetApprovers.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {budgetApprovers.map((approver: any) => {
                      const isSelected = selectedApproverId === approver._id;
                      return (
                        <div
                          key={approver._id}
                          onClick={() => setSelectedApproverId(approver._id)}
                          className={cn(
                            "p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-all",
                            isSelected
                              ? "bg-blue-50/80 border-blue-300"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                          )}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium", isSelected ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700")}>
                              {(approver.name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{approver.name}</p>
                              <p className="text-[10px] text-slate-500">{approver.role?.name || approver.email}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-lg border border-slate-200">
                    Request will be broadcasted to project managers with budget approval privileges.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingRequest ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit Change Request {Number(requestAmount) > 0 ? `(+${formatCurrency(Number(requestAmount), project.currency || '$')})` : ''}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModal.visible && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-300 space-y-3.5">
            <h4 className="text-sm font-bold text-slate-900">{confirmModal.title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
                disabled={isProcessing}
                className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm || undefined}
                disabled={isProcessing}
                className={cn(
                  'px-3.5 py-2 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer',
                  confirmModal.type === 'destructive'
                    ? 'bg-red-600 hover:bg-red-500'
                    : confirmModal.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-slate-900 hover:bg-slate-800'
                )}
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmModal.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSuccess={fetchProject}
        projectId={projectId}
        currentMembers={project.members || []}
      />
      <SendForSurveyModal
        isOpen={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        onSuccess={fetchProject}
        projectId={projectId}
      />
    </div>
  );
}
