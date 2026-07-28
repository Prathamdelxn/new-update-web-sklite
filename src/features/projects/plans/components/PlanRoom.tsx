'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Upload, FileText, Trash2, CheckCircle2, XCircle,
  Clock, Eye, Send, Loader2, UserCheck, MessageSquare, PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission } from '@/lib/permissions';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { DocumentViewer } from '@/features/projects/documents/components/DocumentViewer';
import { UserPickerModal } from '@/components/modals/UserPickerModal';
import { PlanAnnotator } from './PlanAnnotator';

interface PlanRoomProps {
  folder: any;
  projectId: string;
  onBack: () => void;
  onUpdate: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  Approved: 'text-emerald-700 bg-emerald-50  border-emerald-200',
  Rejected: 'text-red-700    bg-red-50       border-red-200',
  Pending: 'text-amber-700  bg-amber-50     border-amber-200',
  Draft: 'text-slate-500  bg-gray-100     border-gray-200',
};

export const PlanRoom: React.FC<PlanRoomProps> = ({ folder, projectId, onBack, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [annotatingDoc, setAnnotatingDoc] = useState<any>(null);
  const [annotationCounts, setAnnotationCounts] = useState<Record<string, number>>({});
  const [approverDocId, setApproverDocId] = useState<string | null>(null);

  const toast = useToast();
  const { user } = useAuth();
  const { project } = useProjectContext();
  
  const canDeleteDocument = hasProjectPermission(user, project, 'plans:delete');
  const canCreatePlans = hasProjectPermission(user, project, 'plans:create');
  const canEditPlans = hasProjectPermission(user, project, 'plans:update') || hasProjectPermission(user, project, 'plans:edit');
  const isAdmin = user?.role?.name === 'Admin' || (user?.role?.permissions?.includes('*') ?? false);

  const fetchAnnotationCounts = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${projectId}/folders/${folder._id}/annotations`);
      const counts: Record<string, number> = {};
      (res.data || []).forEach((ann: any) => {
        const docId = typeof ann.document === 'object' ? ann.document._id : ann.document;
        if (docId) counts[docId] = (counts[docId] || 0) + 1;
      });
      setAnnotationCounts(counts);
    } catch { /* annotations are optional */ }
  }, [projectId, folder._id]);

  useEffect(() => {
    fetchAnnotationCounts();
  }, [fetchAnnotationCounts]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await api.put(`/projects/${projectId}/folders/${folder._id}`, {
        url, name: file.name, mimeType: file.type, size: file.size,
      });
      toast.success('Plan uploaded');
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAction = async (docId: string, action: string, extra: Record<string, any> = {}) => {
    setIsProcessing(true);
    try {
      await api.patch(`/projects/${projectId}/folders/${folder._id}`, { docId, action, ...extra });
      toast.success('Done');
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const mapDoc = (doc: any) => {
    const v = doc.versions?.at(-1);
    return {
      ...doc,
      url: v?.url || doc.url,
      uploadedAt: v?.uploadedAt || doc.uploadedAt || new Date(),
      size: v?.size || doc.size || 0,
      approvalStatus: v?.approvalStatus || doc.approvalStatus || 'Draft',
      approvals: v?.approvals || doc.approvals || [],
      versionId: v?._id,
      versionNumber: v?.versionNumber,
    };
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-gray-900 transition-colors group"
        >
          <div className="p-2 rounded-xl bg-gray-50 border border-gray-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm">All Folders</span>
        </button>

        <label className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all shadow-sm cursor-pointer',
          isUploading
            ? 'bg-gray-50 border-gray-200 text-slate-400 pointer-events-none'
            : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-500 shadow-blue-600/25'
        )}>
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{isUploading ? 'Uploading…' : 'Upload Plan'}</span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
        </label>
      </div>

      {/* ── Folder info bar ── */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black text-gray-900 truncate">{folder.name}</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {folder.documents?.length || 0} plan{folder.documents?.length !== 1 ? 's' : ''}
            {Object.keys(annotationCounts).length > 0 && (
              <> · <span className="text-blue-600 font-bold">{Object.values(annotationCounts).reduce((a, b) => a + b, 0)} annotations</span></>
            )}
          </p>
        </div>
      </div>

      {/* ── Document list ── */}
      <div className="space-y-3">
        {folder.documents?.map((raw: any) => {
          const doc = mapDoc(raw);
          const annCount = annotationCounts[doc._id] || 0;
          const statusStyle = STATUS_STYLES[doc.approvalStatus] || STATUS_STYLES.Draft;

          return (
            <div
              key={doc._id}
              className="bg-white border border-gray-200 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all group/doc"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* File icon */}
                <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 group-hover/doc:border-blue-200 transition-colors">
                  <FileIconSvg className="w-5 h-5 text-slate-400" />
                </div>

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-gray-900 truncate group-hover/doc:text-blue-700 transition-colors">
                      {doc.name}
                    </h4>
                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0', statusStyle)}>
                      {doc.approvalStatus}
                    </span>
                    {annCount > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-700 shrink-0">
                        <MessageSquare className="w-2.5 h-2.5" />
                        {annCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(doc.uploadedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {doc.size > 0 && (
                      <>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </>
                    )}
                    {doc.versionNumber && (
                      <>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[10px] text-slate-400 font-medium">v{doc.versionNumber}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Approval workflow */}
                  {doc.approvalStatus === 'Draft' && isAdmin && (
                    <button
                      onClick={() => setApproverDocId(doc._id)}
                      className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                      title="Send for Approval"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {doc.approvalStatus === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleAction(doc._id, 'respond', { response: 'Approved', versionId: doc.versionId })}
                        disabled={isProcessing}
                        className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAction(doc._id, 'respond', { response: 'Rejected', versionId: doc.versionId })}
                        disabled={isProcessing}
                        className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
                        title="Reject"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <div className="w-px h-6 bg-gray-200 mx-1" />

                  {/* View */}
                  <button
                    onClick={() => setViewingDoc(doc)}
                    className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-slate-400 hover:text-gray-700 hover:border-gray-300 transition-all"
                    title="View plan"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Annotate — opens viewer in annotation mode */}
                  {projectId && (
                    <button
                      onClick={() => setAnnotatingDoc(doc)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                        annCount > 0
                          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                          : 'bg-gray-50 border-gray-200 text-slate-500 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50'
                      )}
                      title="Open annotations"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      Annotate
                    </button>
                  )}

                  {isAdmin && (
                    <>
                      <div className="w-px h-6 bg-gray-200 mx-1" />
                      <button
                        onClick={() => handleAction(doc._id, 'deleteDocument')}
                        disabled={isProcessing}
                        className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Approvals row */}
              {doc.approvals?.length > 0 && (
                <div className="flex items-center gap-4 px-5 pb-3 pt-0 flex-wrap">
                  {doc.approvals.map((app: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className={cn(
                        'w-5 h-5 rounded-lg flex items-center justify-center',
                        app.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                          app.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      )}>
                        {app.status === 'Approved' ? <UserCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{app.userName}</span>
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-widest',
                        app.status === 'Approved' ? 'text-emerald-600' :
                          app.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                      )}>{app.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {(!folder.documents || folder.documents.length === 0) && (
          <div className="py-24 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-3xl">
            <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-5">
              <Upload className="w-8 h-8 text-gray-300" />
            </div>
            <h4 className="text-base font-bold text-slate-500">No plans uploaded yet</h4>
            <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
              Upload your first drawing or plan using the button above.
            </p>
          </div>
        )}
      </div>

      <DocumentViewer
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
        projectId={projectId}
      />

      <PlanAnnotator
        isOpen={!!annotatingDoc}
        onClose={() => setAnnotatingDoc(null)}
        document={annotatingDoc}
        projectId={projectId}
        folderId={folder._id}
        onUpdate={() => {
          fetchAnnotationCounts();
          onUpdate();
        }}
      />

      <UserPickerModal
        isOpen={!!approverDocId}
        onClose={() => setApproverDocId(null)}
        onSelect={(userIds) => {
          if (approverDocId) handleAction(approverDocId, 'sendForApproval', { approverIds: userIds });
          setApproverDocId(null);
        }}
        title="Select Approvers"
        description="Choose who must review and approve this plan."
        confirmLabel="Send for Approval"
        accentColor="blue"
        endpoint={`/projects/${projectId}/plan-approvers`}
      />
    </div>
  );
};

const FileIconSvg = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
