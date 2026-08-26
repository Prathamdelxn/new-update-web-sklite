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
import { Calendar, Lightbulb } from 'lucide-react';
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

  // Derive filtered leads based on the current tab
  const getFilteredLeads = () => {
    if (activeTab === 'leads') {
      return leads; // Show ALL leads in the master Leads tab
    }
    if (activeTab === 'follow_ups') {
      return leads.filter(l => l.status === 'Contacted');
    }
    if (activeTab === 'site_visits') {
      return leads.filter(l => ['Under Site Visit', 'Measurement Done'].includes(l.status));
    }
    if (activeTab === 'requirement_design') {
      return leads.filter(l => ['Under Requirement', 'Design Approved'].includes(l.status));
    }
    if (activeTab === 'drawing') {
      return leads.filter(l => ['Under Drawing'].includes(l.status));
    }
    if (activeTab === 'boq') {
      return leads.filter(l => ['Under BOQ Creation'].includes(l.status));
    }
    if (activeTab === 'quotations') {
      return leads.filter(l => ['Under Quotation'].includes(l.status));
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
    setActionLeadId(leadId);
    setIsSiteVisitOpen(true);
  };

  const openRequirementsModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsRequirementsOpen(true);
  };

  const openUploadDesignModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsUploadDesignOpen(true);
  };

  const openSendToSiteVisitModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsSendToSiteVisitOpen(true);
  };

  const openSendToRequirementsModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsSendToRequirementsOpen(true);
  };

  const openSendToDrawingModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsSendToDrawingOpen(true);
  };

  const openSendToBoqModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsSendToBoqOpen(true);
  };

  const openAddBoqModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsAddBoqOpen(true);
  };

  const openSendToQuotationsModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsSendToQuotationsOpen(true);
  };

  const openQuotationBuilderModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsQuotationBuilderOpen(true);
  };

  const openConvertToProjectModal = (leadId: string) => {
    setActionLeadId(leadId);
    setIsConvertToProjectOpen(true);
  };

  return (
    <div className="interior-os-theme p-6 lg:p-8 space-y-6 pb-12">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
            CRM Workspace
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-2 text-xs font-normal">
            <Calendar size={15} /> Manage your entire sales pipeline
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-[hsl(var(--primary-foreground))] px-4 py-2 rounded-xl font-medium text-xs transition-all active:scale-95"
        >
          + New Lead
        </button>
      </div>

      {/* CRM Flow Tabs */}
      <div className="bg-[hsl(var(--card))] rounded-t-2xl px-2">
         <InteriorCrmFlowTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'follow_ups' ? (
          <motion.div key="followups-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorFollowUpsView onPassToSiteVisit={openSendToSiteVisitModal} refreshTrigger={leads} />
          </motion.div>
        ) : activeTab === 'site_visits' ? (
          <motion.div key="sitevisits-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorSiteVisitsView
              leads={getFilteredLeads()}
              onLogSiteVisit={openSiteVisitModal}
              onPassToRequirements={openSendToRequirementsModal}
            />
          </motion.div>
        ) : activeTab === 'requirement_design' ? (
          <motion.div key="req-design-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorRequirementDesignView
              leads={getFilteredLeads()}
              onLogRequirements={openRequirementsModal}
              onUploadDesign={() => {}} // Not used anymore
              onPassToQuotations={openSendToDrawingModal} // Flow changes to pass to drawing
            />
          </motion.div>
        ) : activeTab === 'drawing' ? (
          <motion.div key="drawing-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorLeadsTable
              leads={getFilteredLeads()}
              isLoading={isLoading}
              activeTab={activeTab}
              onEdit={openEditModal}
              onDelete={handleOpenDeleteModal}
              onPassToFollowUp={openFollowUpModal}
              onPassToBoq={openSendToBoqModal}
              onUploadDesign={openUploadDesignModal}
              onLogRequirements={openRequirementsModal}
            />
          </motion.div>
        ) : activeTab === 'boq' ? (
          <motion.div key="boq-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorLeadsTable
              leads={getFilteredLeads()}
              isLoading={isLoading}
              activeTab={activeTab}
              onEdit={openEditModal}
              onDelete={handleOpenDeleteModal}
              onPassToFollowUp={openFollowUpModal}
              onAddBoq={openAddBoqModal}
              onPassToQuotations={openSendToQuotationsModal}
            />
          </motion.div>
        ) : activeTab === 'quotations' ? (
          <motion.div key="quotations-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorQuotationsView
              leads={getFilteredLeads()}
              onConvertToProject={openConvertToProjectModal}
              onCreateQuotation={openQuotationBuilderModal}
            />
          </motion.div>
        ) : activeTab === 'won_projects' ? (
          <motion.div key="won-projects-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <InteriorWonProjectsView />
          </motion.div>
        ) : activeTab === 'leads' ? (
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
    </div>
  );
}
