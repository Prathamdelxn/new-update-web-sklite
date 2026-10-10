'use client';

// =============================================================================
// InteriorOS — Tasks & Execution View (Global Standard 3-Stage Suite)
// Stages:
// - To Do (todo) -> In Progress (in_progress) -> Completed (completed)
// Features:
// - Proof of Work Modal upon task completion (Photo uploads + Handover Notes)
// - Proof of Work Verification Badge & Photo Lightbox in Task Drawer
// - Multi-View: Tabular List and Grouped by WBS Package
// - KPI Summary Metrics Bar (Total, In Progress, Blocked, Completed, Overdue)
// - Rich Filters (Live Search, Trade/Package, Priority, Assignee, Sort)
// - Predecessor Dependencies with Blocker Warnings
// - Unified Activity Create/Edit Modal matching InteriorWbsView
// =============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Plus,
  X,
  Calendar,
  Layers,
  Loader2,
  CalendarDays,
  Edit,
  Trash2,
  CheckSquare,
  Link2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  ArrowUpDown,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  ZoomIn,
  Eye,
  FileSpreadsheet,
  Milestone as MilestoneIcon,
  Boxes,
  Package2,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';

interface InteriorTasksViewProps {
  projectId: string;
}

// 3-Stage Global Industry Standard Pipeline
const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'border-t-blue-500 bg-blue-50/50', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  { id: 'in_progress', title: 'In Progress', color: 'border-t-amber-500 bg-amber-50/50', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { id: 'completed', title: 'Completed', color: 'border-t-emerald-500 bg-emerald-50/50', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
];

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: 'text-slate-700 bg-slate-100 border border-slate-200', dot: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'text-blue-700 bg-blue-50 border border-blue-200', dot: 'bg-blue-500' },
  high: { label: 'High', color: 'text-amber-700 bg-amber-50 border border-amber-200', dot: 'bg-amber-500' },
  critical: { label: 'Critical', color: 'text-red-700 bg-red-50 border border-red-200 animate-pulse', dot: 'bg-red-500' },
};

// Legacy status mapping (maps any old backlog/in_review tasks to current standard)
const normalizeTaskStatus = (st: string): string => {
  if (st === 'backlog') return 'todo';
  if (st === 'in_review') return 'in_progress';
  return st || 'todo';
};

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

export default function InteriorTasksView({ projectId }: InteriorTasksViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  // Data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [wbsPackages, setWbsPackages] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [viewMode, setViewMode] = useState<'wbs_grouped' | 'list'>('wbs_grouped');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterPackage, setFilterPackage] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'name'>('dueDate');
  const [expandedWbsGroups, setExpandedWbsGroups] = useState<Record<string, boolean>>({});

  // Drawer / Selection states
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Proof of Work Modal State
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofTask, setProofTask] = useState<any>(null);
  const [proofImages, setProofImages] = useState<Array<{ url: string; name: string; size?: number }>>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [materialUsages, setMaterialUsages] = useState<
    Array<{ inventoryId: string; materialName: string; quantity: string | number; unit: string; notes: string }>
  >([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null);

  // Unified Activity Modal State (Exact match with InteriorWbsView)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityModalMode, setActivityModalMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState('');
  const [activityPackageId, setActivityPackageId] = useState('');
  const [activityName, setActivityName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityPriority, setActivityPriority] = useState('medium');
  const [activityStatus, setActivityStatus] = useState('todo');
  const [activityAssigneeId, setActivityAssigneeId] = useState('');
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [activityIsMilestone, setActivityIsMilestone] = useState(false);
  const [submittingActivity, setSubmittingActivity] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [taskRes, wbsRes, memberRes, milestoneRes, inventoryRes] = await Promise.allSettled([
        interiorProjectService.getTasks(projectId),
        interiorProjectService.getWbs(projectId),
        interiorProjectService.getProjectMembers(projectId),
        interiorProjectService.getMilestones(projectId),
        interiorProjectService.getInventory(projectId),
      ]);

      if (taskRes.status === 'fulfilled' && taskRes.value?.success && taskRes.value.data) {
        const normalized = (taskRes.value.data || []).map((t: any) => ({
          ...t,
          status: normalizeTaskStatus(t.status),
        }));
        setTasks(normalized);
      } else {
        setTasks([]);
      }

      let packages: any[] = [];
      if (wbsRes.status === 'fulfilled' && wbsRes.value?.success && wbsRes.value.data) {
        // Map only the actual top-level WBS elements, gathering all child IDs for matching
        packages = (wbsRes.value.data || []).map((rootNode: any) => ({
          ...rootNode,
          id: String(rootNode.id || rootNode._id),
          childIds: getAllDescendantIds(rootNode),
        }));
      }
      setWbsPackages(packages);

      if (memberRes.status === 'fulfilled' && memberRes.value?.success) {
        const rawMembers = memberRes.value.data || [];
        const formattedMembers = rawMembers.map((m: any) => ({
          id: String(m.userId?._id || m.userId?.id || m.userId || m._id || ''),
          name: m.userId?.firstName
            ? `${m.userId.firstName} ${m.userId.lastName || ''}`.trim()
            : m.userId?.email || m.name || m.email || 'Member',
          email: m.userId?.email || m.email || '',
          role: (m.roleTitle || m.projectRole || m.role || 'Member').replace(/_/g, ' '),
        }));
        setProjectMembers(formattedMembers);
      } else {
        setProjectMembers([]);
      }

      if (milestoneRes.status === 'fulfilled' && milestoneRes.value?.success) {
        setMilestones(milestoneRes.value.data || []);
      } else {
        setMilestones([]);
      }

      if (inventoryRes.status === 'fulfilled' && inventoryRes.value?.success) {
        setInventoryItems(inventoryRes.value.data || []);
      } else {
        setInventoryItems([]);
      }
    } catch (err) {
      console.warn('Error fetching tasks data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  // Open Add Activity Modal
  const handleOpenAddActivity = (packageId?: string) => {
    setActivityModalMode('create');
    setEditingTaskId('');
    setActivityPackageId(packageId || (wbsPackages[0]?.id || ''));
    setActivityName('');
    setActivityDescription('');
    setActivityPriority('medium');
    setActivityStatus('todo');
    setActivityAssigneeId('');
    setActivityStartDate('');
    setActivityEndDate('');
    setActivityIsMilestone(false);
    setIsActivityModalOpen(true);
  };

  // Open Edit Activity Modal
  const handleOpenEditActivity = (task: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActivityModalMode('edit');
    setEditingTaskId(task._id);
    setActivityPackageId(task.packageId?._id || (typeof task.packageId === 'string' ? task.packageId : '') || (wbsPackages[0]?.id || ''));
    setActivityName(task.name || '');
    setActivityDescription(task.description || '');
    setActivityPriority(task.priority || 'medium');
    setActivityStatus(normalizeTaskStatus(task.status));
    setActivityAssigneeId(task.assignees?.[0]?._id || (typeof task.assignees?.[0] === 'string' ? task.assignees[0] : '') || '');
    setActivityStartDate(task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
    setActivityEndDate(task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '');
    setActivityIsMilestone(!!task.isMilestone);
    setIsActivityModalOpen(true);
  };

  // Save Standalone Activity / Task (Create or Edit)
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim()) {
      toast.error('Please enter an Activity Name');
      return;
    }

    if (!activityPackageId) {
      toast.error('Please select a WBS Package');
      return;
    }

    if (activityStartDate && activityEndDate && new Date(activityStartDate) > new Date(activityEndDate)) {
      toast.error('Start Date must be before or equal to End Date');
      return;
    }

    // Validate that activity dates fall within parent WBS date range
    const selectedPkg = wbsPackages.find((p) => String(p.id) === String(activityPackageId) || p.childIds?.includes(String(activityPackageId)));
    const wbsMin = selectedPkg?.startDate ? String(selectedPkg.startDate).split('T')[0] : null;
    const wbsMax = selectedPkg?.endDate ? String(selectedPkg.endDate).split('T')[0] : null;

    if (wbsMin && activityStartDate && activityStartDate < wbsMin) {
      toast.error(`Activity Start Date (${activityStartDate}) cannot be earlier than WBS "${selectedPkg?.name || ''}" Start Date (${wbsMin})`);
      return;
    }

    if (wbsMax && activityEndDate && activityEndDate > wbsMax) {
      toast.error(`Activity End Date (${activityEndDate}) cannot be later than WBS "${selectedPkg?.name || ''}" End Date (${wbsMax})`);
      return;
    }

    try {
      setSubmittingActivity(true);
      if (activityModalMode === 'edit') {
        const payload: any = {
          name: activityName.trim(),
          description: activityDescription.trim(),
          packageId: activityPackageId,
          priority: activityPriority,
          status: activityStatus,
          startDate: activityStartDate || null,
          endDate: activityEndDate || null,
          assignees: activityAssigneeId ? [activityAssigneeId] : [],
          isMilestone: activityIsMilestone,
        };
        const res = await interiorProjectService.updateTask(projectId, editingTaskId, payload);
        if (res?.success || res?.data) {
          toast.success('Activity updated successfully!');
          setIsActivityModalOpen(false);
          if (selectedTask?._id === editingTaskId) {
            setSelectedTask((prev: any) => ({ ...prev, ...payload }));
          }
          fetchData();
        }
      } else {
        const payload: any = {
          packageId: activityPackageId,
          name: activityName.trim(),
          description: activityDescription.trim(),
          priority: activityPriority,
          status: 'todo',
          startDate: activityStartDate || undefined,
          endDate: activityEndDate || undefined,
          assignees: activityAssigneeId ? [activityAssigneeId] : [],
          subtasks: [],
          progress: 0,
          isMilestone: activityIsMilestone,
        };

        const res = await interiorProjectService.createTask(projectId, payload);
        if (res?.success || res?.data) {
          toast.success('Activity created successfully!');
          setIsActivityModalOpen(false);
          fetchData();
        }
      }
    } catch (err: any) {
      console.error('Save activity failed', err);
      toast.error(err?.response?.data?.error || 'Failed to save activity');
    } finally {
      setSubmittingActivity(false);
    }
  };

  // Initiate Proof of Work Modal for Task Completion
  const initiateCompleteTask = (task: any) => {
    setProofTask(task);
    setProofImages(task.completionProof?.images || []);
    setProofNotes(task.completionProof?.notes || '');
    if (task.completionProof?.materialUsage && task.completionProof.materialUsage.length > 0) {
      setMaterialUsages(
        task.completionProof.materialUsage.map((m: any) => ({
          inventoryId: String(m.inventoryId?._id || m.inventoryId || ''),
          materialName: m.materialName || '',
          quantity: m.quantity || 1,
          unit: m.unit || 'units',
          notes: m.notes || '',
        }))
      );
    } else {
      setMaterialUsages([]);
    }
    setIsProofModalOpen(true);
  };

  // Add material usage row in completion modal
  const handleAddMaterialUsageRow = () => {
    const firstInv = inventoryItems[0];
    setMaterialUsages((prev) => [
      ...prev,
      {
        inventoryId: firstInv?._id || '',
        materialName: firstInv?.productName || '',
        quantity: 1,
        unit: firstInv?.unit || 'units',
        notes: '',
      },
    ]);
  };

  // Update material usage row in completion modal
  const handleUpdateMaterialUsage = (index: number, field: string, value: any) => {
    setMaterialUsages((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'inventoryId') {
        const inv = inventoryItems.find((i) => String(i._id || i.id) === String(value));
        if (inv) {
          item.materialName = inv.productName;
          item.unit = inv.unit || 'units';
        }
      }
      updated[index] = item;
      return updated;
    });
  };

  // Remove material usage row
  const handleRemoveMaterialUsageRow = (index: number) => {
    setMaterialUsages((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Proof of Work and Mark Completed
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofTask) return;
    try {
      setSubmittingProof(true);
      const validMaterialUsage = materialUsages
        .filter((m) => m.materialName.trim() && Number(m.quantity) > 0)
        .map((m) => ({
          inventoryId: m.inventoryId || undefined,
          materialName: m.materialName.trim(),
          quantity: Number(m.quantity),
          unit: m.unit.trim() || 'units',
          notes: m.notes.trim() || undefined,
        }));

      const payload = {
        status: 'completed',
        progress: 100,
        completionProof: {
          images: proofImages,
          notes: proofNotes.trim() || undefined,
          materialUsage: validMaterialUsage,
          completedAt: new Date().toISOString(),
        },
      };

      const res = await interiorProjectService.updateTask(projectId, proofTask._id, payload);
      if (res?.success && res?.data) {
        const updated = { ...res.data, status: 'completed', progress: 100 };
        setTasks((prev) => prev.map((t) => (t._id === proofTask._id ? updated : t)));
        if (selectedTask && selectedTask._id === proofTask._id) {
          setSelectedTask(updated);
        }
        setIsProofModalOpen(false);
        setProofTask(null);
        setProofImages([]);
        setProofNotes('');
        setMaterialUsages([]);
        toast.success('Task marked as Completed with Material Usage logged!');
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to complete task', err);
      toast.error(err?.response?.data?.error || 'Failed to complete task');
    } finally {
      setSubmittingProof(false);
    }
  };

  // Upload proof image handler (FileReader base64 data url)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProofImages((prev) => [...prev, { url: reader.result as string, name: file.name, size: file.size }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveProofImage = (index: number) => {
    setProofImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Select Task Drawer
  const handleSelectTask = async (task: any) => {
    setSelectedTask(task);
  };

  // Delete Task directly from card or table
  const handleDeleteTaskDirect = async (task: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
      confirmText: 'Delete Task',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await interiorProjectService.deleteTask(projectId, task._id);
      toast.success('Task deleted successfully');
      if (selectedTask?._id === task._id) setSelectedTask(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete task', err);
      toast.error('Failed to delete task');
    }
  };

  // Delete Task from modal
  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    await handleDeleteTaskDirect(selectedTask);
  };

  // Filter & Sort Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = task.name?.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesPkg = task.packageId?.name?.toLowerCase().includes(q) || task.packageId?.trade?.toLowerCase().includes(q);
        const matchesAssignee = task.assignees?.some((a: any) => `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesPkg && !matchesAssignee) return false;
      }

      // Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;

      // Package filter
      if (filterPackage !== 'all') {
        const pkgId = String(task.packageId?._id || task.packageId?.id || (typeof task.packageId === 'string' ? task.packageId : ''));
        const targetPackage = wbsPackages.find((p) => p.id === filterPackage);
        if (targetPackage) {
          if (pkgId !== targetPackage.id && !targetPackage.childIds?.includes(pkgId)) {
            return false;
          }
        } else if (pkgId !== filterPackage) {
          return false;
        }
      }

      // Assignee filter
      if (filterAssignee !== 'all') {
        const hasAssignee = task.assignees?.some((a: any) => (a._id || a.id || (typeof a === 'string' ? a : '')) === filterAssignee);
        if (!hasAssignee) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        if (task.status !== filterStatus) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      }
      if (sortBy === 'priority') {
        const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (order[b.priority] || 0) - (order[a.priority] || 0);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [tasks, searchQuery, filterPriority, filterPackage, filterAssignee, filterStatus, sortBy]);

  // Tasks Grouped by Package (for WBS view mode)
  const tasksByPackage = useMemo(() => {
    const map = new Map<string, { package: any; tasks: any[] }>();

    // Initialize with top-level WBS packages
    wbsPackages.forEach((pkg) => {
      map.set(pkg.id, { package: pkg, tasks: [] });
    });

    // Bucket filtered tasks into their respective top-level WBS package
    filteredTasks.forEach((t) => {
      const rawPkgId = String(t.packageId?._id || t.packageId?.id || (typeof t.packageId === 'string' ? t.packageId : ''));
      const matchingPackage = wbsPackages.find(
        (pkg) => pkg.id === rawPkgId || (pkg.childIds && pkg.childIds.includes(rawPkgId))
      );

      if (matchingPackage && map.has(matchingPackage.id)) {
        map.get(matchingPackage.id)!.tasks.push(t);
      } else {
        // Orphan/unassigned package group
        const unassignedKey = 'unassigned';
        if (!map.has(unassignedKey)) {
          map.set(unassignedKey, {
            package: { id: 'unassigned', name: 'General / Unassigned Activities', trade: '' },
            tasks: [],
          });
        }
        map.get(unassignedKey)!.tasks.push(t);
      }
    });

    return Array.from(map.values()).filter((group) => {
      if (filterPackage !== 'all') {
        return group.package.id === filterPackage;
      }
      if (group.package.id === 'unassigned' && group.tasks.length === 0) {
        return false;
      }
      return true;
    });
  }, [wbsPackages, filteredTasks, filterPackage]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdue = tasks.filter((t) => t.endDate && new Date(t.endDate) < now && t.status !== 'completed').length;
    const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, todo, inProgress, completed, overdue, overallProgress };
  }, [tasks]);

  const toggleWbsGroup = (pkgId: string) => {
    setExpandedWbsGroups((prev) => ({
      ...prev,
      [pkgId]: prev[pkgId] === false ? true : false,
    }));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-20 font-sans">
      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Activity / Task Management</h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
              {tasks.length} Total
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Actionable site execution, WBS tracking and verified proof-of-work completion.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={() => handleOpenAddActivity()} className="shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Activity / Task
          </Button>
        </div>
      </div>

      {/* Minimalistic KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total</span>
            <div className="text-base font-bold text-slate-900 leading-none">{metrics.total}</div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            {metrics.overallProgress}%
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">To Do</span>
            <div className="text-base font-bold text-blue-600 leading-none">{metrics.todo}</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="text-base font-bold text-amber-600 leading-none">{metrics.inProgress}</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Completed</span>
            <div className="text-base font-bold text-emerald-600 leading-none">{metrics.completed}</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Overdue</span>
            <div className={cn('text-base font-bold leading-none', metrics.overdue > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-900')}>
              {metrics.overdue}
            </div>
          </div>
          <div className={cn('w-2 h-2 rounded-full', metrics.overdue > 0 ? 'bg-rose-500' : 'bg-slate-300')} />
        </div>
      </div>

      {/* Control Bar: Filters, Live Search, View Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Live Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Search tasks, packages, assignees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Package Filter */}
          <select
            className="h-9 px-3 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none cursor-pointer"
            value={filterPackage}
            onChange={(e) => setFilterPackage(e.target.value)}
          >
            <option value="all">All WBS ({wbsPackages.length})</option>
            {wbsPackages.map((pkg) => (
              <option key={pkg.id || pkg._id} value={pkg.id || pkg._id}>
                {pkg.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            className="h-9 px-3 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Assignee Filter */}
          <select
            className="h-9 px-3 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none cursor-pointer"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">All Assignees</option>
            {projectMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="h-9 px-3 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* View Switchers & Sort */}
        <div className="flex items-center gap-2 border-t lg:border-t-0 pt-2 lg:pt-0 border-[hsl(var(--border))]">
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] mr-1">Sort</span>
            <select
              className="h-8 px-2.5 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="name">Task Name</option>
            </select>
          </div>

          <div className="flex items-center bg-[hsl(var(--muted)/0.4)] p-0.5 rounded-lg border border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={() => setViewMode('wbs_grouped')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
                viewMode === 'wbs_grouped'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" /> By WBS
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer',
                viewMode === 'list'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> Table List
            </button>
          </div>
        </div>
      </div>

      {/* Main Views Container */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-[hsl(var(--primary))]" />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Loading execution schedule...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))]">
          <Layers className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">No Activities Found</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto mt-1">
            {searchQuery || filterPriority !== 'all' || filterPackage !== 'all'
              ? 'Try changing your filters or search query.'
              : 'Start organizing your site tasks by creating the first activity.'}
          </p>
          <Button className="mt-4" onClick={() => handleOpenAddActivity()}>
            <Plus className="w-4 h-4 mr-1.5" /> Add First Task
          </Button>
        </div>
      ) : (
        <>
          {/* =========================================================================
              VIEW 1: SPREADSHEET TABLE LIST VIEW
             ========================================================================= */}
          {viewMode === 'list' && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">
                    <tr>
                      <th className="py-3 px-4">Task Name</th>
                      <th className="py-3 px-4">WBS Package / Trade</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Proof of Work</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {filteredTasks.map((task) => {
                      const priority = priorityConfig[task.priority] || priorityConfig.medium;
                      const assignee = task.assignees?.[0];
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const isOverdue = task.endDate && new Date(task.endDate) < now && task.status !== 'completed';
                      const hasProof = task.status === 'completed' && task.completionProof?.images?.length > 0;

                      return (
                        <tr
                          key={task._id}
                          className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors cursor-pointer"
                          onClick={() => handleSelectTask(task)}
                        >
                          <td className="py-3 px-4 font-semibold text-[hsl(var(--foreground))] max-w-xs">
                            <span className="truncate">{task.name}</span>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                            <span className="px-2 py-0.5 rounded bg-[hsl(var(--muted))]">
                              {task.packageId?.name ? `${task.packageId.name} (${task.packageId.trade})` : 'Unassigned'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                'px-2.5 py-1 text-[11px] font-bold rounded-md inline-flex items-center gap-1.5 border',
                                task.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : task.status === 'in_progress'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  task.status === 'completed' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
                                )}
                              />
                              {task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className={cn('px-2 py-0.5 text-[10px] font-bold rounded-md uppercase', priority.color)}>
                              {priority.label}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {hasProof ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Camera className="w-3 h-3" /> {task.completionProof.images.length} Photos
                              </span>
                            ) : task.status === 'completed' ? (
                              <span className="text-[10px] text-emerald-600 font-semibold">Done</span>
                            ) : (
                              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {assignee ? (
                              <span className="font-medium text-[hsl(var(--foreground))]">
                                {assignee.firstName} {assignee.lastName}
                              </span>
                            ) : (
                              <span className="text-[hsl(var(--muted-foreground))] italic">Unassigned</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-medium">
                            <span className={cn(isOverdue ? 'text-rose-600 font-bold' : 'text-[hsl(var(--muted-foreground))]')}>
                              {task.endDate ? new Date(task.endDate).toLocaleDateString('en-IN') : '—'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {task.status !== 'completed' ? (
                                <button
                                  type="button"
                                  onClick={() => initiateCompleteTask(task)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                  title="Complete Activity with Proof of Work"
                                >
                                  <Camera className="w-3 h-3 text-emerald-600" /> Complete with Proof
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Completed
                                </span>
                              )}
                              <button
                                type="button"
                                title="View Task Details"
                                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs"
                                onClick={() => handleSelectTask(task)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Edit Activity"
                                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer shadow-2xs"
                                onClick={(e) => handleOpenEditActivity(task, e)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete Task"
                                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
                                onClick={(e) => handleDeleteTaskDirect(task, e)}
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
          )}

          {/* =========================================================================
              VIEW 2: GROUPED BY WBS PACKAGE ACCORDIONS
             ========================================================================= */}
          {viewMode === 'wbs_grouped' && (
            <div className="space-y-4">
              {tasksByPackage.map((group) => {
                const isExpanded = expandedWbsGroups[group.package.id] !== false;
                const completedInGroup = group.tasks.filter((t) => t.status === 'completed').length;
                const pkgProgress = group.tasks.length > 0 ? Math.round((completedInGroup / group.tasks.length) * 100) : 0;

                return (
                  <div
                    key={group.package.id}
                    className="border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] overflow-hidden shadow-xs"
                  >
                    {/* Package Header */}
                    <div
                      className="p-4 flex items-center justify-between bg-[hsl(var(--muted)/0.3)] cursor-pointer hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                      onClick={() => toggleWbsGroup(group.package.id)}
                    >
                      <div className="flex items-center gap-3">
                        <button className="p-1 rounded text-[hsl(var(--muted-foreground))]">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                            {group.package.name}
                            {group.package.trade && (
                              <span className="text-[10px] font-mono uppercase bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded">
                                {group.package.trade}
                              </span>
                            )}
                          </h4>
                          {group.package.description ? (
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{group.package.description}</p>
                          ) : (
                            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{group.tasks.length} activit{group.tasks.length === 1 ? 'y' : 'ies'}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-xs font-bold text-[hsl(var(--foreground))]">{completedInGroup}/{group.tasks.length} Done</span>
                          <div className="w-24 h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pkgProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tasks inside package */}
                    {isExpanded && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-[hsl(var(--border))]">
                        {group.tasks.length === 0 ? (
                          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-between col-span-full text-xs text-slate-500">
                            <span>No activities in this WBS package yet.</span>
                            <button
                              type="button"
                              onClick={() => handleOpenAddActivity(group.package.id)}
                              className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={12} /> Add First Activity
                            </button>
                          </div>
                        ) : (
                          group.tasks.map((task) => (
                            <div
                              key={task._id}
                              className="p-3.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[hsl(var(--primary)/0.4)] cursor-pointer transition-all space-y-2"
                              onClick={() => handleSelectTask(task)}
                            >
                              <div className="flex items-center justify-between">
                                <span className={cn('px-1.5 py-0.2 text-[9px] font-bold rounded uppercase', priorityConfig[task.priority]?.color)}>
                                  {task.priority}
                                </span>
                                <span className="text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))]">
                                  {task.status.replace('_', ' ')}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-[hsl(var(--foreground))] truncate">{task.name}</h5>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                <span className="font-medium text-slate-600 truncate max-w-[120px]">
                                  {task.assignees?.[0] ? `${task.assignees[0].firstName || ''} ${task.assignees[0].lastName || ''}`.trim() : 'Unassigned'}
                                </span>
                                <span>{task.endDate ? new Date(task.endDate).toLocaleDateString('en-IN') : 'No date'}</span>
                              </div>

                              <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                                {task.status !== 'completed' ? (
                                  <button
                                    type="button"
                                    onClick={() => initiateCompleteTask(task)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                  >
                                    <Camera className="w-3 h-3 text-emerald-600" /> Complete with Proof
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                  </span>
                                )}

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    title="View Task Details"
                                    onClick={() => handleSelectTask(task)}
                                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Edit Activity"
                                    onClick={(e) => handleOpenEditActivity(task, e)}
                                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Delete Task"
                                    onClick={(e) => handleDeleteTaskDirect(task, e)}
                                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          UNIFIED ACTIVITY / TASK MODAL (CREATE / EDIT) - MATCHES WBS VIEW
         ========================================================================= */}
      <AnimatePresence>
        {isActivityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg border border-slate-200 bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-900"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {activityModalMode === 'create' ? 'Add Activity / Task' : 'Edit Activity / Task'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {activityModalMode === 'create' ? 'Schedule actionable work under WBS' : 'Update execution details'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleSaveActivity} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Completed Activity Lock Banner */}
                {activityModalMode === 'edit' && activityStatus === 'completed' && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold">Completed Activity (Locked)</span>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        This activity has been marked as completed and verified. Planning dates, trade scope, and details are locked.
                      </p>
                    </div>
                  </div>
                )}

                {/* WBS Package Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <span>WBS Package / Element</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    value={activityPackageId}
                    onChange={(e) => setActivityPackageId(e.target.value)}
                  >
                    <option value="">Select WBS Element...</option>
                    {wbsPackages.map((pkg) => (
                      <option key={pkg.id || pkg._id} value={pkg.id || pkg._id}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 1. Activity Name * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <span>Activity Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                    placeholder="e.g. Base Cabinet Framing & Fitting"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 2. Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">Description / Work Scope</label>
                  <textarea
                    rows={2}
                    disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                    placeholder="Provide specific execution details..."
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none font-normal leading-relaxed shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>

                {/* 3. Priority, Status & Assignee */}
                <div className={cn('grid gap-3', activityModalMode === 'edit' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800">Priority</label>
                    <select
                      disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      value={activityPriority}
                      onChange={(e) => setActivityPriority(e.target.value)}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical Path</option>
                    </select>
                  </div>

                  {activityModalMode === 'edit' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800">Status</label>
                      <select
                        disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        value={activityStatus}
                        onChange={(e) => setActivityStatus(e.target.value)}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-800">Assignee</label>
                    <select
                      disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      value={activityAssigneeId}
                      onChange={(e) => setActivityAssigneeId(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {projectMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Planning Dates */}
                {(() => {
                  const selectedPkg = wbsPackages.find((p) => String(p.id) === String(activityPackageId) || p.childIds?.includes(String(activityPackageId)));
                  const wbsMinDate = selectedPkg?.startDate ? String(selectedPkg.startDate).split('T')[0] : undefined;
                  const wbsMaxDate = selectedPkg?.endDate ? String(selectedPkg.endDate).split('T')[0] : undefined;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-900 tracking-tight">Planning Dates</label>
                        {(wbsMinDate || wbsMaxDate) && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            WBS Scope: {wbsMinDate || 'Any'} to {wbsMaxDate || 'Any'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">Start Date</span>
                          <Input
                            type="date"
                            disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                            value={activityStartDate}
                            min={wbsMinDate}
                            max={activityEndDate || wbsMaxDate || undefined}
                            onChange={(e) => setActivityStartDate(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-medium text-slate-600">End Date</span>
                          <Input
                            type="date"
                            disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                            value={activityEndDate}
                            min={activityStartDate || wbsMinDate || undefined}
                            max={wbsMaxDate}
                            onChange={(e) => setActivityEndDate(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Milestone Checkbox */}
                <div className="pt-1">
                  <label className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border border-purple-200/80 bg-purple-50/40 transition-colors select-none",
                    activityModalMode === 'edit' && activityStatus === 'completed' ? "cursor-not-allowed opacity-60" : "hover:bg-purple-50 cursor-pointer"
                  )}>
                    <input
                      type="checkbox"
                      disabled={activityModalMode === 'edit' && activityStatus === 'completed'}
                      checked={activityIsMilestone}
                      onChange={(e) => setActivityIsMilestone(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-purple-950 flex items-center gap-1">
                          <MilestoneIcon size={12} className="text-purple-600" /> Mark as Milestone Activity
                        </span>
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded uppercase bg-purple-100 text-purple-700">
                          Milestones Tab
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Automatically links and displays this activity in the project&apos;s Milestones tracking section.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Submit button */}
                <div className="pt-3">
                  {activityModalMode === 'edit' && activityStatus === 'completed' ? (
                    <button
                      type="button"
                      onClick={() => setIsActivityModalOpen(false)}
                      className="w-full py-3 px-4 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 rounded-full font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Activity Completed & Locked — Close
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submittingActivity}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submittingActivity ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> {activityModalMode === 'create' ? 'Creating Activity...' : 'Saving Changes...'}
                        </>
                      ) : (
                        activityModalMode === 'create' ? 'Create Activity' : 'Save Changes'
                      )}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          COMPLETE TASK & PROOF OF WORK MODAL DIALOG
         ========================================================================= */}
      <AnimatePresence>
        {isProofModalOpen && proofTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-emerald-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Complete Task & Proof of Work</h3>
                    <p className="text-[11px] text-slate-600">Upload site completion and inspection photos</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsProofModalOpen(false);
                    setProofTask(null);
                  }}
                  className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitProof}>
                <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                  {/* Task summary header */}
                  <div className="p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">{proofTask.name}</h4>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                        {proofTask.packageId?.name ? `${proofTask.packageId.name} (${proofTask.packageId.trade || 'Trade'})` : 'WBS Element'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                      Mark as Completed
                    </span>
                  </div>

                  {/* ── 1. Linked Inventory & Material Usage ── */}
                  <div className="space-y-2.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-blue-600" />
                        <div>
                          <label className="text-xs font-bold text-slate-900 block">Link Inventory & Material Usage</label>
                          <p className="text-[10px] text-slate-500">Record materials and quantities consumed for this activity</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMaterialUsageRow}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus size={13} /> Add Material
                      </button>
                    </div>

                    {materialUsages.length === 0 ? (
                      <div className="text-center py-3 border border-dashed border-slate-200 rounded-lg bg-white text-xs text-slate-400">
                        No materials linked yet. Click &quot;+ Add Material&quot; to log consumed stock.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {materialUsages.map((mat, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-2 shadow-2xs">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              {/* Material Selector / Name */}
                              <div className="sm:col-span-6">
                                {inventoryItems.length > 0 ? (
                                  <select
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                                    value={mat.inventoryId}
                                    onChange={(e) => handleUpdateMaterialUsage(idx, 'inventoryId', e.target.value)}
                                  >
                                    <option value="">-- Custom Material --</option>
                                    {inventoryItems.map((inv) => (
                                      <option key={inv._id} value={inv._id}>
                                        {inv.productName} (In Stock: {Math.max(0, (inv.totalReceived || 0) - (inv.installedQuantity || 0))} {inv.unit})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    placeholder="Material name (e.g. 18mm Plywood)"
                                    value={mat.materialName}
                                    onChange={(e) => handleUpdateMaterialUsage(idx, 'materialName', e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                )}
                              </div>

                              {/* Quantity */}
                              <div className="sm:col-span-4">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    placeholder="Qty"
                                    value={mat.quantity}
                                    onChange={(e) => handleUpdateMaterialUsage(idx, 'quantity', e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                  <Input
                                    placeholder="Unit"
                                    value={mat.unit}
                                    onChange={(e) => handleUpdateMaterialUsage(idx, 'unit', e.target.value)}
                                    className="h-8 text-xs w-16"
                                  />
                                </div>
                              </div>

                              {/* Delete row */}
                              <div className="sm:col-span-2 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMaterialUsageRow(idx)}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remove material"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* If Custom Material selected, allow typing custom name */}
                              {!mat.inventoryId && inventoryItems.length > 0 && (
                                <div className="sm:col-span-12">
                                  <Input
                                    placeholder="Enter custom material name / description"
                                    value={mat.materialName}
                                    onChange={(e) => handleUpdateMaterialUsage(idx, 'materialName', e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── 2. Photo Upload Dropzone ── */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        Site Completion Photos ({proofImages.length})
                      </span>
                      <span className="text-[11px] font-normal text-[hsl(var(--muted-foreground))]">JPG, PNG, WebP</span>
                    </label>

                    <label className="border-2 border-dashed border-[hsl(var(--border))] hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[hsl(var(--background))] hover:bg-emerald-50/20 transition-all text-center">
                      <UploadCloud className="w-6 h-6 text-emerald-600" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-[hsl(var(--foreground))]">Click or Drag & Drop Site Photos</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Upload clear proof of completed work</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Image Previews Grid */}
                    {proofImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2.5 pt-2">
                        {proofImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="group relative aspect-video rounded-lg overflow-hidden border border-[hsl(var(--border))] bg-slate-100"
                          >
                            <img src={img.url} alt={img.name || `Proof ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveProofImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                              title="Remove photo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.2 bg-black/60 text-white rounded text-[9px] truncate max-w-[90%]">
                              {img.name || `Photo ${idx + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── 3. Notes ── */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Completion Notes (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Add any notes, inspection remarks, or quality observations..."
                      value={proofNotes}
                      onChange={(e) => setProofNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setIsProofModalOpen(false);
                      setProofTask(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingProof} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submittingProof && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                    Confirm & Complete Task
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          FULL-SCREEN PHOTO LIGHTBOX MODAL
         ========================================================================= */}
      <AnimatePresence>
        {imageLightboxUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setImageLightboxUrl(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black flex flex-col items-center justify-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setImageLightboxUrl(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={imageLightboxUrl} alt="Proof of Work Full Resolution" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          TASK DETAIL DRAWER / PREVIEW MODAL
         ========================================================================= */}
      <AnimatePresence>
        {selectedTask && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between border-t-0 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{selectedTask.name}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                    {selectedTask.packageId?.name ? `${selectedTask.packageId.name} (${selectedTask.packageId.trade})` : 'Unassigned WBS Package'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditActivity(selectedTask)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                    title="Edit Activity"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status Display & Execution Banner */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Current Stage</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-2.5 py-1 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 border',
                          selectedTask.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : selectedTask.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-blue-50 text-blue-800 border-blue-300'
                        )}
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            selectedTask.status === 'completed'
                              ? 'bg-emerald-600'
                              : selectedTask.status === 'in_progress'
                              ? 'bg-amber-600 animate-pulse'
                              : 'bg-blue-600'
                          )}
                        />
                        {selectedTask.status === 'completed'
                          ? 'Completed'
                          : selectedTask.status === 'in_progress'
                          ? 'In Progress (Active)'
                          : 'To Do (Scheduled)'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {selectedTask.status === 'completed'
                          ? '• Work finished & verified'
                          : selectedTask.status === 'in_progress'
                          ? '• Execution in progress'
                          : '• Awaiting site start'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PROOF OF WORK VERIFIED SECTION (When Completed) */}
                {selectedTask.status === 'completed' && (
                  <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                            Proof of Work Verified
                          </h4>
                          {selectedTask.completionProof?.completedAt && (
                            <p className="text-[10px] text-emerald-700">
                              Completed on {new Date(selectedTask.completionProof.completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] px-2 text-emerald-800 hover:bg-emerald-100 border-emerald-300 bg-white"
                        onClick={() => initiateCompleteTask(selectedTask)}
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Update Proof
                      </Button>
                    </div>

                    {selectedTask.completionProof?.images?.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                          Site Completion Photos ({selectedTask.completionProof.images.length})
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedTask.completionProof.images.map((img: any, idx: number) => (
                            <div
                              key={idx}
                              className="group relative aspect-video rounded-lg overflow-hidden border border-emerald-200 bg-slate-100 cursor-pointer hover:shadow-md transition-all"
                              onClick={() => setImageLightboxUrl(img.url)}
                            >
                              <img src={img.url} alt={img.name || `Proof ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                <ZoomIn className="w-3.5 h-3.5" /> View Photo
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-800/80 italic">No site photos attached to this proof.</p>
                    )}

                    {/* Material Usage Info in Drawer */}
                    {selectedTask.completionProof?.materialUsage && selectedTask.completionProof.materialUsage.length > 0 && (
                      <div className="space-y-2 p-3 rounded-lg border border-emerald-200 bg-white shadow-2xs mt-2">
                        <div className="flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-emerald-700" />
                          <h5 className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                            Materials Consumed ({selectedTask.completionProof.materialUsage.length})
                          </h5>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {selectedTask.completionProof.materialUsage.map((mat: any, mIdx: number) => (
                            <div key={mIdx} className="py-1.5 flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 truncate">{mat.materialName}</span>
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                {mat.quantity} {mat.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata Card */}
                <div className="grid grid-cols-2 gap-3.5 border border-[hsl(var(--border))] p-4 rounded-xl bg-[hsl(var(--card))]">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Priority</span>
                    <p className="text-xs font-semibold capitalize text-[hsl(var(--foreground))]">{selectedTask.priority}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Assignee</span>
                    <p className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
                      {selectedTask.assignees?.[0] ? `${selectedTask.assignees[0].firstName || ''} ${selectedTask.assignees[0].lastName || ''}`.trim() || selectedTask.assignees[0].email : 'Unassigned'}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2 flex items-center gap-2 border-t border-[hsl(var(--border))/0.6] pt-3">
                    <CalendarDays className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start Unset'} —{' '}
                      {selectedTask.endDate ? new Date(selectedTask.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End Unset'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5 pt-2 border-t border-[hsl(var(--border))]">
                  <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">Description</h4>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                    {selectedTask.description || 'No detailed instructions provided.'}
                  </p>
                </div>
              </div>

              {/* Drawer Footer with Delete */}
              <div className="p-4 border-t border-[hsl(var(--border))] bg-slate-50 flex items-center justify-between">
                <Button variant="outline" type="button" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDeleteTask}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Task
                </Button>
                <Button variant="outline" type="button" onClick={() => setSelectedTask(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
