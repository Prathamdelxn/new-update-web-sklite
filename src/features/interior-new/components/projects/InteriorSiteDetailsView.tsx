'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  ExternalLink,
  UploadCloud,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Clock,
  PowerOff,
  RotateCcw,
  Settings,
  Edit3,
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/upload';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { InteriorLogSiteVisitModal } from '@/features/interior-new/components/crm/modals/InteriorLogSiteVisitModal';
import { InteriorLogRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorLogRequirementsModal';
import { InteriorCrmShareModal } from '@/features/interior-new/components/crm/modals/InteriorCrmShareModal';
import { InteriorSendRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorSendRequirementsModal';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/features/interior-new/hooks/usePermissions';

type TabType = 'requirements' | 'measurements' | 'photos' | 'all';

export default function InteriorSiteDetailsView() {
  const { projectId } = useParams() as { projectId: string };
  const toast = useToast();
  const { hasPermission: canDo } = usePermissions();
  const canEditReq = canDo('crm_requirements', 'update') || canDo('projects', 'update') || canDo('projects', 'create');
  const canEditSiteVisit = canDo('crm_site_visits', 'update') || canDo('projects', 'update') || canDo('projects', 'create');
  const canEditPhotos = canDo('photos', 'create') || canDo('photos', 'update') || canDo('crm_site_visits', 'update') || canDo('projects', 'update');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('requirements');
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);

  const ensureSiteProfile = useCallback(async (project: any) => {
    if (!project) return null;
    try {
      setActionLoading(true);
      const clientName = (project.client || project.name || 'Project Client').trim();
      const payload = {
        name: clientName,
        mobileNumber: '9876543210',
        leadSource: 'Existing Customer',
        status: 'Won',
        linkedProject: projectId,
        projectLocation: project.location?.city || project.location?.address || '',
        budgetRange: project.budget?.amount ? String(project.budget.amount) : '',
      };
      const res = await interiorApiClient.post('/crm/customers', payload);
      const newCust = res.data?.data || res.data;
      if (newCust) {
        setCustomerData(newCust);
        return newCust;
      }
    } catch (err: any) {
      console.warn('Auto initialize site profile fallback error:', err);
    } finally {
      setActionLoading(false);
    }
    return null;
  }, [projectId]);

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

      // 4. If still not found and we have project, auto-ensure site profile
      if (!customer && project) {
        customer = await ensureSiteProfile(project);
      }

      // 5. Fallback object if network creation delayed
      if (!customer && project) {
        customer = {
          _id: project._id,
          name: project.client || project.name || 'Project Client',
          leadNumber: project.code || 'PRJ',
          requirements: [],
          siteMeasurements: null,
          sitePhotos: [],
          linkedProject: projectId,
        };
      }

      // 6. Ensure we fetch the single customer detail if sitePhotos is missing or empty
      if (customer?._id && customer._id !== project?._id && (!customer.sitePhotos || customer.sitePhotos.length === 0)) {
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

      // 7. Merge any project execution photos (/projects/:id/photos) into sitePhotos list
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
  }, [projectId, toast, ensureSiteProfile]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isUpdatingExpiry, setIsUpdatingExpiry] = useState(false);
  const [isStoppingLink, setIsStoppingLink] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadSiteDetails();
  }, [loadSiteDetails]);

  // Share Settings & Link Expiry Status
  const shareSettings = customerData?.shareSettings || projectInfo?.linkedCustomer?.shareSettings;
  const isLinkStopped = shareSettings?.isPublic === false;
  const isLinkExpired = Boolean(
    shareSettings?.expiresAt && new Date(shareSettings.expiresAt).getTime() < Date.now()
  );
  const isLinkActive = Boolean(shareSettings?.shareToken && !isLinkStopped && !isLinkExpired);

  const getExpiryDisplay = () => {
    if (isLinkStopped) return { label: 'Link Stopped / Disabled', isWarning: true };
    if (isLinkExpired) return { label: 'Link Expired', isWarning: true };
    if (!shareSettings?.expiresAt) return { label: 'No Expiry (Always Active)', isWarning: false };

    const diffMs = new Date(shareSettings.expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return { label: 'Link Expired', isWarning: true };
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 1) {
      const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      return { label: `Expires in ${mins}m`, isWarning: true };
    }
    if (hours < 24) {
      return { label: `Expires in ${hours}h`, isWarning: hours <= 3 };
    }
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const expDateStr = new Date(shareSettings.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { label: `Expires in ${days}d (${expDateStr})`, isWarning: false };
  };

  const currentExpiry = getExpiryDisplay();

  const origin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')
      : '') || (typeof window !== 'undefined' ? window.location.origin : '');

  const shareToken = shareSettings?.shareToken;
  const clientFormUrl = shareToken && !isLinkStopped && !isLinkExpired ? `${origin}/share/requirements/${shareToken}` : '';

  const getOrFetchUrl = async (): Promise<string | null> => {
    if (isLinkStopped) {
      toast.error('Sharing link is currently stopped. Click "Reactivate" to enable it.');
      return null;
    }
    if (isLinkExpired) {
      toast.error('Sharing link has expired. Click "Reactivate" to enable it.');
      return null;
    }
    if (clientFormUrl) return clientFormUrl;

    let cust = customerData;
    if (!cust?._id && projectInfo) {
      cust = await ensureSiteProfile(projectInfo);
    }
    const customerId = cust?._id;
    if (!customerId) {
      toast.error('Site profile ID is missing.');
      return null;
    }

    try {
      setIsGeneratingLink(true);
      const res = await interiorCrmService.generateShareLink(customerId, {
        mode: 'requirements',
        includeRequirements: true,
        allowDownload: false,
      });

      const token = res?.data?.shareToken || res?.shareToken;
      if (token) {
        await loadSiteDetails();
        return `${origin}/share/requirements/${token}`;
      }
      throw new Error(res?.error || res?.message || 'Failed to generate share link');
    } catch (err: any) {
      console.error('Error generating share link:', err);
      toast.error(err?.response?.data?.error || err?.message || 'Failed to create share link');
      return null;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    const url = await getOrFetchUrl();
    if (!url) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      toast.success('Shareable Client Intake Link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleShareWhatsApp = async () => {
    const url = await getOrFetchUrl();
    if (!url) return;
    const clientName = (projectInfo?.client || customerData?.name || 'there').split(' ')[0];
    const message = encodeURIComponent(
      `Hi ${clientName}! Please share your interior design preferences & room requirements using this interactive questionnaire: ${url}\n\nOur design team will review your wishlist and prepare tailored 2D & 3D plans!`
    );
    const phone = (customerData?.mobileNumber || '').replace(/[^0-9]/g, '');
    const waUrl = phone && phone !== '9876543210' ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleStopLink = async () => {
    let cust = customerData;
    if (!cust?._id && projectInfo) {
      cust = await ensureSiteProfile(projectInfo);
    }
    const customerId = cust?._id;
    if (!customerId) return;

    if (!confirm('Stop Client Intake Link? The link will be deactivated immediately and clients opening it will be blocked.')) {
      return;
    }

    setIsStoppingLink(true);
    try {
      await interiorCrmService.revokeShareLink(customerId);
      toast.success('Client intake link stopped.');
      await loadSiteDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to stop link');
    } finally {
      setIsStoppingLink(false);
    }
  };

  const handleChangeExpiry = async (hours: number | null) => {
    let cust = customerData;
    if (!cust?._id && projectInfo) {
      cust = await ensureSiteProfile(projectInfo);
    }
    const customerId = cust?._id;
    if (!customerId) return;

    setIsUpdatingExpiry(true);
    try {
      await interiorCrmService.generateShareLink(customerId, {
        mode: 'requirements',
        includeRequirements: true,
        allowDownload: false,
        expiresHours: hours,
      });
      const label =
        hours === null
          ? 'Never expire'
          : hours === 24
          ? '24 hours'
          : hours === 72
          ? '3 days'
          : hours === 168
          ? '7 days'
          : hours === 720
          ? '30 days'
          : `${hours} hours`;
      toast.success(`Link expiry set to ${label}.`);
      await loadSiteDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update link expiry');
    } finally {
      setIsUpdatingExpiry(false);
    }
  };

  const handleReactivateLink = async (hours: number | null = 168) => {
    let cust = customerData;
    if (!cust?._id && projectInfo) {
      cust = await ensureSiteProfile(projectInfo);
    }
    const customerId = cust?._id;
    if (!customerId) return;

    setIsUpdatingExpiry(true);
    try {
      await interiorCrmService.generateShareLink(customerId, {
        mode: 'requirements',
        includeRequirements: true,
        allowDownload: false,
        expiresHours: hours,
      });
      toast.success('Client intake link reactivated!');
      await loadSiteDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to reactivate link');
    } finally {
      setIsUpdatingExpiry(false);
    }
  };

  const handleOpenShareModal = async () => {
    let cust = customerData;
    if (!cust?._id && projectInfo) {
      cust = await ensureSiteProfile(projectInfo);
    }
    setIsShareModalOpen(true);
  };

  const handleOpenEmailModal = async () => {
    let cust = customerData;
    if (!cust?._id && projectInfo) {
      cust = await ensureSiteProfile(projectInfo);
    }
    setIsSendEmailModalOpen(true);
  };

  // Cross-tab synchronization & auto-polling when awaiting client input
  useEffect(() => {
    const custId = customerData?._id;
    const currentToken = shareSettings?.shareToken;

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('crm_requirement_channel');
        channel.onmessage = (event) => {
          const data = event.data;
          if (
            data?.type === 'REQUIREMENT_SUBMITTED' &&
            (!data.leadId || data.leadId === custId || !data.token || data.token === currentToken)
          ) {
            loadSiteDetails();
          }
        };
      }
    } catch (e) {}

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'crm_requirement_sync' && event.newValue) {
        loadSiteDetails();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && isLinkActive && !customerData?.clientRequirementsSubmittedAt) {
        loadSiteDetails();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleVisibilityOrFocus);
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('focus', handleVisibilityOrFocus);
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
    };
  }, [customerData?._id, shareSettings?.shareToken, isLinkActive, customerData?.clientRequirementsSubmittedAt, loadSiteDetails]);

  const handleOpenReqModal = async () => {
    let cust = customerData;
    if (!cust?._id && projectInfo) {
      cust = await ensureSiteProfile(projectInfo);
    }
    setIsReqModalOpen(true);
  };

  const handleOpenSiteVisitModal = async () => {
    let cust = customerData;
    if (!cust?._id && projectInfo) {
      cust = await ensureSiteProfile(projectInfo);
    }
    setIsSiteVisitModalOpen(true);
  };

  const handleDirectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingPhotos(true);
      const fileList = Array.from(files);
      const uploadPromises = fileList.map(async (file) => {
        return await uploadToCloudinary(file);
      });
      const newUrls = await Promise.all(uploadPromises);
      const validUrls = newUrls.filter((u): u is string => typeof u === 'string' && u.length > 0);

      if (validUrls.length > 0) {
        // 1. Post to project execution photos
        for (const url of validUrls) {
          try {
            await interiorApiClient.post(`/projects/${projectId}/photos`, {
              url,
              category: 'site_visit',
            });
          } catch {}
        }

        // 2. Update CRM customer if customerId exists
        let currentCust = customerData;
        if (!currentCust?._id && projectInfo) {
          currentCust = await ensureSiteProfile(projectInfo);
        }
        if (currentCust?._id && currentCust._id !== projectInfo?._id) {
          const existing = Array.isArray(currentCust.sitePhotos) ? currentCust.sitePhotos : [];
          const updated = Array.from(new Set([...existing, ...validUrls]));
          await interiorApiClient.patch(`/crm/customers/${currentCust._id}`, {
            sitePhotos: updated,
          });
        }
        toast.success(`Successfully uploaded ${validUrls.length} photo${validUrls.length > 1 ? 's' : ''}`);
        await loadSiteDetails();
      }
    } catch (err: any) {
      console.error('Failed to upload photos:', err);
      toast.error('Failed to upload some or all photos');
    } finally {
      setUploadingPhotos(false);
      if (e.target) e.target.value = '';
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

  const activeCustomer = customerData || {
    _id: projectInfo?._id || projectId,
    name: projectInfo?.client || projectInfo?.name || 'Project Client',
    leadNumber: projectInfo?.code || 'PRJ',
    requirements: [],
    siteMeasurements: null,
    sitePhotos: [],
    linkedProject: projectId,
  };

  const requirements = effectiveRequirements;
  const isClientSubmittedOnly = teamRequirements.length === 0 && clientRequirements.length > 0;
  const isClientSubmitted = clientRequirements.length > 0;

  const { siteMeasurements, sitePhotos = [] } = activeCustomer;
  const hasRequirements = requirements.length > 0;
  const hasMeasurements = !!siteMeasurements;
  const hasPhotos = sitePhotos.length > 0;

  const showRequirements = activeTab === 'all' || activeTab === 'requirements';
  const showMeasurements = activeTab === 'all' || activeTab === 'measurements';
  const showPhotos = activeTab === 'all' || activeTab === 'photos';

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      {/* Hidden file input for direct photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDirectPhotoUpload}
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

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
                  {isLinkActive ? (
                    <button
                      onClick={handleCopyLink}
                      disabled={isGeneratingLink}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/20 transition-colors active:scale-[0.98] cursor-pointer"
                      title="Copy shareable client intake link"
                    >
                      {copiedLink ? <Check size={11} className="text-emerald-500" /> : <Share2 size={11} />}
                      {copiedLink ? 'Copied' : 'Share Intake Link'}
                    </button>
                  ) : (isLinkStopped || isLinkExpired) ? (
                    <button
                      onClick={() => handleReactivateLink(168)}
                      disabled={isUpdatingExpiry}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/20 transition-colors active:scale-[0.98] cursor-pointer"
                      title="Reactivate intake link"
                    >
                      <RotateCcw size={11} />
                      Reactivate Link
                    </button>
                  ) : null}
                  {canEditReq && (
                    <button
                      onClick={handleOpenReqModal}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-colors active:scale-[0.98]"
                    >
                      <PenTool size={11} /> {hasRequirements ? 'Edit Requirements' : '+ Add Requirements'}
                    </button>
                  )}
                </div>
              </div>

              {/* Dedicated Shareable Link & Client Intake Status Card */}
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20 shrink-0">
                      <Share2 size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">
                          Shareable Client Intake & Questionnaire Link
                        </h4>
                        {activeCustomer?.clientRequirementsSubmittedAt ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Client Wishlist Received
                          </span>
                        ) : isLinkActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            Awaiting Client Input
                          </span>
                        ) : isLinkStopped ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1">
                            <PowerOff size={10} />
                            Link Stopped
                          </span>
                        ) : isLinkExpired ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                            <Clock size={10} />
                            Link Expired
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 border border-slate-500/20">
                            Not Active
                          </span>
                        )}

                        {isLinkActive && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                              currentExpiry.isWarning
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                : "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20"
                            )}
                          >
                            <Clock size={10} />
                            {currentExpiry.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                        {activeCustomer?.clientRequirementsSubmittedAt
                          ? `Client submitted wishlist on ${new Date(activeCustomer.clientRequirementsSubmittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                          : isLinkStopped
                          ? 'This questionnaire link has been stopped. Reactivate it to allow the client to access and fill the form.'
                          : isLinkExpired
                          ? 'This questionnaire link has expired. Reactivate it to set a new expiry window.'
                          : isLinkActive
                          ? 'Clients can open this link on mobile or desktop to choose styles, upload inspiration images, and specify room requirements.'
                          : 'Generate an interactive intake form so the client can submit their preferences online.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isLinkActive ? (
                      <>
                        <button
                          type="button"
                          disabled={isGeneratingLink}
                          onClick={handleCopyLink}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Copy public link"
                        >
                          {copiedLink ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isGeneratingLink}
                          onClick={handleShareWhatsApp}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Send link on WhatsApp"
                        >
                          <MessageCircle size={12} />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenEmailModal}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                          title="Email Questionnaire to Client"
                        >
                          <Mail size={12} />
                          <span className="hidden sm:inline">Email</span>
                        </button>

                        {clientFormUrl && (
                          <a
                            href={clientFormUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg text-xs font-semibold transition-all"
                            title="Preview Client Intake Form in New Tab"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}

                        {/* Expiry Dropdown Selector if link is active */}
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] rounded-lg text-xs">
                          <Clock size={11} className="text-amber-500 shrink-0" />
                          <select
                            disabled={isUpdatingExpiry}
                            value={
                              shareSettings?.expiresAt === null || shareSettings?.expiresAt === undefined
                                ? 'never'
                                : (() => {
                                    const diffMs = new Date(shareSettings.expiresAt).getTime() - Date.now();
                                    const h = Math.round(diffMs / (1000 * 60 * 60));
                                    if (Math.abs(h - 24) <= 4) return '24';
                                    if (Math.abs(h - 72) <= 8) return '72';
                                    if (Math.abs(h - 168) <= 24) return '168';
                                    if (Math.abs(h - 720) <= 48) return '720';
                                    return 'custom';
                                  })()
                            }
                            onChange={(e) => {
                              const val = e.target.value === 'never' ? null : Number(e.target.value);
                              handleChangeExpiry(val);
                            }}
                            className="bg-transparent text-[11px] font-semibold text-[hsl(var(--foreground))] outline-none cursor-pointer"
                            title="Schedule link expiry duration"
                          >
                            <option value="24" className="bg-[hsl(var(--card))]">24h</option>
                            <option value="72" className="bg-[hsl(var(--card))]">3d</option>
                            <option value="168" className="bg-[hsl(var(--card))]">7d</option>
                            <option value="720" className="bg-[hsl(var(--card))]">30d</option>
                            <option value="never" className="bg-[hsl(var(--card))]">Never</option>
                            <option value="custom" disabled hidden className="bg-[hsl(var(--card))]">Custom</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          disabled={isStoppingLink}
                          onClick={handleStopLink}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Deactivate link"
                        >
                          <PowerOff size={11} />
                          <span className="hidden sm:inline">Stop</span>
                        </button>
                      </>
                    ) : (isLinkStopped || isLinkExpired) ? (
                      <button
                        type="button"
                        disabled={isUpdatingExpiry}
                        onClick={() => handleReactivateLink(168)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                        title="Reactivate client link"
                      >
                        <RotateCcw size={12} />
                        <span>Reactivate Link</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isGeneratingLink}
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Generate and copy shareable client link"
                      >
                        <Share2 size={12} />
                        <span>Generate Link</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleOpenShareModal}
                      className="p-1.5 bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-lg transition-all active:scale-95 cursor-pointer"
                      title="Link Settings, Permissions & QR Code"
                    >
                      <Settings size={13} />
                    </button>
                  </div>
                </div>

                {activeCustomer?.clientRequirementsNotes && (
                  <div className="text-xs text-[hsl(var(--foreground))] italic bg-[hsl(var(--muted)/0.3)] px-3 py-2 rounded-lg border border-[hsl(var(--border))] break-words [overflow-wrap:anywhere]">
                    <span className="font-semibold not-italic text-emerald-600">Client Note: </span>
                    "{activeCustomer.clientRequirementsNotes}"
                  </div>
                )}
              </div>

              {/* Budget & Overview Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[hsl(var(--background))] rounded-xl p-3.5 border border-[hsl(var(--border))] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <DollarSign size={17} />
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Estimated Budget</p>
                    <p className="font-bold text-xs text-[hsl(var(--foreground))] truncate mt-0.5">
                      {activeCustomer?.budgetRange || (projectInfo?.budget?.amount ? `₹${projectInfo.budget.amount.toLocaleString()}` : 'Not recorded')}
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
                      {requirements[0]?.interiorType || activeCustomer?.propertyType || projectInfo?.type || 'Residential'}
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
                  {canEditReq && (
                    <button
                      onClick={handleOpenReqModal}
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
              {canEditSiteVisit && (
                <button
                  onClick={handleOpenSiteVisitModal}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-colors active:scale-[0.98]"
                >
                  <Pencil size={12} /> {hasMeasurements ? 'Edit Measurements' : '+ Log Measurements'}
                </button>
              )}
            </div>

            {(activeCustomer?.remarks || siteMeasurements?.notes || activeCustomer?.siteVisitScheduledDate) && (
              <div className="bg-purple-500/[0.04] border border-purple-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <FileText size={13} className="text-purple-600" />
                    Site Visit Briefing & Notes
                  </p>
                  {activeCustomer?.siteVisitScheduledDate && (
                    <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      Scheduled: {new Date(activeCustomer.siteVisitScheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
                {(activeCustomer?.remarks || siteMeasurements?.notes) && (
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-relaxed bg-[hsl(var(--background))] border border-purple-500/20 rounded-lg p-3 break-words [overflow-wrap:anywhere]">
                    {activeCustomer?.remarks || siteMeasurements?.notes}
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
                {canEditSiteVisit && (
                  <button
                    onClick={handleOpenSiteVisitModal}
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
                <div className="flex items-center gap-2">
                  {canEditPhotos && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhotos}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      {uploadingPhotos ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                      {uploadingPhotos ? 'Uploading...' : 'Upload Photos'}
                    </button>
                  )}
                  {canEditSiteVisit && (
                    <button
                      onClick={handleOpenSiteVisitModal}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted)/0.8)] px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] transition-colors active:scale-[0.98]"
                    >
                      <Pencil size={12} /> Manage in Visit
                    </button>
                  )}
                </div>
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
                  {canEditPhotos && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhotos}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      {uploadingPhotos ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      {uploadingPhotos ? 'Uploading...' : 'Upload Site Photos'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals for Editing & Sharing */}
      {activeCustomer?._id && (
        <>
          <InteriorLogSiteVisitModal
            isOpen={isSiteVisitModalOpen}
            onClose={() => setIsSiteVisitModalOpen(false)}
            customerId={activeCustomer._id}
            onSuccess={loadSiteDetails}
            initialMeasurements={activeCustomer.siteMeasurements}
            initialPhotos={activeCustomer.sitePhotos}
            instructions={activeCustomer.remarks || activeCustomer.siteMeasurements?.notes}
          />
          <InteriorLogRequirementsModal
            isOpen={isReqModalOpen}
            onClose={() => setIsReqModalOpen(false)}
            customerId={activeCustomer._id}
            onSuccess={loadSiteDetails}
            initialRequirements={teamRequirements.length > 0 ? teamRequirements : effectiveRequirements}
            clientRequirements={clientRequirements}
            initialBudget={activeCustomer?.budgetRange || (projectInfo?.budget?.amount ? String(projectInfo.budget.amount) : '')}
          />
          <InteriorCrmShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            lead={activeCustomer}
            mode="requirements"
            onUpdated={loadSiteDetails}
          />
          <InteriorSendRequirementsModal
            isOpen={isSendEmailModalOpen}
            onClose={() => setIsSendEmailModalOpen(false)}
            lead={activeCustomer}
            onSuccess={loadSiteDetails}
          />
        </>
      )}
    </div>
  );
}
