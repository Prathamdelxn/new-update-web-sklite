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
import { InteriorSendToQuotationsModal } from './modals/InteriorSendToQuotationsModal';
import { InteriorQuotationBuilderModal } from './modals/InteriorQuotationBuilderModal';
import { InteriorDeleteLeadModal } from './modals/InteriorDeleteLeadModal';
import { InteriorMarkAsLostModal } from './modals/InteriorMarkAsLostModal';
import { Calendar, Lightbulb, Users, MapPin, FileText, Trophy, Plus, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { useToast } from '@/providers/ToastContext';

export default function InteriorCrmView() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<InteriorCrmStage>('leads');
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
  const [isSendToQuotationsOpen, setIsSendToQuotationsOpen] = useState(false);
  const [isQuotationBuilderOpen, setIsQuotationBuilderOpen] = useState(false);
  const [isConvertToProjectOpen, setIsConvertToProjectOpen] = useState(false);
  const [isMarkAsLostOpen, setIsMarkAsLostOpen] = useState(false);

  // Delete Lead Modal State
  const [deletingLead, setDeletingLead] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await interiorCrmService.getCustomers();
      setLeads(res?.success && res?.data ? res.data : Array.isArray(res) ? res : []);

      const userRes = await interiorCrmService.getUsers();
      setUsers(userRes?.success && userRes?.data ? userRes.data : Array.isArray(userRes) ? userRes : []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Dynamic stage counts for senior-level UX visibility
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
      lost_leads: leads.filter((l) => l.status === 'Lost').length,
    };
  }, [leads]);

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
    setIsDeletingLead(true);
    try {
      await interiorCrmService.deleteCustomer(deletingLead.id);
      toast.success('Lead deleted successfully');
      setDeletingLead(null);
      fetchLeads();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete lead');
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
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsSendToBoqOpen(true);
  };

  const openAddBoqModal = (leadId: string) => {
    const lead = leads.find(l => l._id === leadId);
    setActionLeadId(leadId);
    setActionLeadName(lead?.name || '');
    setIsAddBoqOpen(true);
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

  const wonLeadsCount = leads.filter((l) => ['Won', 'Converted'].includes(l.status)).length;

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

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-[hsl(var(--primary-foreground))] px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={15} /> Add New Lead
        </button>
      </div>

      {/* CRM Flow Tabs */}
      <div className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
         <InteriorCrmFlowTabs activeTab={activeTab} onChange={setActiveTab} stageCounts={stageCounts} />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'follow_ups' ? (
          <motion.div key="followups-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorFollowUpsView onPassToSiteVisit={openSendToSiteVisitModal} refreshTrigger={leads} onMarkAsLost={openMarkAsLostModal} />
          </motion.div>
        ) : activeTab === 'site_visits' ? (
          <motion.div key="sitevisits-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorSiteVisitsView
              leads={getFilteredLeads()}
              onLogSiteVisit={openSiteVisitModal}
              onPassToRequirements={openSendToRequirementsModal}
              onMarkAsLost={openMarkAsLostModal}
            />
          </motion.div>
        ) : activeTab === 'requirement_design' ? (
          <motion.div key="req-design-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorRequirementDesignView
              leads={getFilteredLeads()}
              onLogRequirements={openRequirementsModal}
              onUploadDesign={() => {}} // Not used anymore
              onPassToQuotations={openSendToDrawingModal} // Flow changes to pass to drawing
              onMarkAsLost={openMarkAsLostModal}
            />
          </motion.div>
        ) : activeTab === 'drawing' ? (
          <motion.div key="drawing-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorDrawingsView
              leads={getFilteredLeads()}
              onUploadDesign={openUploadDesignModal}
              onPassToBoq={openSendToBoqModal}
              onMarkAsLost={openMarkAsLostModal}
            />
          </motion.div>
        ) : activeTab === 'boq' ? (
          <motion.div key="boq-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorBoqStageView
              leads={getFilteredLeads()}
              onAddBoq={openAddBoqModal}
              onPassToQuotations={openSendToQuotationsModal}
              onMarkAsLost={openMarkAsLostModal}
            />
          </motion.div>
        ) : activeTab === 'quotations' ? (
          <motion.div key="quotations-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorQuotationsView
              leads={getFilteredLeads()}
              onConvertToProject={openConvertToProjectModal}
              onCreateQuotation={openQuotationBuilderModal}
              onMarkAsLost={openMarkAsLostModal}
            />
          </motion.div>
        ) : activeTab === 'won_projects' ? (
          <motion.div key="won-projects-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorWonProjectsView />
          </motion.div>
        ) : (activeTab === 'leads' || activeTab === 'lost_leads') ? (
          <motion.div
            key="table-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
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
            />
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="py-24 flex flex-col items-center justify-center text-center bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-3xl"
          >
            <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))] mb-4">
              <Lightbulb size={32} />
            </div>
            <h2 className="text-xl font-extrabold text-[hsl(var(--foreground))] tracking-tight">
              {activeTab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Pipeline
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2 max-w-sm">
              This dedicated stage view is currently being implemented. You'll soon be able to manage all data specific to this flow phase right here in a tabular format!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <InteriorCreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorEditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedLeadToEdit(null); }}
        lead={selectedLeadToEdit}
        users={users}
        onSuccess={fetchLeads}
      />

      <InteriorScheduleFollowUpModal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        customerId={actionLeadId || ''}
        customerName={actionLeadName}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorLogSiteVisitModal
        isOpen={isSiteVisitOpen}
        onClose={() => setIsSiteVisitOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
        initialMeasurements={leads.find(l => l._id === actionLeadId)?.siteMeasurements}
        initialPhotos={leads.find(l => l._id === actionLeadId)?.sitePhotos}
      />

      <InteriorLogRequirementsModal
        isOpen={isRequirementsOpen}
        onClose={() => setIsRequirementsOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
        initialRequirements={leads.find(l => l._id === actionLeadId)?.requirements || []}
        initialBudget={leads.find(l => l._id === actionLeadId)?.budgetRange || ''}
        isReadOnly={['Under Drawing', 'Under BOQ Creation', 'Under Quotation', 'Negotiation', 'Converted'].includes(leads.find(l => l._id === actionLeadId)?.status || '')}
      />

      <InteriorUploadDesignModal
        isOpen={isUploadDesignOpen}
        onClose={() => setIsUploadDesignOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        existingFiles={leads.find(l => l._id === actionLeadId)?.designFiles || []}
      />

      <InteriorSendToSiteVisitModal
        isOpen={isSendToSiteVisitOpen}
        onClose={() => setIsSendToSiteVisitOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorSendToRequirementsModal
        isOpen={isSendToRequirementsOpen}
        onClose={() => setIsSendToRequirementsOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorSendToDrawingModal
        isOpen={isSendToDrawingOpen}
        onClose={() => setIsSendToDrawingOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorSendToBoqModal
        isOpen={isSendToBoqOpen}
        onClose={() => setIsSendToBoqOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorBoqBuilderModal
        isOpen={isAddBoqOpen}
        onClose={() => setIsAddBoqOpen(false)}
        customerId={actionLeadId || ''}
        existingBoqs={leads.find(l => l._id === actionLeadId)?.boqs || []}
        onSuccess={fetchLeads}
      />

      <InteriorSendToQuotationsModal
        isOpen={isSendToQuotationsOpen}
        onClose={() => setIsSendToQuotationsOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <InteriorQuotationBuilderModal
        isOpen={isQuotationBuilderOpen}
        onClose={() => setIsQuotationBuilderOpen(false)}
        customerId={actionLeadId || ''}
        customerEmail={leads.find(l => l._id === actionLeadId)?.email || ''}
        existingQuotations={leads.find(l => l._id === actionLeadId)?.quotations || []}
        onSuccess={fetchLeads}
      />

      <InteriorConvertToProjectModal
        isOpen={isConvertToProjectOpen}
        onClose={() => setIsConvertToProjectOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
      />

      <InteriorDeleteLeadModal
        isOpen={!!deletingLead}
        onClose={() => setDeletingLead(null)}
        onConfirm={handleConfirmDeleteLead}
        leadName={deletingLead?.name}
        isLoading={isDeletingLead}
      />

      <InteriorMarkAsLostModal
        isOpen={isMarkAsLostOpen}
        onClose={() => setIsMarkAsLostOpen(false)}
        customerId={actionLeadId || ''}
        leadName={actionLeadName}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
