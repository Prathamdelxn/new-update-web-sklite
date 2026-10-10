'use client';

// =============================================================================
// InteriorOS — Work Breakdown Structure (WBS) & Activity Execution
// =============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Calendar,
  CheckCircle2,
  Square,
  User,
  FileSpreadsheet,
  CheckSquare,
  Milestone as MilestoneIcon,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';

interface InteriorWbsViewProps {
  projectId: string;
}

interface InitialActivityItem {
  id: string;
  name: string;
  priority: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  isMilestone?: boolean;
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-slate-600 bg-slate-100 border-slate-200' },
  medium: { label: 'Medium', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  high: { label: 'High', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  critical: { label: 'Critical', color: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export default function InteriorWbsView({ projectId }: InteriorWbsViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [wbsData, setWbsData] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  // WBS Node Modal State (Strictly matches user screenshot)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentNodeId, setCurrentNodeId] = useState('');

  // Form Fields
  const [nodeName, setNodeName] = useState('');
  const [nodeDescription, setNodeDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [submitting, setSubmitting] = useState(false);

  // Initial activities inside Create WBS Modal
  const [initialActivities, setInitialActivities] = useState<InitialActivityItem[]>([]);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityPriority, setNewActivityPriority] = useState('medium');
  const [newActivityAssignee, setNewActivityAssignee] = useState('');
  const [newActivityIsMilestone, setNewActivityIsMilestone] = useState(false);
  const [showActivitySection, setShowActivitySection] = useState(false);

  // Activity / Task Modal State (When clicking "+ Activity" or "Edit" on an activity)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityModalMode, setActivityModalMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState('');
  const [selectedNodeForActivity, setSelectedNodeForActivity] = useState<{ id: string; name: string } | null>(null);
  const [activityName, setActivityName] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityPriority, setActivityPriority] = useState('medium');
  const [activityStatus, setActivityStatus] = useState('todo');
  const [activityStartDate, setActivityStartDate] = useState('');
  const [activityEndDate, setActivityEndDate] = useState('');
  const [activityAssigneeId, setActivityAssigneeId] = useState('');
  const [activityIsMilestone, setActivityIsMilestone] = useState(false);
  const [submittingActivity, setSubmittingActivity] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wbsRes, tasksRes, membersRes] = await Promise.all([
        interiorProjectService.getWbs(projectId).catch(() => ({ data: [] })),
        interiorProjectService.getTasks(projectId).catch(() => ({ data: [] })),
        interiorProjectService.getProjectMembers(projectId).catch(() => ({ data: [] })),
      ]);

      const rawWbs = wbsRes?.success && wbsRes?.data ? wbsRes.data : wbsRes?.data || [];
      setWbsData(rawWbs);
      setTasks(tasksRes?.success && tasksRes?.data ? tasksRes.data : tasksRes?.data || []);

      // Auto-expand all nodes by default so user easily views activities
      if (rawWbs.length > 0) {
        setExpandedNodes(rawWbs.map((n: any) => n.id));
      }

      const rawMembers = membersRes?.success && membersRes?.data ? membersRes.data : membersRes?.data || [];
      const formattedMembers = rawMembers.map((m: any) => ({
        id: String(m.userId?._id || m.userId?.id || m.userId || m._id || ''),
        name: m.userId?.firstName ? `${m.userId.firstName} ${m.userId.lastName || ''}`.trim() : m.userId?.email || 'Member',
        email: m.userId?.email || '',
        role: (m.roleTitle || m.projectRole || 'Member').replace(/_/g, ' '),
      }));
      setMembers(formattedMembers);
    } catch (err) {
      console.warn('Failed to load WBS & tasks data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchData();
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

// Map tasks by WBS / Package ID (including descendant levels, sorted by creation order)
  const tasksByPackage = useMemo(() => {
    const map = new Map<string, any[]>();

    wbsData.forEach((node) => {
      map.set(String(node.id || node._id), []);
    });

    const rootNodesWithDescendants = wbsData.map((node) => ({
      id: String(node.id || node._id),
      childIds: getAllDescendantIds(node),
    }));

    for (const t of tasks) {
      const rawPkgId = String(t.packageId?._id || t.packageId?.id || t.packageId || '');
      const matchingRoot = rootNodesWithDescendants.find(
        (r) => r.id === rawPkgId || r.childIds.includes(rawPkgId)
      );
      if (matchingRoot && map.has(matchingRoot.id)) {
        map.get(matchingRoot.id)!.push(t);
      } else if (rawPkgId && map.has(rawPkgId)) {
        map.get(rawPkgId)!.push(t);
      }
    }

    map.forEach((list) => {
      list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    });
    return map;
  }, [wbsData, tasks]);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => (prev.includes(id) ? prev.filter((nodeId) => nodeId !== id) : [...prev, id]));
  };

  // Open Create WBS Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setNodeName('');
    setNodeDescription('');
    setStartDate('');
    setEndDate('');
    setStatus('active');
    setInitialActivities([]);
    setNewActivityName('');
    setNewActivityPriority('medium');
    setNewActivityAssignee('');
    setNewActivityIsMilestone(false);
    setShowActivitySection(false);
    setIsModalOpen(true);
  };

  // Add initial activity into Create WBS form
  const handleAddInitialActivity = () => {
    if (!newActivityName.trim()) {
      toast.error('Please enter an Activity Name');
      return;
    }
    const item: InitialActivityItem = {
      id: String(Date.now()),
      name: newActivityName.trim(),
      priority: newActivityPriority,
      assigneeId: newActivityAssignee || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      isMilestone: newActivityIsMilestone,
    };
    setInitialActivities((prev) => [...prev, item]);
    setNewActivityName('');
    setNewActivityIsMilestone(false);
  };

  // Remove initial activity from Create WBS form
  const handleRemoveInitialActivity = (id: string) => {
    setInitialActivities((prev) => prev.filter((item) => item.id !== id));
  };

  // Open Edit WBS Modal
  const handleOpenEditModal = (node: any) => {
    setModalMode('edit');
    setCurrentNodeId(node.id);
    setNodeName(node.name || '');
    setNodeDescription(node.description || '');
    setStartDate(node.startDate ? new Date(node.startDate).toISOString().split('T')[0] : '');
    setEndDate(node.endDate ? new Date(node.endDate).toISOString().split('T')[0] : '');
    setStatus(node.status === 'inactive' ? 'inactive' : 'active');
    setInitialActivities([]);
    setNewActivityIsMilestone(false);
    setShowActivitySection(false);
    setIsModalOpen(true);
  };

  // Save WBS Node (and any attached initial activities)
  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeName.trim()) {
      toast.error('Please enter a WBS Name');
      return;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error('Start Date must be before or equal to End Date');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        type: 'building',
        name: nodeName.trim(),
        description: nodeDescription.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        status: status,
      };

      let createdOrUpdatedNodeId = currentNodeId;

      if (modalMode === 'create') {
        const res = await interiorProjectService.addWbsNode(projectId, payload);
        createdOrUpdatedNodeId = res?.data?._id || res?.data?.id || res?._id || res?.id;
      } else {
        payload.id = currentNodeId;
        await interiorProjectService.updateWbsNode(projectId, payload);
      }

      // If initial activities were added during creation, create them now!
      if (initialActivities.length > 0 && createdOrUpdatedNodeId) {
        for (const act of initialActivities) {
          try {
            await interiorProjectService.createTask(projectId, {
              packageId: createdOrUpdatedNodeId,
              name: act.name,
              priority: act.priority,
              status: 'todo',
              startDate: act.startDate || startDate || undefined,
              endDate: act.endDate || endDate || undefined,
              assignees: act.assigneeId ? [act.assigneeId] : [],
              progress: 0,
              isMilestone: Boolean(act.isMilestone),
            });
          } catch (taskErr) {
            console.warn('Failed to add initial activity', taskErr);
          }
        }
        toast.success(`WBS created with ${initialActivities.length} activit${initialActivities.length > 1 ? 'ies' : 'y'}!`);
      } else {
        toast.success(modalMode === 'create' ? 'WBS element created successfully' : 'WBS element updated successfully');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Save WBS Node failed', err);
      toast.error(err?.response?.data?.error || 'Failed to save WBS element');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete WBS Node
  const handleDeleteNode = async (type: string, id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete WBS Element',
      message: `Are you sure you want to delete "${name}"? Any linked activities will also be removed.`,
      confirmText: 'Delete WBS',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await interiorProjectService.deleteWbsNode(projectId, type || 'building', id);
      toast.success('WBS element deleted successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete WBS element');
    }
  };

  // Open Create Activity Modal for a WBS element
  const handleOpenAddActivity = (node: { id: string; name: string }) => {
    setActivityModalMode('create');
    setEditingTaskId('');
    setSelectedNodeForActivity(node);
    setActivityName('');
    setActivityDescription('');
    setActivityPriority('medium');
    setActivityStatus('todo');
    setActivityStartDate('');
    setActivityEndDate('');
    setActivityAssigneeId('');
    setActivityIsMilestone(false);
    setIsActivityModalOpen(true);
  };

  // Open Edit Activity Modal
  const handleOpenEditActivity = (task: any, node: { id: string; name: string }) => {
    setActivityModalMode('edit');
    setEditingTaskId(task._id || task.id);
    setSelectedNodeForActivity(node);
    setActivityName(task.name || '');
    setActivityDescription(task.description || '');
    setActivityPriority(task.priority || 'medium');
    setActivityStatus(task.status || 'todo');
    setActivityStartDate(task.startDate ? String(task.startDate).split('T')[0] : '');
    setActivityEndDate(task.endDate ? String(task.endDate).split('T')[0] : '');
    const firstAssignee = task.assignees?.[0];
    const assigneeId = typeof firstAssignee === 'object' ? (firstAssignee?._id || firstAssignee?.id || '') : (firstAssignee || '');
    setActivityAssigneeId(assigneeId);
    setActivityIsMilestone(Boolean(task.isMilestone));
    setIsActivityModalOpen(true);
  };

  // Delete Activity / Task
  const handleDeleteActivity = async (taskId: string, taskName: string) => {
    const ok = await confirm({
      title: 'Delete Activity',
      message: `Are you sure you want to delete activity "${taskName}"?`,
      confirmText: 'Delete Activity',
      type: 'danger',
    });
    if (!ok) return;

    try {
      await interiorProjectService.deleteTask(projectId, taskId);
      toast.success('Activity deleted successfully');
      fetchData();
    } catch (err: any) {
      console.error('Delete activity error', err);
      toast.error(err?.response?.data?.error || 'Failed to delete activity');
    }
  };

  // Save Standalone Activity / Task (Create or Edit)
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim()) {
      toast.error('Please enter an Activity Name');
      return;
    }

    if (activityStartDate && activityEndDate && new Date(activityStartDate) > new Date(activityEndDate)) {
      toast.error('Start Date must be before or equal to End Date');
      return;
    }

    // Validate that activity dates are within parent WBS date range
    const targetWbsNode = wbsData.find((w) => String(w.id) === String(selectedNodeForActivity?.id));
    const wbsMin = targetWbsNode?.startDate ? String(targetWbsNode.startDate).split('T')[0] : null;
    const wbsMax = targetWbsNode?.endDate ? String(targetWbsNode.endDate).split('T')[0] : null;

    if (wbsMin && activityStartDate && activityStartDate < wbsMin) {
      toast.error(`Activity Start Date (${activityStartDate}) cannot be earlier than WBS "${targetWbsNode?.name || ''}" Start Date (${wbsMin})`);
      return;
    }

    if (wbsMax && activityEndDate && activityEndDate > wbsMax) {
      toast.error(`Activity End Date (${activityEndDate}) cannot be later than WBS "${targetWbsNode?.name || ''}" End Date (${wbsMax})`);
      return;
    }

    try {
      setSubmittingActivity(true);
      if (activityModalMode === 'edit') {
        const payload: any = {
          name: activityName.trim(),
          description: activityDescription.trim(),
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
          fetchData();
        }
      } else {
        if (!selectedNodeForActivity?.id) {
          toast.error('Please select a WBS element');
          return;
        }
        const payload: any = {
          packageId: selectedNodeForActivity.id,
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
          toast.success('Activity created under WBS element!');
          setIsActivityModalOpen(false);
          if (!expandedNodes.includes(selectedNodeForActivity.id)) {
            setExpandedNodes((prev) => [...prev, selectedNodeForActivity.id]);
          }
          fetchData();
        }
      }
    } catch (err: any) {
      console.error('Save Activity error', err);
      toast.error(err?.response?.data?.error || 'Failed to save activity');
    } finally {
      setSubmittingActivity(false);
    }
  };

  // Quick toggle task completion
  const handleToggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    const newProgress = newStatus === 'completed' ? 100 : 50;
    try {
      await interiorProjectService.updateTask(projectId, task._id || task.id, {
        status: newStatus,
        progress: newProgress,
      });
      toast.success(newStatus === 'completed' ? 'Activity completed!' : 'Activity reopened');
      fetchData();
    } catch (err) {
      toast.error('Failed to update activity');
    }
  };

  const formatDateRange = (s?: string | Date | null, e?: string | Date | null) => {
    if (!s && !e) return null;
    const formatSingle = (d: string | Date) => {
      try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return null;
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return null;
      }
    };
    const sStr = s ? formatSingle(s) : null;
    const eStr = e ? formatSingle(e) : null;
    if (sStr && eStr) return `${sStr} — ${eStr}`;
    if (sStr) return `Starts: ${sStr}`;
    if (eStr) return `Due: ${eStr}`;
    return null;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Work Breakdown Structure (WBS)</h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {wbsData.length} WBS Elements • {tasks.length} Activities
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Define work breakdown elements, planning dates, scope of work, and actionable activities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenCreateModal}
            className="shadow-xs font-semibold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create WBS
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <Card className="p-5 bg-slate-50/50 border border-slate-200 rounded-2xl shadow-xs">
          {wbsData.length === 0 ? (
            <div className="text-center py-16 text-sm text-slate-500">
              <FolderTree className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No WBS elements defined yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Click &quot;Create WBS&quot; to initialize your project work breakdown elements.</p>
              <div className="mt-4">
                <Button
                  onClick={handleOpenCreateModal}
                  className="shadow-xs font-semibold inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create WBS
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {wbsData.map((node) => {
                const directTasks = tasksByPackage.get(node.id) || [];
                const isExpanded = expandedNodes.includes(node.id);
                const dateRange = formatDateRange(node.startDate, node.endDate);

                return (
                  <div key={node.id} className="select-none bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    {/* WBS Row */}
                    <div className="flex items-center justify-between p-3.5 group hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleNode(node.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FolderTree className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 truncate">{node.name}</span>

                            {/* Status badge */}
                            {node.status === 'inactive' ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                                Inactive
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                Active
                              </span>
                            )}

                            {/* Activities count & progress */}
                            {directTasks.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  {directTasks.filter((t: any) => t.status === 'completed').length}/{directTasks.length} Activities
                                </span>
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 text-[10px] font-bold rounded',
                                    directTasks.every((t: any) => t.status === 'completed')
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-700'
                                  )}
                                >
                                  {Math.round(
                                    (directTasks.filter((t: any) => t.status === 'completed').length / directTasks.length) * 100
                                  )}
                                  %
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Secondary line: Description and Dates */}
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            {node.description && (
                              <span className="truncate max-w-sm text-slate-600" title={node.description}>
                                {node.description}
                              </span>
                            )}
                            {dateRange && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                                <Calendar size={12} className="text-blue-600" /> {dateRange}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row Actions */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Button
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                          onClick={() => handleOpenAddActivity(node)}
                          title="Add Activity under this WBS element"
                        >
                          <Plus className="w-3.5 h-3.5" /> Activity
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 bg-white hover:bg-slate-100 text-slate-600 border-slate-200 cursor-pointer"
                          onClick={() => handleOpenEditModal(node)}
                          title="Edit WBS element"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-slate-200 hover:border-rose-200 cursor-pointer"
                          onClick={() => handleDeleteNode(node.type, node.id, node.name)}
                          title="Delete WBS element"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Activities List */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100 bg-slate-50/50 p-3 pl-11"
                        >
                          {directTasks.length === 0 ? (
                            <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
                              <span>No activities created under this WBS element yet.</span>
                              <button
                                type="button"
                                onClick={() => handleOpenAddActivity(node)}
                                className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={12} /> Add First Activity
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {directTasks.map((task: any) => {
                                const priority = priorityConfig[task.priority] || priorityConfig.medium;
                                const isDone = task.status === 'completed';
                                const dateRange = formatDateRange(task.startDate, task.endDate);

                                const getAssigneeName = () => {
                                  if (!task.assignees || !Array.isArray(task.assignees) || task.assignees.length === 0) {
                                    return null;
                                  }
                                  const names = task.assignees
                                    .map((a: any) => {
                                      if (!a) return null;
                                      if (typeof a === 'object') {
                                        const fullName = `${a.firstName || ''} ${a.lastName || ''}`.trim();
                                        return fullName || a.name || a.email || null;
                                      }
                                      const member = members.find((m) => String(m.id) === String(a));
                                      return member?.name || null;
                                    })
                                    .filter(Boolean);
                                  return names.length > 0 ? names.join(', ') : null;
                                };

                                const assigneeName = getAssigneeName();

                                return (
                                  <div
                                    key={task._id || task.id}
                                    className={cn(
                                      'flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors',
                                      isDone
                                        ? 'bg-emerald-50/30 border-emerald-200/60 text-slate-600'
                                        : 'bg-white border-slate-200 hover:border-blue-300 text-slate-800 shadow-2xs'
                                    )}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span
                                            className={cn(
                                              'font-medium truncate',
                                              isDone && 'line-through text-slate-400'
                                            )}
                                          >
                                            {task.name}
                                          </span>

                                          <span className={cn('px-1.5 py-0.2 text-[9px] font-bold rounded uppercase', priority.color)}>
                                            {priority.label}
                                          </span>

                                          <span
                                            className={cn(
                                              'px-1.5 py-0.2 text-[9px] font-semibold rounded',
                                              task.status === 'completed'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : task.status === 'in_progress'
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-slate-100 text-slate-700'
                                            )}
                                          >
                                            {task.status === 'completed' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                                          </span>

                                          {/* Assigned Person / Unassigned */}
                                          {assigneeName ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                                              <User size={11} className="text-blue-600" />
                                              {assigneeName}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                                              <User size={11} className="text-slate-400" />
                                              Unassigned
                                            </span>
                                          )}

                                          {/* Milestone Badge */}
                                          {task.isMilestone && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                              <MilestoneIcon size={11} className="text-purple-600" />
                                              Milestone
                                            </span>
                                          )}
                                        </div>

                                        {(task.description || dateRange) && (
                                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                                            {task.description && (
                                              <span className="truncate max-w-sm text-slate-500" title={task.description}>
                                                {task.description}
                                              </span>
                                            )}
                                            {dateRange && (
                                              <span className="flex items-center gap-1 text-slate-500">
                                                <Calendar size={11} className="text-blue-600" /> {dateRange}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Activity Actions: Edit & Delete */}
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditActivity(task, node);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                        title="Edit Activity"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteActivity(task._id || task.id, task.name);
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Delete Activity"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── 1. MODAL: CREATE / EDIT WBS (Strictly matches user screenshot) ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-200 bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-900"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <FolderTree size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {modalMode === 'create' ? 'Create WBS' : 'Edit WBS'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Define the scope, timeline, and activities for this WBS element
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleSaveNode} className="p-6 space-y-4.5 overflow-y-auto flex-1">
                {/* 1. WBS Name * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <span>WBS Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Kitchen Cabinetry"
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs"
                  />
                </div>

                {/* 2. Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Define the scope of this WBS element..."
                    value={nodeDescription}
                    onChange={(e) => setNodeDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none font-normal leading-relaxed shadow-2xs"
                  />
                </div>

                {/* 3. Planning Dates */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-900 tracking-tight">Planning Dates</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-600">Planned Start Date</span>
                      <div className="relative">
                        <Input
                          type="date"
                          value={startDate}
                          max={endDate || undefined}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-600">Planned End Date</span>
                      <div className="relative">
                        <Input
                          type="date"
                          value={endDate}
                          min={startDate || undefined}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Status Radio Selector */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-900 tracking-tight">Status</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                      <input
                        type="radio"
                        name="wbsStatus"
                        value="active"
                        checked={status === 'active'}
                        onChange={() => setStatus('active')}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Active</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                      <input
                        type="radio"
                        name="wbsStatus"
                        value="inactive"
                        checked={status === 'inactive'}
                        onChange={() => setStatus('inactive')}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>

                {/* 5. Activities Section inside modal */}
                {modalMode === 'create' && (
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckSquare size={14} className="text-blue-600" />
                        <span className="text-xs font-bold text-slate-900">Add Activities / Tasks</span>
                        <span className="text-[10px] text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded font-medium">Optional</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowActivitySection(!showActivitySection)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                      >
                        {showActivitySection ? 'Hide' : '+ Add Activity'}
                      </button>
                    </div>

                    {showActivitySection && (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            placeholder="Activity name (e.g. Base Cabinet Framing)"
                            value={newActivityName}
                            onChange={(e) => setNewActivityName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddInitialActivity();
                              }
                            }}
                            className="text-xs h-9 bg-white"
                          />
                          <select
                            className="h-9 px-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 shrink-0 cursor-pointer"
                            value={newActivityPriority}
                            onChange={(e) => setNewActivityPriority(e.target.value)}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                          <Button
                            type="button"
                            onClick={handleAddInitialActivity}
                            size="sm"
                            className="h-9 px-3 text-xs shrink-0 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                          >
                            <Plus size={13} /> Add
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          {members.length > 0 && (
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                              <span className="text-[11px] text-slate-500 shrink-0">Assign To:</span>
                              <select
                                className="h-8 px-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 flex-1 cursor-pointer"
                                value={newActivityAssignee}
                                onChange={(e) => setNewActivityAssignee(e.target.value)}
                              >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.role})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-200/80 bg-purple-50/50 hover:bg-purple-50 cursor-pointer transition-colors text-xs font-semibold text-purple-900 select-none">
                            <input
                              type="checkbox"
                              checked={newActivityIsMilestone}
                              onChange={(e) => setNewActivityIsMilestone(e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                            />
                            <MilestoneIcon size={12} className="text-purple-600" />
                            <span>Milestone Activity</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* List of pending initial activities */}
                    {initialActivities.length > 0 && (
                      <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto pr-1">
                        {initialActivities.map((act) => {
                          const member = members.find((m) => String(m.id) === String(act.assigneeId));
                          return (
                            <div
                              key={act.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="font-medium text-slate-800 truncate">{act.name}</span>
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded uppercase bg-slate-100 text-slate-600">
                                  {act.priority}
                                </span>
                                {member?.name ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-medium">
                                    <User size={9} /> {member.name}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-medium">
                                    <User size={9} /> Unassigned
                                  </span>
                                )}
                                {act.isMilestone && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold">
                                    <MilestoneIcon size={9} className="text-purple-600" /> Milestone
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveInitialActivity(act.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Centered Pill Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving WBS...
                      </>
                    ) : modalMode === 'create' ? (
                      initialActivities.length > 0
                        ? `Create WBS & ${initialActivities.length} Activit${initialActivities.length > 1 ? 'ies' : 'y'}`
                        : 'Create WBS'
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 2. MODAL: CREATE ACTIVITY UNDER WBS ELEMENT ── */}
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
                      WBS Element: <span className="font-semibold text-blue-700">{selectedNodeForActivity?.name}</span>
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
                        <option value="in_review">In Review</option>
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
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Planning Dates */}
                {(() => {
                  const targetWbsNode = wbsData.find((w) => String(w.id) === String(selectedNodeForActivity?.id));
                  const wbsMinDate = targetWbsNode?.startDate ? String(targetWbsNode.startDate).split('T')[0] : undefined;
                  const wbsMaxDate = targetWbsNode?.endDate ? String(targetWbsNode.endDate).split('T')[0] : undefined;

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
    </div>
  );
}
