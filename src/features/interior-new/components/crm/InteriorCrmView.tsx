'use client';

// =============================================================================
// Sky-Lite Web — Interior-New CRM Workspace
// Port of src/app/interior/crm/page.tsx, using interiorCrmService (interior-os
// backend) instead of sky-lite's own `api` client, and the interior-os visual
// shell (.interior-os-theme tokens) instead of the sky-lite Shell layout.
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { InteriorCrmFlowTabs, InteriorCrmStage } from './InteriorCrmFlowTabs';
import { InteriorLeadsTable } from './InteriorLeadsTable';
import { InteriorFollowUpsView } from './InteriorFollowUpsView';
import { InteriorSiteVisitsView } from './InteriorSiteVisitsView';
import { InteriorRequirementDesignView } from './InteriorRequirementDesignView';
import { InteriorDrawingsView } from './InteriorDrawingsView';
import { InteriorBoqStageView } from './InteriorBoqStageView';
import { InteriorQuotationsView } from './InteriorQuotationsView';
import { InteriorWonProjectsView } from './InteriorWonProjectsView';
import { InteriorCreateLeadModal } from './modals/InteriorCreateLeadModal';
import { InteriorEditLeadModal } from './modals/InteriorEditLeadModal';
import { InteriorScheduleFollowUpModal } from './modals/InteriorScheduleFollowUpModal';
import { InteriorLogSiteVisitModal } from './modals/InteriorLogSiteVisitModal';
import { InteriorLogRequirementsModal } from './modals/InteriorLogRequirementsModal';
import { InteriorSendToSiteVisitModal } from './modals/InteriorSendToSiteVisitModal';
import { InteriorSendToRequirementsModal } from './modals/InteriorSendToRequirementsModal';
import { InteriorConvertToProjectModal } from './modals/InteriorConvertToProjectModal';
import { InteriorUploadDesignModal } from './modals/InteriorUploadDesignModal';
import { InteriorSendToDrawingModal } from './modals/InteriorSendToDrawingModal';
import { InteriorSendToBoqModal } from './modals/InteriorSendToBoqModal';
import { InteriorBoqBuilderModal } from './modals/InteriorBoqBuilderModal';
import { InteriorDeleteBoqModal } from './modals/InteriorDeleteBoqModal';
import { InteriorSendBoqForApprovalModal } from './modals/InteriorSendBoqForApprovalModal';
import { InteriorBoqApprovalModal } from './modals/InteriorBoqApprovalModal';
import { InteriorSendToQuotationsModal } from './modals/InteriorSendToQuotationsModal';
import { InteriorQuotationBuilderModal } from './modals/InteriorQuotationBuilderModal';
import { InteriorDeleteLeadModal } from './modals/InteriorDeleteLeadModal';
import { InteriorMarkAsLostModal } from './modals/InteriorMarkAsLostModal';
import { InteriorReopenLeadModal } from './modals/InteriorReopenLeadModal';
import { InteriorStageLeadPickerModal } from './modals/InteriorStageLeadPickerModal';
import { Calendar, Lightbulb, Users, MapPin, FileText, Trophy, Plus, TrendingUp } from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const EMPTY_ARRAY: any[] = [];

const TAB_MODULE: Record<InteriorCrmStage, string> = {
  leads: 'crm_leads',
  follow_ups: 'crm_followups',
  requirement_design: 'crm_requirements',
  site_visits: 'crm_site_visits',
  drawing: 'crm_drawings',
  boq: 'crm_boq',
  quotations: 'crm_quotations',
  won_projects: 'crm_leads',
  lost_leads: 'crm_leads',
  customers: 'crm_leads',
};

const STATUS_STAGE_INDEX: Record<string, number> = {
  'New Lead': 0,
  'Contacted': 1,
  'Meeting Scheduled': 1,
  'Under Requirement': 2,
  'Requirement Completed': 2,
  'Under Site Visit': 3,
  'Measurement Done': 3,
  'Under Drawing': 4,
  'Design Approved': 4,
  'Under BOQ Creation': 5,
  'Under Quotation': 6,
  'Quotation Pending': 6,
  'Quotation Sent': 6,
  'Negotiation': 6,
  'Booking Pending': 6,
};

export default function InteriorCrmView() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedTab, setActiveTab] = useState<InteriorCrmStage>('leads');
  // Users without "Leads: View" start on the first stage they can see
  const firstVisibleTab = (Object.keys(TAB_MODULE) as InteriorCrmStage[]).find((t) => hasPermission(TAB_MODULE[t]!, 'read'));
  const activeTab: InteriorCrmStage =
    !TAB_MODULE[selectedTab] || hasPermission(TAB_MODULE[selectedTab]!, 'read') ? selectedTab : firstVisibleTab ?? selectedTab;
  const [isStagePickerOpen, setIsStagePickerOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLeadToEdit, setSelectedLeadToEdit] = useState<any>(null);

  // Quick Action Modal States
  const [actionLeadId, setActionLeadId] = useState<string | null>(null);
  const [actionLeadName, setActionLeadName] = useState<string>('');
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isSiteVisitOpen, setIsSiteVisitOpen] = useState(false);
  const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);
  const [isUploadDesignOpen, setIsUploadDesignOpen] = useState(false);
  const [isSendToSiteVisitOpen, setIsSendToSiteVisitOpen] = useState(false);
  const [isSendToRequirementsOpen, setIsSendToRequirementsOpen] = useState(false);
  const [isSendToDrawingOpen, setIsSendToDrawingOpen] = useState(false);
  const [isSendToBoqOpen, setIsSendToBoqOpen] = useState(false);
  const [isAddBoqOpen, setIsAddBoqOpen] = useState(false);
  const [isDeleteBoqOpen, setIsDeleteBoqOpen] = useState(false);
  const [isSendBoqApprovalOpen, setIsSendBoqApprovalOpen] = useState(false);
  const [isBoqApprovalOpen, setIsBoqApprovalOpen] = useState(false);
  const [boqApprovalAction, setBoqApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [boqIndexForAction, setBoqIndexForAction] = useState<number | null>(null);
  const [editingBoqIndex, setEditingBoqIndex] = useState<number | null>(null);
  const [isSendToQuotationsOpen, setIsSendToQuotationsOpen] = useState(false);
  const [isQuotationBuilderOpen, setIsQuotationBuilderOpen] = useState(false);
  const [isConvertToProjectOpen, setIsConvertToProjectOpen] = useState(false);
  const [isMarkAsLostOpen, setIsMarkAsLostOpen] = useState(false);
  const [isReopenLeadOpen, setIsReopenLeadOpen] = useState(false);

  // Delete Lead Modal State
  const [deletingLead, setDeletingLead] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  const [serverStats, setServerStats] = useState<any>(null);

  const {
    data: leadsData,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ['crm-leads-list'],
    queryFn: async () => {
      const [res, userRes, statsRes] = await Promise.all([
        interiorCrmService.getCustomers({ all: true }),
        interiorCrmService.getUsers(),
        interiorCrmService.getCustomerStats().catch(() => null),
      ]);
      const leadsList = res?.success && res?.data ? res.data : Array.isArray(res) ? res : [];
      const userList = userRes?.success && userRes?.data ? userRes.data : Array.isArray(userRes) ? userRes : [];
      const stats = statsRes?.success && statsRes?.data ? statsRes.data : null;
      return { leads: leadsList, users: userList, serverStats: stats };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (leadsData) {
      setLeads(leadsData.leads);
      setUsers(leadsData.users);
      if (leadsData.serverStats) setServerStats(leadsData.serverStats);
      setIsLoading(false);
    }
  }, [leadsData]);

  const optimisticUpdateLead = useCallback((leadId: string, updates: Record<string, any>) => {
    if (!leadId) return;
    setLeads((prev) =>
      prev.map((l) => (l._id === leadId ? { ...l, ...updates } : l))
    );
  }, []);

  const fetchLeads = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['crm-leads-list'] });
    queryClient.invalidateQueries({ queryKey: ['crm-follow-ups-all'] });
    queryClient.invalidateQueries({ queryKey: ['crm-follow-ups'] });
    queryClient.invalidateQueries({ queryKey: ['crm-pending-activities'] });
    queryClient.invalidateQueries({ queryKey: ['crm-won-projects'] });
    refetchLeads();
  }, [queryClient, refetchLeads]);

  const handleLeadSuccess = useCallback((updatedLeadOrFields?: any, explicitLeadId?: string) => {
    if (updatedLeadOrFields && typeof updatedLeadOrFields === 'object') {
      const targetId = updatedLeadOrFields._id || explicitLeadId || actionLeadId || selectedLeadToEdit?._id;
      if (targetId) {
        setLeads((prev) => {
          const exists = prev.some((l) => l._id === targetId);
          if (exists) {
            return prev.map((l) => (l._id === targetId ? { ...l, ...updatedLeadOrFields } : l));
          }
          // New lead created
          return [updatedLeadOrFields, ...prev];
        });
      }
    }
    fetchLeads();
  }, [actionLeadId, selectedLeadToEdit, fetchLeads]);

  // Dynamic stage counts calculated immediately from local leads state (0ms update)
  const stageCounts = React.useMemo(() => {
    return {
      leads: leads.filter((l) => l.status !== 'Lost').length,
      follow_ups: leads.filter((l) => ['New Lead', 'Contacted', 'Meeting Scheduled'].includes(l.status)).length,
      site_visits: leads.filter(
        (l) =>
          ['Under Site Visit', 'Measurement Done', 'Meeting Scheduled'].includes(l.status) ||
          !!l.siteMeasurements
      ).length,
      requirement_design: leads.filter(
        (l) =>
          ['Under Requirement', 'Requirement Completed'].includes(l.status) ||
          (l.requirements && l.requirements.length > 0)
      ).length,
      drawing: leads.filter(
        (l) =>
          ['Under Drawing', 'Design Approved'].includes(l.status) ||
          (l.designFiles && l.designFiles.length > 0)
      ).length,
      boq: leads.filter(
        (l) =>
          ['Under BOQ Creation'].includes(l.status) ||
          (l.boqs && l.boqs.length > 0)
      ).length,
      quotations: leads.filter(
        (l) =>
          [
            'Under Quotation',
            'Quotation Pending',
            'Quotation Sent',
            'Negotiation',
            'Booking Pending',
            'Won',
            'Converted',
          ].includes(l.status) || (l.quotations && l.quotations.length > 0)
      ).length,
      won_projects: leads.filter((l) => ['Won', 'Converted'].includes(l.status)).length,
      lost_leads: leads.filter((l) => l.status === 'Lost').length,
    };
  }, [serverStats, leads]);

  // Derive filtered leads based on the current tab
  const getFilteredLeads = () => {
    if (activeTab === 'leads') {
      return leads.filter(l => l.status !== 'Lost'); // Show ALL leads except Lost ones in the master Leads tab
    }
    if (activeTab === 'follow_ups') {
      return leads.filter(l => ['New Lead', 'Contacted', 'Meeting Scheduled'].includes(l.status));
    }
    if (activeTab === 'site_visits') {
      return leads.filter(
        (l) =>
          ['Under Site Visit', 'Measurement Done', 'Meeting Scheduled'].includes(l.status) ||
          !!l.siteMeasurements
      );
    }
    if (activeTab === 'requirement_design') {
      return leads.filter(
        (l) =>
          ['Under Requirement', 'Requirement Completed'].includes(l.status) ||
          (l.requirements && l.requirements.length > 0)
      );
    }
    if (activeTab === 'drawing') {
      return leads.filter(
        (l) =>
          ['Under Drawing', 'Design Approved'].includes(l.status) ||
          (l.designFiles && l.designFiles.length > 0)
      );
    }
    if (activeTab === 'boq') {
      return leads.filter(
        (l) =>
          ['Under BOQ Creation'].includes(l.status) ||
          (l.boqs && l.boqs.length > 0)
      );
    }
    if (activeTab === 'quotations') {
      return leads.filter(
        (l) =>
          [
            'Under Quotation',
            'Quotation Pending',
            'Quotation Sent',
            'Negotiation',
            'Booking Pending',
            'Won',
            'Converted',
          ].includes(l.status) || (l.quotations && l.quotations.length > 0)
      );
    }
    if (activeTab === 'lost_leads') {
      return leads.filter(l => l.status === 'Lost');
    }
    // Default fallback
    return leads;
  };

  // Handlers for Lead Edit & Delete
  const openEditModal = (lead: any) => {
    setSelectedLeadToEdit(lead);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (lead: any) => {
    setDeletingLead({ id: lead._id, name: lead.name });
  };

  const handleConfirmDeleteLead = async () => {
    if (!deletingLead) return;
    const targetId = deletingLead.id;
    setIsDeletingLead(true);
    // Optimistically remove from state immediately (0ms)
    setLeads((prev) => prev.filter((l) => l._id !== targetId));
    setDeletingLead(null);
    try {
      await interiorCrmService.deleteCustomer(targetId);
      toast.success('Lead deleted successfully');
      fetchLeads();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.response?.data?.message || 'Failed to delete lead');
      fetchLeads();
    } finally {
      setIsDeletingLead(false);
    }
  };

  // Handlers for Quick Actions
  const openFollowUpModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsFollowUpOpen(true);
  };

  const openSiteVisitModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsSiteVisitOpen(true);
  };

  const openRequirementsModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsRequirementsOpen(true);
  };

  const openUploadDesignModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsUploadDesignOpen(true);
  };

  const openSendToSiteVisitModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsSendToSiteVisitOpen(true);
  };

  const openSendToRequirementsModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsSendToRequirementsOpen(true);
  };

  const openSendToDrawingModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsSendToDrawingOpen(true);
  };

  const openSendToBoqModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    const designFiles = lead?.designFiles || [];
    
    if (designFiles.length === 0) {
      toast.error('Cannot pass to BOQ: No drawings found. Please upload drawings first.');
      return;
    }

    const unapproved = designFiles.filter((f: any) => {
      const latestVersion = Array.isArray(f.versions) && f.versions.length > 0 
        ? f.versions[f.versions.length - 1] 
        : null;
      const rawStatus = f.status || f.approvalStatus || latestVersion?.approvalStatus || 'draft';
      const s = String(rawStatus).toLowerCase().trim();
      const isApproved = s === 'internally_approved' || s === 'client_approved' || s === 'approved';
      const isClientRejected = f.clientStatus === 'client_changes_requested' || latestVersion?.clientStatus === 'client_changes_requested';
      return !isApproved || isClientRejected;
    });

    if (unapproved.length > 0) {
      toast.error(`Cannot pass to BOQ: ${unapproved.length} of ${designFiles.length} drawing(s) are still drafted or pending approval. Please approve all drawings first.`);
      return;
    }

    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsSendToBoqOpen(true);
  };

  const openAddBoqModal = (leadId: string, boqIndex?: number) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    const hasBoqs = lead?.boqs && lead.boqs.length > 0;
    const targetIdx = boqIndex !== undefined ? boqIndex : (hasBoqs ? lead.boqs.length - 1 : null);
    setEditingBoqIndex(targetIdx);
    setIsAddBoqOpen(true);
  };

  const openDeleteBoqModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsDeleteBoqOpen(true);
  };

  const openSendBoqApprovalModal = (leadId: string, boqIndex?: number) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setBoqIndexForAction(boqIndex !== undefined ? boqIndex : null);
    setIsSendBoqApprovalOpen(true);
  };

  const openApproveBoqModal = (leadId: string, boqIndex?: number) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setBoqIndexForAction(boqIndex !== undefined ? boqIndex : null);
    setBoqApprovalAction('approve');
    setIsBoqApprovalOpen(true);
  };

  const openRejectBoqModal = (leadId: string, boqIndex?: number) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setBoqIndexForAction(boqIndex !== undefined ? boqIndex : null);
    setBoqApprovalAction('reject');
    setIsBoqApprovalOpen(true);
  };

  const openSendToQuotationsModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsSendToQuotationsOpen(true);
  };

  const openQuotationBuilderModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsQuotationBuilderOpen(true);
  };

  const openConvertToProjectModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsConvertToProjectOpen(true);
  };

  const openMarkAsLostModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsMarkAsLostOpen(true);
  };

  const openReopenLeadModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsReopenLeadOpen(true);
  };

  const actionLead = React.useMemo(() => {
    if (!actionLeadId) return null;
    return leads.find((l) => l._id === actionLeadId) || null;
  }, [leads, actionLeadId]);

  const siteVisitInitialData = React.useMemo(() => {
    if (!actionLead || !['Under Site Visit', 'Measurement Done'].includes(actionLead.status)) return null;
    const assignedId = typeof actionLead.assignedSalesExecutive === 'object' && actionLead.assignedSalesExecutive !== null
      ? actionLead.assignedSalesExecutive._id || actionLead.assignedSalesExecutive.id
      : actionLead.assignedSalesExecutive;
    if (actionLead.siteVisitScheduledDate || assignedId || actionLead.remarks) {
      return {
        scheduledDate: actionLead.siteVisitScheduledDate,
        assignedSalesExecutive: assignedId || '',
        remarks: actionLead.remarks || '',
      };
    }
    return null;
  }, [actionLead]);

  const requirementsInitialData = React.useMemo(() => {
    if (!actionLead || !['Under Requirement', 'Requirement Completed'].includes(actionLead.status)) return null;
    const assignedId = typeof actionLead.designerAssigned === 'object' && actionLead.designerAssigned !== null
      ? actionLead.designerAssigned._id || actionLead.designerAssigned.id
      : actionLead.designerAssigned;
    if (assignedId || actionLead.requirementScheduledDate || actionLead.remarks) {
      return {
        assignedMember: assignedId || '',
        scheduledDate: actionLead.requirementScheduledDate,
        remarks: actionLead.remarks || '',
      };
    }
    return null;
  }, [actionLead]);

  const drawingInitialData = React.useMemo(() => {
    if (!actionLead || !['Under Drawing', 'Design Approved'].includes(actionLead.status)) return null;
    const assignedId = typeof actionLead.designerAssigned === 'object' && actionLead.designerAssigned !== null
      ? actionLead.designerAssigned._id || actionLead.designerAssigned.id
      : actionLead.designerAssigned;
    if (assignedId || actionLead.drawingScheduledDate || actionLead.remarks) {
      return {
        assignedDesigner: assignedId || '',
        scheduledDate: actionLead.drawingScheduledDate,
        remarks: actionLead.remarks || '',
      };
    }
    return null;
  }, [actionLead]);

  const wonLeadsCount = leads.filter((l) => ['Won', 'Converted'].includes(l.status)).length;

  // "Add to <stage>": bring a lead into the current stage without going through the
  // earlier tabs (users may have Create here but no access to the previous stage)
  const STAGE_ADD: Partial<Record<InteriorCrmStage, { label: string; index: number; open: (leadId: string) => void }>> = {
    follow_ups: { label: 'Schedule Follow-up', index: 1, open: openFollowUpModal },
    requirement_design: { label: 'Add to Requirements', index: 2, open: openSendToRequirementsModal },
    site_visits: { label: 'Add to Site Visits', index: 3, open: openSendToSiteVisitModal },
    drawing: { label: 'Add to Drawings', index: 4, open: openSendToDrawingModal },
    boq: { label: 'Add to BOQ', index: 5, open: openSendToBoqModal },
    quotations: { label: 'Add to Quotations', index: 6, open: openSendToQuotationsModal },
  };
  const stageAdd = STAGE_ADD[activeTab];
  const canAddToStage = !!stageAdd && hasPermission(TAB_MODULE[activeTab]!, 'create');
  const stageCandidates = stageAdd
    ? leads.filter((l) => {
        const idx = STATUS_STAGE_INDEX[l.status];
        if (idx === undefined) return false; // Lost / Won / Converted
        // Follow-ups can be scheduled for any lead still in the follow-up stage
        return activeTab === 'follow_ups' ? idx <= stageAdd.index : idx < stageAdd.index;
      })
    : [];

  return (
    <div className="interior-os-theme p-3 sm:p-6 lg:p-8 space-y-3.5 sm:space-y-6 pb-20 max-w-full overflow-x-hidden">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
              CRM Workspace
            </h1>
            <span className="hidden xs:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] px-2 py-0.5 rounded-full border border-[hsl(var(--primary)/0.2)]">
              Pipeline Live
            </span>
          </div>
          <p className="text-[hsl(var(--muted-foreground))] mt-0.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-medium">
            <Calendar size={13} className="shrink-0" /> Manage customer journeys, site measurements & quotations
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {canAddToStage && (
          <button
            onClick={() => setIsStagePickerOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 border border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] hover:bg-[hsl(var(--primary)/0.12)] px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} /> {stageAdd!.label}
          </button>
        )}
        {hasPermission('crm_leads', 'create') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-[hsl(var(--primary-foreground))] px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} /> Add New Lead
          </button>
        )}
        </div>
      </div>

      <InteriorStageLeadPickerModal
        isOpen={isStagePickerOpen && !!stageAdd}
        title={stageAdd?.label ?? ''}
        leads={stageCandidates}
        onClose={() => setIsStagePickerOpen(false)}
        onPick={(leadId) => stageAdd?.open(leadId)}
      />

      {/* CRM Flow Tabs */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
         <InteriorCrmFlowTabs activeTab={activeTab} onChange={setActiveTab} stageCounts={stageCounts} />
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === 'follow_ups' ? (
          <InteriorFollowUpsView onPassToRequirements={openSendToRequirementsModal} refreshTrigger={leads} onMarkAsLost={openMarkAsLostModal} />
        ) : activeTab === 'requirement_design' ? (
          <InteriorRequirementDesignView
            leads={getFilteredLeads()}
            onLogRequirements={openRequirementsModal}
            onUploadDesign={() => {}} // Not used anymore
            onPassToSiteVisit={openSendToSiteVisitModal}
            onPassToDrawing={openSendToSiteVisitModal}
            onPassToQuotations={openSendToSiteVisitModal}
            onMarkAsLost={openMarkAsLostModal}
          />
        ) : activeTab === 'site_visits' ? (
          <InteriorSiteVisitsView
            leads={getFilteredLeads()}
            onLogSiteVisit={openSiteVisitModal}
            onPassToDrawing={openSendToDrawingModal}
            onMarkAsLost={openMarkAsLostModal}
          />
        ) : activeTab === 'drawing' ? (
          <InteriorDrawingsView
            leads={getFilteredLeads()}
            onUploadDesign={openUploadDesignModal}
            onPassToBoq={openSendToBoqModal}
            onMarkAsLost={openMarkAsLostModal}
          />
        ) : activeTab === 'boq' ? (
          <InteriorBoqStageView
            leads={getFilteredLeads()}
            onAddBoq={openAddBoqModal}
            onPassToQuotations={openSendToQuotationsModal}
            onMarkAsLost={openMarkAsLostModal}
            onDeleteBoq={openDeleteBoqModal}
            onSendForApproval={openSendBoqApprovalModal}
            onApproveBoq={openApproveBoqModal}
            onRejectBoq={openRejectBoqModal}
          />
        ) : activeTab === 'quotations' ? (
          <InteriorQuotationsView
            leads={getFilteredLeads()}
            onConvertToProject={openConvertToProjectModal}
            onCreateQuotation={openQuotationBuilderModal}
            onMarkAsLost={openMarkAsLostModal}
          />
        ) : activeTab === 'won_projects' ? (
          <InteriorWonProjectsView />
        ) : (activeTab === 'leads' || activeTab === 'lost_leads') ? (
          <InteriorLeadsTable
            leads={getFilteredLeads()}
            isLoading={isLoading}
            activeTab={activeTab}
            onEdit={openEditModal}
            onDelete={handleOpenDeleteModal}
            onPassToFollowUp={openFollowUpModal}
            onPassToSiteVisit={openSendToSiteVisitModal}
            onPassToRequirements={openSendToRequirementsModal}
            onPassToDrawing={openSendToDrawingModal}
            onPassToBoq={openSendToBoqModal}
            onAddBoq={openAddBoqModal}
            onPassToQuotations={openSendToQuotationsModal}
            onMarkAsLost={openMarkAsLostModal}
            onReopenLead={openReopenLeadModal}
          />
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-3xl">
            <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] mb-4">
              <Lightbulb size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] tracking-tight">
              {activeTab.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Pipeline
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 max-w-sm">
              This dedicated stage view is currently being implemented. You'll soon be able to manage all data specific to this flow phase right here in a tabular format!
            </p>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <InteriorCreateLeadModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleLeadSuccess}
          users={users}
        />
      )}

      {isEditModalOpen && (
        <InteriorEditLeadModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setSelectedLeadToEdit(null); }}
          lead={selectedLeadToEdit}
          users={users}
          onSuccess={handleLeadSuccess}
        />
      )}

      {isFollowUpOpen && (
        <InteriorScheduleFollowUpModal
          isOpen={isFollowUpOpen}
          onClose={() => setIsFollowUpOpen(false)}
          customerId={actionLeadId || ''}
          customerName={actionLeadName}
          onSuccess={() => handleLeadSuccess(undefined, actionLeadId || undefined)}
          users={users}
        />
      )}

      {isSiteVisitOpen && (
        <InteriorLogSiteVisitModal
          isOpen={isSiteVisitOpen}
          onClose={() => setIsSiteVisitOpen(false)}
          customerId={actionLeadId || ''}
          onSuccess={fetchLeads}
          users={users}
          initialMeasurements={actionLead?.siteMeasurements}
          initialPhotos={actionLead?.sitePhotos}
        />
      )}

      {isRequirementsOpen && (
        <InteriorLogRequirementsModal
          isOpen={isRequirementsOpen}
          onClose={() => setIsRequirementsOpen(false)}
          customerId={actionLeadId || ''}
          onSuccess={fetchLeads}
          users={users}
          initialRequirements={actionLead?.requirements}
          initialBudget={actionLead?.budgetRange || ''}
          currentStatus={actionLead?.status || ''}
          isReadOnly={['Won', 'Converted'].includes(actionLead?.status || '')}
        />
      )}

      <InteriorUploadDesignModal
        isOpen={isUploadDesignOpen}
        onClose={() => setIsUploadDesignOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        existingFiles={actionLead?.designFiles || EMPTY_ARRAY}
      />

      <InteriorSendToSiteVisitModal
        isOpen={isSendToSiteVisitOpen}
        onClose={() => setIsSendToSiteVisitOpen(false)}
        customerId={actionLeadId || ''}
        customerName={actionLead?.name}
        currentStatus={actionLead?.status}
        initialData={siteVisitInitialData}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorSendToRequirementsModal
        isOpen={isSendToRequirementsOpen}
        onClose={() => setIsSendToRequirementsOpen(false)}
        customerId={actionLeadId || ''}
        customerName={actionLead?.name}
        currentStatus={actionLead?.status}
        initialData={requirementsInitialData}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorSendToDrawingModal
        isOpen={isSendToDrawingOpen}
        onClose={() => setIsSendToDrawingOpen(false)}
        customerId={actionLeadId || ''}
        customerName={actionLead?.name}
        currentStatus={actionLead?.status}
        initialData={drawingInitialData}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorSendToBoqModal
        isOpen={isSendToBoqOpen}
        onClose={() => setIsSendToBoqOpen(false)}
        customerId={actionLeadId || ''}
        lead={actionLead}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorBoqBuilderModal
        isOpen={isAddBoqOpen}
        onClose={() => {
          setIsAddBoqOpen(false);
          setEditingBoqIndex(null);
        }}
        customerId={actionLeadId || ''}
        existingBoqs={actionLead?.boqs || EMPTY_ARRAY}
        editingBoqIndex={editingBoqIndex}
        isReadOnly={Boolean(
          (() => {
            if (!actionLead) return false;
            const hasAcceptedQuote = actionLead.quotations && actionLead.quotations.some((q: any) => q.status === 'Accepted');
            return hasAcceptedQuote || ['Booking Pending', 'Won', 'Converted'].includes(actionLead.status || '') || Boolean(actionLead.linkedProject);
          })()
        )}
        budgetRange={actionLead?.budgetRange || ''}
        onSuccess={fetchLeads}
      />

      <InteriorDeleteBoqModal
        isOpen={isDeleteBoqOpen}
        onClose={() => setIsDeleteBoqOpen(false)}
        customerId={actionLeadId || ''}
        customerName={actionLeadName}
        existingBoqs={actionLead?.boqs || EMPTY_ARRAY}
        onSuccess={fetchLeads}
      />

      <InteriorSendBoqForApprovalModal
        isOpen={isSendBoqApprovalOpen}
        onClose={() => {
          setIsSendBoqApprovalOpen(false);
          setBoqIndexForAction(null);
        }}
        customerId={actionLeadId || ''}
        customerName={actionLeadName}
        existingBoqs={actionLead?.boqs || EMPTY_ARRAY}
        boqIndex={boqIndexForAction}
        users={users}
        onSuccess={fetchLeads}
      />

      <InteriorBoqApprovalModal
        isOpen={isBoqApprovalOpen}
        onClose={() => {
          setIsBoqApprovalOpen(false);
          setBoqApprovalAction(null);
          setBoqIndexForAction(null);
        }}
        customerId={actionLeadId || ''}
        customerName={actionLeadName}
        budgetRange={actionLead?.budgetRange || ''}
        existingBoqs={actionLead?.boqs || EMPTY_ARRAY}
        boqIndex={boqIndexForAction}
        initialAction={boqApprovalAction}
        onSuccess={fetchLeads}
      />

      {isSendToQuotationsOpen && (
        <InteriorSendToQuotationsModal
          isOpen={isSendToQuotationsOpen}
          onClose={() => setIsSendToQuotationsOpen(false)}
          customerId={actionLeadId || ''}
          onSuccess={() => handleLeadSuccess(undefined, actionLeadId || undefined)}
          users={users}
        />
      )}

      <InteriorQuotationBuilderModal
        isOpen={isQuotationBuilderOpen}
        onClose={() => setIsQuotationBuilderOpen(false)}
        customerId={actionLeadId || ''}
        customerEmail={actionLead?.email || ''}
        existingQuotations={actionLead?.quotations || EMPTY_ARRAY}
        onSuccess={fetchLeads}
      />

      {isConvertToProjectOpen && (
        <InteriorConvertToProjectModal
          isOpen={isConvertToProjectOpen}
          onClose={() => setIsConvertToProjectOpen(false)}
          customerId={actionLeadId || ''}
          onSuccess={() => handleLeadSuccess(undefined, actionLeadId || undefined)}
        />
      )}

      {!!deletingLead && (
        <InteriorDeleteLeadModal
          isOpen={!!deletingLead}
          onClose={() => setDeletingLead(null)}
          onConfirm={handleConfirmDeleteLead}
          leadName={deletingLead?.name}
          isLoading={isDeletingLead}
        />
      )}

      {isMarkAsLostOpen && (
        <InteriorMarkAsLostModal
          isOpen={isMarkAsLostOpen}
          onClose={() => setIsMarkAsLostOpen(false)}
          customerId={actionLeadId || ''}
          leadName={actionLeadName}
          onSuccess={() => handleLeadSuccess(undefined, actionLeadId || undefined)}
        />
      )}

      {isReopenLeadOpen && (
        <InteriorReopenLeadModal
          isOpen={isReopenLeadOpen}
          onClose={() => setIsReopenLeadOpen(false)}
          customerId={actionLeadId || ''}
          leadName={actionLeadName}
          leadData={leads.find((l) => l._id === actionLeadId)}
          users={users}
          onSuccess={() => handleLeadSuccess(undefined, actionLeadId || undefined)}
        />
      )}
    </div>
  );
}
