'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  History,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Plus,
  UserCheck,
  X,
} from 'lucide-react';
import { Project } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { UserPickerModal } from '@/components/modals/UserPickerModal';
import { useAuth } from '@/providers/AuthContext';

interface BudgetTabProps {
  project: Project;
  onUpdate: () => void;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ project, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isApproverPickerOpen, setIsApproverPickerOpen] = useState(false);
  const [expandedAuditIndex, setExpandedAuditIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    newBudget: '',
    budgetReason: '',
  });

  const { user } = useAuth();
  const toast = useToast();

  const hasBudgetApprovalPermission = user?.role?.name === 'Admin' ||
    user?.role?.permissions?.includes('budget:approve') ||
    user?.role?.permissions?.includes('*');

  const handleBudgetAction = async (budgetId: string, action: 'Approved' | 'Rejected') => {
    try {
      await api.patch(`/projects/${project._id}/budget-action`, { budgetId, action });
      toast.success(`Budget request ${action.toLowerCase()} successfully`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action.toLowerCase()} budget request`);
    }
  };

  const currentApprovers: any[] = (project as any).budgetApprovers || [];

  const handleSaveApprovers = async (userIds: string[]) => {
    try {
      await api.patch(`/projects/${project._id}`, { budgetApprovers: userIds });
      toast.success('Budget approvers updated');
      onUpdate();
    } catch {
      toast.error('Failed to update budget approvers');
    }
    setIsApproverPickerOpen(false);
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      await api.patch(`/projects/${project._id}`, {
        newBudget: formData.newBudget,
        budgetReason: formData.budgetReason,
      });
      toast.success('Budget updated successfully!');
      onUpdate();
      setShowForm(false);
      setFormData({ newBudget: '', budgetReason: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update budget');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentBudget = project.budgetHistory?.[project.budgetHistory.length - 1]?.amount || 0;
  const previousBudget = project.budgetHistory?.[project.budgetHistory.length - 2]?.amount || 0;
  const budgetChange = currentBudget - previousBudget;
  const percentChange = previousBudget !== 0 ? (budgetChange / previousBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 border-gray-200" gradient>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Current Budget</p>
              <p className="text-3xl font-black text-gray-900 mt-1">{formatCurrency(currentBudget, project.currency || '$')}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-200">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            {budgetChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={cn(
              "text-xs font-bold",
              budgetChange >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {Math.abs(percentChange).toFixed(1)}% {budgetChange >= 0 ? 'increase' : 'decrease'}
            </span>
            <span className="text-xs text-slate-500">from previous version</span>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-gray-200">
          <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Total Variations</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{project.budgetHistory?.length || 0}</p>
          <p className="text-xs text-slate-400 mt-4 italic">Approved variations in project lifecycle.</p>
        </GlassCard>

        <GlassCard className="p-6 border-gray-200 col-span-full md:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
                <UserCheck className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Budget Approvers</p>
            </div>
            <button
              onClick={() => setIsApproverPickerOpen(true)}
              className="text-xs font-bold text-purple-600 hover:text-purple-500 transition-colors"
            >
              Configure
            </button>
          </div>
          {currentApprovers.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {currentApprovers.map((a: any) => (
                <div key={a._id || a} className="flex items-center space-x-1.5 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white text-[9px] font-bold">
                    {(a.name || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-purple-700 truncate max-w-[80px]">{a.name || a}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic mt-2">No approvers configured. Any revision will auto-approve.</p>
          )}
        </GlassCard>

        <GlassCard className="p-6 border-gray-200 flex flex-col justify-center items-center text-center">
          {!showForm ? (
            <>
              <p className="text-sm text-slate-500 mb-4">Need to revise project budget?</p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 border border-blue-500 rounded-xl text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Request Revision</span>
              </button>
            </>
          ) : (
            <div className="w-full space-y-4">
              <h4 className="text-sm font-bold text-gray-900">New Budget Revision</h4>
              <form onSubmit={handleUpdateBudget} className="space-y-3">
                <input
                  type="number"
                  required
                  placeholder="New Amount ($)"
                  value={formData.newBudget}
                  onChange={(e) => setFormData({ ...formData, newBudget: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Reason for revision..."
                  value={formData.budgetReason}
                  onChange={(e) => setFormData({ ...formData, budgetReason: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 py-2 bg-blue-600 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Budget Trend Spark Chart */}
      {project.budgetHistory && project.budgetHistory.length >= 2 && (() => {
        const history = [...project.budgetHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const W = 560, H = 80, PAD = 8;
        const maxV = Math.max(...history.map(h => h.amount));
        const minV = Math.min(...history.map(h => h.amount));
        const range = maxV - minV || 1;
        const n = history.length;
        const xOf = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2);
        const yOf = (v: number) => PAD + ((maxV - v) / range) * (H - PAD * 2);
        const points = history.map((h, i) => `${xOf(i)},${yOf(h.amount)}`).join(' ');
        const areaPath = `M${xOf(0)},${yOf(history[0].amount)} ` +
          history.slice(1).map((h, i) => `L${xOf(i + 1)},${yOf(h.amount)}`).join(' ') +
          ` L${xOf(n - 1)},${H - PAD} L${xOf(0)},${H - PAD} Z`;
        const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;
        return (
          <GlassCard className="p-6 border-gray-200" gradient>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Budget Trend</h4>
                  <p className="text-[10px] text-slate-500">{history.length} revisions recorded</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Current</p>
                <p className="text-sm font-black text-emerald-600">{fmt(currentBudget)}</p>
              </div>
            </div>
            <div className="w-full">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
                <defs>
                  <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#budgetGrad)" />
                <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {history.map((h, i) => (
                  <g key={i}>
                    <circle cx={xOf(i)} cy={yOf(h.amount)} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    {(i === 0 || i === n - 1) && (
                      <text x={xOf(i)} y={yOf(h.amount) - 8} textAnchor={i === 0 ? 'start' : 'end'} fontSize="9" fill="#64748b" fontWeight="700">{fmt(h.amount)}</text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          </GlassCard>
        );
      })()}

      {/* Budget History */}
      <GlassCard className="p-8 border-gray-200" gradient>
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 rounded-lg bg-blue-100 border border-blue-200">
            <History className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Budget History & Audit Log</h3>
        </div>

        <div className="space-y-8 relative">
          <div className="absolute left-[21px] top-2 bottom-2 w-px bg-gray-200"></div>

          {project.budgetHistory?.slice().reverse().map((entry, index) => {
            const isExpanded = expandedAuditIndex === index;
            return (
            <div key={index} className="relative pl-12">
              <div className={cn(
                "absolute left-0 top-0 w-11 h-11 rounded-2xl border flex items-center justify-center bg-white z-10 shadow-sm",
                entry.approvalStatus === 'Approved' ? 'border-emerald-200' :
                entry.approvalStatus === 'Rejected' ? 'border-rose-200' : 'border-amber-200'
              )}>
                {entry.approvalStatus === 'Approved' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : entry.approvalStatus === 'Rejected' ? (
                  <X className="w-5 h-5 text-rose-500" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:bg-gray-50 transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg font-black text-gray-900">{formatCurrency(entry.amount, project.currency || '$')}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        entry.approvalStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        entry.approvalStatus === 'Rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                      )}>
                        {entry.approvalStatus}
                      </span>
                      {entry.approvalStatus === 'Pending' && hasBudgetApprovalPermission && (
                        <div className="flex items-center space-x-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleBudgetAction((entry as any)._id || entry, 'Approved')}
                            className="p-1 px-2.5 py-1 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold border border-emerald-200 flex items-center space-x-1 transition-all"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleBudgetAction((entry as any)._id || entry, 'Rejected')}
                            className="p-1 px-2.5 py-1 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-bold border border-rose-200 flex items-center space-x-1 transition-all"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Updated by <span className="text-blue-600 font-bold">{entry.updatedByName}</span> on {new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={() => setExpandedAuditIndex(isExpanded ? null : index)}
                    className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-gray-900 transition-colors"
                  >
                    <span>{isExpanded ? 'Hide Audit' : 'View Audit'}</span>
                    <ArrowUpRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-sm text-slate-500 italic">"{entry.reason}"</p>
                </div>

                {isExpanded && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Audit Trail</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Revision Amount</p>
                        <p className="font-black text-gray-900 mt-0.5">{formatCurrency(entry.amount, project.currency || '$')}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Status</p>
                        <p className={cn("font-black mt-0.5", entry.approvalStatus === 'Approved' ? 'text-emerald-600' : entry.approvalStatus === 'Rejected' ? 'text-rose-600' : 'text-amber-600')}>{entry.approvalStatus}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Requested By</p>
                        <p className="font-bold text-blue-600 mt-0.5">{entry.updatedByName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Timestamp</p>
                        <p className="font-semibold text-gray-700 mt-0.5">{new Date(entry.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </GlassCard>
      <UserPickerModal
        isOpen={isApproverPickerOpen}
        onClose={() => setIsApproverPickerOpen(false)}
        onSelect={(ids) => handleSaveApprovers(ids)}
        title="Budget Approvers"
        description="Select users who must approve budget revision requests."
        initialSelected={currentApprovers.map((a: any) => a._id || a)}
        confirmLabel="Save Approvers"
        accentColor="purple"
        endpoint={`/projects/${project._id}/budget-approvers`}
      />
    </div>
  );
};
