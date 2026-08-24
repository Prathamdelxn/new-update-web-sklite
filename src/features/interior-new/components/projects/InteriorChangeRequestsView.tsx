'use client';

// =============================================================================
// Sky-Lite Web — Interior-New Change Requests View
// Port of interior-os-frontend's projects/[projectId]/change-requests/page.tsx,
// backed by interiorProjectService. The AI predictive impact panel
// (runAiEvaluation / aiEvaluation re-run) is out of scope for this port and
// has been dropped, along with the mock-data fallback from the source page —
// this view only ever shows real backend data. The "Approve & Generate VO"
// action still calls approveChangeRequest but does not navigate to a
// variation-orders page (not yet ported in sky-lite-web).
// =============================================================================

import React, { useEffect, useState } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  Layers,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';

interface InteriorChangeRequestsViewProps {
  projectId: string;
}

const emptyFormData = {
  category: 'design',
  priority: 'medium',
  description: '',
  areaAffected: '',
  currentDesign: '',
  proposedDesign: '',
  reasonForChange: '',
};

const workflowSteps = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'design_review', label: 'Design Review' },
  { key: 'pm_review', label: 'PM Review' },
  { key: 'commercial_review', label: 'Commercial Review' },
  { key: 'client_review', label: 'Client Review' },
  { key: 'approved', label: 'Approved' },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-500 text-white';
    case 'high':
      return 'bg-amber-500 text-white';
    case 'medium':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
    case 'draft':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
  }
};

export default function InteriorChangeRequestsView({ projectId }: InteriorChangeRequestsViewProps) {
  const toast = useToast();

  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [selectedCr, setSelectedCr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState(emptyFormData);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getChangeRequests(projectId);
      if (res?.success && res?.data) {
        setChangeRequests(res.data);
        setSelectedCr(res.data[0] || null);
      }
    } catch (err) {
      console.error('Failed to load change requests', err);
      toast.error('Failed to fetch change request list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchChangeRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreateCr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await interiorProjectService.createChangeRequest(projectId, formData);
      if (res?.success) {
        toast.success('Change request created successfully!');
        await fetchChangeRequests();
        setShowCreateModal(false);
        setFormData(emptyFormData);
      }
    } catch (err) {
      console.error('Failed to create change request', err);
      toast.error('Failed to create change request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedCr) return;
    try {
      setActionLoading(true);
      const res = await interiorProjectService.updateChangeRequest(projectId, selectedCr._id, { status: newStatus });
      if (res?.success) {
        setSelectedCr(res.data);
        setChangeRequests(changeRequests.map((c) => (c._id === selectedCr._id ? res.data : c)));
      }
    } catch (err) {
      console.error('Failed to update change request status', err);
      toast.error('Failed to update change request status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAndGenerateVo = async () => {
    if (!selectedCr) return;
    try {
      setActionLoading(true);
      const res = await interiorProjectService.approveChangeRequest(projectId, selectedCr._id);
      if (res?.success) {
        toast.success('Change request approved! Variation order generated.');
        await fetchChangeRequests();
      }
    } catch (err) {
      console.error('Failed to approve change request', err);
      toast.error('Failed to approve change request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight">Change Request Management</h2>
          <p className="text-xs md:text-sm text-[hsl(var(--muted-foreground))]">
            Evaluate, design-review, and forecast project variations before execution.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] shadow-lg shadow-[hsl(var(--primary)/0.25)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Request a Change
        </button>
      </div>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: List of Change Requests */}
        <div className="lg:col-span-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm overflow-hidden flex flex-col h-[750px]">
          <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <h3 className="text-sm font-semibold">Change Requests</h3>
            <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
              {changeRequests.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]">
            {changeRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                No change requests logged yet. Click &quot;Request a Change&quot; to get started.
              </div>
            ) : (
              changeRequests.map((cr) => (
                <div
                  key={cr._id}
                  onClick={() => setSelectedCr(cr)}
                  className={cn(
                    'p-4 cursor-pointer hover:bg-[hsl(var(--muted)/0.3)] transition-all space-y-2 border-l-2',
                    selectedCr?._id === cr._id ? 'bg-[hsl(var(--muted)/0.5)] border-[hsl(var(--primary))]' : 'border-transparent'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[hsl(var(--foreground))]">{cr.crNumber}</span>
                    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize', getStatusBadge(cr.status))}>
                      {cr.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(var(--foreground))] font-medium line-clamp-2">{cr.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <span className="capitalize">
                      {cr.category} • Priority: <span className="font-semibold capitalize text-[hsl(var(--foreground))]">{cr.priority}</span>
                    </span>
                    <span>{new Date(cr.requestedDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Selected Details View */}
        <div className="lg:col-span-8 space-y-6">
          {selectedCr ? (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-sm overflow-hidden flex flex-col h-[750px]">
              {/* Detail Header */}
              <div className="p-6 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-lg font-bold tracking-wider text-[hsl(var(--foreground))]">{selectedCr.crNumber}</span>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] uppercase font-bold', getPriorityColor(selectedCr.priority))}>{selectedCr.priority}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      Requested by{' '}
                      <span className="font-semibold text-[hsl(var(--foreground))]">
                        {selectedCr.requestedBy?.firstName} {selectedCr.requestedBy?.lastName}
                      </span>
                    </span>
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1.5 flex items-center gap-2">
                    <span className="capitalize font-semibold text-[hsl(var(--foreground))]">{selectedCr.category} Change</span>
                    <span>•</span>
                    <span>
                      Area Affected: <span className="text-[hsl(var(--foreground))]">{selectedCr.areaAffected || 'Not Specified'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border capitalize', getStatusBadge(selectedCr.status))}>
                    {selectedCr.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Scrollable Contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Workflow Tracker */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Approval Workflow</h4>
                  <div className="grid grid-cols-7 gap-1 bg-[hsl(var(--muted)/0.2)] p-2.5 rounded-lg border border-[hsl(var(--border))] text-[10px] text-center font-medium">
                    {workflowSteps.map((step, idx) => {
                      const isCompleted = workflowSteps.findIndex((s) => s.key === selectedCr.status) >= idx || selectedCr.status === 'approved';
                      const isActive = selectedCr.status === step.key;
                      return (
                        <div key={step.key} className="flex flex-col items-center relative gap-1">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center transition-all',
                              isCompleted ? 'bg-emerald-500 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
                              isActive && 'ring-2 ring-[hsl(var(--primary))] ring-offset-2'
                            )}
                          >
                            {isCompleted && step.key !== selectedCr.status ? <Check className="w-3 h-3" /> : <span>{idx + 1}</span>}
                          </div>
                          <span
                            className={cn(
                              'text-[8px] font-semibold tracking-tight whitespace-nowrap',
                              isActive ? 'text-[hsl(var(--primary))]' : isCompleted ? 'text-emerald-500' : 'text-[hsl(var(--muted-foreground))]'
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI predictive impact panel (aiEvaluation / runAiEvaluation) intentionally dropped — out of scope */}

                {/* Scope Comparison */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Scope & Design Changes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Current Approved Design</span>
                      <p className="text-xs font-medium text-[hsl(var(--foreground))]">{selectedCr.currentDesign || 'No description provided.'}</p>
                    </div>
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Proposed Variation Design</span>
                      <p className="text-xs font-medium text-[hsl(var(--foreground))]">{selectedCr.proposedDesign || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>

                {/* Description & Reason */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Description of Change</span>
                    <p className="text-xs text-[hsl(var(--foreground))] font-medium">{selectedCr.description}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase block">Reason for Modification</span>
                    <p className="text-xs text-[hsl(var(--foreground))] font-medium">{selectedCr.reasonForChange || 'No reason specified.'}</p>
                  </div>
                </div>
              </div>

              {/* Detail Footer Actions */}
              <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] flex flex-wrap items-center justify-between gap-3">
                {selectedCr.status !== 'approved' && selectedCr.status !== 'rejected' ? (
                  <div className="flex items-center gap-2">
                    {selectedCr.status === 'draft' && (
                      <button
                        onClick={() => handleStatusUpdate('submitted')}
                        disabled={actionLoading}
                        className="px-4 py-2 text-xs font-semibold border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] cursor-pointer disabled:opacity-50"
                      >
                        Submit for Review
                      </button>
                    )}
                    {selectedCr.status === 'submitted' && (
                      <button
                        onClick={() => handleStatusUpdate('design_review')}
                        disabled={actionLoading}
                        className="px-4 py-2 text-xs font-semibold border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] cursor-pointer disabled:opacity-50"
                      >
                        Move to Design Review
                      </button>
                    )}
                    {selectedCr.status === 'design_review' && (
                      <button
                        onClick={() => handleStatusUpdate('pm_review')}
                        disabled={actionLoading}
                        className="px-4 py-2 text-xs font-semibold border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] cursor-pointer disabled:opacity-50"
                      >
                        Move to PM Review
                      </button>
                    )}
                    {selectedCr.status === 'pm_review' && (
                      <button
                        onClick={() => handleStatusUpdate('commercial_review')}
                        disabled={actionLoading}
                        className="px-4 py-2 text-xs font-semibold border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] cursor-pointer disabled:opacity-50"
                      >
                        Move to Commercial Review
                      </button>
                    )}
                    {selectedCr.status === 'commercial_review' && (
                      <button
                        onClick={() => handleStatusUpdate('client_review')}
                        disabled={actionLoading}
                        className="px-4 py-2 text-xs font-semibold border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] cursor-pointer disabled:opacity-50"
                      >
                        Move to Client Review
                      </button>
                    )}

                    <button
                      onClick={() => handleStatusUpdate('rejected')}
                      disabled={actionLoading}
                      className="px-4 py-2 text-xs font-semibold border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer disabled:opacity-50"
                    >
                      Reject Request
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    {selectedCr.status === 'approved' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>This request was approved and generated a Variation Order.</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-500" />
                        <span>This request was rejected.</span>
                      </>
                    )}
                  </div>
                )}

                {selectedCr.status !== 'approved' && selectedCr.status !== 'rejected' && (
                  <button
                    onClick={handleApproveAndGenerateVo}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve & Generate VO
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center text-slate-500 h-[500px] flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
              <p>No Change Request selected.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-[hsl(var(--primary))]" />
                Create Change Request
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCr} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  >
                    <option value="design">Design Change</option>
                    <option value="material">Material Change</option>
                    <option value="layout">Layout Change</option>
                    <option value="mep">MEP Change</option>
                    <option value="scope">Scope Change</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Area Affected</label>
                <input
                  type="text"
                  placeholder="e.g. Master Bedroom, Kitchen Counter"
                  value={formData.areaAffected}
                  onChange={(e) => setFormData({ ...formData, areaAffected: e.target.value })}
                  className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Description of Change</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the requested change in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Current Design / Material</label>
                  <textarea
                    rows={2}
                    placeholder="Standard design specifications currently approved..."
                    value={formData.currentDesign}
                    onChange={(e) => setFormData({ ...formData, currentDesign: e.target.value })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Proposed Design / Material</label>
                  <textarea
                    rows={2}
                    placeholder="Proposed change or alternative specifications..."
                    value={formData.proposedDesign}
                    onChange={(e) => setFormData({ ...formData, proposedDesign: e.target.value })}
                    className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Reason for Change</label>
                <textarea
                  rows={2}
                  placeholder="Why is this change necessary?"
                  value={formData.reasonForChange}
                  onChange={(e) => setFormData({ ...formData, reasonForChange: e.target.value })}
                  className="w-full bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3 bg-[hsl(var(--card))]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--muted))] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
