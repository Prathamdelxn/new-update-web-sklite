'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { GlassCard } from '@/components/ui/GlassCard';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { ArrowLeft, ArrowRight, User, Phone, Mail, Building, DollarSign, Activity, Plus, MessageSquare, X, CheckCircle2, XCircle, Calendar, MapPin, Ruler, PenTool, UploadCloud, File as FileIcon, Image as ImageIcon, Calculator, FileText, ChevronDown, Pencil, Trash2, DoorOpen, Maximize2, Columns, Zap, Droplets, Wind, Armchair, AlertTriangle, Layers, Palette, Sliders, Sun, Sparkles, Box, Archive, ExternalLink, Eye, Lock, Copy, Check, CalendarCheck, Clock, PhoneCall, Frown, History, Share2, Globe, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, parseMaxBudget } from '@/lib/utils';
import { InteriorLogSiteVisitModal } from '@/features/interior-new/components/crm/modals/InteriorLogSiteVisitModal';
import { InteriorSendToSiteVisitModal } from '@/features/interior-new/components/crm/modals/InteriorSendToSiteVisitModal';
import { InteriorSiteVisitHistoryModal } from '@/features/interior-new/components/crm/modals/InteriorSiteVisitHistoryModal';
import { InteriorSendToRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorSendToRequirementsModal';
import { InteriorSendToDrawingModal } from '@/features/interior-new/components/crm/modals/InteriorSendToDrawingModal';
import { InteriorSendToBoqModal } from '@/features/interior-new/components/crm/modals/InteriorSendToBoqModal';
import { InteriorSendToQuotationsModal } from '@/features/interior-new/components/crm/modals/InteriorSendToQuotationsModal';
import { InteriorConvertToProjectModal } from '@/features/interior-new/components/crm/modals/InteriorConvertToProjectModal';
import { InteriorScheduleFollowUpModal } from '@/features/interior-new/components/crm/modals/InteriorScheduleFollowUpModal';
import { InteriorLogRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorLogRequirementsModal';
import { InteriorUploadDesignModal, detectFileType, getFileBadgeInfo } from '@/features/interior-new/components/crm/modals/InteriorUploadDesignModal';
import { InteriorDrawingApprovalModal } from '@/features/interior-new/components/crm/modals/InteriorDrawingApprovalModal';
import { InteriorUploadRevisionModal } from '@/features/interior-new/components/crm/modals/InteriorUploadRevisionModal';
import { InteriorSendDrawingForApprovalModal } from '@/features/interior-new/components/crm/modals/InteriorSendDrawingForApprovalModal';
import { Interior3DViewerModal } from '@/features/interior-new/components/crm/modals/Interior3DViewerModal';
import { InteriorCrmShareModal } from '@/features/interior-new/components/crm/modals/InteriorCrmShareModal';
import { InteriorQuotationBuilderModal } from '@/features/interior-new/components/crm/modals/InteriorQuotationBuilderModal';
import { InteriorEditLeadModal } from '@/features/interior-new/components/crm/modals/InteriorEditLeadModal';
import { InteriorDeleteLeadModal } from '@/features/interior-new/components/crm/modals/InteriorDeleteLeadModal';
import { InteriorMarkAsLostModal } from '@/features/interior-new/components/crm/modals/InteriorMarkAsLostModal';
import { QuotationPreview } from '@/components/crm/QuotationPreview';
import { BoqPreview } from '@/components/crm/BoqPreview';
import { InteriorBoqBuilderModal } from '@/features/interior-new/components/crm/modals/InteriorBoqBuilderModal';
import { InteriorLeadFollowUpsTab } from '@/features/interior-new/components/crm/InteriorLeadFollowUpsTab';

export default function Lead360View() {
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLocation, setCopiedLocation] = useState(false);

  const handleCopyLocation = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLocation(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopiedLocation(false), 2000);
  };
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [isSendToSiteVisitOpen, setIsSendToSiteVisitOpen] = useState(false);
  const [isSiteVisitHistoryOpen, setIsSiteVisitHistoryOpen] = useState(false);
  const [isSendToReqOpen, setIsSendToReqOpen] = useState(false);
  const [isSendToDrawingOpen, setIsSendToDrawingOpen] = useState(false);
  const [isSendToBoqOpen, setIsSendToBoqOpen] = useState(false);
  const [isSendToQuotationsOpen, setIsSendToQuotationsOpen] = useState(false);
  const [isConvertToProjectOpen, setIsConvertToProjectOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selected3DFile, setSelected3DFile] = useState<any | null>(null);
  const [selectedDrawingForApproval, setSelectedDrawingForApproval] = useState<any | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedDrawingForSendApproval, setSelectedDrawingForSendApproval] = useState<any | null>(null);
  const [isSendApprovalModalOpen, setIsSendApprovalModalOpen] = useState(false);
  const [selectedDrawingForRevision, setSelectedDrawingForRevision] = useState<any | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<any | null>(null);
  const [isDeletingDrawing, setIsDeletingDrawing] = useState(false);
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMarkAsLostOpen, setIsMarkAsLostOpen] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [activeQuotationIndex, setActiveQuotationIndex] = useState(0);
  const [activeBoqIndex, setActiveBoqIndex] = useState(0);
  const [editingBoqIndex, setEditingBoqIndex] = useState<number | null>(null);

  const handleDeleteDrawing = async () => {
    if (!drawingToDelete || !params.id) return;
    const drawingId = drawingToDelete._id || drawingToDelete.id || drawingToDelete.title || drawingToDelete.name;
    setIsDeletingDrawing(true);
    try {
      await interiorCrmService.deleteDrawing(params.id as string, drawingId);
      toast.success(`Drawing "${drawingToDelete.title || drawingToDelete.name || 'Drawing'}" deleted successfully.`);
      setDrawingToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete drawing');
    } finally {
      setIsDeletingDrawing(false);
    }
  };

  const [approvingDrawingId, setApprovingDrawingId] = useState<string | null>(null);

  const handleDirectApproveDrawing = async (file: any) => {
    if (!params.id) return;
    const drawingId = file._id || file.id || file.title || file.name;
    const versionNumber = file.currentVersion || 1;
    setApprovingDrawingId(drawingId);
    try {
      await interiorCrmService.approveDrawing(params.id as string, drawingId, {
        action: 'approve',
        versionNumber
      });
      toast.success(`Drawing "${file.title || file.name || 'Drawing'}" approved successfully! Live to client.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to approve drawing');
    } finally {
      setApprovingDrawingId(null);
    }
  };
  
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'Phone Call',
    status: 'Completed',
    remarks: ''
  });

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [designSubTab, setDesignSubTab] = useState<'2d' | '3d'>('2d');

  const fetchData = async () => {
    try {
      const [leadRes, actRes, userRes] = await Promise.all([
        interiorCrmService.getCustomerById(params.id as string),
        interiorCrmService.getActivities(params.id as string),
        interiorCrmService.getUsers(),
      ]);

      const singleLead = leadRes?.success && leadRes?.data ? leadRes.data : leadRes;
      if (singleLead) setLead(singleLead);

      const activityList = actRes?.success && actRes?.data ? actRes.data : Array.isArray(actRes) ? actRes : [];
      setActivities(activityList);

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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await interiorCrmService.updateCustomer(params.id as string, { status: newStatus });
      toast.success(`Lead moved to ${newStatus}`);
      fetchData(); // refresh to show new status and the auto-logged activity
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'followups' | 'site' | 'requirements' | 'designs' | 'boq' | 'quotations'>('overview');

  const siteVisitInfo = React.useMemo(() => {
    const siteVisitActivity = activities.find(
      (a) => a.type === 'Site Visit' && (a.status === 'Pending' || a.remarks)
    ) || activities.find((a) => a.type === 'Site Visit');

    const note =
      siteVisitActivity?.remarks ||
      lead?.remarks ||
      lead?.siteMeasurements?.notes ||
      '';

    const scheduledDate =
      lead?.siteVisitScheduledDate ||
      siteVisitActivity?.scheduledDate ||
      siteVisitActivity?.createdAt;

    const assignedExecutive = users.find((u) => {
      const uId = u._id || u.id || u.clerkUserId;
      const leadAssigned = typeof lead?.assignedSalesExecutive === 'object' && lead?.assignedSalesExecutive !== null
        ? lead.assignedSalesExecutive._id || lead.assignedSalesExecutive.id
        : lead?.assignedSalesExecutive;
      const actUser = typeof siteVisitActivity?.user === 'object' && siteVisitActivity?.user !== null
        ? siteVisitActivity.user._id || siteVisitActivity.user.id
        : siteVisitActivity?.user;
      return uId === leadAssigned || uId === actUser;
    }) || (typeof lead?.assignedSalesExecutive === 'object' ? lead.assignedSalesExecutive : null);

    const assignedName = assignedExecutive?.fullName ||
      `${assignedExecutive?.firstName || ''} ${assignedExecutive?.lastName || ''}`.trim() ||
      assignedExecutive?.name ||
      (typeof lead?.assignedSalesExecutive === 'string' && lead?.assignedSalesExecutive ? 'Assigned Staff' : 'Assigned Site Member');

    const schedulerUser = siteVisitActivity?.user
      ? users.find((u) => (u._id || u.id || u.clerkUserId) === (typeof siteVisitActivity.user === 'object' ? siteVisitActivity.user._id || siteVisitActivity.user.id : siteVisitActivity.user))
      : null;
    const schedulerName = schedulerUser?.fullName || schedulerUser?.name || 'CRM Team';

    return {
      activity: siteVisitActivity,
      note,
      scheduledDate,
      assignedName,
      schedulerName,
    };
  }, [activities, lead, users]);

  const siteVisitActivities = React.useMemo(() => {
    const list = (activities || []).filter(
      (a) =>
        a.type === 'Site Visit' &&
        a.scheduledDate &&
        !a.remarks?.toLowerCase().includes('recorded full measurements') &&
        !a.remarks?.toLowerCase().includes('updated site measurements') &&
        !a.remarks?.toLowerCase().includes('completed site visit survey')
    );

    const seen = new Set<string>();
    const distinct: any[] = [];
    for (const a of list) {
      const timeKey = new Date(a.scheduledDate).toISOString().slice(0, 16);
      if (!seen.has(timeKey)) {
        seen.add(timeKey);
        distinct.push(a);
      }
    }
    return distinct;
  }, [activities]);

  const hasRescheduledSiteVisits = siteVisitActivities.length > 1;

  const requirementsInfo = React.useMemo(() => {
    const reqActivity = activities.find(
      (a) => a.type === 'Requirement Gathering' && (a.status === 'Pending' || a.remarks)
    ) || activities.find((a) => a.type === 'Requirement Gathering')
      || activities.find((a) => a.type === 'Status Change' && a.remarks?.toLowerCase().includes('requirement'));

    const note = reqActivity?.remarks || '';

    const scheduledDate =
      lead?.requirementScheduledDate ||
      reqActivity?.scheduledDate ||
      reqActivity?.createdAt;

    const assignedConsultant = users.find((u) => {
      const uId = u._id || u.id || u.clerkUserId;
      const leadDesigner = typeof lead?.designerAssigned === 'object' && lead?.designerAssigned !== null
        ? lead.designerAssigned._id || lead.designerAssigned.id
        : lead?.designerAssigned;
      const actUser = typeof reqActivity?.user === 'object' && reqActivity?.user !== null
        ? reqActivity.user._id || reqActivity.user.id
        : reqActivity?.user;
      return uId === leadDesigner || uId === actUser;
    }) || (typeof lead?.designerAssigned === 'object' ? lead.designerAssigned : null);

    const assignedName = assignedConsultant?.fullName ||
      `${assignedConsultant?.firstName || ''} ${assignedConsultant?.lastName || ''}`.trim() ||
      assignedConsultant?.name ||
      (typeof lead?.designerAssigned === 'string' && lead?.designerAssigned ? 'Assigned Consultant' : 'Requirement Consultant');

    const schedulerUser = reqActivity?.user
      ? users.find((u) => (u._id || u.id || u.clerkUserId) === (typeof reqActivity.user === 'object' ? reqActivity.user._id || reqActivity.user.id : reqActivity.user))
      : null;
    const schedulerName = schedulerUser?.fullName || schedulerUser?.name || 'CRM Team';

    return {
      activity: reqActivity,
      note,
      scheduledDate,
      assignedName,
      schedulerName,
    };
  }, [activities, lead, users]);

  const drawingInfo = React.useMemo(() => {
    // Find the specific stage handover activity when the lead was passed to the drawing phase
    const handoverActivity = activities.find(
      (a) => (a.type === '2D/3D Drawing' || a.type === 'Design Phase' || a.type === 'Stage Handover') &&
             a.remarks &&
             !a.remarks.toLowerCase().includes('sent for internal approval') &&
             !a.remarks.toLowerCase().includes('approved') &&
             !a.remarks.toLowerCase().includes('rejected') &&
             !a.remarks.toLowerCase().includes('changes requested') &&
             !a.remarks.toLowerCase().startsWith('lead passed to 2d/3d drawing phase')
    ) || activities.find(
      (a) => (a.type === '2D/3D Drawing' || a.type === 'Design Phase') &&
             a.remarks &&
             !a.remarks.toLowerCase().includes('sent for internal approval') &&
             !a.remarks.toLowerCase().includes('approved') &&
             !a.remarks.toLowerCase().includes('rejected')
    );

    const rawNote = lead?.drawingHandoverNotes || (lead as any)?.designBrief || handoverActivity?.remarks || '';
    const isGenericSystemNote = !rawNote || rawNote.trim().toLowerCase().startsWith('lead passed to') || rawNote.trim().toLowerCase() === 'status changed to under drawing';
    const note = isGenericSystemNote ? '' : rawNote.trim();

    const scheduledDate =
      lead?.drawingScheduledDate ||
      lead?.drawingDueDate ||
      lead?.designDueDate ||
      handoverActivity?.scheduledDate ||
      null;

    const assignedDesigner = users.find((u) => {
      const uId = u._id || u.id || u.clerkUserId;
      const leadDesigner = typeof lead?.designerAssigned === 'object' && lead?.designerAssigned !== null
        ? lead.designerAssigned._id || lead.designerAssigned.id
        : lead?.designerAssigned;
      return uId === leadDesigner;
    }) || (typeof lead?.designerAssigned === 'object' ? lead.designerAssigned : null);

    const assignedName = assignedDesigner?.fullName ||
      `${assignedDesigner?.firstName || ''} ${assignedDesigner?.lastName || ''}`.trim() ||
      assignedDesigner?.name ||
      (typeof lead?.designerAssigned === 'string' && lead?.designerAssigned ? 'Assigned Designer' : '2D/3D Designer');

    const schedulerUser = handoverActivity?.user
      ? users.find((u) => (u._id || u.id || u.clerkUserId) === (typeof handoverActivity.user === 'object' ? handoverActivity.user._id || handoverActivity.user.id : handoverActivity.user))
      : null;
    const schedulerName = schedulerUser?.fullName || schedulerUser?.name || 'CRM Team';

    return {
      activity: handoverActivity,
      note,
      scheduledDate,
      assignedName,
      schedulerName,
    };
  }, [activities, lead, users]);

  const boqInfo = React.useMemo(() => {
    const boqActivity = activities.find(
      (a) => (a.type === 'BOQ Phase' || a.type === 'Status Change') && (a.remarks?.toLowerCase().includes('boq') || a.remarks?.toLowerCase().includes('estimat'))
    ) || activities.find((a) => a.type === 'BOQ Phase');

    const note = boqActivity?.remarks || (lead?.boqs?.[activeBoqIndex]?.notes) || '';

    const currentBoq = lead?.boqs?.[activeBoqIndex] || lead?.boqs?.[0];
    const totalAmount = currentBoq?.totalAmount || (currentBoq?.items || []).reduce((acc: number, it: any) => acc + (Number(it.amount) || (Number(it.quantity) * Number(it.rate)) || 0), 0);
    const itemsCount = currentBoq?.items?.length || 0;
    const categories = Array.from(new Set((currentBoq?.items || []).map((it: any) => it.category || 'General')));

    const maxBudget = parseMaxBudget(lead?.budgetRange || lead?.estimatedBudget || lead?.budget);
    const isOverBudget = Boolean(maxBudget && maxBudget > 0 && totalAmount > maxBudget);
    const budgetExcessAmount = isOverBudget ? totalAmount - (maxBudget || 0) : 0;
    const budgetExcessPercentage = isOverBudget && maxBudget ? ((totalAmount - maxBudget) / maxBudget) * 100 : 0;

    return {
      activity: boqActivity,
      note,
      currentBoq,
      totalAmount,
      itemsCount,
      categoriesCount: categories.length,
      maxBudget,
      isOverBudget,
      budgetExcessAmount,
      budgetExcessPercentage,
    };
  }, [activities, lead, activeBoqIndex]);

  const quotationInfo = React.useMemo(() => {
    const currentQuote = lead?.quotations?.[activeQuotationIndex] || lead?.quotations?.[0];

    const quoteActivity = activities.find(
      (a) => a.type === 'Quotation Phase' || a.type === 'Quotation Handover'
    ) || activities.find(
      (a) => a.type === 'Status Change' &&
        a.remarks &&
        (a.remarks.toLowerCase().includes('assigned member:') || a.remarks.toLowerCase().includes('handover') || a.remarks.toLowerCase().includes('commercial note')) &&
        !a.remarks.toLowerCase().includes('deleted quotation') &&
        !a.remarks.toLowerCase().includes('marked as') &&
        !a.remarks.toLowerCase().includes('generated quotation')
    );

    const note = quoteActivity?.remarks || (currentQuote?.notes) || '';

    const grandTotal = Number(currentQuote?.grandTotal) || Number(currentQuote?.subtotal) || 0;
    const subtotal = Number(currentQuote?.subtotal) || 0;
    const discount = Number(currentQuote?.discount) || 0;
    const tax = Number(currentQuote?.tax) || 0;
    const taxPercentage = currentQuote?.taxPercentage || 0;
    const itemsCount = currentQuote?.items?.length || 0;

    const maxBudget = parseMaxBudget(lead?.budgetRange || lead?.estimatedBudget || lead?.budget);
    const isOverBudget = Boolean(maxBudget && maxBudget > 0 && grandTotal > maxBudget);
    const budgetExcessAmount = isOverBudget ? grandTotal - (maxBudget || 0) : 0;
    const budgetExcessPercentage = isOverBudget && maxBudget ? ((grandTotal - maxBudget) / maxBudget) * 100 : 0;

    const assignedExecutive = users.find((u) => {
      const uId = u._id || u.id || u.clerkUserId;
      const leadAssigned = typeof lead?.assignedSalesExecutive === 'object' && lead?.assignedSalesExecutive !== null
        ? lead.assignedSalesExecutive._id || lead.assignedSalesExecutive.id
        : lead?.assignedSalesExecutive;
      const actUser = typeof quoteActivity?.user === 'object' && quoteActivity?.user !== null
        ? quoteActivity.user._id || quoteActivity.user.id
        : quoteActivity?.user;
      return uId === leadAssigned || uId === actUser;
    }) || (typeof lead?.assignedSalesExecutive === 'object' ? lead.assignedSalesExecutive : null);

    const assignedName = assignedExecutive?.fullName ||
      `${assignedExecutive?.firstName || ''} ${assignedExecutive?.lastName || ''}`.trim() ||
      assignedExecutive?.name ||
      (typeof lead?.assignedSalesExecutive === 'string' && lead?.assignedSalesExecutive ? 'Assigned Staff' : 'Sales Team');

    return {
      activity: quoteActivity,
      note,
      currentQuote,
      grandTotal,
      subtotal,
      discount,
      tax,
      taxPercentage,
      itemsCount,
      assignedName,
      maxBudget,
      isOverBudget,
      budgetExcessAmount,
      budgetExcessPercentage,
    };
  }, [activities, lead, users, activeQuotationIndex]);

  const hasFollowUp = React.useMemo(() => {
    return activities.some(
      (a) =>
        a.type !== 'Status Change' &&
        a.type !== 'System Update' &&
        a.type !== 'Site Visit' &&
        a.type !== 'Requirement Gathering' &&
        a.type !== '2D/3D Drawing' &&
        (Boolean(a.remarks) || a.status === 'Completed' || a.status === 'Pending')
    );
  }, [activities]);

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
    'Requirement Completed': 2,
    'Under Drawing': 3,
    'Design Approved': 3,
    'Under BOQ Creation': 4,
    'Under Quotation': 5,
    'Quotation Pending': 5,
    'Quotation Sent': 5,
    'Negotiation': 5,
    'Booking Pending': 5,
    'Won': 6,
    'Converted': 6,
    'Lost': 6,
  };

  const isConverted = lead?.status === 'Won' || lead?.status === 'Converted' || !!lead?.linkedProject;
  const isLost = lead?.status === 'Lost';
  const isReadOnly = isConverted || isLost;

  const getTabLockState = (tabId: string) => {
    if (isReadOnly) {
      return { isLocked: false, requiredStage: '', stageTitle: '' };
    }
    const currentStage = STAGE_ORDER[lead?.status || 'New Lead'] ?? 0;

    switch (tabId) {
      case 'overview':
        return { isLocked: false, requiredStage: 'New Lead', stageTitle: 'Overview' };
      case 'followups':
        return { isLocked: false, requiredStage: '', stageTitle: 'Follow-ups' };
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
    { id: 'followups', label: 'Follow-ups' },
    { id: 'site', label: 'Site Visits' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'designs', label: '2D/3D Drawing' },
    { id: 'boq', label: 'BOQ' },
    { id: 'quotations', label: 'Quotations' },
  ];

  return (
    <InteriorShell>
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 p-2.5 sm:p-4 md:p-8 animate-in fade-in duration-500 overflow-x-hidden">
        
        {/* --- 1. SLEEK PROFILE HEADER --- */}
        <div className="bg-[hsl(var(--card))] rounded-2xl p-3 sm:p-5 md:p-6 border border-[hsl(var(--border))] flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-5 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 min-w-0 max-w-full">
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
                  className="text-base sm:text-xl md:text-2xl font-black text-[hsl(var(--foreground))] tracking-tight truncate max-w-[170px] xs:max-w-[260px] sm:max-w-[380px] md:max-w-[520px]"
                  title={lead.name}
                >
                  {lead.name}
                </h1>
                <span className="font-mono bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold border border-[hsl(var(--border))] shrink-0">
                  {lead.leadNumber || 'LD-XXXX'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                <a href={`tel:${lead.mobileNumber}`} className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.5)] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-[hsl(var(--border))] transition-colors shrink-0">
                  <Phone size={12} className="text-blue-500 shrink-0" /> {lead.mobileNumber}
                </a>
                {lead.email && (
                  <a 
                    href={`mailto:${lead.email}`} 
                    title={lead.email}
                    className="inline-flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.5)] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-[hsl(var(--border))] transition-colors min-w-0 max-w-[160px] sm:max-w-[220px] overflow-hidden"
                  >
                    <Mail size={12} className="text-purple-500 shrink-0" />
                    <span className="truncate min-w-0 flex-1 mr-1">{lead.email}</span>
                  </a>
                )}
                {(lead.projectLocation || lead.city) && (
                  <div 
                    title={`Site Location: ${lead.projectLocation || lead.city}`}
                    onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                    className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.5)] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-[hsl(var(--border))] min-w-0 max-w-[200px] xs:max-w-[280px] sm:max-w-[400px] md:max-w-[520px] transition-colors group cursor-pointer"
                  >
                    <MapPin size={12} className="text-amber-500 shrink-0" />
                    <span className="truncate">
                      {lead.projectLocation || lead.city}
                    </span>
                    <span title="Copy Address" className="opacity-60 group-hover:opacity-100 transition-opacity ml-0.5 shrink-0">
                      {copiedLocation ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full md:w-auto pt-2.5 md:pt-0 border-t md:border-t-0 border-[hsl(var(--border)/0.6)] justify-start md:justify-end">
            {(() => {
              const latestQuote = lead.quotations?.[lead.quotations.length - 1];
              let displayStatus = lead.status;
              let badgeColor = "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]";

              if (lead.status === 'Converted' || lead.status === 'Won' || isConverted) {
                displayStatus = 'Converted ';
                badgeColor = 'bg-emerald-600 text-white border-emerald-700';
              } else if (latestQuote?.status === 'Accepted') {
                displayStatus = 'Quotation Approved';
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
                  displayStatus = 'Quotation Approved';
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
            ) : isLost ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-xl text-xs font-bold">
                  <Lock size={13} /> Lead Lost (Locked)
                </span>
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-xl transition-all active:scale-95"
                  title="Delete Lead"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <>








                {['Under Quotation', 'Quotation Pending', 'Quotation Sent', 'Negotiation', 'Booking Pending'].includes(lead.status) && (
                  ((lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted' || q.status === 'Approved')) || lead.status === 'Booking Pending') && (
                    <button
                      onClick={() => setIsConvertToProjectOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                      title="Convert to Won Project"
                    >
                      <CheckCircle2 size={13} /> Convert to Project
                    </button>
                  )
                )}

                {['New Lead', 'Contacted'].includes(lead.status) &&
                  !hasFollowUp &&
                  !lead.siteMeasurements &&
                  (!lead.quotations || lead.quotations.length === 0) && (
                    <button
                      onClick={() => setIsFollowUpModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      title="Schedule Initial Follow-up"
                    >
                      <Calendar size={13} /> Schedule Follow-up
                    </button>
                  )}

                <button
                  onClick={() => setIsMarkAsLostOpen(true)}
                  className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-xl transition-all active:scale-95"
                  title="Mark Lead as Lost"
                >
                  <X size={15} />
                </button>

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

        {/* --- 2B. LOST LEAD READ-ONLY NOTICE BANNER --- */}
        {isLost && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <Lock size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-[hsl(var(--foreground))]">Lead Marked as Lost (Locked & Read-Only)</h3>
                  {lead.lostReason && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                      Reason: {lead.lostReason}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  {lead.remarks ? `"${lead.remarks}" — ` : ''}This lead is preserved in read-only mode. All operations and stage transitions are locked.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. TAB NAVIGATION --- */}
        <div className="flex items-center gap-4 sm:gap-8 border-b border-[hsl(var(--border))] overflow-x-auto scrollbar-none touch-pan-x px-2">
          {TABS.map((tab) => {
            const { isLocked } = getTabLockState(tab.id);
            const pendingFollowUpsCount = tab.id === 'followups' ? activities.filter(a => a.status === 'Pending').length : 0;
            const hasOverdueFollowUp = tab.id === 'followups' && activities.some(a => a.status === 'Pending' && a.scheduledDate && new Date(a.scheduledDate).getTime() < Date.now());
            const hasOverdueSiteVisit = tab.id === 'site' && !lead?.siteMeasurements && siteVisitInfo.scheduledDate && new Date(siteVisitInfo.scheduledDate).getTime() < Date.now();
            const hasOverdueRequirements = tab.id === 'requirements' && (!lead?.requirements || lead.requirements.length === 0) && requirementsInfo.scheduledDate && new Date(requirementsInfo.scheduledDate).getTime() < Date.now();
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative pb-4 text-sm font-bold transition-colors whitespace-nowrap outline-none flex items-center gap-1.5 cursor-pointer",
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
                <div 
                  className="bg-[hsl(var(--card))] p-2.5 sm:p-3.5 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5 sm:gap-3 group cursor-pointer hover:border-amber-500/40 transition-all"
                  title={`Site Location: ${lead.projectLocation || lead.city || 'Not specified'}`}
                  onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                >
                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0"><MapPin size={14} /></span>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Location</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-[11px] sm:text-xs truncate mt-0.5">{lead.projectLocation || lead.city || 'Not specified'}</p>
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-opacity shrink-0">
                    {copiedLocation ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </span>
                </div>
              </div>

              {/* Main Content Grid: Site & Client Info (Left) + Activity Timeline (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                
                {/* Left Column: Comprehensive Site Location & Project Specs (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Dedicated Site Location Card */}
                  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">Site & Project Location</h3>
                          <p className="text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))]">Full project site address & navigation</p>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                          title="Edit Location & Lead Details"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                    </div>

                    {/* Address Box */}
                    <div className="bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <MapPin size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
                            Full Site Address
                          </p>
                          <p className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] leading-relaxed whitespace-normal break-words selection:bg-amber-500/20">
                            {lead.projectLocation || lead.city || 'No specific site address provided yet.'}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons: Copy Address & Google Maps Link */}
                      {(lead.projectLocation || lead.city) && (
                        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[hsl(var(--border))]">
                          <button
                            type="button"
                            onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[11px] sm:text-xs font-bold text-[hsl(var(--foreground))] transition-all active:scale-95 shadow-xs"
                          >
                            {copiedLocation ? (
                              <>
                                <Check size={12} className="text-emerald-500" /> Copied Address
                              </>
                            ) : (
                              <>
                                <Copy size={12} className="text-[hsl(var(--muted-foreground))]" /> Copy Address
                              </>
                            )}
                          </button>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.projectLocation || lead.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-[11px] sm:text-xs font-bold text-blue-600 transition-all active:scale-95 shadow-xs"
                          >
                            <ExternalLink size={12} /> Open in Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </div>



                  {/* Client & Scope Details Card */}
                  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                          <User size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">Lead & Contact Info</h3>
                          <p className="text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))]">Client communication details</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.7)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-2 shrink-0">
                          <User size={13} className="text-blue-500" /> Full Name
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] break-words min-w-0">{lead.name}</span>
                      </div>

                      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.7)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-2 shrink-0">
                          <Phone size={13} className="text-emerald-500" /> Mobile
                        </span>
                        <a href={`tel:${lead.mobileNumber}`} className="font-bold text-blue-600 hover:underline break-all min-w-0">
                          {lead.mobileNumber}
                        </a>
                      </div>

                      {lead.email && (
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.7)]">
                          <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-2 shrink-0">
                            <Mail size={13} className="text-purple-500" /> Email
                          </span>
                          <a href={`mailto:${lead.email}`} className="font-bold text-blue-600 hover:underline break-all min-w-0">
                            {lead.email}
                          </a>
                        </div>
                      )}

                      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.7)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-2 shrink-0">
                          <Building size={13} className="text-indigo-500" /> Property Type
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] break-words min-w-0">{lead.propertyType || 'Standard'}</span>
                      </div>

                      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-2.5 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.7)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-2 shrink-0">
                          <DollarSign size={13} className="text-amber-500" /> Budget / Quote
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 break-words min-w-0">
                          {lead.quotations?.[lead.quotations.length - 1]?.grandTotal
                            ? `₹${lead.quotations[lead.quotations.length - 1].grandTotal.toLocaleString('en-IN')}`
                            : lead.budgetRange || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Activity Timeline (7 cols) */}
                <div className="lg:col-span-7 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-6 shadow-sm min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500" /> Activity Timeline
                    </h3>
                    {!isReadOnly && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setIsActivityModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                          <Plus size={13} /> Log Note
                        </button>
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

                        const isActOverdue = act.status === 'Pending' && act.scheduledDate && new Date(act.scheduledDate).getTime() < Date.now();

                        return (
                        <div key={act._id} className="relative group min-w-0">
                          <div className={cn(
                            "absolute -left-[1.35rem] sm:-left-[2.6rem] top-1.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full border-2 sm:border-4 border-[hsl(var(--card))] flex items-center justify-center",
                            act.status === 'Pending' ? (isActOverdue ? "bg-rose-500" : "bg-amber-400") : "bg-blue-500"
                          )}></div>
                          
                          <div className={cn(
                            "border rounded-2xl p-3.5 sm:p-5 transition-colors min-w-0 overflow-hidden",
                            isActOverdue 
                              ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/30" 
                              : "bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted))] border-[hsl(var(--border))]"
                          )}>
                            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                              <span className={cn(
                                "text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border",
                                isActOverdue
                                   ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black"
                                  : act.status === 'Pending'
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              )}>
                                {act.type} {act.status === 'Pending' && (isActOverdue ? '• Overdue' : '• Scheduled')}
                              </span>
                              <span className={cn(
                                "text-[11px] sm:text-xs font-bold",
                                isActOverdue ? "text-rose-600 dark:text-rose-400 font-black" : "text-[hsl(var(--muted-foreground))]"
                              )}>
                                {act.status === 'Pending' 
                                  ? `${isActOverdue ? 'Overdue: ' : 'Due: '}${new Date(act.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` 
                                  : new Date(act.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                                }
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-[hsl(var(--foreground))] font-medium leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap">{act.remarks}</p>
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
              </div>
            </motion.div>
          )}

          {activeTab === 'followups' && (
            <motion.div
              key="followups"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <InteriorLeadFollowUpsTab
                lead={lead}
                activities={activities}
                users={users}
                onRefresh={fetchData}
                onScheduleFollowUp={() => setIsFollowUpModalOpen(true)}
                onLogActivity={() => setIsActivityModalOpen(true)}
                onSendToSiteVisit={() => setIsSendToSiteVisitOpen(true)}
                isConverted={isReadOnly}
              />
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
              ) : (() => {
                const isSiteVisitOverdue = Boolean(
                  !lead.siteMeasurements &&
                  siteVisitInfo.scheduledDate &&
                  new Date(siteVisitInfo.scheduledDate).getTime() < Date.now()
                );

                const getSiteVisitOverdueText = (dateStr?: string | Date) => {
                  if (!dateStr) return 'Schedule Expired';
                  const diffMs = Date.now() - new Date(dateStr).getTime();
                  if (diffMs <= 0) return 'Schedule Expired';
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays > 0) return `${diffDays}d overdue`;
                  if (diffHours > 0) return `${diffHours}h overdue`;
                  return `${Math.max(1, diffMins)}m overdue`;
                };

                return (
                <div className="space-y-4 sm:space-y-6">
                  {/* Site Visit Overdue Warning Banner */}
                  {isSiteVisitOverdue && (
                    <div className="relative overflow-hidden bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border-2 border-rose-500/30 dark:border-rose-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                          <AlertTriangle size={22} className="animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-black text-rose-950 dark:text-rose-100">
                              Site Visit Schedule Overdue
                            </h4>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                              <Clock size={10} />
                              {getSiteVisitOverdueText(siteVisitInfo.scheduledDate)}
                            </span>
                          </div>
                          <p className="text-xs text-rose-800 dark:text-rose-300/90 mt-1 leading-relaxed">
                            The scheduled site visit for{' '}
                            <strong className="font-bold underline decoration-rose-400 decoration-1 underline-offset-2">
                              {new Date(siteVisitInfo.scheduledDate).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </strong>{' '}
                            has passed without survey measurements being recorded. Please reschedule the visit or log on-site measurements.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {hasRescheduledSiteVisits && (
                          <button
                            type="button"
                            onClick={() => setIsSiteVisitHistoryOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/90 dark:bg-rose-950/60 hover:bg-white dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700/50 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                            title="View previous site visit schedule history"
                          >
                            <History size={13} className="text-rose-600 dark:text-rose-400" /> View Schedule History ({siteVisitActivities.length})
                          </button>
                        )}
                        {!isReadOnly && (
                          <button
                            onClick={() => setIsSendToSiteVisitOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer"
                            title="Reschedule Site Visit Date & Time"
                          >
                            <Calendar size={13} /> Reschedule Site Visit
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 1. Primary Site Visit Briefing & Details Card */}
                  <div className={cn(
                    "bg-[hsl(var(--card))] border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xs transition-colors",
                    isSiteVisitOverdue ? "border-rose-500/30" : "border-[hsl(var(--border))]"
                  )}>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[hsl(var(--border))]">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                          isSiteVisitOverdue
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                            : "bg-purple-500/10 border-purple-500/20 text-purple-600"
                        )}>
                          <MapPin size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                              Site Visit Briefing & Details
                            </h2>
                            <span className={cn(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5",
                              lead.siteMeasurements
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : isSiteVisitOverdue
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black"
                                : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                            )}>
                              {lead.siteMeasurements ? (
                                "Survey Completed"
                              ) : isSiteVisitOverdue ? (
                                <>
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                                  </span>
                                  Survey Overdue ({getSiteVisitOverdueText(siteVisitInfo.scheduledDate)})
                                </>
                              ) : (
                                "Survey Pending"
                              )}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            Assigned team member, scheduled visit time, and instructions note.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {hasRescheduledSiteVisits && (
                          <button
                            type="button"
                            onClick={() => setIsSiteVisitHistoryOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                            title="View previous site visit schedule history"
                          >
                            <History size={13} className="text-purple-600 dark:text-purple-400" /> View Previous Schedules ({siteVisitActivities.length})
                          </button>
                        )}

                        {!isReadOnly && (
                          <>
                            {lead.siteMeasurements ? (
                              <>
                                <button
                                  onClick={() => setIsSiteVisitModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                >
                                  <Pencil size={13} /> Edit Measurements & Photos
                                </button>
                                {['Under Site Visit', 'Measurement Done'].includes(lead.status) && (
                                  <button
                                    onClick={() => setIsSendToReqOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                  >
                                    Pass to Requirements <ArrowRight size={13} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setIsSendToSiteVisitOpen(true)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs",
                                    isSiteVisitOverdue
                                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                                      : "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]"
                                  )}
                                  title="Re-assign or change schedule"
                                >
                                  <Calendar size={13} /> Reschedule
                                </button>
                                <button
                                  onClick={() => setIsSiteVisitModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                                >
                                  <Plus size={14} /> Log Measurements
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Site Visit Instructions Note Box */}
                    <div className="bg-purple-500/[0.07] border border-purple-500/20 rounded-2xl p-4 sm:p-5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                          <MessageSquare size={13} className="text-purple-600" />
                          Site Visit Instructions / Note Message
                        </p>
                        {siteVisitInfo.activity?.createdAt && (
                          <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                            Added {new Date(siteVisitInfo.activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="bg-[hsl(var(--background))] border border-purple-500/20 rounded-xl p-3.5 sm:p-4 shadow-xs">
                        <p className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] leading-relaxed whitespace-pre-wrap selection:bg-purple-500/20 break-words [overflow-wrap:anywhere]">
                          {siteVisitInfo.note || 'Lead passed to Site Visit and assigned to site team.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] sm:text-[11px] text-[hsl(var(--muted-foreground))] font-medium">
                        <span>Assigned Site Member: <strong className="text-[hsl(var(--foreground))]">{siteVisitInfo.assignedName}</strong></span>
                        {siteVisitInfo.activity?.user && (
                          <span>Scheduled By: <strong className="text-[hsl(var(--foreground))]">{siteVisitInfo.schedulerName}</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Key Info Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className={cn(
                        "rounded-xl p-3 border transition-colors",
                        isSiteVisitOverdue
                          ? "bg-rose-500/10 border-rose-500/30"
                          : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
                      )}>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} className={isSiteVisitOverdue ? "text-rose-500" : "text-purple-500"} /> Scheduled Date
                          </p>
                          {isSiteVisitOverdue && (
                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/15 px-1.5 py-0.2 rounded border border-rose-500/30 uppercase">
                              Time Passed
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          "font-bold text-xs mt-1",
                          isSiteVisitOverdue ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-[hsl(var(--foreground))]"
                        )}>
                          {siteVisitInfo.scheduledDate
                            ? new Date(siteVisitInfo.scheduledDate).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'Not specifically scheduled'}
                        </p>
                      </div>

                      <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))]">
                        <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                          <User size={11} className="text-blue-500" /> Assigned Member
                        </p>
                        <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                          {siteVisitInfo.assignedName}
                        </p>
                      </div>

                      <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))]">
                        <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                          <Building size={11} className="text-emerald-500" /> Property Scope
                        </p>
                        <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                          {lead.propertyType || 'Residential'}
                        </p>
                      </div>

                      <div 
                        className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] group cursor-pointer hover:border-amber-500/40 transition-all"
                        title={`Site Location: ${lead.projectLocation || lead.city || 'Not specified'}`}
                        onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={11} className="text-amber-500" /> Site Location
                          </p>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity">
                            {copiedLocation ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                          {lead.projectLocation || lead.city || 'Location Pending'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Measurements Content */}
                  {!lead.siteMeasurements ? (
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center space-y-4">
                      <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600">
                        <Ruler size={28} />
                      </div>
                      <div className="max-w-md space-y-1">
                        <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                          Ready for On-Site Survey & Measurements
                        </h3>
                        <p className="text-[hsl(var(--muted-foreground))] text-xs leading-relaxed">
                          Capture room dimensions, ceiling heights, door/window openings, electrical & plumbing MEP points, and high-res site photos.
                        </p>
                      </div>
                      {!isReadOnly && (
                        <button 
                          onClick={() => setIsSiteVisitModalOpen(true)} 
                          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm shadow-purple-600/20"
                        >
                          <Plus size={16} /> Log Site Visit & Measurements
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* 4-Card Structured Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 min-w-0">
                    
                    {/* Card 1: Room & Spatial Dimensions */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                          <Maximize2 size={16} className="text-purple-500" />
                          Room & Spatial Dimensions
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
                          Spatial
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 min-w-0">
                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Carpet Area</p>
                          <p className="font-black text-sm text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.carpetArea || '—'} <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Sq.Ft</span>
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Ceiling Height</p>
                          <p className="font-black text-sm text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.ceilingHeight || '—'} <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Ft</span>
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2 min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Maximize2 size={11} className="text-purple-500" /> Room Dimensions (Length × Width)
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.roomDimensions || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2 min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Layers size={11} className="text-indigo-500" /> Floor-to-Ceiling Height
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.floorToCeilingHeight || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2 min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Rooms to Design</p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.rooms || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Openings & Structural Elements */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                          <DoorOpen size={16} className="text-blue-500" />
                          Openings & Structural Specs
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          Structure
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 min-w-0">
                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <DoorOpen size={11} className="text-blue-500" /> Door Dimensions
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.doorDimensions || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Maximize2 size={11} className="text-sky-500" /> Window Dimensions
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.windowDimensions || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Columns size={11} className="text-amber-500" /> Wall Thickness
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.wallThickness || 'Not recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Columns size={11} className="text-orange-500" /> Column / Beam Dimensions
                          </p>
                          <p className="font-semibold text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.columnBeamDimensions || 'Not recorded'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: MEP & Utility Services */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                          <Zap size={16} className="text-amber-500" />
                          MEP & Utility Services
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          MEP
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 min-w-0">
                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Zap size={11} /> Existing Electrical Points
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.electricalPoints || 'No electrical notes recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Droplets size={11} /> Plumbing Points
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.plumbingPoints || 'No plumbing points recorded'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Wind size={11} /> AC Locations & Piping
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.acLocations || 'No AC locations recorded'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Furniture, Constraints & Notes */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                        <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                          <Armchair size={16} className="text-emerald-500" />
                          Furniture & Site Constraints
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Conditions
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 min-w-0">
                        <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Armchair size={11} /> Existing Furniture Dimensions
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.furnitureDimensions || 'No furniture dimensions recorded'}
                          </p>
                        </div>

                        <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20 min-w-0">
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <AlertTriangle size={11} /> Site Constraints & Limitations
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                            {lead.siteMeasurements.siteConstraints || 'None reported'}
                          </p>
                        </div>

                        <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20 min-w-0">
                          <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <FileText size={11} /> Additional Site Notes
                          </p>
                          <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
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
                    </>
                  )}
                </div>
                );
              })()}
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
              ) : (() => {
                const hasRequirements = Boolean(lead.requirements && lead.requirements.length > 0);
                const isReqOverdue = Boolean(
                  !hasRequirements &&
                  requirementsInfo.scheduledDate &&
                  new Date(requirementsInfo.scheduledDate).getTime() < Date.now()
                );

                const getReqOverdueText = (dateStr?: string | Date) => {
                  if (!dateStr) return 'Schedule Expired';
                  const diffMs = Date.now() - new Date(dateStr).getTime();
                  if (diffMs <= 0) return 'Schedule Expired';
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays > 0) return `${diffDays}d overdue`;
                  if (diffHours > 0) return `${diffHours}h overdue`;
                  return `${Math.max(1, diffMins)}m overdue`;
                };

                return (
                  <div className="space-y-4 sm:space-y-6">
                    {/* 1. Overdue Warning Banner */}
                    {isReqOverdue && (
                      <div className="relative overflow-hidden bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border-2 border-rose-500/30 dark:border-rose-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                            <AlertTriangle size={22} className="animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm sm:text-base font-black text-rose-950 dark:text-rose-100">
                                Requirements Session Overdue
                              </h4>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                                <Clock size={10} />
                                {getReqOverdueText(requirementsInfo.scheduledDate)}
                              </span>
                            </div>
                            <p className="text-xs text-rose-800 dark:text-rose-300/90 mt-1 leading-relaxed">
                              The scheduled requirements session for{' '}
                              <strong className="font-bold underline decoration-rose-400 decoration-1 underline-offset-2">
                                {new Date(requirementsInfo.scheduledDate).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </strong>{' '}
                              has passed without design specifications being recorded. Please reschedule the session or capture requirements now.
                            </p>
                          </div>
                        </div>
                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <button
                              onClick={() => setIsSendToReqOpen(true)}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer"
                              title="Reschedule Requirements Session"
                            >
                              <Calendar size={13} /> Reschedule Session
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. Primary Requirements Briefing & Specifications Card */}
                    <div className={cn(
                      "bg-[hsl(var(--card))] border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xs transition-colors",
                      isReqOverdue ? "border-rose-500/30" : "border-[hsl(var(--border))]"
                    )}>
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border",
                            isReqOverdue
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                          )}>
                            <PenTool size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                                Requirements Briefing & Specifications
                              </h2>
                              <span className={cn(
                                "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5",
                                hasRequirements
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : isReqOverdue
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              )}>
                                {hasRequirements ? (
                                  `Configured (${lead.requirements.length} ${lead.requirements.length === 1 ? 'Space' : 'Spaces'})`
                                ) : isReqOverdue ? (
                                  <>
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                                    </span>
                                    Discussion Overdue ({getReqOverdueText(requirementsInfo.scheduledDate)})
                                  </>
                                ) : (
                                  "Discussion Pending"
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              Assigned consultant, scheduled discussion time, budget range, and room-by-room design needs.
                            </p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasRequirements ? (
                              <>
                                <button
                                  onClick={() => setIsReqModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                                >
                                  <Pencil size={13} /> Edit Requirements & Budget
                                </button>
                                {['Under Requirement', 'Requirement Completed'].includes(lead.status) && (
                                  <button
                                    onClick={() => setIsSendToDrawingOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                                  >
                                    Pass to 2D/3D Drawing <ArrowRight size={13} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setIsSendToReqOpen(true)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs",
                                    isReqOverdue
                                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                                      : "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]"
                                  )}
                                  title="Re-assign or change discussion schedule"
                                >
                                  <Calendar size={13} /> Reschedule Session
                                </button>
                                <button
                                  onClick={() => setIsReqModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                                >
                                  <Plus size={14} /> Add Design Requirements
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Requirement Handover Notes Box */}
                      {requirementsInfo.note && (
                        <div className="bg-emerald-500/[0.07] border border-emerald-500/20 rounded-2xl p-4 sm:p-5 space-y-2.5 min-w-0 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 shrink-0">
                              <MessageSquare size={13} className="text-emerald-600" />
                              Requirement Handover & Scope Notes
                            </p>
                            {requirementsInfo.activity?.createdAt && (
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                                Recorded {new Date(requirementsInfo.activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[hsl(var(--foreground))] font-medium leading-relaxed bg-[hsl(var(--card)/0.8)] border border-emerald-500/20 p-3 sm:p-3.5 rounded-xl whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {requirementsInfo.note}
                          </p>
                        </div>
                      )}

                      {/* 4 Metadata Badges Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 min-w-0">
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} className="text-emerald-500" /> Discussion Schedule
                          </p>
                          <p className={cn("font-bold text-xs mt-1 truncate", isReqOverdue ? "text-rose-600 dark:text-rose-400 font-black" : "text-[hsl(var(--foreground))]")}>
                            {requirementsInfo.scheduledDate
                              ? new Date(requirementsInfo.scheduledDate).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'Not specifically scheduled'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <User size={11} className="text-blue-500" /> Assigned Consultant
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {requirementsInfo.assignedName}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <DollarSign size={11} className="text-amber-500" /> Target Budget
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {lead.budgetRange || 'Not specified'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-purple-500" /> Property Scope
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {lead.propertyType || 'Residential'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Empty State or Structured Room Cards */}
                    {!hasRequirements ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center space-y-4">
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
                          <PenTool size={28} />
                        </div>
                        <div className="max-w-md space-y-1">
                          <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                            Ready for Detailed Requirements Logging
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs leading-relaxed">
                            Capture room-by-room functional needs, spatial usage, MEP utility requirements, interior design styles, color palettes, materials, and specific client preferences.
                          </p>
                        </div>
                        {!isReadOnly && (
                          <button 
                            onClick={() => setIsReqModalOpen(true)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
                          >
                            <Plus size={16} /> Add Design Requirements
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
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
                  <div className="grid grid-cols-1 gap-6 min-w-0">
                    {lead.requirements.map((req: any, index: number) => {
                      const hasFunctional = !!(req.roomUsage || req.furnitureRequirements || req.storage || req.electricalPoints || req.lightingRequirements || req.plumbingRequirements || req.circulation);
                      const hasAesthetic = !!(req.designStyle || req.colours || req.materials || req.flooring || req.ceiling || req.wallFinishes || req.furnitureStyle || req.theme);

                      return (
                        <div key={index} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 space-y-5 hover:border-emerald-500/40 transition-colors min-w-0 overflow-hidden">
                          {/* Room Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))] min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <h3 className="text-lg font-black text-[hsl(var(--foreground))] truncate">{req.roomName}</h3>
                                {req.description && (
                                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-1 break-words [overflow-wrap:anywhere]">{req.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
                            {/* Functional Column */}
                            <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-2xl p-4 space-y-3.5 min-w-0 overflow-hidden">
                              <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                                <h4 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                                  <Sliders size={14} className="text-emerald-500" /> Functional Requirements
                                </h4>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">Usage & MEP</span>
                              </div>

                              <div className="space-y-2.5 text-xs min-w-0">
                                {req.roomUsage && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Room Usage</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.roomUsage}</p>
                                  </div>
                                )}
                                {req.furnitureRequirements && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Furniture Requirements</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.furnitureRequirements}</p>
                                  </div>
                                )}
                                {req.storage && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Storage Requirements</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.storage}</p>
                                  </div>
                                )}
                                {req.electricalPoints && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                      <Zap size={10} /> Electrical Points
                                    </p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.electricalPoints}</p>
                                  </div>
                                )}
                                {req.lightingRequirements && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                      <Sun size={10} /> Lighting
                                    </p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.lightingRequirements}</p>
                                  </div>
                                )}
                                {req.plumbingRequirements && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-1">
                                      <Droplets size={10} /> Plumbing
                                    </p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.plumbingRequirements}</p>
                                  </div>
                                )}
                                {req.circulation && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Circulation & Clearance</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.circulation}</p>
                                  </div>
                                )}
                                {!hasFunctional && (
                                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic p-2">No functional requirements specified.</p>
                                )}
                              </div>
                            </div>

                            {/* Aesthetic Column */}
                            <div className="bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-2xl p-4 space-y-3.5 min-w-0 overflow-hidden">
                              <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                                <h4 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                                  <Palette size={14} className="text-purple-500" /> Aesthetic Requirements
                                </h4>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600">Style & Finishes</span>
                              </div>

                              <div className="space-y-2.5 text-xs min-w-0">
                                {(req.designStyle || req.theme) && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Design Style</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.designStyle || req.theme}</p>
                                  </div>
                                )}
                                {req.colours && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Colours & Palette</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.colours}</p>
                                  </div>
                                )}
                                {req.materials && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Materials & Finishes</p>
                                    <p className="font-semibold text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.materials}</p>
                                  </div>
                                )}
                                {req.flooring && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Flooring</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.flooring}</p>
                                  </div>
                                )}
                                {req.ceiling && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Ceiling & False Ceiling</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.ceiling}</p>
                                  </div>
                                )}
                                {req.wallFinishes && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Wall Finishes</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.wallFinishes}</p>
                                  </div>
                                )}
                                {req.furnitureStyle && (
                                  <div className="bg-[hsl(var(--card))] p-2.5 rounded-xl border border-[hsl(var(--border))] min-w-0">
                                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Furniture Style</p>
                                    <p className="font-medium text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">{req.furnitureStyle}</p>
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
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 min-w-0 overflow-hidden">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1.5">
                                <Sparkles size={13} /> Specific Room Instructions & Notes
                              </p>
                              <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
            </div>
          );
        })()}
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
              ) : (() => {
                const designFilesList = lead.designFiles || [];
                const twoDFiles = designFilesList.filter((f: any) => {
                  if (f.category === '2D') return true;
                  if (f.category === '3D') return false;
                  const type = detectFileType(f.name);
                  return type !== '3d-model';
                });

                const threeDFiles = designFilesList.filter((f: any) => {
                  if (f.category === '3D') return true;
                  if (f.category === '2D') return false;
                  const type = detectFileType(f.name);
                  return type === '3d-model';
                });

                const hasDesignFiles = Boolean(designFilesList && designFilesList.length > 0);

                const draftDrawingsCount = designFilesList.filter((f: any) => {
                  const s = f.approvalStatus || f.status || 'draft';
                  return s === 'draft';
                }).length;

                const pendingDrawingsCount = designFilesList.filter((f: any) => {
                  const s = f.approvalStatus || f.status || 'draft';
                  return s === 'pending_internal_approval';
                }).length;

                const rejectedDrawingsCount = designFilesList.filter((f: any) => {
                  const s = f.approvalStatus || f.status || 'draft';
                  return s === 'internally_rejected' || f.clientStatus === 'client_changes_requested';
                }).length;

                const allDrawingsApproved = hasDesignFiles && draftDrawingsCount === 0 && pendingDrawingsCount === 0 && rejectedDrawingsCount === 0;

                return (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Primary 2D & 3D Design Briefing & Specifications Card */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xs">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border bg-blue-500/10 border-blue-500/20 text-blue-600">
                            <Ruler size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                                2D & 3D Design Drawings & Models
                              </h2>
                              <span className={cn(
                                "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5",
                                allDrawingsApproved
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
                                  : hasDesignFiles
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                              )}>
                                {allDrawingsApproved ? (
                                  `✓ All Approved (${designFilesList.length} Files)`
                                ) : hasDesignFiles ? (
                                  `Pending Approvals (${designFilesList.length - pendingDrawingsCount - rejectedDrawingsCount}/${designFilesList.length} Approved)`
                                ) : (
                                  "Upload Drawings Pending"
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              Architectural layouts, electrical/plumbing 2D working drawings, and 3D models/photorealistic renders.
                            </p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasDesignFiles ? (
                              <>
                                <button
                                  onClick={() => setIsDesignModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                                >
                                  <Plus size={14} /> Upload More Drawings
                                </button>
                                {['Under Drawing', 'Design Approved'].includes(lead.status) && (
                                  <button
                                    onClick={() => {
                                      const hasPending = pendingDrawingsCount > 0 || rejectedDrawingsCount > 0;
                                      if (hasPending) {
                                        toast.error('Cannot pass to BOQ: Drawing approval is still pending. Please ensure all drawings are approved first.');
                                        return;
                                      }
                                      setIsSendToBoqOpen(true);
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm",
                                      (pendingDrawingsCount === 0 && rejectedDrawingsCount === 0)
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700"
                                    )}
                                    title={
                                      (pendingDrawingsCount > 0 || rejectedDrawingsCount > 0)
                                        ? 'Cannot pass to BOQ: Drawing approval is pending'
                                        : 'Pass drawings to BOQ creation phase'
                                    }
                                  >
                                    Pass to BOQ Creation <ArrowRight size={13} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => setIsDesignModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                              >
                                <Plus size={14} /> Upload 2D & 3D Drawings
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Public Share Ribbon (if files exist) */}
                      {hasDesignFiles && (
                        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-500/20 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-600 flex items-center justify-center shrink-0">
                              <Globe size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                                  Client View-Only Portal
                                </h4>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                  lead.shareSettings?.isPublic
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                )}>
                                  {lead.shareSettings?.isPublic ? 'Link Active' : 'Link Not Generated'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                                Share 2D architectural blueprints, CAD plans, and 3D renders via a secure, unauthenticated URL.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            {lead.shareSettings?.isPublic && lead.shareSettings?.shareToken && (
                              <a
                                href={`/share/drawing/${lead.shareSettings.shareToken}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all shadow-xs"
                              >
                                <ExternalLink size={13} /> Preview Portal
                              </a>
                            )}
                            <button
                              onClick={() => setIsShareModalOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              <Share2 size={13} /> {lead.shareSettings?.isPublic ? 'Manage / Copy Link' : 'Generate Share Link'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Design Handover Notes Box */}
                      {drawingInfo.note && (
                        <div className="bg-blue-500/[0.07] border border-blue-500/20 rounded-2xl p-4 sm:p-5 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                              <MessageSquare size={13} className="text-blue-600" />
                              Design Brief & Layer Guidelines
                            </p>
                            {drawingInfo.activity?.createdAt && (
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                Recorded {new Date(drawingInfo.activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[hsl(var(--foreground))] font-medium leading-relaxed bg-[hsl(var(--card)/0.8)] border border-blue-500/20 p-3 sm:p-3.5 rounded-xl whitespace-pre-wrap">
                            {drawingInfo.note}
                          </p>
                        </div>
                      )}

                      {/* 4 Metadata Badges Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                        {/* 1. Assigned Designer */}
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <User size={11} className="text-purple-500" /> Assigned Designer
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {drawingInfo.assignedName}
                          </p>
                        </div>

                        {/* 2. Design Theme */}
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Palette size={11} className="text-emerald-500" /> Design Theme
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {lead.requirements?.find((r: any) => r.designStyle)?.designStyle || lead.requirements?.[0]?.theme || 'Custom Style'}
                          </p>
                        </div>

                        {/* 3. File Summary */}
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Layers size={11} className="text-cyan-500" /> File Summary
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {twoDFiles.length} 2D Layouts • {threeDFiles.length} 3D Files
                          </p>
                        </div>

                        {/* 4. Property Scope */}
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-blue-500" /> Property Scope
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {lead.propertyType || lead.projectLocation || 'Interior Execution'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Empty State or Segmented Partitions & File Grid */}
                    {!hasDesignFiles ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center space-y-4">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
                          <UploadCloud size={28} />
                        </div>
                        <div className="max-w-md space-y-1">
                          <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                            Ready for 2D & 3D Drawing Uploads
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs leading-relaxed">
                            Upload 2D layouts (Floor plans, False Ceiling RCP, Electrical & Plumbing drawings) and 3D models/photorealistic renders (.DWG, .SKP, .FBX, .OBJ, images).
                          </p>
                        </div>
                        {!isReadOnly && (
                          <button 
                            onClick={() => setIsDesignModalOpen(true)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm shadow-blue-600/20"
                          >
                            <Plus size={16} /> Upload 2D & 3D Drawings
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-6">
                        {/* Segmented Switcher Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3 sm:p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">File Categories:</span>
                          </div>

                          <div className="flex bg-[hsl(var(--muted))] p-1 rounded-xl sm:rounded-2xl border border-[hsl(var(--border))] w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => setDesignSubTab('2d')}
                              className={cn(
                                "flex-1 sm:flex-initial justify-center flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer",
                                designSubTab === '2d'
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                              )}
                            >
                              <Layers size={14} />
                              2D Layouts ({twoDFiles.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setDesignSubTab('3d')}
                              className={cn(
                                "flex-1 sm:flex-initial justify-center flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer",
                                designSubTab === '3d'
                                  ? "bg-purple-600 text-white shadow-xs"
                                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                              )}
                            >
                              <Box size={14} />
                              3D Models & Renders ({threeDFiles.length})
                            </button>
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
                                const versions = file.versions || [];
                                const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
                                const versionNum = file.currentVersion || latestVersion?.versionNumber || 1;
                                const rawStatus = latestVersion?.approvalStatus || file.approvalStatus || file.status || 'draft';
                                const approvalStatus = rawStatus === 'pending_internal_approval' ? 'pending_internal_approval'
                                  : rawStatus === 'internally_approved' ? 'internally_approved'
                                  : rawStatus === 'internally_rejected' ? 'internally_rejected'
                                  : 'draft';
                                const clientStatus = latestVersion?.clientStatus || file.clientStatus;
                                const clientFeedback = latestVersion?.clientFeedback || file.clientFeedback;
                                const isDraft = approvalStatus === 'draft';
                                const isPendingApproval = approvalStatus === 'pending_internal_approval';
                                const isApproved = approvalStatus === 'internally_approved';
                                const isDrawingRejected = approvalStatus === 'internally_rejected' || clientStatus === 'client_changes_requested';
                                const rejectionReason = isDrawingRejected ? (latestVersion?.rejectionReason || (approvalStatus === 'internally_rejected' ? (latestVersion?.internalNotes || file.rejectionReason || file.internalNotes) : null)) : null;

                                return (
                                  <div
                                    key={file._id || index}
                                    className="flex flex-col bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all group shadow-xs hover:shadow-md"
                                  >
                                    <div 
                                      onClick={() => router.push(`/interior-new/crm/leads/${params.id}/drawings/${encodeURIComponent(file._id || file.id || file.title || file.name)}`)}
                                      className={`h-36 sm:h-40 flex items-center justify-center relative overflow-hidden cursor-pointer ${
                                        type === 'pdf' ? 'bg-red-500/10 text-red-500' :
                                        type === 'cad' ? 'bg-amber-500/10 text-amber-500' :
                                        type === 'archive' ? 'bg-cyan-500/10 text-cyan-500' :
                                        'bg-blue-500/5 text-blue-500'
                                      }`}
                                    >
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

                                      {/* Version & Badge Overlay */}
                                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider backdrop-blur-md ${badge.color}`}>
                                          {badge.label}
                                        </span>
                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 text-indigo-600 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                                          v{versionNum}
                                        </span>
                                      </div>

                                      {/* Approval Status Overlay */}
                                      <div className="absolute top-2.5 right-2.5">
                                        {isDraft ? (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-slate-600 text-white shadow-xs">
                                            Draft
                                          </span>
                                        ) : isPendingApproval ? (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                                            Pending Approval
                                          </span>
                                        ) : isApproved ? (
                                          clientStatus === 'client_approved' ? (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                                              Client Approved
                                            </span>
                                          ) : clientStatus === 'client_changes_requested' ? (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                                              Client Revision
                                            </span>
                                          ) : (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                                              Live to Client
                                            </span>
                                          )
                                        ) : approvalStatus === 'internally_rejected' ? (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                                            Rejected Internally
                                          </span>
                                        ) : (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-slate-600 text-white shadow-xs">
                                            Draft
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Content & Actions */}
                                    <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                                      <div>
                                        <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate" title={file.title || file.name}>
                                          {file.title || file.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-[hsl(var(--muted-foreground))] flex-wrap">
                                          {file.roomTag && (
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                              {file.roomTag}
                                            </span>
                                          )}
                                          {file.uploadedAt && (
                                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                          )}
                                        </div>

                                        {/* Internal Rejection Reason Snippet */}
                                        {approvalStatus === 'internally_rejected' && rejectionReason && (
                                          <div className="mt-2 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-700 dark:text-rose-300 line-clamp-2" title={rejectionReason}>
                                            <strong>Rejection Reason:</strong> {rejectionReason}
                                          </div>
                                        )}

                                        {/* Client Feedback Snippet (if any) */}
                                        {clientFeedback && (
                                          <div className="mt-2 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-700 dark:text-amber-300 line-clamp-2">
                                            <strong>Client:</strong> {clientFeedback}
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Buttons Row */}
                                      <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {!isReadOnly && (
                                            <>
                                              {isDraft && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedDrawingForSendApproval(file);
                                                    setIsSendApprovalModalOpen(true);
                                                  }}
                                                  className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                  title="Send for team member approval"
                                                >
                                                  <Send size={11} /> Send for Approval
                                                </button>
                                              )}

                                              {isPendingApproval && file.assignedReviewerName && (
                                                <div
                                                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-200  rounded-lg text-[10px] font-bold"
                                                  title={`Assigned to ${file.assignedReviewerName}`}
                                                >
                                                  <User size={11} className="text-blue-600  shrink-0" />
                                                  <span className="truncate max-w-[120px] text-blue-600">Assigned: {file.assignedReviewerName}</span>
                                                </div>
                                              )}

                                              {isPendingApproval && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDirectApproveDrawing(file)}
                                                    disabled={approvingDrawingId === (file._id || file.id || file.title || file.name)}
                                                    className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                    title="Direct Approve & Publish to Client"
                                                  >
                                                    <CheckCircle2 size={11} /> {approvingDrawingId === (file._id || file.id || file.title || file.name) ? "Approving..." : "Approve"}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedDrawingForApproval({ ...file, initialAction: 'reject' });
                                                      setIsApprovalModalOpen(true);
                                                    }}
                                                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                    title="Reject Drawing with feedback"
                                                  >
                                                    <XCircle size={11} /> Reject
                                                  </button>
                                                </>
                                              )}


                                              {isDrawingRejected && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedDrawingForRevision(file);
                                                    setIsRevisionModalOpen(true);
                                                  }}
                                                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                  title="Upload next revision version (drawing rejected)"
                                                >
                                                  <UploadCloud size={11} /> + Rev
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                          {!isReadOnly && (
                                            <button
                                              type="button"
                                              onClick={() => setDrawingToDelete(file)}
                                              className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer"
                                              title="Delete Drawing"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => router.push(`/interior-new/crm/leads/${params.id}/drawings/${encodeURIComponent(file._id || file.id || file.title || file.name)}`)}
                                            className="p-1 px-2 rounded-lg bg-[hsl(var(--muted))] hover:bg-blue-500/10 text-[hsl(var(--muted-foreground))] hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                            title={`Open drawing page & all versions (v${versionNum})`}
                                          >
                                            <Eye size={12} />
                                            <span>View</span>
                                          </button>
                                        </div>
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
                                const versions = file.versions || [];
                                const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
                                const versionNum = file.currentVersion || latestVersion?.versionNumber || 1;
                                const rawStatus = latestVersion?.approvalStatus || file.approvalStatus || file.status || 'draft';
                                const approvalStatus = rawStatus === 'pending_internal_approval' ? 'pending_internal_approval'
                                  : rawStatus === 'internally_approved' ? 'internally_approved'
                                  : rawStatus === 'internally_rejected' ? 'internally_rejected'
                                  : 'draft';
                                const clientStatus = latestVersion?.clientStatus || file.clientStatus;
                                const clientFeedback = latestVersion?.clientFeedback || file.clientFeedback;
                                const isDraft = approvalStatus === 'draft';
                                const isPendingApproval = approvalStatus === 'pending_internal_approval';
                                const isApproved = approvalStatus === 'internally_approved';
                                const isDrawingRejected = approvalStatus === 'internally_rejected' || clientStatus === 'client_changes_requested';
                                const rejectionReason = isDrawingRejected ? (latestVersion?.rejectionReason || (approvalStatus === 'internally_rejected' ? (latestVersion?.internalNotes || file.rejectionReason || file.internalNotes) : null)) : null;

                                return (
                                  <div
                                    key={file._id || index}
                                    className="flex flex-col bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-purple-500/50 rounded-2xl overflow-hidden transition-all group shadow-xs hover:shadow-md"
                                  >
                                    <div 
                                      onClick={() => router.push(`/interior-new/crm/leads/${params.id}/drawings/${encodeURIComponent(file._id || file.id || file.title || file.name)}`)}
                                      className={`h-36 sm:h-40 flex items-center justify-center relative overflow-hidden cursor-pointer ${
                                        type === '3d-model' ? 'bg-purple-500/10 text-purple-500' :
                                        type === 'archive' ? 'bg-cyan-500/10 text-cyan-500' :
                                        'bg-purple-500/5 text-purple-500'
                                      }`}
                                    >
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

                                      {/* Version & Badge Overlay */}
                                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider backdrop-blur-md ${badge.color}`}>
                                          {badge.label}
                                        </span>
                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 text-purple-600 border border-purple-200 dark:border-purple-800 shadow-2xs">
                                          v{versionNum}
                                        </span>
                                      </div>

                                      {/* Approval Status Overlay */}
                                      <div className="absolute top-2.5 right-2.5">
                                        {isDraft ? (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-slate-600 text-white shadow-xs">
                                            Draft
                                          </span>
                                        ) : isPendingApproval ? (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                                            Pending Approval
                                          </span>
                                        ) : isApproved ? (
                                          clientStatus === 'client_approved' ? (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                                              Client Approved
                                            </span>
                                          ) : clientStatus === 'client_changes_requested' ? (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                                              Client Revision
                                            </span>
                                          ) : (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                                              Live to Client
                                            </span>
                                          )
                                        ) : approvalStatus === 'internally_rejected' ? (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                                            Rejected Internally
                                          </span>
                                        ) : (
                                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-slate-600 text-white shadow-xs">
                                            Draft
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Content & Actions */}
                                    <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5">
                                      <div>
                                        <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate" title={file.title || file.name}>
                                          {file.title || file.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-[hsl(var(--muted-foreground))] flex-wrap">
                                          {file.roomTag && (
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                              {file.roomTag}
                                            </span>
                                          )}
                                          {file.uploadedAt && (
                                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                          )}
                                        </div>

                                        {/* Internal Rejection Reason Snippet */}
                                        {approvalStatus === 'internally_rejected' && rejectionReason && (
                                          <div className="mt-2 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-700 dark:text-rose-300 line-clamp-2" title={rejectionReason}>
                                            <strong>Rejection Reason:</strong> {rejectionReason}
                                          </div>
                                        )}

                                        {/* Client Feedback Snippet (if any) */}
                                        {clientFeedback && (
                                          <div className="mt-2 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-700 dark:text-amber-300 line-clamp-2">
                                            <strong>Client:</strong> {clientFeedback}
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Buttons Row */}
                                      <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {!isReadOnly && (
                                            <>
                                              {isDraft && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedDrawingForSendApproval(file);
                                                    setIsSendApprovalModalOpen(true);
                                                  }}
                                                  className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                  title="Send for team member approval"
                                                >
                                                  <Send size={11} /> Send for Approval
                                                </button>
                                              )}

                                              {isPendingApproval && file.assignedReviewerName && (
                                                <div
                                                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50  border border-indigo-200  rounded-lg text-[10px] font-bold"
                                                  title={`Assigned to ${file.assignedReviewerName}`}
                                                >
                                                  <User size={11} className="text-blue-600  shrink-0" />
                                                  <span className="truncate max-w-[120px] text-blue-600">Assigned: {file.assignedReviewerName}</span>
                                                </div>
                                              )}

                                              {isPendingApproval && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDirectApproveDrawing(file)}
                                                    disabled={approvingDrawingId === (file._id || file.id || file.title || file.name)}
                                                    className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                    title="Direct Approve & Publish to Client"
                                                  >
                                                    <CheckCircle2 size={11} /> {approvingDrawingId === (file._id || file.id || file.title || file.name) ? "Approving..." : "Approve"}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedDrawingForApproval({ ...file, initialAction: 'reject' });
                                                      setIsApprovalModalOpen(true);
                                                    }}
                                                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                    title="Reject Drawing with feedback"
                                                  >
                                                    <XCircle size={11} /> Reject
                                                  </button>
                                                </>
                                              )}


                                              {isDrawingRejected && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedDrawingForRevision(file);
                                                    setIsRevisionModalOpen(true);
                                                  }}
                                                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                  title="Upload next revision version (drawing rejected)"
                                                >
                                                  <UploadCloud size={11} /> + Rev
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                          {!isReadOnly && (
                                            <button
                                              type="button"
                                              onClick={() => setDrawingToDelete(file)}
                                              className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 transition-colors cursor-pointer"
                                              title="Delete Drawing"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => router.push(`/interior-new/crm/leads/${params.id}/drawings/${encodeURIComponent(file._id || file.id || file.title || file.name)}`)}
                                            className="p-1 px-2 rounded-lg bg-[hsl(var(--muted))] hover:bg-purple-500/10 text-[hsl(var(--muted-foreground))] hover:text-purple-600 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                            title={`Open 3D Model page & all versions (v${versionNum})`}
                                          >
                                            <Eye size={12} />
                                            <span>View</span>
                                          </button>
                                         
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-10 sm:py-12 flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--muted)/0.2)] text-center">
                              <Box className="w-8 h-8 sm:w-10 sm:h-10 text-[hsl(var(--muted-foreground))] mb-2 opacity-50" />
                              <p className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">No 3D Models / Renders Uploaded</p>
                              <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-sm">Click upload drawings to attach 3D DWG, SKP, FBX, OBJ or render images.</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}

          {activeTab === 'boq' && (
            <motion.div key="boq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
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
              ) : (() => {
                const hasBoqs = Boolean(lead.boqs && lead.boqs.length > 0);
                const hasAcceptedQuote = lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted');
                const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean(lead.linkedProject);
                const isBoqLocked = isReadOnly || isQuotationApproved;

                return (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Primary BOQ Header & Specifications Card */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xs min-w-0 overflow-hidden">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[hsl(var(--border))] min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border bg-indigo-500/10 border-indigo-500/20 text-indigo-600">
                            <Calculator size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <h2 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))] truncate">
                                Bill of Quantities (BOQ) & Estimations
                              </h2>
                              <span className={cn(
                                "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5",
                                hasBoqs
                                  ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              )}>
                                {hasBoqs ? (
                                  `BOQ Ready (${lead.boqs.length} ${lead.boqs.length === 1 ? 'Version' : 'Versions'})`
                                ) : (
                                  "Estimation Pending"
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              Itemized line-item quantities, unit rates, material specifications, and estimation versions.
                            </p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {isBoqLocked ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] text-xs font-bold">
                                <Lock size={13} /> {isLost ? 'Lead Lost (Locked)' : 'Quotation Approved (BOQ Locked)'}
                              </span>
                            ) : hasBoqs ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingBoqIndex(activeBoqIndex);
                                    setIsBoqModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                                >
                                  <Pencil size={13} /> Edit Current BOQ
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingBoqIndex(null);
                                    setIsBoqModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                                >
                                  <Plus size={14} /> New Version
                                </button>
                                {['Under BOQ Creation', 'Design Approved', 'Under Drawing'].includes(lead.status) && (
                                  <button
                                    onClick={() => setIsSendToQuotationsOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                                  >
                                    Pass to Quotation <ArrowRight size={13} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => setIsBoqModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                              >
                                <Plus size={14} /> Create Initial BOQ
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Over Budget Warning Banner */}
                      {boqInfo.isOverBudget && hasBoqs && (
                        <div className="bg-rose-500/[0.08] dark:bg-rose-500/15 border-2 border-rose-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs min-w-0 overflow-hidden">
                          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 mt-0.5">
                            <AlertTriangle size={18} />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                Over Budget Warning
                              </h4>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                +{boqInfo.budgetExcessPercentage.toFixed(1)}% Over Estimate
                              </span>
                            </div>
                            <p className="text-xs text-rose-900/90 dark:text-rose-200/90 leading-relaxed font-medium break-words [overflow-wrap:anywhere]">
                              Current BOQ total of <strong className="font-black text-[hsl(var(--foreground))]">₹{boqInfo.totalAmount.toLocaleString('en-IN')}</strong> exceeds the maximum estimated budget range of <strong className="font-black text-[hsl(var(--foreground))]">₹{boqInfo.maxBudget?.toLocaleString('en-IN')}</strong> ({lead.budgetRange || 'Estimate'}) by <strong className="font-black text-rose-600 dark:text-rose-400">₹{boqInfo.budgetExcessAmount.toLocaleString('en-IN')}</strong>.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Estimator Handover Notes Box */}
                      {boqInfo.note && (
                        <div className="bg-indigo-500/[0.07] border border-indigo-500/20 rounded-2xl p-4 sm:p-5 space-y-2.5 min-w-0 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 shrink-0">
                              <MessageSquare size={13} className="text-indigo-600" />
                              Estimator Note & Scope Assumptions
                            </p>
                            {boqInfo.activity?.createdAt && (
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                                Recorded {new Date(boqInfo.activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[hsl(var(--foreground))] font-medium leading-relaxed bg-[hsl(var(--card)/0.8)] border border-indigo-500/20 p-3 sm:p-3.5 rounded-xl whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {boqInfo.note}
                          </p>
                        </div>
                      )}

                      {/* 4 Metadata Badges Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 min-w-0">
                        {/* 1. Total Estimated Amount */}
                        <div className={cn(
                          "rounded-xl p-3 border transition-colors min-w-0 overflow-hidden",
                          boqInfo.isOverBudget && hasBoqs
                            ? "bg-rose-500/[0.08] border-rose-500/30"
                            : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
                        )}>
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                              <Calculator size={11} className={boqInfo.isOverBudget && hasBoqs ? "text-rose-500" : "text-indigo-500"} /> Total BOQ Estimate
                            </p>
                            {boqInfo.isOverBudget && hasBoqs && (
                              <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/20 px-1.5 py-0.2 rounded border border-rose-500/30 uppercase">
                                Exceeded
                              </span>
                            )}
                          </div>
                          <p className={cn(
                            "font-black text-sm mt-1 truncate",
                            boqInfo.isOverBudget && hasBoqs ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"
                          )}>
                            {hasBoqs ? `₹${boqInfo.totalAmount.toLocaleString('en-IN')}` : 'Pending Estimation'}
                          </p>
                        </div>

                        {/* 2. Line Items & Categories */}
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Layers size={11} className="text-purple-500" /> Items & Categories
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {hasBoqs ? `${boqInfo.itemsCount} Items • ${boqInfo.categoriesCount} Categories` : 'No items added'}
                          </p>
                        </div>

                        {/* 3. Target Budget */}
                        <div className={cn(
                          "rounded-xl p-3 border transition-colors min-w-0 overflow-hidden",
                          boqInfo.isOverBudget && hasBoqs
                            ? "bg-amber-500/[0.08] border-amber-500/30"
                            : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
                        )}>
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                              <DollarSign size={11} className="text-emerald-500" /> Target Budget
                            </p>
                            {boqInfo.isOverBudget && hasBoqs && (
                              <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 uppercase">
                                Over Budget
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {lead.budgetRange || 'Not specified'}
                          </p>
                        </div>

                        {/* 4. Property Scope */}
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-blue-500" /> Property Scope
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {lead.propertyType || lead.projectLocation || 'Interior Project'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content Section: Empty State OR Version Switcher + BoqPreview */}
                    {!hasBoqs ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center space-y-4">
                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
                          <Calculator size={28} />
                        </div>
                        <div className="max-w-md space-y-1">
                          <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                            Ready for Detailed BOQ Estimation
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs leading-relaxed">
                            Build itemized quantity take-offs across flooring, carpentry, false ceiling, MEP electrical/plumbing, and finishes with unit rates and specifications.
                          </p>
                        </div>
                        {!isReadOnly && !isBoqLocked && (
                          <button 
                            onClick={() => setIsBoqModalOpen(true)} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/20"
                          >
                            <Plus size={16} /> Create Initial BOQ
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Version Switcher Bar */}
                        {lead.boqs.length > 1 && (
                          <div className="flex items-center justify-between gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3 sm:p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">BOQ Versions:</span>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x">
                              {lead.boqs.map((q: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setActiveBoqIndex(idx)}
                                  className={cn(
                                    "px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer",
                                    activeBoqIndex === idx 
                                      ? "bg-indigo-600 text-white shadow-xs" 
                                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
                                  )}
                                >
                                  Version {q.version || idx + 1}
                                  {q.createdAt && (
                                    <span className="text-[10px] opacity-70">
                                      ({new Date(q.createdAt).toLocaleDateString()})
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interactive BOQ Preview */}
                        <BoqPreview 
                          lead={lead} 
                          boqIndex={activeBoqIndex} 
                          onSuccess={fetchData} 
                          onEdit={isBoqLocked ? undefined : () => {
                            setEditingBoqIndex(activeBoqIndex);
                            setIsBoqModalOpen(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'quotations' && (
            <motion.div key="quotations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
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
              ) : (() => {
                const hasQuotations = Boolean(lead.quotations && lead.quotations.length > 0);
                const latestQuote = hasQuotations ? lead.quotations[lead.quotations.length - 1] : null;
                const isLatestQuoteRejected = Boolean(latestQuote && latestQuote.status === 'Rejected');
                const hasAcceptedQuote = Boolean(lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted' || q.status === 'Approved'));
                const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean(lead.linkedProject);
                const isQuoteLocked = isReadOnly || isQuotationApproved;

                return (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Primary Quotation Header & Specifications Card */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xs min-w-0 overflow-hidden">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[hsl(var(--border))] min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border bg-rose-500/10 border-rose-500/20 text-rose-600">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <h2 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))] truncate">
                                Commercial Quotations & Proposals
                              </h2>
                              <span className={cn(
                                "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5",
                                hasQuotations
                                  ? isLatestQuoteRejected
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold"
                                    : hasAcceptedQuote
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              )}>
                                {hasQuotations ? (
                                  `Quotation Ready (${lead.quotations.length} ${lead.quotations.length === 1 ? 'Version' : 'Versions'})`
                                ) : (
                                  "Proposal Pending"
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              Itemized customer pricing proposal, discounts, tax schedules, terms of payment, and proforma invoices.
                            </p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {hasQuotations ? (
                              <>
                                {isLatestQuoteRejected ? (
                                  <button
                                    onClick={() => setIsQuotationModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm shadow-rose-600/20"
                                  >
                                    <Plus size={14} /> Add Quotation Version (v{(lead.quotations.length || 1) + 1})
                                  </button>
                                ) : latestQuote?.status === 'Draft' ? (
                                  <button
                                    onClick={() => setIsQuotationModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                                  >
                                    <Plus size={14} /> Edit Draft Quote (v{latestQuote.version || 1})
                                  </button>
                                ) : (
                                  <div 
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold"
                                    title="A new quotation version can only be created if the current version is Rejected by client"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    <span>Version {latestQuote?.version || 1} {latestQuote?.status || 'Sent'}</span>
                                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold hidden sm:inline">• Revision locked until rejected</span>
                                  </div>
                                )}

                                {(hasAcceptedQuote || lead.status === 'Booking Pending') && !['Won', 'Converted'].includes(lead.status) && (
                                  <button
                                    onClick={() => setIsConvertToProjectOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                                  >
                                    <CheckCircle2 size={14} /> Convert to Project
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => setIsQuotationModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                              >
                                <Plus size={14} /> Create Quotation
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Over Budget Warning Banner */}
                      {quotationInfo.isOverBudget && hasQuotations && (
                        <div className="bg-rose-500/[0.08] dark:bg-rose-500/15 border-2 border-rose-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs min-w-0 overflow-hidden">
                          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 mt-0.5">
                            <AlertTriangle size={18} />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                Over Target Budget Warning
                              </h4>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                +{quotationInfo.budgetExcessPercentage.toFixed(1)}% Over Estimate
                              </span>
                            </div>
                            <p className="text-xs text-rose-900/90 dark:text-rose-200/90 leading-relaxed font-medium break-words [overflow-wrap:anywhere]">
                              Current Quotation Grand Total of <strong className="font-black text-[hsl(var(--foreground))]">₹{quotationInfo.grandTotal.toLocaleString('en-IN')}</strong> exceeds the client estimated budget range of <strong className="font-black text-[hsl(var(--foreground))]">₹{quotationInfo.maxBudget?.toLocaleString('en-IN')}</strong> ({lead.budgetRange || 'Estimate'}) by <strong className="font-black text-rose-600 dark:text-rose-400">₹{quotationInfo.budgetExcessAmount.toLocaleString('en-IN')}</strong>.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Handover & Commercial Strategy Notes Box */}
                      {quotationInfo.note && (
                        <div className="bg-rose-500/[0.07] border border-rose-500/20 rounded-2xl p-4 sm:p-5 space-y-2.5 min-w-0 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5 shrink-0">
                              <MessageSquare size={13} className="text-rose-600" />
                              Commercial Handover Notes & Assumptions
                            </p>
                            {quotationInfo.activity?.createdAt && (
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                                Recorded {new Date(quotationInfo.activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[hsl(var(--foreground))] font-medium leading-relaxed bg-[hsl(var(--card)/0.8)] border border-rose-500/20 p-3 sm:p-3.5 rounded-xl whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {quotationInfo.note}
                          </p>
                        </div>
                      )}

                      {/* 4 Metadata Badges Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 min-w-0">
                        {/* 1. Grand Total */}
                        <div className={cn(
                          "rounded-xl p-3 border transition-colors min-w-0 overflow-hidden",
                          quotationInfo.isOverBudget && hasQuotations
                            ? "bg-rose-500/[0.08] border-rose-500/30"
                            : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
                        )}>
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                              <FileText size={11} className={quotationInfo.isOverBudget && hasQuotations ? "text-rose-500" : "text-rose-500"} /> Grand Total Quote
                            </p>
                            {quotationInfo.isOverBudget && hasQuotations && (
                              <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/20 px-1.5 py-0.2 rounded border border-rose-500/30 uppercase">
                                Exceeded
                              </span>
                            )}
                          </div>
                          <p className={cn(
                            "font-black text-sm mt-1 truncate",
                            quotationInfo.isOverBudget && hasQuotations ? "text-rose-600 dark:text-rose-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {hasQuotations ? `₹${quotationInfo.grandTotal.toLocaleString('en-IN')}` : 'Pending Quote'}
                          </p>
                        </div>

                        {/* 2. Commercial Adjustments */}
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Sliders size={11} className="text-purple-500" /> Commercial Breakdown
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {hasQuotations
                              ? `${quotationInfo.discount > 0 ? `₹${quotationInfo.discount.toLocaleString('en-IN')} Disc • ` : ''}${quotationInfo.taxPercentage}% Tax (${quotationInfo.itemsCount} Items)`
                              : 'No items priced'}
                          </p>
                        </div>

                        {/* 3. Proposal Status */}
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-xl p-3 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-500" /> Proposal Status
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 min-w-0">
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0",
                              quotationInfo.currentQuote?.status === 'Accepted'
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : quotationInfo.currentQuote?.status === 'Rejected'
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                : quotationInfo.currentQuote?.status === 'Sent'
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                              {quotationInfo.currentQuote?.status || 'Draft'}
                            </span>
                            <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] truncate">
                              • {quotationInfo.assignedName}
                            </span>
                          </div>
                        </div>

                        {/* 4. Target Budget */}
                        <div className={cn(
                          "rounded-xl p-3 border transition-colors min-w-0 overflow-hidden",
                          quotationInfo.isOverBudget && hasQuotations
                            ? "bg-amber-500/[0.08] border-amber-500/30"
                            : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
                        )}>
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                              <DollarSign size={11} className="text-emerald-500" /> Target Budget
                            </p>
                            {quotationInfo.isOverBudget && hasQuotations && (
                              <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 uppercase">
                                Over Budget
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-1 truncate">
                            {lead.budgetRange || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content Section: Empty State OR Version Switcher + QuotationPreview */}
                    {!hasQuotations ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center space-y-4">
                        <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600">
                          <FileText size={28} />
                        </div>
                        <div className="max-w-md space-y-1">
                          <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))]">
                            Ready for Commercial Quotation
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs leading-relaxed">
                            Generate itemized pricing proposals, apply taxes, special project discounts, and email proforma invoices directly to the client.
                          </p>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => setIsQuotationModalOpen(true)}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm shadow-rose-600/20"
                          >
                            <Plus size={16} /> Create Initial Quotation
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Version Switcher Bar */}
                        {lead.quotations.length > 1 && (
                          <div className="flex items-center justify-between gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3 sm:p-4 shadow-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Quote Versions:</span>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x">
                              {lead.quotations.map((q: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setActiveQuotationIndex(idx)}
                                  className={cn(
                                    "px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer",
                                    activeQuotationIndex === idx
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:text-[hsl(var(--foreground))]"
                                  )}
                                >
                                  Version {q.version || idx + 1}
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                    activeQuotationIndex === idx
                                      ? "bg-white/20 text-white"
                                      : q.status === 'Accepted'
                                      ? "bg-emerald-500/20 text-emerald-600"
                                      : q.status === 'Rejected'
                                      ? "bg-rose-500/20 text-rose-600"
                                      : "bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]"
                                  )}>
                                    {q.status || 'Draft'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interactive Quotation Preview */}
                        <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden overflow-x-auto">
                          <QuotationPreview
                            lead={lead}
                            quotationIndex={Math.min(activeQuotationIndex, Math.max(0, (lead.quotations?.length || 1) - 1))}
                            onAddVersion={() => setIsQuotationModalOpen(true)}
                            onSuccess={() => {
                              fetchData();
                              setActiveQuotationIndex((prev) => Math.max(0, Math.min(prev, (lead.quotations?.length || 1) - 2)));
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
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
        instructions={siteVisitInfo.note}
      />
      <InteriorLogRequirementsModal
        isOpen={isReqModalOpen}
        onClose={() => setIsReqModalOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        users={users}
        initialRequirements={lead?.requirements || []}
        initialBudget={lead?.budgetRange || ''}
        currentStatus={lead?.status || ''}
        isReadOnly={['Won', 'Converted'].includes(lead?.status || '')}
      />
      <InteriorUploadDesignModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        customerId={params.id as string}
        onSuccess={fetchData}
        existingFiles={lead?.designFiles || []}
        users={users}
        requirements={lead?.requirements || []}
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
        isReadOnly={Boolean(
          isReadOnly ||
          (lead?.quotations && lead.quotations.some((q: any) => q.status === 'Accepted')) ||
          ['Booking Pending', 'Won', 'Converted'].includes(lead?.status || '') ||
          Boolean(lead?.linkedProject)
        )}
        budgetRange={lead?.budgetRange || ''}
        onSuccess={fetchData}
      />
      <InteriorScheduleFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        customerId={params.id as string}
        customerName={lead?.name}
        onSuccess={fetchData}
        users={users}
        initialData={(() => {
          const isInitialPhase = ['New Lead', 'Contacted', 'Meeting Scheduled'].includes(lead?.status || '');
          if (!isInitialPhase) return null;

          const pending = activities.find(
            (a) => a.status === 'Pending' && a.type !== 'Site Visit' && a.type !== 'Status Change'
          );
          const latestFollowUp = pending || activities.find(
            (a) => a.type !== 'Status Change' && a.type !== 'Site Visit' && a.remarks
          );
          
          if (latestFollowUp) {
            return {
              _id: latestFollowUp._id,
              type: latestFollowUp.type || 'Phone Call',
              scheduledDate: latestFollowUp.scheduledDate || latestFollowUp.createdAt,
              remarks: latestFollowUp.remarks || '',
              assignedSalesExecutive: (typeof latestFollowUp.user === 'object' ? latestFollowUp.user?._id : latestFollowUp.user) || (typeof lead?.assignedSalesExecutive === 'object' ? lead.assignedSalesExecutive?._id : lead?.assignedSalesExecutive) || '',
            };
          }
          if (lead?.assignedSalesExecutive) {
            return {
              assignedSalesExecutive: (typeof lead.assignedSalesExecutive === 'object' ? lead.assignedSalesExecutive._id : lead.assignedSalesExecutive) || '',
            };
          }
          return null;
        })()}
      />
      <InteriorSendToSiteVisitModal
        isOpen={isSendToSiteVisitOpen}
        onClose={() => setIsSendToSiteVisitOpen(false)}
        customerId={params.id as string}
        customerName={lead?.name}
        currentStatus={lead?.status}
        initialData={(() => {
          const isSiteVisitStage = ['Under Site Visit', 'Measurement Done'].includes(lead?.status || '');
          if (!isSiteVisitStage) return null;

          const assignedId = typeof lead?.assignedSalesExecutive === 'object' && lead?.assignedSalesExecutive !== null
            ? lead.assignedSalesExecutive._id || lead.assignedSalesExecutive.id
            : lead?.assignedSalesExecutive || (typeof siteVisitInfo.activity?.user === 'object' ? siteVisitInfo.activity?.user?._id : siteVisitInfo.activity?.user);

          if (siteVisitInfo.scheduledDate || assignedId || siteVisitInfo.note) {
            return {
              scheduledDate: siteVisitInfo.scheduledDate,
              assignedSalesExecutive: assignedId || '',
              remarks: siteVisitInfo.note || '',
            };
          }
          return null;
        })()}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSiteVisitHistoryModal
        isOpen={isSiteVisitHistoryOpen}
        onClose={() => setIsSiteVisitHistoryOpen(false)}
        activities={activities}
        users={users}
        leadName={lead?.name}
        leadLocation={lead?.location || lead?.address}
        onReschedule={() => setIsSendToSiteVisitOpen(true)}
        isReadOnly={isReadOnly}
      />
      <InteriorSendToRequirementsModal
        isOpen={isSendToReqOpen}
        onClose={() => setIsSendToReqOpen(false)}
        customerId={params.id as string}
        customerName={lead?.name}
        currentStatus={lead?.status}
        initialData={(() => {
          const isRequirementStage = ['Under Requirement', 'Requirement Completed'].includes(lead?.status || '');
          if (!isRequirementStage) return null;

          const designerId = typeof lead?.designerAssigned === 'object' && lead?.designerAssigned !== null
            ? lead.designerAssigned._id || lead.designerAssigned.id
            : lead?.designerAssigned || (typeof requirementsInfo.activity?.user === 'object' ? requirementsInfo.activity?.user?._id || requirementsInfo.activity?.user?.id : requirementsInfo.activity?.user);

          const scheduledDate = lead?.requirementScheduledDate || requirementsInfo.scheduledDate;
          const remarks = requirementsInfo.note || '';

          if (designerId || scheduledDate || remarks) {
            return {
              assignedMember: designerId || '',
              scheduledDate: scheduledDate,
              remarks: remarks,
            };
          }
          return null;
        })()}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSendToDrawingModal
        isOpen={isSendToDrawingOpen}
        onClose={() => setIsSendToDrawingOpen(false)}
        customerId={params.id as string}
        customerName={lead?.name}
        currentStatus={lead?.status}
        initialData={(() => {
          const isDrawingStage = ['Under Drawing', 'Design Approved'].includes(lead?.status || '');
          if (!isDrawingStage) return null;

          const designerId = typeof lead?.designerAssigned === 'object' && lead?.designerAssigned !== null
            ? lead.designerAssigned._id || lead.designerAssigned.id
            : lead?.designerAssigned || (typeof drawingInfo.activity?.user === 'object' ? drawingInfo.activity?.user?._id || drawingInfo.activity?.user?.id : drawingInfo.activity?.user);

          const scheduledDate = lead?.drawingScheduledDate || drawingInfo.scheduledDate;
          const remarks = drawingInfo.note || '';

          if (designerId || scheduledDate || remarks) {
            return {
              assignedDesigner: designerId || '',
              scheduledDate: scheduledDate,
              remarks: remarks,
            };
          }
          return null;
        })()}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSendToBoqModal
        isOpen={isSendToBoqOpen}
        onClose={() => setIsSendToBoqOpen(false)}
        customerId={params.id as string}
        lead={lead}
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
      <InteriorMarkAsLostModal
        isOpen={isMarkAsLostOpen}
        onClose={() => setIsMarkAsLostOpen(false)}
        customerId={params.id as string}
        leadName={lead?.name}
        onSuccess={fetchData}
      />
      <InteriorCrmShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        lead={lead}
        onUpdated={fetchData}
      />
      <InteriorDrawingApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedDrawingForApproval(null);
        }}
        customerId={params.id as string}
        drawing={selectedDrawingForApproval}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorUploadRevisionModal
        isOpen={isRevisionModalOpen}
        onClose={() => {
          setIsRevisionModalOpen(false);
          setSelectedDrawingForRevision(null);
        }}
        customerId={params.id as string}
        drawing={selectedDrawingForRevision}
        onSuccess={fetchData}
        users={users}
      />
      <InteriorSendDrawingForApprovalModal
        isOpen={isSendApprovalModalOpen}
        onClose={() => {
          setIsSendApprovalModalOpen(false);
          setSelectedDrawingForSendApproval(null);
        }}
        customerId={params.id as string}
        drawing={selectedDrawingForSendApproval}
        onSuccess={fetchData}
        users={users}
      />

      {/* Delete Drawing Confirmation Modal */}
      <AnimatePresence>
        {drawingToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => !isDeletingDrawing && setDrawingToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Drawing
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Are you sure you want to delete drawing <strong className="text-slate-800">"{drawingToDelete.title || drawingToDelete.name || 'this drawing'}"</strong>? This will permanently remove all associated revision versions.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeletingDrawing}
                  onClick={() => setDrawingToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingDrawing}
                  onClick={handleDeleteDrawing}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeletingDrawing ? 'Deleting...' : 'Delete Drawing'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </InteriorShell>
  );
}