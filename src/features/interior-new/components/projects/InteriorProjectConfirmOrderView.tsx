'use client';

// =============================================================================
// Sky-Lite Web — Interior Project Confirm Order View
// Mirrors the executive Confirmed Order Phase from CRM Lead Details:
// - Order Summary Card with Agreed Budget, Advance, and Dispatch Status
// - Vendor Quotations Dispatch & Comparison Matrix
// - General Order Attachments & Signed Documents Uploader
// - Create / Edit Confirm Order Modal with Vendor Selection
// =============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import interiorApiClient from '@/services/interiorApi.client';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';
import { useToast } from '@/providers/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import { InteriorConfirmedOrderStageView } from '@/features/interior-new/components/crm/InteriorConfirmedOrderStageView';
import { InteriorCreateConfirmOrderModal } from '@/features/interior-new/components/crm/modals/InteriorCreateConfirmOrderModal';

function InteriorProjectConfirmOrderSkeleton() {
  return (
    <div className="space-y-4 animate-pulse font-sans">
      {/* Header Summary Skeleton */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-48 bg-slate-200/90 rounded-md" />
                <div className="h-4.5 w-24 bg-slate-100 rounded-full" />
              </div>
              <div className="h-3.5 w-72 max-w-full bg-slate-200/60 rounded-md" />
            </div>
          </div>
          <div className="h-9 w-36 bg-slate-200/80 rounded-xl shrink-0" />
        </div>

        {/* 4 Metric Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-1.5">
              <div className="h-3 w-20 bg-slate-200/60 rounded" />
              <div className="h-5 w-28 bg-slate-200/90 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs p-6 space-y-4">
        <div className="h-5 w-44 bg-slate-200/80 rounded" />
        <div className="h-28 bg-slate-100/70 rounded-xl" />
      </div>
    </div>
  );
}

export default function InteriorProjectConfirmOrderView() {
  const params = useParams();
  const projectId = (params?.projectId || params?.id) as string;
  const router = useRouter();
  const toast = useToast();
  const { currencySymbol } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [lead, setLead] = useState<any>(null);
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);
  // Project "Confirm Order" permission (no CRM access needed)
  const { can: canDo } = useProjectPermissions(projectId);
  const saveUpdates = (updates: Record<string, any>) => interiorProjectService.updateProjectConfirmOrder(projectId, updates);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);

      // 1. Project details (optional — only used for the fallback below)
      let projectData: any = null;
      const [prjResult, orderResult] = await Promise.allSettled([
        interiorApiClient.get(`/projects/${projectId}`),
        // 2. The CRM lead linked to this project (Confirm Order → View)
        interiorProjectService.getProjectConfirmOrder(projectId),
      ]);
      if (prjResult.status === 'fulfilled') {
        projectData = prjResult.value?.data?.data || prjResult.value?.data || null;
        setProject(projectData);
      }
      if (orderResult.status === 'rejected') throw orderResult.reason;
      const matchedCustomer = orderResult.value?.data || null;

      if (matchedCustomer) {
        setLead(matchedCustomer);
      } else {
        // Fallback: build a synthetic lead representation from project data
        setLead({
          _id: projectData?.id || projectData?._id || projectId,
          name: projectData?.client || projectData?.name || 'Project Client',
          email: projectData?.email || '',
          phone: projectData?.phone || '',
          projectLocation: projectData?.city || projectData?.address || '',
          budgetRange: projectData?.budget?.amount
            ? `${currencySymbol} ${Number(projectData.budget.amount).toLocaleString()}`
            : '',
          quotations: projectData?.quotations || [],
          boqs: projectData?.boqs || [],
          confirmedOrder: projectData?.confirmedOrder || null,
          linkedProject: projectId,
        });
      }
    } catch (err) {
      console.error('Failed to load project confirmed order:', err);
      toast.error((err as any)?.response?.data?.error || 'Failed to load order confirmation data');
    } finally {
      setLoading(false);
    }
  }, [projectId, currencySymbol, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <InteriorProjectConfirmOrderSkeleton />;
  }

  return (
    <div className="w-full space-y-4 font-sans">
      <InteriorConfirmedOrderStageView
        lead={lead}
        currencySymbol={currencySymbol}
        isReadOnly={false}
        onRefresh={loadData}
        onOpenConfirmModal={() => setIsConfirmOrderModalOpen(true)}
        onOpenQuotationModal={() => router.push(`/interior-new/projects/${projectId}/quotation`)}
        saveUpdates={saveUpdates}
        canEdit={canDo('confirm_order', 'update')}
      />

      {/* Confirm Order Modal */}
      {isConfirmOrderModalOpen && (
        <InteriorCreateConfirmOrderModal
          isOpen={isConfirmOrderModalOpen}
          onClose={() => setIsConfirmOrderModalOpen(false)}
          lead={lead}
          saveUpdates={saveUpdates}
          onSuccess={() => {
            setIsConfirmOrderModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
