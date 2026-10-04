'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { InteriorShell } from '@/components/interior/InteriorShell';
import { useInteriorAuthGuard } from '@/lib/useInteriorAuthGuard';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { useConfirm } from '@/providers/ConfirmContext';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Mail,
  Building,
  DollarSign,
  Activity,
  Plus,
  MessageSquare,
  X,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Ruler,
  PenTool,
  UploadCloud,
  File as FileIcon,
  Image as ImageIcon,
  Calculator,
  FileText,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  DoorOpen,
  Maximize2,
  Columns,
  Zap,
  Droplets,
  Wind,
  Armchair,
  AlertTriangle,
  Layers,
  Palette,
  Sliders,
  Sun,
  Sparkles,
  Box,
  Archive,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Copy,
  Check,
  CalendarCheck,
  Clock,
  PhoneCall,
  Frown,
  History,
  Share2,
  Globe,
  Send,
  CheckCircle,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { exportBoqToExcel } from '@/lib/exportBoqExcel';
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
import { InteriorDrawingConfirmApproveModal } from '@/features/interior-new/components/crm/modals/InteriorDrawingConfirmApproveModal';
import { InteriorUploadRevisionModal } from '@/features/interior-new/components/crm/modals/InteriorUploadRevisionModal';
import { InteriorSendDrawingForApprovalModal } from '@/features/interior-new/components/crm/modals/InteriorSendDrawingForApprovalModal';
import { Interior3DViewerModal } from '@/features/interior-new/components/crm/modals/Interior3DViewerModal';
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
import { InteriorLeadFollowUpsTab } from '@/features/interior-new/components/crm/InteriorLeadFollowUpsTab';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function Lead360View() {
  const { currencySymbol, currencyCode, formatExactCurrency, formatCurrency } = useCurrency();
  const checked = useInteriorAuthGuard();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { confirm, prompt } = useConfirm();
  const queryClient = useQueryClient();

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
      toast.success(`Drawing "${file.title || file.name || 'Drawing'}" approved successfully! Live to client.`);
      setIsConfirmApproveModalOpen(false);
      setSelectedDrawingForConfirmApprove(null);
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

  // 1. Lead Query with instant placeholder from CRM Leads List cache
  const {
    data: leadData,
    isLoading: isLeadQueryLoading,
    refetch: refetchLead,
  } = useQuery({
    queryKey: ['crm-lead', params.id],
    queryFn: async () => {
      const res = await interiorCrmService.getCustomerById(params.id as string);
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
    queryFn: async () => {
      const res = await interiorCrmService.getActivities(params.id as string);
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

  const fetchData = async () => {
    queryClient.invalidateQueries({ queryKey: ['crm-lead', params.id] });
    queryClient.invalidateQueries({ queryKey: ['crm-lead-activities', params.id] });
    await Promise.all([refetchLead(), refetchActivities()]);
  };

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
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to log activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuotationByIndex = async (idxToDelete: number) => {
    if (!lead || !params.id) return;
    const q = lead?.quotations?.[idxToDelete];
    const quoteTitle = q?.title || `Quotation ${idxToDelete + 1}`;
    const quoteAmount = q?.grandTotal || 0;

    const ok = await confirm({
      title: `Delete ${quoteTitle}`,
      message: `Are you sure you want to delete "${quoteTitle}" (${currencySymbol} ${quoteAmount.toLocaleString()})? This action cannot be undone.`,
      confirmText: 'Delete Quotation',
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

      toast.success(`${quoteTitle} deleted successfully.`);
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
      toast.error(err.response?.data?.error || err.message || 'Failed to delete quotation');
    }
  };


  const [activeTab, setActiveTab] = useState<'overview' | 'followups' | 'site' | 'requirements' | 'designs' | 'boq' | 'quotations'>(() => {
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
        if (['followups', 'followup', 'follow-up'].includes(normalized)) return 'followups';
      }
    }
    return 'overview';
  });

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
      } else if (['followups', 'followup', 'follow-up'].includes(normalized)) {
        setActiveTab('followups');
      } else if (normalized === 'overview') {
        setActiveTab('overview');
      }
    }
  }, [searchParams]);

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
    const raw = lead.requirements || (lead as any).requirementDetails || (lead as any).clientRequirements || (lead as any).designRequirements;
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
    if (typeof raw === 'object' && raw !== null) {
      const roomsList = raw.rooms || raw.items || raw.list || raw.spaces;
      if (Array.isArray(roomsList) && roomsList.length > 0) {
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

      // Single requirements object fallback
      return [{
        roomName: 'General Project Requirements',
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
    return (
      <InteriorShell>
        <div className="p-8 text-rose-500 font-bold text-center">Lead not found.</div>
      </InteriorShell>
    );
  }

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
        const isUnlocked = currentStage >= 2 || normalizedRequirements.length > 0 || Boolean(lead?.requirements);
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
    { id: 'followups', label: 'Follow-ups', count: activities.filter(a => a.status === 'Pending').length },
    { id: 'site', label: 'Site Visits', count: lead?.siteMeasurements ? 1 : 0 },
    { id: 'requirements', label: 'Requirements', count: normalizedRequirements.length },
    { id: 'designs', label: '2D/3D Drawing', count: lead?.designFiles?.length || 0 },
    { id: 'boq', label: 'BOQ', count: lead?.boqs?.length || 0 },
    { id: 'quotations', label: 'Quotations', count: lead?.quotations?.length || 0 },
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
              title="Back to CRM Leads"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col gap-1 min-w-0 max-w-full">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h1 
                  className="text-base sm:text-lg md:text-xl font-black text-[hsl(var(--foreground))] tracking-tight truncate max-w-[200px] xs:max-w-[280px] sm:max-w-[420px]"
                  title={lead.name}
                >
                  {lead.name}
                </h1>
                <span className="font-mono bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border border-[hsl(var(--border))] shrink-0">
                  {lead.leadNumber || 'LD-XXXX'}
                </span>
                {lead.leadSource && (
                  <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded border border-[hsl(var(--border))] shrink-0">
                    {lead.leadSource}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                <a 
                  href={`tel:${lead.mobileNumber}`} 
                  className="inline-flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded border border-[hsl(var(--border))] transition-colors shrink-0"
                >
                  <Phone size={11} className="text-blue-500 shrink-0" /> {lead.mobileNumber}
                </a>
                {lead.email && (
                  <a 
                    href={`mailto:${lead.email}`} 
                    title={lead.email}
                    className="inline-flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded border border-[hsl(var(--border))] transition-colors min-w-0 max-w-[180px] sm:max-w-[240px] overflow-hidden"
                  >
                    <Mail size={11} className="text-purple-500 shrink-0" />
                    <span className="truncate min-w-0 flex-1">{lead.email}</span>
                  </a>
                )}
                {(lead.projectLocation || lead.city) && (
                  <div 
                    title={`Site Location: ${lead.projectLocation || lead.city}`}
                    onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                    className="inline-flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] font-medium bg-[hsl(var(--muted)/0.4)] px-2 py-0.5 rounded border border-[hsl(var(--border))] min-w-0 max-w-[220px] xs:max-w-[300px] sm:max-w-[420px] transition-colors group cursor-pointer"
                  >
                    <MapPin size={11} className="text-amber-500 shrink-0" />
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
                <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0", badgeColor)}>
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
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                  title="Open Live Project Workspace"
                >
                  <ExternalLink size={12} /> View Live Project
                </button>
              )
            ) : isLost ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-bold">
                  <Lock size={12} /> Lead Lost
                </span>
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg transition-all active:scale-95"
                  title="Delete Lead"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <>
                {['Under Quotation', 'Quotation Pending', 'Quotation Sent', 'Negotiation', 'Booking Pending'].includes(lead.status) && (
                  ((lead.quotations && lead.quotations.some((q: any) => q.status === 'Accepted' || q.status === 'Approved')) || lead.status === 'Booking Pending') && (
                    <button
                      onClick={() => setIsConvertToProjectOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                      title="Convert to Won Project"
                    >
                      <CheckCircle2 size={12} /> Convert to Project
                    </button>
                  )
                )}

                {['New Lead', 'Contacted'].includes(lead.status) &&
                  !hasFollowUp &&
                  !lead.siteMeasurements &&
                  (!lead.quotations || lead.quotations.length === 0) && (
                    <button
                      onClick={() => setIsFollowUpModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white"
                      title="Schedule Initial Follow-up"
                    >
                      <Calendar size={12} /> Follow-up
                    </button>
                  )}

                <button
                  onClick={() => setIsMarkAsLostOpen(true)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg transition-all active:scale-95"
                  title="Mark Lead as Lost"
                >
                  <X size={14} />
                </button>

                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-1.5 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-lg transition-all active:scale-95"
                  title="Edit Lead Details"
                >
                  <Pencil size={14} />
                </button>

                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg transition-all active:scale-95"
                  title="Delete Lead"
                >
                  <Trash2 size={14} />
                </button>
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
                <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">Lead Converted to Live Execution Project</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">This lead is linked to an active project and is preserved in read-only mode.</p>
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
                Open Project <ExternalLink size={12} />
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
                  <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">Lead Marked as Lost (Locked & Read-Only)</h3>
                  {lead.lostReason && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-500/20">
                      Reason: {lead.lostReason}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  {lead.remarks ? `"${lead.remarks}" — ` : ''}Preserved in read-only mode.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. HIGH DENSITY TAB NAVIGATION --- */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none touch-pan-x">
          {TABS.map((tab) => {
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
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]"
                  )}>
                    {tab.count}
                  </span>
                )}
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
                    <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Client Source</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-xs truncate mt-0.5">{lead.leadSource || 'Manual Entry'}</p>
                  </div>
                </div>
                <div className="bg-[hsl(var(--card))] p-3 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><Building size={15} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Property Scope</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-xs truncate mt-0.5">{lead.propertyType || 'Standard'}</p>
                  </div>
                </div>
                <div className="bg-[hsl(var(--card))] p-3 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0"><DollarSign size={15} /></span>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Est. Budget</p>
                    <p className="font-bold text-xs truncate mt-0.5 text-emerald-600 dark:text-emerald-400">
                      {lead.quotations?.[lead.quotations.length - 1]?.grandTotal
                        ? `${currencySymbol} ${lead.quotations[lead.quotations.length - 1].grandTotal.toLocaleString()}`
                        : lead.budgetRange || 'Pending'}
                    </p>
                  </div>
                </div>
                <div 
                  className="bg-[hsl(var(--card))] p-3 rounded-xl border border-[hsl(var(--border))] flex items-center gap-2.5 group cursor-pointer hover:border-amber-500/40 transition-all"
                  title={`Site Location: ${lead.projectLocation || lead.city || 'Not specified'}`}
                  onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                >
                  <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0"><MapPin size={15} /></span>
                  <div className="overflow-hidden min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider truncate">Location</p>
                    <p className="font-bold text-[hsl(var(--foreground))] text-xs truncate mt-0.5">{lead.projectLocation || lead.city || 'Not specified'}</p>
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
                          <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">Site & Project Location</h3>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                          title="Edit Location & Lead Details"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] rounded-lg p-3 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-0.5">
                            Full Site Address
                          </p>
                          <p className="text-xs font-semibold text-[hsl(var(--foreground))] leading-relaxed break-words">
                            {lead.projectLocation || lead.city || 'No specific site address provided yet.'}
                          </p>
                        </div>
                      </div>

                      {(lead.projectLocation || lead.city) && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[hsl(var(--border))]">
                          <button
                            type="button"
                            onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--foreground))] transition-all active:scale-95"
                          >
                            {copiedLocation ? (
                              <>
                                <Check size={11} className="text-emerald-500" /> Copied Address
                              </>
                            ) : (
                              <>
                                <Copy size={11} className="text-[hsl(var(--muted-foreground))]" /> Copy Address
                              </>
                            )}
                          </button>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.projectLocation || lead.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-[11px] font-bold text-blue-600 transition-all active:scale-95"
                          >
                            <ExternalLink size={11} /> Open in Maps
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
                          <h3 className="text-xs font-bold text-[hsl(var(--foreground))]">Lead & Contact Info</h3>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                          <User size={12} className="text-blue-500" /> Full Name
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] break-words min-w-0">{lead.name}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                          <Phone size={12} className="text-emerald-500" /> Mobile
                        </span>
                        <a href={`tel:${lead.mobileNumber}`} className="font-bold text-blue-600 hover:underline break-all min-w-0">
                          {lead.mobileNumber}
                        </a>
                      </div>

                      {lead.email && (
                        <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                          <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                            <Mail size={12} className="text-purple-500" /> Email
                          </span>
                          <a href={`mailto:${lead.email}`} className="font-bold text-blue-600 hover:underline break-all min-w-0">
                            {lead.email}
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                          <Building size={12} className="text-indigo-500" /> Property Type
                        </span>
                        <span className="font-bold text-[hsl(var(--foreground))] break-words min-w-0">{lead.propertyType || 'Standard'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border)/0.6)]">
                        <span className="text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-1.5 shrink-0">
                          <DollarSign size={12} className="text-amber-500" /> Budget / Quote
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 break-words min-w-0">
                          {lead.quotations?.[lead.quotations.length - 1]?.grandTotal
                            ? `${currencySymbol} ${lead.quotations[lead.quotations.length - 1].grandTotal.toLocaleString()}`
                            : lead.budgetRange || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Activity Timeline (7 cols) */}
                <div className="lg:col-span-7 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-[hsl(var(--border))]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-500" /> Activity Timeline
                    </h3>
                    {!isReadOnly && (
                      <button
                        onClick={() => setIsActivityModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        <Plus size={12} /> Log Note
                      </button>
                    )}
                  </div>
                  
                  <div className="relative border-l-2 border-[hsl(var(--border))] ml-2 pl-3 sm:pl-4 space-y-3 sm:space-y-3.5">
                    {activities.length === 0 ? (
                      <div className="py-8 flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] mb-2">
                          <MessageSquare size={18} />
                        </div>
                        <p className="text-xs font-bold text-[hsl(var(--foreground))]">No activities logged</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Keep track of calls, meetings, and notes here.</p>
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
                                  "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                                  isActOverdue
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black"
                                    : act.status === 'Pending'
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                )}>
                                  {act.type} {act.status === 'Pending' && (isActOverdue ? '• Overdue' : '• Scheduled')}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-semibold",
                                  isActOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-[hsl(var(--muted-foreground))]"
                                )}>
                                  {act.status === 'Pending' 
                                    ? `${isActOverdue ? 'Overdue: ' : 'Due: '}${new Date(act.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` 
                                    : new Date(act.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                                  }
                                </span>
                              </div>
                              <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed break-words whitespace-pre-wrap">{act.remarks}</p>
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[hsl(var(--border))]">
                                <div className="w-4 h-4 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[8px] font-bold text-[hsl(var(--muted-foreground))] shrink-0">
                                  {initial}
                                </div>
                                <p className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] truncate">
                                  {act.status === 'Pending' ? 'Scheduled by' : 'Logged by'} <span className="text-[hsl(var(--foreground))] font-semibold">{userName}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
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
                onSendToSiteVisit={() => setIsSendToSiteVisitOpen(true)}
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
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Site Visit Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
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
                                Site Visit Schedule Overdue
                              </h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                                <Clock size={10} />
                                {getSiteVisitOverdueText(siteVisitInfo.scheduledDate)}
                              </span>
                            </div>
                            <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                              Scheduled for{' '}
                              <strong>
                                {new Date(siteVisitInfo.scheduledDate).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </strong>{' '}
                              has passed without survey measurements recorded.
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
                              <History size={12} /> History ({siteVisitActivities.length})
                            </button>
                          )}
                          {!isReadOnly && (
                            <button
                              onClick={() => setIsSendToSiteVisitOpen(true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                            >
                              <Calendar size={12} /> Reschedule Visit
                            </button>
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
                                Site Visit Briefing & Details
                              </h2>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded border shrink-0",
                                lead.siteMeasurements
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : isSiteVisitOverdue
                                  ? "bg-rose-500/15 text-rose-600 border-rose-500/30 font-black"
                                  : "bg-purple-500/10 text-purple-600 border-purple-500/20"
                              )}>
                                {lead.siteMeasurements ? "Survey Completed" : isSiteVisitOverdue ? "Survey Overdue" : "Survey Pending"}
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
                              <History size={12} className="text-purple-600" /> History ({siteVisitActivities.length})
                            </button>
                          )}

                          {!isReadOnly && (
                            <>
                              {lead.siteMeasurements ? (
                                <>
                                  <button
                                    onClick={() => setIsSiteVisitModalOpen(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Pencil size={12} /> Edit Measurements
                                  </button>
                                  {['Under Site Visit', 'Measurement Done'].includes(lead.status) && (
                                    <button
                                      onClick={() => setIsSendToReqOpen(true)}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                    >
                                      Pass to Requirements <ArrowRight size={12} />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setIsSendToSiteVisitOpen(true)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Calendar size={12} /> Reschedule
                                  </button>
                                  <button
                                    onClick={() => setIsSiteVisitModalOpen(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Plus size={13} /> Log Measurements
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Instructions Note Box */}
                      <div className="bg-purple-500/[0.04] border border-purple-500/20 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <MessageSquare size={12} className="text-purple-600" />
                            Site Visit Instructions
                          </p>
                          {siteVisitInfo.activity?.createdAt && (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                              Added {new Date(siteVisitInfo.activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed whitespace-pre-wrap break-words bg-[hsl(var(--card))] p-2.5 rounded border border-purple-500/15">
                          {siteVisitInfo.note || 'Lead passed to Site Visit and assigned to site team.'}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[hsl(var(--muted-foreground))] font-medium">
                          <span>Assigned Member: <strong className="text-[hsl(var(--foreground))]">{siteVisitInfo.assignedName}</strong></span>
                          {siteVisitInfo.activity?.user && (
                            <span>Scheduled By: <strong className="text-[hsl(var(--foreground))]">{siteVisitInfo.schedulerName}</strong></span>
                          )}
                        </div>
                      </div>

                      {/* Key Metadata Badges */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className={cn(
                          "rounded-lg p-2.5 border",
                          isSiteVisitOverdue ? "bg-rose-500/10 border-rose-500/30" : "bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]"
                        )}>
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} className={isSiteVisitOverdue ? "text-rose-500" : "text-purple-500"} /> Schedule
                          </p>
                          <p className={cn("font-bold text-xs mt-0.5 truncate", isSiteVisitOverdue ? "text-rose-600 font-extrabold" : "text-[hsl(var(--foreground))]")}>
                            {siteVisitInfo.scheduledDate
                              ? new Date(siteVisitInfo.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : 'Not scheduled'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <User size={11} className="text-blue-500" /> Assigned Member
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {siteVisitInfo.assignedName}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-emerald-500" /> Property Scope
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.propertyType || 'Residential'}
                          </p>
                        </div>

                        <div 
                          className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))] group cursor-pointer hover:border-amber-500/40 transition-all"
                          onClick={() => handleCopyLocation(lead.projectLocation || lead.city)}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={11} className="text-amber-500" /> Site Location
                            </p>
                            <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                              {copiedLocation ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.projectLocation || lead.city || 'Pending'}
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
                            Ready for On-Site Survey & Measurements
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            Capture room dimensions, ceiling heights, door/window openings, MEP points, and site photos.
                          </p>
                        </div>
                        {!isReadOnly && (
                          <button 
                            onClick={() => setIsSiteVisitModalOpen(true)} 
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={14} /> Log Site Visit & Measurements
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* 4-Card Structured Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                          
                          {/* Card 1: Spatial Dimensions */}
                          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-3 min-w-0">
                            <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                                <Maximize2 size={14} className="text-purple-500" />
                                Spatial Dimensions
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                Spatial
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Carpet Area</p>
                                <p className="font-bold text-sm text-[hsl(var(--foreground))] mt-0.5">
                                  {lead.siteMeasurements.carpetArea || '—'} <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">Sq.Ft</span>
                                </p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Ceiling Height</p>
                                <p className="font-bold text-sm text-[hsl(var(--foreground))] mt-0.5">
                                  {lead.siteMeasurements.ceilingHeight || '—'} <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">Ft</span>
                                </p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2.5 border border-[hsl(var(--border))] col-span-2">
                                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Room Dimensions</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5">
                                  {lead.siteMeasurements.roomDimensions || 'Not recorded'}
                                </p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2.5 border border-[hsl(var(--border))] col-span-2">
                                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Rooms to Design</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5">
                                  {lead.siteMeasurements.rooms || 'Not specified'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Card 2: Openings & Structure */}
                          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-3 min-w-0">
                            <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                                <DoorOpen size={14} className="text-blue-500" />
                                Openings & Structure
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                Structure
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-xs">
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Door Dimensions</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.doorDimensions || 'Not recorded'}</p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Window Dimensions</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.windowDimensions || 'Not recorded'}</p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Wall / Column Dimensions</p>
                                <p className="font-semibold text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.columnBeamDimensions || lead.siteMeasurements.wallThickness || 'Not recorded'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Card 3: MEP & Utilities */}
                          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-3 min-w-0">
                            <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                                <Zap size={14} className="text-amber-500" />
                                MEP & Utility Services
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                MEP
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-xs">
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1"><Zap size={10} /> Electrical Points</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.electricalPoints || 'None recorded'}</p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-1"><Droplets size={10} /> Plumbing Points</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.plumbingPoints || 'None recorded'}</p>
                              </div>
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1"><Wind size={10} /> AC Locations</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.acLocations || 'None recorded'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Card 4: Constraints & Notes */}
                          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-3 min-w-0">
                            <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                                <Armchair size={14} className="text-emerald-500" />
                                Furniture & Constraints
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                Notes
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 text-xs">
                              <div className="bg-[hsl(var(--muted)/0.35)] rounded-lg p-2 border border-[hsl(var(--border))]">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Existing Furniture</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.furnitureDimensions || 'None recorded'}</p>
                              </div>
                              <div className="bg-rose-500/5 rounded-lg p-2 border border-rose-500/20">
                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Site Constraints</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.siteConstraints || 'None reported'}</p>
                              </div>
                              <div className="bg-purple-500/5 rounded-lg p-2 border border-purple-500/20">
                                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Additional Site Notes</p>
                                <p className="font-medium text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.siteMeasurements.notes || 'No notes added'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Photos Section */}
                        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-[hsl(var(--border))]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5">
                              <ImageIcon size={14} className="text-emerald-500" />
                              Site Photos & Visual Records
                            </h3>
                            <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded border border-[hsl(var(--border))]">
                              {lead.sitePhotos?.length || 0} Photos
                            </span>
                          </div>

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
                                  <img src={photo} alt={`Site photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                                  </div>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="py-6 flex flex-col items-center justify-center border border-dashed border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted)/0.2)] text-center">
                              <ImageIcon className="w-6 h-6 text-[hsl(var(--muted-foreground))] mb-1 opacity-60" />
                              <p className="text-xs font-bold text-[hsl(var(--foreground))]">No Site Photos Uploaded</p>
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

          {/* TAB: REQUIREMENTS */}
          {activeTab === 'requirements' && (
            <motion.div key="requirements" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-3.5 sm:space-y-4">
              {getTabLockState('requirements').isLocked ? (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 mb-3 border border-amber-500/20">
                    <Lock size={22} />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Requirements Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    Complete the Site Visit & Measurements phase first to unlock requirement logging.
                  </p>
                </div>
              ) : (() => {
                const hasRequirements = Boolean(normalizedRequirements && normalizedRequirements.length > 0);
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
                                Requirements Session Overdue
                              </h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                                <Clock size={10} />
                                {getReqOverdueText(requirementsInfo.scheduledDate)}
                              </span>
                            </div>
                            <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                              Discussion session for{' '}
                              <strong>
                                {new Date(requirementsInfo.scheduledDate).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </strong>{' '}
                              has passed without design specifications recorded.
                            </p>
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => setIsSendToReqOpen(true)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shrink-0"
                          >
                            <Calendar size={12} /> Reschedule Session
                          </button>
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
                                Requirements Briefing & Specifications
                              </h2>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded border shrink-0",
                                hasRequirements
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : isReqOverdue
                                  ? "bg-rose-500/15 text-rose-600 border-rose-500/30 font-black"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              )}>
                                {hasRequirements ? `Configured (${normalizedRequirements.length} ${normalizedRequirements.length === 1 ? 'Space' : 'Spaces'})` : "Discussion Pending"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasRequirements ? (
                              <>
                                <button
                                  onClick={() => setIsReqModalOpen(true)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                >
                                  <Pencil size={12} /> Edit Requirements
                                </button>
                                {['Under Requirement', 'Requirement Completed'].includes(lead.status) && (
                                  <button
                                    onClick={() => setIsSendToDrawingOpen(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    Pass to 2D/3D Drawing <ArrowRight size={12} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setIsSendToReqOpen(true)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                >
                                  <Calendar size={12} /> Reschedule Session
                                </button>
                                <button
                                  onClick={() => setIsReqModalOpen(true)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                                >
                                  <Plus size={13} /> Add Requirements
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Requirement Scope Notes */}
                      {requirementsInfo.note && (
                        <div className="bg-emerald-500/[0.04] border border-emerald-500/20 rounded-lg p-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <MessageSquare size={12} className="text-emerald-600" />
                            Requirement Handover & Scope Notes
                          </p>
                          <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed bg-[hsl(var(--card))] border border-emerald-500/15 p-2.5 rounded whitespace-pre-wrap">
                            {requirementsInfo.note}
                          </p>
                        </div>
                      )}

                      {/* 4 Metadata Badges Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={11} className="text-emerald-500" /> Schedule
                          </p>
                          <p className={cn("font-bold text-xs mt-0.5 truncate", isReqOverdue ? "text-rose-600 font-black" : "text-[hsl(var(--foreground))]")}>
                            {requirementsInfo.scheduledDate
                              ? new Date(requirementsInfo.scheduledDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : 'Not scheduled'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <User size={11} className="text-blue-500" /> Consultant
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {requirementsInfo.assignedName}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <DollarSign size={11} className="text-amber-500" /> Target Budget
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.budgetRange || (lead.budget ? `${currencySymbol} ${Number(lead.budget).toLocaleString()}` : 'Not specified')}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-purple-500" /> Property Scope
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.propertyType || lead.projectType || 'Residential'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Top Overview Metric Cards */}
                    {hasRequirements && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                            <DollarSign size={16} />
                          </div>
                          <div className="overflow-hidden min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] truncate">Estimated Budget</p>
                            <p className="text-xs font-bold text-[hsl(var(--foreground))] truncate mt-0.5">
                              {lead.budgetRange || (lead.budget ? `${currencySymbol} ${Number(lead.budget).toLocaleString()}` : 'Not specified')}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <Building size={16} />
                          </div>
                          <div className="overflow-hidden min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] truncate">Interior Type</p>
                            <p className="text-xs font-bold text-[hsl(var(--foreground))] truncate mt-0.5">
                              {normalizedRequirements[0]?.interiorType || lead.propertyType || 'Residential'}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                            <Palette size={16} />
                          </div>
                          <div className="overflow-hidden min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] truncate">Primary Style</p>
                            <p className="text-xs font-bold text-[hsl(var(--foreground))] truncate mt-0.5">
                              {normalizedRequirements.find((r: any) => r.designStyle)?.designStyle || normalizedRequirements[0]?.theme || 'Custom Style'}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <Layers size={16} />
                          </div>
                          <div className="overflow-hidden min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] truncate">Configured Spaces</p>
                            <p className="text-xs font-bold text-[hsl(var(--foreground))] truncate mt-0.5">
                              {normalizedRequirements.length} {normalizedRequirements.length === 1 ? 'Room / Area' : 'Rooms / Areas'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Global Scope / Timeline / Special Requests Banner if present */}
                    {(globalScopeOfWork || globalTimeline || globalSpecialRequests) && (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 space-y-2.5">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5 pb-2 border-b border-[hsl(var(--border))]">
                          <Sliders size={13} className="text-blue-500" /> Overall Project Directives & Scope
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          {globalScopeOfWork && (
                            <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">Scope of Work</span>
                              <span className="font-semibold text-[hsl(var(--foreground))] mt-0.5 block">{globalScopeOfWork}</span>
                            </div>
                          )}
                          {globalTimeline && (
                            <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">Target Timeline</span>
                              <span className="font-semibold text-[hsl(var(--foreground))] mt-0.5 block">{globalTimeline}</span>
                            </div>
                          )}
                          {globalSpecialRequests && (
                            <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">Special Requests</span>
                              <span className="font-semibold text-[hsl(var(--foreground))] mt-0.5 block">{globalSpecialRequests}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Room by Room Cards */}
                    {!hasRequirements ? (
                      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 text-center flex flex-col items-center space-y-3">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                          <PenTool size={24} />
                        </div>
                        <div className="max-w-md space-y-0.5">
                          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
                            Ready for Detailed Requirements Logging
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            Capture room-by-room functional needs, spatial usage, MEP requirements, styles, and materials.
                          </p>
                        </div>
                        {!isReadOnly && (
                          <button 
                            onClick={() => setIsReqModalOpen(true)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={14} /> Add Design Requirements
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {normalizedRequirements.map((req: any, index: number) => {
                          const hasFunctional = !!(req.roomUsage || req.furnitureRequirements || req.storage || req.electricalPoints || req.lightingRequirements || req.plumbingRequirements || req.circulation || req.dimensions);
                          const hasAesthetic = !!(req.designStyle || req.theme || req.colours || req.materials || req.flooring || req.ceiling || req.wallFinishes || req.furnitureStyle);

                          // Find any custom extra fields not covered by standard keys
                          const standardKeys = new Set([
                            'roomName', 'room', 'name', 'room_name', 'roomTitle',
                            'interiorType', 'type',
                            'designStyle', 'style', 'theme', 'design_style',
                            'description', 'notes', 'remarks', 'instructions', 'specialRequests', 'clientNotes',
                            'roomUsage', 'usage', 'purpose',
                            'furnitureRequirements', 'furniture', 'furniture_requirements', 'furnitureSpecs',
                            'storage', 'storageRequirements', 'wardrobes',
                            'electricalPoints', 'electrical', 'power_points', 'powerPoints',
                            'lightingRequirements', 'lighting', 'lighting_requirements', 'lights',
                            'plumbingRequirements', 'plumbing', 'plumbing_requirements', 'waterPoints',
                            'circulation', 'clearance', 'traffic_flow',
                            'colours', 'colors', 'colorPalette', 'colour_palette', 'color_palette', 'palette',
                            'materials', 'materialSpecs', 'finishes',
                            'flooring', 'flooringType', 'floor',
                            'ceiling', 'falseCeiling', 'ceiling_type', 'ceilingHeight',
                            'wallFinishes', 'walls', 'wall_finishes', 'wallDecor',
                            'furnitureStyle', 'furnishing_style',
                            'dimensions', 'carpetArea', 'area', 'size',
                            'budget', 'estimatedBudget', 'cost',
                            'timeline', 'duration',
                            'scopeOfWork', 'scope',
                            '_id', 'id', '__v'
                          ]);

                          const extraEntries = Object.entries(req).filter(([k, v]) => {
                            if (standardKeys.has(k)) return false;
                            if (v === null || v === undefined || v === '') return false;
                            if (typeof v === 'object' && Object.keys(v).length === 0) return false;
                            return true;
                          });

                          return (
                            <div key={index} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 sm:p-4 space-y-3 hover:border-emerald-500/30 transition-colors">
                              {/* Room Header */}
                              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[hsl(var(--border))]">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <h3 className="text-xs sm:text-sm font-bold text-[hsl(var(--foreground))]">{req.roomName}</h3>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {req.dimensions && (
                                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Maximize2 size={10} /> {req.dimensions}
                                    </span>
                                  )}
                                  {req.budget && (
                                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                      <DollarSign size={10} /> {req.budget}
                                    </span>
                                  )}
                                  {req.interiorType && (
                                    <span className="text-[10px] font-bold uppercase bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] px-2 py-0.5 rounded">
                                      {req.interiorType}
                                    </span>
                                  )}
                                  {req.designStyle && (
                                    <span className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Palette size={10} /> {req.designStyle}
                                    </span>
                                  )}
                                  {req.theme && req.theme !== req.designStyle && (
                                    <span className="text-[10px] font-bold uppercase bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Sparkles size={10} /> {req.theme}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Specific Instructions / Description */}
                              {req.description && (
                                <div className="bg-emerald-500/[0.04] border border-emerald-500/20 rounded-lg p-2.5">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
                                    <Sparkles size={11} className="text-emerald-600" /> Room Instructions & Notes
                                  </p>
                                  <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed whitespace-pre-wrap">
                                    {req.description}
                                  </p>
                                </div>
                              )}

                              {/* 2-Col Specs: Functional & Aesthetic */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {/* Functional Column */}
                                <div className="bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] rounded-lg p-3 space-y-2">
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5 pb-1 border-b border-[hsl(var(--border))]">
                                    <Sliders size={12} className="text-emerald-500" /> Functional Requirements
                                  </h4>
                                  <div className="space-y-1.5 text-xs">
                                    {req.roomUsage && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Room Usage</span>
                                        <span className="font-semibold text-[hsl(var(--foreground))]">{req.roomUsage}</span>
                                      </div>
                                    )}
                                    {req.furnitureRequirements && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Furniture Requirements</span>
                                        <span className="font-semibold text-[hsl(var(--foreground))]">{req.furnitureRequirements}</span>
                                      </div>
                                    )}
                                    {req.storage && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Storage & Wardrobes</span>
                                        <span className="font-semibold text-[hsl(var(--foreground))]">{req.storage}</span>
                                      </div>
                                    )}
                                    {req.electricalPoints && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-amber-500 flex items-center gap-1"><Zap size={10} /> Electrical Points</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.electricalPoints}</span>
                                      </div>
                                    )}
                                    {req.lightingRequirements && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-amber-500 flex items-center gap-1"><Sun size={10} /> Lighting</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.lightingRequirements}</span>
                                      </div>
                                    )}
                                    {req.plumbingRequirements && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-cyan-500 flex items-center gap-1"><Droplets size={10} /> Plumbing</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.plumbingRequirements}</span>
                                      </div>
                                    )}
                                    {req.circulation && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Circulation & Clearance</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.circulation}</span>
                                      </div>
                                    )}
                                    {req.dimensions && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Dimensions / Carpet Area</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.dimensions}</span>
                                      </div>
                                    )}
                                    {!hasFunctional && (
                                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic p-1">No functional requirements specified.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Aesthetic Column */}
                                <div className="bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] rounded-lg p-3 space-y-2">
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5 pb-1 border-b border-[hsl(var(--border))]">
                                    <Palette size={12} className="text-purple-500" /> Aesthetic & Finishes
                                  </h4>
                                  <div className="space-y-1.5 text-xs">
                                    {req.designStyle && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Design Style</span>
                                        <span className="font-semibold text-[hsl(var(--foreground))]">{req.designStyle}</span>
                                      </div>
                                    )}
                                    {req.theme && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Theme</span>
                                        <span className="font-semibold text-[hsl(var(--foreground))]">{req.theme}</span>
                                      </div>
                                    )}
                                    {req.colours && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Colours & Palette</span>
                                        <span className="font-semibold text-[hsl(var(--foreground))]">{req.colours}</span>
                                      </div>
                                    )}
                                    {req.materials && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Materials & Finishes</span>
                                        <span className="font-semibold text-[hsl(var(--foreground))]">{req.materials}</span>
                                      </div>
                                    )}
                                    {req.flooring && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Flooring</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.flooring}</span>
                                      </div>
                                    )}
                                    {req.ceiling && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Ceiling & False Ceiling</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.ceiling}</span>
                                      </div>
                                    )}
                                    {req.wallFinishes && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Wall Finishes</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.wallFinishes}</span>
                                      </div>
                                    )}
                                    {req.furnitureStyle && (
                                      <div className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">Furniture Style</span>
                                        <span className="font-medium text-[hsl(var(--foreground))]">{req.furnitureStyle}</span>
                                      </div>
                                    )}
                                    {!hasAesthetic && (
                                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic p-1">No aesthetic requirements specified.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Additional Custom Specifications if any exist */}
                              {extraEntries.length > 0 && (
                                <div className="bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg p-3 space-y-2">
                                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-1.5 pb-1 border-b border-[hsl(var(--border))]">
                                    <Box size={12} className="text-indigo-500" /> Additional Specifications & Details
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                    {extraEntries.map(([k, v]) => (
                                      <div key={k} className="p-1.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.7)]">
                                        <span className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] block">
                                          {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                                        </span>
                                        <span className="font-semibold text-[hsl(var(--foreground))]">
                                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">2D & 3D Drawings Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    Complete the Client Requirements phase first to unlock drawing uploads.
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
                                2D & 3D Design Drawings & Models
                              </h2>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded border shrink-0",
                                headerBadge.className
                              )}>
                                {headerBadge.text}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasDesignFiles ? (
                              <>
                                <button
                                  onClick={() => setIsDesignModalOpen(true)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                >
                                  <Plus size={13} /> Upload More
                                </button>
                                {['Under Drawing', 'Design Approved'].includes(lead.status) && (
                                  <button
                                    onClick={() => {
                                      if (!allDrawingsApproved) {
                                        if (draftDrawingsCount > 0) {
                                          toast.error('Cannot pass to BOQ: Drawing is in Draft and requires internal approval.');
                                        } else if (pendingDrawingsCount > 0) {
                                          toast.error('Cannot pass to BOQ: Drawing approval is still pending.');
                                        } else if (rejectedDrawingsCount > 0) {
                                          toast.error('Cannot pass to BOQ: Some drawings are rejected.');
                                        } else {
                                          toast.error('Cannot pass to BOQ: All drawings must be approved first.');
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
                                    Pass to BOQ <ArrowRight size={12} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => setIsDesignModalOpen(true)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                              >
                                <Plus size={13} /> Upload Drawings
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Share Portal Ribbon */}
                      {hasDesignFiles && (
                        <div className="bg-indigo-500/[0.04] border border-indigo-500/20 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Globe size={14} className="text-indigo-600 shrink-0" />
                            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Client View-Only Portal</span>
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.2 rounded border",
                              lead.shareSettings?.isPublic
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                              {lead.shareSettings?.isPublic ? 'Active' : 'Unpublished'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {lead.shareSettings?.isPublic && lead.shareSettings?.shareToken && (
                              <a
                                href={`/share/drawing/${lead.shareSettings.shareToken}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded text-[11px] font-bold"
                              >
                                <ExternalLink size={11} /> Preview
                              </a>
                            )}
                            <button
                              onClick={() => setIsShareModalOpen(true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold active:scale-95"
                            >
                              <Share2 size={11} /> {lead.shareSettings?.isPublic ? 'Share Link' : 'Generate Link'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <User size={11} className="text-purple-500" /> Designer
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {drawingInfo.assignedName}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Palette size={11} className="text-emerald-500" /> Style
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.requirements?.find((r: any) => r.designStyle)?.designStyle || lead.requirements?.[0]?.theme || 'Custom Style'}
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Layers size={11} className="text-cyan-500" /> Summary
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {twoDFiles.length} 2D • {threeDFiles.length} 3D
                          </p>
                        </div>

                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1">
                            <Building size={11} className="text-blue-500" /> Scope
                          </p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate">
                            {lead.propertyType || 'Execution'}
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
                            Ready for 2D & 3D Drawing Uploads
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            Upload 2D layouts (Floor plans, MEP) and 3D models/photorealistic renders.
                          </p>
                        </div>
                        {!isReadOnly && (
                          <button 
                            onClick={() => setIsDesignModalOpen(true)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={14} /> Upload Drawings
                          </button>
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
                            <Layers size={12} /> 2D Layouts ({twoDFiles.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setDesignSubTab('3d')}
                            className={cn(
                              "px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                              designSubTab === '3d' ? "bg-purple-600 text-white" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                            )}
                          >
                            <Box size={12} /> 3D Models ({threeDFiles.length})
                          </button>
                        </div>

                        {/* File Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {(designSubTab === '2d' ? twoDFiles : threeDFiles).map((file: any, index: number) => {
                            const type = file.fileType || detectFileType(file.name);
                            const badge = getFileBadgeInfo(file.name, file.category || (designSubTab === '2d' ? '2D' : '3D'));
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
                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  ) : type === 'pdf' ? (
                                    <FileText size={32} />
                                  ) : type === 'cad' ? (
                                    <Layers size={32} />
                                  ) : type === '3d-model' ? (
                                    <Box size={32} />
                                  ) : (
                                    <FileIcon size={32} />
                                  )}

                                  <div className="absolute top-2 left-2 flex items-center gap-1">
                                    <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase", badge.color)}>
                                      {badge.label}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">
                                      v{versionNum}
                                    </span>
                                  </div>

                                  <div className="absolute top-2 right-2">
                                    <span className={cn(
                                      "text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white",
                                      isApproved ? "bg-emerald-600" : isPendingApproval ? "bg-amber-500" : isDrawingRejected ? "bg-rose-500" : "bg-slate-600"
                                    )}>
                                      {isApproved ? "Approved" : isPendingApproval ? "Pending" : isDrawingRejected ? "Rejected" : "Draft"}
                                    </span>
                                  </div>
                                </div>

                                <div className="p-2.5 flex flex-col flex-1 justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate" title={file.title || file.name}>
                                      {file.title || file.name}
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))] flex-wrap">
                                      {file.roomTag && (
                                        <span className="font-bold text-emerald-600 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                          {file.roomTag}
                                        </span>
                                      )}
                                      {file.uploadedAt && <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>}
                                    </div>

                                    {approvalStatus === 'internally_rejected' && rejectionReason && (
                                      <div className="mt-1.5 p-1 bg-rose-500/10 border border-rose-500/20 rounded text-[9px] text-rose-700 dark:text-rose-300 line-clamp-1">
                                        <strong>Rejected:</strong> {rejectionReason}
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
                                              className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 rounded text-[9px] font-bold"
                                            >
                                              <Send size={9} className="inline mr-0.5" /> Send to Approval
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
                                                className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded text-[9px] font-bold cursor-pointer"
                                              >
                                                Approve
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSelectedDrawingForApproval({ ...file, initialAction: 'reject' });
                                                  setIsApprovalModalOpen(true);
                                                }}
                                                className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded text-[9px] font-bold"
                                              >
                                                Reject
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
                                              className="px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded text-[9px] font-bold"
                                            >
                                              + Rev
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
                                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600"
                                          title="Delete"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/interior-new/crm/leads/${params.id}/drawings/${encodeURIComponent(file._id || file.id || file.title || file.name)}`)}
                                        className="p-1 px-1.5 rounded bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] flex items-center gap-0.5 text-[9px] font-bold"
                                      >
                                        <Eye size={11} />
                                        <span>View</span>
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
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">BOQ Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    Complete and approve drawings to unlock BOQ creation and itemized estimations.
                  </p>
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
                                Bill of Quantities (BOQ) & Estimations
                              </h2>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded border shrink-0",
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
                                  ? "✓ BOQ Approved"
                                  : isBoqPending
                                  ? "⏳ Approval Pending"
                                  : isBoqRejected
                                  ? "✕ Changes Requested"
                                  : hasBoqs
                                  ? `BOQ Draft (v${activeBoq?.version || activeBoqIndex + 1})`
                                  : "Pending"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isBoqLocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] text-xs font-bold">
                                <Lock size={11} /> {isLost ? 'Locked (Lost)' : 'Locked (Approved)'}
                              </span>
                            ) : hasBoqs ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingBoqIndex(activeBoqIndex);
                                    setIsBoqModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                >
                                  <Pencil size={12} /> Edit BOQ
                                </button>
                                {isBoqApproved && (
                                  <button
                                    onClick={() => {
                                      setEditingBoqIndex(null);
                                      setIsBoqModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-bold transition-all active:scale-95"
                                  >
                                    <Plus size={13} /> New Version
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setBoqIndexToDelete(activeBoqIndex);
                                    setIsDeleteBoqModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                  title="Delete Active BOQ Version"
                                >
                                  <Trash2 size={12} /> Delete
                                </button>

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
                                  title="Export Bill of Quantities to Excel (.xlsx)"
                                >
                                  <FileSpreadsheet size={13} /> Export Excel
                                </button>

                              

                              

                                {['Under BOQ Creation', 'Design Approved', 'Under Drawing'].includes(lead.status) && isBoqApproved && (
                                  <button
                                    onClick={() => setIsSendToQuotationsOpen(true)}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                                    title="Pass to Quotation Phase"
                                  >
                                    Pass to Quotation <ArrowRight size={12} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => setIsBoqModalOpen(true)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                              >
                                <Plus size={13} /> Create BOQ
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Total Amount</p>
                          <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {hasBoqs ? `${currencySymbol} ${boqInfo.totalAmount.toLocaleString()}` : `${currencySymbol} 0`}
                          </p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Scope Categories</p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5 truncate" title={hasBoqs ? boqInfo.categorySummary : '0 Categories'}>
                            {hasBoqs ? boqInfo.categorySummary : '0 Categories'}
                          </p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Target Budget</p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.budgetRange || 'Not specified'}</p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-2.5 border border-[hsl(var(--border))]">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Scope</p>
                          <p className="font-bold text-xs text-[hsl(var(--foreground))] mt-0.5">{lead.propertyType || 'Interior'}</p>
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
                            Ready for Detailed BOQ Estimation
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            Build itemized take-offs across carpentry, ceiling, MEP, and finishes.
                          </p>
                        </div>
                        {!isReadOnly && !isBoqLocked && (
                          <button 
                            onClick={() => setIsBoqModalOpen(true)} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={14} /> Create Initial BOQ
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {lead.boqs.length > 1 && (
                          <div className="flex items-center justify-between gap-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-2 sm:p-2.5">
                            <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Versions:</span>
                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                              {lead.boqs.map((q: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setActiveBoqIndex(idx)}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                    activeBoqIndex === idx 
                                      ? "bg-indigo-600 text-white" 
                                      : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]"
                                  )}
                                >
                                  Version {q.version || idx + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <BoqPreview 
                          lead={lead} 
                          boqIndex={activeBoqIndex} 
                          onSuccess={fetchData} 
                          onEdit={isBoqLocked ? undefined : () => {
                            setEditingBoqIndex(activeBoqIndex);
                            setIsBoqModalOpen(true);
                          }}
                          onDelete={isBoqLocked ? undefined : (idx) => {
                            setBoqIndexToDelete(idx);
                            setIsDeleteBoqModalOpen(true);
                          }}
                          onSendForApproval={isBoqLocked ? undefined : (idx) => {
                            setActiveBoqIndex(idx);
                            setIsSendBoqApprovalOpen(true);
                          }}
                          onApprove={isBoqLocked ? undefined : (idx) => {
                            setActiveBoqIndex(idx);
                            setBoqApprovalAction('approve');
                            setIsBoqApprovalOpen(true);
                          }}
                          onReject={isBoqLocked ? undefined : (idx) => {
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
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Phase Locked
                  </div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Quotations Stage is Locked</h3>
                  <p className="text-[hsl(var(--muted-foreground))] text-xs mt-1 max-w-md">
                    Finalize the BOQ estimate first to unlock commercial proposals.
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
                                Commercial Quotations & Proposals
                              </h2>
                              <span className={cn(
                                "text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5",
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
                                {hasQuotations ? `${lead.quotations.length} ${lead.quotations.length === 1 ? 'Proposal' : 'Proposals'} Generated` : "Pending Creation"}
                              </span>
                            </div>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              Generate commercial proposals, apply taxes, discounts and manage client approvals.
                            </p>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasQuotations && (hasAcceptedQuote || lead.status === 'Booking Pending') && !['Won', 'Converted'].includes(lead.status) && (
                              <button
                                onClick={() => setIsConvertToProjectOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 size={14} /> Convert to Project
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingQuotationIndex(null);
                                setIsQuotationModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                            >
                              <Plus size={14} /> Create Quotation
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Summary Metrics */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Grand Total</p>
                          <p className="font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400 mt-1">
                            {hasQuotations ? `${currencySymbol} ${quotationInfo.grandTotal.toLocaleString()}` : '—'}
                          </p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Breakdown</p>
                          <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1 truncate">
                            {hasQuotations ? `${quotationInfo.taxPercentage}% Tax • ${quotationInfo.itemsCount} Items` : 'No items'}
                          </p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Latest Status</p>
                          <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1">{quotationInfo.currentQuote?.status || 'Generated'}</p>
                        </div>
                        <div className="bg-[hsl(var(--muted)/0.35)] rounded-xl p-3 border border-[hsl(var(--border))] transition-colors">
                          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Target Budget</p>
                          <p className="font-bold text-xs sm:text-sm text-[hsl(var(--foreground))] mt-1">{lead.budgetRange || 'Not specified'}</p>
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
                            No Quotations Created Yet
                          </h3>
                          <p className="text-[hsl(var(--muted-foreground))] text-xs">
                            Generate itemized pricing proposals directly from the finalized BOQ, apply custom discounts and taxes.
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
                            <Plus size={15} /> Create First Quotation
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
                                <span>Quotation Versions & Options</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                  {lead.quotations.length}
                                </span>
                              </h3>
                            </div>
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))] hidden sm:block">
                              Click &quot;View&quot; to inspect document preview or send to client
                            </p>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider text-[10px]">
                                  <th className="py-3 px-4 w-12 text-center">#</th>
                                  <th className="py-3 px-4">Quotation Title</th>
                                  <th className="py-3 px-4">Scope / Items</th>
                                  <th className="py-3 px-4">Subtotal & Tax</th>
                                  <th className="py-3 px-4">Grand Total</th>
                                  <th className="py-3 px-4 text-center">Status</th>
                                  <th className="py-3 px-4 text-right">Actions</th>
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
                                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md font-semibold text-xs bg-slate-100 dark:bg-[hsl(var(--muted))] text-slate-600 dark:text-[hsl(var(--muted-foreground))]">
                                          {idx + 1}
                                        </span>
                                      </td>

                                      {/* Quotation Title */}
                                      <td className="py-3.5 px-4 font-bold text-[hsl(var(--foreground))]">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:border-blue-500/20">
                                            <FileText size={14} />
                                          </div>
                                          <div>
                                            <span className="text-xs font-bold text-[hsl(var(--foreground))] block">
                                              {quoteTitle}
                                            </span>
                                            <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal">
                                              Version {q.version || idx + 1}
                                              {q.sourceBoqVersion && ` • BOQ v${q.sourceBoqVersion}`}
                                            </p>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Items / Scope */}
                                      <td className="py-3.5 px-4 text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-slate-700 dark:text-[hsl(var(--foreground))] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[hsl(var(--muted))] border border-slate-200/80 dark:border-[hsl(var(--border))]">
                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Subtotal & Tax */}
                                      <td className="py-3.5 px-4 text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                                        <div className="font-medium text-[hsl(var(--foreground))]">{currencySymbol} {(q.subtotal || 0).toLocaleString()}</div>
                                        <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                          Tax: {q.taxPercentage || 0}%
                                          {Number(q.discountAmount || 0) > 0 && (
                                            <span className="ml-1 text-emerald-600 font-semibold">
                                              • Disc: {currencySymbol} {Number(q.discountAmount).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Grand Total */}
                                      <td className="py-3.5 px-4 whitespace-nowrap">
                                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                                          {currencySymbol} {(q.grandTotal || 0).toLocaleString()}
                                        </span>
                                      </td>

                                      {/* Status */}
                                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                        <span className={cn(
                                          "text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider inline-flex items-center gap-1",
                                          getStatusBadge(status)
                                        )}>
                                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                          {status}
                                        </span>
                                      </td>

                                      {/* Actions */}
                                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                        <div className="inline-flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            onClick={() => setActiveQuotationIndex(idx)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs bg-white hover:bg-blue-50 text-blue-700 border border-blue-500 dark:bg-[hsl(var(--card))] dark:text-blue-400"
                                            title="View Quotation Modal"
                                          >
                                            <Eye size={13} /> View
                                          </button>

                                          {!isReadOnly && !isQuotationApproved && (
                                            <button
                                              type="button"
                                              onClick={() => setSendQuotationModalIndex(idx)}
                                              className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs",
                                                status === 'Sent'
                                                  ? "bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-slate-300"
                                                  : "bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 dark:bg-[hsl(var(--card))] dark:text-blue-400"
                                              )}
                                              title={status === 'Sent' ? "Resend / Dispatch Quotation" : "Send Quotation to Lead or Vendor"}
                                            >
                                              <Send size={12} />
                                              {status === 'Sent' ? 'Resend' : 'Send'}
                                            </button>
                                          )}

                                          {!isReadOnly && !isQuoteLocked && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingQuotationIndex(idx);
                                                setIsQuotationModalOpen(true);
                                              }}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer shadow-xs dark:bg-[hsl(var(--card))] dark:border-[hsl(var(--border))] dark:text-[hsl(var(--foreground))]"
                                              title="Edit Quotation"
                                            >
                                              <Pencil size={12} /> Edit
                                            </button>
                                          )}

                                          {!isReadOnly && !isQuoteLocked && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteQuotationByIndex(idx)}
                                              className="inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shadow-xs dark:bg-[hsl(var(--card))] dark:border-[hsl(var(--border))] dark:text-[hsl(var(--muted-foreground))]"
                                              title="Delete Quotation"
                                            >
                                              <Trash2 size={13} />
                                            </button>
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
                  <h2 className="text-base font-bold text-[hsl(var(--foreground))]">Log Activity Note</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Record a touchpoint with {lead.name}</p>
                </div>
                <button onClick={() => setIsActivityModalOpen(false)} className="p-1.5 hover:bg-[hsl(var(--accent))] rounded-lg bg-[hsl(var(--muted))] transition-colors"><X size={16} className="text-[hsl(var(--muted-foreground))]" /></button>
              </div>

              <form onSubmit={handleActivitySubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Activity Type</label>
                  <select 
                    value={activityForm.type}
                    onChange={e => setActivityForm({...activityForm, type: e.target.value})}
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-xs font-medium focus:border-[hsl(var(--primary))] outline-none"
                  >
                    {["Phone Call", "WhatsApp", "Meeting", "Office Visit", "Site Visit", "Email", "Status Change"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Remarks / Summary</label>
                  <textarea 
                    required
                    rows={4}
                    value={activityForm.remarks}
                    onChange={e => setActivityForm({...activityForm, remarks: e.target.value})}
                    placeholder="E.g., Client wants a modern theme, budget is strict. Next meeting next week."
                    className="w-full mt-1.5 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-xs font-medium focus:border-[hsl(var(--primary))] outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsActivityModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg text-xs font-bold text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-all active:scale-95">
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
        initialRequirements={normalizedRequirements || []}
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
                    Delete Drawing
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                    Are you sure you want to delete drawing <strong className="text-[hsl(var(--foreground))]">"{drawingToDelete.title || drawingToDelete.name || 'this drawing'}"</strong>? This will remove all revision versions.
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
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingDrawing}
                  onClick={handleDeleteDrawing}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1.5"
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
