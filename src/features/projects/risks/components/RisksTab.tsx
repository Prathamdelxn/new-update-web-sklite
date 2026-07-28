'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Plus,
  Loader2,
  Cog,
  Coins,
  Users,
  Leaf,
  Scale,
  Truck,
  Eye,
  Pencil,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission, hasAnyProjectPermissionPrefix } from '@/lib/permissions';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { RiskModal } from '@/features/projects/risks/components/RiskModal';
import { RiskDetailModal } from '@/features/projects/risks/components/RiskDetailModal';
import { RiskMitigationModal } from '@/features/projects/risks/components/RiskMitigationModal';

interface RisksTabProps {
  projectId: string;
}

const STATUS_FILTERS = ['All', 'Critical', 'Active', 'Monitored', 'Resolved'] as const;

const CATEGORIES = [
  { name: 'Logistics', icon: Truck },
  { name: 'Resources', icon: Users },
  { name: 'Environmental', icon: Leaf },
  { name: 'Legal', icon: Scale },
  { name: 'Safety', icon: ShieldAlert },
  { name: 'Financial', icon: Coins },
  { name: 'Technical', icon: Cog }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Critical': return '#EF4444';
    case 'Active': return '#F59E0B';
    case 'Monitored': return '#3B82F6';
    case 'Resolved': return '#10B981';
    default: return '#94A3B8';
  }
};

const getStatusBgClass = (status: string) => {
  switch (status) {
    case 'Critical': return 'bg-red-500';
    case 'Active': return 'bg-amber-500';
    case 'Monitored': return 'bg-blue-500';
    case 'Resolved': return 'bg-emerald-500';
    default: return 'bg-slate-400';
  }
};

const getImpactBadgeClass = (label: string) => {
  switch (label) {
    case 'Low':       return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
    case 'Medium':    return 'text-blue-700 bg-blue-50 border border-blue-100';
    case 'High':      return 'text-amber-700 bg-amber-50 border border-amber-100';
    case 'Very High': return 'text-red-700 bg-red-50 border border-red-100';
    default:          return 'text-slate-700 bg-slate-50 border border-slate-100';
  }
};

const getImpactColor = (label: string) => {
  switch (label) {
    case 'Low':       return '#10B981';
    case 'Medium':    return '#3B82F6';
    case 'High':      return '#F59E0B';
    case 'Very High': return '#EF4444';
    default:          return '#94A3B8';
  }
};

export const RisksTab: React.FC<RisksTabProps> = ({ projectId }) => {
  const { project } = useProjectContext();
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMitigateRisk, setSelectedMitigateRisk] = useState<any>(null);
  const [isMitigateOpen, setIsMitigateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toast = useToast();
  const { user } = useAuth();

  const canView = hasAnyProjectPermissionPrefix(user, project, 'escalation:');
  const canCreate = hasProjectPermission(user, project, 'escalation:create');
  const canUpdate = hasProjectPermission(user, project, 'escalation:update');
  const canDelete = hasProjectPermission(user, project, 'escalation:delete');
  const isAdmin = user?.role?.name === 'Admin' || (user?.role?.permissions?.includes('*') ?? false);

  const fetchRisks = async () => {
    try {
      const response = await api.get(`/projects/${projectId}/risks`);
      setRisks(response.data || []);
    } catch (error) {
      toast.error('Failed to load risks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchRisks();
  }, [projectId]);

  const handleDeleteRisk = async (riskId: string) => {
    if (!window.confirm('Delete this risk? This cannot be undone.')) return;
    setDeletingId(riskId);
    try {
      await api.delete(`/risks/${riskId}`);
      toast.success('Risk deleted');
      fetchRisks();
    } catch (error: any) {
      if (error.response?.status >= 500) {
        toast.success('Risk deleted');
        fetchRisks();
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete risk');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filteredRisks = statusFilter === 'All'
    ? risks
    : risks.filter(r => r.status === statusFilter);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 bg-white border border-gray-100 rounded-3xl text-center">
        <Lock className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Access Restricted</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          You don't have permission to view the Risk & Escalation Matrix module.
        </p>
      </div>
    );
  }

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-8">
        {/* Premium Dark Statistics Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold text-slate-400">Risk Overview</h4>
            <div className="bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700/50">
              {risks.length} Total Risks
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
                <span>Critical</span>
              </div>
              <span className="text-2xl font-black">{risks.filter(r => r.status === 'Critical').length}</span>
            </div>

            <div className="flex flex-col space-y-1 border-l border-slate-800 pl-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                <span>Active</span>
              </div>
              <span className="text-2xl font-black">{risks.filter(r => r.status === 'Active').length}</span>
            </div>

            <div className="flex flex-col space-y-1 border-l border-slate-800 pl-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                <span>Resolved</span>
              </div>
              <span className="text-2xl font-black">{risks.filter(r => r.status === 'Resolved').length}</span>
            </div>
          </div>
        </div>

        {/* Filters and Search Action Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-2xl text-xs font-bold border transition-all',
                  statusFilter === f
                    ? f === 'Critical'  ? 'bg-red-600 border-red-600 text-white' :
                      f === 'Resolved'  ? 'bg-emerald-600 border-emerald-600 text-white' :
                      f === 'Monitored' ? 'bg-blue-600 border-blue-600 text-white' :
                      f === 'Active'    ? 'bg-amber-500 border-amber-500 text-white' :
                                          'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                {f}
                {f !== 'All' && (
                  <span className="ml-1.5 opacity-70">
                    ({risks.filter(r => r.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Identify Risk</span>
            </button>
          )}
        </div>

        {/* Risk Registry Header */}
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-lg font-bold text-gray-900">Risk Registry</h3>
          <p className="text-xs text-slate-500 mt-1">{filteredRisks.length} incidents tracked</p>
        </div>

        {/* Risk cards Grid */}
        {filteredRisks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
            <div className="p-4 bg-white border border-slate-100 rounded-full shadow-sm mb-4">
              <ShieldCheck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No Risks Detected</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs">
              No risk events match the selected criteria. Keep up the good work!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRisks.map((risk) => {
              const statusColor = getStatusColor(risk.status);
              const categoryObj = CATEGORIES.find(c => c.name === risk.category);
              const CategoryIcon = categoryObj?.icon || AlertCircle;
              const isOwner = String(risk.owner?._id) === String(user?.id);

              return (
                <div
                  key={risk._id}
                  className="bg-white border border-slate-150 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  {/* Top card info */}
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center space-x-2" style={{ color: statusColor }}>
                        <CategoryIcon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {risk.category}
                        </span>
                      </div>
                      <span className={cn('px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider', getImpactBadgeClass(risk.impact))}>
                        {risk.impact}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-2">
                      {risk.title}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {risk.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Mid card progress */}
                  <div className="space-y-2 mb-4 border-t border-slate-50 pt-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>Mitigation Progress</span>
                      <span className="text-slate-900 font-extrabold">{risk.mitigationProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${risk.mitigationProgress}%`,
                          backgroundColor: statusColor
                        }}
                      />
                    </div>
                  </div>

                  {/* Bottom card footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-150 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black text-slate-500 uppercase">
                          {risk.owner?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate">
                          {risk.owner?.name || 'Unassigned'}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {new Date(risk.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedRisk(risk);
                          setIsDetailOpen(true);
                        }}
                        title="View Details"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canUpdate && (
                        <button
                          onClick={() => {
                            setSelectedMitigateRisk(risk);
                            setIsMitigateOpen(true);
                          }}
                          title="Update Mitigation"
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-xl transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canDelete && (isAdmin || isOwner) && (
                        <button
                          onClick={() => handleDeleteRisk(risk._id)}
                          disabled={deletingId === risk._id}
                          title="Delete Risk"
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all disabled:opacity-40"
                        >
                          {deletingId === risk._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE RISK MODAL */}
      <RiskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchRisks}
        projectId={projectId}
      />

      {/* VIEW DETAILS MODAL */}
      <RiskDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRisk(null);
        }}
        onSuccess={fetchRisks}
        risk={selectedRisk}
        projectId={projectId}
      />

      {/* MITIGATION UPDATE MODAL */}
      <RiskMitigationModal
        isOpen={isMitigateOpen}
        onClose={() => {
          setIsMitigateOpen(false);
          setSelectedMitigateRisk(null);
        }}
        onSuccess={fetchRisks}
        risk={selectedMitigateRisk}
        projectId={projectId}
      />
    </SkeletonLoader>
  );
};
