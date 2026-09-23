'use client';

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  MessageSquare,
  History,
  File as FileIcon,
  CheckCircle2,
  XCircle,
  Trash2,
  Layers,
  User,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { uploadToCloudinary } from '@/lib/upload';
import { motion, AnimatePresence } from 'framer-motion';
import { detectFileType, getFileBadgeInfo } from './InteriorUploadDesignModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  drawing: any;
  onSuccess: () => void;
  users?: any[];
}

function userLabel(u: any) {
  const name = u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || 'Team Member';
  const roleName = u.role?.name || u.role || 'Reviewer';
  return `${name} (${roleName})`;
}

export const InteriorUploadRevisionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customerId,
  drawing,
  onSuccess,
  users = []
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [assignedReviewer, setAssignedReviewer] = useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setCustomName('');
      setRevisionNotes('');
      setAssignedReviewer('');
    } else if (drawing) {
      setCustomName(drawing.name || '');
      setAssignedReviewer(
        drawing.assignedReviewer?._id || drawing.assignedReviewer?.id || drawing.assignedReviewer || ''
      );
    }
  }, [isOpen, drawing]);

  if (!isOpen || !drawing) return null;

  const drawingId = drawing._id || drawing.id;
  const currentVersion = drawing.currentVersion || 1;
  const nextVersion = currentVersion + 1;
  const versions = drawing.versions || [];
  const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
  const clientStatus = drawing.clientStatus || latestVersion?.clientStatus;
  const clientFeedback = drawing.clientFeedback || latestVersion?.clientFeedback;
  const internalNotes = drawing.internalNotes || latestVersion?.internalNotes;
  const rejectionReason = drawing.rejectionReason || drawing.internalNotes || latestVersion?.rejectionReason || latestVersion?.internalNotes;
  const approvalStatus = drawing.approvalStatus || latestVersion?.approvalStatus || drawing.status;
  const badgeInfo = getFileBadgeInfo(drawing.name || 'Drawing', drawing.category || 'Drawing');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!customName || customName === drawing.name) {
        setCustomName(file.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a revision drawing file to upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cloudinaryUrl = await uploadToCloudinary(selectedFile);
      const fileType = detectFileType(selectedFile.name);

      const assignedUserObj = users.find(
        (u) => (u._id || u.id || u.clerkUserId) === assignedReviewer
      );
      const assignedReviewerName = assignedUserObj
        ? assignedUserObj.fullName || `${assignedUserObj.firstName || ''} ${assignedUserObj.lastName || ''}`.trim() || assignedUserObj.name
        : undefined;

      await interiorCrmService.uploadDrawingVersion(customerId, drawingId, {
        name: customName.trim() || selectedFile.name,
        url: cloudinaryUrl,
        fileType,
        category: drawing.category || '2D Layout',
        internalNotes: revisionNotes.trim() || undefined,
        assignedReviewer: assignedReviewer || undefined,
        assignedReviewerName: assignedReviewerName
      });

      toast.success(`Revision v${nextVersion} uploaded successfully and sent for review!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to upload revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Upload Revision (v{nextVersion})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload an updated design version & assign a team member for approval
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto bg-white custom-scrollbar">
            {/* Drawing Meta */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {drawing.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${badgeInfo.color}`}>
                      {badgeInfo.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      Current: <span className="font-semibold text-slate-700">v{currentVersion}</span> &rarr; <strong className="text-indigo-600 font-extrabold">New: v{nextVersion}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Rejection Reason (If internally rejected) */}
            {(approvalStatus === 'internally_rejected' || rejectionReason) && (
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wide">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Internal Rejection Reason & Required Changes:
                </div>
                <p className="text-sm text-rose-950 bg-white p-3 rounded-lg border border-rose-200 shadow-2xs font-medium">
                  {rejectionReason || internalNotes || 'Drawing was rejected during internal review and requires modifications.'}
                </p>
              </div>
            )}

            {/* Client Rejection / Feedback (If client requested changes) */}
            {(clientStatus === 'client_changes_requested' || clientFeedback) && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wide">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  Client Feedback to Address:
                </div>
                <p className="text-sm text-amber-950 bg-white p-3 rounded-lg border border-amber-200 shadow-2xs font-medium">
                  {clientFeedback || 'Client requested modifications on the previous version.'}
                </p>
              </div>
            )}

            {/* File Upload Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Upload Revised Drawing / Model File <span className="text-rose-500">*</span>
              </label>

              {!selectedFile ? (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-50/60 hover:bg-indigo-50/20 transition group">
                  <div className="p-3 bg-white rounded-xl shadow-2xs border border-slate-200 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Click to select or drag and drop revised file
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    DWG, DXF, SKP, OBJ, FBX, PDF, JPG, PNG (Max 50MB)
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".dwg,.dxf,.skp,.obj,.fbx,.blend,.rvt,.pdf,.jpg,.jpeg,.png,.webp,.zip,.rar"
                  />
                </label>
              ) : (
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-100 text-indigo-600 shadow-2xs">
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {detectFileType(selectedFile.name).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Assign Reviewer Dropdown */}
            {users.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Send for Approval To (Team Member / Lead Architect)
                </label>
                <select
                  value={assignedReviewer}
                  onChange={(e) => setAssignedReviewer(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium cursor-pointer"
                >
                  <option value="">-- Select Team Member to Review (Optional) --</option>
                  {users.map((u) => {
                    const uId = u._id || u.id || u.clerkUserId;
                    return (
                      <option key={uId} value={uId}>
                        {userLabel(u)}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Custom Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Drawing Title / Label
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Master Bedroom 3D Render - Revised Layout"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs font-medium"
              />
            </div>

            {/* Revision Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Revision Changelog / Notes
              </label>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Describe what changes were made in this version (e.g., updated lighting fixtures as per client feedback)..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs resize-none font-medium"
              />
            </div>

            {/* Workflow Notice */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Uploading a revision will set this drawing's status to <strong>Pending Internal Approval</strong>. Your assigned team member will review it before publishing to the client portal.
              </span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-md shadow-indigo-600/20 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                {isSubmitting ? 'Uploading Revision...' : `Send v${nextVersion} for Approval`}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
