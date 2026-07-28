'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Plus, Loader2, Map, Zap, Droplets,
  DollarSign, Home, Wind, X, Check, Eye, Trash2, Edit2,
  AlertCircle, ChevronRight, User, Calendar, MoreVertical,
  CheckCircle2, XCircle, Info, ShieldAlert, ImageIcon, Send, Ruler
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency } from '@/lib/utils';
import { hasProjectPermission } from '@/lib/permissions';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { useSocket } from '@/providers/SocketContext';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { SurveyModal } from '@/features/projects/plans/components/SurveyModal';

interface SurveyTabProps {
  projectId: string;
  siteSurveyorId?: string;
  projectStatus?: string;
  projectType?: 'Construction' | 'Interior';
}

const statusBadgeColor: Record<string, { color: string; bg: string; border: string; icon: React.ComponentType<any> }> = {
  Approved: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-150', icon: CheckCircle2 },
  'Needs Attention': { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-150', icon: ShieldAlert },
  Submitted: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-150', icon: ClipboardCheck },
  Draft: { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-150', icon: ClipboardCheck },
};



export const SurveyTab: React.FC<SurveyTabProps> = ({ projectId }) => {
  const { project, fetchProject } = useProjectContext();
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

  const isAdminOrManager = hasProjectPermission(user, project, 'sitesurvey:manage');

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

      toast.success(`Survey successfully ${action.toLowerCase()}ed!`);
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
      setBudgetApprovers(res.data || []);
    } catch {
      toast.error('Failed to load budget approvers');
    } finally {
      setFetchingApprovers(false);
    }
  };

  const handleSendBudgetRequest = async () => {
    if (sendingBudgetReq) return;
    if (!selectedApprover) {
      toast.error('Please select an approver');
      return;
    }
    setSendingBudgetReq(true);
    try {
      await api.post(`/projects/${projectId}/budget-request`, {
        approverId: selectedApprover,
      });
      toast.success('Budget request sent successfully');
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Define Surveyor Info mapping
  const surveyorId = (survey?.surveyor as any)?._id || survey?.surveyor;
  const surveyorUser = project?.members?.find((m: any) => m._id === surveyorId) ||
                       ((project?.createdBy as any)?._id === surveyorId ? project?.createdBy : survey?.surveyor);

  let surveyorName = 'Surveyor';
  if (surveyorUser?.name && (!surveyorUser.name.includes(':') || surveyorUser.name.length < 50)) {
    surveyorName = surveyorUser.name;
  } else if (surveyorUser?.email) {
    surveyorName = surveyorUser.email.split('@')[0];
  }
  const surveyorEmail = surveyorUser?.email || '';

  const badge = survey ? (statusBadgeColor[survey.status] || statusBadgeColor.Draft) : null;
  const StatusIcon = badge?.icon;

  return (
    <div className="space-y-6">
      {/* Reminder Banner */}
      {showReminder && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-amber-50 border border-amber-250 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-250 flex items-center justify-center shrink-0 mt-0.5">
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Site survey pending — action required</p>
              <p className="text-xs text-amber-700 mt-0.5">You are assigned as the surveyor for this project. Please submit your site details report.</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-amber-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Submit Assessment
          </button>
        </div>
      )}

      {/* Main Survey State Display */}
      {!survey ? (
        <div className="py-24 text-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-3xl">
          <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No site survey recorded yet</h3>
          <p className="text-slate-400 max-w-sm mx-auto text-xs mt-1">Site surveys are essential for project initiation. Record the first assessment to continue.</p>
          {isAssignedSurveyor && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Lodge Survey Report
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Banner Card */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <p className="text-[10px] font-black text-blue-500 tracking-wider uppercase mb-1">SURVEY REPORT</p>
                <h3 className="text-xl font-bold text-slate-900">Initial Assessment Report</h3>
              </div>
              {badge && StatusIcon && (
                <div className={cn("px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0", badge.bg, badge.color, badge.border)}>
                  <StatusIcon className="w-4 h-4" />
                  {survey.status}
                </div>
              )}
            </div>

            {/* Submitter & Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-550 font-bold uppercase shrink-0">
                  {surveyorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Submitted By</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{surveyorName}</p>
                  {surveyorEmail && <p className="text-xs text-slate-550">{surveyorEmail}</p>}
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Date Submitted</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{new Date(survey.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Rejection / Feedback box */}
            {survey.status === 'Needs Attention' && survey.rejectionReason && (
              <div className="p-4 bg-red-50 border border-red-150 rounded-2xl flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-650 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-red-700 uppercase tracking-widest">Rejection Feedback</p>
                  <p className="text-sm text-red-950 mt-1 leading-relaxed font-semibold">"{survey.rejectionReason}"</p>
                </div>
              </div>
            )}

            {/* Edit Button */}
            {isAssignedSurveyor && survey.status !== 'Approved' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50/50 hover:bg-blue-50 text-blue-650 border border-dashed border-blue-200 rounded-2xl text-sm font-bold transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit Survey Report
              </button>
            )}
          </div>

          {/* Condition Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                title: isInterior ? 'Space Condition' : 'Accessibility',
                value: survey.accessibility,
                icon: isInterior ? Home : Map,
                color: survey.accessibility === 'Good' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : (survey.accessibility === 'Hazardous' || survey.accessibility === 'Needs Work') ? 'text-red-650 bg-red-50 border-red-100' : 'text-amber-600 bg-amber-50 border-amber-100'
              },
              {
                title: isInterior ? 'Electrical Access' : 'Grid Power',
                value: survey.powerAvailable ? 'Accessible' : 'None',
                icon: Zap,
                color: survey.powerAvailable ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-slate-400 bg-slate-50 border-slate-100'
              },
              {
                title: isInterior ? 'Plumbing Access' : 'Water Supply',
                value: survey.waterAvailable ? 'Accessible' : 'None',
                icon: Droplets,
                color: survey.waterAvailable ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-400 bg-slate-50 border-slate-100'
              },
              {
                title: 'Budget State',
                value: survey.affectsBudget ? 'Impacted' : 'Stable',
                icon: DollarSign,
                color: survey.affectsBudget ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'
              }
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm text-center flex flex-col items-center">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border mb-2 shrink-0", c.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-base font-black text-slate-900 leading-tight">{c.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{c.title}</p>
                </div>
              );
            })}
          </div>

          {/* Interior: Room Details */}
          {isInterior && (survey.roomCount || survey.ceilingHeight || survey.naturalLighting || survey.ventilationAvailable !== undefined) && (
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
              <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-4">ROOM DETAILS</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {survey.roomCount != null && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0"><Home className="w-4 h-4" /></div>
                    <div><p className="text-xs text-slate-400 font-semibold leading-none">Rooms</p><p className="text-sm font-bold text-slate-900 mt-1">{survey.roomCount}</p></div>
                  </div>
                )}
                {survey.ceilingHeight && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0"><Ruler className="w-4 h-4" /></div>
                    <div><p className="text-xs text-slate-400 font-semibold leading-none">Ceiling Height</p><p className="text-sm font-bold text-slate-900 mt-1">{survey.ceilingHeight}</p></div>
                  </div>
                )}
                {survey.naturalLighting && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0"><Zap className="w-4 h-4" /></div>
                    <div><p className="text-xs text-slate-400 font-semibold leading-none">Natural Light</p><p className="text-sm font-bold text-slate-900 mt-1">{survey.naturalLighting}</p></div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0", survey.ventilationAvailable ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100")}><Wind className="w-4 h-4" /></div>
                  <div><p className="text-xs text-slate-400 font-semibold leading-none">Ventilation</p><p className="text-sm font-bold text-slate-900 mt-1">{survey.ventilationAvailable ? 'Available' : 'N/A'}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* Interior: Structural Modification Needed Warning */}
          {isInterior && survey.structuralModification && (
            <div className="p-5 bg-amber-50/50 border border-amber-250 rounded-3xl shadow-sm space-y-2">
              <div className="flex items-center gap-2.5 text-amber-650">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <h4 className="text-[10px] font-black tracking-widest uppercase">Structural Modifications Needed</h4>
              </div>
              <p className="text-sm text-amber-955 leading-relaxed font-semibold">
                {survey.structuralNotes || 'Structural modifications requested — no additional details provided.'}
              </p>
            </div>
          )}

          {/* Interior: Client Style Preference */}
          {isInterior && survey.clientStylePreference && (
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
              <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2">CLIENT STYLE PREFERENCE</h4>
              <p className="text-sm text-slate-750 font-medium leading-relaxed">{survey.clientStylePreference}</p>
            </div>
          )}

          {/* Space Condition Notes */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
            <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2">
              {isInterior ? 'Space & Condition Notes' : 'Terrain & Soil Report'}
            </h4>
            <p className="text-sm text-slate-750 font-medium leading-relaxed">
              {survey.terrainNotes || (isInterior ? 'No space condition notes provided.' : 'No terrain details submitted.')}
            </p>
          </div>

          {/* Surveyor Comments */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
            <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2">Surveyor Comments</h4>
            <p className="text-sm text-slate-750 font-medium leading-relaxed">
              {survey.surveyorComments || 'No general surveyor comments provided.'}
            </p>
          </div>

          {/* Media Observations Photo */}
          {survey.observationImage && (
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
              <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-4">
                {isInterior ? 'Space Observation Photo' : 'Site Observation Photo'}
              </h4>
              <div
                onClick={() => setPreviewImage(survey.observationImage)}
                className="w-full max-w-lg h-72 border border-slate-200 rounded-2xl overflow-hidden cursor-zoom-in hover:opacity-95 transition-opacity"
              >
                <img src={survey.observationImage} alt="Observation photo" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          {/* Additional Photos List */}
          {isInterior && survey.additionalPhotos?.length > 0 && (
            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm">
              <h4 className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-4">ADDITIONAL SPACE PHOTOS</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {survey.additionalPhotos.map((url: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewImage(url)}
                    className="h-28 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-all shadow-sm"
                  >
                    <img src={url} alt={`Room photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Modification Request Box */}
          {survey.affectsBudget && (
            <div className="p-6 bg-red-50/50 border border-red-150 rounded-3xl space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 text-red-650">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-black uppercase tracking-wider">Budget Modification Requested</h4>
              </div>
              <div>
                <p className="text-xs text-slate-450 font-semibold leading-none">New Estimate</p>
                <p className="text-2xl font-black text-red-750 mt-1.5">{formatCurrency(survey.recommendedBudget, (project as any)?.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-450 font-semibold leading-none">Reason</p>
                <p className="text-sm font-bold text-red-950 mt-1 leading-relaxed">"{survey.budgetReason}"</p>
              </div>

              {/* Action trigger for budget modification */}
              {survey.status === 'Approved' && !survey.budgetRequestSent && (
                <button
                  onClick={openBudgetModal}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-sm font-bold shadow-md shadow-red-600/20 w-full md:w-auto"
                >
                  <Send className="w-4 h-4" />
                  Send Budget Change Request
                </button>
              )}

              {survey.status === 'Approved' && survey.budgetRequestSent && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl shadow-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Request Sent to Approver
                </div>
              )}
            </div>
          )}

          {/* Admin Decision Actions Panels */}
          {isAdminOrManager && survey.status === 'Submitted' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setIsRejectOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 rounded-2xl text-sm font-bold transition-colors"
              >
                <X className="w-4 h-4" />
                Reject Report
              </button>
              <button
                disabled={isProcessing}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to approve this survey report? This will advance the project status to "Planning".`)) {
                    handleAction('Approve');
                  }
                }}
                className="flex-2 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Form Modal */}
      <SurveyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSurvey}
        projectId={projectId}
        projectType={project?.projectType}
        project={project}
        existingSurvey={survey}
      />

      {/* Reject Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsRejectOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Refuse Site Survey</h3>
            <p className="text-xs text-slate-500 mb-4">Provide actionable feedback so the surveyor can rectify the issues.</p>
            <textarea
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-semibold"
              placeholder="e.g. Missing terrain composition data..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setIsRejectOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleAction('Reject')}
                className="flex-1 py-2.5 rounded-xl bg-red-650 hover:bg-red-500 text-white font-bold text-sm transition-all flex items-center justify-center"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Approver Modal */}
      {isBudgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsBudgetOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-150 flex flex-col max-h-[80vh]">
            <div className="shrink-0 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Select Budget Approver</h3>
              <p className="text-xs text-slate-500 mt-1">Choose a team member with budget approval permissions to review this change.</p>
            </div>
            {fetchingApprovers ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-5">
                {budgetApprovers.length === 0 ? (
                  <p className="text-center py-6 text-sm text-slate-400">No approvers assigned to this project.</p>
                ) : (
                  budgetApprovers.map((a: any) => (
                    <button
                      key={a._id}
                      onClick={() => setSelectedApprover(a._id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        selectedApprover === a._id
                          ? "border-blue-300 bg-blue-50/50"
                          : "border-slate-200 bg-white hover:border-blue-200"
                      )}
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-950">{a.name}</p>
                        <p className="text-xs text-slate-550 mt-0.5">{a.roleName || 'Approver'}</p>
                      </div>
                      {selectedApprover === a._id && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setIsBudgetOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-655 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                disabled={sendingBudgetReq || !selectedApprover}
                onClick={handleSendBudgetRequest}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {sendingBudgetReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4">
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10">
            <img src={previewImage} alt="Observation Preview" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
