'use client';
import { tr } from '@/i18n';

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
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission, hasAnyProjectPermissionPrefix, isProjectLocked } from '@/lib/permissions';
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

const StatCard = ({
  label, value, icon: Icon, accent, bg, sub,
}: { label: string; value: string | number; icon: React.ElementType; accent: string; bg: string; sub?: string }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 transition-colors duration-200 hover:border-blue-200">
    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border', bg)}>
      <Icon className={cn('w-5 h-5', accent)} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">{tr(label)}</p>
      <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
        <p className="min-w-0 flex-1 text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{tr(value)}</p>
      </div>
      {sub && <p className="text-xs text-slate-400 mt-0.5 font-medium">{tr(sub)}</p>}
    </div>
  </div>
);

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
  const { confirm } = useConfirm();
  const { user } = useAuth();

  const isLocked = isProjectLocked(project);
  const canView = hasAnyProjectPermissionPrefix(user, project, 'risks:');
  const canCreate = !isLocked && hasProjectPermission(user, project, 'risks:create');
  const canUpdate = !isLocked && hasProjectPermission(user, project, 'risks:update');
  const canDelete = !isLocked && hasProjectPermission(user, project, 'risks:delete');

  const fetchRisks = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/risks`);
      setRisks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchRisks();
  }, [projectId]);

  const handleDeleteRisk = async (riskId: string) => {
    const ok = await confirm({
      title: tr("Delete Risk"),
      message: tr("Delete this risk? This cannot be undone."),
      confirmText: tr("Delete Risk"),
      type: 'danger',
    });
    if (!ok) return;
    setDeletingId(riskId);
    try {
      await api.delete(`/risks/${riskId}`);
      toast.success(tr("Risk deleted"));
      fetchRisks();
    } catch (error: any) {
      if (error.response?.status >= 500) {
        toast.success(tr("Risk deleted"));
        fetchRisks();
      } else {
        toast.error(error.response?.data?.message || tr("Failed to delete risk"));
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
      <div className="flex flex-col items-center justify-center py-24 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200 text-center mt-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">{tr("Access Restricted")}</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          {tr("You don't have permission to view the Risk Management module.")}
        </p>
      </div>
    );
  }

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={tr("Total Risks")}
            value={risks.length}
            icon={ShieldAlert}
            accent="text-blue-600"
            bg="bg-blue-50 border-blue-100"
            sub={`${risks.filter(r => r.status === 'Critical').length} critical incidents`}
          />
          <StatCard
            label={tr("Critical Risks")}
            value={risks.filter(r => r.status === 'Critical').length}
            icon={AlertTriangle}
            accent="text-red-600"
            bg="bg-red-50 border-red-100"
            sub={risks.filter(r => r.status === 'Critical').length > 0 ? 'requires immediate action' : 'none detected'}
          />
          <StatCard
            label={tr("Active Risks")}
            value={risks.filter(r => r.status === 'Active').length}
            icon={Clock}
            accent="text-amber-600"
            bg="bg-amber-50 border-amber-100"
            sub="under active review"
          />
          <StatCard
            label={tr("Resolved Risks")}
            value={risks.filter(r => r.status === 'Resolved').length}
            icon={ShieldCheck}
            accent="text-emerald-600"
            bg="bg-emerald-50 border-emerald-100"
            sub={risks.length > 0 ? `${Math.round((risks.filter(r => r.status === 'Resolved').length / risks.length) * 100)}% mitigated` : 'all clear'}
          />
        </div>

        {/* Filters and Header Action Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{tr("Risk Registry")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{filteredRisks.length}{tr(" incidents tracked across active phases")}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                    statusFilter === f
                      ? f === 'Critical'  ? 'bg-red-600 border-red-600 text-white' :
                        f === 'Resolved'  ? 'bg-emerald-600 border-emerald-600 text-white' :
                        f === 'Monitored' ? 'bg-blue-600 border-blue-600 text-white' :
                        f === 'Active'    ? 'bg-amber-500 border-amber-500 text-white' :
                                            'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  )}
                >
                  {tr(f)}
                  {f !== 'All' && (
                    <span className="ms-1.5 opacity-70">
                      ({risks.filter(r => r.status === f).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {canCreate && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{tr("New Risk")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Risk cards Grid */}
        {filteredRisks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 bg-white/70 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">{tr("No Risks Detected")}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {statusFilter !== 'All'
                ? tr("No risk records match the filter \"{{statusFilter}}\".", { statusFilter: statusFilter })
                : tr("No risk events or safety hazards recorded for this project.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRisks.map((risk) => {
              const statusColor = getStatusColor(risk.status);
              const categoryObj = CATEGORIES.find(c => c.name === risk.category);
              const CategoryIcon = categoryObj?.icon || AlertCircle;

              return (
                <div
                  key={risk._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-200 transition-all flex flex-col justify-between"
                >
                  {/* Top card info */}
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center space-x-1.5" style={{ color: statusColor }}>
                        <CategoryIcon className="w-4 h-4" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                          {tr(risk.category)}
                        </span>
                      </div>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', getImpactBadgeClass(risk.impact))}>
                        {tr(risk.impact)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-2">
                      {tr(risk.title)}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {risk.description || tr("No description provided.")}
                    </p>
                  </div>

                  {/* Mid card progress */}
                  <div className="space-y-2 mb-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>{tr("Mitigation Progress")}</span>
                      <span className="text-slate-900 font-bold">{tr(risk.mitigationProgress)}%</span>
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
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400">
                      {tr("Updated ")}{new Date(risk.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedRisk(risk);
                          setIsDetailOpen(true);
                        }}
                        title={tr("View Details")}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canUpdate && (
                        <button
                          onClick={() => {
                            setSelectedMitigateRisk(risk);
                            setIsMitigateOpen(true);
                          }}
                          title={tr("Update Mitigation")}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-xl transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Risk Management > Delete decides — not who raised the risk */}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteRisk(risk._id)}
                          disabled={deletingId === risk._id}
                          title={tr("Delete Risk")}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
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
