'use client';

// =============================================================================
// InteriorOS — Tasks & Execution View (Global Standard 3-Stage Suite)
// Stages:
// - To Do (todo) -> In Progress (in_progress) -> Completed (completed)
// Features:
// - Proof of Work Modal upon task completion (Photo uploads + Handover Notes)
// - Proof of Work Verification Badge & Photo Lightbox in Task Drawer
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
  FolderTree,
  Eye,
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
  const [viewMode, setViewMode] = useState<'list' | 'wbs_grouped'>('list');
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
  const [editNewSubtaskTitle, setEditNewSubtaskTitle] = useState('');
  const [creatingWbsPackage, setCreatingWbsPackage] = useState(false);

  // Proof of Work Modal State
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofTask, setProofTask] = useState<any>(null);
  const [proofImages, setProofImages] = useState<Array<{ url: string; name: string; size?: number }>>([]);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [imageLightboxUrl, setImageLightboxUrl] = useState<string | null>(null);

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
    status: string;
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
    status: 'todo',
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
        status: 'todo',
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
      toast.success('Task created successfully in "To Do"');
    } catch (err: any) {
      console.error('Create task failed', err);
      toast.error(err?.response?.data?.error || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  // Initiate Proof of Work Modal for Task Completion
  const initiateCompleteTask = (task: any) => {
    setProofTask(task);
    setProofImages(task.completionProof?.images || []);
    setIsProofModalOpen(true);
  };

  // Submit Proof of Work and Mark Completed
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofTask) return;
    try {
      setSubmittingProof(true);
      const subtasksChecked = (proofTask.subtasks || []).map((s: any) => ({ ...s, completed: true }));
      const payload = {
        status: 'completed',
        progress: 100,
        subtasks: subtasksChecked,
        completionProof: {
          images: proofImages,
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
        toast.success('Task marked as Completed with Proof of Work verified!');
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
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, WebP)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size exceeds 10MB limit');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const result = event.target?.result;
        if (result && typeof result === 'string') {
          setProofImages((prev) => [
            ...prev,
            {
              url: result,
              name: file.name,
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveProofImage = (index: number) => {
    setProofImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    const normalized = normalizeTaskStatus(newStatus);
    const targetTask = tasks.find((t) => t._id === taskId) || (selectedTask?._id === taskId ? selectedTask : null);

    // If moving to completed, open Proof of Work modal!
    if (normalized === 'completed') {
      if (targetTask) {
        initiateCompleteTask(targetTask);
        return;
      }
    }

    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: normalized } : t))
      );
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask((prev: any) => ({
          ...prev,
          status: normalized,
        }));
      }
      await interiorProjectService.updateTask(projectId, taskId, { status: normalized });
      toast.success(`Task moved to "${COLUMNS.find((c) => c.id === normalized)?.title || normalized}"`);
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
      status: normalizeTaskStatus(task.status),
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

  // Add/Remove Subtasks in Edit Form
  const handleAddEditSubtask = () => {
    if (!editNewSubtaskTitle.trim()) return;
    const newSubtask = {
      title: editNewSubtaskTitle.trim(),
      completed: false,
    };
    setEditTaskData((prev) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), newSubtask],
    }));
    setEditNewSubtaskTitle('');
  };

  const handleRemoveEditSubtask = (index: number) => {
    setEditTaskData((prev) => {
      const updated = [...(prev.subtasks || [])];
      updated.splice(index, 1);
      return {
        ...prev,
        subtasks: updated,
      };
    });
  };

  // Save Edited Task
  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subtasks = editTaskData.subtasks || [];
      let calculatedProgress = Number(editTaskData.progress) || 0;
      let newStatus = editTaskData.status;

      if (subtasks.length > 0) {
        const completedCount = subtasks.filter((s: any) => s.completed).length;
        calculatedProgress = Math.round((completedCount / subtasks.length) * 100);
        if (calculatedProgress > 0 && calculatedProgress < 100) {
          newStatus = 'in_progress';
        } else if (calculatedProgress === 0 && newStatus === 'in_progress') {
          newStatus = 'todo';
        }
      }

      const payload: any = {
        name: editTaskData.name,
        description: editTaskData.description,
        priority: editTaskData.priority,
        status: newStatus,
        packageId: editTaskData.packageId || undefined,
        assignees: editTaskData.assigneeId ? [editTaskData.assigneeId] : [],
        startDate: editTaskData.startDate || undefined,
        endDate: editTaskData.endDate || undefined,
        progress: calculatedProgress,
        dependencies: editTaskData.dependencies || [],
        subtasks: subtasks,
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

  // Subtask Handlers with Auto-Progress Calculation
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTask) return;
    const currentSubtasks = selectedTask.subtasks || [];
    const updated = [...currentSubtasks, { title: newSubtaskTitle.trim(), completed: false }];
    const completedCount = updated.filter((s: any) => s.completed).length;
    const calculatedProgress = Math.round((completedCount / updated.length) * 100);

    try {
      const res = await interiorProjectService.updateTask(projectId, selectedTask._id, {
        subtasks: updated,
        progress: calculatedProgress,
      });
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

    const willBeCompleted = !currentSubtasks[subtaskIndex].completed;
    currentSubtasks[subtaskIndex] = {
      ...currentSubtasks[subtaskIndex],
      completed: willBeCompleted,
    };

    const completedCount = currentSubtasks.filter((s: any) => s.completed).length;
    const calculatedProgress = Math.round((completedCount / currentSubtasks.length) * 100);

    // If all subtasks are now completed, prompt for proof of work
    if (calculatedProgress === 100 && selectedTask.status !== 'completed') {
      initiateCompleteTask({ ...selectedTask, subtasks: currentSubtasks });
      return;
    }

    // Auto status transition:
    // > 0% and < 100% -> 'in_progress'
    // 0% -> 'todo' (if it was in_progress)
    let newStatus = selectedTask.status;
    if (calculatedProgress > 0 && calculatedProgress < 100) {
      newStatus = 'in_progress';
    } else if (calculatedProgress === 0 && selectedTask.status === 'in_progress') {
      newStatus = 'todo';
    }

    try {
      const res = await interiorProjectService.updateTask(projectId, selectedTask._id, {
        subtasks: currentSubtasks,
        progress: calculatedProgress,
        status: newStatus,
      });
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
    const completedCount = currentSubtasks.filter((s: any) => s.completed).length;
    const calculatedProgress = currentSubtasks.length > 0 ? Math.round((completedCount / currentSubtasks.length) * 100) : selectedTask.progress;

    let newStatus = selectedTask.status;
    if (calculatedProgress > 0 && calculatedProgress < 100) {
      newStatus = 'in_progress';
    } else if (calculatedProgress === 0 && selectedTask.status === 'in_progress') {
      newStatus = 'todo';
    }

    try {
      const res = await interiorProjectService.updateTask(projectId, selectedTask._id, {
        subtasks: currentSubtasks,
        progress: calculatedProgress,
        status: newStatus,
      });
      if (res?.success && res?.data) {
        setSelectedTask(res.data);
        setTasks((prev) => prev.map((t) => (t._id === selectedTask._id ? res.data : t)));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete subtask');
    }
  };

  // Open Edit Mode for Task
  const handleOpenEditTask = (task: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleSelectTask(task);
    setIsEditingTask(true);
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

  // Task Comments
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

      // Status filter
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;

      // Package filter
      if (filterPackage !== 'all') {
        const pkgId = task.packageId?._id || task.packageId;
        if (String(pkgId) !== filterPackage) return false;
      }

      // Assignee filter
      if (filterAssignee !== 'all') {
        const hasAssignee = task.assignees?.some((a: any) => String(a._id || a) === filterAssignee);
        if (!hasAssignee) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      }
      if (sortBy === 'priority') {
        const weight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (weight[b.priority] || 0) - (weight[a.priority] || 0);
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
    const todo = tasks.filter((t) => t.status === 'todo').length;
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

    return { total, completed, inProgress, todo, overdue, blocked, overallProgress };
  }, [tasks]);

  // Tasks grouped by WBS Package for WBS Grouped View
  const tasksByPackage = useMemo(() => {
    const groups = new Map<string, { package: any; tasks: any[] }>();

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
            <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Tasks Management</h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
              {tasks.length} Total
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Actionable site execution, subtask tracking and verified proof-of-work completion.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={() => setIsTaskDialogOpen(true)} className="shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Task
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
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-2xs col-span-2 sm:col-span-1">
          <div className="space-y-0.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Overdue</span>
            <div className="text-base font-bold text-rose-600 leading-none">{metrics.overdue + metrics.blocked}</div>
          </div>
          <AlertTriangle className="w-4 h-4 text-rose-500" />
        </div>
      </div>

      {/* Control Bar: View Switcher, Search, and Multi-Level Filters */}
      <div className="border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer',
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> Table List
            </button>
            <button
              onClick={() => setViewMode('wbs_grouped')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer',
                viewMode === 'wbs_grouped'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-600" /> Group by WBS
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search tasks, assignees..."
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
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* Status filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-500">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-800 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-slate-500">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-800 focus:outline-none"
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
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4">Proof of Work</th>
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

                          <td className="py-3 px-4 min-w-[110px]">
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
                            <div className="flex items-center justify-end gap-1">
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
                                title="Edit Task"
                                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer shadow-2xs"
                                onClick={(e) => handleOpenEditTask(task, e)}
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
                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>{task.progress || 0}% progress</span>
                                <span>{task.endDate ? new Date(task.endDate).toLocaleDateString('en-IN') : 'No date'}</span>
                              </div>

                              <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
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
                                  title="Edit Task"
                                  onClick={(e) => handleOpenEditTask(task, e)}
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
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Schedule actionable site work in "To Do" pipeline</p>
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
                      <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/70 space-y-2.5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-blue-950">No WBS Packages found</p>
                            <p className="text-[11px] text-blue-900">
                              Tasks must belong to a WBS Trade Package. Click below to initialize.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={creatingWbsPackage}
                          onClick={handleQuickCreateDefaultWbs}
                          className="w-full text-xs h-7.5"
                        >
                          {creatingWbsPackage && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          Initialize Starter Package
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

                  {/* Milestone Linkage */}
                  {milestones.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Link to Project Milestone (Optional)</label>
                      <select
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                        value={formData.milestoneId}
                        onChange={(e) => setFormData({ ...formData, milestoneId: e.target.value })}
                      >
                        <option value="">No Milestone (General Track)</option>
                        {milestones.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name} ({m.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
                        <option value="">Select Assignee...</option>
                        {projectMembers.map((m) => (
                          <option key={m.userId?._id || m._id} value={m.userId?._id || m._id}>
                            {m.userId?.firstName || m.firstName} {m.userId?.lastName || m.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Start & End Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Start Date</label>
                      <Input
                        type="date"
                        className="h-9 text-xs"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">End Date</label>
                      <Input
                        type="date"
                        className="h-9 text-xs"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Initial Subtasks Builder */}
                  <div className="space-y-2 pt-1 border-t border-[hsl(var(--border))]">
                    <label className="text-xs font-semibold flex items-center justify-between">
                      <span>Execution Subtasks Checklist</span>
                      <span className="text-[11px] font-normal text-[hsl(var(--muted-foreground))]">
                        {formData.initialSubtasks.length} added
                      </span>
                    </label>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Add subtask (e.g. Surface alignment)..."
                        className="h-8 text-xs"
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
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>

                    {formData.initialSubtasks.length > 0 && (
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {formData.initialSubtasks.map((st, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-[hsl(var(--muted)/0.4)] text-xs">
                            <span className="truncate flex-1">{st}</span>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, initialSubtasks: formData.initialSubtasks.filter((_, i) => i !== idx) })}
                              className="text-[hsl(var(--muted-foreground))] hover:text-red-500 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
                        {proofTask.packageId?.name ? `${proofTask.packageId.name} (${proofTask.packageId.trade})` : 'WBS Package'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                      Will Set 100% Progress
                    </span>
                  </div>

                  {/* Photo Upload Dropzone */}
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
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Upload clear before/after proof of installation</p>
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
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
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

                  {/* Auto-check subtasks notice */}
                  {proofTask.subtasks?.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>All {proofTask.subtasks.length} subtasks will be marked as completed.</span>
                    </div>
                  )}
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
          TASK DETAIL & EXECUTION CENTER MODAL
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
                        <label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Status (Auto-Managed)</label>
                        <div className="h-9 px-3 py-2 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--foreground))] font-semibold capitalize flex items-center gap-2">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              editTaskData.status === 'completed' ? 'bg-emerald-500' : editTaskData.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'
                            )}
                          />
                          {editTaskData.status.replace('_', ' ')}
                        </div>
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
                    {/* Subtasks Section in Edit Form */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 text-blue-600" />
                          Subtasks Checklist ({editTaskData.subtasks?.length || 0})
                        </label>
                      </div>

                      {/* Add Subtask input */}
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Add a new subtask..."
                          className="h-8.5 text-xs flex-1"
                          value={editNewSubtaskTitle}
                          onChange={(e) => setEditNewSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddEditSubtask();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8.5 text-xs px-3 text-blue-600 border-blue-200 hover:bg-blue-50 cursor-pointer"
                          onClick={handleAddEditSubtask}
                          disabled={!editNewSubtaskTitle.trim()}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Add Subtask
                        </Button>
                      </div>

                      {/* Existing Subtasks List */}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {(editTaskData.subtasks || []).map((subtask: any, idx: number) => (
                          <div
                            key={subtask._id || idx}
                            className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                          >
                            <span className={cn('truncate font-medium flex-1 pr-2', subtask.completed && 'line-through text-slate-400')}>
                              {subtask.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditSubtask(idx)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Remove subtask"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {(!editTaskData.subtasks || editTaskData.subtasks.length === 0) && (
                          <p className="text-[11px] text-slate-400 italic py-1">No subtasks yet. Add subtasks above.</p>
                        )}
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
                              ? '• Subtasks in progress'
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
                      </div>
                    )}

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

                    {/* Subtasks Checklist with Auto Progress Calculation */}
                    <div className="space-y-3 pt-2 border-t border-[hsl(var(--border))]">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-[hsl(var(--primary))]" />
                          Subtasks Checklist ({(selectedTask.subtasks || []).filter((s: any) => s.completed).length}/{(selectedTask.subtasks || []).length})
                        </h4>
                        <span className="text-[11px] font-bold text-[hsl(var(--primary))]">
                          {selectedTask.subtasks?.length
                            ? `${Math.round(((selectedTask.subtasks.filter((s: any) => s.completed).length) / selectedTask.subtasks.length) * 100)}% Complete`
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
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : 'bg-white border-slate-200 text-slate-800'
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
                    </div>

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
