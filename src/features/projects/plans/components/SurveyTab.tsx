'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Plus, Loader2, Map, Zap, Droplets,
  DollarSign, Home, X, Check, Edit2, AlertCircle,
  Calendar, Clock, CheckCircle2, ShieldAlert, ImageIcon, Send,
  Building2, Sparkles, FileText, Activity, Wallet
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { useAuth } from '@/providers/AuthContext';
import { useSocket } from '@/providers/SocketContext';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { SurveyModal } from '@/features/projects/plans/components/SurveyModal';

const statusBadgeColor: Record<string, { color: string; bg: string; border: string; icon: React.ComponentType<any> }> = {
  Approved: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
  'Needs Attention': { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: ShieldAlert },
  Submitted: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: ClipboardCheck },
  Draft: { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: ClipboardCheck },
};

interface SurveyTabProps {
  projectId: string;
  siteSurveyorId?: string;
  projectStatus?: string;
  projectType?: 'Construction' | 'Interior';
}

export const SurveyTab: React.FC<SurveyTabProps> = ({ projectId }) => {
  const { project, fetchProject } = useProjectContext();
  const { confirm } = useConfirm();
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [budgetApprovers, setBudgetApprovers] = useState<any[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string | null>(null);

  const [fetchingApprovers, setFetchingApprovers] = useState(false);
  const [sendingBudgetReq, setSendingBudgetReq] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const toast = useToast();
  const { user } = useAuth();
  const { socket } = useSocket();

  const isInterior = project?.projectType === 'Interior';
  const siteSurveyorId = typeof project?.siteSurveyor === 'string'
    ? project.siteSurveyor
    : (project?.siteSurveyor as any)?._id;

  const isAssignedSurveyor = !!(
    siteSurveyorId &&
    (user?.id === siteSurveyorId || user?._id === siteSurveyorId)
  );

  const isAdminOrManager = !isProjectLocked(project) && hasProjectPermission(user, project, 'sitesurvey:manage');
  const canView = hasProjectPermission(user, project, 'sitesurvey:view') || isAdminOrManager || isAssignedSurveyor;

  const canApproveBudget = !isProjectLocked(project) && (
    hasProjectPermission(user, project, 'budget:approve') ||
    (user?.role as any) === 'Admin' ||
    (user?.role as any)?.name === 'Admin' ||
    isAdminOrManager
  );

  const pendingBudgetReq = project?.budgetHistory?.find(
    (bh: any) => bh.approvalStatus === 'Pending'
  );

  const [isProcessingBudgetAction, setIsProcessingBudgetAction] = useState(false);

  const handleBudgetAction = async (budgetId: string, action: 'Approved' | 'Rejected') => {
    setIsProcessingBudgetAction(true);
    try {
      const res = await api.patch(`/projects/${projectId}/budget-action`, {
        budgetId,
        action,
      });
      if (res.status === 200 || res.status === 204) {
        toast.success(`Budget request ${action.toLowerCase()} successfully`);
        await fetchProject();
        await fetchSurvey();
      } else {
        toast.error('Failed to update budget status');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update budget status');
    } finally {
      setIsProcessingBudgetAction(false);
    }
  };

  const fetchSurvey = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await api.get(`/projects/${projectId}/survey`);
      setSurvey(response.data);
    } catch (error) {
      console.error('Error fetching survey:', error);
      toast.error('Failed to load site survey');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  useEffect(() => {
    if (!socket) return;
    socket.on('survey:updated', fetchSurvey);
    return () => {
      socket.off('survey:updated', fetchSurvey);
    };
  }, [socket, fetchSurvey]);

  const handleAction = async (action: 'Approve' | 'Reject') => {
    if (isProcessing) return;
    if (action === 'Reject' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejecting the survey.');
      return;
    }

    setIsProcessing(true);
    try {
      await api.patch(`/projects/${projectId}/survey`, {
        action,
        rejectionReason: action === 'Reject' ? rejectionReason : undefined,
      });

      toast.success(`Survey report ${action.toLowerCase()}ed successfully!`);
      setIsRejectOpen(false);
      setRejectionReason('');
      await fetchSurvey();
      if (fetchProject) fetchProject();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${action} survey`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openBudgetModal = async () => {
    setIsBudgetOpen(true);
    setFetchingApprovers(true);
    try {
      const res = await api.get(`/projects/${projectId}/budget-approvers`);
      const list = res.data || [];
      setBudgetApprovers(list);
      if (list.length > 0) {
        setSelectedApprover(list[0]._id);
      } else {
        setSelectedApprover(null);
      }
    } catch {
      toast.error('Failed to load budget approvers');
    } finally {
      setFetchingApprovers(false);
    }
  };

  const handleSendBudgetRequest = async () => {
    if (sendingBudgetReq) return;
    const targetApprover = selectedApprover || (budgetApprovers.length > 0 ? budgetApprovers[0]._id : undefined);
    setSendingBudgetReq(true);
    try {
      await api.post(`/projects/${projectId}/budget-request`, {
        approverId: targetApprover,
      });
      toast.success('Budget change request sent to approver');
      setIsBudgetOpen(false);
      await fetchSurvey();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setSendingBudgetReq(false);
    }
  };

  const showReminder = isAssignedSurveyor && project?.status === 'Site Survey' && !loading && !survey;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-slate-500">You don't have permission to view the site survey.</p>
      </div>
    );
  }

  // Surveyor User formatting matching mobile logic
  const surveyorId = (survey?.surveyor as any)?._id || survey?.surveyor;
  const matchedMember: any = (project?.members as any[])?.find((m: any) => String(m.user?._id || m.user) === String(surveyorId));
  const surveyorUser = (matchedMember?.user && typeof matchedMember.user === 'object' ? matchedMember.user : null) ||
    ((project?.createdBy as any)?._id === surveyorId ? project?.createdBy : survey?.surveyor);

  let surveyorName = 'Assigned Surveyor';
  if (surveyorUser?.name && (!surveyorUser.name.includes(':') || surveyorUser.name.length < 50)) {
    surveyorName = surveyorUser.name;
  } else if (surveyorUser?.email) {
    surveyorName = surveyorUser.email.split('@')[0];
  }
  const surveyorEmail = surveyorUser?.email || '';
  const badge = survey ? (statusBadgeColor[survey.status] || statusBadgeColor.Draft) : null;
  const StatusIcon = badge?.icon;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">

      {/* ── Pending Action Reminder ── */}
      {showReminder && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-amber-600 shadow-2xs shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Site Survey Assigned</h4>
              <p className="text-xs text-amber-700 mt-0.5">Please record site measurements and diagnostic report to submit your survey.</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Submit Assessment Report
          </button>
        </div>
      )}

      {/* ── Main Display ── */}
      {!survey ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No site survey recorded yet</h3>
          <p className="text-slate-500 max-w-md mx-auto text-xs mt-1.5 leading-relaxed">
            A site survey captures essential site accessibility, utility connections, photos, and terrain report before project planning.
          </p>
          {(isAssignedSurveyor || isAdminOrManager) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Start Site Survey
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── 1. Header Banner / Hero Card ── */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs relative overflow-hidden space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">SURVEY REPORT</span>
                    {survey.projectType && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                        {survey.projectType}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">Initial Assessment</h2>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto">
                {badge && StatusIcon && (
                  <div className={cn("px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0 shadow-2xs", badge.bg, badge.color, badge.border)}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{survey.status}</span>
                  </div>
                )}
                {(isAssignedSurveyor || isAdminOrManager) && survey.status !== 'Approved' && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit Survey Report</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/70 border border-slate-150/70 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center uppercase shrink-0 text-xs shadow-2xs">
                  {surveyorName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted By</p>
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{surveyorName}</p>
                  {surveyorEmail && <p className="text-[11px] text-slate-500 truncate">{surveyorEmail}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {new Date(survey.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <DollarSign className={cn("w-4 h-4", survey.affectsBudget ? "text-rose-600" : "text-emerald-600")} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget State</p>
                  <p className={cn("text-xs font-bold mt-0.5", survey.affectsBudget ? "text-rose-600" : "text-emerald-600")}>
                    {survey.affectsBudget ? 'Impacted' : 'Stable'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rejection / Feedback box */}
            {survey.status === 'Needs Attention' && survey.rejectionReason && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Rejection Feedback</p>
                  <p className="text-xs text-rose-900 mt-1 leading-relaxed italic">"{survey.rejectionReason}"</p>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Grid Assessment Bento (4 Main Cards - Matching Mobile App) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Accessibility / Space Condition */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col items-center text-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-2.5",
                survey.accessibility === 'Good'
                  ? 'bg-emerald-100 text-emerald-700'
                  : (survey.accessibility === 'Hazardous' || survey.accessibility === 'Needs Work')
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
              )}>
                {isInterior ? <Home className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
              </div>
              <span className="text-base font-bold text-slate-900">{survey.accessibility || 'Good'}</span>
              <span className="text-[11px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">
                {isInterior ? 'Space Condition' : 'Accessibility'}
              </span>
            </div>

            {/* Card 2: Grid Power / Electrical Access */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col items-center text-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-2.5",
                survey.powerAvailable ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
              )}>
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-base font-bold text-slate-900">{survey.powerAvailable ? 'Accessible' : 'None'}</span>
              <span className="text-[11px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">
                {isInterior ? 'Electrical Access' : 'Grid Power'}
              </span>
            </div>

            {/* Card 3: Water Supply / Plumbing Access */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col items-center text-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-2.5",
                survey.waterAvailable ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400'
              )}>
                <Droplets className="w-5 h-5" />
              </div>
              <span className="text-base font-bold text-slate-900">{survey.waterAvailable ? 'Accessible' : 'None'}</span>
              <span className="text-[11px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">
                {isInterior ? 'Plumbing Access' : 'Water Supply'}
              </span>
            </div>

            {/* Card 4: Budget State */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col items-center text-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-2.5",
                survey.affectsBudget ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              )}>
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-base font-bold text-slate-900">{survey.affectsBudget ? 'Impacted' : 'Stable'}</span>
              <span className="text-[11px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">
                Budget State
              </span>
            </div>
          </div>

          {/* ── 3. Interior Specific Cards (Room Details & Structural & Style) ── */}
          {isInterior && (survey.roomCount || survey.ceilingHeight || survey.naturalLighting || survey.ventilationAvailable !== undefined) && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">ROOM DETAILS</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {survey.roomCount != null && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rooms</span>
                    <span className="text-base font-black text-slate-900 mt-1 block">{survey.roomCount}</span>
                  </div>
                )}
                {survey.ceilingHeight && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ceiling Height</span>
                    <span className="text-base font-black text-slate-900 mt-1 block">{survey.ceilingHeight} {survey.ceilingHeightUnit || 'ft'}</span>
                  </div>
                )}
                {survey.naturalLighting && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Natural Light</span>
                    <span className="text-base font-black text-slate-900 mt-1 block">{survey.naturalLighting}</span>
                  </div>
                )}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ventilation</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">{survey.ventilationAvailable ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}

          {isInterior && survey.structuralModification && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 border-b border-amber-200/60 pb-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">STRUCTURAL MODIFICATIONS NEEDED</h4>
              </div>
              <p className="text-xs text-amber-950 font-medium leading-relaxed pt-1">
                {survey.structuralNotes || 'Structural changes required — no details provided.'}
              </p>
            </div>
          )}

          {isInterior && survey.clientStylePreference && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">CLIENT STYLE PREFERENCE</h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1 whitespace-pre-wrap">{survey.clientStylePreference}</p>
            </div>
          )}

          {/* ── 4. Detail Notes Cards (Matching Mobile: Terrain & Soil Report + Surveyor Comments) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: TERRAIN & SOIL REPORT (or SPACE & CONDITION NOTES) */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {isInterior ? 'SPACE & CONDITION NOTES' : 'TERRAIN & SOIL REPORT'}
                </h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1 whitespace-pre-wrap">
                {survey.terrainNotes || (isInterior ? 'No space condition notes provided.' : 'No specific technical notes provided.')}
              </p>
            </div>

            {/* Card 2: SURVEYOR COMMENTS */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">SURVEYOR COMMENTS</h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1 whitespace-pre-wrap">
                {survey.surveyorComments || 'No general comments provided.'}
              </p>
            </div>
          </div>

          {/* ── 5. Observation Image (Main Photo) ── */}
          {survey.observationImage && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {isInterior ? 'SPACE OBSERVATION PHOTO' : 'SITE OBSERVATION PHOTO'}
                </h3>
              </div>
              <div
                onClick={() => setPreviewImage(survey.observationImage)}
                className="max-h-96 rounded-2xl overflow-hidden cursor-zoom-in hover:opacity-95 transition-all border border-slate-200 shadow-2xs"
              >
                <img src={survey.observationImage} alt="Main observation" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {/* ── 6. Additional Photos Gallery ── */}
          {survey.additionalPhotos?.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {isInterior ? 'ADDITIONAL ROOM PHOTOS' : 'ADDITIONAL SITE PHOTOS'}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {survey.additionalPhotos.length} Photos
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {survey.additionalPhotos.map((url: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewImage(url)}
                    className="h-28 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-all shadow-2xs"
                  >
                    <img src={url} alt={`Additional photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 7. Budget Request Alert ── */}
          {survey.affectsBudget && (
            <div className="p-6 bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider">Budget Modification Requested</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Estimate</p>
                  <p className="text-2xl font-black text-rose-700 mt-1 truncate">{formatCurrency(survey.recommendedBudget, (project as any)?.currency)}</p>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 italic break-words whitespace-pre-wrap leading-relaxed">"{survey.budgetReason}"</p>
                </div>
              </div>

              {survey.status === 'Approved' && !survey.budgetRequestSent && (
                <button
                  onClick={openBudgetModal}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all w-full md:w-auto cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Budget Change Request</span>
                </button>
              )}

              {survey.status === 'Approved' && survey.budgetRequestSent && (() => {
                const latestReq = (project?.budgetHistory as any[])?.slice().reverse().find(
                  (bh: any) => (bh.reason && bh.reason.toLowerCase().includes('survey')) || bh.approvalStatus === 'Pending' || bh.approvalStatus === 'Approved' || bh.approvalStatus === 'Rejected'
                );
                const status = latestReq?.approvalStatus || 'Pending';
                const updatedBy = latestReq?.updatedByName || 'Admin';

                let assignedTo = null;
                if (latestReq?.reason) {
                  const match = latestReq.reason.match(/sent to ([^:]+)/i);
                  if (match) assignedTo = match[1].trim();
                }

                if (status === 'Approved') {
                  return (
                    <div className="pt-2 border-t border-rose-200/60 space-y-1">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Budget Approved</span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-700">Approved by {updatedBy}</p>
                    </div>
                  );
                }

                if (status === 'Rejected') {
                  return (
                    <div className="pt-2 border-t border-rose-200/60 space-y-1">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl shadow-2xs">
                        <X className="w-4 h-4 text-rose-600" />
                        <span>Budget Rejected</span>
                      </div>
                      <p className="text-xs font-semibold text-rose-700">Rejected by {updatedBy}</p>
                    </div>
                  );
                }

                return (
                  <div className="pt-2 border-t border-rose-200/60 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl shadow-2xs">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Request Sent to Approver</span>
                        </div>
                        {assignedTo && (
                          <p className="text-xs font-semibold text-amber-700 mt-1">Assigned to: {assignedTo}</p>
                        )}
                      </div>

                      {pendingBudgetReq && canApproveBudget && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            disabled={isProcessingBudgetAction}
                            onClick={() => handleBudgetAction((pendingBudgetReq as any)._id, 'Rejected')}
                            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            disabled={isProcessingBudgetAction}
                            onClick={() => handleBudgetAction((pendingBudgetReq as any)._id, 'Approved')}
                            className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isProcessingBudgetAction ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Approve Budget</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── 8. Admin Executive Decision Bar (Matching Mobile Action Row) ── */}
          {isAdminOrManager && survey.status === 'Submitted' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setIsRejectOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Reject</span>
              </button>
              <button
                disabled={isProcessing}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Approve Survey',
                    message: `Are you sure you want to approve this survey report? This will allow ${isInterior ? 'interior design planning' : 'construction planning'} to proceed.`,
                    confirmText: 'Approve Report',
                    type: 'success',
                  });
                  if (ok) {
                    handleAction('Approve');
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Approve Report</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modals & Preview ── */}
      <SurveyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSurvey}
        projectId={projectId}
        projectType={project?.projectType}
        project={project}
        existingSurvey={survey}
      />

      {/* Send Budget Change Request Modal */}
      {isBudgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsBudgetOpen(false)} />
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative z-10 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Select Budget Approver</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Choose a team member with budget approval permissions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">New Estimate:</span>
                <span className="font-black text-rose-600 text-sm">{formatCurrency(survey?.recommendedBudget, (project as any)?.currency)}</span>
              </div>
              {survey?.budgetReason && (
                <div className="text-xs border-t border-slate-200/60 pt-2">
                  <span className="font-bold text-slate-500 block mb-0.5">Reason:</span>
                  <p className="text-slate-700 italic font-medium break-words whitespace-pre-wrap">"{survey.budgetReason}"</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Select Approver</label>
              {fetchingApprovers ? (
                <div className="flex items-center justify-center py-3 bg-slate-50 rounded-xl text-slate-500 text-xs gap-2 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading eligible approvers...</span>
                </div>
              ) : (
                <select
                  value={selectedApprover || ''}
                  onChange={(e) => setSelectedApprover(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                >
                  {budgetApprovers.length > 0 ? (
                    budgetApprovers.map((app: any) => (
                      <option key={app._id} value={app._id}>
                        {app.name} ({app.roleName || app.role?.name || 'Approver'})
                      </option>
                    ))
                  ) : (
                    <option value="">Project Admin / Manager</option>
                  )}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setIsBudgetOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-250 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendBudgetRequest}
                disabled={sendingBudgetReq || fetchingApprovers}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {sendingBudgetReq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsRejectOpen(false)} />
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative z-10 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Refuse Site Survey</h3>
            <p className="text-xs text-slate-500">Provide actionable feedback so the surveyor can rectify the issues.</p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Missing terrain composition data..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsRejectOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
              <button onClick={() => handleAction('Reject')} disabled={isProcessing} className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-xs flex items-center gap-1.5">
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Fullscreen Preview" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
            <button onClick={() => setPreviewImage(null)} className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

