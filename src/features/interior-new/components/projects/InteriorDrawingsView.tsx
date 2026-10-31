'use client';

// =============================================================================
// Sky-Lite Web — Project Drawings & 3D Blueprints Register
// Complete 2D Working Drawings & 3D Models / Renders Hub for Interior Projects
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Plus,
  X,
  Loader2,
  FileDown,
  GitBranch,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  ExternalLink,
  Layers,
  Box,
  Image as ImageIcon,
  FileText,
  Filter,
  Sparkles,
  Archive,
  Download,
  Check,
  AlertCircle,
  UploadCloud,
  Pin,
  Send,
  UserCheck
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';
import { useProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';
import { InteriorProjectUploadDrawingModal } from './modals/InteriorProjectUploadDrawingModal';
import { InteriorProjectSendDrawingForApprovalModal } from './modals/InteriorProjectSendDrawingForApprovalModal';
import { InteriorProjectDrawingApprovalModal } from './modals/InteriorProjectDrawingApprovalModal';

interface InteriorDrawingsViewProps {
  projectId: string;
}

export function detectDrawingFileType(fileName: string = '', url: string = ''): 'image' | 'pdf' | 'cad-2d' | '3d-model' | 'archive' | 'other' {
  const getExt = (str?: string) => {
    if (!str) return '';
    const clean = str.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  };
  const ext = getExt(url) || getExt(fileName);
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff', 'hdr'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['dwg', 'skp', 'obj', 'fbx', '3ds', 'dae', 'blend', 'rvt', 'rfa', 'ifc', 'gltf', 'glb', 'max'].includes(ext)) return '3d-model';
  if (['dxf'].includes(ext)) return 'cad-2d';
  if (['zip', 'rar', '7z', 'tar'].includes(ext)) return 'archive';
  return 'other';
}

export function getFileTypeBadge(fileName: string = '', url: string = '', drawingType: string = '2D') {
  const getExt = (str?: string) => {
    if (!str) return '';
    const clean = str.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : '';
  };
  const ext = getExt(url) || getExt(fileName);
  const type = detectDrawingFileType(fileName, url);

  if (ext === 'DWG') {
    return {
      label: drawingType === '3D' ? '3D DWG' : '2D DWG',
      color: drawingType === '3D' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      icon: drawingType === '3D' ? Box : Layers
    };
  }
  if (type === 'image') {
    return {
      label: ext || 'RENDER',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      icon: ImageIcon
    };
  }
  if (type === 'pdf') {
    return {
      label: 'PDF DOC',
      color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      icon: FileText
    };
  }
  if (type === '3d-model') {
    return {
      label: ext || '3D MODEL',
      color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      icon: Box
    };
  }
  if (type === 'cad-2d') {
    return {
      label: ext || '2D CAD',
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      icon: Layers
    };
  }
  if (type === 'archive') {
    return {
      label: ext || 'ARCHIVE',
      color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
      icon: Archive
    };
  }
  return {
    label: ext || (drawingType === '3D' ? '3D FILE' : '2D PLAN'),
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    icon: FileText
  };
}

export default function InteriorDrawingsView({ projectId }: InteriorDrawingsViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { can: canDo } = useProjectPermissions(projectId);

  const [drawings, setDrawings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Category Tabs: '2D' | '3D'
  const [drawingTypeFilter, setDrawingTypeFilter] = useState<'2D' | '3D'>('2D');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State: Create / Upload Drawings (Matching Lead Drawings Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newUploadFiles, setNewUploadFiles] = useState<{
    id: string;
    name: string;
    title: string;
    url: string;
    fileType: string;
    category: '2D' | '3D';
    discipline: string;
    fileObj: File;
  }[]>([]);

  // Modal State: Upload Revision
  const [isRevModalOpen, setIsRevModalOpen] = useState(false);
  const [targetDrawingId, setTargetDrawingId] = useState('');
  const [targetDrawingTitle, setTargetDrawingTitle] = useState('');
  const [revName, setRevName] = useState('');
  const [revChanges, setRevChanges] = useState('');
  const [selectedRevFile, setSelectedRevFile] = useState<File | null>(null);

  // Approval Flow States
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [isSendApprovalModalOpen, setIsSendApprovalModalOpen] = useState(false);
  const [selectedDrawingForApproval, setSelectedDrawingForApproval] = useState<any | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalInitialAction, setApprovalInitialAction] = useState<'approve' | 'reject' | null>(null);

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setNewUploadFiles([]);
    setSubmitting(false);
  };

  const closeRevModal = () => {
    setIsRevModalOpen(false);
    setRevChanges('');
    setSelectedRevFile(null);
  };

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getDrawings(projectId);
      if (res.success && res.data) setDrawings(res.data);
    } catch (err) {
      console.error('Failed to load drawings', err);
      toast.error('Failed to fetch Drawings register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    fetchDrawings();

    const fetchUsers = async () => {
      try {
        const [membersRes, orgUsersRes] = await Promise.allSettled([
          interiorProjectService.getProjectMembers(projectId),
          interiorProjectService.getOrgUsers(),
        ]);
        let userList: any[] = [];
        if (membersRes.status === 'fulfilled' && membersRes.value?.success && Array.isArray(membersRes.value.data)) {
          userList = membersRes.value.data.map((m: any) => ({
            id: String(m.userId?._id || m.userId?.id || m.userId || m._id || ''),
            _id: String(m.userId?._id || m.userId?.id || m.userId || m._id || ''),
            name: m.userId?.firstName
              ? `${m.userId.firstName} ${m.userId.lastName || ''}`.trim()
              : m.userId?.fullName || m.userId?.email || m.name || m.email || 'Team Member',
            fullName: m.userId?.firstName
              ? `${m.userId.firstName} ${m.userId.lastName || ''}`.trim()
              : m.userId?.fullName || m.userId?.email || m.name || m.email || 'Team Member',
            email: m.userId?.email || m.email || '',
            role: m.role?.name || m.projectRole || m.role || 'Member',
          }));
        }
        if (userList.length === 0 && orgUsersRes.status === 'fulfilled') {
          const raw = orgUsersRes.value?.data || (Array.isArray(orgUsersRes.value) ? orgUsersRes.value : []);
          userList = raw.map((u: any) => ({
            id: String(u._id || u.id || ''),
            _id: String(u._id || u.id || ''),
            name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Team Member',
            fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Team Member',
            email: u.email || '',
            role: u.role?.name || u.role || 'Reviewer',
          }));
        }
        setProjectUsers(userList);
      } catch (err) {
        console.warn('Failed to load project members for approval', err);
      }
    };
    fetchUsers();
  }, [projectId]);

  // Helper to infer 2D vs 3D if legacy drawing item doesn't have drawingType explicitly set
  const inferType = (d: any): '2D' | '3D' => {
    if (d.drawingType === '2D' || d.drawingType === '3D') return d.drawingType;
    const disc = (d.discipline || '').toLowerCase();
    const titleLower = (d.title || '').toLowerCase();
    const dwgNum = (d.drawingNumber || '').toLowerCase();
    const latestUrl = d.revisions?.[d.revisions.length - 1]?.url || '';
    const fileType = detectDrawingFileType(titleLower, latestUrl);

    if (
      disc.includes('3d') ||
      disc.includes('render') ||
      disc.includes('model') ||
      titleLower.includes('3d') ||
      titleLower.includes('render') ||
      titleLower.includes('model') ||
      titleLower.includes('perspective') ||
      titleLower.includes('walkthrough') ||
      dwgNum.includes('3d') ||
      fileType === '3d-model'
    ) {
      return '3D';
    }
    return '2D';
  };

  // Stats Counters
  const totalCount = drawings.length;
  const count2D = useMemo(() => drawings.filter((d) => inferType(d) === '2D').length, [drawings]);
  const count3D = useMemo(() => drawings.filter((d) => inferType(d) === '3D').length, [drawings]);
  const approvedCount = useMemo(() => drawings.filter((d) => d.status === 'approved').length, [drawings]);
  const underReviewCount = useMemo(
    () => drawings.filter((d) => d.status === 'under_review' || d.status === 'submitted' || d.status === 'draft').length,
    [drawings]
  );

  // Filtered drawings
  const filteredDrawings = useMemo(() => {
    return drawings.filter((d) => {
      const type = inferType(d);
      if (type !== drawingTypeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesTitle = d.title?.toLowerCase().includes(q);
        const matchesNum = d.drawingNumber?.toLowerCase().includes(q);
        const matchesChanges = d.revisions?.some((r: any) => r.changes?.toLowerCase().includes(q));
        if (!matchesTitle && !matchesNum && !matchesChanges) return false;
      }
      return true;
    });
  }, [drawings, drawingTypeFilter, statusFilter, search]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, category: '2D' | '3D') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const type = detectDrawingFileType(file.name);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const defaultDiscipline = category === '3D' ? '3D Model' : '2D Drawing';
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (event) => {
          setNewUploadFiles((prev) => [
            ...prev,
            {
              id: fileId,
              name: file.name,
              title: cleanTitle,
              url: (event.target?.result as string) || '',
              fileType: type,
              category,
              discipline: defaultDiscipline,
              fileObj: file,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setNewUploadFiles((prev) => [
          ...prev,
          {
            id: fileId,
            name: file.name,
            title: cleanTitle,
            url: '',
            fileType: type,
            category,
            discipline: defaultDiscipline,
            fileObj: file,
          },
        ]);
      }
    });

    e.target.value = '';
  };

  const removeUploadFile = (id: string) => {
    setNewUploadFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const updateUploadFile = (id: string, field: 'title' | 'discipline', value: string) => {
    setNewUploadFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmitDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUploadFiles.length === 0) {
      toast.error('Please select at least one drawing or 3D model to upload');
      return;
    }

    try {
      setSubmitting(true);
      const toastId = toast.loading(`Uploading ${newUploadFiles.length} file(s)...`);

      for (let i = 0; i < newUploadFiles.length; i++) {
        const item = newUploadFiles[i];
        const formData = new FormData();
        formData.append('file', item.fileObj);

        const uploadRes = await interiorProjectService.uploadDrawingFile(projectId, formData);
        if (!uploadRes.success || !uploadRes.data?.url) {
          throw new Error(`Failed to upload ${item.name}`);
        }

        const fileUrl = uploadRes.data.url;
        const fileType = detectDrawingFileType(item.name, fileUrl);

        await interiorProjectService.createDrawing(projectId, {
          title: item.title.trim() || item.name,
          discipline: item.discipline,
          drawingType: item.category,
          fileType,
          fileUrl,
          status: 'draft',
        });
      }

      toast.dismiss(toastId);
      toast.success(`${newUploadFiles.length} ${newUploadFiles.length === 1 ? 'drawing' : 'drawings'} uploaded successfully!`);
      closeCreateModal();
      fetchDrawings();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Failed to upload drawings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (drawingId: string, status: string) => {
    try {
      const res = await interiorProjectService.updateDrawing(projectId, { drawingId, status });
      if (res.success) {
        toast.success(`Drawing status updated to: ${status.replace('_', ' ').toUpperCase()}`);
        fetchDrawings();
      }
    } catch (err) {
      console.error('Status update failed', err);
      toast.error('Failed to update approval status');
    }
  };

  const handleDeleteDrawing = async (drawingId: string, drawingTitle: string) => {
    if (!confirm(`Are you sure you want to delete drawing "${drawingTitle}"?`)) return;
    try {
      const res = await interiorProjectService.deleteDrawing(projectId, drawingId);
      if (res.success) {
        toast.success('Drawing removed successfully');
        fetchDrawings();
      }
    } catch (err) {
      console.error('Failed to delete drawing', err);
      toast.error('Failed to delete drawing');
    }
  };

  const handleOpenRevModal = (dwg: any) => {
    setTargetDrawingId(dwg._id);
    setTargetDrawingTitle(dwg.title);
    setRevName(`Rev ${dwg.revisions.length}`);
    setRevChanges('');
    setSelectedRevFile(null);
    setIsRevModalOpen(true);
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName || !revChanges.trim()) {
      toast.error('Please describe what changed in this revision');
      return;
    }
    if (!selectedRevFile) {
      toast.error('Please select a revision file to upload');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedRevFile);

      const uploadToastId = toast.loading('Uploading revision file...');
      const uploadRes = await interiorProjectService.uploadDrawingFile(projectId, formData);
      toast.dismiss(uploadToastId);

      if (!uploadRes.success || !uploadRes.data?.url) {
        throw new Error('Revision upload failed');
      }

      const fileUrl = uploadRes.data.url;
      const fileType = detectDrawingFileType(selectedRevFile.name, fileUrl);

      const res = await interiorProjectService.updateDrawing(projectId, {
        drawingId: targetDrawingId,
        revisionName: revName,
        changes: revChanges.trim(),
        fileUrl,
        fileType,
      });

      if (res.success) {
        toast.success('New revision uploaded successfully!');
        closeRevModal();
        fetchDrawings();
      }
    } catch (err: any) {
      console.error('Revision fail', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to upload revision');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (s: string, hasReviewer?: boolean) => {
    if ((s === 'draft' || s === 'submitted' || !s) && !hasReviewer) {
      return {
        label: 'Draft',
        classes: 'bg-slate-500/10 text-slate-600 border-slate-500/20 font-bold',
        icon: AlertCircle,
      };
    }
    switch (s) {
      case 'approved':
        return {
          label: 'Approved',
          classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold',
          icon: CheckCircle2,
        };
      case 'under_review':
        return {
          label: 'Under Review',
          classes: 'bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold',
          icon: Clock,
        };
      case 'submitted':
        return {
          label: 'Submitted',
          classes: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 font-bold',
          icon: Clock,
        };
      case 'rejected':
        return {
          label: 'Rejected',
          classes: 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold',
          icon: XCircle,
        };
      default:
        return {
          label: s || 'Draft',
          classes: 'bg-slate-500/10 text-slate-600 border-slate-500/20 font-bold',
          icon: AlertCircle,
        };
    }
  };

  return (
    <div className="p-4 sm:p-4 lg:p-4 space-y-3 max-w-7xl mx-auto">
      {/* ── 1. Header & Summary Stats ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 sm:p-3 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 font-black">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-xl font-black text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2">
                2D & 3D Drawings Register
              </h1>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Manage 2D Working Plans and 3D Models.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {canDo('drawings', 'create') && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              <UploadCloud size={15} /> Upload 2D / 3D Drawings
            </Button>
          )}
        </div>
      </div>



      {/* ── 3. Main Navigation Toolbar (2D / 3D Segmented Tabs + Search + Controls) ── */}
      <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main 2D vs 3D Mode Pills */}
          <div className="flex items-center p-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] overflow-x-auto">


            <button
              onClick={() => setDrawingTypeFilter('2D')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap',
                drawingTypeFilter === '2D'
                  ? 'bg-blue-600 text-white'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <PenTool size={14} />
              <span>📐 2D Working Drawings ({count2D})</span>
            </button>

            <button
              onClick={() => setDrawingTypeFilter('3D')}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap',
                drawingTypeFilter === '3D'
                  ? 'bg-purple-600 text-white'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <Box size={14} />
              <span>🧊 3D Models & Renders ({count3D})</span>
            </button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search by name or DWG number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Main Drawings Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Loading Project Blueprints & 3D Assets...</p>
        </div>
      ) : filteredDrawings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center mb-4">
            {drawingTypeFilter === '3D' ? <Box size={30} /> : <PenTool size={30} />}
          </div>
          <h3 className="text-base font-black text-[hsl(var(--foreground))] mb-1">
            No {drawingTypeFilter === '3D' ? '3D Models or Renders' : '2D Drawings'} Found
          </h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto mb-5">
            {search || statusFilter !== 'all'
              ? 'No project assets match your active filters. Try resetting search or filter options.'
              : `Upload your first ${drawingTypeFilter === '3D' ? '3D DWG, SketchUp model, or CGI render' : '2D GFC plan, floor layout, or CAD drawing'
              } to start tracking.`}
          </p>
          {canDo('drawings', 'create') && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              <UploadCloud size={14} /> Upload {drawingTypeFilter === '3D' ? '3D Models / Renders' : '2D Drawings'}
            </Button>
          )}
        </div>
      ) : (
        /* ── Drawings Card Grid (4 In a Row) ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDrawings.map((dwg) => {
            const currentRev = dwg.revisions?.[dwg.revisions.length - 1] || { revision: 'Rev 0', url: '' };
            const type = inferType(dwg);
            const badge = getFileTypeBadge(dwg.title, currentRev.url, type);
            const statusInfo = getStatusBadge(dwg.status, Boolean(dwg.assignedReviewer));
            const isImage = detectDrawingFileType(dwg.title, currentRev.url) === 'image';
            const StatusIcon = statusInfo.icon;
            const BadgeIcon = badge.icon;

            return (
              <motion.div
                key={dwg._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex flex-col justify-between rounded-2xl bg-[hsl(var(--card))] border transition-all duration-300 overflow-hidden',
                  type === '3D'
                    ? 'border-purple-500/20 hover:border-purple-500/50'
                    : 'border-blue-500/20 hover:border-blue-500/50'
                )}
              >
                {/* Visual Header / Thumbnail Box */}
                <div
                  onClick={() => router.push(`/interior-new/projects/${projectId}/drawings/${dwg._id || dwg.id || dwg.drawingNumber}`)}
                  className="relative w-full h-36 bg-[hsl(var(--muted)/0.4)] border-b border-[hsl(var(--border))] flex items-center justify-center overflow-hidden group cursor-pointer"
                >
                  {isImage && currentRev.url ? (
                    <>
                      <img
                        src={currentRev.url}
                        alt={dwg.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/interior-new/projects/${projectId}/drawings/${dwg._id || dwg.id || dwg.drawingNumber}`);
                          }}
                          className="p-2 rounded-full bg-white/90 text-slate-900 hover:bg-white transition-all shadow-md"
                          title="Open Drawing Studio"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center w-full h-full">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110',
                          type === '3D' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'
                        )}
                      >
                        <BadgeIcon size={24} />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[hsl(var(--muted-foreground))]">{badge.label}</span>
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/interior-new/projects/${projectId}/drawings/${dwg._id || dwg.id || dwg.drawingNumber}`);
                          }}
                          className="p-2 rounded-full bg-white/90 text-slate-900 hover:bg-white transition-all shadow-md"
                          title="Open Drawing Studio"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Top Floating Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-md border',
                        type === '3D'
                          ? 'bg-purple-600/90 text-white border-purple-400/30'
                          : 'bg-blue-600/90 text-white border-blue-400/30'
                      )}
                    >
                      {type} Asset
                    </span>
                    <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-black/60 text-white backdrop-blur-md border border-white/10">
                      {dwg.drawingNumber}
                    </span>
                    {dwg.annotations && dwg.annotations.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-amber-500/90 text-white backdrop-blur-md border border-amber-400/30 flex items-center gap-0.5 shadow-xs">
                        <Pin size={9} className="fill-white" />
                        <span>{dwg.annotations.length}</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase backdrop-blur-md border',
                        statusInfo.classes
                      )}
                    >
                      <StatusIcon size={11} /> {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-black text-[hsl(var(--foreground))] line-clamp-2" title={dwg.title}>
                      {dwg.title}
                    </h3>
                    {dwg.assignedReviewerName && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 truncate">
                        <UserCheck size={11} className="shrink-0" />
                        <span className="truncate">Reviewer: {dwg.assignedReviewerName}</span>
                      </div>
                    )}
                    {dwg.status === 'rejected' && dwg.rejectionReason && (
                      <p className="text-[10px] text-rose-600 line-clamp-1 italic bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100" title={dwg.rejectionReason}>
                        Changes: {dwg.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2.5 border-t border-[hsl(var(--border))] space-y-2">
                    {/* Approval Action Buttons */}
                    {(!dwg.assignedReviewer && dwg.status !== 'approved' && dwg.status !== 'rejected') && canDo('drawings', 'update') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDrawingForApproval(dwg);
                          setIsSendApprovalModalOpen(true);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs cursor-pointer"
                      >
                        <Send size={12} /> Send for Approval
                      </button>
                    )}

                    {(Boolean(dwg.assignedReviewer) && (dwg.status === 'under_review' || dwg.status === 'submitted')) && (
                      <div className="flex items-center gap-1.5">
                        {canDo('drawings', 'approve') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDrawingForApproval(dwg);
                              setApprovalInitialAction('approve');
                              setIsApprovalModalOpen(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 size={12} /> Approve
                          </button>
                        )}
                        {canDo('drawings', 'approve') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDrawingForApproval(dwg);
                              setApprovalInitialAction('reject');
                              setIsApprovalModalOpen(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        )}
                      </div>
                    )}

                    {dwg.status === 'rejected' && canDo('drawings', 'update') && (
                      <button
                        type="button"
                        onClick={() => handleOpenRevModal(dwg)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs cursor-pointer"
                      >
                        <UploadCloud size={12} /> Upload Revision
                      </button>
                    )}

                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => router.push(`/interior-new/projects/${projectId}/drawings/${dwg._id || dwg.id || dwg.drawingNumber}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-[11px] font-bold rounded-lg transition-all border border-[hsl(var(--border))] cursor-pointer"
                      >
                        <Eye size={13} className="text-indigo-600" /> View Drawing
                      </button>

                      {canDo('drawings', 'delete') && (
                        <button
                          onClick={() => handleDeleteDrawing(dwg._id, dwg.title)}
                          className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          title="Delete Drawing"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── 5. Modal: Register / Upload 2D & 3D Drawings (CRM-style Modal) ── */}
      <InteriorProjectUploadDrawingModal
        isOpen={isModalOpen}
        onClose={closeCreateModal}
        projectId={projectId}
        existingDrawings={drawings}
        onSuccess={fetchDrawings}
      />

      {/* ── 6. Modal: Upload Revision ── */}
      <AnimatePresence>
        {isRevModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-3xl bg-[hsl(var(--card))] overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                <div className="flex items-center gap-2">
                  <GitBranch size={18} className="text-indigo-600" />
                  <div>
                    <h3 className="text-base font-black text-[hsl(var(--foreground))]">Upload {revName}</h3>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate max-w-xs">{targetDrawingTitle}</p>
                  </div>
                </div>
                <button onClick={closeRevModal} className="p-1.5 rounded-full hover:bg-[hsl(var(--muted))]">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitRevision} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))]">Describe Revision Changes *</label>
                  <Input
                    required
                    placeholder="e.g. Updated electrical switches near wardrobe & adjusted ceiling drop"
                    value={revChanges}
                    onChange={(e) => setRevChanges(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[hsl(var(--foreground))] block mb-1">New Revision File *</label>
                  <div className="border-2 border-dashed border-[hsl(var(--border))] hover:border-indigo-500/50 bg-[hsl(var(--muted)/0.2)] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all relative cursor-pointer">
                    <input
                      type="file"
                      required
                      accept="image/*,application/pdf,.pdf,.dwg,.dxf,.skp,.obj,.fbx,.3ds,.blend,.rvt,.zip,.rar"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setSelectedRevFile(e.target.files[0]);
                      }}
                    />
                    <FileDown className="w-8 h-8 text-indigo-500" />
                    <span className="text-xs font-bold text-center text-[hsl(var(--foreground))] px-2 truncate w-full">
                      {selectedRevFile ? selectedRevFile.name : 'Click or drag new revision file'}
                    </span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">PDF, DWG, SKP, or Image files</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[hsl(var(--border))]">
                  <Button variant="outline" type="button" onClick={closeRevModal} className="rounded-xl text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-xl text-xs font-bold">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Upload Revision
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 6. Modals: Send Drawing for Approval & Approval Review ── */}
      <InteriorProjectSendDrawingForApprovalModal
        isOpen={isSendApprovalModalOpen}
        onClose={() => {
          setIsSendApprovalModalOpen(false);
          setSelectedDrawingForApproval(null);
        }}
        projectId={projectId}
        drawing={selectedDrawingForApproval}
        users={projectUsers}
        onSuccess={fetchDrawings}
      />

      <InteriorProjectDrawingApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedDrawingForApproval(null);
          setApprovalInitialAction(null);
        }}
        projectId={projectId}
        drawing={selectedDrawingForApproval}
        initialAction={approvalInitialAction}
        onSuccess={fetchDrawings}
      />
    </div>
  );
}
