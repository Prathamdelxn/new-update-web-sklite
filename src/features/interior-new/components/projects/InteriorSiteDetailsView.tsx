'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/interior/ui';
import interiorApiClient from '@/services/interiorApi.client';
import { useToast } from '@/providers/ToastContext';
import { Loader2, ClipboardList, Ruler, Image as ImageIcon, FileText, Calendar, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InteriorSiteDetailsView() {
  const { projectId } = useParams() as { projectId: string };
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);

  useEffect(() => {
    async function loadSiteDetails() {
      try {
        setLoading(true);
        // Fetch CRM customers to find the original lead linked to this project
        const custRes = await interiorApiClient.get(`/crm/customers`);
        const customers = custRes.data?.data || custRes.data || [];
        
        const customer = customers.find((c: any) => {
          if (!c.linkedProject) return false;
          const linkedId = typeof c.linkedProject === 'object' && c.linkedProject !== null && c.linkedProject._id 
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
    }

    loadSiteDetails();
  }, [projectId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-6 text-center space-y-4">
        <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))]">
          <ClipboardList size={32} />
        </div>
        <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No CRM Link Found</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          This project doesn't have associated CRM site visit data or requirements.
        </p>
      </div>
    );
  }

  const { requirements = [], siteMeasurements, sitePhotos = [], siteVisitScheduledDate } = customerData;
  const hasRequirements = requirements.length > 0;
  const hasMeasurements = !!siteMeasurements;
  const hasPhotos = sitePhotos.length > 0;

  if (!hasRequirements && !hasMeasurements && !hasPhotos) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] max-w-xl mx-auto mt-6 text-center space-y-4">
        <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-[hsl(var(--muted-foreground))]">
          <ClipboardList size={32} />
        </div>
        <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">No Site Details Logged</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          The original CRM lead does not have any recorded requirements, measurements, or site photos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Site Details</h2>
        <p className="text-sm text-slate-500">Overview of site measurements, photos, and requirements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Measurements */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 pt-6 px-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2 text-purple-500 text-xs font-bold tracking-widest uppercase">
                <Ruler size={16} /> Measurements
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-4 space-y-4">
              {hasMeasurements ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-center">
                      <div className="text-[10px] text-slate-500 font-bold mb-1 tracking-wider uppercase">Carpet Area</div>
                      <div className="text-lg font-bold text-slate-800">
                        {siteMeasurements.carpetArea || 0} <span className="text-sm font-normal text-slate-500">Sq.Ft</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-center">
                      <div className="text-[10px] text-slate-500 font-bold mb-1 tracking-wider uppercase">Ceiling</div>
                      <div className="text-lg font-bold text-slate-800">
                        {siteMeasurements.ceilingHeight || 0} <span className="text-sm font-normal text-slate-500">Ft</span>
                      </div>
                    </div>
                  </div>
                  {siteMeasurements.rooms && (
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <div className="text-[10px] text-slate-500 font-bold mb-1 tracking-wider uppercase">Rooms Count</div>
                      <div className="text-sm font-bold text-slate-800">{siteMeasurements.rooms}</div>
                    </div>
                  )}
                  {siteMeasurements.notes && (
                    <div className="bg-slate-50 rounded-2xl p-4">
                      <div className="text-[10px] text-slate-500 font-bold mb-1 tracking-wider uppercase">Notes</div>
                      <div className="text-sm font-bold text-slate-800">{siteMeasurements.notes}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 text-center border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500 font-medium">No measurements logged.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Site Photos */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-3xl border-slate-200 shadow-sm h-full">
            <CardHeader className="pb-2 pt-6 px-6">
              <div className="flex items-center gap-2 text-purple-500 text-xs font-bold tracking-widest uppercase">
                <MapPin size={16} /> Site Photos
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-4 h-[calc(100%-4rem)]">
              {hasPhotos ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {sitePhotos.map((photo: string, idx: number) => (
                    <a 
                      key={idx}
                      href={photo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-2xl overflow-hidden border border-slate-200 hover:border-purple-400 transition-colors group relative"
                    >
                      <img 
                        src={photo} 
                        alt={`Site Photo ${idx + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ImageIcon className="text-white w-6 h-6" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                  <ImageIcon size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No photos uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Requirements */}
      <div className="pt-4">
        <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 pt-6 px-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold tracking-widest uppercase">
              <ClipboardList size={16} /> Requirements
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {hasRequirements ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requirements.map((req: any, idx: number) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 text-lg">
                        {req.roomName || 'General Requirement'}
                      </h4>
                      {req.theme && (
                        <span className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold uppercase tracking-wider">
                          {req.theme}
                        </span>
                      )}
                    </div>
                    {req.description && (
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {req.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <ClipboardList size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No requirements recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
