'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Upload, Trash2, CheckCircle2, XCircle,
  Clock, Eye, Send, Loader2, UserCheck, MessageSquare, PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';
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

// Helper to sanitize and resolve any raw encrypted/ObjectId names
function resolveApproverName(
  rawName?: string,
  userRef?: any,
  project?: any,
  fallback = 'Admin'
): string {
  const isInvalid = (str?: string) => {
    if (!str || typeof str !== 'string') return true;
    const t = str.trim();
    return (
      t.includes(':') ||
      /^[a-f0-9]{24}$/i.test(t) ||
      /^[a-f0-9]{16,}:[a-f0-9]{16,}$/i.test(t)
    );
  };

  // 1. If rawName is already clean
  if (!isInvalid(rawName)) {
    let clean = (rawName as string).trim();
    if (clean.includes('.')) {
      clean = clean.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return clean;
  }

  // 2. If userRef is populated user object
  if (userRef && typeof userRef === 'object') {
    if (!isInvalid(userRef.name)) {
      return userRef.name;
    }
    if (userRef.email) {
      const emailName = userRef.email.split('@')[0];
      return emailName.includes('.')
        ? emailName.split('.').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
        : emailName;
    }
  }

  // 3. Look up userRef in project members or project createdBy
  const userIdStr = typeof userRef === 'string' ? userRef : (userRef?._id || rawName);
  if (userIdStr && project) {
    const member = (project.members || []).find((m: any) => {
      const mId = m.user?._id || m.user || m._id;
      return mId && mId.toString() === userIdStr.toString();
    });
    if (member) {
      const mName = member.user?.name || member.name;
      if (!isInvalid(mName)) return mName;
      const mEmail = member.user?.email || member.email;
      if (mEmail) return mEmail.split('@')[0];
    }

    const creatorId = project.createdBy?._id || project.createdBy;
    if (creatorId && creatorId.toString() === userIdStr.toString()) {
      const cName = project.createdBy?.name;
      if (!isInvalid(cName)) return cName;
      const cEmail = project.createdBy?.email;
      if (cEmail) return cEmail.split('@')[0];
    }
  }

  return fallback;
}

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
  
  const isLocked = isProjectLocked(project);
  const canDeleteDocument = !isLocked && hasProjectPermission(user, project, 'plans:delete');
  const canCreatePlans = !isLocked && hasProjectPermission(user, project, 'plans:create');
  const canEditPlans = !isLocked && (hasProjectPermission(user, project, 'plans:update') || hasProjectPermission(user, project, 'plans:edit'));
  const canApprovePlans = !isLocked && hasProjectPermission(user, project, 'plans:approve');
  const canAssignPlans = !isLocked && hasProjectPermission(user, project, 'plans:assign');
  // Plan Annotations: counts and the Annotate button need View (or Create, to add the first pins)
  const canViewAnnotations = hasProjectPermission(user, project, 'annotations:view');
  const canOpenAnnotations = canViewAnnotations || (!isLocked && hasProjectPermission(user, project, 'annotations:create'));
  const isAdmin = user?.role?.name === 'Admin' || (user?.role?.permissions?.includes('*') ?? false);

  const fetchAnnotationCounts = useCallback(async () => {
    if (!canViewAnnotations) { setAnnotationCounts({}); return; }
    try {
      const res = await api.get(`/projects/${projectId}/folders/${folder._id}/annotations`);
      const counts: Record<string, number> = {};
      (res.data || []).forEach((ann: any) => {
        const docId = typeof ann.document === 'object' ? ann.document._id : ann.document;
        if (docId) counts[docId] = (counts[docId] || 0) + 1;
      });
      setAnnotationCounts(counts);
    } catch { /* annotations are optional */ }
  }, [projectId, folder._id, canViewAnnotations]);

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
      approvedByName: v?.approvedByName || doc.approvedByName,
      rejectedByName: v?.rejectedByName || doc.rejectedByName,
      approvedBy: v?.approvedBy || doc.approvedBy,
      rejectedBy: v?.rejectedBy || doc.rejectedBy,
      approvals: v?.approvals || doc.approvals || [],
      versionId: v?._id,
      versionNumber: v?.versionNumber,
    };
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors cursor-pointer mb-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>All Folders</span>
          </button>
          <h3 className="text-lg font-semibold text-slate-900 truncate">{folder.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {folder.documents?.length || 0} plan{folder.documents?.length !== 1 ? 's' : ''}
            {Object.keys(annotationCounts).length > 0 && (
              <> · <span className="text-blue-600 font-medium">{Object.values(annotationCounts).reduce((a, b) => a + b, 0)} annotations</span></>
            )}
          </p>
        </div>

        {!isLocked && canCreatePlans && (
          <label className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0',
            isUploading
              ? 'bg-blue-600 text-slate-400 pointer-events-none'
              : 'bg-blue-600 hover:bg-slate-800 text-white'
          )}>
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{isUploading ? 'Uploading…' : 'Upload Document'}</span>
            <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
          </label>
        )}
      </div>

      <div className="h-px bg-slate-200" />

      {/* ── Document list ── */}
      <div className="space-y-2">
        {folder.documents?.map((raw: any) => {
          const doc = mapDoc(raw);
          const annCount = annotationCounts[doc._id] || 0;
          const statusStyle = STATUS_STYLES[doc.approvalStatus] || STATUS_STYLES.Draft;

          return (
            <div
              key={doc._id}
              className="bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group/doc"
            >
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                {/* File icon */}
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 group-hover/doc:border-blue-200 transition-colors">
                  <FileIconSvg className="w-4 h-4 text-slate-400" />
                </div>

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-slate-900 truncate group-hover/doc:text-blue-600 transition-colors">
                      {doc.name}
                    </h4>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0', statusStyle)}>
                      {doc.approvalStatus}
                    </span>
                    {annCount > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-medium text-blue-700 shrink-0">
                        <MessageSquare className="w-2.5 h-2.5" />
                        {annCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400">
                      {new Date(doc.uploadedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {doc.size > 0 && (
                      <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[11px] text-slate-400">
                          {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </>
                    )}
                    {doc.versionNumber && (
                      <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[11px] text-slate-400">v{doc.versionNumber}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Approval workflow */}
                  {doc.approvalStatus === 'Draft' && canAssignPlans && (
                    <button
                      onClick={() => setApproverDocId(doc._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Send for Approval"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {doc.approvalStatus === 'Pending' && canApprovePlans && (
                    <>
                      <button
                        onClick={() => handleAction(doc._id, 'respond', { response: 'Approved', versionId: doc.versionId })}
                        disabled={isProcessing}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Approve"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleAction(doc._id, 'respond', { response: 'Rejected', versionId: doc.versionId })}
                        disabled={isProcessing}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Reject"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <div className="w-px h-5 bg-slate-200 mx-1" />

                  {/* View */}
                  <button
                    onClick={() => setViewingDoc(doc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="View plan"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Annotate — opens viewer in annotation mode */}
                  {projectId && canOpenAnnotations && (
                    <button
                      onClick={() => setAnnotatingDoc(doc)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                        annCount > 0
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                      )}
                      title="Open annotations"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      Annotate
                    </button>
                  )}

                  {canDeleteDocument && (
                    <>
                      <div className="w-px h-5 bg-slate-200 mx-1" />
                      <button
                        onClick={() => handleAction(doc._id, 'deleteDocument')}
                        disabled={isProcessing}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Approvals row */}
              {doc.approvals?.length > 0 ? (
                <div className="flex items-center gap-2 px-4 pb-3 pt-0 flex-wrap">
                  {doc.approvals.map((app: any, i: number) => {
                    const isApp = app.status === 'Approved';
                    const isRej = app.status === 'Rejected';
                    const rawName = app.userName || (isApp ? doc.approvedByName : isRej ? doc.rejectedByName : '') || app.userRole;
                    const approverName = resolveApproverName(rawName, app.user, project, app.userRole || 'Admin');
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium',
                          isApp ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isRej ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        {isApp ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Approved by <strong className="font-semibold text-emerald-900">{approverName}</strong></span>
                          </>
                        ) : isRej ? (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <span>Rejected by <strong className="font-semibold text-red-900">{approverName}</strong></span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Assigned to <strong className="font-semibold text-amber-900">{approverName}</strong></span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (doc.approvalStatus === 'Approved' || doc.approvalStatus === 'Rejected') && (
                <div className="flex items-center gap-2 px-4 pb-3 pt-0 flex-wrap">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium',
                      doc.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                    )}
                  >
                    {doc.approvalStatus === 'Approved' ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Approved by <strong className="font-semibold text-emerald-900">{resolveApproverName(doc.approvedByName, doc.approvedBy, project, 'Admin')}</strong></span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Rejected by <strong className="font-semibold text-red-900">{resolveApproverName(doc.rejectedByName, doc.rejectedBy, project, 'Admin')}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {(!folder.documents || folder.documents.length === 0) && (
          <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-xl bg-white">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">No plans uploaded yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
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
        folderId={folder._id}
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
