'use client';

// =============================================================================
// Sky-Lite Web — Handover & Closeout Management
// Minimal, Modern & Streamlined Project Handover Checklist
// Auto-calculated from live project milestones, tasks, drawings, snags, NCRs,
// and closeout documentation. Non-editable, clean single-row UI.
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageCheck,
  Check,
  Loader2,
  FileText,
  Plus,
  X,
  FileDown,
  Trash2,
  Award,
  Search,
  ArrowUpRight,
  Printer,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/upload';

interface InteriorHandoverViewProps {
  projectId: string;
}

export default function InteriorHandoverView({ projectId }: InteriorHandoverViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();

  // Project Datasets
  const [project, setProject] = useState<any>(null);
  const [wbsData, setWbsData] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [snags, setSnags] = useState<any[]>([]);
  const [handover, setHandover] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('warranty');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Document Filters & Cert Modal
  const [docSearch, setDocSearch] = useState('');
  const [docFilterType, setDocFilterType] = useState<'all' | 'warranty' | 'manual' | 'certificate'>('all');
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Fetch project data in parallel
  const fetchAllData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const [projRes, wbsRes, tasksRes, drawingsRes, snagsRes, handoverRes] =
        await Promise.allSettled([
          interiorProjectService.getProjectDetails(projectId),
          interiorProjectService.getWbs(projectId),
          interiorProjectService.getTasks(projectId),
          interiorProjectService.getDrawings(projectId),
          interiorProjectService.getSnags(projectId),
          interiorProjectService.getHandover(projectId),
        ]);

      if (projRes.status === 'fulfilled' && projRes.value?.success && projRes.value.data) {
        setProject(projRes.value.data);
      }
      if (wbsRes.status === 'fulfilled' && wbsRes.value?.success && wbsRes.value.data) {
        setWbsData(wbsRes.value.data);
      }
      if (tasksRes.status === 'fulfilled' && tasksRes.value?.success && tasksRes.value.data) {
        setTasks(tasksRes.value.data);
      }
      if (drawingsRes.status === 'fulfilled' && drawingsRes.value?.success && drawingsRes.value.data) {
        setDrawings(drawingsRes.value.data);
      }
      if (snagsRes.status === 'fulfilled' && snagsRes.value?.success && snagsRes.value.data) {
        setSnags(snagsRes.value.data);
      }
      if (handoverRes.status === 'fulfilled' && handoverRes.value?.success && handoverRes.value.data) {
        setHandover(handoverRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load handover data', err);
      if (showLoading) toast.error('Failed to load handover details');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchAllData();
  }, [projectId]);

  // Helper to gather all descendant node IDs of a WBS root node
  const getAllDescendantIds = (node: any): string[] => {
    const ids: string[] = [];
    const collect = (curr: any) => {
      if (!curr) return;
      const currId = String(curr.id || curr._id || '');
      if (currId) ids.push(currId);
      if (Array.isArray(curr.floors)) curr.floors.forEach(collect);
      if (Array.isArray(curr.zones)) curr.zones.forEach(collect);
      if (Array.isArray(curr.areas)) curr.areas.forEach(collect);
      if (Array.isArray(curr.packages)) curr.packages.forEach(collect);
      if (Array.isArray(curr.children)) curr.children.forEach(collect);
    };
    collect(node);
    return ids;
  };

  // Actual WBS root elements defined in the project (matches WBS view 1-to-1)
  const actualWbsNodes = useMemo(() => {
    return (wbsData || []).map((node: any) => ({
      id: String(node.id || node._id || ''),
      name: node.name || 'WBS Element',
      childIds: getAllDescendantIds(node),
      rawProgress: node.progress || 0,
    }));
  }, [wbsData]);

  // Clean, Simple Checklist Items based on actual project metrics
  const checklistItems = useMemo(() => {
    // 1. Tasks / Activities calculation
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed' || (t.progress || 0) >= 100).length;
    const isTasksDone = totalTasks > 0 && completedTasks === totalTasks;

    // 2. WBS Calculation (100% dynamic matching the user's actual WBS elements)
    const totalWbs = actualWbsNodes.length;

    const wbsNodesWithProgress = actualWbsNodes.map((wbsNode) => {
      // Find all tasks assigned to this WBS node or any of its children
      const nodeTasks = tasks.filter((t) => {
        const rawPkgId = String(t.packageId?._id || t.packageId?.id || t.packageId || '');
        return rawPkgId === wbsNode.id || wbsNode.childIds.includes(rawPkgId);
      });

      if (nodeTasks.length > 0) {
        const completedInNode = nodeTasks.filter((t) => t.status === 'completed' || (t.progress || 0) >= 100).length;
        const progress = Math.round((completedInNode / nodeTasks.length) * 100);
        return {
          ...wbsNode,
          taskCount: nodeTasks.length,
          completedCount: completedInNode,
          progress,
          isCompleted: completedInNode === nodeTasks.length,
        };
      }

      // If all activities in the project are completed, WBS is 100% complete
      if (isTasksDone) {
        return { ...wbsNode, progress: 100, isCompleted: true };
      }

      const progress = wbsNode.rawProgress || 0;
      return { ...wbsNode, progress, isCompleted: progress >= 100 };
    });

    const completedWbsCount = wbsNodesWithProgress.filter((w) => w.isCompleted).length;

    const avgWbsProgress =
      isTasksDone
        ? 100
        : totalWbs > 0
        ? Math.round(wbsNodesWithProgress.reduce((acc, w) => acc + w.progress, 0) / totalWbs)
        : totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : project?.progress || 0;

    const isWbsDone = avgWbsProgress >= 100 || (totalWbs > 0 && completedWbsCount === totalWbs) || isTasksDone;

    // 3. Drawings
    const totalDrawings = drawings.length;
    const approvedDrawings = drawings.filter((d) => d.status === 'approved').length;
    const isDrawingsDone = totalDrawings > 0 && approvedDrawings === totalDrawings;

    // 4. Snags
    const totalSnags = snags.length;
    const openSnags = snags.filter(
      (s) => s.status !== 'resolved' && s.status !== 'closed' && s.status !== 'verified'
    ).length;
    const isSnagsDone = openSnags === 0;

    // 5. Documents
    const docs = handover?.documents || [];
    const isDocsDone = docs.length > 0;

    return [
      {
        id: 'wbs',
        title: 'WBS progress 100%',
        subtitle:
          totalWbs > 0
            ? `${completedWbsCount} of ${totalWbs} WBS completed (${avgWbsProgress}%)`
            : totalTasks > 0
            ? `${completedTasks} of ${totalTasks} activities completed (${avgWbsProgress}%)`
            : `${avgWbsProgress}% overall progress`,
        passed: isWbsDone,
        tag: `${avgWbsProgress}%`,
        href: `/interior-new/projects/${projectId}/wbs`,
      },
      {
        id: 'tasks',
        title: 'All activities & tasks completed',
        subtitle: totalTasks > 0 ? `${completedTasks} of ${totalTasks} completed` : 'No tasks scheduled',
        passed: isTasksDone,
        tag: totalTasks > 0 ? `${completedTasks}/${totalTasks}` : '0/0',
        href: `/interior-new/projects/${projectId}/tasks`,
      },
      {
        id: 'drawings',
        title: 'All drawings approved',
        subtitle: totalDrawings > 0 ? `${approvedDrawings} of ${totalDrawings} approved` : 'No drawings uploaded',
        passed: isDrawingsDone,
        tag: totalDrawings > 0 ? `${approvedDrawings}/${totalDrawings}` : '0/0',
        href: `/interior-new/projects/${projectId}/drawings`,
      },
      {
        id: 'snags',
        title: 'Snag list rectification verify',
        subtitle: openSnags === 0 ? 'Zero open snags on site' : `${openSnags} open snag${openSnags > 1 ? 's' : ''} remaining`,
        passed: isSnagsDone,
        tag: openSnags === 0 ? 'Verified' : `${openSnags} Open`,
        href: `/interior-new/projects/${projectId}/snags`,
      },
      {
        id: 'documents',
        title: 'Interior Care & Appliance Manuals',
        subtitle: docs.length === 0 ? 'No manuals or warranties uploaded yet' : `${docs.length} document${docs.length > 1 ? 's' : ''} registered`,
        passed: isDocsDone,
        tag: docs.length === 0 ? 'Pending' : `${docs.length} Uploaded`,
        href: '#closeout-docs',
      },
    ];
  }, [actualWbsNodes, project, tasks, drawings, snags, handover, projectId]);

  // Overall Score
  const completedCount = checklistItems.filter((i) => i.passed).length;
  const totalCount = checklistItems.length;
  const readinessPercentage = Math.round((completedCount / totalCount) * 100);

  // Sync with backend model in background
  useEffect(() => {
    if (handover && handover.completionPercentage !== readinessPercentage) {
      interiorProjectService
        .updateHandover(projectId, {
          checklist: checklistItems.map((item) => ({
            task: item.title,
            status: item.passed ? 'completed' : 'pending',
          })),
        })
        .catch(() => {});
    }
  }, [readinessPercentage, projectId, checklistItems, handover]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    const docs = handover?.documents || [];
    return docs.filter((doc: any) => {
      const matchSearch =
        !docSearch.trim() ||
        doc.name?.toLowerCase().includes(docSearch.toLowerCase()) ||
        doc.type?.toLowerCase().includes(docSearch.toLowerCase());
      const matchType = docFilterType === 'all' || doc.type === docFilterType;
      return matchSearch && matchType;
    });
  }, [handover?.documents, docSearch, docFilterType]);

  const closeModal = () => {
    setIsModalOpen(false);
    setDocName('');
    setDocType('warranty');
    setSelectedFile(null);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      toast.error('Please enter document title');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUpdating(true);
      const toastId = toast.loading('Uploading document...');

      let uploadedUrl = '';
      try {
        uploadedUrl = await uploadToCloudinary(selectedFile);
      } catch {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await interiorProjectService.uploadHandoverDocumentFile(projectId, formData);
        if (res.success && res.data?.url) {
          uploadedUrl = res.data.url;
        } else {
          throw new Error('Upload failed');
        }
      }

      toast.dismiss(toastId);
      if (!uploadedUrl) throw new Error('Upload failed');

      const res = await interiorProjectService.updateHandover(projectId, {
        documentName: docName.trim(),
        documentUrl: uploadedUrl,
        documentType: docType,
      });

      if (res.success) {
        toast.success('Document uploaded!');
        closeModal();
        fetchAllData(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const ok = await confirm({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this closeout document?',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const res = await interiorProjectService.updateHandover(projectId, { deleteDocumentId: docId });
      if (res.success) {
        toast.success('Document deleted');
        fetchAllData(false);
      }
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleItemClick = (href: string) => {
    if (href === '#closeout-docs') {
      const el = document.getElementById('closeout-docs');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else setIsModalOpen(true);
      return;
    }
    router.push(href);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  // SVG Gauge calculations
  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (readinessPercentage / 100) * circumference;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto font-sans">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Handover & Closeout Management</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Track warranties, operation manuals, project completion checklist, and client signoffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5"
            onClick={() => setIsCertModalOpen(true)}
          >
            <Award className="w-4 h-4 text-amber-600" />
            Certificate
          </Button>

          <Button size="sm" className="text-xs h-9 gap-1.5" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Document
          </Button>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Clean Circular Ready Card */}
        <Card className="flex flex-col justify-center items-center p-6 text-center bg-white border border-[hsl(var(--border))] rounded-xl shadow-xs">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="60" stroke="hsl(var(--muted))" strokeWidth="10" fill="transparent" />
              <circle
                cx="72"
                cy="72"
                r="60"
                stroke={readinessPercentage === 100 ? '#10b981' : 'hsl(var(--primary))'}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
                {readinessPercentage}%
              </span>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-bold uppercase tracking-wider mt-0.5">
                Handover Ready
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mt-3">
            {completedCount} of {totalCount} Requirements Met
          </p>
        </Card>

        {/* Right: Modern, Clean Single-Row Checklist */}
        <Card className="md:col-span-2 bg-white border border-[hsl(var(--border))] rounded-xl shadow-xs overflow-hidden">
          <CardHeader className="p-4 px-5 border-b border-[hsl(var(--border))] flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-[hsl(var(--foreground))]">
              <PackageCheck className="w-4 h-4 text-[hsl(var(--primary))]" />
              Project Handover Checklist
            </CardTitle>
            <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
              {completedCount}/{totalCount} Completed
            </span>
          </CardHeader>

          <CardContent className="p-3.5 space-y-2">
            {checklistItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item.href)}
                className={cn(
                  'flex items-center justify-between p-3 px-3.5 rounded-lg border transition-all cursor-pointer group',
                  item.passed
                    ? 'border-emerald-200/80 bg-emerald-50/20 hover:bg-emerald-50/40'
                    : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-slate-50'
                )}
              >
                {/* Checkbox Icon + Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all',
                      item.passed
                        ? 'bg-emerald-500 text-white'
                        : 'border border-[hsl(var(--border))] bg-white'
                    )}
                  >
                    {item.passed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <span
                      className={cn(
                        'text-xs font-semibold block truncate',
                        item.passed ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--foreground))]'
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {/* Right Status Badge & Arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                      item.passed
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    )}
                  >
                    {item.tag}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[hsl(var(--primary))] transition-colors" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Closeout Document Register */}
      <Card id="closeout-docs" className="bg-white border border-[hsl(var(--border))] rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 px-5 border-b border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold text-[hsl(var(--foreground))]">
            Closeout Document Register (Warranties, Care & Appliance Manuals)
          </CardTitle>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <select
              value={docFilterType}
              onChange={(e) => setDocFilterType(e.target.value as any)}
              className="h-8 px-2 text-xs font-medium rounded-lg border border-[hsl(var(--border))] bg-white focus:outline-none"
            >
              <option value="all">All</option>
              <option value="warranty">Warranties</option>
              <option value="manual">Care & Appliance Manuals</option>
              <option value="certificate">Certificates</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-xs text-[hsl(var(--muted-foreground))]">
              No closeout manuals or certificates uploaded yet. Click &quot;Add Document&quot; above to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDocuments.map((doc: any, i: number) => (
                <div
                  key={doc._id || i}
                  className="flex items-center justify-between p-3 border border-[hsl(var(--border))] rounded-lg hover:border-slate-300 transition-all bg-[hsl(var(--card))]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">{doc.name}</h4>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">{doc.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(doc.url, '_blank')}>
                      <FileDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 border-rose-100"
                      onClick={() => handleDeleteDocument(doc._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Document Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Log Closeout Document
                </h3>
                <button onClick={closeModal} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadDocument}>
                <div className="p-4 space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Document Title</label>
                    <Input
                      required
                      placeholder="e.g. Modular Kitchen Care Guide or Chimney Warranty"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Category</label>
                    <select
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-white focus:outline-none"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                    >
                      <option value="warranty">Warranty Card / Contract</option>
                      <option value="manual">Interior Care & Appliance Manual</option>
                      <option value="certificate">Handover / NOC Certificate</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block mb-1">Select File</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 hover:border-blue-400 transition-colors relative cursor-pointer bg-slate-50">
                      <input
                        type="file"
                        required
                        accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
                        }}
                      />
                      <FileDown className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-medium text-center text-slate-700 truncate w-full">
                        {selectedFile ? selectedFile.name : 'Click to select file'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-3.5 border-t border-[hsl(var(--border))] bg-slate-50">
                  <Button variant="outline" size="sm" type="button" onClick={closeModal} className="h-8 text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={updating} className="h-8 text-xs">
                    {updating && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
                    Save Document
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Handover Certificate Modal */}
      <AnimatePresence>
        {isCertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-2xl border border-slate-200 rounded-xl bg-white shadow-2xl overflow-hidden my-6"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <span className="text-sm font-bold text-slate-900">Certificate of Practical Completion</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </Button>
                  <button onClick={() => setIsCertModalOpen(false)} className="p-1 rounded hover:bg-slate-200 text-slate-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5 bg-white text-slate-900">
                <div className="text-center space-y-1 border-b pb-4">
                  <h3 className="text-lg font-black tracking-tight">HANDOVER & PRACTICAL COMPLETION CERTIFICATE</h3>
                  <p className="text-xs text-slate-500">
                    Project: <span className="font-bold text-slate-800">{project?.name || 'Project'}</span> ({project?.code || 'PRJ'})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 text-xs">
                  <div><span className="text-slate-400">Client:</span> <span className="font-bold">{project?.client || 'Client'}</span></div>
                  <div><span className="text-slate-400">Date:</span> <span className="font-bold">{new Date().toLocaleDateString('en-IN')}</span></div>
                  <div><span className="text-slate-400">Readiness:</span> <span className="font-bold text-emerald-600">{readinessPercentage}% Complete</span></div>
                  <div><span className="text-slate-400">Status:</span> <span className="font-bold">{readinessPercentage === 100 ? 'Ready' : 'In Progress'}</span></div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">Project Audit Checklist</span>
                  <div className="border rounded-lg divide-y text-xs">
                    {checklistItems.map((c) => (
                      <div key={c.id} className="p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{c.title}</span>
                        </div>
                        <span className="font-semibold text-slate-600">{c.subtitle}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t text-center text-xs">
                  <div className="space-y-6">
                    <div className="h-8 border-b border-dashed" />
                    <div className="font-semibold">Project Manager</div>
                  </div>
                  <div className="space-y-6">
                    <div className="h-8 border-b border-dashed" />
                    <div className="font-semibold">Client Representative</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
