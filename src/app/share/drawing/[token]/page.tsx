'use client';

// =============================================================================
// Sky-Lite Web — Client Public Drawing & Design Portal (Light Architectural Theme)
// Flat, modern, professional studio viewer for 2D plans & 3D models.
// Zero shadows, crisp borders, clean typography, fully mobile-responsive.
// =============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Box,
  Image as ImageIcon,
  FileText,
  Download,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sparkles,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Search,
  X,
  Home,
  Phone,
  Maximize2,
  Calendar,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { Interior3DViewerModal } from '@/features/interior-new/components/crm/modals/Interior3DViewerModal';
import { cn } from '@/lib/utils';

export function detectFileType(fileName: string = '', url: string = ''): 'image' | 'pdf' | 'cad-2d' | '3d-model' | 'archive' | 'other' {
  const getExt = (str?: string) => {
    if (!str) return '';
    const clean = str.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  };
  const ext = getExt(url) || getExt(fileName);
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['dwg', 'skp', 'obj', 'fbx', '3ds', 'dae', 'blend', 'rvt', 'gltf', 'glb'].includes(ext)) return '3d-model';
  if (['dxf'].includes(ext)) return 'cad-2d';
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
  return 'other';
}

export function getBadge(fileName: string = '', url: string = '', category: string = '2D') {
  const getExt = (str?: string) => {
    if (!str) return '';
    const clean = str.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : '';
  };
  const ext = getExt(url) || getExt(fileName);
  const type = detectFileType(fileName, url);

  if (category === '3D' || type === '3d-model') {
    return {
      label: ext ? `3D ${ext}` : '3D RENDER',
      color: 'bg-violet-50 text-violet-700 border-violet-200',
      icon: Box,
    };
  }
  if (type === 'pdf') {
    return {
      label: 'PDF BLUEPRINT',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: FileText,
    };
  }
  if (type === 'cad-2d') {
    return {
      label: ext || '2D CAD',
      color: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Layers,
    };
  }
  return {
    label: ext || '2D DRAWING',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ImageIcon,
  };
}

export default function ClientDrawingSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<any>(null);

  // Filter & Search
  const [activeTab, setActiveTab] = useState<'all' | '2d' | '3d'>('all');
  const [search, setSearch] = useState('');

  // 2D Lightbox Zoom & Pan State
  const [activeLightboxFile, setActiveLightboxFile] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // 3D Model Viewer Modal State
  const [active3DFile, setActive3DFile] = useState<any | null>(null);

  const fetchPublicData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await interiorCrmService.getPublicDrawingData(token);
      if (res?.success && res?.data) {
        setPortalData(res.data);
        if (typeof document !== 'undefined' && res.data.lead?.name) {
          document.title = `${res.data.lead.name} — Architectural Design Portfolio`;
        }
      } else {
        setError(res?.message || 'Drawing portfolio not found or link has expired.');
      }
    } catch (err: any) {
      console.error('Failed to load shared drawings', err);
      setError(
        err?.response?.data?.message || 'This drawing link is invalid, expired, or has been revoked.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchPublicData();
  }, [token]);

  // Filter to approved drawings only
  const designFiles = useMemo(() => {
    return (portalData?.designFiles || []).filter((file: any) => {
      const rawStatus = file.status || file.approvalStatus;
      const versions = file.versions || [];
      const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
      const effectiveStatus = rawStatus || latestVersion?.approvalStatus;
      return ['internally_approved', 'client_approved', 'client_changes_requested'].includes(effectiveStatus) ||
        versions.some((v: any) => v.approvalStatus === 'internally_approved');
    });
  }, [portalData?.designFiles]);

  const permissions = portalData?.permissions || { allowDownload: true };
  const lead = portalData?.lead || {};
  const org = portalData?.organization || {};

  const filteredFiles = useMemo(() => {
    return designFiles.filter((file: any) => {
      const type = detectFileType(file.name, file.url);
      const is3D = file.category === '3D' || type === '3d-model';
      const is2D = !is3D;

      if (activeTab === '2d' && !is2D) return false;
      if (activeTab === '3d' && !is3D) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = (file.name || '').toLowerCase().includes(q);
        const matchesTitle = (file.title || '').toLowerCase().includes(q);
        const matchesCat = (file.category || '').toLowerCase().includes(q);
        const matchesRoom = (file.roomTag || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesCat && !matchesRoom) return false;
      }
      return true;
    });
  }, [designFiles, activeTab, search]);

  const count2D = useMemo(
    () => designFiles.filter((f: any) => f.category !== '3D' && detectFileType(f.name, f.url) !== '3d-model').length,
    [designFiles]
  );
  const count3D = useMemo(
    () => designFiles.filter((f: any) => f.category === '3D' || detectFileType(f.name, f.url) === '3d-model').length,
    [designFiles]
  );

  const openFile = (file: any) => {
    const type = detectFileType(file.name, file.url);
    if (type === '3d-model') {
      setActive3DFile(file);
    } else {
      setActiveLightboxFile(file);
      setZoomLevel(1);
      setRotation(0);
    }
  };

  const handleDownload = (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    if (!permissions.allowDownload) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'drawing-file';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Loading Screen (Flat, Clean, Modern)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-4">
          <Layers className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">Loading Drawing Portfolio</h2>
        <p className="text-xs text-slate-500 mt-1">Preparing verified architectural blueprints & renders...</p>
      </div>
    );
  }

  // Error / Inactive Screen (Flat)
  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">Link Inactive or Expired</h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2 mb-6 leading-relaxed">
          {error || 'This shared drawing URL is no longer available. Please contact your interior design studio for an updated link.'}
        </p>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3.5 py-2 rounded-lg border border-slate-200">
          <ShieldCheck size={14} className="text-slate-800" />
          <span>Secure Architectural Client Portal</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col">
      {/* Studio Top Navigation & Project Bar (Compact High-Density Header) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        {/* Main Brand & Client Row */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-14 flex items-center justify-between gap-3">
          {/* Left: Studio Brand & Project Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {org.logo ? (
              <img
                src={org.logo}
                alt={org.name || 'Studio'}
                className="h-7 sm:h-8 w-auto max-w-[100px] sm:max-w-[140px] object-contain shrink-0"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-slate-900 flex items-center justify-center font-bold text-white text-xs shrink-0">
                {(org.name || 'S').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="h-4 w-[1px] bg-slate-200 shrink-0 hidden xs:block" />

            <div className="min-w-0 flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                {lead.name ? `${lead.name}'s Drawings` : 'Architectural Portfolio'}
              </h1>
              {lead.leadNumber && (
                <span className="hidden md:inline-flex px-1.5 py-0.5 rounded font-mono text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  REF: {lead.leadNumber}
                </span>
              )}
            </div>
          </div>

          {/* Right: Verified Badge & Contact */}
          <div className="flex items-center gap-2 shrink-0">
            {org.phone && (
              <a
                href={`tel:${org.phone}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                <Phone size={12} className="text-slate-600" />
                <span>Contact</span>
              </a>
            )}
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span>Verified Link</span>
            </div>
          </div>
        </div>

        {/* Compact Sub-Header Toolbar (Metadata Chips + Tab Switcher + Search) */}
        <div className="bg-slate-50/80 border-t border-slate-200 px-3 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
            {/* Left: Metadata chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600">
              {lead.propertyType && (
                <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                  <Home size={11} className="text-slate-500" />
                  {lead.propertyType}
                </span>
              )}
              {(lead.projectLocation || lead.city) && (
                <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                  <MapPin size={11} className="text-slate-500" />
                  {[lead.projectLocation, lead.city].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                <CheckCircle2 size={11} className="text-emerald-600" />
                {designFiles.length} Approved Plans
              </span>
            </div>

            {/* Right: Tabs & Search Input */}
            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shrink-0">
                <button
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    'px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  All ({designFiles.length})
                </button>
                <button
                  onClick={() => setActiveTab('2d')}
                  className={cn(
                    'px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer',
                    activeTab === '2d'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  <Layers size={11} />
                  <span>2D ({count2D})</span>
                </button>
                <button
                  onClick={() => setActiveTab('3d')}
                  className={cn(
                    'px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer',
                    activeTab === '3d'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  <Box size={11} />
                  <span>3D ({count3D})</span>
                </button>
              </div>

              <div className="relative w-36 sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter plans..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-6 py-1 rounded-md bg-white border border-slate-200 text-[11px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-700"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {/* Drawings Grid */}
        {filteredFiles.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-lg border border-slate-200 p-6 my-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto mb-2.5">
              <Layers size={18} />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900">No Drawings Found</h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? 'No drawings matched your search query. Try clearing the search input.'
                : 'Drawings will appear here once reviewed and published by your design studio.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredFiles.map((file: any, idx: number) => {
              const type = detectFileType(file.name, file.url);
              const badge = getBadge(file.name, file.url, file.category);
              const Icon = badge.icon;
              const is3D = file.category === '3D' || type === '3d-model';
              const versionNumber = file.currentVersion || file.versionNumber || 1;

              return (
                <div
                  key={file._id || idx}
                  onClick={() => openFile(file)}
                  className="group bg-white border border-slate-200 hover:border-slate-400 rounded-lg overflow-hidden transition-colors cursor-pointer flex flex-col"
                >
                  {/* Thumbnail Frame (Crisp 16:10 aspect ratio) */}
                  <div className="relative aspect-[16/10] bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-200">
                    {type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : type === 'pdf' ? (
                      <div className="flex flex-col items-center justify-center text-rose-600 p-3 text-center">
                        <FileText size={30} className="stroke-[1.5]" />
                        <span className="text-[10px] font-medium mt-1 text-slate-700">Architectural PDF</span>
                      </div>
                    ) : is3D ? (
                      <div className="flex flex-col items-center justify-center text-violet-600 p-3 text-center">
                        <Box size={30} className="stroke-[1.5]" />
                        <span className="text-[10px] font-medium mt-1 text-slate-700">3D Interactive Model</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-sky-600 p-3 text-center">
                        <Layers size={30} className="stroke-[1.5]" />
                        <span className="text-[10px] font-medium mt-1 text-slate-700">CAD Blueprint</span>
                      </div>
                    )}

                    {/* Top Floating Badges */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border',
                          badge.color
                        )}
                      >
                        <Icon size={9} />
                        <span>{badge.label}</span>
                      </span>

                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-white/95 text-slate-800 border border-slate-200">
                        v{versionNumber}
                      </span>
                    </div>

                    {/* Hover Action Overlay */}
                    <div className="absolute inset-0 bg-slate-900/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 bg-white text-slate-900 rounded-md text-[11px] font-medium flex items-center gap-1 border border-slate-200">
                        <Eye size={11} className="text-slate-800" />
                        <span>{is3D ? 'Open 3D' : 'View Plan'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between gap-2 bg-white">
                    <div>
                      <h3
                        className="text-xs font-semibold text-slate-900 group-hover:text-slate-700 line-clamp-1"
                        title={file.title || file.name}
                      >
                        {file.title || file.name || 'Drawing Blueprint'}
                      </h3>

                      <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                        {file.roomTag && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-700 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                            <Tag size={9} className="text-slate-500" />
                            {file.roomTag}
                          </span>
                        )}
                        {file.uploadedAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar size={9} className="text-slate-400" />
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {is3D ? 'Interactive 3D' : '2D Document'}
                      </span>
                      {permissions.allowDownload && (
                        <button
                          onClick={(e) => handleDownload(e, file.url, file.name)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Download Plan"
                        >
                          <Download size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 2D Flat Fullscreen Lightbox */}
      <AnimatePresence>
        {activeLightboxFile && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
            {/* Top Lightbox Toolbar */}
            <div className="h-12 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                  <ImageIcon size={13} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold truncate max-w-xs sm:max-w-md">
                    {activeLightboxFile.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {activeLightboxFile.category || '2D Plan'} • {activeLightboxFile.roomTag || 'General'}
                  </p>
                </div>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.25))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[10px] font-mono font-medium px-1 text-slate-300">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Rotate"
                >
                  <RotateCw size={14} />
                </button>
                <button
                  onClick={() => {
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Reset
                </button>

                {permissions.allowDownload && (
                  <button
                    onClick={(e) => handleDownload(e, activeLightboxFile.url, activeLightboxFile.name)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                )}

                <button
                  onClick={() => setActiveLightboxFile(null)}
                  className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* View Canvas */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-3">
              {detectFileType(activeLightboxFile.name, activeLightboxFile.url) === 'pdf' ? (
                <iframe
                  src={`${activeLightboxFile.url}#toolbar=0`}
                  className="w-full h-full max-w-5xl rounded border border-slate-800 bg-white"
                  title="PDF Viewer"
                />
              ) : (
                <img
                  src={activeLightboxFile.url}
                  alt={activeLightboxFile.name}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-w-full max-h-[85vh] object-contain select-none border border-slate-800 rounded bg-white/5"
                />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 3D Model Interactive Viewer Modal */}
      {active3DFile && (
        <Interior3DViewerModal
          isOpen={Boolean(active3DFile)}
          onClose={() => setActive3DFile(null)}
          file={active3DFile}
        />
      )}

      {/* Studio Footer (Compact) */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 font-medium text-slate-700 text-[11px]">
            <span>{org.name || 'Studio'}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Client Design Portfolio</span>
          </div>
          <p className="text-[10px] text-slate-400">
            © {new Date().getFullYear()} Protected Client Link
          </p>
        </div>
      </footer>
    </div>
  );
}


