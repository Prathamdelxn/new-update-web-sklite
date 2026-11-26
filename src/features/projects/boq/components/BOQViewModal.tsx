import { tr } from '@/i18n';
import { projectCurrency } from '@/lib/projectCurrency';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Clock, ShieldCheck, AlertCircle, Hourglass, Info, Loader2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/services/api.client';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { isProjectLocked } from '@/lib/permissions';

interface BOQViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  projectId: string;
  user: any;
  isAdmin: boolean;
  canApprove: boolean;
  onUpdateStatus: (item: any, status: 'Approved' | 'Rejected') => void;
  isUpdating: boolean;
}

export const BOQViewModal: React.FC<BOQViewModalProps> = ({
  isOpen,
  onClose,
  item,
  projectId,
  user,
  isAdmin,
  canApprove,
  onUpdateStatus,
  isUpdating
}) => {
  const { project } = useProjectContext();
  const [viewingHistory, setViewingHistory] = useState<any[]>([]);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    
    // Reset state
    setViewingHistory([item]);
    setSelectedVersionIdx(0);
    setLoading(true);

    const historyId = item.historyId || item._id;
    api.get(`/projects/${projectId}/boq/history/${historyId}`)
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setViewingHistory(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, item, projectId]);

  if (!isOpen || !item || viewingHistory.length === 0) return null;

  const currentView = viewingHistory[selectedVersionIdx];
  if (!currentView) return null;

  // Determine if the user can approve the currently viewing item
  const isLocked = isProjectLocked(project);
  const isTargetApprover = String(user?.id || user?._id) === String(viewingHistory[0]?.requestedApprover);
  const canApproveThis = !isLocked && (canApprove || isTargetApprover || isAdmin);
  const showApprovalButtons = selectedVersionIdx === 0 && viewingHistory[0]?.status === 'Pending' && canApproveThis;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6">
      <div 
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden transform transition-all max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-5 flex items-start justify-between relative">
          <div className="pe-10">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">{tr("Item Details")}</h3>
            <p className="text-sm font-semibold text-slate-500 mt-0.5 line-clamp-1">
              {currentView.itemNumber || tr("BOQ Line Item")}
              {selectedVersionIdx !== 0 && tr(" [Archived Version]")}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-white border border-gray-200 text-slate-400 hover:text-gray-900 rounded-xl transition-all shadow-sm hover:shadow"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Version Tabs */}
        {viewingHistory.length > 1 && (
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {viewingHistory.map((v, i) => (
              <button
                key={v._id || i}
                onClick={() => setSelectedVersionIdx(i)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                  selectedVersionIdx === i 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                    : "bg-gray-100 text-slate-500 hover:bg-gray-200 hover:text-gray-900"
                )}
              >
                v{v.version || 1} {i === 0 && tr("(Latest)")}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{tr("Group Name")}</p>
                  <p className="text-sm font-semibold text-gray-900">{tr(currentView.groupName)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{tr("Description")}</p>
                  <p className="text-sm font-semibold text-gray-900">{tr(currentView.itemDescription)}</p>
                </div>
              </div>

              {/* Financials Grid */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{tr("Quantity")}</p>
                    <p className="text-sm font-semibold text-gray-900">{currentView.quantity} {tr(currentView.unit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{tr("Unit Cost")}</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(currentView.unitCost), projectCurrency(project))}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-s border-slate-200 sm:ps-4">
                    <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1">{tr("Total Amount")}</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(Number(currentView.totalCost), projectCurrency(project))}</p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {currentView.remark && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{tr("Remarks")}</p>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-sm text-slate-700 italic">"{tr(currentView.remark)}"</p>
                  </div>
                </div>
              )}

              {/* Rejection Reason - Highlighted */}
              {currentView.status === 'Rejected' && currentView.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">{tr("Rejection Reason")}</p>
                    <p className="text-sm font-semibold text-red-900 leading-snug">{tr(currentView.rejectionReason)}</p>
                  </div>
                </div>
              )}

              {/* Audit Trail */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                      {selectedVersionIdx === 0 ? tr("Last modified by") : tr("Created by")}
                    </p>
                    <p className="text-xs font-semibold text-gray-900">{currentView.createdByName || tr("System")}</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">
                    {currentView.createdAt ? new Date(currentView.createdAt).toLocaleString() : ''}
                  </p>
                </div>

                {currentView.status !== 'Pending' && currentView.status !== 'Draft' && (
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                        {tr(currentView.status)}{tr(" by")}
                      </p>
                      <p className="text-xs font-semibold text-gray-900">{currentView.approvedByName || tr("Authorized User")}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      {currentView.approvedAt ? new Date(currentView.approvedAt).toLocaleString() : ''}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
          {showApprovalButtons ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider text-center">{tr("Approval Required")}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => onUpdateStatus(viewingHistory[0], 'Rejected')}
                  disabled={isUpdating}
                  className="flex-1 flex justify-center items-center gap-2 py-3 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  {tr("Reject Item")}
                </button>
                <button
                  onClick={() => onUpdateStatus(viewingHistory[0], 'Approved')}
                  disabled={isUpdating}
                  className="flex-1 flex justify-center items-center gap-2 py-3 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {tr("Approve Item")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 justify-center text-slate-500">
              <Info className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {viewingHistory[0]?.status === 'Pending' 
                  ? tr("Pending with {{value}}", { value: viewingHistory[0]?.requestedApproverName || 'Authorized Approver' }) 
                  : (selectedVersionIdx === 0 ? tr("Viewing current version.") : tr("Viewing historical version."))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
