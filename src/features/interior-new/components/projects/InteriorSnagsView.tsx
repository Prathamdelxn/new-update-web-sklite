'use client';

// =============================================================================
// Sky-Lite Web — Modern Interior OS Quality Snag Register
// High-density, professional UI with blueprint pin linkages & deep inspection
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  Plus,
  X,
  Loader2,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Layers,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  Maximize2,
  FileText,
  Pin,
  Search,
  LayoutGrid,
  List as ListIcon,
} from 'lucide-react';
import { Button, Input } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/upload';

interface InteriorSnagsViewProps {
  projectId: string;
}

export default function InteriorSnagsView({ projectId }: InteriorSnagsViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [snags, setSnags] = useState<any[]>([]);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search, Filter & Layout View State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'open' | 'resolved'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Form State
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string>('');
  const [editingSnagId, setEditingSnagId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Deep Inspection Modal State
  const [selectedDetailSnag, setSelectedDetailSnag] = useState<any | null>(null);

  const fetchSnags = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getSnags(projectId);
      if (res?.success && res?.data) {
        setSnags(res.data);
      }
    } catch (err) {
      console.error('Failed to load snags', err);
      toast.error('Failed to fetch Snag registry');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrawings = async () => {
    try {
      const res = await interiorProjectService.getDrawings(projectId);
      if (res?.success && res?.data) {
        setDrawings(res.data);
      } else if (Array.isArray(res)) {
        setDrawings(res);
      }
    } catch (err) {
      console.warn('Failed to fetch project drawings', err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSnags();
      fetchDrawings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Robust Drawing Linkage Resolution Helper
  const getSnagDrawingInfo = (snag: any) => {
    let dwgId = snag.drawingId;
    let dwgTitle = snag.drawingTitle;
    let dwgNumber = snag.drawingNumber;
    let pinNum = snag.pinNumber;
    let coords = snag.x && snag.y ? { x: snag.x, y: snag.y } : null;

    if (dwgId) {
      const found = drawings.find((d: any) => String(d._id || d.id) === String(dwgId));
      if (found) {
        dwgTitle = dwgTitle || found.title;
        dwgNumber = dwgNumber || found.drawingNumber;
      }
    } else if (snag.location) {
      const parts = snag.location.split('•');
      if (parts.length >= 2) {
        const possibleName = parts[0].trim();
        const found = drawings.find(
          (d: any) =>
            d.title?.toLowerCase() === possibleName.toLowerCase() ||
            d.drawingNumber?.toLowerCase() === possibleName.toLowerCase()
        );
        if (found) {
          dwgId = found._id || found.id;
          dwgTitle = found.title;
          dwgNumber = found.drawingNumber;
        } else {
          dwgTitle = possibleName;
        }
        const pinMatch = parts[1].match(/Pin\s*#?(\d+)/i);
        if (pinMatch) {
          pinNum = parseInt(pinMatch[1], 10);
        }
      }
    }

    const isLinked = Boolean(dwgId || dwgTitle || pinNum || snag.source === 'drawing_annotation');

    return {
      isLinked,
      drawingId: dwgId,
      drawingTitle: dwgTitle || (isLinked ? 'Drawing Plan' : null),
      drawingNumber: dwgNumber || null,
      pinNumber: pinNum || null,
      coords,
    };
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = snags.length;
    let linked = 0;
    let open = 0;
    let resolved = 0;

    snags.forEach((s) => {
      const dwgInfo = getSnagDrawingInfo(s);
      if (dwgInfo.isLinked) linked++;
      if (s.status === 'resolved' || s.status === 'closed' || s.status === 'verified') {
        resolved++;
      } else {
        open++;
      }
    });

    return { total, linked, open, resolved };
  }, [snags, drawings]);

  // Filtered & Searched Snags
  const filteredSnags = useMemo(() => {
    return snags.filter((s) => {
      const dwgInfo = getSnagDrawingInfo(s);
      // Status filter
      if (filterStatus === 'linked' && !dwgInfo.isLinked) return false;
      if (filterStatus === 'open' && (s.status === 'resolved' || s.status === 'closed')) return false;
      if (filterStatus === 'resolved' && s.status !== 'resolved' && s.status !== 'closed') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = s.description?.toLowerCase().includes(q);
        const locMatch = s.location?.toLowerCase().includes(q);
        const dwgMatch = dwgInfo.drawingTitle?.toLowerCase().includes(q);
        const pinMatch = dwgInfo.pinNumber && String(dwgInfo.pinNumber).includes(q);
        if (!descMatch && !locMatch && !dwgMatch && !pinMatch) return false;
      }

      return true;
    });
  }, [snags, filterStatus, searchQuery, drawings]);

  const handleCreateOrUpdateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !location) {
      toast.error('Please fill in description and location');
      return;
    }

    try {
      setSubmitting(true);
      const selectedDrawing = drawings.find((d: any) => String(d._id || d.id) === String(selectedDrawingId));

      const payload: any = {
        description,
        location,
        priority,
        photos,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        drawingId: selectedDrawingId ? selectedDrawingId : undefined,
        drawingTitle: selectedDrawing?.title || undefined,
        drawingNumber: selectedDrawing?.drawingNumber || undefined,
      };

      let res;
      if (editingSnagId) {
        payload.snagId = editingSnagId;
        res = await interiorProjectService.updateSnag(projectId, payload);
      } else {
        res = await interiorProjectService.createSnag(projectId, payload);
      }

      if (res?.success) {
        toast.success(`Snag ${editingSnagId ? 'updated' : 'logged'} successfully!`);
        closeModal();
        fetchSnags();
      }
    } catch (err) {
      console.error('Snag submit fail', err);
      toast.error(`Failed to ${editingSnagId ? 'update' : 'log'} snag`);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (snag: any) => {
    setEditingSnagId(snag._id);
    setDescription(snag.description || '');
    setLocation(snag.location || '');
    setPriority(snag.priority || 'medium');
    setDueDate(snag.dueDate ? new Date(snag.dueDate).toISOString().split('T')[0] : '');
    setPhotos(snag.photos || []);
    setSelectedDrawingId(snag.drawingId ? String(snag.drawingId) : '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSnagId(null);
    setDescription('');
    setLocation('');
    setPriority('medium');
    setDueDate('');
    setPhotos([]);
    setSelectedDrawingId('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      toast.info('Uploading image...');
      const url = await uploadToCloudinary(file);
      setPhotos((prev) => [...prev, url]);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Failed to upload image', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteSnag = async (snagId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Snag Item',
      message: 'Are you sure you want to delete this snag defect?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!isConfirmed) return;

    try {
      const res = await interiorProjectService.deleteSnag(projectId, snagId);
      if (res?.success) {
        toast.success('Snag deleted successfully');
        if (selectedDetailSnag?._id === snagId) {
          setSelectedDetailSnag(null);
        }
        fetchSnags();
      }
    } catch (err) {
      console.error('Failed to delete snag', err);
      toast.error('Failed to delete snag');
    }
  };

  const handleToggleStatus = async (snagId: string, currentStatus: string) => {
    try {
      const nextStatus =
        currentStatus === 'resolved'
          ? 'closed'
          : currentStatus === 'open' || currentStatus === 'assigned' || currentStatus === 'in_progress'
          ? 'resolved'
          : 'open';
      const res = await interiorProjectService.updateSnag(projectId, { snagId, status: nextStatus });
      if (res?.success) {
        toast.success(`Snag status updated to: ${nextStatus.toUpperCase()}`);
        if (selectedDetailSnag?._id === snagId) {
          setSelectedDetailSnag((prev: any) => (prev ? { ...prev, status: nextStatus } : null));
        }
        fetchSnags();
      }
    } catch (err) {
      console.error('Toggle status failed', err);
      toast.error('Failed to update status');
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'critical':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'high':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-slate-600 bg-slate-50 border-slate-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'closed':
      case 'verified':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'resolved':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 font-sans text-slate-800">
      {/* ── 1. Compact Header & Action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quality Snag Register</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {metrics.total}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Site defect tracking with bi-directional 2D/3D blueprint pin synchronization.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold text-xs px-3.5 h-8.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
          Log Snag
        </Button>
      </div>

      {/* ── 2. Slim Horizontal Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          onClick={() => setFilterStatus('all')}
          className={cn(
            'px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer bg-white shadow-xs flex items-center justify-between',
            filterStatus === 'all' ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">Total Defects</span>
            <span className="text-lg font-bold text-slate-900 leading-tight">{metrics.total}</span>
          </div>
          <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Bug className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('linked')}
          className={cn(
            'px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer bg-white shadow-xs flex items-center justify-between',
            filterStatus === 'linked' ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div>
            <span className="text-[11px] font-medium text-blue-700 block">Pinned on Plans</span>
            <span className="text-lg font-bold text-blue-700 leading-tight">{metrics.linked}</span>
          </div>
          <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('open')}
          className={cn(
            'px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer bg-white shadow-xs flex items-center justify-between',
            filterStatus === 'open' ? 'border-amber-500 ring-1 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div>
            <span className="text-[11px] font-medium text-amber-700 block">Active Open</span>
            <span className="text-lg font-bold text-amber-700 leading-tight">{metrics.open}</span>
          </div>
          <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('resolved')}
          className={cn(
            'px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer bg-white shadow-xs flex items-center justify-between',
            filterStatus === 'resolved' ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/80 hover:border-slate-300'
          )}
        >
          <div>
            <span className="text-[11px] font-medium text-emerald-700 block">Resolved / Closed</span>
            <span className="text-lg font-bold text-emerald-700 leading-tight">{metrics.resolved}</span>
          </div>
          <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* ── 3. High-Density Filter & View Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search snags, pins, or blueprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View Mode & Filter Pills */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Segmented Filter Pills */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-[11px]',
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setFilterStatus('linked')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-[11px]',
                filterStatus === 'linked' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Pinned ({metrics.linked})
            </button>
            <button
              onClick={() => setFilterStatus('open')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-[11px]',
                filterStatus === 'open' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Open ({metrics.open})
            </button>
            <button
              onClick={() => setFilterStatus('resolved')}
              className={cn(
                'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-[11px]',
                filterStatus === 'resolved' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Resolved ({metrics.resolved})
            </button>
          </div>

          {/* Layout Switcher (Table vs Grid) */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/60">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-md transition-colors cursor-pointer',
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              )}
              title="Table List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors cursor-pointer',
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              )}
              title="Grid Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Snags Content (Table List or Modern Grid) ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-14 text-center space-y-2 bg-white rounded-xl border border-slate-200/80">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-500">Loading quality registry...</p>
        </div>
      ) : filteredSnags.length === 0 ? (
        <div className="p-10 text-center rounded-xl border border-dashed border-slate-200 bg-white space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Bug className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">No Snags Found</h4>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            {searchQuery ? `No results for "${searchQuery}".` : 'No defects match current filters.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── Modern High-Density Table View (Linear / PlanGrid Style) ── */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-16">PIN</th>
                  <th className="py-2.5 px-4 min-w-[200px]">DEFECT OBSERVATION</th>
                  <th className="py-2.5 px-4 min-w-[180px]">BLUEPRINT PLAN</th>
                  <th className="py-2.5 px-4">LOCATION</th>
                  <th className="py-2.5 px-3">PRIORITY</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-4">TARGET DUE</th>
                  <th className="py-2.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSnags.map((snag) => {
                  const dwgInfo = getSnagDrawingInfo(snag);

                  return (
                    <tr
                      key={snag._id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedDetailSnag(snag)}
                    >
                      {/* Pin # */}
                      <td className="py-2.5 px-4 font-mono font-bold text-xs" onClick={(e) => e.stopPropagation()}>
                        {dwgInfo.pinNumber ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                            #{dwgInfo.pinNumber}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-500 text-[11px]">
                            <Bug className="w-3 h-3" />
                          </span>
                        )}
                      </td>

                      {/* Defect Description */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors">
                            {snag.description}
                          </span>
                          {snag.photos && snag.photos.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 shrink-0 font-medium">
                              <ImageIcon className="w-3 h-3" /> {snag.photos.length}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Linked Blueprint Plan */}
                      <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {dwgInfo.isLinked ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 truncate max-w-[130px]">
                              {dwgInfo.drawingTitle || 'Blueprint'}
                            </span>
                            {dwgInfo.drawingNumber && (
                              <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 font-bold shrink-0">
                                {dwgInfo.drawingNumber}
                              </span>
                            )}
                            {dwgInfo.drawingId && (
                              <button
                                type="button"
                                onClick={() => router.push(`/interior-new/projects/${projectId}/drawings/${dwgInfo.drawingId}`)}
                                className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                title="Open in Drawing Studio"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Direct site item</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-2.5 px-4 text-slate-600 truncate max-w-[120px]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{snag.location}</span>
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                            getPriorityBadge(snag.priority)
                          )}
                        >
                          {snag.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(snag._id, snag.status)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1',
                            getStatusBadge(snag.status)
                          )}
                          title="Click to toggle status"
                        >
                          <span>{snag.status === 'open' ? 'Open' : snag.status.replace('_', ' ')}</span>
                        </button>
                      </td>

                      {/* Due Date */}
                      <td className="py-2.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                        {snag.dueDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(snag.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailSnag(snag)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="Deep Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(snag)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnag(snag._id)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Compact Grid View (3-Column Dense Bento) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSnags.map((snag) => {
            const dwgInfo = getSnagDrawingInfo(snag);

            return (
              <div
                key={snag._id}
                className="rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between p-3.5 space-y-3"
              >
                <div className="space-y-2">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border', getPriorityBadge(snag.priority))}>
                        {snag.priority}
                      </span>
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border', getStatusBadge(snag.status))}>
                        {snag.status}
                      </span>
                      {dwgInfo.pinNumber && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Pin #{dwgInfo.pinNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(snag)}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnag(snag._id)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setSelectedDetailSnag(snag)}
                    className="text-xs font-bold text-slate-900 leading-snug cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
                  >
                    {snag.description}
                  </h3>

                  {/* Inline Blueprint Link */}
                  {dwgInfo.isLinked && (
                    <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200/70 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Layers className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="font-semibold text-blue-950 truncate">
                          {dwgInfo.drawingTitle || 'Drawing Plan'}
                        </span>
                        {dwgInfo.drawingNumber && (
                          <span className="text-[10px] font-mono text-blue-700">({dwgInfo.drawingNumber})</span>
                        )}
                      </div>
                      {dwgInfo.drawingId && (
                        <button
                          type="button"
                          onClick={() => router.push(`/interior-new/projects/${projectId}/drawings/${dwgInfo.drawingId}`)}
                          className="text-[11px] font-semibold text-blue-700 hover:underline shrink-0 ml-1.5 flex items-center gap-0.5"
                        >
                          <span>Plan</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{snag.location}</span>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {snag.dueDate ? new Date(snag.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailSnag(snag)}
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer text-xs"
                  >
                    Deep Info ↗
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. Deep Snag Inspection Modal ── */}
      <AnimatePresence>
        {selectedDetailSnag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="w-full max-w-xl border border-slate-200 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {(() => {
                const dwgInfo = getSnagDrawingInfo(selectedDetailSnag);

                return (
                  <>
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                            dwgInfo.pinNumber ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                          )}
                        >
                          {dwgInfo.pinNumber ? `#${dwgInfo.pinNumber}` : <Bug className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {dwgInfo.pinNumber ? `Inspection Pin #${dwgInfo.pinNumber}` : 'Defect Item'}
                            </h3>
                            <span className={cn('px-2 py-0.2 rounded text-[10px] uppercase font-bold border', getPriorityBadge(selectedDetailSnag.priority))}>
                              {selectedDetailSnag.priority}
                            </span>
                            <span className={cn('px-2 py-0.2 rounded text-[10px] uppercase font-semibold border', getStatusBadge(selectedDetailSnag.status))}>
                              {selectedDetailSnag.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDetailSnag(null)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                      {/* Observation */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Observation Description</span>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 font-normal leading-relaxed whitespace-pre-wrap">
                          {selectedDetailSnag.description}
                        </div>
                      </div>

                      {/* Blueprint Box */}
                      {dwgInfo.isLinked && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-blue-700 uppercase">Linked Drawing Blueprint</span>
                          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                                <span>{dwgInfo.drawingTitle || 'Blueprint Plan'}</span>
                                {dwgInfo.drawingNumber && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white text-blue-700 border border-blue-200">
                                    {dwgInfo.drawingNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-blue-700/80">
                                Pinned at marker #{dwgInfo.pinNumber} • Location: {selectedDetailSnag.location}
                              </p>
                            </div>

                            {dwgInfo.drawingId && (
                              <Button
                                size="sm"
                                onClick={() => router.push(`/interior-new/projects/${projectId}/drawings/${dwgInfo.drawingId}`)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3 shadow-xs"
                              >
                                <span>Open Plan</span>
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Photos */}
                      {selectedDetailSnag.photos && selectedDetailSnag.photos.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase">Photo Evidence ({selectedDetailSnag.photos.length})</span>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedDetailSnag.photos.map((photo: string, idx: number) => (
                              <div
                                key={idx}
                                className="relative h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group"
                                onClick={() => setViewingImage(photo)}
                              >
                                <img src={photo} alt="Defect photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Schedule info */}
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                        <div>
                          <span className="text-slate-400 text-[10px] font-medium block">Target Resolution Date</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">
                            {selectedDetailSnag.dueDate ? new Date(selectedDetailSnag.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] font-medium block">Current Status</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block capitalize">
                            {selectedDetailSnag.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/70">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(selectedDetailSnag._id, selectedDetailSnag.status)}
                        className="h-8 text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        {selectedDetailSnag.status === 'open' || selectedDetailSnag.status === 'assigned' || selectedDetailSnag.status === 'in_progress'
                          ? 'Mark as Resolved'
                          : selectedDetailSnag.status === 'resolved'
                          ? 'Verify & Close'
                          : 'Reopen Snag'}
                      </Button>

                      <button
                        type="button"
                        onClick={() => setSelectedDetailSnag(null)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 6. Create / Edit Snag Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="w-full max-w-md border border-slate-200 rounded-xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Bug className="w-4 h-4 text-blue-600" />
                  {editingSnagId ? 'Edit Snag Item' : 'Log New Quality Snag'}
                </h3>
                <button type="button" onClick={closeModal} className="p-1 rounded text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateSnag}>
                <div className="p-4 space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Defect Description <span className="text-rose-500">*</span></label>
                    <Input
                      required
                      placeholder="e.g. Scratched premium wall paint near main pantry"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-xs h-8.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Location / Area <span className="text-rose-500">*</span></label>
                    <Input
                      required
                      placeholder="e.g. Floor 4, Cafeteria Pantry Zone"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="text-xs h-8.5"
                    />
                  </div>

                  {drawings.length > 0 && (
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 flex items-center justify-between">
                        <span>Link to Blueprint Plan</span>
                        <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                      </label>
                      <select
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        value={selectedDrawingId}
                        onChange={(e) => setSelectedDrawingId(e.target.value)}
                      >
                        <option value="">General Site Snag (No Drawing Linked)</option>
                        {drawings.map((dwg: any) => (
                          <option key={dwg._id || dwg.id} value={dwg._id || dwg.id}>
                            {dwg.drawingNumber ? `[${dwg.drawingNumber}] ` : ''}
                            {dwg.title || 'Untitled Blueprint'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Priority</label>
                      <select
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Target Due Date</label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-xs h-8.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Photo Attachments</label>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((photo, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-lg border overflow-hidden">
                          <img src={photo} alt="Snag photo" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white rounded-full hover:bg-rose-600"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <label className="w-14 h-14 rounded-lg border border-dashed border-slate-300 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors">
                        {isUploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-3.5 border-t border-slate-100 bg-slate-50/60">
                  <Button variant="outline" size="sm" type="button" onClick={closeModal} className="h-8 text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" disabled={submitting} className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    {editingSnagId ? 'Save Changes' : 'Log Snag'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 7. Image Viewer Lightbox ── */}
      <AnimatePresence>
        {viewingImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setViewingImage(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <button
                  onClick={() => setViewingImage(null)}
                  className="p-1.5 bg-black/60 text-white rounded-lg hover:bg-rose-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img src={viewingImage} alt="Snag Evidence" className="max-w-full max-h-[85vh] object-contain" />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


