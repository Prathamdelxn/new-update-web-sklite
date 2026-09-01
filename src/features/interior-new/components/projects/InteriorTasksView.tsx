'use client';

// =============================================================================
// InteriorOS — Tasks & Execution View (Global Standard Suite)
// Features:
// - Multi-View: Kanban Board, Tabular List, and Grouped by WBS Package
// - KPI Summary Metrics Bar (Total, In Progress, Blocked, Completed, Overdue)
// - Rich Filters (Live Search, Trade/Package, Priority, Assignee, Sort)
// - Subtasks Checklist with auto-calculated progress
// - Predecessor Dependencies with Blocker Warnings
// - Inline WBS Package Creator & WBS hierarchy breadcrumbs
// - Team Discussions & Activity Stream
// =============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  User,
  Plus,
  X,
  MessageSquare,
  Calendar,
  Layers,
  Loader2,
  CalendarDays,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  Link2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Kanban,
  List,
  FolderTree,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';

interface InteriorTasksViewProps {
  projectId: string;
}

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'border-t-slate-400 bg-slate-500/5', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'todo', title: 'To Do', color: 'border-t-blue-500 bg-blue-500/5', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  { id: 'in_progress', title: 'In Progress', color: 'border-t-amber-500 bg-amber-500/5', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  { id: 'in_review', title: 'In Review', color: 'border-t-indigo-500 bg-indigo-500/5', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' },
  { id: 'completed', title: 'Completed', color: 'border-t-emerald-500 bg-emerald-500/5', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
];

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', dot: 'bg-blue-500' },
  high: { label: 'High', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', dot: 'bg-amber-500' },
  critical: { label: 'Critical', color: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 animate-pulse', dot: 'bg-red-500' },
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
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'wbs_grouped'>('kanban');
  const [activeTab, setActiveTab] = useState('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterPackage, setFilterPackage] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'progress' | 'name'>('dueDate');
  const [expandedWbsGroups, setExpandedWbsGroups] = useState<Record<string, boolean>>({});

  // Drawer / Selection states
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [creatingWbsPackage, setCreatingWbsPackage] = useState(false);

  // Task Dialog Form
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [showInlinePackageForm, setShowInlinePackageForm] = useState(false);
  const [inlinePackageData, setInlinePackageData] = useState({ name: '', trade: 'interior' });

  const [formData, setFormData] = useState<{
    name: string;
    packageId: string;
    priority: string;
    startDate: string;
    endDate: string;
    assigneeId: string;
    milestoneId: string;
    description: string;
    dependencies: string[];
    initialSubtasks: string[];
  }>({
    name: '',
    packageId: '',
    priority: 'medium',
    startDate: '',
    endDate: '',
    assigneeId: '',
    milestoneId: '',
    description: '',
    dependencies: [],
    initialSubtasks: [],
  });
  const [newInitialSubtask, setNewInitialSubtask] = useState('');

  // Task Edit Drawer Form
  const [editTaskData, setEditTaskData] = useState<{
    packageId: string;
    name: string;
    description: string;
    priority: string;
    assigneeId: string;
    startDate: string;
    endDate: string;
    progress: number;
    dependencies: string[];
    subtasks: any[];
  }>({
    packageId: '',
    name: '',
    description: '',
    priority: 'medium',
    assigneeId: '',
    startDate: '',
    endDate: '',
    progress: 0,
    dependencies: [],
    subtasks: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [taskRes, wbsRes, memberRes, milestoneRes] = await Promise.allSettled([
        interiorProjectService.getTasks(projectId),
        interiorProjectService.getWbs(projectId),
        interiorProjectService.getProjectMembers(projectId),
        interiorProjectService.getMilestones(projectId),
      ]);

      if (taskRes.status === 'fulfilled' && taskRes.value?.success && taskRes.value.data) {
        setTasks(taskRes.value.data);
      } else {
        setTasks([]);
      }

      let packages: any[] = [];
      if (wbsRes.status === 'fulfilled' && wbsRes.value?.success && wbsRes.value.data) {
        const extractPackages = (node: any, path: string = '') => {
          const currentPath = path ? `${path} › ${node.name}` : node.name;
          if (node.type === 'package') {
            packages.push({
              ...node,
              id: String(node.id || node._id),
              fullPath: currentPath,
            });
          }
          if (node.floors) node.floors.forEach((f: any) => extractPackages(f, currentPath));
          if (node.zones) node.zones.forEach((z: any) => extractPackages(z, currentPath));
          if (node.areas) node.areas.forEach((a: any) => extractPackages(a, currentPath));
          if (node.packages) node.packages.forEach((p: any) => extractPackages(p, currentPath));
        };
        (wbsRes.value.data || []).forEach((rootNode: any) => extractPackages(rootNode));
      }
      setWbsPackages(packages);

      if (memberRes.status === 'fulfilled' && memberRes.value?.success) {
        setProjectMembers(memberRes.value.data || []);
      } else {
        setProjectMembers([]);
      }

      if (milestoneRes.status === 'fulfilled' && milestoneRes.value?.success) {
        setMilestones(milestoneRes.value.data || []);
      } else {
        setMilestones([]);
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

  // Quick Starter Package creation
  const handleQuickCreateDefaultWbs = async () => {
    try {
      setCreatingWbsPackage(true);
      const bRes = await interiorProjectService.addWbsNode(projectId, { type: 'building', name: 'Main Site' });
      if (!bRes?.success || !bRes.data?._id) throw new Error('Failed to create building');
      const fRes = await interiorProjectService.addWbsNode(projectId, { type: 'floor', name: 'Ground Floor', parentId: bRes.data._id });
      if (!fRes?.success || !fRes.data?._id) throw new Error('Failed to create floor');
      const zRes = await interiorProjectService.addWbsNode(projectId, { type: 'zone', name: 'Zone A', parentId: fRes.data._id });
      if (!zRes?.success || !zRes.data?._id) throw new Error('Failed to create zone');
      const aRes = await interiorProjectService.addWbsNode(projectId, { type: 'area', name: 'Primary Space', parentId: zRes.data._id });
      if (!aRes?.success || !aRes.data?._id) throw new Error('Failed to create area');
      const pRes = await interiorProjectService.addWbsNode(projectId, { type: 'package', name: 'Interior & Fitout', trade: 'interior', parentId: aRes.data._id });
      if (pRes?.success && pRes.data?._id) {
        toast.success('Default WBS structure & package created!');
        setFormData((prev) => ({ ...prev, packageId: String(pRes.data._id) }));
        await fetchData();
      }
    } catch (err: any) {
      console.error('Quick WBS create failed', err);
      toast.error(err?.response?.data?.error || 'Failed to create starter package');
    } finally {
      setCreatingWbsPackage(false);
    }
  };

  // Inline Package creation in modal
  const handleCreateInlinePackage = async () => {
    if (!inlinePackageData.name.trim()) return;
    try {
      setCreatingWbsPackage(true);
      const bRes = await interiorProjectService.addWbsNode(projectId, { type: 'building', name: 'Main Site' });
      const fRes = await interiorProjectService.addWbsNode(projectId, { type: 'floor', name: 'Level 1', parentId: bRes.data._id });
      const zRes = await interiorProjectService.addWbsNode(projectId, { type: 'zone', name: 'General Zone', parentId: fRes.data._id });
      const aRes = await interiorProjectService.addWbsNode(projectId, { type: 'area', name: 'Main Area', parentId: zRes.data._id });
      const pRes = await interiorProjectService.addWbsNode(projectId, {
        type: 'package',
        name: inlinePackageData.name.trim(),
        trade: inlinePackageData.trade,
        parentId: aRes.data._id,
      });

      if (pRes?.success && pRes.data?._id) {
        toast.success(`Package "${inlinePackageData.name}" created!`);
        setFormData((prev) => ({ ...prev, packageId: String(pRes.data._id) }));
        setShowInlinePackageForm(false);
        setInlinePackageData({ name: '', trade: 'interior' });
        await fetchData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create package');
    } finally {
      setCreatingWbsPackage(false);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.packageId) {
      toast.error('Please select or create a WBS package for this task');
      return;
    }
    try {
      setCreatingTask(true);
      const subtasksPayload = (formData.initialSubtasks || []).map((title) => ({
        title,
        completed: false,
      }));

      const payload = {
        name: formData.name,
        packageId: formData.packageId,
        priority: formData.priority,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        assignees: formData.assigneeId ? [formData.assigneeId] : [],
        dependencies: formData.dependencies || [],
        subtasks: subtasksPayload,
        description: formData.description,
      };

      const res = await interiorProjectService.createTask(projectId, payload);

      if (formData.milestoneId && res?.success && res?.data?._id) {
        const selectedMilestone = milestones.find((m) => m._id === formData.milestoneId);
        if (selectedMilestone) {
          const currentLinks = (selectedMilestone.linkedTasks || []).map((t: any) => (typeof t === 'string' ? t : t._id));
          await interiorProjectService.updateMilestone(projectId, selectedMilestone._id, {
            linkedTasks: [...currentLinks, res.data._id],
          });
        }
      }

      setIsTaskDialogOpen(false);
      setFormData({
        name: '',
        packageId: '',
        priority: 'medium',
        startDate: '',
        endDate: '',
        assigneeId: '',
        milestoneId: '',
        description: '',
        dependencies: [],
        initialSubtasks: [],
      });
      fetchData();
      toast.success('Task created successfully');
    } catch (err: any) {
      console.error('Create task failed', err);
      toast.error(err?.response?.data?.error || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus, progress: newStatus === 'completed' ? 100 : t.progress } : t))
      );
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask((prev: any) => ({
          ...prev,
          status: newStatus,
          progress: newStatus === 'completed' ? 100 : prev.progress,
        }));
      }
      await interiorProjectService.updateTask(projectId, taskId, { status: newStatus });
    } catch (err: any) {
      console.error('Failed to update status', err);
      toast.error(err?.response?.data?.error || 'Failed to update task status');
      fetchData();
    }
  };

  // Select Task Drawer
  const handleSelectTask = async (task: any) => {
    setSelectedTask(task);
    setIsEditingTask(false);
    setNewSubtaskTitle('');
    const depIds = (task.dependencies || []).map((d: any) => (typeof d === 'string' ? d : d._id));
    setEditTaskData({
      packageId: task.packageId?._id || (typeof task.packageId === 'string' ? task.packageId : '') || '',
      name: task.name || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      assigneeId: task.assignees?.[0]?._id || (typeof task.assignees?.[0] === 'string' ? task.assignees[0] : '') || '',
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
      progress: task.progress || 0,
      dependencies: depIds,
      subtasks: task.subtasks || [],
    });
    try {
      const res = await interiorProjectService.getTaskComments(projectId, task._id);
      setComments(res?.success && res?.data ? res.data : []);
    } catch (err) {
      console.warn('Failed to load comments', err);
      setComments([]);
    }
  };

  // Save Edited Task
  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: editTaskData.name,
        description: editTaskData.description,
        priority: editTaskData.priority,
        packageId: editTaskData.packageId || undefined,
        assignees: editTaskData.assigneeId ? [editTaskData.assigneeId] : [],
        startDate: editTaskData.startDate || undefined,
        endDate: editTaskData.endDate || undefined,
        progress: Number(editTaskData.progress) || 0,
        dependencies: editTaskData.dependencies || [],
        subtasks: editTaskData.subtasks || [],
      };

      const res = await interiorProjectService.updateTask(projectId, selectedTask._id, payload);
      if (res?.success && res?.data) {
        toast.success('Task updated successfully!');
        setSelectedTask(res.data);
        setIsEditingTask(false);
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to save edited task', err);
      toast.error(err?.response?.data?.error || 'Failed to update task');
    }
  };

  // Subtask Handlers
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTask) return;
    const currentSubtasks = selectedTask.subtasks || [];
    const updated = [...currentSubtasks, { title: newSubtaskTitle.trim(), completed: false }];
    try {
      const res = await interiorProjectService.updateTask(projectId, selectedTask._id, { subtasks: updated });
      if (res?.success && res?.data) {
        setSelectedTask(res.data);
        setNewSubtaskTitle('');
        setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? res.data : t)));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (subtaskIndex: number) => {
    if (!selectedTask) return;
    const currentSubtasks = [...(selectedTask.subtasks || [])];
    if (!currentSubtasks[subtaskIndex]) return;
    currentSubtasks[subtaskIndex] = {
      ...currentSubtasks[subtaskIndex],
      completed: !currentSubtasks[subtaskIndex].completed,
    };
    try {
      const res = await interiorProjectService.updateTask(projectId, selectedTask._id, { subtasks: currentSubtasks });
      if (res?.success && res?.data) {
        setSelectedTask(res.data);
        setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? res.data : t)));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskIndex: number) => {
    if (!selectedTask) return;
    const currentSubtasks = [...(selectedTask.subtasks || [])];
    currentSubtasks.splice(subtaskIndex, 1);
    try {
      const res = await interiorProjectService.updateTask(projectId, selectedTask._id, { subtasks: currentSubtasks });
      if (res?.success && res?.data) {
        setSelectedTask(res.data);
        setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? res.data : t)));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete subtask');
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    const ok = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This will remove all associated logs and comments.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await interiorProjectService.deleteTask(projectId, selectedTask._id);
      toast.success('Task deleted successfully!');
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete task', err);
      toast.error(err?.response?.data?.error || 'Failed to delete task');
    }
  };

  // Post Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setPostingComment(true);
      const res = await interiorProjectService.createTaskComment(projectId, selectedTask._id, { content: newComment });
      if (res?.success && res?.data) {
        setComments((prev) => [...prev, res.data]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Post comment failed', err);
    } finally {
      setPostingComment(false);
    }
  };

  // Filtered & Sorted Tasks computation
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = task.name?.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        const matchPkg = task.packageId?.name?.toLowerCase().includes(q) || task.packageId?.trade?.toLowerCase().includes(q);
        const matchAssignee = task.assignees?.some((a: any) =>
          `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase().includes(q)
        );
        if (!matchName && !matchDesc && !matchPkg && !matchAssignee) return false;
      }

      // Priority
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;

      // Status
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;

      // Package / Trade
      if (filterPackage !== 'all') {
        const pkgId = task.packageId?._id || task.packageId;
        const pkgTrade = task.packageId?.trade;
        if (pkgId !== filterPackage && pkgTrade !== filterPackage) return false;
      }

      // Assignee
      if (filterAssignee !== 'all') {
        const hasAssignee = task.assignees?.some((a: any) => (a._id || a) === filterAssignee);
        if (!hasAssignee) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'dueDate') {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'priority') {
        const weights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (weights[b.priority] || 0) - (weights[a.priority] || 0);
      }
      if (sortBy === 'progress') {
        return (b.progress || 0) - (a.progress || 0);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });
  }, [tasks, searchQuery, filterPriority, filterStatus, filterPackage, filterAssignee, sortBy]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const overdue = tasks.filter((t) => {
      if (t.status === 'completed' || !t.endDate) return false;
      const due = new Date(t.endDate);
      due.setHours(0, 0, 0, 0);
      return due < now;
    }).length;

    const blocked = tasks.filter((t) => {
      if (t.status === 'completed' || !t.dependencies || t.dependencies.length === 0) return false;
      return t.dependencies.some((d: any) => typeof d === 'object' && d.status !== 'completed');
    }).length;

    const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdue, blocked, overallProgress };
  }, [tasks]);

  // Tasks grouped by WBS Package for WBS Grouped View
  const tasksByPackage = useMemo(() => {
    const groups = new Map<string, { package: any; tasks: any[] }>();

    // Put defined packages first
    for (const pkg of wbsPackages) {
      groups.set(String(pkg.id || pkg._id), { package: pkg, tasks: [] });
    }

    const unassignedTasks: any[] = [];

    for (const task of filteredTasks) {
      const pkgId = String(task.packageId?._id || task.packageId || '');
      if (pkgId && groups.has(pkgId)) {
        groups.get(pkgId)!.tasks.push(task);
      } else {
        unassignedTasks.push(task);
      }
    }

    const result = Array.from(groups.values()).filter((g) => g.tasks.length > 0 || filterPackage === 'all');
    if (unassignedTasks.length > 0) {
      result.push({
        package: { id: 'unassigned', name: 'General / Unassigned Package', trade: 'general', fullPath: 'Unassigned Package' },
        tasks: unassignedTasks,
      });
    }

    return result;
  }, [filteredTasks, wbsPackages, filterPackage]);

  const toggleWbsGroup = (pkgId: string) => {
    setExpandedWbsGroups((prev) => ({
      ...prev,
      [pkgId]: prev[pkgId] === undefined ? false : !prev[pkgId],
    }));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 relative min-h-[85vh]">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Tasks & Execution Suite</h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
              {tasks.length} Total
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Enterprise WBS execution, subtask tracking, dependency blocking, and team coordination.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={() => setIsTaskDialogOpen(true)} className="shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Task
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Total Tasks</span>
            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[hsl(var(--foreground))]">{metrics.total}</span>
            <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{metrics.overallProgress}% Done</span>
          </div>
          <div className="mt-2 w-full h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${metrics.overallProgress}%` }} />
          </div>
        </Card>

        <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">In Progress</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">{metrics.inProgress}</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Active on site</span>
          </div>
        </Card>

        <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Completed</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{metrics.completed}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">{metrics.overallProgress}% achieved</span>
          </div>
        </Card>

        <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Blocked Tasks</span>
            <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">{metrics.blocked}</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Needs predecessor</span>
          </div>
        </Card>

        <Card className="p-4 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Overdue Slip</span>
            <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{metrics.overdue}</span>
            <span className="text-[10px] text-rose-600 font-medium">Past target date</span>
          </div>
        </Card>
      </div>

      {/* View Switcher & Filter Toolbar */}
      <div className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Modes */}
          <div className="flex items-center bg-[hsl(var(--muted))] p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                viewMode === 'kanban'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                viewMode === 'list'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <List className="w-3.5 h-3.5" /> Table List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('wbs_grouped')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                viewMode === 'wbs_grouped'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <FolderTree className="w-3.5 h-3.5" /> Group by WBS
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search tasks, trades, assignees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Second Row of Filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[hsl(var(--border))/0.6] text-xs">
          {/* Priority filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2 py-1 text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* WBS Package filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">WBS Package:</span>
            <select
              value={filterPackage}
              onChange={(e) => setFilterPackage(e.target.value)}
              className="px-2 py-1 text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none max-w-[180px] truncate"
            >
              <option value="all">All Packages</option>
              {wbsPackages.map((pkg) => (
                <option key={pkg.id || pkg._id} value={pkg.id || pkg._id}>
                  {pkg.name} ({pkg.trade})
                </option>
              ))}
            </select>
          </div>

          {/* Assignee filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">Assignee:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2 py-1 text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none max-w-[150px] truncate"
            >
              <option value="all">All Assignees</option>
              {projectMembers.map((m) => (
                <option key={m.userId?._id || m._id} value={m.userId?._id || m._id}>
                  {m.userId?.firstName || m.firstName} {m.userId?.lastName || m.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 ml-auto">
            <ArrowUpDown className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 text-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
            >
              <option value="dueDate">Due Date (Earliest)</option>
              <option value="priority">Priority (Highest)</option>
              <option value="progress">Progress %</option>
              <option value="name">Task Name (A-Z)</option>
            </select>
          </div>

          {(searchQuery || filterPriority !== 'all' || filterPackage !== 'all' || filterAssignee !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="h-6.5 text-[11px] px-2 text-[hsl(var(--muted-foreground))]"
              onClick={() => {
                setSearchQuery('');
                setFilterPriority('all');
                setFilterPackage('all');
                setFilterAssignee('all');
                setFilterStatus('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))]">
          <Layers className="w-12 h-12 text-[hsl(var(--muted-foreground))] opacity-25 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[hsl(var(--foreground))]">No tasks found</h3>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
            {searchQuery || filterPriority !== 'all' || filterPackage !== 'all'
              ? 'No tasks match the selected filters. Try clearing your search or filters.'
              : 'Get started by creating your first task in this project.'}
          </p>
          <Button className="mt-4" onClick={() => setIsTaskDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Task
          </Button>
        </div>
      ) : (
        <>
          {/* =========================================================================
              VIEW 1: KANBAN BOARD VIEW
             ========================================================================= */}
          {viewMode === 'kanban' && (
            <div className="space-y-4">
              {/* Tab column selector on mobile/tablet */}
              <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3 overflow-x-auto">
                {COLUMNS.map((col) => {
                  const colTasks = filteredTasks.filter((t) => t.status === col.id);
                  return (
                    <button
                      key={col.id}
                      onClick={() => setActiveTab(col.id)}
                      className={cn(
                        'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2',
                        activeTab === col.id
                          ? 'bg-[hsl(var(--primary))] text-white'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                      )}
                    >
                      {col.title}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          activeTab === col.id ? 'bg-white/20 text-white' : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'
                        )}
                      >
                        {colTasks.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Kanban Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTasks
                  .filter((t) => t.status === activeTab)
                  .map((task) => {
                    const priority = priorityConfig[task.priority] || priorityConfig.medium;
                    const assignee = task.assignees?.[0];
                    const unmetDeps = (task.dependencies || []).filter((d: any) => typeof d === 'object' && d.status !== 'completed');
                    const isBlocked = unmetDeps.length > 0 && task.status !== 'completed';
                    const totalSubtasks = task.subtasks?.length || 0;
                    const completedSubtasks = task.subtasks?.filter((s: any) => s.completed).length || 0;
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const isOverdue = task.endDate && new Date(task.endDate) < now && task.status !== 'completed';

                    return (
                      <motion.div
                        key={task._id}
                        layoutId={task._id}
                        className={cn(
                          'p-4.5 border rounded-xl bg-[hsl(var(--card))] shadow-xs cursor-pointer hover:border-[hsl(var(--primary)/0.4)] hover:shadow-md transition-all space-y-3 group relative',
                          isBlocked ? 'border-amber-300 dark:border-amber-900/60' : 'border-[hsl(var(--border))]'
                        )}
                        onClick={() => handleSelectTask(task)}
                      >
                        {/* Top Meta: Priority & Trade Tag */}
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn('px-2 py-0.5 text-[10px] font-bold rounded-md uppercase', priority.color)}>
                            {priority.label}
                          </span>
                          <span className="text-[10px] font-mono font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md truncate max-w-[130px]">
                            {task.packageId?.name ? `${task.packageId.name} (${task.packageId.trade})` : 'Unassigned WBS'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] line-clamp-2 leading-snug group-hover:text-[hsl(var(--primary))] transition-colors">
                          {task.name}
                        </h4>

                        {/* Badges: Blocked & Subtasks */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isBlocked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Blocked ({unmetDeps.length})
                            </span>
                          )}
                          {totalSubtasks > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                              <CheckSquare className="w-3 h-3" />
                              {completedSubtasks}/{totalSubtasks} Subtasks
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 pt-0.5">
                          <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))] font-medium">
                            <span>Progress</span>
                            <span className="font-bold text-[hsl(var(--foreground))]">{task.progress || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full transition-all duration-300',
                                task.progress === 100 ? 'bg-emerald-500' : 'bg-[hsl(var(--primary))]'
                              )}
                              style={{ width: `${task.progress || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Card Footer: Dates & Assignee */}
                        <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                          <span className={cn('flex items-center gap-1 text-[11px] font-medium', isOverdue && 'text-rose-600 font-semibold')}>
                            <Calendar className="w-3.5 h-3.5" />
                            {task.endDate
                              ? new Date(task.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                              : 'No date'}
                            {isOverdue && ' (Overdue)'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {assignee ? (
                              <div
                                title={`${assignee.firstName || ''} ${assignee.lastName || ''}`}
                                className="w-6 h-6 rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center font-bold text-[10px] ring-2 ring-[hsl(var(--background))]"
                              >
                                {assignee.firstName?.[0] || 'U'}
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))] ring-2 ring-[hsl(var(--background))]">
                                <User className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>

              {filteredTasks.filter((t) => t.status === activeTab).length === 0 && (
                <div className="text-center py-14">
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">No tasks in "{COLUMNS.find((c) => c.id === activeTab)?.title}"</p>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              VIEW 2: SPREADSHEET TABLE LIST VIEW
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
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4">Subtasks</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {filteredTasks.map((task) => {
                      const priority = priorityConfig[task.priority] || priorityConfig.medium;
                      const assignee = task.assignees?.[0];
                      const unmetDeps = (task.dependencies || []).filter((d: any) => typeof d === 'object' && d.status !== 'completed');
                      const isBlocked = unmetDeps.length > 0 && task.status !== 'completed';
                      const totalSubtasks = task.subtasks?.length || 0;
                      const completedSubtasks = task.subtasks?.filter((s: any) => s.completed).length || 0;
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const isOverdue = task.endDate && new Date(task.endDate) < now && task.status !== 'completed';

                      return (
                        <tr
                          key={task._id}
                          className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors cursor-pointer"
                          onClick={() => handleSelectTask(task)}
                        >
                          <td className="py-3 px-4 font-semibold text-[hsl(var(--foreground))] max-w-xs">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{task.name}</span>
                              {isBlocked && (
                                <span title="Blocked by uncompleted predecessor" className="shrink-0 text-amber-600">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                            <span className="px-2 py-0.5 rounded bg-[hsl(var(--muted))]">
                              {task.packageId?.name ? `${task.packageId.name} (${task.packageId.trade})` : 'Unassigned'}
                            </span>
                          </td>

                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                              className="px-2 py-1 text-[11px] font-semibold rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] focus:outline-none capitalize cursor-pointer"
                            >
                              <option value="backlog">Backlog</option>
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="in_review">In Review</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>

                          <td className="py-3 px-4">
                            <span className={cn('px-2 py-0.5 text-[10px] font-bold rounded-md uppercase', priority.color)}>
                              {priority.label}
                            </span>
                          </td>

                          <td className="py-3 px-4 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full', task.progress === 100 ? 'bg-emerald-500' : 'bg-[hsl(var(--primary))]')}
                                  style={{ width: `${task.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold">{task.progress || 0}%</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[11px] text-[hsl(var(--muted-foreground))]">
                            {totalSubtasks > 0 ? `${completedSubtasks}/${totalSubtasks}` : '—'}
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => handleSelectTask(task)}
                            >
                              Details
                            </Button>
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
              VIEW 3: GROUPED BY WBS PACKAGE ACCORDIONS
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
                            <span className="text-[10px] font-mono uppercase bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded">
                              {group.package.trade}
                            </span>
                          </h4>
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{group.package.fullPath || group.package.name}</p>
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
                          <p className="text-xs text-[hsl(var(--muted-foreground))] italic col-span-full py-2">
                            No tasks in this package. Click "Add Task" to schedule work here.
                          </p>
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
                              <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border))/0.6]">
                                <span>{task.progress || 0}% progress</span>
                                <span>{task.endDate ? new Date(task.endDate).toLocaleDateString('en-IN') : 'No date'}</span>
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
          ADD TASK MODAL (With Inline Package Quick-Creator)
         ========================================================================= */}
      <AnimatePresence>
        {isTaskDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Add Task to WBS Package</h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Schedule actionable site work and link dependencies</p>
                </div>
                <button onClick={() => setIsTaskDialogOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask}>
                <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                  {/* WBS Package Selector & Inline Creator */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                        WBS Target Package *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowInlinePackageForm(!showInlinePackageForm)}
                        className="text-[11px] font-semibold text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {showInlinePackageForm ? 'Cancel New Package' : 'New Package'}
                      </button>
                    </div>

                    {showInlinePackageForm ? (
                      <div className="p-3 rounded-lg border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.04)] space-y-2.5">
                        <p className="text-xs font-bold text-[hsl(var(--foreground))]">Quick Create WBS Package</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Package Name (e.g. Electrical)"
                            className="text-xs h-8"
                            value={inlinePackageData.name}
                            onChange={(e) => setInlinePackageData({ ...inlinePackageData, name: e.target.value })}
                          />
                          <select
                            className="px-2 py-1 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                            value={inlinePackageData.trade}
                            onChange={(e) => setInlinePackageData({ ...inlinePackageData, trade: e.target.value })}
                          >
                            <option value="interior">Interior</option>
                            <option value="civil">Civil</option>
                            <option value="electrical">Electrical</option>
                            <option value="mep">MEP</option>
                            <option value="hvac">HVAC</option>
                            <option value="phe">PHE</option>
                            <option value="fire_fighting">Fire Fighting</option>
                            <option value="elv">ELV</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={creatingWbsPackage || !inlinePackageData.name.trim()}
                          onClick={handleCreateInlinePackage}
                          className="h-7 text-xs w-full"
                        >
                          {creatingWbsPackage && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                          Save & Select Package
                        </Button>
                      </div>
                    ) : wbsPackages.length === 0 ? (
                      <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/50 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-amber-900 dark:text-amber-300">No WBS Packages found</p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-400">
                              Tasks must belong to a WBS Trade Package. Use the quick starter button below.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="text-xs h-7.5 bg-amber-600 hover:bg-amber-700 text-white"
                          disabled={creatingWbsPackage}
                          onClick={handleQuickCreateDefaultWbs}
                        >
                          {creatingWbsPackage ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          Quick-Create Starter Package
                        </Button>
                      </div>
                    ) : (
                      <select
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                        value={formData.packageId}
                        onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                      >
                        <option value="">Select Package...</option>
                        {wbsPackages.map((pkg) => (
                          <option key={pkg.id || pkg._id} value={pkg.id || pkg._id}>
                            {pkg.fullPath || pkg.name} ({pkg.trade})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Task Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Task Name *</label>
                    <Input
                      required
                      placeholder="e.g. Core Wall False Ceiling Framing"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Priority & Assignee */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Priority</label>
                      <select
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Assignee</label>
                      <select
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={formData.assigneeId}
                        onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {projectMembers.map((m) => (
                          <option key={m.userId?._id || m._id} value={m.userId?._id || m._id}>
                            {m.userId?.firstName || m.firstName} {m.userId?.lastName || m.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Start Date</label>
                      <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Target End Date</label>
                      <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                    </div>
                  </div>

                  {/* Milestone linking */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Assign to Milestone (Optional)</label>
                    <select
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                      value={formData.milestoneId}
                      onChange={(e) => setFormData({ ...formData, milestoneId: e.target.value })}
                    >
                      <option value="">No Milestone (Unscheduled)</option>
                      {milestones.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Initial Subtasks list */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                      Subtasks Checklist (Optional)
                    </label>
                    {formData.initialSubtasks.length > 0 && (
                      <div className="space-y-1">
                        {formData.initialSubtasks.map((st, idx) => (
                          <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 bg-[hsl(var(--muted)/0.4)] rounded-md text-xs">
                            <span>{st}</span>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, initialSubtasks: formData.initialSubtasks.filter((_, i) => i !== idx) })}
                              className="text-[hsl(var(--muted-foreground))] hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add subtask (e.g. Channel Alignment, Board Fixing)..."
                        className="text-xs h-8"
                        value={newInitialSubtask}
                        onChange={(e) => setNewInitialSubtask(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newInitialSubtask.trim()) {
                              setFormData({ ...formData, initialSubtasks: [...formData.initialSubtasks, newInitialSubtask.trim()] });
                              setNewInitialSubtask('');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs shrink-0"
                        onClick={() => {
                          if (newInitialSubtask.trim()) {
                            setFormData({ ...formData, initialSubtasks: [...formData.initialSubtasks, newInitialSubtask.trim()] });
                            setNewInitialSubtask('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Dependencies Selection */}
                  {tasks.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                        Predecessor Dependencies (Must finish first)
                      </label>
                      <div className="border border-[hsl(var(--border))] rounded-lg max-h-28 overflow-y-auto divide-y divide-[hsl(var(--border))] bg-[hsl(var(--background))]">
                        {tasks.map((t) => (
                          <label key={t._id} className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-[hsl(var(--muted)/0.5)]">
                            <input
                              type="checkbox"
                              className="rounded text-[hsl(var(--primary))]"
                              checked={formData.dependencies.includes(t._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, dependencies: [...formData.dependencies, t._id] });
                                } else {
                                  setFormData({ ...formData, dependencies: formData.dependencies.filter((id) => id !== t._id) });
                                }
                              }}
                            />
                            <span className="truncate flex-1 font-medium">{t.name}</span>
                            <span className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase font-mono">{t.status}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Description</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                      placeholder="Specify task instructions or technical criteria..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsTaskDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingTask}>
                    {creatingTask && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Create Task
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          TASK DETAIL & EXECUTION DRAWER
         ========================================================================= */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-[2px]">
            <div className="flex-1" onClick={() => setSelectedTask(null)} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-xl bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] shadow-2xl h-full flex flex-col"
            >
              {isEditingTask ? (
                /* Edit Mode */
                <form onSubmit={handleSaveEditedTask} className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="p-6 border-b border-[hsl(var(--border))] flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block mb-1">Task Name</label>
                      <Input
                        required
                        className="text-sm font-bold w-full"
                        value={editTaskData.name}
                        onChange={(e) => setEditTaskData({ ...editTaskData, name: e.target.value })}
                      />
                    </div>
                    <button type="button" onClick={() => setIsEditingTask(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">WBS Package</label>
                      <select
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={editTaskData.packageId}
                        onChange={(e) => setEditTaskData({ ...editTaskData, packageId: e.target.value })}
                      >
                        <option value="">Select Package...</option>
                        {wbsPackages.map((pkg) => (
                          <option key={pkg.id || pkg._id} value={pkg.id || pkg._id}>
                            {pkg.fullPath || pkg.name} ({pkg.trade})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Description</label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                        value={editTaskData.description}
                        onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Priority</label>
                        <select
                          className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                          value={editTaskData.priority}
                          onChange={(e) => setEditTaskData({ ...editTaskData, priority: e.target.value })}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Progress (%)</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-9 text-xs"
                          value={editTaskData.progress}
                          onChange={(e) => setEditTaskData({ ...editTaskData, progress: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Assignee</label>
                      <select
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={editTaskData.assigneeId}
                        onChange={(e) => setEditTaskData({ ...editTaskData, assigneeId: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {projectMembers.map((m) => (
                          <option key={m.userId?._id || m._id} value={m.userId?._id || m._id}>
                            {m.userId?.firstName || m.firstName} {m.userId?.lastName || m.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Start Date</label>
                        <Input
                          type="date"
                          className="h-9 text-xs"
                          value={editTaskData.startDate}
                          onChange={(e) => setEditTaskData({ ...editTaskData, startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">End Date</label>
                        <Input
                          type="date"
                          className="h-9 text-xs"
                          value={editTaskData.endDate}
                          onChange={(e) => setEditTaskData({ ...editTaskData, endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Predecessors checkboxes */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-[hsl(var(--primary))]" />
                        Predecessor Dependencies
                      </label>
                      <div className="border border-[hsl(var(--border))] rounded-lg max-h-32 overflow-y-auto divide-y divide-[hsl(var(--border))] bg-[hsl(var(--background))]">
                        {tasks
                          .filter((t) => t._id !== selectedTask._id)
                          .map((t) => (
                            <label key={t._id} className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-[hsl(var(--muted)/0.5)]">
                              <input
                                type="checkbox"
                                className="rounded text-[hsl(var(--primary))]"
                                checked={editTaskData.dependencies.includes(t._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditTaskData({ ...editTaskData, dependencies: [...editTaskData.dependencies, t._id] });
                                  } else {
                                    setEditTaskData({
                                      ...editTaskData,
                                      dependencies: editTaskData.dependencies.filter((id) => id !== t._id),
                                    });
                                  }
                                }}
                              />
                              <span className="truncate flex-1 font-medium">{t.name}</span>
                              <span className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase font-mono">{t.status}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.1)] flex items-center justify-between shrink-0">
                    <Button variant="outline" type="button" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleDeleteTask}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Task
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" type="button" onClick={() => setIsEditingTask(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </div>
                </form>
              ) : (
                /* View & Execute Mode */
                <>
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
                      <Button variant="outline" size="sm" className="h-8 py-1 px-2.5 text-xs" onClick={() => setIsEditingTask(true)}>
                        <Edit className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 py-1 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                        onClick={handleDeleteTask}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <button onClick={() => setSelectedTask(null)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Status switcher */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Task Status</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {COLUMNS.map((col) => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => handleUpdateTaskStatus(selectedTask._id, col.id)}
                            className={cn(
                              'px-2 py-1.5 text-[11px] font-bold border rounded-lg transition-colors',
                              selectedTask.status === col.id
                                ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                            )}
                          >
                            {col.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="grid grid-cols-2 gap-3.5 border border-[hsl(var(--border))] p-4 rounded-xl bg-[hsl(var(--card))]">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Priority</span>
                        <p className="text-xs font-semibold capitalize text-[hsl(var(--foreground))]">{selectedTask.priority}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Progress</span>
                        <p className="text-xs font-bold text-[hsl(var(--foreground))]">{selectedTask.progress || 0}%</p>
                      </div>
                      <div className="space-y-1 col-span-2 flex items-center gap-2 border-t border-[hsl(var(--border))/0.6] pt-3">
                        <CalendarDays className="w-4 h-4 text-[hsl(var(--primary))]" />
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                          {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start Unset'} —{' '}
                          {selectedTask.endDate ? new Date(selectedTask.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End Unset'}
                        </span>
                      </div>
                    </div>

                    {/* Subtasks Checklist */}
                    <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-[hsl(var(--primary))]" />
                          Subtasks ({(selectedTask.subtasks || []).filter((s: any) => s.completed).length}/{(selectedTask.subtasks || []).length})
                        </h4>
                        <span className="text-[11px] font-bold text-[hsl(var(--primary))]">
                          {selectedTask.subtasks?.length
                            ? `${Math.round(((selectedTask.subtasks.filter((s: any) => s.completed).length) / selectedTask.subtasks.length) * 100)}% Done`
                            : ''}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {(selectedTask.subtasks || []).map((subtask: any, idx: number) => (
                          <div
                            key={subtask._id || idx}
                            className={cn(
                              'flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors',
                              subtask.completed
                                ? 'bg-emerald-50/40 border-emerald-200/60 dark:bg-emerald-950/10 dark:border-emerald-900/30'
                                : 'bg-[hsl(var(--card))] border-[hsl(var(--border))]'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleSubtask(idx)}
                              className="flex items-center gap-2 text-left flex-1 min-w-0"
                            >
                              {subtask.completed ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                              )}
                              <span className={cn('truncate', subtask.completed && 'line-through text-[hsl(var(--muted-foreground))]')}>
                                {subtask.title}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtask(idx)}
                              className="p-1 text-[hsl(var(--muted-foreground))] hover:text-red-500 ml-2"
                              title="Delete Subtask"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1">
                        <Input
                          placeholder="Add subtask (e.g. Grouting, Surface Prep)..."
                          className="text-xs h-8"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        />
                        <Button type="submit" size="sm" className="h-8 text-xs shrink-0">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      </form>
                    </div>

                    {/* Predecessors / Dependencies */}
                    {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
                        <h4 className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                          <Link2 className="w-4 h-4 text-[hsl(var(--primary))]" />
                          Predecessor Task Dependencies
                        </h4>
                        <div className="space-y-1.5">
                          {selectedTask.dependencies.map((dep: any) => {
                            const isDepDone = typeof dep === 'object' && dep.status === 'completed';
                            return (
                              <div
                                key={dep._id || dep}
                                className={cn(
                                  'flex items-center justify-between px-3 py-2 rounded-lg border text-xs',
                                  isDepDone
                                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                                    : 'bg-amber-50/50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                                )}
                              >
                                <span className="font-medium truncate">{dep.name || 'Dependency Task'}</span>
                                <span className="text-[10px] uppercase font-bold flex items-center gap-1">
                                  {isDepDone ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Finished
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Pending ({dep.status || 'todo'})
                                    </>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="space-y-1.5 pt-2 border-t border-[hsl(var(--border))]">
                      <h4 className="text-xs font-bold text-[hsl(var(--foreground))]">Description</h4>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                        {selectedTask.description || 'No detailed instructions provided.'}
                      </p>
                    </div>

                    {/* Task Discussions */}
                    <div className="space-y-4 pt-4 border-t border-[hsl(var(--border))]">
                      <h4 className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1">
                        <MessageSquare className="w-4 h-4 text-[hsl(var(--primary))]" />
                        Team Coordination Discussions ({comments.length})
                      </h4>

                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                        {comments.length === 0 ? (
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic text-center py-4">
                            No updates posted on this task yet. Type below to align your team.
                          </p>
                        ) : (
                          comments.map((comment) => (
                            <div key={comment._id} className="p-3 border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] rounded-lg space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                                  {comment.userId?.firstName} {comment.userId?.lastName}
                                </span>
                                <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                                  {new Date(comment.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-[hsl(var(--muted-foreground))]">{comment.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form onSubmit={handlePostComment} className="flex gap-2">
                        <Input
                          placeholder="Post execution update or ask question..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <Button type="submit" disabled={postingComment}>
                          {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                        </Button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
