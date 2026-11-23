'use client';
import { tr } from '@/i18n';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useConfirm } from '@/providers/ConfirmContext';
import { ArrowLeft, ArrowRight, User, Phone, Mail, Building, Activity, Plus, MessageSquare, MessageCircle, X, CheckCircle2, XCircle, ShieldCheck, ShoppingBag, Receipt, Paperclip, CheckCheck, Calendar, MapPin, Ruler, PenTool, UploadCloud, File as FileIcon, Image as ImageIcon, Calculator, FileText, ChevronDown, ChevronRight, Pencil, Trash2, DoorOpen, Maximize2, Columns, Zap, Droplets, Wind, Armchair, AlertTriangle, AlertCircle, Layers, Palette, Sliders, Sun, Sparkles, Box, Archive, ExternalLink, Eye, EyeOff, Lock, Copy, Check, CalendarCheck, Clock, PhoneCall, Frown, History, Share2, Globe, Send, CheckCircle, FileSpreadsheet, Download, Banknote } from 'lucide-react';
import { exportBoqToExcel } from '@/lib/exportBoqExcelLazy';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, parseMaxBudget, formatSmartCurrency, formatMillionBillion } from '@/lib/utils';
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
import { InteriorDrawingConfirmApproveModal } from '@/features/interior-new/components/crm/modals/InteriorDrawingConfirmApproveModal';
import { InteriorUploadRevisionModal } from '@/features/interior-new/components/crm/modals/InteriorUploadRevisionModal';
import { InteriorSendDrawingForApprovalModal } from '@/features/interior-new/components/crm/modals/InteriorSendDrawingForApprovalModal';
import { Interior3DViewerModal } from '@/features/interior-new/components/crm/modals/Interior3DViewerModalLazy';
import { InteriorCrmShareModal } from '@/features/interior-new/components/crm/modals/InteriorCrmShareModal';
import { InteriorQuotationBuilderModal } from '@/features/interior-new/components/crm/modals/InteriorQuotationBuilderModal';
import { InteriorQuotationPreviewModal } from '@/features/interior-new/components/crm/modals/InteriorQuotationPreviewModal';
import { InteriorSendQuotationModal } from '@/features/interior-new/components/crm/modals/InteriorSendQuotationModal';
import { InteriorEditLeadModal } from '@/features/interior-new/components/crm/modals/InteriorEditLeadModal';
import { InteriorDeleteLeadModal } from '@/features/interior-new/components/crm/modals/InteriorDeleteLeadModal';
import { InteriorMarkAsLostModal } from '@/features/interior-new/components/crm/modals/InteriorMarkAsLostModal';
import { QuotationPreview } from '@/components/crm/QuotationPreview';
import { BoqPreview } from '@/components/crm/BoqPreview';
import { InteriorBoqBuilderModal } from '@/features/interior-new/components/crm/modals/InteriorBoqBuilderModal';
import { InteriorDeleteBoqModal } from '@/features/interior-new/components/crm/modals/InteriorDeleteBoqModal';
import { InteriorSendBoqForApprovalModal } from '@/features/interior-new/components/crm/modals/InteriorSendBoqForApprovalModal';
import { InteriorBoqApprovalModal } from '@/features/interior-new/components/crm/modals/InteriorBoqApprovalModal';
import { InteriorCreateConfirmOrderModal } from '@/features/interior-new/components/crm/modals/InteriorCreateConfirmOrderModal';
import { InteriorConfirmedOrderStageView } from '@/features/interior-new/components/crm/InteriorConfirmedOrderStageView';
import { InteriorLeadFollowUpsTab } from '@/features/interior-new/components/crm/InteriorLeadFollowUpsTab';
import { InteriorComparativeRequirementsView } from '@/features/interior-new/components/crm/InteriorComparativeRequirementsView';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';
import { format } from 'date-fns';
import { ScrollPane } from '@/components/ui/ScrollPane';
import { AccordionCard, AccordionToolbar } from '@/components/ui/AccordionCard';

export default function Lead360View() {
  const { currencySymbol, currencyCode, formatExactCurrency, formatCurrency } = useCurrency();
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
const { hasPermission: canDo } = usePermissions();
  const { confirm, prompt } = useConfirm();
  const queryClient = useQueryClient();

  const [copiedLocation, setCopiedLocation] = useState(false);

  const handleCopyLocation = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLocation(true);
    toast.success(tr("Address copied to clipboard"));
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  // Site Visits tab: which survey sections are open (all collapsed by default)
  const [siteOpen, setSiteOpen] = useState<Set<string>>(() => new Set());
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
  const [shareModalMode, setShareModalMode] = useState<'drawings' | 'requirements'>('drawings');
  const [requirementsViewMode, setRequirementsViewMode] = useState<'side-by-side' | 'technical' | 'client'>('side-by-side');
  const [selected3DFile, setSelected3DFile] = useState<any | null>(null);
  const [selectedDrawingForApproval, setSelectedDrawingForApproval] = useState<any | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedDrawingForSendApproval, setSelectedDrawingForSendApproval] = useState<any | null>(null);
  const [isSendApprovalModalOpen, setIsSendApprovalModalOpen] = useState(false);
  const [selectedDrawingForRevision, setSelectedDrawingForRevision] = useState<any | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [viewRejectionReasonData, setViewRejectionReasonData] = useState<{ title: string; reason: string; version: number } | null>(null);
  const [drawingToDelete, setDrawingToDelete] = useState<any | null>(null);
  const [isDeletingDrawing, setIsDeletingDrawing] = useState(false);
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [isDeleteBoqModalOpen, setIsDeleteBoqModalOpen] = useState(false);
  const [isSendBoqApprovalOpen, setIsSendBoqApprovalOpen] = useState(false);
  const [isBoqApprovalOpen, setIsBoqApprovalOpen] = useState(false);
  const [boqApprovalAction, setBoqApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [boqIndexToDelete, setBoqIndexToDelete] = useState<number | null>(null);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [editingQuotationIndex, setEditingQuotationIndex] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMarkAsLostOpen, setIsMarkAsLostOpen] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [activeQuotationIndex, setActiveQuotationIndex] = useState<number | null>(null);
  const [sendQuotationModalIndex, setSendQuotationModalIndex] = useState<number | null>(null);
  const [activeBoqIndex, setActiveBoqIndex] = useState(0);
  const [editingBoqIndex, setEditingBoqIndex] = useState<number | null>(null);
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);

  const handleDeleteDrawing = async () => {
    if (!drawingToDelete || !params.id) return;
    const drawingId = drawingToDelete._id || drawingToDelete.id || drawingToDelete.title || drawingToDelete.name;
    setIsDeletingDrawing(true);
    try {
      await interiorCrmService.deleteDrawing(params.id as string, drawingId);
      toast.success(tr("Drawing \"{{value}}\" deleted successfully.", { value: drawingToDelete.title || drawingToDelete.name || 'Drawing' }));
      setDrawingToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || tr("Failed to delete drawing"));
    } finally {
      setIsDeletingDrawing(false);
    }
  };

  const [approvingDrawingId, setApprovingDrawingId] = useState<string | null>(null);
  const [selectedDrawingForConfirmApprove, setSelectedDrawingForConfirmApprove] = useState<any | null>(null);
  const [isConfirmApproveModalOpen, setIsConfirmApproveModalOpen] = useState(false);

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
      toast.success(tr("Drawing \"{{value}}\" approved successfully! Live to client.", { value: file.title || file.name || 'Drawing' }));
      setIsConfirmApproveModalOpen(false);
      setSelectedDrawingForConfirmApprove(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || tr("Failed to approve drawing"));
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

  // 1. Lead Query with instant placeholder from CRM Leads List cache
  const {
    data: leadData,
    isLoading: isLeadQueryLoading,
    error: leadError,
    isFetching: isLeadFetching,
    refetch: refetchLead,
  } = useQuery({
    queryKey: ['crm-lead', params.id],
    queryFn: async ({ signal }) => {
      const res = await interiorCrmService.getCustomerById(params.id as string, signal);
      return res?.success && res?.data ? res.data : res;
    },
    placeholderData: () => {
      const listData: any = queryClient.getQueryData(['crm-leads-list']);
      const leads = listData?.leads || (Array.isArray(listData) ? listData : []);
      return leads.find((c: any) => (c._id || c.id) === params.id);
    },
    enabled: Boolean(checked && params.id),
    staleTime: 60 * 1000,
  });

  // 2. Activities Query
  const {
    data: activitiesData,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ['crm-lead-activities', params.id],
    queryFn: async ({ signal }) => {
      const res = await interiorCrmService.getActivities(params.id as string, signal);
      return res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];
    },
    enabled: Boolean(checked && params.id),
    staleTime: 60 * 1000,
  });

  // 3. Global Users Query (shared across entire CRM)
  const { data: usersData } = useQuery({
    queryKey: ['interior-users'],
    queryFn: async () => {
      const res = await interiorCrmService.getUsers();
      return res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];
    },
    enabled: Boolean(checked),
    staleTime: 30 * 60 * 1000,
  });

  const lead: any = leadData || null;
  const activities: any[] = (activitiesData as any[]) || [];
  const users: any[] = (usersData as any[]) || [];
  const isLoading = !lead && isLeadQueryLoading;

  // One refetch each (invalidating first as well fired every request twice)
  const fetchData = useCallback(async () => {
    await Promise.all([refetchLead(), refetchActivities()]);
  }, [refetchLead, refetchActivities]);

  // For the requirements 5s poll: lead only, and skipped while a fetch is still
  // running, so a slow connection doesn't stack up requests
  const pollLead = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ['crm-lead', params.id], exact: true }, { cancelRefetch: false });
  }, [queryClient, params.id]);

  // When the poll picks up the client's submission, refresh the timeline once
  const clientSubmittedStamp = lead?.clientRequirementsSubmittedAt || lead?.clientRequirements?.submittedAt || lead?.clientWishlist?.submittedAt || null;
  const lastSubmittedStamp = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!lead) return;
    if (lastSubmittedStamp.current !== undefined && clientSubmittedStamp && clientSubmittedStamp !== lastSubmittedStamp.current) {
      refetchActivities();
    }
    lastSubmittedStamp.current = clientSubmittedStamp;
  }, [Boolean(lead), clientSubmittedStamp, refetchActivities]);

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRemarks = activityForm.remarks.trim();
    if (!trimmedRemarks) return toast.error(tr("Please enter remarks/notes for the activity"));

    setIsSubmitting(true);
    try {
      await interiorCrmService.createActivity({
        ...activityForm,
        remarks: trimmedRemarks,
        customer: params.id
      });
      toast.success(tr("Activity logged successfully!"));
      setIsActivityModalOpen(false);
      setActivityForm({ type: 'Phone Call', status: 'Completed', remarks: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || tr("Failed to log activity"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuotationByIndex = async (idxToDelete: number) => {
    if (!lead || !params.id) return;
    const q = lead?.quotations?.[idxToDelete];
    const quoteTitle = q?.title || `Quotation ${idxToDelete + 1}`;
    const displayTitle = quoteTitle.length > 50 ? `${quoteTitle.slice(0, 50)}...` : quoteTitle;
    const quoteAmount = q?.grandTotal || 0;

    const ok = await confirm({
      title: tr("Delete Quotation"),
      message: tr("Are you sure you want to delete \"{{displayTitle}}\" ({{display}})? This action cannot be undone.", { displayTitle: displayTitle, display: formatSmartCurrency(quoteAmount, currencySymbol).display }),
      confirmText: tr("Delete Quotation"),
      type: 'danger',
    });
    if (!ok) return;

    try {
      const updatedQuotations = (lead.quotations || []).filter((_: any, i: number) => i !== idxToDelete);
      await interiorCrmService.updateCustomer(lead._id, {
        quotations: updatedQuotations,
      });

      await interiorCrmService.createActivity({
        customer: lead._id,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Deleted Quotation: ${quoteTitle}`,
      });

      toast.success(tr("{{quoteTitle}} deleted successfully.", { quoteTitle: quoteTitle }));
      fetchData();
      setActiveQuotationIndex((prev) => {
        if (prev === null) return null;
        if (prev === idxToDelete) return null;
        if (prev > idxToDelete) return prev - 1;
        if (prev >= updatedQuotations.length) {
          return updatedQuotations.length > 0 ? updatedQuotations.length - 1 : null;
        }
        return prev;
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || tr("Failed to delete quotation"));
    }
  };


  const [selectedTab, setActiveTab] = useState<'overview' | 'followups' | 'site' | 'requirements' | 'designs' | 'boq' | 'quotations' | 'confirm_order'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam) {
        const normalized = tabParam.toLowerCase().trim();
        if (['designs', 'design', 'drawing', 'drawings'].includes(normalized)) return 'designs';
        if (['site', 'sitevisit', 'site-visit'].includes(normalized)) return 'site';
        if (['requirements', 'req', 'requirement'].includes(normalized)) return 'requirements';
        if (['boq', 'estimation'].includes(normalized)) return 'boq';
        if (['quotations', 'quotes', 'quotation'].includes(normalized)) return 'quotations';
        if (['confirm_order', 'confirm-order', 'confirmorder', 'confirmed_order', 'order', 'orders', 'booking'].includes(normalized)) return 'confirm_order';
        if (['followups', 'followup', 'follow-up'].includes(normalized)) return 'followups';
      }
    }
    return 'overview';
  });
  // Each stage tab needs that stage's View permission (Overview is always shown)
  const LEAD_TAB_MODULE: Record<string, string> = {
    followups: 'crm_followups',
    site: 'crm_site_visits',
    requirements: 'crm_requirements',
    designs: 'crm_drawings',
    boq: 'crm_boq',
    quotations: 'crm_quotations',
    confirm_order: 'crm_quotations',
  };
  const canViewLeadTab = (id: string) => !LEAD_TAB_MODULE[id] || canDo(LEAD_TAB_MODULE[id], 'read');
  const activeTab = canViewLeadTab(selectedTab) ? selectedTab : 'overview';

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const normalized = tabParam.toLowerCase().trim();
      if (['designs', 'design', 'drawing', 'drawings'].includes(normalized)) {
        setActiveTab('designs');
      } else if (['site', 'sitevisit', 'site-visit'].includes(normalized)) {
        setActiveTab('site');
      } else if (['requirements', 'req', 'requirement'].includes(normalized)) {
        setActiveTab('requirements');
      } else if (['boq', 'estimation'].includes(normalized)) {
        setActiveTab('boq');
      } else if (['quotations', 'quotes', 'quotation'].includes(normalized)) {
        setActiveTab('quotations');
      } else if (['confirm_order', 'confirm-order', 'confirmorder', 'confirmed_order', 'order', 'orders', 'booking'].includes(normalized)) {
        setActiveTab('confirm_order');
      } else if (['followups', 'followup', 'follow-up'].includes(normalized)) {
        setActiveTab('followups');
      } else if (normalized === 'overview') {
        setActiveTab('overview');
      }
    }
  }, [searchParams]);

  // Cross-tab synchronization for requirements, drawings, and lead changes
  useEffect(() => {
    if (!params.id) return;

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('crm_requirement_channel');
        channel.onmessage = (event) => {
          const data = event.data;
          if (!data?.leadId || data.leadId === params.id) {
            fetchData();
          }
        };
      }
    } catch {}

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'crm_requirement_sync' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (!parsed.leadId || parsed.leadId === params.id) {
            fetchData();
          }
        } catch {
          fetchData();
        }
      }
    };

    const handleWindowFocus = () => {
      // If user switches back to this tab and is on requirements, refresh immediately
      if (activeTab === 'requirements') {
        fetchData();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      window.addEventListener('focus', handleWindowFocus);
    }

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('focus', handleWindowFocus);
      }
    };
  }, [params.id, activeTab]);

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

  const normalizedRequirements = React.useMemo(() => {
    if (!lead) return [];
    const raw = lead.requirements || (lead as any).requirementDetails || (lead as any).designRequirements;
    if (!raw) return [];

    // If already an array of room objects / names
    if (Array.isArray(raw)) {
      return raw.map((r: any, idx: number) => {
        if (typeof r === 'string') {
          return {
            roomName: r,
            interiorType: lead.propertyType || 'Residential',
          };
        }
        return {
          ...r,
          roomName: r.roomName || r.room || r.name || r.room_name || r.roomTitle || `Space ${idx + 1}`,
          interiorType: r.interiorType || r.type || lead.propertyType || 'Residential',
          designStyle: r.designStyle || r.style || r.theme || r.design_style || '',
          theme: r.theme || r.designStyle || r.style || '',
          description: r.description || r.notes || r.remarks || r.instructions || r.specialRequests || r.clientNotes || '',
          roomUsage: r.roomUsage || r.usage || r.purpose || '',
          furnitureRequirements: r.furnitureRequirements || r.furniture || r.furniture_requirements || r.furnitureSpecs || '',
          storage: r.storage || r.storageRequirements || r.wardrobes || '',
          electricalPoints: r.electricalPoints || r.electrical || r.power_points || r.powerPoints || '',
          lightingRequirements: r.lightingRequirements || r.lighting || r.lighting_requirements || r.lights || '',
          plumbingRequirements: r.plumbingRequirements || r.plumbing || r.plumbing_requirements || r.waterPoints || '',
          circulation: r.circulation || r.clearance || r.traffic_flow || '',
          colours: r.colours || r.colors || (Array.isArray(r.colorPalette) ? r.colorPalette.join(', ') : r.colorPalette) || r.palette || '',
          materials: (Array.isArray(r.materials) ? r.materials.join(', ') : r.materials) || r.materialSpecs || r.finishes || '',
          flooring: r.flooring || r.flooringType || r.floor || '',
          ceiling: r.ceiling || (typeof r.falseCeiling === 'boolean' ? (r.falseCeiling ? 'False Ceiling Required' : 'Standard Ceiling') : r.falseCeiling) || r.ceiling_type || '',
          wallFinishes: r.wallFinishes || r.walls || r.wall_finishes || r.wallDecor || '',
          furnitureStyle: r.furnitureStyle || r.furnishing_style || '',
          dimensions: r.dimensions || r.carpetArea || r.area || r.size || '',
          budget: r.budget || r.estimatedBudget || r.cost || '',
          timeline: r.timeline || r.duration || '',
          scopeOfWork: (Array.isArray(r.scopeOfWork) ? r.scopeOfWork.join(', ') : r.scopeOfWork) || r.scope || '',
          specialRequests: r.specialRequests || '',
        };
      });
    }

    // If raw is an Object (e.g. from crm-lead schema or key-value format)
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      const roomsList = raw.rooms || raw.items || raw.list || raw.spaces;
      if (Array.isArray(roomsList)) {
        if (roomsList.length > 0) {
          return roomsList.map((roomItem: any, idx: number) => {
            if (typeof roomItem === 'string') {
              return {
                roomName: roomItem,
                interiorType: raw.interiorType || lead.propertyType || 'Residential',
                designStyle: raw.style || raw.designStyle || '',
                theme: raw.theme || raw.style || '',
                description: raw.specialRequests || raw.notes || raw.description || '',
                materials: Array.isArray(raw.materials) ? raw.materials.join(', ') : raw.materials || '',
                timeline: raw.timeline || '',
                scopeOfWork: Array.isArray(raw.scopeOfWork) ? raw.scopeOfWork.join(', ') : raw.scopeOfWork || '',
                colours: raw.preferences?.colorPalette ? (Array.isArray(raw.preferences.colorPalette) ? raw.preferences.colorPalette.join(', ') : raw.preferences.colorPalette) : '',
                lightingRequirements: raw.preferences?.lightingType || '',
                flooring: raw.preferences?.flooringType || '',
                ceiling: typeof raw.preferences?.falseCeiling === 'boolean' ? (raw.preferences.falseCeiling ? 'False Ceiling Required' : 'Standard') : '',
              };
            }
            return {
              ...raw,
              ...roomItem,
              roomName: roomItem.roomName || roomItem.room || roomItem.name || `Space ${idx + 1}`,
            };
          });
        }
        return [];
      }

      // Check if the object actually has any real requirements content
      const hasMeaningfulContent = Boolean(
        raw.description ||
        raw.specialRequests ||
        raw.notes ||
        raw.roomName ||
        raw.scopeOfWork ||
        raw.timeline ||
        raw.style ||
        raw.designStyle ||
        (Array.isArray(raw.materials) && raw.materials.length > 0)
      );

      if (!hasMeaningfulContent) {
        return [];
      }

      // Single requirements object fallback only when actual content exists
      return [{
        roomName: raw.roomName || 'General Project Requirements',
        interiorType: raw.interiorType || lead.propertyType || 'Residential',
        designStyle: raw.style || raw.designStyle || '',
        theme: raw.theme || raw.style || '',
        description: raw.specialRequests || raw.notes || raw.description || '',
        materials: Array.isArray(raw.materials) ? raw.materials.join(', ') : raw.materials || '',
        timeline: raw.timeline || '',
        scopeOfWork: Array.isArray(raw.scopeOfWork) ? raw.scopeOfWork.join(', ') : raw.scopeOfWork || '',
        colours: raw.preferences?.colorPalette ? (Array.isArray(raw.preferences.colorPalette) ? raw.preferences.colorPalette.join(', ') : raw.preferences.colorPalette) : '',
        lightingRequirements: raw.preferences?.lightingType || '',
        flooring: raw.preferences?.flooringType || '',
        ceiling: typeof raw.preferences?.falseCeiling === 'boolean' ? (raw.preferences.falseCeiling ? 'False Ceiling Required' : 'Standard') : '',
        specialRequests: raw.specialRequests || '',
      }];
    }

    return [];
  }, [lead]);

  const normalizedClientRequirements = React.useMemo(() => {
    if (!lead) return [];
    const clientReq = lead.clientRequirements;
    if (!clientReq) return [];

    const roomsList = Array.isArray(clientReq)
      ? clientReq
      : Array.isArray(clientReq.rooms)
      ? clientReq.rooms
      : clientReq.items || clientReq.spaces || [];

    if (!Array.isArray(roomsList) || roomsList.length === 0) {
      if (typeof clientReq === 'object' && (clientReq.overallStyle || clientReq.generalNotes || clientReq.estimatedBudget)) {
        return [{
          roomName: 'General Client Wishlist',
          interiorType: lead.propertyType || 'Residential',
          designStyle: clientReq.overallStyle || '',
          theme: clientReq.overallStyle || '',
          description: clientReq.generalNotes || '',
          budget: clientReq.estimatedBudget || '',
          furnitureRequirements: '',
          storage: '',
          lightingRequirements: '',
          colours: '',
        }];
      }
      return [];
    }

    return roomsList.map((r: any, idx: number) => {
      if (typeof r === 'string') {
        return {
          roomName: r,
          interiorType: lead.propertyType || 'Residential',
          designStyle: clientReq.overallStyle || '',
          theme: clientReq.overallStyle || '',
          description: '',
          furnitureRequirements: '',
          storage: '',
          lightingRequirements: '',
          colours: '',
          budget: clientReq.estimatedBudget || '',
        };
      }
      return {
        ...r,
        roomName: (r.roomName || r.name || r.room || `Space ${idx + 1}`).trim(),
        interiorType: r.interiorType || r.type || lead.propertyType || 'Residential',
        designStyle: r.designStyle || r.style || clientReq.overallStyle || '',
        theme: r.theme || r.designStyle || r.style || clientReq.overallStyle || '',
        description: r.description || r.notes || r.remarks || '',
        roomUsage: r.roomUsage || r.usage || '',
        furnitureRequirements: r.furnitureRequirements || (Array.isArray(r.furniture) ? r.furniture.join(', ') : (r.furniture || '')),
        storage: r.storage || r.storageRequirements || '',
        electricalPoints: r.electricalPoints || r.electrical || '',
        lightingRequirements: r.lightingRequirements || r.lighting || '',
        plumbingRequirements: r.plumbingRequirements || r.plumbing || '',
        circulation: r.circulation || '',
        colours: r.colours || r.colors || '',
        materials: r.materials || '',
        flooring: r.flooring || '',
        ceiling: r.ceiling || '',
        wallFinishes: r.wallFinishes || '',
        furnitureStyle: r.furnitureStyle || '',
        dimensions: r.dimensions || '',
        budget: r.budget || clientReq.estimatedBudget || '',
      };
    });
  }, [lead]);

  const drawingInfo = React.useMemo(() => {
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
    const rawCategories: string[] = Array.from(new Set<string>((currentBoq?.items || []).map((it: any) => (it.category || 'General') as string)));
    const sections = currentBoq?.sections && Array.isArray(currentBoq.sections) && currentBoq.sections.length > 0
      ? currentBoq.sections
      : rawCategories.map((c: any) => ({ sectionTitle: String(c) }));
    const categoriesCount = sections.length;
    const categorySummary = `${categoriesCount} ${categoriesCount === 1 ? 'Category' : 'Categories'}`;

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
      categoriesCount,
      categorySummary,
      maxBudget,
      isOverBudget,
      budgetExcessAmount,
      budgetExcessPercentage,
    };
  }, [activities, lead, activeBoqIndex]);

  const quotationInfo = React.useMemo(() => {
    const currentQuote = (activeQuotationIndex !== null ? lead?.quotations?.[activeQuotationIndex] : null) || lead?.quotations?.[0];

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
  if (isLoading) {
    return (
      <InteriorShell>
        <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 pb-12 p-3 sm:p-4 md:p-6 overflow-x-hidden animate-pulse">
          {/* --- 1. HEADER SKELETON --- */}
          <div className="bg-[hsl(var(--card))] rounded-xl p-3 sm:p-4 border border-[hsl(var(--border))] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--muted))] shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-6 w-48 bg-[hsl(var(--muted))] rounded-md" />
                  <div className="h-4 w-16 bg-[hsl(var(--muted))] rounded" />
                  <div className="h-4 w-20 bg-[hsl(var(--muted))] rounded" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="h-4 w-28 bg-[hsl(var(--muted))] rounded" />
                  <div className="h-4 w-36 bg-[hsl(var(--muted))] rounded" />
                  <div className="h-4 w-40 bg-[hsl(var(--muted))] rounded" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[hsl(var(--border)/0.6)]">
              <div className="h-6 w-24 bg-[hsl(var(--muted))] rounded-full" />
              <div className="h-8 w-28 bg-[hsl(var(--muted))] rounded-lg" />
            </div>
          </div>

          {/* --- 2. TABS SKELETON --- */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-1 flex items-center gap-1 overflow-x-hidden">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-8 w-24 bg-[hsl(var(--muted))] rounded-lg shrink-0" />
            ))}
          </div>

          {/* --- 3. DASHBOARD CONTENT SKELETON --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main 2-column area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 space-y-2">
                    <div className="h-3 w-16 bg-[hsl(var(--muted))] rounded" />
                    <div className="h-6 w-20 bg-[hsl(var(--muted))] rounded" />
                  </div>
                ))}
              </div>

              {/* Stage / Progress Card */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-32 bg-[hsl(var(--muted))] rounded" />
                  <div className="h-4 w-20 bg-[hsl(var(--muted))] rounded" />
                </div>
                <div className="h-2 w-full bg-[hsl(var(--muted))] rounded-full" />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="h-12 bg-[hsl(var(--muted))] rounded-lg" />
                  <div className="h-12 bg-[hsl(var(--muted))] rounded-lg" />
                  <div className="h-12 bg-[hsl(var(--muted))] rounded-lg" />
                </div>
              </div>

              {/* Main Stage Panel (Drawings / Requirements / BOQ) */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-40 bg-[hsl(var(--muted))] rounded" />
                  <div className="h-8 w-24 bg-[hsl(var(--muted))] rounded-lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="h-36 bg-[hsl(var(--muted))] rounded-xl" />
                  <div className="h-36 bg-[hsl(var(--muted))] rounded-xl" />
                </div>
              </div>
            </div>

            {/* Right sidebar area */}
            <div className="space-y-4">
              {/* Lead Metadata Card */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 space-y-3">
                <div className="h-4 w-28 bg-[hsl(var(--muted))] rounded" />
                <div className="space-y-2.5 pt-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-[hsl(var(--border)/0.5)]">
                      <div className="h-3 w-20 bg-[hsl(var(--muted))] rounded" />
                      <div className="h-3 w-28 bg-[hsl(var(--muted))] rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Activities Card */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-[hsl(var(--muted))] rounded" />
                  <div className="h-4 w-12 bg-[hsl(var(--muted))] rounded" />
                </div>
                <div className="space-y-3 pt-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] shrink-0 mt-0.5" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-3/4 bg-[hsl(var(--muted))] rounded" />
                        <div className="h-2.5 w-1/2 bg-[hsl(var(--muted))] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </InteriorShell>
    );
  }
  if (!lead) {
    // Only a 404 means the lead is gone; a timeout or dropped connection gets a retry instead
    const status = (leadError as any)?.response?.status;
    const isMissing = status === 404 || (!leadError && !isLeadFetching);
    return (
      <InteriorShell>
        {isMissing ? (
          <div className="p-8 text-rose-500 font-bold text-center">{tr("Lead not found.")}</div>
        ) : (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <p className="font-bold text-[hsl(var(--foreground))]">
              {isLeadFetching ? tr("Still loading this lead…") : tr("Couldn't load this lead")}
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm">
              {status === 403
                ? tr("You don't have permission to view this lead.")
                : tr("The connection is slow or was interrupted. Your data is safe — try again.")}
            </p>
            {status !== 403 && (
              <button
                type="button"
                onClick={() => refetchLead()}
                disabled={isLeadFetching}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
              >
                {isLeadFetching ? tr("Retrying…") : tr("Retry")}
              </button>
            )}
          </div>
        )}
      </InteriorShell>
    );
  }

  const handleConfirmDeleteLead = async () => {
    if (!lead) return;
    setIsDeletingLead(true);
    try {
      await interiorCrmService.deleteCustomer(lead._id);
      toast.success(tr("Lead deleted successfully"));
      router.push('/interior-new/crm');
    } catch (error: any) {
      toast.error(tr("Failed to delete lead"));
    } finally {
      setIsDeletingLead(false);
    }
  };

  const STAGE_ORDER: Record<string, number> = {
    'New Lead': 0,
    'Contacted': 0,
    'Meeting Scheduled': 0,
    'Under Requirement': 1,
    'Requirement Completed': 1,
    'Under Site Visit': 2,
    'Measurement Done': 2,
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
  const hasPassedToSiteVisit = (STAGE_ORDER[lead?.status || ''] ?? 0) >= 2 ||
    Boolean(lead?.siteMeasurements) ||
    Boolean(lead?.sitePhotos && lead.sitePhotos.length > 0) ||
    activities.some((a) => a.type === 'Site Visit') ||
    Boolean(lead?.designFiles && lead.designFiles.length > 0) ||
    Boolean(lead?.boqs && lead.boqs.length > 0) ||
    Boolean(lead?.quotations && lead.quotations.length > 0) ||
    Boolean(lead?.linkedProject);

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
      case 'requirements': {
        const isUnlocked = currentStage >= 1 || normalizedRequirements.length > 0;
        return { isLocked: !isUnlocked, requiredStage: 'Under Requirement', stageTitle: 'Requirements' };
      }
      case 'site': {
        const isUnlocked = currentStage >= 2 || !!lead?.siteMeasurements || (lead?.sitePhotos && lead.sitePhotos.length > 0);
        return { isLocked: !isUnlocked, requiredStage: 'Under Site Visit', stageTitle: 'Site Visit' };
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
      case 'confirm_order': {
        const hasAcceptedQuote = Boolean(lead?.quotations && lead.quotations.some((q: any) => q.status === 'Accepted' || q.status === 'Approved'));
        const isUnlocked = currentStage >= 5 || hasAcceptedQuote || isConverted || (lead?.quotations && lead.quotations.length > 0);
        return { isLocked: !isUnlocked, requiredStage: 'Quotation Approved', stageTitle: 'Confirm Order' };
      }
      default:
        return { isLocked: false, requiredStage: '', stageTitle: '' };
    }
  };

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'followups', label: 'Follow-ups' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'site', label: 'Site Visits' },
    { id: 'designs', label: '2D/3D Drawing' },
    { id: 'boq', label: 'BOQ' },
    { id: 'quotations', label: 'Quotations' },
    { id: 'confirm_order', label: 'Confirm Order' },
  ];

  return (
    <InteriorShell>
      <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 pb-12 p-3 sm:p-4 md:p-6 overflow-x-hidden">
        
        {/* --- 1. SENIOR COMMAND HEADER --- */}
        <div className="bg-[hsl(var(--card))] rounded-xl p-3 sm:p-4 border border-[hsl(var(--border))] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0 max-w-full">
            <button 
              onClick={() => router.push('/interior-new/crm')}
              className="p-2 bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] rounded-lg transition-all shrink-0 active:scale-95 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              title={tr("Back to CRM Leads")}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col gap-1 min-w-0 max-w-full">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h1 
                  className="text-base sm:text-lg md:text-xl font-black text-[hsl(var(--foreground))] tracking-tight truncate max-w-[12.5rem] xs:max-w-[17.5rem] sm:max-w-[26.25rem]"
                  title={lead.name}
                >
                  {tr(lead.name)}
                </h1>
                <span className="font-mono bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded text-[0.625rem] sm:text-[0.6875rem] font-bold border border-[hsl(var(--border))] shrink-0">
                  {lead.leadNumber || tr("LD-XXXX")}
                </span>
                {lead.leadSource && (
                  <span className="text-[0.625rem] font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded border border-[hsl(var(--border))] shrink-0">
                    {tr(lead.leadSource)}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[0.6875rem] sm:text-xs">
                <a 
                  href={`tel:${lead.mobileNumber}`} 
                  className="inline-flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded border border-[hsl(var(--border))] transition-colors shrink-0"
                >
                  <Phone size={11} className="text-blue-500 shrink-0" /> {tr(lead.mobileNumber)}
                </a>
                {lead.email && (
                  <a 
                    href={`mailto:${lead.email}`} 
                    title={lead.email}
                    className="inline-flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded border border-[hsl(var(--border))] transition-colors min-w-0 max-w-[11.25rem] sm:max-w-[15rem] overflow-hidden"
                  >
                    <Mail size={11} className="text-purple-500 shrink-0" />
                    <span className="truncate min-w-0 flex-1">{lead.email}</span>
                  </a>
                )}
                {(lead.projectLocation || lead.city) && (
                  <div 
                    title={tr("Site Location: {{value}}", { value: lead.projectLocation || lead.city })}
                    onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                    className="inline-flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded border border-[hsl(var(--border))] min-w-0 max-w-[13.75rem] xs:max-w-[18.75rem] sm:max-w-[26.25rem] transition-colors group cursor-pointer"
                  >
                    <MapPin size={11} className="text-amber-500 shrink-0" />
                    <span className="truncate">
                      {lead.projectLocation || lead.city}
                    </span>
                    <span title={tr("Copy Address")} className="opacity-60 group-hover:opacity-100 transition-opacity ms-0.5 shrink-0">
                      {copiedLocation ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[hsl(var(--border)/0.6)] justify-start md:justify-end">
            {(() => {
              const latestQuote = lead.quotations?.[lead.quotations.length - 1];
              let displayStatus = lead.status;
              let badgeColor = "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))]";

              if (lead.status === 'Converted' || lead.status === 'Won' || isConverted) {
                displayStatus = 'Converted';
                badgeColor = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
              } else if (latestQuote?.status === 'Accepted') {
                displayStatus = 'Quotation Approved';
                badgeColor = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
              } else if (latestQuote?.status === 'Rejected') {
                displayStatus = 'Quotation Rejected';
                badgeColor = 'bg-rose-500/15 text-rose-600 border-rose-500/30';
              } else if (lead.status === 'Lost') {
                displayStatus = 'Lost';
                badgeColor = 'bg-rose-500/15 text-rose-600 border-rose-500/30';
              } else if (lead.status === 'New Lead') {
                displayStatus = 'New Lead';
                badgeColor = 'bg-blue-500/15 text-blue-600 border-blue-500/30';
              } else if (lead.status === 'Contacted') {
                displayStatus = 'Contacted';
                badgeColor = 'bg-amber-500/15 text-amber-600 border-amber-500/30';
              } else if (['Meeting Scheduled', 'Under Site Visit', 'Measurement Done'].includes(lead.status)) {
                displayStatus = lead.status;
                badgeColor = 'bg-purple-500/15 text-purple-600 border-purple-500/30';
              } else if (['Under Requirement', 'Requirement Completed'].includes(lead.status)) {
                displayStatus = lead.status;
                badgeColor = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
              } else if (['Under Drawing', 'Design Approved'].includes(lead.status)) {
                displayStatus = lead.status;
                badgeColor = 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30';
              } else if (lead.status === 'Under BOQ Creation') {
                displayStatus = 'Under BOQ Creation';
                badgeColor = 'bg-teal-500/15 text-teal-600 border-teal-500/30';
              } else if (['Under Quotation', 'Quotation Pending', 'Quotation Sent', 'Negotiation', 'Booking Pending'].includes(lead.status)) {
                if (latestQuote?.status === 'Accepted' || lead.status === 'Booking Pending') {
                  displayStatus = 'Quotation Approved';
                  badgeColor = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
                } else if (latestQuote?.status === 'Rejected') {
                  displayStatus = 'Quotation Rejected';
                  badgeColor = 'bg-rose-500/15 text-rose-600 border-rose-500/30';
                } else {
                  displayStatus = 'Under Quotation';
                  badgeColor = 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30';
                }
              }

              return (
                <span className={cn("text-[0.6875rem] font-bold px-2.5 py-1 rounded-lg border shrink-0", badgeColor)}>
                  {tr(displayStatus)}
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
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  title={tr("Open Live Project Workspace")}
                >
                  <ExternalLink size={12} />{tr(" View Live Project")}
                </button>
              )
            ) : isLost ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-bold">
                  <Lock size={12} />{tr(" Lead Lost")}
                </span>
                {(canDo('crm_leads', 'delete')) && (
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg transition-all active:scale-95"
                    title={tr("Delete Lead")}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ) : (
              <>
                {['Under Quotation', 'Quotation Pending', 'Quotation Sent', 'Negotiation', 'Booking Pending'].includes(lead.status) && (
                  ((lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted' || q.status === 'Approved')) || lead.status === 'Booking Pending') && (
                    (canDo('crm_quotations', 'approve')) && (
                      <button
                        onClick={() => setIsConvertToProjectOpen(true)}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                        title={tr("Convert to Won Project")}
                      >
                        <CheckCircle2 size={12} />{tr(" Convert to Project")}
                      </button>
                    )
                  )
                )}

                {['New Lead', 'Contacted'].includes(lead.status) &&
                  !hasFollowUp &&
                  !lead.siteMeasurements &&
                  (!lead.quotations || lead.quotations.length === 0) && (
                    (canDo('crm_followups', 'create')) && (
                      <button
                        onClick={() => setIsFollowUpModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white"
                        title={tr("Schedule Initial Follow-up")}
                      >
                        <Calendar size={12} />{tr(" Follow-up")}
                      </button>
                    )
                  )}

                {(canDo('crm_leads', 'update') || canDo('crm_followups', 'update') || canDo('crm_site_visits', 'update') || canDo('crm_requirements', 'update') || canDo('crm_drawings', 'update') || canDo('crm_boq', 'update') || canDo('crm_quotations', 'update')) && (
                  <button
                    onClick={() => setIsMarkAsLostOpen(true)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg transition-all active:scale-95"
                    title={tr("Mark Lead as Lost")}
                  >
                    <X size={14} />
                  </button>
                )}

                {(canDo('crm_leads', 'update')) && (
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-all active:scale-95"
                    title={tr("Edit Lead Details")}
                  >
                    <Pencil size={14} />
                  </button>
                )}

                {(canDo('crm_leads', 'delete')) && (
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg transition-all active:scale-95"
                    title={tr("Delete Lead")}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* --- 2B. STATUS BANNERS --- */}
        {isConverted && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600">
                <Lock size={15} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">{tr("Lead Converted to Live Execution Project")}</h3>
                <p className="text-[0.6875rem] text-[hsl(var(--muted-foreground))]">{tr("This lead is linked to an active project and is preserved in read-only mode.")}</p>
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shrink-0 active:scale-95"
              >
                {tr("Open Project ")}<ExternalLink size={12} />
              </button>
            )}
          </div>
        )}

        {isLost && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-rose-800 dark:text-rose-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <Lock size={15} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">{tr("Lead Marked as Lost (Locked & Read-Only)")}</h3>
                  {lead.lostReason && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[0.625rem] font-bold border border-rose-500/20">
                      {tr("Reason: ")}{tr(lead.lostReason)}
                    </span>
                  )}
                </div>
                <p className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] mt-0.5">
                  {lead.remarks ? `"${lead.remarks}" — ` : ''}{tr("Preserved in read-only mode.")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. HIGH DENSITY TAB NAVIGATION --- */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none touch-pan-x">
          {TABS.filter((tab) => canViewLeadTab(tab.id)).map((tab) => {
            const { isLocked } = getTabLockState(tab.id);
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', tab.id);
                    window.history.replaceState(null, '', url.toString());
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap outline-none flex items-center gap-1.5 cursor-pointer shrink-0",
                  isActive
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    : isLocked
                    ? "text-[hsl(var(--muted-foreground)/0.5)] hover:text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.4)]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]"
                )}
              >
                <span>{tr(tab.label)}</span>
                {isLocked && (
                  <Lock size={11} className="opacity-60 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* --- 4. TAB CONTENT PANELS --- */}
        <AnimatePresence mode="wait">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-3.5 sm:space-y-4">
              
              {/* Metric Summary Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="bg-[hsl(var(--card))] p-3 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0"><User size={15} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">{tr("Client Source")}</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-xs truncate mt-0.5">{lead.leadSource || tr("Manual Entry")}</p>
                  </div>
                </div>
                <div className="bg-[hsl(var(--card))] p-3 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><Building size={15} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">{tr("Property Scope")}</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-xs truncate mt-0.5">{lead.propertyType || tr("Standard")}</p>
                  </div>
                </div>
                <div className="bg-[hsl(var(--card))] p-3 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0"><Banknote size={15} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">{tr("Est. Budget")}</p>
                    <p className="font-bold text-xs truncate mt-0.5 text-emerald-600 dark:text-emerald-400">
                      {lead.quotations?.[lead.quotations.length - 1]?.grandTotal
                        ? `${currencySymbol} ${lead.quotations[lead.quotations.length - 1].grandTotal.toLocaleString()}`
                        : lead.budgetRange || tr("Pending")}
                    </p>
                  </div>
                </div>
                <div 
                  className="bg-[hsl(var(--card))] p-3 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5 group cursor-pointer hover:border-amber-500/40 transition-all"
                  title={tr("Site Location: {{value}}", { value: lead.projectLocation || lead.city || 'Not specified' })}
                  onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                >
                  <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0"><MapPin size={15} /></span>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">{tr("Location")}</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-xs truncate mt-0.5">{lead.projectLocation || lead.city || tr("Not specified")}</p>
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-opacity shrink-0">
                    {copiedLocation ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </span>
                </div>
              </div>

              {/* Main 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
                
                {/* Left Column: Location & Client Specs (5 cols) */}
                <div className="lg:col-span-5 space-y-3.5">
                  {/* Dedicated Site Location Card */}
                  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                          <MapPin size={14} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">{tr("Site & Project Location")}</h3>
                        </div>
                      </div>
                      {!isReadOnly && (
                        (canDo('crm_leads', 'update')) && (
                          <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="text-[0.6875rem] font-bold text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                            title={tr("Edit Location & Lead Details")}
                          >
                            <Pencil size={11} />{tr(" Edit")}
                          </button>
                        )
                      )}
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] rounded-lg p-3 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-0.5">
                            {tr("Full Site Address")}
                          </p>
                          <p className="text-xs font-semibold text-[hsl(var(--foreground))] leading-relaxed break-words">
                            {lead.projectLocation || lead.city || tr("No specific site address provided yet.")}
                          </p>
                        </div>
                      </div>

                      {(lead.projectLocation || lead.city) && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[hsl(var(--border))]">
                          <button
                            type="button"
                            onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[0.6875rem] font-bold text-[hsl(var(--foreground))] transition-all active:scale-95"
                          >
                            {copiedLocation ? (
                              <>
                                <Check size={11} className="text-emerald-500" />{tr(" Copied Address")}
                              </>
                            ) : (
                              <>
                                <Copy size={11} className="text-[hsl(var(--muted-foreground))]" />{tr(" Copy Address")}
                              </>
                            )}
                          </button>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.projectLocation || lead.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-[0.6875rem] font-bold text-blue-600 transition-all active:scale-95"
                          >
                            <ExternalLink size={11} />{tr(" Open in Maps")}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client & Scope Details Card */}
                  <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                          <User size={14} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">{tr("Lead & Contact Info")}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                          <User size={12} className="text-blue-500" />{tr(" Full Name")}
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] break-words min-w-0">{tr(lead.name)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                          <Phone size={12} className="text-emerald-500" />{tr(" Mobile")}
                        </span>
                        <a href={`tel:${lead.mobileNumber}`} className="font-bold text-blue-600 hover:underline break-all min-w-0">
                          {tr(lead.mobileNumber)}
                        </a>
                      </div>

                      {lead.email && (
                        <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                          <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                            <Mail size={12} className="text-purple-500" />{tr(" Email")}
                          </span>
                          <a href={`mailto:${lead.email}`} className="font-bold text-blue-600 hover:underline break-all min-w-0">
                            {lead.email}
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                          <Building size={12} className="text-indigo-500" />{tr(" Property Type")}
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] break-words min-w-0">{lead.propertyType || tr("Standard")}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                          <Banknote size={12} className="text-amber-500" />{tr(" Budget / Quote")}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 break-words min-w-0">
                          {lead.quotations?.[lead.quotations.length - 1]?.grandTotal
                            ? `${currencySymbol} ${lead.quotations[lead.quotations.length - 1].grandTotal.toLocaleString()}`
                            : lead.budgetRange || tr("Pending")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Activity Timeline (7 cols) */}
                <div className="lg:col-span-7 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-[hsl(var(--border))]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />{tr(" Activity Timeline")}
                    </h3>
                    {!isReadOnly && (
                      (canDo('crm_followups', 'create')) && (
                        <button
                          onClick={() => setIsActivityModalOpen(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                        >
                          <Plus size={12} />{tr(" Log Note")}
                        </button>
                      )
                    )}
                  </div>
                  
                  <ScrollPane>
                  <div className="relative border-s-2 border-[hsl(var(--border))] ms-2 ps-3 sm:ps-4 space-y-3 sm:space-y-3.5">
                    {activities.length === 0 ? (
                      <div className="py-8 flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] mb-2">
                          <MessageSquare size={18} />
                        </div>
                        <p className="text-xs font-bold text-[hsl(var(--foreground))]">{tr("No activities logged")}</p>
                        <p className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] mt-0.5">{tr("Keep track of calls, meetings, and notes here.")}</p>
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
                              "absolute -left-[1.05rem] sm:-left-[1.35rem] top-1.5 w-3 h-3 rounded-full border-2 border-[hsl(var(--card))] flex items-center justify-center",
                              act.status === 'Pending' ? (isActOverdue ? "bg-rose-500" : "bg-amber-400") : "bg-blue-500"
                            )}></div>
                            
                            <div className={cn(
                              "border rounded-xl p-3 transition-colors min-w-0 overflow-hidden",
                              isActOverdue 
                                ? "bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/30" 
                                : "bg-[hsl(var(--muted)/0.35)] hover:bg-[hsl(var(--muted)/0.5)] border-[hsl(var(--border))]"
                            )}>
                              <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                                <span className={cn(
                                  "text-[0.5625rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                                  isActOverdue
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black"
                                    : act.status === 'Pending'
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                )}>
                                  {tr(act.type)} {act.status === 'Pending' && (isActOverdue ? tr("• Overdue") : tr("• Scheduled"))}
                                </span>
                                <span className={cn(
                                  "text-[0.625rem] font-semibold",
                                  isActOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[hsl(var(--muted-foreground))]"
                                )}>
                                  {act.status === 'Pending' 
                                    ? `${isActOverdue ? 'Overdue: ' : 'Due: '}${new Date(act.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` 
                                    : new Date(act.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                                  }
                                </span>
                              </div>
                              <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed break-words whitespace-pre-wrap">{tr(act.remarks)}</p>
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[hsl(var(--border))]">
                                <div className="w-4 h-4 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[0.5rem] font-bold text-[hsl(var(--muted-foreground))] shrink-0">
                                  {tr(initial)}
                                </div>
                                <p className="text-[0.625rem] font-medium text-[hsl(var(--muted-foreground))] truncate">
                                  {act.status === 'Pending' ? tr("Scheduled by") : tr("Logged by")} <span className="text-[hsl(var(--foreground))] font-semibold">{tr(userName)}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  </ScrollPane>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: FOLLOW-UPS */}
          {activeTab === 'followups' && (
            <motion.div
              key="followups"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <InteriorLeadFollowUpsTab
                lead={lead}
                activities={activities}
                users={users}
                onRefresh={fetchData}
                onScheduleFollowUp={() => setIsFollowUpModalOpen(true)}
                onLogActivity={() => setIsActivityModalOpen(true)}
                onSendToSiteVisit={() => setIsSendToReqOpen(true)}
                onSendToRequirements={() => setIsSendToReqOpen(true)}
                isConverted={isReadOnly}
              />
            </motion.div>
          )}

          {/* TAB: SITE VISITS */}
          {activeTab === 'site' && (
            <motion.div key="site" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-3.5 sm:space-y-4">
              {getTabLockState('site').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 mb-3 border border-amber-500/20">
                    <Lock size={22} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[0.625rem] font-bold uppercase tracking-wider mb-2">
                    {tr("Phase Locked")}
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{tr("Site Visit Stage is Locked")}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    {tr("Complete the Requirements phase first to unlock site visit and measurement logging.")}
                  </p>
                  {/* Bring the lead into this stage from here — no need for the previous stage's tab */}
                  {!isReadOnly && (canDo('crm_site_visits', 'create') || canDo('crm_site_visits', 'update') || canDo('crm_requirements', 'update') || canDo('crm_leads', 'update')) && (
                    <button
                      onClick={() => setIsSendToSiteVisitOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 active:scale-95 transition-all"
                    >
                      {tr("Send to Site Visit ")}<ArrowRight size={12} />
                    </button>
                  )}
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
                  <div className="space-y-3.5 sm:space-y-4">
                    {/* Site Visit Overdue Warning Banner */}
                    {isSiteVisitOverdue && (
                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                            <AlertTriangle size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-rose-950 dark:text-rose-100">
                                {tr("Site Visit Schedule Overdue")}
                              </h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[0.625rem] font-bold uppercase tracking-wider">
                                <Clock size={10} />
                                {getSiteVisitOverdueText(siteVisitInfo.scheduledDate)}
                              </span>
                            </div>
                            <p className="text-[0.6875rem] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                              {tr("Scheduled for")}{' '}
                              <strong>
                                {new Date(siteVisitInfo.scheduledDate).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </strong>{' '}
                              {tr("has passed without survey measurements recorded.")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          {hasRescheduledSiteVisits && (
                            <button
                              type="button"
                              onClick={() => setIsSiteVisitHistoryOpen(true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              <History size={12} />{tr(" History (")}{siteVisitActivities.length})
                            </button>
                          )}
                          {!isReadOnly && (
                            (canDo('crm_leads', 'update') || canDo('crm_followups', 'update') || canDo('crm_site_visits', 'update') || canDo('crm_site_visits', 'create')) && (
                              <button
                                onClick={() => setIsSendToSiteVisitOpen(true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                              >
                                <Calendar size={12} />{tr(" Reschedule Visit")}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Primary Briefing Card */}
                    <div className={cn(
                      "bg-[hsl(var(--card))] border rounded-xl p-3.5 sm:p-4 space-y-3 transition-colors",
                      isSiteVisitOverdue ? "border-rose-500/30" : "border-[hsl(var(--border))]"
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            isSiteVisitOverdue
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                              : "bg-purple-500/10 border-purple-500/20 text-purple-600"
                          )}>
                            <MapPin size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                                {tr("Site Visit Briefing & Details")}
                              </h2>
                              <span className={cn(
                                "text-[0.625rem] font-bold px-2 py-0.5 rounded border shrink-0",
                                lead.siteMeasurements
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : isSiteVisitOverdue
                                  ? "bg-rose-500/15 text-rose-600 border-rose-500/30 font-black"
                                  : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                              )}>
                                {lead.siteMeasurements ? tr("Survey Completed") : isSiteVisitOverdue ? tr("Survey Overdue") : tr("Survey Pending")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasRescheduledSiteVisits && (
                            <button
                              type="button"
                              onClick={() => setIsSiteVisitHistoryOpen(true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              <History size={12} className="text-purple-600" />{tr(" History (")}{siteVisitActivities.length})
                            </button>
                          )}

                          {!isReadOnly && (
                            <>
                              {lead.siteMeasurements ? (
                                <>
                                  {(canDo('crm_site_visits', 'update')) && (
                                    <button
                                      onClick={() => setIsSiteVisitModalOpen(true)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                      <Pencil size={12} />{tr(" Edit Measurements")}
                                    </button>
                                  )}
                                  {['Under Site Visit', 'Measurement Done'].includes(lead.status) && (
                                    (canDo('crm_site_visits', 'update') || canDo('crm_drawings', 'update') || canDo('crm_drawings', 'create') || canDo('crm_requirements', 'update')) && (
                                      <button
                                        onClick={() => setIsSendToDrawingOpen(true)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                      >
                                        {tr("Pass to 2D/3D Drawing ")}<ArrowRight size={12} />
                                      </button>
                                    )
                                  )}
                                </>
                              ) : (
                                <>
                                  {(canDo('crm_leads', 'update') || canDo('crm_followups', 'update') || canDo('crm_site_visits', 'update') || canDo('crm_site_visits', 'create')) && (
                                    <button
                                      onClick={() => setIsSendToSiteVisitOpen(true)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                      <Calendar size={12} />{tr(" Reschedule")}
                                    </button>
                                  )}
                                  {(canDo('crm_site_visits', 'update')) && (
                                    <button
                                      onClick={() => setIsSiteVisitModalOpen(true)}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                      <Plus size={13} />{tr(" Log Measurements")}
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Instructions Note Box */}
                      <div className="bg-purple-500/[0.04] border border-purple-500/20 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[0.625rem] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <MessageSquare size={12} className="text-purple-600" />
                            {tr("Site Visit Instructions")}
                          </p>
                          {siteVisitInfo.activity?.createdAt && (
                            <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                              {tr("Added ")}{new Date(siteVisitInfo.activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-[hsl(var(--card))] p-2.5 rounded border border-purple-500/15">
                          {siteVisitInfo.note || tr("Lead passed to Site Visit and assigned to site team.")}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[0.625rem] text-[hsl(var(--muted-foreground))] font-medium">
                          <span>{tr("Assigned Member: ")}<strong className="text-[hsl(var(--foreground))]">{tr(siteVisitInfo.assignedName)}</strong></span>
                          {siteVisitInfo.activity?.user && (
                            <span>{tr("Scheduled By: ")}<strong className="text-[hsl(var(--foreground))]">{tr(siteVisitInfo.schedulerName)}</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Key Metadata Badges */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className={cn(
                          "rounded-lg p-2.5 border",
                          isSiteVisitOverdue ? "bg-rose-500/10 border-rose-500/30" : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
                        )}>
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} className={isSiteVisitOverdue ? "text-rose-500" : "text-purple-500"} />{tr(" Schedule")}
                          </p>
                          <p className={cn("font-bold text-xs mt-0.5 truncate", isSiteVisitOverdue ? "text-rose-600 font-extrabold" : "text-[hsl(var(--foreground))]")}>
                            {siteVisitInfo.scheduledDate
                              ? new Date(siteVisitInfo.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : tr("Not scheduled")}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <User size={11} className="text-blue-500" />{tr(" Assigned Member")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {tr(siteVisitInfo.assignedName)}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-emerald-500" />{tr(" Property Scope")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.propertyType || tr("Residential")}
                          </p>
                        </div>

                        <div 
                          className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))] group cursor-pointer hover:border-amber-500/40 transition-all"
                          onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={11} className="text-amber-500" />{tr(" Site Location")}
                            </p>
                            <span className="text-[0.625rem] opacity-0 group-hover:opacity-100 transition-opacity">
                              {copiedLocation ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.projectLocation || lead.city || tr("Pending")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Measurements Section */}
                    {!lead.siteMeasurements ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 text-center flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600">
                          <Ruler size={24} />
                        </div>
                        <div className="max-w-md space-y-0.5">
                          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
                            {tr("Ready for On-Site Survey & Measurements")}
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            {tr("Capture room dimensions, ceiling heights, door/window openings, MEP points, and site photos.")}
                          </p>
                        </div>
                        {!isReadOnly && (
                          (canDo('crm_site_visits', 'update')) && (
                            <button 
                              onClick={() => setIsSiteVisitModalOpen(true)} 
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={14} />{tr(" Log Site Visit & Measurements")}
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Site survey — numbered accordion, every section fits on one screen */}
                        {(() => {
                          const sm: any = lead.siteMeasurements;
                          const recorded = (...v: any[]) => v.filter(Boolean).length;
                          const sections = ['spatial', 'openings', 'mep', 'constraints', 'photos'];
                          const allOpen = sections.every((k) => siteOpen.has(k));
                          const toggle = (k: string) =>
                            setSiteOpen((prev) => {
                              const next = new Set(prev);
                              if (next.has(k)) next.delete(k);
                              else next.add(k);
                              return next;
                            });
                          return (
                            <div className="space-y-2">
                              <AccordionToolbar
                                title={tr("Site Survey")}
                                count={sections.length}
                                allOpen={allOpen}
                                onToggleAll={() => setSiteOpen(allOpen ? new Set() : new Set(sections))}
                              />
                              <AccordionCard
                                index={1}
                                icon={<Maximize2 size={14} className="text-purple-500" />}
                                title={tr("Spatial Dimensions")}
                                summary={[
                                  sm.carpetArea && `${sm.carpetArea} ${tr("Sq.Ft")}`,
                                  sm.ceilingHeight && `${tr("Ceiling Height")} ${sm.ceilingHeight} ${tr("Ft")}`,
                                ].filter(Boolean).join(' · ') || tr("Not recorded")}
                                open={siteOpen.has('spatial')}
                                onToggle={() => toggle('spatial')}
                              >
                            <div className="grid grid-cols-2 gap-2 text-xs min-w-0">
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2.5 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Carpet Area")}</p>
                                <p className="font-bold text-sm text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">
                                  {lead.siteMeasurements.carpetArea || '—'} <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))] font-normal">{tr("Sq.Ft")}</span>
                                </p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2.5 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Ceiling Height")}</p>
                                <p className="font-bold text-sm text-[hsl(var(--foreground))] mt-0.5 break-words [overflow-wrap:anywhere]">
                                  {lead.siteMeasurements.ceilingHeight || '—'} <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))] font-normal">{tr("Ft")}</span>
                                </p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2.5 border border-[hsl(var(--border))] col-span-2 min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Room Dimensions")}</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                  {lead.siteMeasurements.roomDimensions || tr("Not recorded")}
                                </p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2.5 border border-[hsl(var(--border))] col-span-2 min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Rooms to Design")}</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                  {lead.siteMeasurements.rooms || tr("Not specified")}
                                </p>
                              </div>
                            </div>
                              </AccordionCard>
                              <AccordionCard
                                index={2}
                                icon={<DoorOpen size={14} className="text-blue-500" />}
                                title={tr("Openings & Structure")}
                                summary={tr("{{count}}/3 recorded", { count: recorded(sm.doorDimensions, sm.windowDimensions, sm.columnBeamDimensions || sm.wallThickness) })}
                                open={siteOpen.has('openings')}
                                onToggle={() => toggle('openings')}
                              >
                            <div className="grid grid-cols-1 gap-2 text-xs min-w-0">
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Door Dimensions")}</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.doorDimensions || tr("Not recorded")}</p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Window Dimensions")}</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.windowDimensions || tr("Not recorded")}</p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Wall / Column Dimensions")}</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.columnBeamDimensions || lead.siteMeasurements.wallThickness || tr("Not recorded")}</p>
                              </div>
                            </div>
                              </AccordionCard>
                              <AccordionCard
                                index={3}
                                icon={<Zap size={14} className="text-amber-500" />}
                                title={tr("MEP & Utility Services")}
                                summary={tr("{{count}}/3 recorded", { count: recorded(sm.electricalPoints, sm.plumbingPoints, sm.acLocations) })}
                                open={siteOpen.has('mep')}
                                onToggle={() => toggle('mep')}
                              >
                            <div className="grid grid-cols-1 gap-2 text-xs min-w-0">
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1"><Zap size={10} />{tr(" Electrical Points")}</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.electricalPoints || tr("None recorded")}</p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-1"><Droplets size={10} />{tr(" Plumbing Points")}</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.plumbingPoints || tr("None recorded")}</p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1"><Wind size={10} />{tr(" AC Locations")}</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.acLocations || tr("None recorded")}</p>
                              </div>
                            </div>
                              </AccordionCard>
                              <AccordionCard
                                index={4}
                                icon={<Armchair size={14} className="text-emerald-500" />}
                                title={tr("Furniture & Constraints")}
                                summary={sm.siteConstraints ? tr("Site constraints reported") : tr("{{count}}/3 recorded", { count: recorded(sm.furnitureDimensions, sm.siteConstraints, sm.notes) })}
                                open={siteOpen.has('constraints')}
                                onToggle={() => toggle('constraints')}
                              >
                            <div className="grid grid-cols-1 gap-2 text-xs min-w-0">
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))] min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-emerald-600 uppercase tracking-wider">{tr("Existing Furniture")}</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.furnitureDimensions || tr("None recorded")}</p>
                              </div>
                              <div className="bg-rose-500/5 rounded-lg p-2 border border-rose-500/20 min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-rose-500 uppercase tracking-wider">{tr("Site Constraints")}</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.siteConstraints || tr("None reported")}</p>
                              </div>
                              <div className="bg-purple-500/5 rounded-lg p-2 border border-purple-500/20 min-w-0 overflow-hidden">
                                <p className="text-[0.625rem] font-bold text-purple-600 uppercase tracking-wider">{tr("Additional Site Notes")}</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{lead.siteMeasurements.notes || tr("No notes added")}</p>
                              </div>
                            </div>
                              </AccordionCard>
                              <AccordionCard
                                index={5}
                                icon={<ImageIcon size={14} className="text-emerald-500" />}
                                title={tr("Site Photos & Visual Records")}
                                summary={`${lead.sitePhotos?.length || 0}${tr(" Photos")}`}
                                open={siteOpen.has('photos')}
                                onToggle={() => toggle('photos')}
                              >
                          {lead.sitePhotos && lead.sitePhotos.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                              {lead.sitePhotos.map((photo: string, i: number) => (
                                <a
                                  key={i}
                                  href={photo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="aspect-square rounded-lg overflow-hidden border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-all relative group bg-[hsl(var(--muted)/0.3)] block"
                                >
                                  <img loading="lazy" decoding="async" src={photo} alt={tr("Site photo {{value}}", { value: i + 1 })} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                                  </div>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="py-6 flex flex-col items-center justify-center border border-dashed border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted)/0.2)] text-center">
                              <ImageIcon className="w-6 h-6 text-[hsl(var(--muted-foreground))] mb-1 opacity-60" />
                              <p className="text-xs font-bold text-[hsl(var(--foreground))]">{tr("No Site Photos Uploaded")}</p>
                            </div>
                          )}
                              </AccordionCard>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* TAB: REQUIREMENTS */}
          {activeTab === 'requirements' && (
            <motion.div key="requirements" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-3.5 sm:space-y-4">
              {getTabLockState('requirements').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 mb-3 border border-amber-500/20">
                    <Lock size={22} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[0.625rem] font-bold uppercase tracking-wider mb-2">
                    {tr("Phase Locked")}
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{tr("Requirements Stage is Locked")}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    {tr("Complete initial follow-up to unlock requirement logging.")}
                  </p>
                  {/* Bring the lead into this stage from here — no need for the previous stage's tab */}
                  {!isReadOnly && (canDo('crm_requirements', 'create') || canDo('crm_requirements', 'update') || canDo('crm_followups', 'update') || canDo('crm_leads', 'update')) && (
                    <button
                      onClick={() => setIsSendToReqOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 active:scale-95 transition-all"
                    >
                      {tr("Send to Requirements ")}<ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ) : (() => {
                const hasRequirements = Boolean(
                  (normalizedRequirements && normalizedRequirements.length > 0) ||
                  (normalizedClientRequirements && normalizedClientRequirements.length > 0)
                );
                const totalConfiguredSpaces = (normalizedRequirements?.length || 0) > 0
                  ? normalizedRequirements.length
                  : (normalizedClientRequirements?.length || 0);
                const hasClientRequirements = Boolean(normalizedClientRequirements && normalizedClientRequirements.length > 0);
                const hasClientSubmitted = Boolean(
                  lead.clientRequirementsSubmittedAt ||
                  lead.clientRequirements?.submittedAt ||
                  hasClientRequirements
                );
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

                const globalScopeOfWork = lead.scopeOfWork || (lead as any).scope || normalizedRequirements.find((r: any) => r.scopeOfWork)?.scopeOfWork;
                const globalTimeline = lead.timeline || (lead as any).targetTimeline || normalizedRequirements.find((r: any) => r.timeline)?.timeline;
                const globalSpecialRequests = lead.specialRequests || (lead as any).specialNotes || normalizedRequirements.find((r: any) => r.specialRequests)?.specialRequests;

                return (
                  <div className="space-y-3.5 sm:space-y-4">
                    {/* Overdue Warning */}
                    {isReqOverdue && (
                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                            <AlertTriangle size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-rose-950 dark:text-rose-100">
                                {tr("Requirements Session Overdue")}
                              </h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[0.625rem] font-bold uppercase tracking-wider">
                                <Clock size={10} />
                                {getReqOverdueText(requirementsInfo.scheduledDate)}
                              </span>
                            </div>
                            <p className="text-[0.6875rem] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                              {tr("Discussion session for")}{' '}
                              <strong>
                                {new Date(requirementsInfo.scheduledDate).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </strong>{' '}
                              {tr("has passed without design specifications recorded.")}
                            </p>
                          </div>
                        </div>
                        {!isReadOnly && (
                          (canDo('crm_requirements', 'update')) && (
                            <button
                              onClick={() => setIsSendToReqOpen(true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shrink-0"
                            >
                              <Calendar size={12} />{tr(" Reschedule Session")}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {/* Primary Briefing Card */}
                    <div className={cn(
                      "bg-[hsl(var(--card))] border rounded-xl p-3.5 sm:p-4 space-y-3 transition-colors",
                      isReqOverdue ? "border-rose-500/30" : "border-[hsl(var(--border))]"
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            isReqOverdue
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-600"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                          )}>
                            <PenTool size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                                {tr("Requirements Briefing & Specifications")}
                              </h2>
                              <span className={cn(
                                "text-[0.625rem] font-bold px-2 py-0.5 rounded border shrink-0",
                                hasRequirements
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : isReqOverdue
                                  ? "bg-rose-500/15 text-rose-600 border-rose-500/30 font-black"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              )}>
                                {hasRequirements
                                  ? tr("Configured ({{totalConfiguredSpaces}} {{value}}{{value2}})", { totalConfiguredSpaces: totalConfiguredSpaces, value: totalConfiguredSpaces === 1 ? 'Space' : 'Spaces', value2: !normalizedRequirements?.length && normalizedClientRequirements?.length ? ' - Client Intake' : '' })
                                  : tr("Discussion Pending")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasRequirements ? (
                              <>
                                {(canDo('crm_requirements', 'update')) && (
                                  <button
                                    onClick={() => setIsReqModalOpen(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Pencil size={12} />{tr(" Edit Requirements")}
                                  </button>
                                )}
                                {['Under Requirement', 'Requirement Completed'].includes(lead.status) && (
                                  (canDo('crm_requirements', 'update') || canDo('crm_site_visits', 'update') || canDo('crm_site_visits', 'create')) && (
                                    <button
                                      onClick={() => setIsSendToSiteVisitOpen(true)}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                      {tr("Pass to Site Visit ")}<ArrowRight size={12} />
                                    </button>
                                  )
                                )}
                              </>
                            ) : (
                              <>
                                {(canDo('crm_requirements', 'update')) && (
                                  <button
                                    onClick={() => setIsSendToReqOpen(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Calendar size={12} />{tr(" Reschedule Session")}
                                  </button>
                                )}
                                {(canDo('crm_requirements', 'create')) && (
                                  <button
                                    onClick={() => setIsReqModalOpen(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Plus size={13} />{tr(" Add Requirements")}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Requirement Scope Notes */}
                      {requirementsInfo.note && (
                        <div className="bg-emerald-500/[0.04] border border-emerald-500/20 rounded-lg p-3 space-y-2">
                          <p className="text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <MessageSquare size={12} className="text-emerald-600" />
                            {tr("Requirement Handover & Scope Notes")}
                          </p>
                          <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed bg-[hsl(var(--card))] border border-emerald-500/15 p-2.5 rounded whitespace-pre-wrap">
                            {tr(requirementsInfo.note)}
                          </p>
                        </div>
                      )}

                      {/* 4 Metadata Badges Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} className="text-emerald-500" />{tr(" Schedule")}
                          </p>
                          <p className={cn("font-bold text-xs mt-0.5 truncate", isReqOverdue ? "text-rose-600 font-black" : "text-[hsl(var(--foreground))]")}>
                            {requirementsInfo.scheduledDate
                              ? new Date(requirementsInfo.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : tr("Not scheduled")}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <User size={11} className="text-blue-500" />{tr(" Consultant")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {tr(requirementsInfo.assignedName)}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Banknote size={11} className="text-amber-500" />{tr(" Target Budget")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.budgetRange || (lead.budget ? `${currencySymbol} ${Number(lead.budget).toLocaleString()}` : tr("Not specified"))}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-purple-500" />{tr(" Property Scope")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.propertyType || lead.projectType || tr("Residential")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Global Scope / Timeline / Special Requests Banner if present */}
                    {(globalScopeOfWork || globalTimeline || globalSpecialRequests) && (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 space-y-2.5">
                        <h4 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5 pb-2 border-b border-[hsl(var(--border))]">
                          <Sliders size={13} className="text-blue-500" />{tr(" Overall Project Directives & Scope")}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          {globalScopeOfWork && (
                            <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">{tr("Scope of Work")}</span>
                              <span className="font-semibold text-[hsl(var(--foreground))] mt-0.5 block">{tr(globalScopeOfWork)}</span>
                            </div>
                          )}
                          {globalTimeline && (
                            <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">{tr("Target Timeline")}</span>
                              <span className="font-semibold text-[hsl(var(--foreground))] mt-0.5 block">{tr(globalTimeline)}</span>
                            </div>
                          )}
                          {globalSpecialRequests && (
                            <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                              <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">{tr("Special Requests")}</span>
                              <span className="font-semibold text-[hsl(var(--foreground))] mt-0.5 block">{tr(globalSpecialRequests)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Dual-Perspective Comparative Requirements View (Side-by-Side Customer & Technical Specifications) */}
                    <InteriorComparativeRequirementsView
                      lead={lead}
                      technicalPersonName={requirementsInfo.assignedName}
                      isReadOnly={isReadOnly}
                      canEdit={!isReadOnly && (canDo('crm_requirements', 'update') || canDo('crm_requirements', 'create'))}
                      hasPassedToSiteVisit={hasPassedToSiteVisit}
                      currencySymbol={currencySymbol}
                      onEditTeamRequirements={() => setIsReqModalOpen(true)}
                      onRescheduleSession={() => setIsSendToReqOpen(true)}
                      onRefresh={pollLead}
                      onOpenShareModal={() => {
                        setShareModalMode('requirements');
                        setIsShareModalOpen(true);
                      }}
                    />
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* TAB: 2D/3D DRAWINGS */}
          {activeTab === 'designs' && (
            <motion.div key="designs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-3.5 sm:space-y-4">
              {getTabLockState('designs').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 mb-3 border border-amber-500/20">
                    <Lock size={22} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[0.625rem] font-bold uppercase tracking-wider mb-2">
                    {tr("Phase Locked")}
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{tr("2D & 3D Drawings Stage is Locked")}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    {tr("Complete the Site Visit & Measurements phase first to unlock drawing uploads.")}
                  </p>
                  {/* Bring the lead into this stage from here — no need for the previous stage's tab */}
                  {!isReadOnly && (canDo('crm_drawings', 'create') || canDo('crm_drawings', 'update') || canDo('crm_requirements', 'update')) && (
                    <button
                      onClick={() => setIsSendToDrawingOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 active:scale-95 transition-all"
                    >
                      {tr("Send to Drawings ")}<ArrowRight size={12} />
                    </button>
                  )}
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

                const fileStatuses = designFilesList.map((f: any) => {
                  const versions = f.versions || [];
                  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
                  const rawStatus = latestVersion?.approvalStatus || f.approvalStatus || f.status || 'draft';
                  const approvalStatus = rawStatus === 'pending_internal_approval'
                    ? 'pending_internal_approval'
                    : rawStatus === 'internally_approved'
                    ? 'internally_approved'
                    : rawStatus === 'internally_rejected'
                    ? 'internally_rejected'
                    : 'draft';
                  const clientStatus = latestVersion?.clientStatus || f.clientStatus;
                  const isRejected = approvalStatus === 'internally_rejected' || clientStatus === 'client_changes_requested';
                  const isApproved = approvalStatus === 'internally_approved' && !isRejected;
                  const isPending = approvalStatus === 'pending_internal_approval' && !isRejected;
                  const isDraft = !isApproved && !isPending && !isRejected;
                  return { approvalStatus, clientStatus, isApproved, isPending, isRejected, isDraft };
                });

                const approvedDrawingsCount = fileStatuses.filter((s: any) => s.isApproved).length;
                const pendingDrawingsCount = fileStatuses.filter((s: any) => s.isPending).length;
                const rejectedDrawingsCount = fileStatuses.filter((s: any) => s.isRejected).length;
                const draftDrawingsCount = fileStatuses.filter((s: any) => s.isDraft).length;

                const allDrawingsApproved = hasDesignFiles && approvedDrawingsCount === designFilesList.length;

                const headerBadge = (() => {
                  if (!hasDesignFiles) {
                    return {
                      text: "Upload Pending",
                      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    };
                  }
                  if (allDrawingsApproved) {
                    return {
                      text: `✓ All Approved (${approvedDrawingsCount}/${designFilesList.length})`,
                      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    };
                  }
                  if (approvedDrawingsCount > 0) {
                    return {
                      text: `${approvedDrawingsCount}/${designFilesList.length} Approved`,
                      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    };
                  }
                  if (pendingDrawingsCount > 0) {
                    return {
                      text: `${pendingDrawingsCount}/${designFilesList.length} Pending Approval`,
                      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    };
                  }
                  if (rejectedDrawingsCount > 0) {
                    return {
                      text: `${rejectedDrawingsCount}/${designFilesList.length} Rejected`,
                      className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
                    };
                  }
                  return {
                    text: `${draftDrawingsCount} Draft${draftDrawingsCount > 1 ? 's' : ''}`,
                    className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
                  };
                })();

                return (
                  <div className="space-y-3.5 sm:space-y-4">
                    {/* Primary Briefing Card */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-blue-500/10 border-blue-500/20 text-blue-600">
                            <Ruler size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                                {tr("2D & 3D Design Drawings & Models")}
                              </h2>
                              <span className={cn(
                                "text-[0.625rem] font-bold px-2 py-0.5 rounded border shrink-0",
                                headerBadge.className
                              )}>
                                {tr(headerBadge.text)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasDesignFiles ? (
                              <>
                                {(canDo('crm_drawings', 'create')) && (
                                  <button
                                    onClick={() => setIsDesignModalOpen(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Plus size={13} />{tr(" Upload More")}
                                  </button>
                                )}
                                {['Under Drawing', 'Design Approved'].includes(lead.status) && (
                                  <button
                                    onClick={() => {
                                      if (!allDrawingsApproved) {
                                        if (draftDrawingsCount > 0) {
                                          toast.error(tr("Cannot pass to BOQ: Drawing is in Draft and requires internal approval."));
                                        } else if (pendingDrawingsCount > 0) {
                                          toast.error(tr("Cannot pass to BOQ: Drawing approval is still pending."));
                                        } else if (rejectedDrawingsCount > 0) {
                                          toast.error(tr("Cannot pass to BOQ: Some drawings are rejected."));
                                        } else {
                                          toast.error(tr("Cannot pass to BOQ: All drawings must be approved first."));
                                        }
                                        return;
                                      }
                                      setIsSendToBoqOpen(true);
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all active:scale-95",
                                      allDrawingsApproved
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                    )}
                                  >
                                    {tr("Pass to BOQ ")}<ArrowRight size={12} />
                                  </button>
                                )}
                              </>
                            ) : (
                              (canDo('crm_drawings', 'create')) && (
                                <button
                                  onClick={() => setIsDesignModalOpen(true)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                >
                                  <Plus size={13} />{tr(" Upload Drawings")}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Share Portal Ribbon */}
                      {hasDesignFiles && (
                        <div className="bg-indigo-500/[0.04] border border-indigo-500/20 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="text-indigo-600 shrink-0" />
                            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">{tr("Client View-Only Portal")}</span>
                            <span className={cn(
                              "text-[0.5625rem] font-bold px-1.5 py-0.2 rounded border",
                              lead.shareSettings?.isPublic
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                              {lead.shareSettings?.isPublic ? tr("Active") : tr("Unpublished")}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {lead.shareSettings?.isPublic && lead.shareSettings?.shareToken && (
                              <a
                                href={`/share/drawing/${lead.shareSettings.shareToken}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded text-[0.6875rem] font-bold"
                              >
                                <ExternalLink size={11} />{tr(" Preview")}
                              </a>
                            )}
                            {(canDo('crm_leads', 'update') || canDo('crm_followups', 'update') || canDo('crm_site_visits', 'update') || canDo('crm_requirements', 'update') || canDo('crm_drawings', 'update') || canDo('crm_boq', 'update') || canDo('crm_quotations', 'update')) && (
                              <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[0.6875rem] font-bold active:scale-95"
                              >
                                <Share2 size={11} /> {lead.shareSettings?.isPublic ? tr("Share Link") : tr("Generate Link")}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <User size={11} className="text-purple-500" />{tr(" Designer")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {tr(drawingInfo.assignedName)}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Palette size={11} className="text-emerald-500" />{tr(" Style")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.requirements?.find((r: any) => r.designStyle)?.designStyle || lead.requirements?.[0]?.theme || tr("Custom Style")}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Layers size={11} className="text-cyan-500" />{tr(" Summary")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {twoDFiles.length} 2D • {threeDFiles.length} 3D
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-blue-500" />{tr(" Scope")}
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.propertyType || tr("Execution")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Switcher & File Grid */}
                    {!hasDesignFiles ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 text-center flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                          <UploadCloud size={24} />
                        </div>
                        <div className="max-w-md space-y-0.5">
                          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
                            {tr("Ready for 2D & 3D Drawing Uploads")}
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            {tr("Upload 2D layouts (Floor plans, MEP) and 3D models/photorealistic renders.")}
                          </p>
                        </div>
                        {!isReadOnly && (
                          (canDo('crm_drawings', 'create')) && (
                            <button 
                              onClick={() => setIsDesignModalOpen(true)} 
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={14} />{tr(" Upload Drawings")}
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Segmented Switcher */}
                        <div className="flex bg-[hsl(var(--muted))] p-0.5 rounded-lg border border-[hsl(var(--border))] w-fit">
                          <button
                            type="button"
                            onClick={() => setDesignSubTab('2d')}
                            className={cn(
                              "px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                              designSubTab === '2d' ? "bg-blue-600 text-white" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            )}
                          >
                            <Layers size={12} />{tr(" 2D Layouts (")}{twoDFiles.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setDesignSubTab('3d')}
                            className={cn(
                              "px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                              designSubTab === '3d' ? "bg-purple-600 text-white" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            )}
                          >
                            <Box size={12} />{tr(" 3D Models (")}{threeDFiles.length})
                          </button>
                        </div>

                        {/* File Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {(designSubTab === '2d' ? twoDFiles : threeDFiles).map((file: any, index: number) => {
                            const type = file.fileType || detectFileType(file.name, file.url);
                            const badge = getFileBadgeInfo(file.name, file.category || (designSubTab === '2d' ? '2D' : '3D'), file.url, type);
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
                                className="flex flex-col bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] rounded-xl overflow-hidden transition-all group"
                              >
                                <div 
                                  onClick={() => router.push(`/interior-new/crm/leads/${params.id}/drawings/${encodeURIComponent(file._id || file.id || file.title || file.name)}`)}
                                  className={cn(
                                    "h-32 flex items-center justify-center relative overflow-hidden cursor-pointer",
                                    type === 'pdf' ? 'bg-red-500/10 text-red-500' :
                                    type === 'cad' ? 'bg-amber-500/10 text-amber-500' :
                                    type === '3d-model' ? 'bg-purple-500/10 text-purple-500' :
                                    type === 'archive' ? 'bg-cyan-500/10 text-cyan-500' :
                                    'bg-blue-500/5 text-blue-500'
                                  )}
                                >
                                  {type === 'image' && file.url ? (
                                    <img loading="lazy" decoding="async" src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  ) : type === 'pdf' ? (
                                    <FileText size={32} />
                                  ) : type === 'cad' ? (
                                    <Layers size={32} />
                                  ) : type === '3d-model' ? (
                                    <Box size={32} />
                                  ) : (
                                    <FileIcon size={32} />
                                  )}

                                  <div className="absolute top-2 left-2 flex items-center gap-1 max-w-[calc(100%-80px)] overflow-hidden">
                                    <span className={cn("text-[0.5rem] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0", badge.color)}>
                                      {tr(badge.label)}
                                    </span>
                                    <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white shrink-0">
                                      v{tr(versionNum)}
                                    </span>
                                  </div>

                                  <div className="absolute top-2 right-2">
                                    <span className={cn(
                                      "text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full text-white",
                                      isApproved ? "bg-emerald-600" : isPendingApproval ? "bg-amber-500" : isDrawingRejected ? "bg-rose-500" : "bg-slate-600"
                                    )}>
                                      {isApproved ? tr("Approved") : isPendingApproval ? tr("Pending") : isDrawingRejected ? tr("Rejected") : tr("Draft")}
                                    </span>
                                  </div>
                                </div>

                                <div className="p-2.5 flex flex-col flex-1 justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate" title={file.title || file.name}>
                                      {file.title || file.name}
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5 text-[0.5625rem] text-[hsl(var(--muted-foreground))] flex-wrap">
                                      {file.roomTag && (
                                        <span className="font-bold text-emerald-600 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                          {tr(file.roomTag)}
                                        </span>
                                      )}
                                      {file.uploadedAt && <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>}
                                    </div>

                                    {approvalStatus === 'internally_rejected' && rejectionReason && (
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewRejectionReasonData({
                                            title: file.title || file.name,
                                            reason: rejectionReason,
                                            version: versionNum
                                          });
                                        }}
                                        className="mt-1.5 p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-md text-[0.5625rem] text-rose-700 dark:text-rose-300 cursor-pointer transition-colors max-w-full overflow-hidden"
                                        title={tr("Click to view full rejection reason")}
                                      >
                                        <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                          <p className="truncate flex-1 font-medium break-all">
                                            <strong className="font-bold">{tr("Rejected:")}</strong> {tr(rejectionReason)}
                                          </p>
                                          <span className="text-[0.5rem] font-bold text-rose-600 underline shrink-0 ms-1 hover:text-rose-800">
                                            {tr("View")}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-1.5 border-t border-[hsl(var(--border))] flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {!isReadOnly && (
                                        <>
                                          {isDraft && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedDrawingForSendApproval(file);
                                                setIsSendApprovalModalOpen(true);
                                              }}
                                              className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded text-[0.5625rem] font-bold"
                                            >
                                              <Send size={9} className="inline me-0.5" />{tr(" Send to Approval")}
                                            </button>
                                          )}
                                          {isPendingApproval && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedDrawingForConfirmApprove(file);
                                                  setIsConfirmApproveModalOpen(true);
                                                }}
                                                disabled={approvingDrawingId === (file._id || file.id || file.title || file.name)}
                                                className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded text-[0.5625rem] font-bold cursor-pointer"
                                              >
                                                {tr("Approve")}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedDrawingForApproval({ ...file, initialAction: 'reject' });
                                                  setIsApprovalModalOpen(true);
                                                }}
                                                className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded text-[0.5625rem] font-bold"
                                              >
                                                {tr("Reject")}
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
                                              className="px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded text-[0.5625rem] font-bold"
                                            >
                                              {tr("+ Rev")}
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {!isReadOnly && (
                                        canDo('crm_drawings', 'delete') && (
                                          <button
                                            type="button"
                                            onClick={() => setDrawingToDelete(file)}
                                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600"
                                            title={tr("Delete")}
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        )
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/interior-new/crm/leads/${params.id}/drawings/${encodeURIComponent(file._id || file.id || file.title || file.name)}`)}
                                        className="p-1 px-1.5 rounded bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] flex items-center gap-0.5 text-[0.5625rem] font-bold"
                                      >
                                        <Eye size={11} />
                                        <span>{tr("View")}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
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

          {/* TAB: BOQ */}
          {activeTab === 'boq' && (
            <motion.div key="boq" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-3.5 sm:space-y-4">
              {getTabLockState('boq').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 mb-3 border border-amber-500/20">
                    <Lock size={22} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[0.625rem] font-bold uppercase tracking-wider mb-2">
                    {tr("Phase Locked")}
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{tr("BOQ Stage is Locked")}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    {tr("Complete and approve drawings to unlock BOQ creation and itemized estimations.")}
                  </p>
                  {/* Bring the lead into this stage from here — no need for the previous stage's tab */}
                  {!isReadOnly && (canDo('crm_boq', 'create') || canDo('crm_boq', 'update') || canDo('crm_drawings', 'update')) && (
                    <button
                      onClick={() => setIsSendToBoqOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 active:scale-95 transition-all"
                    >
                      {tr("Send to BOQ ")}<ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ) : (() => {
                const hasBoqs = Boolean(lead.boqs && lead.boqs.length > 0);
                const hasAcceptedQuote = lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted');
                const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean(lead.linkedProject);
                const isBoqLocked = isReadOnly || isQuotationApproved;

                const activeBoq = hasBoqs ? lead.boqs[activeBoqIndex] : null;
                const isBoqApproved = activeBoq?.status === 'approved';
                const isBoqPending = activeBoq?.status === 'pending_approval';
                const isBoqDraft = !activeBoq?.status || activeBoq?.status === 'draft';
                const isBoqRejected = activeBoq?.status === 'rejected';

                return (
                  <div className="space-y-3.5 sm:space-y-4">
                    {/* Header Card */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-indigo-500/10 border-indigo-500/20 text-indigo-600">
                            <Calculator size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">
                                {tr("Bill of Quantities (BOQ) & Estimations")}
                              </h2>
                              <span className={cn(
                                "text-[0.625rem] font-bold px-2 py-0.5 rounded border shrink-0",
                                isBoqApproved
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : isBoqPending
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : isBoqRejected
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                  : hasBoqs
                                  ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              )}>
                                {isBoqApproved
                                  ? tr("✓ BOQ Approved")
                                  : isBoqPending
                                  ? tr("⏳ Approval Pending")
                                  : isBoqRejected
                                  ? tr("✕ Changes Requested")
                                  : hasBoqs
                                  ? tr("BOQ Draft (v{{value}})", { value: activeBoq?.version || activeBoqIndex + 1 })
                                  : tr("Pending")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isBoqLocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] text-xs font-bold">
                                <Lock size={11} /> {isLost ? tr("Locked (Lost)") : tr("Locked (Approved)")}
                              </span>
                            ) : hasBoqs ? (
                              <>
                                {canDo('crm_boq', 'update') && !isBoqApproved && (
                                  <button
                                    onClick={() => {
                                      setEditingBoqIndex(activeBoqIndex);
                                      setIsBoqModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Pencil size={12} />{tr(" Edit BOQ")}
                                  </button>
                                )}
                                {isBoqApproved && (
                                  canDo('crm_boq', 'create') && (
                                    <button
                                      onClick={() => {
                                        setEditingBoqIndex(null);
                                        setIsBoqModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                      <Plus size={13} />{tr(" New Version")}
                                    </button>
                                  )
                                )}
                                {canDo('crm_boq', 'delete') && (
                                  <button
                                    onClick={() => {
                                      setBoqIndexToDelete(activeBoqIndex);
                                      setIsDeleteBoqModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                    title={tr("Delete Active BOQ Version")}
                                  >
                                    <Trash2 size={12} />{tr(" Delete")}
                                  </button>
                                )}

                                {canDo('crm_boq', 'export') && (
                                  <button
                                    onClick={() =>
                                      exportBoqToExcel({
                                        lead,
                                        boqIndex: activeBoqIndex,
                                        currencySymbol,
                                        currencyCode,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
                                    title={tr("Export Bill of Quantities to Excel (.xlsx)")}
                                  >
                                    <FileSpreadsheet size={13} />{tr(" Export Excel")}
                                  </button>
                                )}

                              

                              

                                {['Under BOQ Creation', 'Design Approved', 'Under Drawing'].includes(lead.status) && isBoqApproved && (
                                  (canDo('crm_boq', 'update') || canDo('crm_quotations', 'update') || canDo('crm_quotations', 'create')) && (
                                    <button
                                      onClick={() => setIsSendToQuotationsOpen(true)}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                                      title={tr("Pass to Quotation Phase")}
                                    >
                                      {tr("Pass to Quotation ")}<ArrowRight size={12} />
                                    </button>
                                  )
                                )}
                              </>
                            ) : (
                              (canDo('crm_boq', 'create')) && (
                                <button
                                  onClick={() => setIsBoqModalOpen(true)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                >
                                  <Plus size={13} />{tr(" Create BOQ")}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Total Amount")}</p>
                          <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {hasBoqs ? `${currencySymbol} ${boqInfo.totalAmount.toLocaleString()}` : `${currencySymbol} 0`}
                          </p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Scope Categories")}</p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate" title={hasBoqs ? boqInfo.categorySummary : tr("0 Categories")}>
                            {hasBoqs ? boqInfo.categorySummary : tr("0 Categories")}
                          </p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Target Budget")}</p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.budgetRange || tr("Not specified")}</p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Scope")}</p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.propertyType || tr("Interior")}</p>
                        </div>
                      </div>
                    </div>

                    {!hasBoqs ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 text-center flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                          <Calculator size={24} />
                        </div>
                        <div className="max-w-md space-y-0.5">
                          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
                            {tr("Ready for Detailed BOQ Estimation")}
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            {tr("Build itemized take-offs across carpentry, ceiling, MEP, and finishes.")}
                          </p>
                        </div>
                        {!isReadOnly && !isBoqLocked && (
                          (canDo('crm_boq', 'create')) && (
                            <button 
                              onClick={() => setIsBoqModalOpen(true)} 
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus size={14} />{tr(" Create Initial BOQ")}
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {lead.boqs.length > 1 && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-3 shadow-2xs">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-extrabold text-[hsl(var(--foreground))]">{tr("BOQ Versions (")}{lead.boqs.length}):</span>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
                              {lead.boqs.map((q: any, idx: number) => {
                                const isCurrent = activeBoqIndex === idx;
                                const createdDateStr = q.createdAt
                                  ? format(new Date(q.createdAt), 'MMM dd, yyyy')
                                  : null;
                                const creatorName =
                                  q.createdByName ||
                                  (q.createdBy?.firstName ? `${q.createdBy.firstName} ${q.createdBy.lastName || ''}`.trim() : null) ||
                                  null;

                                return (
                                  <button
                                    key={idx}
                                    onClick={() => setActiveBoqIndex(idx)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border text-start",
                                      isCurrent
                                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs ring-1 ring-indigo-500/30"
                                        : "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] border-[hsl(var(--border))]"
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold">v{q.version || idx + 1}</span>
                                      <span className={cn(
                                        "text-[0.5625rem] uppercase px-1.5 py-0.2 rounded font-bold",
                                        isCurrent ? "bg-white/20 text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                                      )}>
                                        {q.status || tr("Draft")}
                                      </span>
                                    </div>
                                    {(createdDateStr || creatorName) && (
                                      <span className={cn(
                                        "text-[0.625rem] flex items-center gap-1 opacity-90",
                                        isCurrent ? "text-indigo-100" : "text-[hsl(var(--muted-foreground))]"
                                      )}>
                                        {createdDateStr && <span>• {tr(createdDateStr)}</span>}
                                        {creatorName && <span>{tr("by ")}<strong>{tr(creatorName)}</strong></span>}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <BoqPreview 
                          lead={lead} 
                          boqIndex={activeBoqIndex} 
                          onSuccess={fetchData} 
                          onEdit={isBoqLocked || isBoqApproved || !canDo('crm_boq', 'update') ? undefined : () => {
                            setEditingBoqIndex(activeBoqIndex);
                            setIsBoqModalOpen(true);
                          }}
                          onDelete={isBoqLocked || !canDo('crm_boq', 'delete') ? undefined : (idx) => {
                            setBoqIndexToDelete(idx);
                            setIsDeleteBoqModalOpen(true);
                          }}
                          onSendForApproval={isBoqLocked || !canDo('crm_boq', 'update') ? undefined : (idx) => {
                            setActiveBoqIndex(idx);
                            setIsSendBoqApprovalOpen(true);
                          }}
                          onApprove={isBoqLocked || !canDo('crm_boq', 'approve') ? undefined : (idx) => {
                            setActiveBoqIndex(idx);
                            setBoqApprovalAction('approve');
                            setIsBoqApprovalOpen(true);
                          }}
                          onReject={isBoqLocked || !canDo('crm_boq', 'approve') ? undefined : (idx) => {
                            setActiveBoqIndex(idx);
                            setBoqApprovalAction('reject');
                            setIsBoqApprovalOpen(true);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* TAB: QUOTATIONS */}
          {activeTab === 'quotations' && (
            <motion.div key="quotations" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-3.5 sm:space-y-4">
              {getTabLockState('quotations').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 mb-3 border border-amber-500/20">
                    <Lock size={22} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[0.625rem] font-bold uppercase tracking-wider mb-2">
                    {tr("Phase Locked")}
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{tr("Quotations Stage is Locked")}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    {tr("Finalize the BOQ estimate first to unlock commercial proposals.")}
                  </p>
                  {/* Bring the lead into this stage from here — no need for the previous stage's tab */}
                  {!isReadOnly && (canDo('crm_quotations', 'create') || canDo('crm_quotations', 'update') || canDo('crm_boq', 'update')) && (
                    <button
                      onClick={() => setIsSendToQuotationsOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 active:scale-95 transition-all"
                    >
                      {tr("Send to Quotations ")}<ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ) : (() => {
                const hasQuotations = Boolean(lead.quotations && lead.quotations.length > 0);
                const latestQuote = hasQuotations ? lead.quotations[lead.quotations.length - 1] : null;
                const isLatestQuoteRejected = Boolean(latestQuote && latestQuote.status === 'Rejected');
                const hasAcceptedQuote = Boolean(lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted' || q.status === 'Approved'));
                const isQuotationApproved = hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(lead.status) || Boolean(lead.linkedProject);
                const isQuoteLocked = isReadOnly || isQuotationApproved;

                return (
                  <div className="space-y-4">
                    {/* Header Summary Card */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[hsl(var(--border))]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h2 className="text-sm sm:text-base font-bold text-[hsl(var(--foreground))]">
                                {tr("Commercial Quotations & Proposals")}
                              </h2>
                              <span className={cn(
                                "text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5",
                                hasQuotations
                                  ? isLatestQuoteRejected
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : hasAcceptedQuote
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              )}>
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  hasQuotations
                                    ? isLatestQuoteRejected
                                      ? "bg-rose-500"
                                      : hasAcceptedQuote
                                      ? "bg-emerald-500"
                                      : "bg-blue-500"
                                    : "bg-amber-500"
                                )} />
                                {hasQuotations ? `${lead.quotations.length} ${lead.quotations.length === 1 ? 'Proposal' : 'Proposals'} Generated` : tr("Pending Creation")}
                              </span>
                            </div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              {tr("Generate commercial proposals, apply taxes, discounts and manage client approvals.")}
                            </p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasQuotations && (hasAcceptedQuote || lead.status === 'Booking Pending') && !['Won', 'Converted'].includes(lead.status) && (
                              (canDo('crm_quotations', 'approve')) && (
                                <button
                                  onClick={() => setIsConvertToProjectOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                                >
                                  <CheckCircle2 size={14} />{tr(" Convert to Project")}
                                </button>
                              )
                            )}

                            <button
                              onClick={() => {
                                setEditingQuotationIndex(null);
                                setIsQuotationModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                            >
                              <Plus size={14} />{tr(" Create Quotation")}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors min-w-0 overflow-hidden">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Grand Total")}</p>
                          <p 
                            className="font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400 mt-1 truncate block"
                            title={hasQuotations ? formatSmartCurrency(quotationInfo.grandTotal, currencySymbol).exact : ''}
                          >
                            {hasQuotations ? formatSmartCurrency(quotationInfo.grandTotal, currencySymbol).display : '—'}
                          </p>
                          {hasQuotations && formatSmartCurrency(quotationInfo.grandTotal, currencySymbol).isLarge && (
                            <p 
                              className="text-[0.625rem] font-mono text-[hsl(var(--muted-foreground))] truncate block"
                              title={formatSmartCurrency(quotationInfo.grandTotal, currencySymbol).exact}
                            >
                              ({tr(formatSmartCurrency(quotationInfo.grandTotal, currencySymbol).exact)})
                            </p>
                          )}
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Breakdown")}</p>
                          <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1 truncate">
                            {hasQuotations ? tr("{{taxPercentage}}% Tax • {{itemsCount}} Items", { taxPercentage: quotationInfo.taxPercentage, itemsCount: quotationInfo.itemsCount }) : tr("No items")}
                          </p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Latest Status")}</p>
                          <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1">{quotationInfo.currentQuote?.status || tr("Generated")}</p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
                          <p className="text-[0.625rem] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{tr("Target Budget")}</p>
                          <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1">{lead.budgetRange || tr("Not specified")}</p>
                        </div>
                      </div>
                    </div>

                    {!hasQuotations ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center space-y-3.5 shadow-2xs">
                        <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600">
                          <FileText size={26} />
                        </div>
                        <div className="max-w-md space-y-1">
                          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                            {tr("No Quotations Created Yet")}
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            {tr("Generate itemized pricing proposals directly from the finalized BOQ, apply custom discounts and taxes.")}
                          </p>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              setEditingQuotationIndex(null);
                              setIsQuotationModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-sm"
                          >
                            <Plus size={15} />{tr(" Create First Quotation")}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Table Card */}
                        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl overflow-hidden shadow-xs">
                          <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                                <span>{tr("Quotation Versions & Options")}</span>
                                <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                  {lead.quotations.length}
                                </span>
                              </h3>
                            </div>
                            <p className="text-[0.6875rem] text-[hsl(var(--muted-foreground))] hidden sm:block">
                              {tr("Click \"View\" to inspect document preview or send to client")}
                            </p>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-start text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider text-[0.625rem]">
                                  <th className="py-3 px-4 w-12 text-center">#</th>
                                  <th className="py-3 px-4 min-w-[12.5rem] max-w-[20rem]">{tr("Quotation Title")}</th>
                                  <th className="py-3 px-4 whitespace-nowrap">{tr("Scope / Items")}</th>
                                  <th className="py-3 px-4 whitespace-nowrap">{tr("Subtotal & Tax")}</th>
                                  <th className="py-3 px-4 whitespace-nowrap">{tr("Grand Total")}</th>
                                  <th className="py-3 px-4 text-center whitespace-nowrap">{tr("Status")}</th>
                                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr("Actions")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[hsl(var(--border))]">
                                {lead.quotations.map((q: any, idx: number) => {
                                  const isSelected = activeQuotationIndex === idx;
                                  const quoteTitle = q.title || `Quotation ${idx + 1}`;
                                  const itemCount = q.items?.length || 0;
                                  const status = q.status || 'Generated';

                                  const getStatusBadge = (st: string) => {
                                    switch (st) {
                                      case 'Accepted':
                                      case 'Approved':
                                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                      case 'Rejected':
                                        return 'bg-rose-50 text-rose-700 border-rose-200';
                                      case 'Sent':
                                        return 'bg-blue-50 text-blue-700 border-blue-200';
                                      case 'Generated':
                                        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
                                      default:
                                        return 'bg-slate-100 text-slate-700 border-slate-200';
                                    }
                                  };

                                  return (
                                    <tr
                                      key={idx}
                                      onClick={() => setActiveQuotationIndex(idx)}
                                      className="group cursor-pointer transition-all hover:bg-[hsl(var(--muted)/0.4)]"
                                    >
                                      {/* Index */}
                                      <td className="py-3.5 px-4 text-center font-mono text-[0.6875rem] text-[hsl(var(--muted-foreground))]">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md font-semibold text-xs bg-slate-100 dark:bg-[hsl(var(--muted))] text-slate-600 dark:text-[hsl(var(--muted-foreground))]">
                                          {idx + 1}
                                        </span>
                                      </td>

                                      {/* Quotation Title */}
                                      <td className="py-3.5 px-4 font-bold text-[hsl(var(--foreground))] min-w-[12.5rem] max-w-[20rem]">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:border-blue-500/20">
                                            <FileText size={14} />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <span 
                                              className="text-xs font-bold text-[hsl(var(--foreground))] block truncate"
                                              title={quoteTitle}
                                            >
                                              {tr(quoteTitle)}
                                            </span>
                                            <p className="text-[0.625rem] text-[hsl(var(--muted-foreground))] font-normal truncate">
                                              {tr("Version ")}{q.version || idx + 1}
                                              {q.sourceBoqVersion && tr(" • BOQ v{{sourceBoqVersion}}", { sourceBoqVersion: q.sourceBoqVersion })}
                                              {Array.isArray(q.vendorQuotes) && q.vendorQuotes.length > 0 && (
                                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold ms-1.5">
                                                  • {q.vendorQuotes.length}{tr(" Vendor ")}{q.vendorQuotes.length === 1 ? tr("Quote") : tr("Quotes")}
                                                </span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Items / Scope */}
                                      <td className="py-3.5 px-4 text-[0.6875rem] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-slate-700 dark:text-[hsl(var(--foreground))] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[hsl(var(--muted))] border border-slate-200/80 dark:border-[hsl(var(--border))]">
                                            {tr(itemCount)} {itemCount === 1 ? tr("item") : tr("items")}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Subtotal & Tax */}
                                      <td className="py-3.5 px-4 text-[0.6875rem] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                                        <div 
                                          className="font-medium text-[hsl(var(--foreground))] truncate max-w-[8.75rem]"
                                          title={formatSmartCurrency(q.subtotal || 0, currencySymbol).exact}
                                        >
                                          {tr(formatSmartCurrency(q.subtotal || 0, currencySymbol).display)}
                                        </div>
                                        <div className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">
                                          {tr("Tax: ")}{q.taxPercentage || 0}%
                                          {Number(q.discountAmount || 0) > 0 && (
                                            <span 
                                              className="ms-1 text-emerald-600 font-semibold truncate"
                                              title={formatSmartCurrency(Number(q.discountAmount), currencySymbol).exact}
                                            >
                                              {tr("• Disc: ")}{tr(formatSmartCurrency(Number(q.discountAmount), currencySymbol).display)}
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Grand Total */}
                                      <td className="py-3.5 px-4 whitespace-nowrap">
                                        <span 
                                          className="text-xs font-extrabold text-blue-600 dark:text-blue-400 truncate block max-w-[9.375rem]"
                                          title={formatSmartCurrency(q.grandTotal || 0, currencySymbol).exact}
                                        >
                                          {tr(formatSmartCurrency(q.grandTotal || 0, currencySymbol).display)}
                                        </span>
                                      </td>

                                      {/* Status */}
                                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                        <span className={cn(
                                          "text-[0.625rem] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider inline-flex items-center gap-1",
                                          getStatusBadge(status)
                                        )}>
                                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                          {tr(status)}
                                        </span>
                                      </td>

                                      {/* Actions */}
                                      <td className="py-3.5 px-4 whitespace-nowrap text-end">
                                        <div className="inline-flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            onClick={() => setActiveQuotationIndex(idx)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-500 dark:bg-[hsl(var(--card))] dark:text-blue-400"
                                            title={tr("View Quotation Modal")}
                                          >
                                            <Eye size={13} />{tr(" View")}
                                          </button>


                                          {!isReadOnly && !isConverted && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingQuotationIndex(idx);
                                                setIsQuotationModalOpen(true);
                                              }}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-xs dark:bg-[hsl(var(--card))] dark:border-[hsl(var(--border))] dark:text-[hsl(var(--foreground))]"
                                              title={tr("Edit Quotation")}
                                            >
                                              <Pencil size={12} />{tr(" Edit")}
                                            </button>
                                          )}

                                          {!isReadOnly && !isConverted && (
                                            (canDo('crm_quotations', 'delete')) && (
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteQuotationByIndex(idx)}
                                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shadow-xs dark:bg-[hsl(var(--card))] dark:border-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]"
                                                title={tr("Delete Quotation")}
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            )
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'confirm_order' && (
            <motion.div
              key="confirm_order"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-3.5 sm:space-y-4"
            >
              {getTabLockState('confirm_order').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center shadow-xs">
                  <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-3.5 border border-amber-500/20">
                    <Lock size={24} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold uppercase tracking-wider mb-2">
                    {tr("Phase Locked")}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">{tr("Order Confirmation Stage is Locked")}</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs sm:text-sm mt-1 max-w-md">
                    {tr("Create and finalize a commercial proposal in the Quotations tab first to unlock the confirmed order workflow.")}
                  </p>
                  <button
                    onClick={() => setActiveTab('quotations')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                  >
                    <FileText size={14} />{tr(" Go to Quotations Tab")}
                  </button>
                </div>
              ) : (
                <InteriorConfirmedOrderStageView
                  lead={lead}
                  currencySymbol={currencySymbol}
                  isReadOnly={isReadOnly}
                  onRefresh={fetchData}
                  onOpenConfirmModal={() => setIsConfirmOrderModalOpen(true)}
                  onOpenQuotationModal={() => {
                    setActiveTab('quotations');
                    setEditingQuotationIndex(null);
                    setIsQuotationModalOpen(true);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {isActivityModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsActivityModalOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 sm:p-6">
              
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[hsl(var(--border))]">
                <div>
                  <h2 className="text-base font-bold text-[hsl(var(--foreground))]">{tr("Log Activity Note")}</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{tr("Record a touchpoint with ")}{tr(lead.name)}</p>
                </div>
                <button onClick={() => setIsActivityModalOpen(false)} className="p-1.5 hover:bg-[hsl(var(--accent))] rounded-lg bg-[hsl(var(--muted))] transition-colors"><X size={16} className="text-[hsl(var(--muted-foreground))]" /></button>
              </div>

              <form onSubmit={handleActivitySubmit} className="space-y-4">
                <div>
                  <label className="text-[0.6875rem] font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">{tr("Activity Type")}</label>
                  <select 
                    value={activityForm.type}
                    onChange={e => setActivityForm({...activityForm, type: e.target.value})}
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-xs font-medium focus:border-[hsl(var(--primary))] outline-none"
                  >
                    {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit", "Email", "Status Change"].map(t => <option key={t} value={t}>{tr(t)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[0.6875rem] font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">{tr("Remarks / Summary")}</label>
                  <textarea 
                    required
                    rows={4}
                    value={activityForm.remarks}
                    onChange={e => setActivityForm({...activityForm, remarks: e.target.value})}
                    placeholder={tr("E.g., Client wants a modern theme, budget is strict. Next meeting next week.")}
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-xs font-medium focus:border-[hsl(var(--primary))] outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsActivityModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors">{tr("Cancel")}</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg text-xs font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-all active:scale-95">
                    {isSubmitting ? tr("Saving...") : tr("Save Activity")}
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
        clientRequirements={normalizedClientRequirements || []}
        initialRequirements={normalizedRequirements || []}
        initialBudget={lead?.budgetRange || ''}
        currentStatus={lead?.status || ''}
        hasPassedToSiteVisit={hasPassedToSiteVisit}
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
        onClose={() => {
          setIsQuotationModalOpen(false);
          setEditingQuotationIndex(null);
        }}
        customerId={params.id as string}
        customerEmail={lead?.email || ''}
        existingQuotations={lead?.quotations || []}
        existingBoqs={lead?.boqs || []}
        lead={lead}
        editingQuotationIndex={editingQuotationIndex}
        onSuccess={() => {
          fetchData();
          setEditingQuotationIndex(null);
          setActiveQuotationIndex(null);
        }}
      />
      <InteriorQuotationPreviewModal
        isOpen={activeQuotationIndex !== null}
        onClose={() => setActiveQuotationIndex(null)}
        lead={lead}
        quotationIndex={activeQuotationIndex}
        onSuccess={fetchData}
      />
      {sendQuotationModalIndex !== null && lead?.quotations?.[sendQuotationModalIndex] && (
        <InteriorSendQuotationModal
          isOpen={sendQuotationModalIndex !== null}
          onClose={() => setSendQuotationModalIndex(null)}
          customerId={params.id as string}
          customerName={lead?.name}
          customerEmail={lead?.email}
          customerPhone={lead?.phone}
          quotation={lead.quotations[sendQuotationModalIndex]}
          quotationIndex={sendQuotationModalIndex}
          onSuccess={fetchData}
        />
      )}
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
        designFiles={lead?.designFiles || []}
        leadStatus={lead?.status}
        onSuccess={fetchData}
      />
      <InteriorDeleteBoqModal
        isOpen={isDeleteBoqModalOpen}
        onClose={() => {
          setIsDeleteBoqModalOpen(false);
          setBoqIndexToDelete(null);
        }}
        customerId={lead?._id || ''}
        customerName={lead?.name}
        existingBoqs={lead?.boqs || []}
        boqIndexToDelete={boqIndexToDelete}
        onSuccess={() => {
          setActiveBoqIndex(0);
          fetchData();
        }}
      />
      <InteriorSendBoqForApprovalModal
        isOpen={isSendBoqApprovalOpen}
        onClose={() => setIsSendBoqApprovalOpen(false)}
        customerId={lead?._id || ''}
        customerName={lead?.name}
        existingBoqs={lead?.boqs || []}
        boqIndex={activeBoqIndex}
        users={users}
        onSuccess={fetchData}
      />
      <InteriorBoqApprovalModal
        isOpen={isBoqApprovalOpen}
        onClose={() => {
          setIsBoqApprovalOpen(false);
          setBoqApprovalAction(null);
        }}
        customerId={lead?._id || ''}
        customerName={lead?.name}
        budgetRange={lead?.budgetRange || ''}
        existingBoqs={lead?.boqs || []}
        boqIndex={activeBoqIndex}
        initialAction={boqApprovalAction}
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
        leadId={params.id as string}
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
        mode={shareModalMode}
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
      <InteriorDrawingConfirmApproveModal
        isOpen={isConfirmApproveModalOpen}
        onClose={() => {
          if (!approvingDrawingId) {
            setIsConfirmApproveModalOpen(false);
            setSelectedDrawingForConfirmApprove(null);
          }
        }}
        onConfirm={() => {
          if (selectedDrawingForConfirmApprove) {
            handleDirectApproveDrawing(selectedDrawingForConfirmApprove);
          }
        }}
        drawing={selectedDrawingForConfirmApprove}
        isSubmitting={Boolean(approvingDrawingId)}
        leadName={lead?.name}
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
      {viewRejectionReasonData && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setViewRejectionReasonData(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{tr("Rejection Reason")}</h4>
                  <p className="text-[0.6875rem] text-slate-500 font-medium truncate max-w-xs">
                    {tr(viewRejectionReasonData.title)} (v{tr(viewRejectionReasonData.version)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewRejectionReasonData(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                {tr("Reviewer Feedback & Required Modifications")}
              </p>
              <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl text-xs sm:text-sm text-slate-900 leading-relaxed font-normal whitespace-pre-wrap break-words">
                {tr(viewRejectionReasonData.reason)}
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewRejectionReasonData(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {tr("Close")}
              </button>
            </div>
          </div>
        </div>
      )}
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={() => !isDeletingDrawing && setDrawingToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
                    {tr("Delete Drawing")}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                    {tr("Are you sure you want to delete drawing ")}<strong className="text-[hsl(var(--foreground))]">"{drawingToDelete.title || drawingToDelete.name || tr("this drawing")}"</strong>{tr("? This will remove all revision versions.")}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
                <button
                  type="button"
                  disabled={isDeletingDrawing}
                  onClick={() => setDrawingToDelete(null)}
                  className="px-3 py-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition"
                >
                  {tr("Cancel")}
                </button>
                <button
                  type="button"
                  disabled={isDeletingDrawing}
                  onClick={handleDeleteDrawing}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeletingDrawing ? tr("Deleting...") : tr("Delete Drawing")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Order Modal */}
      <InteriorCreateConfirmOrderModal
        isOpen={isConfirmOrderModalOpen}
        onClose={() => setIsConfirmOrderModalOpen(false)}
        lead={lead}
        onSuccess={fetchData}
      />
    </InteriorShell>
  );
}
