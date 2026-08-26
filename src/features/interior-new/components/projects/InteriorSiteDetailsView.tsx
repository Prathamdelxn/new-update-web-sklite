'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';
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
  DollarSign
} from 'lucide-react';
import { InteriorLogSiteVisitModal } from '@/features/interior-new/components/crm/modals/InteriorLogSiteVisitModal';
import { InteriorLogRequirementsModal } from '@/features/interior-new/components/crm/modals/InteriorLogRequirementsModal';

export default function InteriorSiteDetailsView() {
  const { projectId } = useParams() as { projectId: string };
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);

  const loadSiteDetails = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch CRM customers to find the original lead linked to this project
      const custRes = await interiorApiClient.get(`/crm/customers`);
      const customers = custRes.data?.data || custRes.data || [];

      const customer = customers.find((c: any) => {
        if (!c.linkedProject) return false;
        const linkedId =
          typeof c.linkedProject === 'object' && c.linkedProject !== null && c.linkedProject._id
            ? String(c.linkedProject._id)
            : String(c.linkedProject);
        return linkedId === String(projectId);
      });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[hsl(var(--border))] rounded-3xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-6 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))]">
          <ClipboardList size={32} />
        </div>
        <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No CRM Link Found</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm">
          This project doesn't have an associated CRM lead record or site visit data linked yet.
        </p>
      </div>
    );
  }

  const { requirements = [], siteMeasurements, sitePhotos = [] } = customerData;
  const hasRequirements = requirements.length > 0;
  const hasMeasurements = !!siteMeasurements;
  const hasPhotos = sitePhotos.length > 0;

  if (!hasRequirements && !hasMeasurements && !hasPhotos) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[hsl(var(--border))] rounded-3xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-6 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-600">
          <Ruler size={32} />
        </div>
        <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No Site Details Logged</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-sm">
          The original CRM lead does not have any recorded requirements, measurements, or site photos.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setIsSiteVisitModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-purple-600/20"
          >
            <Plus size={15} /> Log Site Measurements
          </button>
          <button
            onClick={() => setIsReqModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <Plus size={15} /> Add Requirements
          </button>
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
            />
            <InteriorLogRequirementsModal
              isOpen={isReqModalOpen}
              onClose={() => setIsReqModalOpen(false)}
              customerId={customerData._id}
              onSuccess={loadSiteDetails}
              initialRequirements={customerData.requirements}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 md:px-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black text-[hsl(var(--foreground))]">Site Inspection & Technical Details</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
              Lead: {customerData.leadNumber || 'LD-CRM'}
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Comprehensive spatial measurements, MEP provisions, structural specs, and site conditions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsSiteVisitModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-purple-600/20"
          >
            <Pencil size={13} /> Edit Measurements
          </button>
          <button
            onClick={() => setIsReqModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-600/20"
          >
            <PenTool size={13} /> Edit Requirements
          </button>
        </div>
      </div>

      {/* 4-Card Structured Grid */}
      {hasMeasurements ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Room & Spatial Dimensions */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                <Maximize2 size={16} className="text-purple-500" />
                Room & Spatial Dimensions
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Spatial
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Carpet Area</p>
                <p className="font-black text-sm text-[hsl(var(--foreground))]">
                  {siteMeasurements.carpetArea || '—'} <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Sq.Ft</span>
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Ceiling Height</p>
                <p className="font-black text-sm text-[hsl(var(--foreground))]">
                  {siteMeasurements.ceilingHeight || '—'} <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Ft</span>
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Maximize2 size={11} className="text-purple-500" /> Room Dimensions (Length × Width)
                </p>
                <p className="font-bold text-xs text-[hsl(var(--foreground))]">
                  {siteMeasurements.roomDimensions || 'Not recorded'}
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Layers size={11} className="text-indigo-500" /> Floor-to-Ceiling Height
                </p>
                <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                  {siteMeasurements.floorToCeilingHeight || 'Not recorded'}
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))] col-span-2">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Rooms to Design</p>
                <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                  {siteMeasurements.rooms || 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Openings & Structural Elements */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                <DoorOpen size={16} className="text-blue-500" />
                Openings & Structural Specs
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Structure
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <DoorOpen size={11} className="text-blue-500" /> Door Dimensions
                </p>
                <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                  {siteMeasurements.doorDimensions || 'Not recorded'}
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Maximize2 size={11} className="text-sky-500" /> Window Dimensions
                </p>
                <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                  {siteMeasurements.windowDimensions || 'Not recorded'}
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Columns size={11} className="text-amber-500" /> Wall Thickness
                </p>
                <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                  {siteMeasurements.wallThickness || 'Not recorded'}
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Columns size={11} className="text-orange-500" /> Column / Beam Dimensions
                </p>
                <p className="font-semibold text-xs text-[hsl(var(--foreground))]">
                  {siteMeasurements.columnBeamDimensions || 'Not recorded'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: MEP & Utility Services */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                MEP & Utility Services
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
                MEP
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Zap size={11} /> Existing Electrical Points
                </p>
                <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                  {siteMeasurements.electricalPoints || 'No electrical notes recorded'}
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Droplets size={11} /> Plumbing Points
                </p>
                <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                  {siteMeasurements.plumbingPoints || 'No plumbing points recorded'}
                </p>
              </div>

              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Wind size={11} /> AC Locations & Piping
                </p>
                <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                  {siteMeasurements.acLocations || 'No AC locations recorded'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Furniture, Constraints & Notes */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                <Armchair size={16} className="text-emerald-500" />
                Furniture & Site Constraints
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Conditions
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[hsl(var(--muted)/0.4)] rounded-xl p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Armchair size={11} /> Existing Furniture Dimensions
                </p>
                <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                  {siteMeasurements.furnitureDimensions || 'No furniture dimensions recorded'}
                </p>
              </div>

              <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> Site Constraints & Limitations
                </p>
                <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                  {siteMeasurements.siteConstraints || 'None reported'}
                </p>
              </div>

              <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText size={11} /> Additional Site Notes
                </p>
                <p className="font-medium text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap leading-relaxed">
                  {siteMeasurements.notes || 'No notes added'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 text-center">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">No spatial measurements recorded yet.</p>
        </div>
      )}

      {/* Photos Section */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
          <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
            <ImageIcon size={16} className="text-emerald-500" />
            Site Photos & Visual Records
          </h3>
          <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2.5 py-1 rounded-lg border border-[hsl(var(--border))]">
            {sitePhotos.length} Photos
          </span>
        </div>

        {hasPhotos ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {sitePhotos.map((photo: string, idx: number) => (
              <a
                key={idx}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-xl overflow-hidden border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-all relative group bg-[hsl(var(--muted)/0.3)] shadow-sm block"
              >
                <img
                  src={photo}
                  alt={`Site Photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={20} />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center border-2 border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--muted)/0.2)] text-center">
            <ImageIcon className="w-8 h-8 text-[hsl(var(--muted-foreground))] mb-2 opacity-60" />
            <p className="text-xs font-bold text-[hsl(var(--foreground))]">No Site Photos Uploaded</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Click edit to upload site photos.</p>
          </div>
        )}
      </div>

      {/* Comprehensive Requirements Section */}
      {hasRequirements && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[hsl(var(--border))]">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
                <ClipboardList size={18} className="text-emerald-600" />
                Client Design Requirements & Specifications
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                Functional and aesthetic specifications captured for execution.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl self-start sm:self-auto">
              {requirements.length} Spaces to Execute
            </span>
          </div>

          {/* Budget & Overview Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-[hsl(var(--muted)/0.3)] rounded-2xl p-3.5 border border-[hsl(var(--border))] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <DollarSign size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Estimated Budget</p>
                <p className="font-black text-xs text-[hsl(var(--foreground))] truncate mt-0.5">
                  {customerData?.budgetRange || 'Not recorded'}
                </p>
              </div>
            </div>

            <div className="bg-[hsl(var(--muted)/0.3)] rounded-2xl p-3.5 border border-[hsl(var(--border))] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <Layers size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Interior Type</p>
                <p className="font-black text-xs text-[hsl(var(--foreground))] truncate mt-0.5">
                  {requirements[0]?.interiorType || customerData.propertyType || 'Residential'}
                </p>
              </div>
            </div>

            <div className="bg-[hsl(var(--muted)/0.3)] rounded-2xl p-3.5 border border-[hsl(var(--border))] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold shrink-0">
                <Palette size={18} />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Primary Theme</p>
                <p className="font-black text-xs text-[hsl(var(--foreground))] truncate mt-0.5">
                  {requirements.find((r: any) => r.designStyle)?.designStyle || requirements[0]?.theme || 'Custom Spec'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {requirements.map((req: any, idx: number) => {
              const hasFunctional = !!(req.roomUsage || req.furnitureRequirements || req.storage || req.electricalPoints || req.lightingRequirements || req.plumbingRequirements || req.circulation);
              const hasAesthetic = !!(req.designStyle || req.colours || req.materials || req.flooring || req.ceiling || req.wallFinishes || req.furnitureStyle || req.theme);

              return (
                <div key={idx} className="bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[hsl(var(--border))]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="font-black text-base text-[hsl(var(--foreground))]">{req.roomName || 'General Space'}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {req.interiorType && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-md">
                          {req.interiorType}
                        </span>
                      )}
                      {(req.designStyle || req.theme) && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md flex items-center gap-1">
                          <Palette size={10} /> {req.designStyle || req.theme}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Functional Specs */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-2.5 text-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5 pb-1 border-b border-[hsl(var(--border))]">
                        <Sliders size={12} /> Functional Requirements
                      </p>
                      {req.roomUsage && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Usage: </span>
                          <span className="font-semibold text-[hsl(var(--foreground))]">{req.roomUsage}</span>
                        </div>
                      )}
                      {req.furnitureRequirements && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Furniture: </span>
                          <span className="font-semibold text-[hsl(var(--foreground))]">{req.furnitureRequirements}</span>
                        </div>
                      )}
                      {req.storage && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Storage: </span>
                          <span className="font-semibold text-[hsl(var(--foreground))]">{req.storage}</span>
                        </div>
                      )}
                      {req.electricalPoints && (
                        <div>
                          <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                            <Zap size={10} /> Electrical:
                          </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{req.electricalPoints}</span>
                        </div>
                      )}
                      {req.lightingRequirements && (
                        <div>
                          <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                            <Sun size={10} /> Lighting:
                          </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{req.lightingRequirements}</span>
                        </div>
                      )}
                      {req.plumbingRequirements && (
                        <div>
                          <span className="text-[10px] font-bold text-cyan-500 uppercase flex items-center gap-1">
                            <Droplets size={10} /> Plumbing:
                          </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{req.plumbingRequirements}</span>
                        </div>
                      )}
                      {req.circulation && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Circulation: </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{req.circulation}</span>
                        </div>
                      )}
                      {!hasFunctional && <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic">No functional requirements recorded.</p>}
                    </div>

                    {/* Aesthetic Specs */}
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-2.5 text-xs">
                      <p className="text-[10px] font-black uppercase tracking-wider text-purple-600 flex items-center gap-1.5 pb-1 border-b border-[hsl(var(--border))]">
                        <Palette size={12} /> Aesthetic Requirements
                      </p>
                      {(req.designStyle || req.theme) && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Style: </span>
                          <span className="font-semibold text-[hsl(var(--foreground))]">{req.designStyle || req.theme}</span>
                        </div>
                      )}
                      {req.colours && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Colours: </span>
                          <span className="font-semibold text-[hsl(var(--foreground))]">{req.colours}</span>
                        </div>
                      )}
                      {req.materials && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Materials: </span>
                          <span className="font-semibold text-[hsl(var(--foreground))]">{req.materials}</span>
                        </div>
                      )}
                      {req.flooring && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Flooring: </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{req.flooring}</span>
                        </div>
                      )}
                      {req.ceiling && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Ceiling: </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{req.ceiling}</span>
                        </div>
                      )}
                      {req.wallFinishes && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Walls: </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{req.wallFinishes}</span>
                        </div>
                      )}
                      {req.furnitureStyle && (
                        <div>
                          <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase">Furniture Style: </span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{req.furnitureStyle}</span>
                        </div>
                      )}
                      {!hasAesthetic && <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic">No aesthetic requirements recorded.</p>}
                    </div>
                  </div>

                  {req.description && (
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 mb-1">
                        <Sparkles size={11} /> Specific Notes
                      </p>
                      <p className="text-xs text-[hsl(var(--foreground))] font-medium leading-relaxed whitespace-pre-wrap">
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

      {/* Modals */}
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
            initialRequirements={customerData.requirements}
            initialBudget={customerData?.budgetRange || ''}
          />
        </>
      )}
    </div>
  );
}
