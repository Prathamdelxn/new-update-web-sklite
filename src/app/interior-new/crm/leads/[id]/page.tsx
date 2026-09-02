'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { GlassCard } from '@/components/ui/GlassCard';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { ArrowLeft, User, Phone, Mail, Building, DollarSign, Activity, Plus, MessageSquare, X, CheckCircle2, Calendar, MapPin, Ruler, PenTool, UploadCloud, File as FileIcon, Image as ImageIcon, Calculator, FileText, ChevronDown, Pencil, Trash2, DoorOpen, Maximize2, Columns, Zap, Droplets, Wind, Armchair, AlertTriangle, Layers, Palette, Sliders, Sun, Sparkles, Box, Archive, ExternalLink, Eye, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InteriorLogSiteVisitModal } from '@/features/interior-new/components/crm/modals/InteriorLogSiteVisitModal';
import { InteriorSendToSiteVisitModal } from '@/features/interior-new/components/crm/modals/InteriorSendToSiteVisitModal';
import { InteriorSendToRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorSendToRequirementsModal';
import { InteriorSendToDrawingModal } from '@/features/interior-new/components/crm/modals/InteriorSendToDrawingModal';
import { InteriorSendToBoqModal } from '@/features/interior-new/components/crm/modals/InteriorSendToBoqModal';
import { InteriorSendToQuotationsModal } from '@/features/interior-new/components/crm/modals/InteriorSendToQuotationsModal';
import { InteriorConvertToProjectModal } from '@/features/interior-new/components/crm/modals/InteriorConvertToProjectModal';
import { InteriorScheduleFollowUpModal } from '@/features/interior-new/components/crm/modals/InteriorScheduleFollowUpModal';
import { InteriorLogRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorLogRequirementsModal';
import { InteriorUploadDesignModal, detectFileType, getFileBadgeInfo } from '@/features/interior-new/components/crm/modals/InteriorUploadDesignModal';
import { Interior3DViewerModal } from '@/features/interior-new/components/crm/modals/Interior3DViewerModal';
import { InteriorQuotationBuilderModal } from '@/features/interior-new/components/crm/modals/InteriorQuotationBuilderModal';
import { InteriorEditLeadModal } from '@/features/interior-new/components/crm/modals/InteriorEditLeadModal';
import { InteriorDeleteLeadModal } from '@/features/interior-new/components/crm/modals/InteriorDeleteLeadModal';
import { QuotationPreview } from '@/components/crm/QuotationPreview';
import { BoqPreview } from '@/components/crm/BoqPreview';
import { InteriorBoqBuilderModal } from '@/features/interior-new/components/crm/modals/InteriorBoqBuilderModal';

export default function Lead360View() {
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [isSendToSiteVisitOpen, setIsSendToSiteVisitOpen] = useState(false);
  const [isSendToReqOpen, setIsSendToReqOpen] = useState(false);
  const [isSendToDrawingOpen, setIsSendToDrawingOpen] = useState(false);
  const [isSendToBoqOpen, setIsSendToBoqOpen] = useState(false);
  const [isSendToQuotationsOpen, setIsSendToQuotationsOpen] = useState(false);
  const [isConvertToProjectOpen, setIsConvertToProjectOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [selected3DFile, setSelected3DFile] = useState<any | null>(null);
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [activeQuotationIndex, setActiveQuotationIndex] = useState(0);
  const [activeBoqIndex, setActiveBoqIndex] = useState(0);
  const [editingBoqIndex, setEditingBoqIndex] = useState<number | null>(null);
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'Phone Call',
    status: 'Completed',
    remarks: ''
  });

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [designSubTab, setDesignSubTab] = useState<'2d' | '3d'>('2d');
  const [followUpForm, setFollowUpForm] = useState({
    type: 'Phone Call',
    status: 'Pending',
    scheduledDate: '',
    remarks: ''
  });

  const fetchData = async () => {
    try {
      const leadRes = await interiorCrmService.getCustomers();
      const customerList = leadRes?.success && leadRes?.data ? leadRes.data : Array.isArray(leadRes) ? leadRes : [];
      const found = customerList.find((d: any) => d._id === params.id);
      if (found) setLead(found);

      const actRes = await interiorCrmService.getActivities(params.id as string);
      const activityList = actRes?.success && actRes?.data ? actRes.data : Array.isArray(actRes) ? actRes : [];
      setActivities(activityList);
      
      const userRes = await interiorCrmService.getUsers();
      const userList = userRes?.success && userRes?.data ? userRes.data : Array.isArray(userRes) ? userRes : [];
      setUsers(userList);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (checked && params.id) {
      fetchData();
    }
  }, [checked, params.id]);

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRemarks = activityForm.remarks.trim();
    if (!trimmedRemarks) return toast.error('Please enter remarks/notes for the activity');

    setIsSubmitting(true);
    try {
      await interiorCrmService.createActivity({
        ...activityForm,
        remarks: trimmedRemarks,
        customer: params.id
      });
      toast.success('Activity logged successfully!');
      setIsActivityModalOpen(false);
      setActivityForm({ type: 'Phone Call', status: 'Completed', remarks: '' });
      fetchData(); // refresh timeline
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to log activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpForm.scheduledDate) return toast.error('Follow-up date & time is required');
    const trimmedRemarks = followUpForm.remarks.trim();
    if (!trimmedRemarks) return toast.error('Follow-up goal / notes are required');

    setIsSubmitting(true);
    try {
      await interiorCrmService.createActivity({
        ...followUpForm,
        remarks: trimmedRemarks,
        customer: params.id
      });
      toast.success('Follow-up scheduled successfully!');
      setIsFollowUpModalOpen(false);
      setFollowUpForm({ type: 'Phone Call', status: 'Pending', scheduledDate: '', remarks: '' });
      fetchData(); // refresh timeline
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await interiorCrmService.updateCustomer(params.id as string, { status: newStatus });
      toast.success(`Lead moved to ${newStatus}`);
      fetchData(); // refresh to show new status and the auto-logged activity
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'site' | 'requirements' | 'designs' | 'boq' | 'quotations'>('overview');

  if (!checked) return null;
  if (isLoading) return <InteriorShell><div className="p-8 flex items-center justify-center text-slate-500 min-h-[60vh] font-medium animate-pulse">Loading Lead Profile...</div></InteriorShell>;
  if (!lead) return <InteriorShell><div className="p-8 text-rose-500 font-bold text-center">Lead not found.</div></InteriorShell>;

  const handleConfirmDeleteLead = async () => {
    if (!lead) return;
    setIsDeletingLead(true);
    try {
      await interiorCrmService.deleteCustomer(lead._id);
      toast.success('Lead deleted successfully');
      router.push('/interior-new/crm');
    } catch (error: any) {
      toast.error('Failed to delete lead');
    } finally {
      setIsDeletingLead(false);
    }
  };

  const STAGE_ORDER: Record<string, number> = {
    'New Lead': 0,
    'Contacted': 0,
    'Meeting Scheduled': 0,
    'Under Site Visit': 1,
    'Measurement Done': 1,
    'Under Requirement': 2,
    'Under Drawing': 3,
    'Design Approved': 3,
    'Under BOQ Creation': 4,
    'Under Quotation': 5,
    'Booking Pending': 5,
    'Won': 6,
    'Converted': 6,
    'Lost': 6,
  };

  const isConverted = lead?.status === 'Won' || lead?.status === 'Converted' || !!lead?.linkedProject;

  const getTabLockState = (tabId: string) => {
    if (isConverted) {
      return { isLocked: false, requiredStage: '', stageTitle: '' };
    }
    const currentStage = STAGE_ORDER[lead?.status || 'New Lead'] ?? 0;

    switch (tabId) {
      case 'overview':
        return { isLocked: false, requiredStage: 'New Lead', stageTitle: 'Overview' };
      case 'site': {
        const isUnlocked = currentStage >= 1 || !!lead?.siteMeasurements || (lead?.sitePhotos && lead.sitePhotos.length > 0);
        return { isLocked: !isUnlocked, requiredStage: 'Under Site Visit', stageTitle: 'Site Visit' };
      }
      case 'requirements': {
        const isUnlocked = currentStage >= 2 || (lead?.requirements && lead.requirements.length > 0);
        return { isLocked: !isUnlocked, requiredStage: 'Under Requirement', stageTitle: 'Requirements' };
      }
      case 'designs': {
        const isUnlocked = currentStage >= 3 || (lead?.designFiles && lead.designFiles.length > 0);
        return { isLocked: !isUnlocked, requiredStage: 'Under Drawing', stageTitle: '2D/3D Drawing' };
      }
      case 'boq': {
        const isUnlocked = currentStage >= 4 || (lead?.boqs && lead.boqs.length > 0);
        return { isLocked: !isUnlocked, requiredStage: 'Under BOQ Creation', stageTitle: 'BOQ' };
      }
      case 'quotations': {
        const isUnlocked = currentStage >= 5 || (lead?.quotations && lead.quotations.length > 0);
        return { isLocked: !isUnlocked, requiredStage: 'Under Quotation', stageTitle: 'Quotations' };
      }
      default:
        return { isLocked: false, requiredStage: '', stageTitle: '' };
    }
  };

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'site', label: 'Site Visits' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'designs', label: '2D/3D Drawing' },
    { id: 'boq', label: 'BOQ' },
    { id: 'quotations', label: 'Quotations' },
  ];

  return (
    <InteriorShell>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 p-3 sm:p-4 md:p-8 animate-in fade-in duration-500 max-w-full overflow-x-hidden">
        
        {/* --- 1. SLEEK PROFILE HEADER --- */}
        <div className="bg-[hsl(var(--card))] rounded-2xl p-3.5 sm:p-5 md:p-6 border border-[hsl(var(--border))] flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-5">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            <button 
              onClick={() => router.push('/interior-new/crm')}
              className="p-2 sm:p-2.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] rounded-xl transition-all shrink-0 active:scale-95 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              title="Back to CRM"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col gap-1 min-w-0 max-w-full">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h1 
                  className="text-lg sm:text-xl md:text-2xl font-black text-[hsl(var(--foreground))] tracking-tight truncate max-w-[200px] sm:max-w-[360px] md:max-w-[520px]"
                  title={lead.name}
                >
                  {lead.name}
                </h1>
                <span className="font-mono bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-bold border border-[hsl(var(--border))] shrink-0">
                  {lead.leadNumber || 'LD-XXXX'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                <a href={`tel:${lead.mobileNumber}`} className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.5)] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-[hsl(var(--border))] transition-colors">
                  <Phone size={12} className="text-blue-500 shrink-0" /> {lead.mobileNumber}
                </a>
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.5)] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-[hsl(var(--border))] transition-colors truncate max-w-[220px]">
                    <Mail size={12} className="text-purple-500 shrink-0" /> {lead.email}
                  </a>
                )}
                {(lead.projectLocation || lead.city) && (
                  <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] font-medium bg-[hsl(var(--muted)/0.5)] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-[hsl(var(--border))] truncate">
                    <MapPin size={12} className="text-amber-500 shrink-0" /> {lead.projectLocation || lead.city}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[hsl(var(--border)/0.6)]">
            {(() => {
              const latestQuote = lead.quotations?.[lead.quotations.length - 1];
              let displayStatus = lead.status;
              let badgeColor = "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]";

              if (lead.status === 'Converted' || lead.status === 'Won' || isConverted) {
                displayStatus = 'Converted ✓';
                badgeColor = 'bg-emerald-600 text-white border-emerald-700';
              } else if (latestQuote?.status === 'Accepted') {
                displayStatus = 'Quotation Approved ✓';
                badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
              } else if (latestQuote?.status === 'Rejected') {
                displayStatus = 'Quotation Rejected';
                badgeColor = 'bg-rose-500/10 text-rose-600 border-rose-500/30';
              } else if (lead.status === 'Lost') {
                displayStatus = 'Lost';
                badgeColor = 'bg-rose-500/10 text-rose-600 border-rose-500/30';
              } else if (lead.status === 'New Lead') {
                displayStatus = 'New Lead';
                badgeColor = 'bg-blue-500/10 text-blue-600 border-blue-500/30';
              } else if (lead.status === 'Contacted') {
                displayStatus = 'Contacted';
                badgeColor = 'bg-amber-500/10 text-amber-600 border-amber-500/30';
              } else if (['Meeting Scheduled', 'Under Site Visit', 'Measurement Done'].includes(lead.status)) {
                displayStatus = lead.status;
                badgeColor = 'bg-purple-500/10 text-purple-600 border-purple-500/30';
              } else if (['Under Requirement', 'Requirement Completed'].includes(lead.status)) {
                displayStatus = lead.status;
                badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
              } else if (['Under Drawing', 'Design Approved'].includes(lead.status)) {
                displayStatus = lead.status;
                badgeColor = 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30';
              } else if (lead.status === 'Under BOQ Creation') {
                displayStatus = 'Under BOQ Creation';
                badgeColor = 'bg-teal-500/10 text-teal-600 border-teal-500/30';
              } else if (['Under Quotation', 'Quotation Pending', 'Quotation Sent', 'Negotiation', 'Booking Pending'].includes(lead.status)) {
                if (latestQuote?.status === 'Accepted' || lead.status === 'Booking Pending') {
                  displayStatus = 'Quotation Approved ✓';
                  badgeColor = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
                } else if (latestQuote?.status === 'Rejected') {
                  displayStatus = 'Quotation Rejected';
                  badgeColor = 'bg-rose-500/10 text-rose-600 border-rose-500/30';
                } else {
                  displayStatus = 'Under Quotation';
                  badgeColor = 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30';
                }
              }

              return (
                <span className={cn("text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border shrink-0", badgeColor)}>
                  {displayStatus}
                </span>
              );
            })()}

            {isConverted ? (
              lead.linkedProject && (
                <button
                  onClick={() => {
                    const prjId = typeof lead.linkedProject === 'object' && lead.linkedProject !== null && lead.linkedProject._id
                      ? lead.linkedProject._id
                      : lead.linkedProject;
                    router.push(`/interior-new/projects/${prjId}`);
                  }}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                  title="Open Live Project Workspace"
                >
                  <ExternalLink size={13} /> View Live Project
                </button>
              )
            ) : (
              <>
                {['New Lead', 'Contacted'].includes(lead.status) &&
                  !lead.siteMeasurements &&
                  (!lead.quotations || lead.quotations.length === 0) && (
                    <button
                      onClick={() => setIsSendToSiteVisitOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Send to Site Visit"
                    >
                      <MapPin size={13} /> Send to Site Visit
                    </button>
                  )}

                {['Under Site Visit', 'Measurement Done'].includes(lead.status) && (
                  (lead.siteMeasurements || (lead.sitePhotos && lead.sitePhotos.length > 0)) ? (
                    <button
                      onClick={() => setIsSendToReqOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Send to Requirements"
                    >
                      <PenTool size={13} /> Send to Requirements
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsSiteVisitModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Log Measurements"
                    >
                      <Plus size={13} /> Log Measurements
                    </button>
                  )
                )}

                {['Under Requirement', 'Requirement Completed'].includes(lead.status) && (
                  (lead.requirements && lead.requirements.length > 0) ? (
                    <button
                      onClick={() => setIsSendToDrawingOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Send to 2D/3D Drawing"
                    >
                      <UploadCloud size={13} /> Send to Drawings
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsReqModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Add Requirements"
                    >
                      <Plus size={13} /> Add Requirements
                    </button>
                  )
                )}

                {['Under Drawing', 'Design Approved'].includes(lead.status) && (
                  (lead.designFiles && lead.designFiles.length > 0) ? (
                    <button
                      onClick={() => setIsSendToBoqOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Send to BOQ Creation"
                    >
                      <Calculator size={13} /> Send to BOQ
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsDesignModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Upload Drawings"
                    >
                      <Plus size={13} /> Upload Drawings
                    </button>
                  )
                )}

                {['Under BOQ Creation'].includes(lead.status) && (
                  (lead.boqs && lead.boqs.length > 0) ? (
                    <button
                      onClick={() => setIsSendToQuotationsOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Send to Quotation Phase"
                    >
                      <FileText size={13} /> Send to Quotation
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsBoqModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Create BOQ"
                    >
                      <Plus size={13} /> Create BOQ
                    </button>
                  )
                )}

                {['Under Quotation', 'Quotation Pending', 'Quotation Sent', 'Negotiation', 'Booking Pending'].includes(lead.status) && (
                  (lead.quotations && lead.quotations.length > 0) ? (
                    <button
                      onClick={() => setIsConvertToProjectOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Convert to Won Project"
                    >
                      <CheckCircle2 size={13} /> Convert to Project
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsQuotationModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Create Quotation"
                    >
                      <Plus size={13} /> Create Quotation
                    </button>
                  )
                )}

                {['New Lead', 'Contacted'].includes(lead.status) &&
                  !lead.siteMeasurements &&
                  (!lead.quotations || lead.quotations.length === 0) && (
                    <button
                      onClick={() => setIsFollowUpModalOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Schedule Follow-up"
                    >
                      <Calendar size={13} /> Schedule Follow-up
                    </button>
                  )}

                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-xl transition-all active:scale-95"
                  title="Edit Lead Details"
                >
                  <Pencil size={15} />
                </button>

                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-xl transition-all active:scale-95"
                  title="Delete Lead"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* --- 2. CONVERTED READ-ONLY NOTICE BANNER --- */}
        {isConverted && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[hsl(var(--foreground))]">Lead Converted to Live Project (Locked)</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">This lead is linked to an active execution project and is preserved in read-only mode.</p>
              </div>
            </div>
            {lead.linkedProject && (
              <button
                onClick={() => {
                  const prjId = typeof lead.linkedProject === 'object' && lead.linkedProject !== null && lead.linkedProject._id
                    ? lead.linkedProject._id
                    : lead.linkedProject;
                  router.push(`/interior-new/projects/${prjId}`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0 active:scale-95"
              >
                Open Project Workspace <ExternalLink size={13} />
              </button>
            )}
          </div>
        )}

        {/* --- 3. TAB NAVIGATION --- */}
        <div className="flex items-center gap-4 sm:gap-8 border-b border-[hsl(var(--border))] overflow-x-auto scrollbar-none touch-pan-x px-2">
          {TABS.map((tab) => {
            const { isLocked } = getTabLockState(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
"relative pb-4 text-sm font-bold transition-colors whitespace-nowrap outline-none flex items-center gap-1.5",
                  activeTab === tab.id
                    ? "text-[hsl(var(--primary))]"
                    : isLocked
                    ? "text-[hsl(var(--muted-foreground)/0.6)] hover:text-[hsl(var(--muted-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                {tab.label}
                {isLocked && (
                  <Lock size={12} className="text-amber-500/80 shrink-0" />
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="leadProfileTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-[hsl(var(--primary))] rounded-t-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* --- 4. TAB CONTENT --- */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
              
              {/* Metric Summary Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="bg-[hsl(var(--card))] p-2.5 sm:p-3.5 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5 sm:gap-3">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0"><User size={14} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Client Source</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-[11px] sm:text-xs truncate mt-0.5">{lead.leadSource || 'Manual Entry'}</p>
                  </div>
                </div>
                <div className="bg-[hsl(var(--card))] p-2.5 sm:p-3.5 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5 sm:gap-3">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><Building size={14} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Property Scope</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-[11px] sm:text-xs truncate mt-0.5">{lead.propertyType || 'Not specified'}</p>
                  </div>
                </div>
                <div className="bg-[hsl(var(--card))] p-2.5 sm:p-3.5 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5 sm:gap-3">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0"><DollarSign size={14} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Est. Budget</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-[11px] sm:text-xs truncate mt-0.5 text-emerald-600 dark:text-emerald-400">
                      {lead.quotations?.[lead.quotations.length - 1]?.grandTotal
                        ? `₹${lead.quotations[lead.quotations.length - 1].grandTotal.toLocaleString('en-IN')}`
                        : lead.budgetRange || 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="bg-[hsl(var(--card))] p-2.5 sm:p-3.5 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5 sm:gap-3">
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0"><MapPin size={14} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Location</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-[11px] sm:text-xs truncate mt-0.5">{lead.projectLocation || lead.city || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" /> Activity Timeline
                  </h3>
                  {!isConverted && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setIsActivityModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95"
                      >
                        <Plus size={13} /> Log Note
                      </button>
                      {!['Under Quotation', 'Quotation Pending', 'Quotation Sent', 'Negotiation', 'Booking Pending', 'Won', 'Converted'].includes(lead.status) &&
                        (!lead.quotations || lead.quotations.length === 0) && (
                          <button
                            onClick={() => setIsFollowUpModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 rounded-xl text-xs font-bold transition-all active:scale-95"
                          >
                            <Plus size={13} /> Schedule Follow-up
                          </button>
                        )}
                    </div>
                  )}
                </div>
                
                <div className="relative border-l-2 border-[hsl(var(--border))] ml-2.5 sm:ml-4 pl-4 sm:pl-8 space-y-5 sm:space-y-8">
                  {activities.length === 0 ? (
                    <div className="py-10 sm:py-12 flex flex-col items-center text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] mb-3">
                        <MessageSquare size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">No activities logged</p>
                      <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Keep track of calls, meetings, and notes here.</p>
                    </div>
                  ) : (
                    activities.map((act) => {
                      const loggedByUser = users.find(u => u._id === (act.user?._id || act.user) || u.clerkUserId === (act.user?._id || act.user));
                      const userName = loggedByUser?.name || act.user?.name || 'System';
                      const initial = userName.charAt(0).toUpperCase();

                      return (
                      <div key={act._id} className="relative group">
                        <div className={cn(
                          "absolute -left-[1.35rem] sm:-left-[2.6rem] top-1.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full border-2 sm:border-4 border-[hsl(var(--card))] flex items-center justify-center",
                          act.status === 'Pending' ? "bg-amber-400" : "bg-blue-500"
                        )}></div>
                        
                        <div className="bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-2xl p-3.5 sm:p-5 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                            <span className={cn(
                              "text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border",
                              act.status === 'Pending' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            )}>
                              {act.type} {act.status === 'Pending' && '• Scheduled'}
                            </span>
                            <span className="text-[11px] sm:text-xs font-bold text-[hsl(var(--muted-foreground))]">
                              {act.status === 'Pending' 
                                ? `Due: ${new Date(act.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` 
                                : new Date(act.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              }
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[hsl(var(--foreground))] font-medium leading-relaxed">{act.remarks}</p>
                          <div className="flex items-center gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[hsl(var(--border))]">
                            <div className="w-5 h-5 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[8px] font-bold text-[hsl(var(--muted-foreground))] shrink-0">
                              {initial}
                            </div>
                            <p className="text-[11px] sm:text-xs font-semibold text-[hsl(var(--muted-foreground))] truncate">
                              {act.status === 'Pending' ? 'Scheduled by' : 'Logged by'} <span className="text-[hsl(var(--foreground))]">{userName}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'site' && (
            <motion.div key="site" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4 sm:space-y-6">
              {getTabLockState('site').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-3 sm:mb-4 border border-amber-500/20">
                    <Lock size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-[hsl(var(--foreground))]">Site Visit Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
                    This lead is currently in the <strong className="text-[hsl(var(--foreground))]">"{lead.status}"</strong> stage.
                    Complete initial follow-up and schedule a Site Visit to unlock measurement logging.
                  </p>
                </div>
              ) : !lead.siteMeasurements ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600 mb-3 sm:mb-4">
                    <Ruler size={26} className="sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-[hsl(var(--foreground))]">No Site Measurements Recorded</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
                    Capture comprehensive room dimensions, ceiling heights, MEP points, structural constraints, and site photos.
                  </p>
                  {!isConverted && (
                    <button onClick={() => setIsSiteVisitModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2">
                      <Plus size={15} /> Log Site Visit & Measurements
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {/* Top Bar with actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3.5 sm:p-5 md:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                        <Ruler size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-black text-[hsl(var(--foreground))]">Site Inspection & Technical Specs</h2>
                        <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))]">Detailed measurements, MEP points, and on-site observations.</p>
                      </div>
                    </div>
                    {!isConverted && (
                      <button 
                        onClick={() => setIsSiteVisitModalOpen(true)} 
                        className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
                      >
                        <Pencil size={13} /> Edit Measurements & Photos
                      </button>
                    )}
                  </div>

                  {/* 4-Card Structured Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
                    
                    {/* Card 1: Room & Spatial Dimensions */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                          <Maximize2 size={16} className="text-purple-500" />
                          Room & Spatial Dimensions
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
                          Spatial
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Carpet Area</p>
                          <p className="font-black text-sm text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.carpetArea || '—'} <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Sq.Ft</span>
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Ceiling Height</p>
                          <p className="font-black text-sm text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.ceilingHeight || '—'} <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Ft</span>
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Maximize2 size={11} className="text-purple-500" /> Room Dimensions (Length × Width)
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.roomDimensions || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Layers size={11} className="text-indigo-500" /> Floor-to-Ceiling Height
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.floorToCeilingHeight || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Rooms to Design</p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.rooms || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Openings & Structural Elements */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                          <DoorOpen size={16} className="text-blue-500" />
                          Openings & Structural Specs
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          Structure
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <DoorOpen size={11} className="text-blue-500" /> Door Dimensions
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.doorDimensions || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Maximize2 size={11} className="text-sky-500" /> Window Dimensions
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.windowDimensions || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Columns size={11} className="text-amber-500" /> Wall Thickness
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.wallThickness || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Columns size={11} className="text-orange-500" /> Column / Beam Dimensions
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                            {lead.siteMeasurements.columnBeamDimensions || 'Not recorded'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: MEP & Utility Services */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                          <Zap size={16} className="text-amber-500" />
                          MEP & Utility Services
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          MEP
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Zap size={11} /> Existing Electrical Points
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                            {lead.siteMeasurements.electricalPoints || 'No electrical notes recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Droplets size={11} /> Plumbing Points
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                            {lead.siteMeasurements.plumbingPoints || 'No plumbing points recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Wind size={11} /> AC Locations & Piping
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                            {lead.siteMeasurements.acLocations || 'No AC locations recorded'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Furniture, Constraints & Notes */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                          <Armchair size={16} className="text-emerald-500" />
                          Furniture & Site Constraints
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Conditions
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Armchair size={11} /> Existing Furniture Dimensions
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                            {lead.siteMeasurements.furnitureDimensions || 'No furniture dimensions recorded'}
                          </p>
                        </div>

                        <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <AlertTriangle size={11} /> Site Constraints & Limitations
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                            {lead.siteMeasurements.siteConstraints || 'None reported'}
                          </p>
                        </div>

                        <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <FileText size={11} /> Additional Site Notes
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                            {lead.siteMeasurements.notes || 'No notes added'}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Photos Section */}
                  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                        <ImageIcon size={16} className="text-emerald-500" />
                        Site Photos & Visual Records
                      </h3>
                      <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2.5 py-1 rounded-lg border border-[hsl(var(--border))]">
                        {lead.sitePhotos?.length || 0} Photos Uploaded
                      </span>
                    </div>

                    {lead.sitePhotos && lead.sitePhotos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                        {lead.sitePhotos.map((photo: string, i: number) => (
                          <a
                            key={i}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square rounded-xl overflow-hidden border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-all relative group bg-[hsl(var(--muted)/0.3)] block"
                          >
                            <img src={photo} alt={`Site photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-" size={20} />
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--muted)/0.2)] text-center">
                        <ImageIcon className="w-8 h-8 text-[hsl(var(--muted-foreground))] mb-2 opacity-60" />
                        <p className="text-xs font-bold text-[hsl(var(--foreground))]">No Site Photos Uploaded</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Click edit to upload high resolution site pictures.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requirements' && (
            <motion.div key="requirements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
              {getTabLockState('requirements').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-4 border border-amber-500/20">
                    <Lock size={30} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-black uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-xl font-black text-[hsl(var(--foreground))]">Requirements Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
                    This lead is currently in the <strong className="text-[hsl(var(--foreground))]">"{lead.status}"</strong> stage.
                    Complete the Site Visit & Measurements phase first to unlock requirement logging.
                  </p>
                </div>
              ) : !lead.requirements || lead.requirements.length === 0 ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                    <PenTool size={32} />
                  </div>
                  <h3 className="text-xl font-black text-[hsl(var(--foreground))]">No Requirements Logged</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
                    Capture room-by-room functional needs, aesthetic styles, materials, lighting, and client preferences.
                  </p>
                  {!isConverted && (
                    <button onClick={() => setIsReqModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2">
                      <Plus size={16} /> Add Design Requirements
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 md:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                        <PenTool size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black text-[hsl(var(--foreground))]">Client Design Specifications</h2>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {lead.requirements.length} {lead.requirements.length === 1 ? 'Space' : 'Spaces'}
                          </span>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Functional needs, aesthetic styles, lighting, and materials per room.</p>
                      </div>
                    </div>

                    {!isConverted && (
                      <button 
                        onClick={() => setIsReqModalOpen(true)} 
                        className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
                      >
                        <Pencil size={13} /> Edit Requirements & Budget
                      </button>
                    )}
                  </div>

                  {/* Estimated Budget & Project Overview Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black shrink-0">
                        <DollarSign size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Estimated Budget</p>
                        <p className="text-sm font-black text-[hsl(var(--foreground))] truncate mt-0.5">
                          {lead.budgetRange || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <Building size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Interior Type</p>
                        <p className="text-sm font-black text-[hsl(var(--foreground))] truncate mt-0.5">
                          {lead.requirements[0]?.interiorType || lead.propertyType || 'Residential'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                        <Palette size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Primary Style</p>
                        <p className="text-sm font-black text-[hsl(var(--foreground))] truncate mt-0.5">
                          {lead.requirements.find((r: any) => r.designStyle)?.designStyle || lead.requirements[0]?.theme || 'Custom Style'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <Layers size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Configured Spaces</p>
                        <p className="text-sm font-black text-[hsl(var(--foreground))] truncate mt-0.5">
                          {lead.requirements.length} {lead.requirements.length === 1 ? 'Room / Area' : 'Rooms / Areas'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Room by Room Cards */}
                  <div className="grid grid-cols-1 gap-6">
                    {lead.requirements.map((req: any, index: number) => {
                      const hasFunctional = !!(req.roomUsage || req.furnitureRequirements || req.storage || req.electricalPoints || req.lightingRequirements || req.plumbingRequirements || req.circulation);
                      const hasAesthetic = !!(req.designStyle || req.colours || req.materials || req.flooring || req.ceiling || req.wallFinishes || req.furnitureStyle || req.theme);

                      return (
                        <div key={index} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 space-y-5 hover:border-emerald-500/40 transition-colors">
                          {/* Room Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))]">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <div>
                                <h3 className="text-lg font-black text-[hsl(var(--foreground))]">{req.roomName}</h3>
                                {req.description && (
                                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-1">{req.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {req.interiorType && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] px-2.5 py-1 rounded-lg">
                                  {req.interiorType}
                                </span>
                              )}
                              {(req.designStyle || req.theme) && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                  <Palette size={11} /> {req.designStyle || req.theme}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 2-Column Sections: Functional & Aesthetic */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Functional Column */}
                            <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-2xl p-4 space-y-3.5">
                              <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                                <h4 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                                  <Sliders size={14} className="text-emerald-500" /> Functional Requirements
                                </h4>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">Usage & MEP</span>
                              </div>

                              <div className="space-y-2.5 text-xs">
                                {req.roomUsage && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Room Usage</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5">{req.roomUsage}</p>
                                  </div>
                                )}
                                {req.furnitureRequirements && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Furniture Requirements</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5">{req.furnitureRequirements}</p>
                                  </div>
                                )}
                                {req.storage && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Storage Requirements</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5">{req.storage}</p>
                                  </div>
                                )}
                                {req.electricalPoints && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                      <Zap size={10} /> Electrical Points
                                    </p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{req.electricalPoints}</p>
                                  </div>
                                )}
                                {req.lightingRequirements && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                      <Sun size={10} /> Lighting
                                    </p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{req.lightingRequirements}</p>
                                  </div>
                                )}
                                {req.plumbingRequirements && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-1">
                                      <Droplets size={10} /> Plumbing
                                    </p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{req.plumbingRequirements}</p>
                                  </div>
                                )}
                                {req.circulation && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Circulation & Clearance</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{req.circulation}</p>
                                  </div>
                                )}
                                {!hasFunctional && (
                                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic p-2">No functional requirements specified.</p>
                                )}
                              </div>
                            </div>

                            {/* Aesthetic Column */}
                            <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-2xl p-4 space-y-3.5">
                              <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                                <h4 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                                  <Palette size={14} className="text-purple-500" /> Aesthetic Requirements
                                </h4>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600">Style & Finishes</span>
                              </div>

                              <div className="space-y-2.5 text-xs">
                                {(req.designStyle || req.theme) && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Design Style</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5">{req.designStyle || req.theme}</p>
                                  </div>
                                )}
                                {req.colours && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Colours & Palette</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5">{req.colours}</p>
                                  </div>
                                )}
                                {req.materials && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Materials & Finishes</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5">{req.materials}</p>
                                  </div>
                                )}
                                {req.flooring && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Flooring</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{req.flooring}</p>
                                  </div>
                                )}
                                {req.ceiling && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Ceiling & False Ceiling</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{req.ceiling}</p>
                                  </div>
                                )}
                                {req.wallFinishes && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Wall Finishes</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{req.wallFinishes}</p>
                                  </div>
                                )}
                                {req.furnitureStyle && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))]">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Furniture Style</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5">{req.furnitureStyle}</p>
                                  </div>
                                )}
                                {!hasAesthetic && (
                                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic p-2">No aesthetic requirements specified.</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Specific Instructions / Description */}
                          {req.description && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1.5">
                                <Sparkles size={13} /> Specific Room Instructions & Notes
                              </p>
                              <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed whitespace-pre-wrap">
                                {req.description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'designs' && (
            <motion.div key="designs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
              {getTabLockState('designs').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-4 border border-amber-500/20">
                    <Lock size={30} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-black uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-xl font-black text-[hsl(var(--foreground))]">2D & 3D Drawings Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
                    This lead is currently in the <strong className="text-[hsl(var(--foreground))]">"{lead.status}"</strong> stage.
                    Complete the Client Requirements phase first to unlock 2D layout and 3D model uploads.
                  </p>
                </div>
              ) : !lead.designFiles || lead.designFiles.length === 0 ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4">
                    <UploadCloud size={32} />
                  </div>
                  <h3 className="text-xl font-black text-[hsl(var(--foreground))]">No Drawings or 3D Models Uploaded</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
                    Upload 2D layouts (Floor plan, RCP, Electrical) and 3D models/renders (.dwg, .skp, .fbx, .obj, renders).
                  </p>
                  {!isConverted && (
                    <button onClick={() => setIsDesignModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2">
                      <Plus size={16} /> Upload 2D & 3D Drawings
                    </button>
                  )}
                </div>
              ) : (() => {
                const twoDFiles = (lead.designFiles || []).filter((f: any) => {
                  if (f.category === '2D') return true;
                  if (f.category === '3D') return false;
                  const type = detectFileType(f.name);
                  return type !== '3d-model';
                });

                const threeDFiles = (lead.designFiles || []).filter((f: any) => {
                  if (f.category === '3D') return true;
                  if (f.category === '2D') return false;
                  const type = detectFileType(f.name);
                  return type === '3d-model';
                });

                return (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Top Action Header Bar with Segmented Toggle Button */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6">
                      <div>
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <h2 className="text-sm sm:text-base font-black text-[hsl(var(--foreground))]">2D & 3D Design Drawings</h2>
                          <span className="text-[10px] font-bold px-2 sm:px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            {lead.designFiles.length} Total Files
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          Switch between 2D architectural layouts and 3D models/renders.
                        </p>
                      </div>

                      {/* Header Toggle Buttons */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                        <div className="flex bg-[hsl(var(--muted))] p-1 rounded-xl sm:rounded-2xl border border-[hsl(var(--border))] w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setDesignSubTab('2d')}
                            className={cn(
                              "flex-1 sm:flex-initial justify-center flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-black transition-all active:scale-95",
                              designSubTab === '2d'
                                ? "bg-blue-600 text-white"
                                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            )}
                          >
                            <Layers size={14} />
                            2D Drawings ({twoDFiles.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setDesignSubTab('3d')}
                            className={cn(
                              "flex-1 sm:flex-initial justify-center flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-black transition-all active:scale-95",
                              designSubTab === '3d'
                                ? "bg-purple-600 text-white"
                                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            )}
                          >
                            <Box size={14} />
                            3D Models ({threeDFiles.length})
                          </button>
                        </div>

                        {!isConverted && (
                          <button
                            onClick={() => setIsDesignModalOpen(true)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-[hsl(var(--primary-foreground))] px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
                          >
                            <Plus size={14} /> Upload Drawings
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Partition View */}
                    <AnimatePresence mode="wait">
                      {designSubTab === '2d' ? (
                        <motion.div
                          key="2d-partition"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4"
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                <Layers size={16} />
                              </div>
                              <div>
                                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                                  2D Working Drawings & Layouts
                                </h3>
                                <p className="text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))]">Floor plans, False ceiling (RCP), Electrical & Plumbing layouts</p>
                              </div>
                            </div>
                            <span className="text-[11px] sm:text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                              {twoDFiles.length} {twoDFiles.length === 1 ? 'Drawing' : 'Drawings'}
                            </span>
                          </div>

                          {twoDFiles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
                              {twoDFiles.map((file: any, index: number) => {
                                const type = file.fileType || detectFileType(file.name);
                                const badge = getFileBadgeInfo(file.name, file.category || '2D');

                                return (
                                  <div
                                    key={index}
                                    onClick={() => setSelected3DFile(file)}
                                    className="flex flex-col bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all group cursor-pointer"
                                  >
                                    <div className={`h-36 sm:h-40 flex items-center justify-center relative overflow-hidden ${
                                      type === 'pdf' ? 'bg-red-500/10 text-red-500' :
                                      type === 'cad' ? 'bg-amber-500/10 text-amber-500' :
                                      type === 'archive' ? 'bg-cyan-500/10 text-cyan-500' :
                                      'bg-blue-500/5 text-blue-500'
                                    }`}>
                                      {type === 'image' && file.url ? (
                                        <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                      ) : type === 'pdf' ? (
                                        <FileText size={42} className="group-hover:scale-110 transition-transform" />
                                      ) : type === 'cad' ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <Layers size={38} className="group-hover:scale-110 transition-transform" />
                                          <span className="text-[9px] font-black tracking-widest uppercase">2D CAD</span>
                                        </div>
                                      ) : (
                                        <FileIcon size={38} className="group-hover:scale-110 transition-transform" />
                                      )}
                                    </div>

                                    <div className="p-3 sm:p-3.5 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between gap-2">
                                      <div className="overflow-hidden flex-1 min-w-0">
                                        <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate">{file.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}>
                                            {badge.label}
                                          </span>
                                          {file.uploadedAt && (
                                            <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
                                              {new Date(file.uploadedAt).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelected3DFile(file);
                                          }}
                                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                                          title="View Drawing"
                                        >
                                          <Eye size={13} />
                                        </button>
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-1.5 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-blue-600 transition-colors"
                                          title="Open in new tab"
                                        >
                                          <ExternalLink size={13} />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-10 sm:py-12 flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--muted)/0.2)] text-center">
                              <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-[hsl(var(--muted-foreground))] mb-2 opacity-50" />
                              <p className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">No 2D Working Drawings Uploaded</p>
                              <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-sm">Click upload drawings to add floor plans, electrical, and plumbing PDFs/drawings.</p>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="3d-partition"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4"
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                                <Box size={16} />
                              </div>
                              <div>
                                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                                  3D Models, 3D DWG & Renders
                                </h3>
                                <p className="text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))]">.DWG, SketchUp .SKP, .FBX, .OBJ, .BLEND, Revit, Realistic 3D Renders</p>
                              </div>
                            </div>
                            <span className="text-[11px] sm:text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                              {threeDFiles.length} {threeDFiles.length === 1 ? 'Model/Render' : 'Models/Renders'}
                            </span>
                          </div>

                          {threeDFiles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
                              {threeDFiles.map((file: any, index: number) => {
                                const type = file.fileType || detectFileType(file.name);
                                const badge = getFileBadgeInfo(file.name, file.category || '3D');

                                return (
                                  <div
                                    key={index}
                                    onClick={() => setSelected3DFile(file)}
                                    className="flex flex-col bg-[hsl(var(--muted)/0.3)] hover:bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] hover:border-purple-500/50 rounded-2xl overflow-hidden transition-all group cursor-pointer"
                                  >
                                    <div className={`h-36 sm:h-40 flex items-center justify-center relative overflow-hidden ${
                                      type === '3d-model' ? 'bg-purple-500/10 text-purple-500' :
                                      type === 'archive' ? 'bg-cyan-500/10 text-cyan-500' :
                                      'bg-purple-500/5 text-purple-500'
                                    }`}>
                                      {type === 'image' && file.url ? (
                                        <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                      ) : type === '3d-model' ? (
                                        <div className="flex flex-col items-center gap-1.5">
                                          <Box size={42} className="group-hover:scale-110 transition-transform" />
                                          <span className="text-[9px] font-black tracking-widest uppercase">{badge.label}</span>
                                        </div>
                                      ) : type === 'archive' ? (
                                        <div className="flex flex-col items-center gap-1.5">
                                          <Archive size={42} className="group-hover:scale-110 transition-transform" />
                                          <span className="text-[9px] font-black tracking-widest uppercase">3D Pack</span>
                                        </div>
                                      ) : (
                                        <FileIcon size={42} className="group-hover:scale-110 transition-transform" />
                                      )}
                                    </div>

                                    <div className="p-3 sm:p-3.5 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between gap-2">
                                      <div className="overflow-hidden flex-1 min-w-0">
                                        <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate">{file.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}>
                                            {badge.label}
                                          </span>
                                          {file.uploadedAt && (
                                            <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
                                              {new Date(file.uploadedAt).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelected3DFile(file);
                                          }}
                                          className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors"
                                          title="Open in 3D Viewer"
                                        >
                                          <Eye size={13} />
                                        </button>
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-1.5 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] group-hover:text-purple-600 transition-colors"
                                          title="Open or download file"
                                        >
                                          <ExternalLink size={13} />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-10 sm:py-12 flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--muted)/0.2)] text-center">
                              <Box className="w-8 h-8 sm:w-10 sm:h-10 text-[hsl(var(--muted-foreground))] mb-2 opacity-50" />
                              <p className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">No 3D Models or Renders Uploaded</p>
                              <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-sm">Click upload drawings to add .DWG, .SKP, .FBX, .OBJ, or 3D realistic renders.</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'boq' && (
            <motion.div key="boq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {getTabLockState('boq').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-3 sm:mb-4 border border-amber-500/20">
                    <Lock size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-[hsl(var(--foreground))]">BOQ Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
                    This lead is currently in the <strong className="text-[hsl(var(--foreground))]">"{lead.status}"</strong> stage.
                    Complete and approve drawings to unlock BOQ creation and itemized estimations.
                  </p>
                </div>
              ) : !lead.boqs || lead.boqs.length === 0 ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-3 sm:mb-4">
                    <Calculator size={26} className="sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">No BOQ Generated</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 mb-6 max-w-sm">
                    Create a detailed Bill of Quantities based on requirements and designs.
                  </p>
                  {!isConverted && (
                    <button onClick={() => setIsBoqModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5">
                      <Plus size={15} /> Create BOQ
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top action bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3.5 sm:p-4 md:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                        <Calculator size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-black text-[hsl(var(--foreground))]">Bill of Quantities (BOQ)</h2>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                            {lead.boqs.length} {lead.boqs.length === 1 ? 'Version' : 'Versions'}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))]">
                          Itemized quantity specifications and material cost breakdown
                        </p>
                      </div>
                    </div>

                    {!isConverted && (
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setEditingBoqIndex(activeBoqIndex);
                            setIsBoqModalOpen(true);
                          }}
                          className="flex-1 sm:flex-initial justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Pencil size={13} /> Edit Current BOQ
                        </button>
                        <button
                          onClick={() => {
                            setEditingBoqIndex(null);
                            setIsBoqModalOpen(true);
                          }}
                          className="flex-1 sm:flex-initial justify-center bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-[hsl(var(--border))] active:scale-95 flex items-center gap-1.5"
                        >
                          <Plus size={14} /> New BOQ Version
                        </button>
                      </div>
                    )}
                  </div>

                  {lead.boqs.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
                      {lead.boqs.map((q: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveBoqIndex(idx)}
                          className={cn(
                            "px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0",
                            activeBoqIndex === idx 
                              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" 
                              : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                          )}
                        >
                          Version {q.version || idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden overflow-x-auto">
                    <BoqPreview 
                      lead={lead} 
                      boqIndex={activeBoqIndex} 
                      onSuccess={fetchData} 
                      onEdit={isConverted ? undefined : () => {
                        setEditingBoqIndex(activeBoqIndex);
                        setIsBoqModalOpen(true);
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'quotations' && (
            <motion.div key="quotations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {getTabLockState('quotations').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-3 sm:mb-4 border border-amber-500/20">
                    <Lock size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-[hsl(var(--foreground))]">Quotations Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1.5 mb-6 max-w-md">
                    This lead is currently in the <strong className="text-[hsl(var(--foreground))]">"{lead.status}"</strong> stage.
                    Finalize the BOQ estimate first to unlock commercial Quotation proposals.
                  </p>
                </div>
              ) : !lead.quotations || lead.quotations.length === 0 ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mb-3 sm:mb-4">
                    <FileText size={26} className="sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">No Quotations Generated</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 mb-6 max-w-sm">
                    Create professional itemized quotes to secure this project.
                  </p>
                  {!isConverted && (
                    <button onClick={() => setIsQuotationModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5">
                      <Plus size={15} /> Create Quotation
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {lead.quotations.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
                      {lead.quotations.map((q: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveQuotationIndex(idx)}
                          className={cn(
                            "px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0",
                            activeQuotationIndex === idx 
                              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" 
                              : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                          )}
                        >
                          Version {q.version}
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                            q.status === 'Accepted' ? 'bg-emerald-500 text-white' : 
                            q.status === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                          )}>
                            {q.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden overflow-x-auto">
                    <QuotationPreview 
                      lead={lead} 
                      quotationIndex={activeQuotationIndex} 
                      onSuccess={fetchData} 
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- MODALS --- */}
      {/* Log Activity Modal */}
      <AnimatePresence>
        {isActivityModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsActivityModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 md:p-8">
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Log Activity</h2>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Record a touchpoint with {lead.name}</p>
                </div>
                <button onClick={() => setIsActivityModalOpen(false)} className="p-2.5 hover:bg-[hsl(var(--accent))] rounded-2xl bg-[hsl(var(--muted))] transition-colors"><X size={20} className="text-[hsl(var(--muted-foreground))]" /></button>
              </div>

              <form onSubmit={handleActivitySubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Activity Type</label>
                  <select 
                    value={activityForm.type}
                    onChange={e => setActivityForm({...activityForm, type: e.target.value})}
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm font-medium focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] outline-none transition-all"
                  >
                    {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit", "Email", "Status Change"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Remarks / Summary</label>
                  <textarea 
                    required
                    rows={4}
                    value={activityForm.remarks}
                    onChange={e => setActivityForm({...activityForm, remarks: e.target.value})}
                    placeholder="E.g., Client wants a modern theme, budget is strict. Next meeting next week."
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm font-medium focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] outline-none resize-none transition-all"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsActivityModalOpen(false)} className="px-6 py-3 rounded-2xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-3 rounded-2xl text-sm font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-all active:scale-95">
                    {isSubmitting ? 'Saving...' : 'Save Activity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Follow-up Modal */}
      <AnimatePresence>
        {isFollowUpModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFollowUpModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 md:p-8">
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))]">Schedule Follow-up</h2>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Plan a future touchpoint with {lead.name}</p>
                </div>
                <button onClick={() => setIsFollowUpModalOpen(false)} className="p-2.5 hover:bg-[hsl(var(--accent))] rounded-2xl bg-[hsl(var(--muted))] transition-colors"><X size={20} className="text-[hsl(var(--muted-foreground))]" /></button>
              </div>

              <form onSubmit={handleFollowUpSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Follow-up Type</label>
                    <select 
                      value={followUpForm.type}
                      onChange={e => setFollowUpForm({...followUpForm, type: e.target.value})}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm font-medium focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] outline-none transition-all"
                    >
                      {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Date & Time</label>
                    <input 
                      type="datetime-local"
                      required
                      value={followUpForm.scheduledDate}
                      onChange={e => setFollowUpForm({...followUpForm, scheduledDate: e.target.value})}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm font-medium focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Goal / Notes</label>
                  <textarea 
                    required
                    rows={4}
                    value={followUpForm.remarks}
                    onChange={e => setFollowUpForm({...followUpForm, remarks: e.target.value})}
                    placeholder="E.g., Call to discuss revised quotation..."
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm font-medium focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.2)] outline-none resize-none transition-all"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsFollowUpModalOpen(false)} className="px-6 py-3 rounded-2xl text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-6 py-3 rounded-2xl text-sm font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-all active:scale-95">
                    {isSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InteriorEditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lead={lead}
        users={users}
        onSuccess={fetchData}
      />

      <InteriorLogSiteVisitModal 
        isOpen={isSiteVisitModalOpen} 
        onClose={() => setIsSiteVisitModalOpen(false)} 
        customerId={params.id as string} 
        onSuccess={fetchData} 
        users={users}
        initialMeasurements={lead?.siteMeasurements}
        initialPhotos={lead?.sitePhotos}
      />
      <InteriorLogRequirementsModal
        isOpen={isReqModalOpen}
        onClose={() => setIsReqModalOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        users={users}
        initialRequirements={lead?.requirements || []}
        initialBudget={lead?.budgetRange || ''}
        isReadOnly={['Under Drawing', 'Under BOQ Creation', 'Under Quotation', 'Negotiation', 'Converted'].includes(lead?.status || '')}
      />
      <InteriorUploadDesignModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        existingFiles={lead?.designFiles || []}
      />
      <Interior3DViewerModal
        isOpen={!!selected3DFile}
        onClose={() => setSelected3DFile(null)}
        file={selected3DFile}
      />
      <InteriorQuotationBuilderModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        customerId={params.id as string}
        customerEmail={lead?.email || ''}
        existingQuotations={lead?.quotations || []}
        onSuccess={fetchData}
      />
      <InteriorDeleteLeadModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteLead}
        leadName={lead?.name}
        isLoading={isDeletingLead}
      />

      <InteriorBoqBuilderModal
        isOpen={isBoqModalOpen}
        onClose={() => {
          setIsBoqModalOpen(false);
          setEditingBoqIndex(null);
        }}
        customerId={lead?._id || ''}
        existingBoqs={lead?.boqs || []}
        editingBoqIndex={editingBoqIndex}
        onSuccess={fetchData}
      />
      <InteriorScheduleFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        customerId={params.id as string}
        customerName={lead?.name}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSendToSiteVisitModal
        isOpen={isSendToSiteVisitOpen}
        onClose={() => setIsSendToSiteVisitOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSendToRequirementsModal
        isOpen={isSendToReqOpen}
        onClose={() => setIsSendToReqOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSendToDrawingModal
        isOpen={isSendToDrawingOpen}
        onClose={() => setIsSendToDrawingOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSendToBoqModal
        isOpen={isSendToBoqOpen}
        onClose={() => setIsSendToBoqOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSendToQuotationsModal
        isOpen={isSendToQuotationsOpen}
        onClose={() => setIsSendToQuotationsOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorConvertToProjectModal
        isOpen={isConvertToProjectOpen}
        onClose={() => setIsConvertToProjectOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
      />
    </InteriorShell>
  );
}