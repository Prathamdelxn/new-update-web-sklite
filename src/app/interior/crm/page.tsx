'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shell } from '@/components/layouts/Shell';
import { CrmFlowTabs, CrmStage } from '@/components/crm/CrmFlowTabs';
import { LeadsTable, Lead } from '@/components/crm/LeadsTable';
import { FollowUpsView } from '@/components/crm/FollowUpsView';
import { SiteVisitsView } from '@/components/crm/SiteVisitsView';
import { RequirementDesignView } from '@/components/crm/RequirementDesignView';
import { QuotationsView } from '@/components/crm/QuotationsView';
import { WonProjectsView } from '@/components/crm/WonProjectsView';
import { CreateLeadModal } from '@/components/modals/CreateLeadModal';
import { ScheduleFollowUpModal } from '@/components/modals/ScheduleFollowUpModal';
import { LogSiteVisitModal } from '@/components/modals/LogSiteVisitModal';
import { LogRequirementsModal } from '@/components/modals/LogRequirementsModal';
import { SendToSiteVisitModal } from '@/components/modals/SendToSiteVisitModal';
import { SendToRequirementsModal } from '@/components/modals/SendToRequirementsModal';
import { ConvertToProjectModal } from '@/components/modals/ConvertToProjectModal';
import { UploadDesignModal } from '@/components/modals/UploadDesignModal';
import { SendToQuotationsModal } from '@/components/modals/SendToQuotationsModal';
import { QuotationBuilderModal } from '@/components/modals/QuotationBuilderModal';
import { Calendar, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api.client';

export default function CRMDashboardPage() {
  const [activeTab, setActiveTab] = useState<CrmStage>('leads');
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Quick Action Modal States
  const [actionLeadId, setActionLeadId] = useState<string | null>(null);
  const [actionLeadName, setActionLeadName] = useState<string>('');
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isSiteVisitOpen, setIsSiteVisitOpen] = useState(false);
  const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);
  const [isUploadDesignOpen, setIsUploadDesignOpen] = useState(false);
  const [isSendToSiteVisitOpen, setIsSendToSiteVisitOpen] = useState(false);
  const [isSendToRequirementsOpen, setIsSendToRequirementsOpen] = useState(false);
  const [isSendToQuotationsOpen, setIsSendToQuotationsOpen] = useState(false);
  const [isQuotationBuilderOpen, setIsQuotationBuilderOpen] = useState(false);
  const [isConvertToProjectOpen, setIsConvertToProjectOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/crm/customers');
      setLeads(res.data);
      
      const userRes = await api.get('/users');
      setUsers(userRes.data);
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
      return leads.filter(l => ['Meeting Scheduled', 'Measurement Done'].includes(l.status));
    }
    if (activeTab === 'requirement_design') {
      return leads.filter(l => ['Requirement Completed', 'Design Approved'].includes(l.status));
    }
    if (activeTab === 'quotations') {
      return leads.filter(l => ['Quotation Sent'].includes(l.status));
    }
    // Default fallback
    return leads;
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
    <Shell>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
              CRM Workspace
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm font-medium">
              <Calendar size={16} /> Manage your entire sales pipeline
            </p>
          </div>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-slate-900/20 active:scale-95"
          >
            + New Lead
          </button>
        </div>

        {/* CRM Flow Tabs */}
        <div className="bg-white rounded-t-2xl px-2">
           <CrmFlowTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'follow_ups' ? (
            <motion.div key="followups-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <FollowUpsView onPassToSiteVisit={openSendToSiteVisitModal} />
            </motion.div>
          ) : activeTab === 'site_visits' ? (
            <motion.div key="sitevisits-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <SiteVisitsView 
                leads={getFilteredLeads()} 
                onLogSiteVisit={openSiteVisitModal} 
                onPassToRequirements={openSendToRequirementsModal} 
              />
            </motion.div>
          ) : activeTab === 'requirement_design' ? (
            <motion.div key="req-design-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <RequirementDesignView 
                leads={getFilteredLeads()} 
                onLogRequirements={openRequirementsModal}
                onUploadDesign={openUploadDesignModal}
                onPassToQuotations={openSendToQuotationsModal}
              />
            </motion.div>
          ) : activeTab === 'quotations' ? (
            <motion.div key="quotations-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <QuotationsView 
                leads={getFilteredLeads()} 
                onConvertToProject={openConvertToProjectModal} 
                onCreateQuotation={openQuotationBuilderModal}
              />
            </motion.div>
          ) : activeTab === 'won_projects' ? (
            <motion.div key="won-projects-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <WonProjectsView />
            </motion.div>
          ) : activeTab === 'leads' ? (
            <motion.div 
              key="table-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <LeadsTable 
                leads={getFilteredLeads()} 
                isLoading={isLoading} 
                onEdit={() => {}} 
                onPassToFollowUp={openFollowUpModal}
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="py-24 flex flex-col items-center justify-center text-center bg-white border border-dashed border-slate-200 rounded-3xl shadow-sm"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <Lightbulb size={32} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                {activeTab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Pipeline
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                This dedicated stage view is currently being implemented. You'll soon be able to manage all data specific to this flow phase right here in a tabular format!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <CreateLeadModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchLeads} 
      />

      <ScheduleFollowUpModal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        customerId={actionLeadId || ''}
        customerName={actionLeadName}
        onSuccess={fetchLeads}
        users={users}
      />

      <LogSiteVisitModal
        isOpen={isSiteVisitOpen}
        onClose={() => setIsSiteVisitOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <LogRequirementsModal
        isOpen={isRequirementsOpen}
        onClose={() => setIsRequirementsOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <UploadDesignModal
        isOpen={isUploadDesignOpen}
        onClose={() => setIsUploadDesignOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
      />

      <SendToSiteVisitModal
        isOpen={isSendToSiteVisitOpen}
        onClose={() => setIsSendToSiteVisitOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <SendToRequirementsModal
        isOpen={isSendToRequirementsOpen}
        onClose={() => setIsSendToRequirementsOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <SendToQuotationsModal
        isOpen={isSendToQuotationsOpen}
        onClose={() => setIsSendToQuotationsOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
        users={users}
      />

      <QuotationBuilderModal
        isOpen={isQuotationBuilderOpen}
        onClose={() => setIsQuotationBuilderOpen(false)}
        customerId={actionLeadId || ''}
        existingQuotations={leads.find(l => l._id === actionLeadId)?.quotations || []}
        onSuccess={fetchLeads}
      />

      <ConvertToProjectModal
        isOpen={isConvertToProjectOpen}
        onClose={() => setIsConvertToProjectOpen(false)}
        customerId={actionLeadId || ''}
        onSuccess={fetchLeads}
      />
    </Shell>
  );
}
