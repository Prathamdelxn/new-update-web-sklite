'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  ClipboardList,
  Ruler,
  Image as ImageIcon,
  FileText,
  Calendar,
  MapPin,
  Maximize2,
  DoorOpen,
  Columns,
  Zap,
  Droplets,
  Wind,
  Armchair,
  AlertTriangle,
  Layers,
  Pencil,
  Plus,
  Sliders,
  Palette,
  Sparkles,
  Sun,
  PenTool,
  DollarSign,
  Camera,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { InteriorLogSiteVisitModal } from '@/features/interior-new/components/crm/modals/InteriorLogSiteVisitModal';
import { InteriorLogRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorLogRequirementsModal';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

type TabType = 'requirements' | 'measurements' | 'photos' | 'all';

export default function InteriorSiteDetailsView() {
  const { projectId } = useParams() as { projectId: string };
  const toast = useToast();
  const { hasPermission: canDo } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [selectedCustomerIdToLink, setSelectedCustomerIdToLink] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('requirements');
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);

  const loadSiteDetails = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch project details, direct linked CRM lead with photos, and project photos in parallel
      const [projRes, linkedCustRes, allCustRes, projPhotosRes] = await Promise.allSettled([
        interiorApiClient.get(`/projects/${projectId}`),
        interiorApiClient.get(`/crm/customers?linkedProject=${projectId}&includePhotos=true`),
        interiorApiClient.get(`/crm/customers?all=true`),
        interiorApiClient.get(`/projects/${projectId}/photos`),
      ]);

      let project: any = null;
      if (projRes.status === 'fulfilled') {
        project = projRes.value.data?.data || projRes.value.data;
        setProjectInfo(project);
      }

      let customer: any = null;

      // 1. Check if project already returned populated linkedCustomer
      if (project?.linkedCustomer) {
        customer = project.linkedCustomer;
      }

      // 2. Check direct linkedProject query result
      if (!customer && linkedCustRes.status === 'fulfilled') {
        const data = linkedCustRes.value.data?.data || linkedCustRes.value.data;
        if (Array.isArray(data) && data.length > 0) {
          customer = data[0];
        } else if (data && !Array.isArray(data)) {
          customer = data;
        }
      }

      // 3. Fallback to searching all customers
      let customers: any[] = [];
      if (allCustRes.status === 'fulfilled') {
        customers = allCustRes.value.data?.data || allCustRes.value.data || [];
        setAllCustomers(customers);
      }

      if (!customer && customers.length > 0) {
        customer = customers.find((c: any) => {
          if (!c.linkedProject) return false;
          const linkedId =
            typeof c.linkedProject === 'object' && c.linkedProject !== null && c.linkedProject._id
              ? String(c.linkedProject._id)
              : String(c.linkedProject);
          return linkedId === String(projectId);
        });
      }

      // 4. Ensure we fetch the single customer detail if sitePhotos is missing or empty
      if (customer?._id && (!customer.sitePhotos || customer.sitePhotos.length === 0)) {
        try {
          const detailRes = await interiorApiClient.get(`/crm/customers/${customer._id}`);
          const fullCustomer = detailRes.data?.data || detailRes.data;
          if (fullCustomer) {
            customer = { ...customer, ...fullCustomer };
          }
        } catch (detailErr) {
          console.warn('Failed to load full customer details:', detailErr);
        }
      }

      // 5. Merge any project execution photos (/projects/:id/photos) into sitePhotos list
      if (customer) {
        let extraPhotos: string[] = [];
        if (projPhotosRes.status === 'fulfilled') {
          const rawPhotos = projPhotosRes.value.data?.data || projPhotosRes.value.data || [];
          if (Array.isArray(rawPhotos)) {
            extraPhotos = rawPhotos
              .map((p: any) => p?.url || p)
              .filter((url: any) => typeof url === 'string' && url.trim().length > 0);
          }
        }

        const existingPhotos: string[] = Array.isArray(customer.sitePhotos) ? customer.sitePhotos : [];
        const mergedPhotos = Array.from(new Set([...existingPhotos, ...extraPhotos]));
        customer.sitePhotos = mergedPhotos;
      }

      setCustomerData(customer || null);
    } catch (err) {
      console.error('Failed to load site details:', err);
      toast.error('Failed to load site details');
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    loadSiteDetails();
  }, [loadSiteDetails]);

  const handleLinkExistingCustomer = async () => {
    if (!selectedCustomerIdToLink) {
      toast.error('Please select a customer to link');
      return;
    }
    try {
      setActionLoading(true);
      await interiorApiClient.patch(`/crm/customers/${selectedCustomerIdToLink}`, {
        linkedProject: projectId,
      });
      toast.success('Successfully linked customer to this project');
      await loadSiteDetails();
    } catch (err: any) {
      console.error('Failed to link customer', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to link customer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitializeSiteProfile = async () => {
    try {
      setActionLoading(true);
      const projName = projectInfo?.name || 'Interior Project';
      const cleanName = projName.replace(/[^a-zA-Z\s'.-]/g, '').trim() || 'Project Client';
      const payload = {
        name: cleanName,
        mobileNumber: '9876543210',
        leadSource: 'Existing Customer',
        status: 'Won',
        linkedProject: projectId,
      };
      await interiorApiClient.post(`/crm/customers`, payload);
      toast.success('Initialized site measurements profile for this project');
      await loadSiteDetails();
    } catch (err: any) {
      console.error('Failed to initialize site profile', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to initialize site profile');
    } finally {
      setActionLoading(false);
    }
  };

  // Normalize team and client requirements (declared at top-level before early returns)
  const teamRequirements: any[] = React.useMemo(() => {
    if (Array.isArray(customerData?.requirements)) return customerData.requirements;
    if (customerData?.requirements && typeof customerData.requirements === 'object') {
      if (Array.isArray(customerData.requirements.rooms)) return customerData.requirements.rooms;
      return [customerData.requirements];
    }
    return [];
  }, [customerData?.requirements]);

  const clientRequirements: any[] = React.useMemo(() => {
    if (Array.isArray(customerData?.clientRequirements)) return customerData.clientRequirements;
    if (customerData?.clientRequirements && typeof customerData.clientRequirements === 'object') {
      if (Array.isArray(customerData.clientRequirements.rooms)) return customerData.clientRequirements.rooms;
      return [customerData.clientRequirements];
    }
    return [];
  }, [customerData?.clientRequirements]);

  // Unified / effective requirements: if team entered specs exist, use them enriched with client wishlist;
  // if team requirements don't exist, use client requirements directly!
  const effectiveRequirements: any[] = React.useMemo(() => {
    if (teamRequirements.length === 0 && clientRequirements.length === 0) return [];
    if (teamRequirements.length === 0) {
      return clientRequirements.map((r: any) => ({ ...r, source: 'client' }));
    }
    if (clientRequirements.length === 0) {
      return teamRequirements.map((r: any) => ({ ...r, source: 'team' }));
    }

    // Both exist: merge so room specs are enriched with client wishlist
    const clientMap = new Map<string, any>();
    clientRequirements.forEach((cr) => {
      if (cr.roomName) clientMap.set(cr.roomName.toLowerCase().trim(), cr);
    });

    const usedClientKeys = new Set<string>();
    const merged = teamRequirements.map((tr) => {
      const key = (tr.roomName || '').toLowerCase().trim();
      const cr = clientMap.get(key);
      if (cr) {
        usedClientKeys.add(key);
        return {
          ...cr,
          ...tr,
          source: 'merged',
          designStyle: tr.designStyle || cr.designStyle || tr.theme || cr.theme || '',
          furnitureRequirements: tr.furnitureRequirements || cr.furnitureRequirements || '',
          storage: tr.storage || cr.storage || '',
          lightingRequirements: tr.lightingRequirements || cr.lightingRequirements || '',
          plumbingRequirements: tr.plumbingRequirements || cr.plumbingRequirements || '',
          colours: tr.colours || cr.colours || '',
          materials: tr.materials || cr.materials || '',
          flooring: tr.flooring || cr.flooring || '',
          ceiling: tr.ceiling || cr.ceiling || '',
          wallFinishes: tr.wallFinishes || cr.wallFinishes || '',
          furnitureStyle: tr.furnitureStyle || cr.furnitureStyle || '',
          description: tr.description || cr.description || '',
        };
      }
      return { ...tr, source: 'team' };
    });

    clientRequirements.forEach((cr) => {
      const key = (cr.roomName || '').toLowerCase().trim();
      if (!usedClientKeys.has(key)) {
        merged.push({ ...cr, source: 'client' });
      }
    });

    return merged;
  }, [teamRequirements, clientRequirements]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-6 text-center space-y-5">
        <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600">
          <Ruler size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No Site Profile Linked</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            Link an existing client lead or initialize a new site profile to log room dimensions, structural observations, and requirements.
          </p>
        </div>

        {allCustomers.length > 0 && (
          <div className="w-full max-w-sm space-y-2 pt-2 text-left">
            <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Link Existing CRM Client</label>
            <div className="flex gap-2">
              <select
                value={selectedCustomerIdToLink}
                onChange={(e) => setSelectedCustomerIdToLink(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">-- Choose client to link --</option>
                {allCustomers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.mobileNumber ? `(${c.mobileNumber})` : ''}
                  </option>
                ))}
              </select>
              {canDo('crm_leads', 'update') && (
                <button
                  type="button"
                  disabled={actionLoading || !selectedCustomerIdToLink}
                  onClick={handleLinkExistingCustomer}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors active:scale-[0.98]"
                >
                  Link
                </button>
              )}
            </div>
          </div>
        )}

        <div className="pt-2">
          {canDo('crm_leads', 'create') && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleInitializeSiteProfile}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white flex items-center gap-1.5 transition-colors active:scale-[0.98]"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Initialize New Site Details Profile
            </button>
          )}
        </div>
      </div>
    );
  }

  const requirements = effectiveRequirements;
  const isClientSubmittedOnly = teamRequirements.length === 0 && clientRequirements.length > 0;
  const isClientSubmitted = clientRequirements.length > 0;

  const { siteMeasurements, sitePhotos = [] } = customerData;
  const hasRequirements = requirements.length > 0;
  const hasMeasurements = !!siteMeasurements;
  const hasPhotos = sitePhotos.length > 0;

  if (!hasRequirements && !hasMeasurements && !hasPhotos) {
    return (
      <div className="flex flex-col items-center justify-center p-10 border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-6 text-center space-y-4">
        <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600">
          <Ruler size={28} />
        </div>
        <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No Site Details Logged</h3>
        <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm">
          The original CRM lead does not have any recorded requirements, measurements, or site photos.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {canDo('crm_requirements', 'update') && (
            <button
              onClick={() => setIsReqModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors active:scale-[0.98] flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Requirements
            </button>
          )}
          {canDo('crm_site_visits', 'update') && (
            <button
              onClick={() => setIsSiteVisitModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors active:scale-[0.98] flex items-center gap-1.5"
            >
              <Plus size={14} /> Log Site Visit & Measurements
            </button>
          )}
        </div>

        {customerData && (
          <>
            <InteriorLogSiteVisitModal
              isOpen={isSiteVisitModalOpen}
              onClose={() => setIsSiteVisitModalOpen(false)}
              customerId={customerData._id}
              onSuccess={loadSiteDetails}
              initialMeasurements={customerData.siteMeasurements}
              initialPhotos={customerData.sitePhotos}
              instructions={customerData.remarks || customerData.siteMeasurements?.notes}
            />
            <InteriorLogRequirementsModal
              isOpen={isReqModalOpen}
              onClose={() => setIsReqModalOpen(false)}
              customerId={customerData._id}
              onSuccess={loadSiteDetails}
              initialRequirements={teamRequirements.length > 0 ? teamRequirements : effectiveRequirements}
              clientRequirements={clientRequirements}
              initialBudget={customerData?.budgetRange || ''}
            />
          </>
        )}
      </div>
    );
  }

  const showRequirements = activeTab === 'all' || activeTab === 'requirements';
  const showMeasurements = activeTab === 'all' || activeTab === 'measurements';
  const showPhotos = activeTab === 'all' || activeTab === 'photos';

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      {/* Header Bar with Info & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 md:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-[hsl(var(--foreground))] tracking-tight">Site Inspection & Specifications</h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
              Lead: {customerData.leadNumber || 'LD-CRM'}
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Toggle between client design requirements, site visit measurements, and on-site photos.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {canDo('crm_requirements', 'update') && (
            <button
              onClick={() => setIsReqModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors active:scale-[0.98]"
            >
              <PenTool size={13} /> Edit Requirements
            </button>
          )}
          {canDo('crm_site_visits', 'update') && (
            <button
              onClick={() => setIsSiteVisitModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors active:scale-[0.98]"
            >
              <Pencil size={13} /> Edit Site Visit & Photos
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs / Toggle Bar ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 bg-[hsl(var(--muted)/0.3)] p-1.5 rounded-xl border border-[hsl(var(--border))]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('requirements')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap',
              activeTab === 'requirements'
                ? 'bg-emerald-600 text-white'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]'
            )}
          >
            <ClipboardList size={14} />
            <span>Design Requirements</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
                activeTab === 'requirements' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600'
              )}
            >
              {requirements.length} Spaces
            </span>
          </button>

          <button
            onClick={() => setActiveTab('measurements')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap',
              activeTab === 'measurements'
                ? 'bg-purple-600 text-white'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]'
            )}
          >
            <Ruler size={14} />
            <span>Site Visit & Measurements</span>
            {hasMeasurements && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
                  activeTab === 'measurements' ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-600'
                )}
              >
                {siteMeasurements?.carpetArea ? `${siteMeasurements.carpetArea} sqft` : 'Active'}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap',
              activeTab === 'photos'
                ? 'bg-blue-600 text-white'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]'
            )}
          >
            <Camera size={14} />
            <span>Site Photos</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
                activeTab === 'photos' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600'
              )}
            >
              {sitePhotos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap',
              activeTab === 'all'
                ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]'
            )}
          >
            <Layers size={14} />
            <span>View All</span>
          </button>
        </div>
      </div>

      {/* ── Tab Content Container ── */}
      <AnimatePresence mode="wait">
        {/* ── TAB 1: CLIENT DESIGN REQUIREMENTS ── */}
        {showRequirements && (
          <motion.div
            key="requirements-section"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-5"
          >
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 md:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[hsl(var(--border))]">
                <div>
                  <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <ClipboardList size={16} className="text-emerald-600" />
                    Client Design Requirements & Specifications
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Functional and aesthetic specifications captured for room execution.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                    {requirements.length} Spaces to Execute
                  </span>
                  {canDo('crm_requirements', 'update') && (
                    <button
                      onClick={() => setIsReqModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-colors active:scale-[0.98]"
                    >
                      <PenTool size={11} /> Edit Requirements
                    </button>
                  )}
                </div>
              </div>

              {/* Client Intake Banner if submitted via link */}
              {isClientSubmitted && (
                <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {isClientSubmittedOnly
                          ? 'Requirements Received via Online Client Intake Link'
                          : 'Enriched with Client Online Wishlist Intake'}
                      </p>
                      {customerData.clientRequirementsSubmittedAt && (
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                          Submitted on {new Date(customerData.clientRequirementsSubmittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                  {customerData.clientRequirementsNotes && (
                    <div className="text-xs text-[hsl(var(--foreground))] italic bg-[hsl(var(--card))] px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] max-w-md">
                      Client Notes: "{customerData.clientRequirementsNotes}"
                    </div>
                  )}
                </div>
              )}

              {/* Budget & Overview Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[hsl(var(--background))] rounded-xl p-3.5 border border-[hsl(var(--border))] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <DollarSign size={17} />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Estimated Budget</p>
                    <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate mt-0.5">
                      {customerData?.budgetRange || 'Not recorded'}
                    </p>
                  </div>
                </div>

                <div className="bg-[hsl(var(--background))] rounded-xl p-3.5 border border-[hsl(var(--border))] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <Layers size={17} />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Interior Type</p>
                    <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate mt-0.5">
                      {requirements[0]?.interiorType || customerData.propertyType || 'Residential'}
                    </p>
                  </div>
                </div>

                <div className="bg-[hsl(var(--background))] rounded-xl p-3.5 border border-[hsl(var(--border))] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold shrink-0">
                    <Palette size={17} />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Primary Theme</p>
                    <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate mt-0.5">
                      {requirements.find((r: any) => r.designStyle)?.designStyle || requirements[0]?.theme || 'Custom Spec'}
                    </p>
                  </div>
                </div>
              </div>

              {hasRequirements ? (
                <div className="grid grid-cols-1 gap-4">
                  {requirements.map((req: any, idx: number) => {
                    const hasFunctional = !!(
                      req.roomUsage ||
                      req.furnitureRequirements ||
                      req.storage ||
                      req.electricalPoints ||
                      req.lightingRequirements ||
                      req.plumbingRequirements ||
                      req.circulation
                    );
                    const hasAesthetic = !!(
                      req.designStyle ||
                      req.colours ||
                      req.materials ||
                      req.flooring ||
                      req.ceiling ||
                      req.wallFinishes ||
                      req.furnitureStyle ||
                      req.theme
                    );

                    return (
                      <div key={idx} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 sm:p-5 space-y-4 min-w-0 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))] min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="font-bold text-sm sm:text-base text-[hsl(var(--foreground))] truncate min-w-0">{req.roomName || 'General Space'}</h4>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {(req.source === 'client' || isClientSubmittedOnly) && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md flex items-center gap-1">
                                <Sparkles size={10} /> Client Wishlist
                              </span>
                            )}
                            {req.interiorType && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] rounded-md">
                                {req.interiorType}
                              </span>
                            )}
                            {(req.designStyle || req.theme) && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md flex items-center gap-1">
                                <Palette size={10} /> {req.designStyle || req.theme}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                          {/* Functional Specs */}
                          <div className="bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] rounded-lg p-3.5 space-y-2 text-xs min-w-0 overflow-hidden">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5 pb-2 border-b border-[hsl(var(--border))]">
                              <Sliders size={12} /> Functional Requirements
                            </p>
                            <div className="divide-y divide-[hsl(var(--border)/0.5)] pt-0.5">
                              {req.roomUsage && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Usage</span>
                                  <span className="font-semibold text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.roomUsage}</span>
                                </div>
                              )}
                              {req.furnitureRequirements && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Furniture</span>
                                  <span className="font-semibold text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.furnitureRequirements}</span>
                                </div>
                              )}
                              {req.storage && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Storage</span>
                                  <span className="font-semibold text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.storage}</span>
                                </div>
                              )}
                              {req.electricalPoints && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-amber-500 uppercase tracking-wider sm:w-28 shrink-0 flex items-center gap-1">
                                    <Zap size={11} /> Electrical
                                  </span>
                                  <span className="font-medium text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.electricalPoints}</span>
                                </div>
                              )}
                              {req.lightingRequirements && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-amber-500 uppercase tracking-wider sm:w-28 shrink-0 flex items-center gap-1">
                                    <Sun size={11} /> Lighting
                                  </span>
                                  <span className="font-medium text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.lightingRequirements}</span>
                                </div>
                              )}
                              {req.plumbingRequirements && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-cyan-600 uppercase tracking-wider sm:w-28 shrink-0 flex items-center gap-1">
                                    <Droplets size={11} /> Plumbing
                                  </span>
                                  <span className="font-medium text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.plumbingRequirements}</span>
                                </div>
                              )}
                              {req.circulation && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Circulation</span>
                                  <span className="font-medium text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.circulation}</span>
                                </div>
                              )}
                              {!hasFunctional && <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic py-2">No functional requirements recorded.</p>}
                            </div>
                          </div>

                          {/* Aesthetic Specs */}
                          <div className="bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] rounded-lg p-3.5 space-y-2 text-xs min-w-0 overflow-hidden">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5 pb-2 border-b border-[hsl(var(--border))]">
                              <Palette size={12} /> Aesthetic Requirements
                            </p>
                            <div className="divide-y divide-[hsl(var(--border)/0.5)] pt-0.5">
                              {(req.designStyle || req.theme) && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Style</span>
                                  <span className="font-semibold text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.designStyle || req.theme}</span>
                                </div>
                              )}
                              {req.colours && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Colours</span>
                                  <span className="font-semibold text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.colours}</span>
                                </div>
                              )}
                              {req.materials && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Materials</span>
                                  <span className="font-semibold text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.materials}</span>
                                </div>
                              )}
                              {req.flooring && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Flooring</span>
                                  <span className="font-medium text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.flooring}</span>
                                </div>
                              )}
                              {req.ceiling && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Ceiling</span>
                                  <span className="font-medium text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.ceiling}</span>
                                </div>
                              )}
                              {req.wallFinishes && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Walls</span>
                                  <span className="font-medium text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.wallFinishes}</span>
                                </div>
                              )}
                              {req.furnitureStyle && (
                                <div className="py-1.5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 first:pt-0 last:pb-0">
                                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider sm:w-28 shrink-0">Furniture Style</span>
                                  <span className="font-medium text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere] flex-1">{req.furnitureStyle}</span>
                                </div>
                              )}
                              {!hasAesthetic && <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic py-2">No aesthetic requirements recorded.</p>}
                            </div>
                          </div>
                        </div>

                        {req.description && (
                          <div className="bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] rounded-lg p-3 min-w-0 overflow-hidden">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 mb-1">
                              <Sparkles size={11} /> Specific Notes
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
              ) : (
                <div className="py-10 flex flex-col items-center justify-center border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--muted)/0.2)] text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <ClipboardList size={22} />
                  </div>
                  <h4 className="font-bold text-sm text-[hsl(var(--foreground))]">No Requirements Logged</h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                    Configure room-by-room functional and aesthetic specifications for this project.
                  </p>
                  {canDo('crm_requirements', 'update') && (
                    <button
                      onClick={() => setIsReqModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors active:scale-[0.98]"
                    >
                      <Plus size={13} /> Add Room Requirements
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB 2: SITE VISIT & MEASUREMENTS ── */}
        {showMeasurements && (
          <motion.div
            key="measurements-section"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Ruler size={16} className="text-purple-600" />
                Site Visit & Spatial Measurements
              </h3>
              {canDo('crm_site_visits', 'update') && (
                <button
                  onClick={() => setIsSiteVisitModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-colors active:scale-[0.98]"
                >
                  <Pencil size={12} /> Edit Measurements
                </button>
              )}
            </div>

            {(customerData.remarks || customerData.siteMeasurements?.notes || customerData.siteVisitScheduledDate) && (
              <div className="bg-purple-500/[0.04] border border-purple-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <FileText size={13} className="text-purple-600" />
                    Site Visit Briefing & Notes
                  </p>
                  {customerData.siteVisitScheduledDate && (
                    <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      Scheduled: {new Date(customerData.siteVisitScheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
                {(customerData.remarks || customerData.siteMeasurements?.notes) && (
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed bg-[hsl(var(--background))] border border-purple-500/20 rounded-lg p-3 break-words [overflow-wrap:anywhere]">
                    {customerData.remarks || customerData.siteMeasurements?.notes}
                  </p>
                )}
              </div>
            )}

            {hasMeasurements ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                {/* Card 1: Room & Spatial Dimensions */}
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4 hover:border-purple-500/30 transition-colors min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                      <Maximize2 size={15} className="text-purple-500" />
                      Room & Spatial Dimensions
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      Spatial
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 min-w-0">
                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Carpet Area</p>
                      <p className="font-bold text-sm text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.carpetArea || '—'} <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Sq.Ft</span>
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Ceiling Height</p>
                      <p className="font-bold text-sm text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.ceilingHeight || '—'} <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Ft</span>
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] col-span-2 min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Maximize2 size={11} className="text-purple-500" /> Room Dimensions (L × W)
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.roomDimensions || 'Not recorded'}
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] col-span-2 min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Layers size={11} className="text-indigo-500" /> Floor-to-Ceiling Height
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.floorToCeilingHeight || 'Not recorded'}
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] col-span-2 min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Rooms to Design</p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.rooms || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 2: Openings & Structural Elements */}
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4 hover:border-blue-500/30 transition-colors min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                      <DoorOpen size={15} className="text-blue-500" />
                      Openings & Structural Specs
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      Structure
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 min-w-0">
                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <DoorOpen size={11} className="text-blue-500" /> Door Dimensions
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.doorDimensions || 'Not recorded'}
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Maximize2 size={11} className="text-sky-500" /> Window Dimensions
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.windowDimensions || 'Not recorded'}
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Columns size={11} className="text-amber-500" /> Wall Thickness
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.wallThickness || 'Not recorded'}
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Columns size={11} className="text-orange-500" /> Column / Beam Dimensions
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.columnBeamDimensions || 'Not recorded'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 3: MEP & Utility Services */}
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4 hover:border-amber-500/30 transition-colors min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                      <Zap size={15} className="text-amber-500" />
                      MEP & Utility Services
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      MEP
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 min-w-0">
                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Zap size={11} /> Existing Electrical Points
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.electricalPoints || 'No electrical notes recorded'}
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-cyan-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Droplets size={11} /> Plumbing Points
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.plumbingPoints || 'No plumbing points recorded'}
                      </p>
                    </div>

                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Wind size={11} /> AC Locations & Piping
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.acLocations || 'No AC locations recorded'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 4: Furniture, Constraints & Notes */}
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 space-y-4 hover:border-emerald-500/30 transition-colors min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                      <Armchair size={15} className="text-emerald-500" />
                      Furniture & Site Constraints
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Conditions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 min-w-0">
                    <div className="bg-[hsl(var(--muted)/0.3)] rounded-lg p-3 border border-[hsl(var(--border))] min-w-0">
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Armchair size={11} /> Existing Furniture Dimensions
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.furnitureDimensions || 'No furniture dimensions recorded'}
                      </p>
                    </div>

                    <div className="bg-rose-500/[0.08] rounded-lg p-3 border border-rose-500/20 min-w-0">
                      <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertTriangle size={11} /> Site Constraints & Limitations
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.siteConstraints || 'None reported'}
                      </p>
                    </div>

                    <div className="bg-purple-500/[0.08] rounded-lg p-3 border border-purple-500/20 min-w-0">
                      <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <FileText size={11} /> Additional Site Notes
                      </p>
                      <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                        {siteMeasurements.notes || 'No notes added'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[hsl(var(--card))] border border-dashed border-[hsl(var(--border))] rounded-xl p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto">
                  <Ruler size={22} />
                </div>
                <h4 className="font-bold text-sm text-[hsl(var(--foreground))]">No Spatial Measurements Recorded</h4>
                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                  Log carpet area, ceiling heights, door/window openings, and MEP utilities.
                </p>
                {canDo('crm_site_visits', 'update') && (
                  <button
                    onClick={() => setIsSiteVisitModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors active:scale-[0.98]"
                  >
                    <Plus size={13} /> Log Measurements Now
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB 3: SITE PHOTOS ── */}
        {showPhotos && (
          <motion.div
            key="photos-section"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4"
          >
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                    Site Photos & Visual Records
                  </h3>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                    {sitePhotos.length} Photos
                  </span>
                </div>
                {canDo('crm_site_visits', 'update') && (
                  <button
                    onClick={() => setIsSiteVisitModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors active:scale-[0.98]"
                  >
                    <Pencil size={12} /> Manage Photos
                  </button>
                )}
              </div>

              {hasPhotos ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {sitePhotos.map((photo: any, idx: number) => {
                    const photoUrl = typeof photo === 'string' ? photo : photo?.url || '';
                    if (!photoUrl) return null;
                    return (
                      <a
                        key={idx}
                        href={photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border border-[hsl(var(--border))] hover:border-[hsl(var(--foreground)/0.4)] transition-all relative group bg-[hsl(var(--muted)/0.2)] block"
                      >
                        <img
                          src={photoUrl}
                          alt={`Site Photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                          <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center border border-dashed border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--muted)/0.2)] text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-60" />
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">No Site Photos Uploaded</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Upload site inspection photos & progress views.</p>
                  {canDo('crm_site_visits', 'update') && (
                    <button
                      onClick={() => setIsSiteVisitModalOpen(true)}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors active:scale-[0.98]"
                    >
                      <Plus size={12} /> Upload Site Photos
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals for Editing */}
      {customerData && (
        <>
          <InteriorLogSiteVisitModal
            isOpen={isSiteVisitModalOpen}
            onClose={() => setIsSiteVisitModalOpen(false)}
            customerId={customerData._id}
            onSuccess={loadSiteDetails}
            initialMeasurements={customerData.siteMeasurements}
            initialPhotos={customerData.sitePhotos}
          />
          <InteriorLogRequirementsModal
            isOpen={isReqModalOpen}
            onClose={() => setIsReqModalOpen(false)}
            customerId={customerData._id}
            onSuccess={loadSiteDetails}
            initialRequirements={teamRequirements.length > 0 ? teamRequirements : effectiveRequirements}
            clientRequirements={clientRequirements}
            initialBudget={customerData?.budgetRange || ''}
          />
        </>
      )}
    </div>
  );
}
