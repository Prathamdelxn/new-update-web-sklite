'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Plus, Loader2, Map, Zap, Droplets,
  DollarSign, Home, Wind, X, Check, Eye, Edit2,
  AlertCircle, ChevronRight, User, Calendar,
  CheckCircle2, ShieldAlert, ImageIcon, Send, Ruler,
  Building2, Layers, Truck, Sparkles, FileText, AlertTriangle
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency } from '@/lib/utils';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
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

  // Surveyor User formatting
  const surveyorId = (survey?.surveyor as any)?._id || survey?.surveyor;
  const surveyorUser = project?.members?.find((m: any) => m._id === surveyorId) ||
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
              <p className="text-xs text-amber-700 mt-0.5">Please record site measurements and interior diagnostics to submit your report.</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
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
            A site survey captures essential measurements, MEP points, wall conditions, and photos before design work begins.
          </p>
          {isAssignedSurveyor && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Lodge Survey Report
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* ── 1. Executive Summary Hero Card ── */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs relative overflow-hidden space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 tracking-widest uppercase">SITE ASSESSMENT</span>
                    {survey.projectType && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                        {survey.projectType}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-0.5">Initial Site Diagnostic Report</h2>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto">
                {badge && StatusIcon && (
                  <div className={cn("px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0 shadow-2xs", badge.bg, badge.color, badge.border)}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{survey.status}</span>
                  </div>
                )}
                {isAssignedSurveyor && survey.status !== 'Approved' && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 border border-slate-150/70 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center uppercase shrink-0 text-xs shadow-2xs">
                  {surveyorName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Surveyor</p>
                  <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{surveyorName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted On</p>
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Budget Status</p>
                  <p className={cn("text-xs font-bold mt-0.5", survey.affectsBudget ? "text-rose-600" : "text-emerald-600")}>
                    {survey.affectsBudget ? 'Budget Impacted' : 'Budget Verified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rejection / Feedback box */}
            {survey.status === 'Needs Attention' && survey.rejectionReason && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Revision Feedback Required</p>
                  <p className="text-xs text-rose-900 mt-1 leading-relaxed italic">"{survey.rejectionReason}"</p>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. Bento Section: Room & Space Specifications ── */}
          {isInterior && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Space & Room Specifications</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Count</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{survey.roomCount ?? 'N/A'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ceiling Height</p>
                  <p className="text-sm font-black text-slate-900 mt-1">
                    {survey.ceilingHeight ? `${survey.ceilingHeight} ${survey.ceilingHeightUnit || 'ft'}` : 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Natural Light</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{survey.naturalLighting || 'Good'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ventilation</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{survey.ventilationAvailable ? 'Available' : 'N/A'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wall Construction</p>
                  <p className="text-sm font-black text-slate-900 mt-1 truncate">{survey.wallCondition || 'Solid Brick'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seepage Check</p>
                  <p className={cn("text-xs font-black mt-1.5", survey.dampnessObserved ? "text-rose-600" : "text-emerald-600")}>
                    {survey.dampnessObserved ? 'Seepage Found' : 'No Seepage'}
                  </p>
                </div>
              </div>

              {survey.dampnessObserved && survey.dampnessNotes && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-150 text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-950">Dampness Observation Notes:</span>
                    <span className="italic">{survey.dampnessNotes}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 3. Bento Section: MEP & Material Logistics ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* MEP Services Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">MEP & Utility Readiness</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-semibold">Electrical Power Supply:</span>
                  <span className="font-bold text-slate-900">{survey.electricalPhase || (survey.powerAvailable ? 'Accessible' : 'Not Ready')}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-semibold">AC Copper Piping:</span>
                  <span className={cn("font-bold", survey.acPipingReady ? "text-teal-600" : "text-slate-400")}>
                    {survey.acPipingReady ? 'Pre-installed' : 'Not Laid'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-semibold">Plumbing & Water Outlets:</span>
                  <span className={cn("font-bold", survey.plumbingDrainReady || survey.waterAvailable ? "text-blue-600" : "text-slate-400")}>
                    {survey.plumbingDrainReady || survey.waterAvailable ? 'Accessible' : 'Not Positioned'}
                  </span>
                </div>
              </div>
            </div>

            {/* Freight Logistics Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Truck className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Material Logistics & Access</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-semibold">Elevator / Stair Access:</span>
                  <span className="font-bold text-slate-900">{survey.elevatorAccessibility || survey.accessibility || 'Good'}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-semibold">Lift Weight Limit:</span>
                  <span className="font-bold text-slate-900">{survey.elevatorCapacityKg ? `${survey.elevatorCapacityKg} kg` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-semibold">Structural Modifications:</span>
                  <span className={cn("font-bold", survey.structuralModification ? "text-orange-600" : "text-slate-500")}>
                    {survey.structuralModification ? 'Modification Required' : 'No Wall Demolition'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Structural Notes Alert */}
          {isInterior && survey.structuralModification && survey.structuralNotes && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wider">Structural Demolition & Modification Notes</h4>
                <p className="text-xs text-orange-950 mt-1 leading-relaxed font-semibold">{survey.structuralNotes}</p>
              </div>
            </div>
          )}

          {/* ── 4. Notes & Observations Hub ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {survey.clientStylePreference && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Client Design Preferences</h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1">{survey.clientStylePreference}</p>
              </div>
            )}

            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Surveyor Comments</h4>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium pt-1">
                {survey.surveyorComments || survey.terrainNotes || 'No additional comments recorded.'}
              </p>
            </div>
          </div>

          {/* ── 5. Site & Room Photos Gallery ── */}
          {((survey.additionalPhotos && survey.additionalPhotos.length > 0) || survey.observationImage) && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Site & Space Observations Gallery</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {(survey.additionalPhotos?.length || 0) + (survey.observationImage ? 1 : 0)} Photos
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {survey.observationImage && (
                  <div
                    onClick={() => setPreviewImage(survey.observationImage)}
                    className="h-32 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-all relative group shadow-2xs"
                  >
                    <img src={survey.observationImage} alt="Main observation" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                      Main Photo
                    </span>
                  </div>
                )}
                {survey.additionalPhotos?.map((url: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewImage(url)}
                    className="h-32 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-all shadow-2xs"
                  >
                    <img src={url} alt={`Space photo ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. Budget Change Request Box ── */}
          {survey.affectsBudget && (
            <div className="p-6 bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider">Budget Modification Requested</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Recommended Estimate</p>
                  <p className="text-2xl font-black text-rose-700 mt-1">{formatCurrency(survey.recommendedBudget, (project as any)?.currency)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason</p>
                  <p className="text-xs font-bold text-slate-800 mt-1 italic">"{survey.budgetReason}"</p>
                </div>
              </div>

              {survey.status === 'Approved' && !survey.budgetRequestSent && (
                <button
                  onClick={openBudgetModal}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all w-full md:w-auto"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Budget Change Request</span>
                </button>
              )}

              {survey.status === 'Approved' && survey.budgetRequestSent && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl shadow-2xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Request Sent for Admin Approval</span>
                </div>
              )}
            </div>
          )}

          {/* ── 7. Admin Executive Decision Bar ── */}
          {isAdminOrManager && survey.status === 'Submitted' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setIsRejectOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Reject & Request Revision</span>
              </button>
              <button
                disabled={isProcessing}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to approve this survey report? This will advance the project status to "Planning".`)) {
                    handleAction('Approve');
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Approve & Advance Project</span>
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

      {/* Reject Reason Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsRejectOpen(false)} />
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative z-10 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Reject Survey Report</h3>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Specify what details or photos need correction..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsRejectOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
              <button onClick={() => handleAction('Reject')} disabled={isProcessing} className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-xs flex items-center gap-1.5">
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Rejection</span>
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
