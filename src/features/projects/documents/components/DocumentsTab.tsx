'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Files,
  Upload,
  Trash2,
  Download,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileImage,
  Film,
  Plus,
  X,
  FolderOpen,
  Folder,
  Check,
  Search,
  ArrowLeft,
  Calendar,
  ChevronRight,
  AlertTriangle,
  Flag,
  Map,
  Receipt,
  BarChart2,
  User,
  Filter,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasProjectPermission } from '@/lib/permissions';
import { useProjectContext } from '../../contexts/ProjectContext';

interface Doc {
  _id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  status?: 'Pending' | 'Approved' | 'Rejected';
  uploadedAt: string;
  uploadedBy?: { name: string; user?: string; _id?: string };
}

interface VirtualFolder {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  documents: Doc[];
}

function fileIcon(mimeType: string) {
  if (mimeType?.startsWith('image/')) return FileImage;
  if (mimeType?.startsWith('video/')) return Film;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return FileSpreadsheet;
  return FileText;
}

function fmtSize(bytes: number) {
  if (!bytes) return '—';
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

interface DocumentsTabProps {
  projectId: string;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ projectId }) => {
  const [projectDocs, setProjectDocs] = useState<Doc[]>([]);
  const [virtualFolders, setVirtualFolders] = useState<VirtualFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending' | 'Rejected'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const toast = useToast();
  const { user } = useAuth();
  const { project } = useProjectContext();
  const canUpload = hasProjectPermission(user, project, 'land:create');
  const canApprove = hasProjectPermission(user, project, 'land:approve');
  const canDelete = hasProjectPermission(user, project, 'land:delete');
  const isAdmin = hasProjectPermission(user, project, 'land:delete');

  const fetchDocs = async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProjectDocs(Array.isArray(res.data.documents) ? res.data.documents : []);
    } catch {
      setProjectDocs([]);
    }
  };

  const fetchModuleDocuments = async () => {
    setIsLoadingFolders(true);
    try {
      const [txRes, matRes, snagRes, mileRes, progRes, survRes] = await Promise.all([
        api.get(`/projects/${projectId}/transactions`).catch(() => null),
        api.get(`/projects/${projectId}/material-purchase`).catch(() => null),
        api.get(`/projects/${projectId}/snags`).catch(() => null),
        api.get(`/projects/${projectId}/milestones`).catch(() => null),
        api.get(`/projects/${projectId}/work-progress`).catch(() => null),
        api.get(`/projects/${projectId}/survey`).catch(() => null)
      ]);

      const txDocs: Doc[] = [];
      if (txRes && Array.isArray(txRes.data)) {
        txRes.data.forEach((t: any) => {
          if (t.invoiceUrl) {
            txDocs.push({
              _id: t._id,
              name: `Invoice ${t.type || 'Transaction'}`,
              url: t.invoiceUrl,
              uploadedAt: t.createdAt,
              size: 0,
              mimeType: 'application/pdf',
              status: 'Approved',
              uploadedBy: { name: 'System' }
            });
          }
        });
      }
      if (matRes && Array.isArray(matRes.data)) {
        matRes.data.forEach((t: any) => {
          if (t.invoiceUrl) {
            txDocs.push({
              _id: t._id,
              name: `Material Invoice`,
              url: t.invoiceUrl,
              uploadedAt: t.createdAt,
              size: 0,
              mimeType: 'application/pdf',
              status: 'Approved',
              uploadedBy: { name: 'System' }
            });
          }
        });
      }

      const snagDocs: Doc[] = [];
      if (snagRes && Array.isArray(snagRes.data)) {
        snagRes.data.forEach((s: any) => {
          if (s.images && s.images.length > 0) {
            s.images.forEach((img: string, idx: number) => {
              snagDocs.push({
                _id: `${s._id}_${idx}`,
                name: `${s.title} Photo ${idx + 1}`,
                url: img,
                uploadedAt: s.createdAt,
                size: 0,
                mimeType: 'image/jpeg',
                status: 'Approved',
                uploadedBy: { name: 'System' }
              });
            });
          }
          if (s.resolutionImage) {
            snagDocs.push({
              _id: `${s._id}_res`,
              name: `${s.title} Resolution`,
              url: s.resolutionImage,
              uploadedAt: s.updatedAt || s.createdAt,
              size: 0,
              mimeType: 'image/jpeg',
              status: 'Approved',
              uploadedBy: { name: 'System' }
            });
          }
        });
      }

      const mileDocs: Doc[] = [];
      if (mileRes && Array.isArray(mileRes.data)) {
        mileRes.data.forEach((m: any) => {
          if (m.tasks) {
            m.tasks.forEach((t: any) => {
              if (t.proofImage && t.proofImage.url) {
                mileDocs.push({
                  _id: t._id,
                  name: `${t.title} Proof`,
                  url: t.proofImage.url,
                  uploadedAt: t.proofImage.uploadedAt || m.createdAt,
                  size: 0,
                  mimeType: 'image/jpeg',
                  status: 'Approved',
                  uploadedBy: { name: 'System' }
                });
              }
            });
          }
        });
      }

      const progDocs: Doc[] = [];
      if (progRes && Array.isArray(progRes.data)) {
        progRes.data.forEach((p: any) => {
          if (p.photos && p.photos.length > 0) {
            p.photos.forEach((img: string, idx: number) => {
              progDocs.push({
                _id: `${p._id}_${idx}`,
                name: `Progress Photo ${idx + 1}`,
                url: img,
                uploadedAt: p.createdAt,
                size: 0,
                mimeType: 'image/jpeg',
                status: 'Approved',
                uploadedBy: { name: 'System' }
              });
            });
          }
        });
      }

      const survDocs: Doc[] = [];
      if (survRes && survRes.data) {
        const survey = survRes.data;
        if (survey.attachments) {
          survey.attachments.forEach((a: any, idx: number) => {
            survDocs.push({
              _id: `${survey._id}_a${idx}`,
              name: a.name || 'Survey Attachment',
              url: a.url,
              uploadedAt: survey.createdAt,
              size: 0,
              mimeType: 'application/octet-stream',
              status: 'Approved',
              uploadedBy: { name: 'System' }
            });
          });
        }
        if (survey.observationImage && survey.observationImage.url) {
          survDocs.push({
            _id: `${survey._id}_obs`,
            name: 'Observation Image',
            url: survey.observationImage.url,
            uploadedAt: survey.createdAt,
            size: 0,
            mimeType: 'image/jpeg',
            status: 'Approved',
            uploadedBy: { name: 'System' }
          });
        }
        if (survey.additionalPhotos) {
          survey.additionalPhotos.forEach((img: string, idx: number) => {
            survDocs.push({
              _id: `${survey._id}_p${idx}`,
              name: `Additional Photo ${idx + 1}`,
              url: img,
              uploadedAt: survey.createdAt,
              size: 0,
              mimeType: 'image/jpeg',
              status: 'Approved',
              uploadedBy: { name: 'System' }
            });
          });
        }
      }

      const folders: VirtualFolder[] = [];
      if (txDocs.length > 0) {
        folders.push({
          id: 'transactions',
          name: 'Transactions',
          icon: Receipt,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 border-emerald-100',
          documents: txDocs
        });
      }
      if (snagDocs.length > 0) {
        folders.push({
          id: 'snagging',
          name: 'Snagging',
          icon: AlertTriangle,
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-100',
          documents: snagDocs
        });
      }
      if (mileDocs.length > 0) {
        folders.push({
          id: 'milestones',
          name: 'Milestones',
          icon: Flag,
          color: 'text-purple-600',
          bg: 'bg-purple-50 border-purple-100',
          documents: mileDocs
        });
      }
      if (progDocs.length > 0) {
        folders.push({
          id: 'progress',
          name: 'Work Progress',
          icon: BarChart2,
          color: 'text-sky-600',
          bg: 'bg-sky-50 border-sky-100',
          documents: progDocs
        });
      }
      if (survDocs.length > 0) {
        folders.push({
          id: 'survey',
          name: 'Site Survey',
          icon: Map,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50 border-indigo-100',
          documents: survDocs
        });
      }

      setVirtualFolders(folders);
    } catch (err) {
      console.error('Error fetching module documents:', err);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  useEffect(() => {
    const initFetch = async () => {
      setLoading(true);
      await Promise.all([fetchDocs(), fetchModuleDocuments()]);
      setLoading(false);
    };
    initFetch();
  }, [projectId]);

  const openUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setIsModalOpen(true);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(pendingFile);
      await api.post(`/projects/${projectId}/documents`, {
        url,
        name: pendingFile.name,
        mimeType: pendingFile.type,
        size: pendingFile.size,
      });
      toast.success('Document uploaded successfully');
      setIsModalOpen(false);
      setPendingFile(null);
      fetchDocs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/projects/${projectId}/documents/${docId}`);
      toast.success('Document deleted');
      fetchDocs();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleAction = async (docId: string, action: 'Approved' | 'Rejected') => {
    try {
      await api.patch(`/projects/${projectId}/documents/${docId}/action`, { action });
      toast.success(`Document ${action.toLowerCase()} successfully`);
      fetchDocs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action.toLowerCase()} document`);
    }
  };

  const baseDocuments = useMemo(() => {
    if (activeFolderId === 'project_docs') return projectDocs;
    const vFolder = virtualFolders.find(f => f.id === activeFolderId);
    return vFolder ? vFolder.documents : [];
  }, [activeFolderId, projectDocs, virtualFolders]);

  const filteredDocuments = useMemo(() => {
    return baseDocuments.filter(doc => {
      const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const docStatus = doc.status || 'Pending';
      const matchesStatus = statusFilter === 'All' || docStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [baseDocuments, searchQuery, statusFilter]);

  const activeFolderName = useMemo(() => {
    if (activeFolderId === 'project_docs') return 'Project Documents';
    const vFolder = virtualFolders.find(f => f.id === activeFolderId);
    return vFolder ? vFolder.name : '';
  }, [activeFolderId, virtualFolders]);

  return (
    <SkeletonLoader loading={loading} preset="list">
      <div className="space-y-6">
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {activeFolderId !== null && (
              <button
                onClick={() => {
                  setActiveFolderId(null);
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-slate-500 hover:text-gray-900 hover:bg-gray-100 transition-all mr-1"
                title="Back to Folders"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {activeFolderId === null ? 'Project Documents' : activeFolderName}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {activeFolderId === null
                  ? 'Access project uploads and generated attachments across modules.'
                  : `Browsing files in ${activeFolderName}`}
              </p>
            </div>
          </div>

          {/* Upload Button (only inside local project documents folder) */}
          {activeFolderId === 'project_docs' && canUpload && (
            <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 border border-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all cursor-pointer w-fit">
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
              <input type="file" className="hidden" onChange={openUpload} />
            </label>
          )}
        </div>

        {/* Root View - Folders Grid */}
        {activeFolderId === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Project Documents Card */}
            <GlassCard
              onClick={() => setActiveFolderId('project_docs')}
              className="p-6 border-gray-200 hover:border-blue-500/40 cursor-pointer group transition-all flex flex-col justify-between"
              gradient
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Folder className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
              </div>
              <div className="mt-6">
                <h4 className="text-base font-bold text-gray-900 leading-tight">Project Documents</h4>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {projectDocs.length} Asset{projectDocs.length !== 1 ? 's' : ''}
                </p>
              </div>
            </GlassCard>

            {/* Loading virtual folders skeleton / items */}
            {isLoadingFolders ? (
              <div className="col-span-full py-12 flex justify-center items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-sm font-semibold text-slate-400">Scanning modules for documents...</span>
              </div>
            ) : (
              virtualFolders.map(folder => {
                const FolderIcon = folder.icon;
                return (
                  <GlassCard
                    key={folder.id}
                    onClick={() => setActiveFolderId(folder.id)}
                    className="p-6 border-gray-200 hover:border-blue-500/40 cursor-pointer group transition-all flex flex-col justify-between"
                    gradient
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors", folder.bg)}>
                        <FolderIcon className="w-6 h-6" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                    </div>
                    <div className="mt-6">
                      <h4 className="text-base font-bold text-gray-900 leading-tight">{folder.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 font-medium">
                        {folder.documents.length} Asset{folder.documents.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        ) : (
          /* Active Folder View */
          <div className="space-y-6">
            {/* Search & Filter Options */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition-all',
                  showFilters
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-slate-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-1.5"
                  >
                    {['All', 'Approved', 'Pending', 'Rejected'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status as any)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
                          statusFilter === status
                            ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm'
                            : 'bg-white border-gray-100 text-slate-400 hover:text-gray-600'
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Folder Metrics (Project Docs only) */}
            {activeFolderId === 'project_docs' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Files', value: projectDocs.length, color: 'text-blue-600' },
                  { label: 'Approved', value: projectDocs.filter(d => d.status === 'Approved').length, color: 'text-emerald-600' },
                  { label: 'Pending', value: projectDocs.filter(d => d.status === 'Pending' || !d.status).length, color: 'text-amber-600' },
                  { label: 'Rejected', value: projectDocs.filter(d => d.status === 'Rejected').length, color: 'text-rose-600' },
                ].map((s, i) => (
                  <GlassCard key={i} className="p-4 border-gray-200" gradient>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                  </GlassCard>
                ))}
              </div>
            )}

            {/* Documents List */}
            <GlassCard className="p-0 border-gray-200 overflow-hidden" gradient>
              {filteredDocuments.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <FolderOpen className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-slate-500 font-medium">No documents found.</p>
                  <p className="text-slate-400 text-sm mt-1">No files match the selected filter/search criteria.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Table header */}
                  <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_80px_100px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
                    {['Name', 'Status', 'Uploaded', 'Size', '', ''].map((h, i) => (
                      <span key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                    ))}
                  </div>

                  {filteredDocuments.map(doc => {
                    const Icon = fileIcon(doc.mimeType);
                    const isUploader = doc.uploadedBy?._id === user?._id || doc.uploadedBy?.user === user?._id;
                    const canManageApproval = canApprove && (!isUploader || isAdmin);

                    return (
                      <div key={doc._id} className="grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_80px_100px] gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors group">
                        {/* Name */}
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{doc.name}</p>
                            {doc.uploadedBy?.name && (
                              <p className="text-[10px] text-slate-400">{doc.uploadedBy.name}</p>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit',
                          doc.status === 'Approved' && 'bg-emerald-100 border-emerald-200 text-emerald-700',
                          doc.status === 'Rejected' && 'bg-rose-100 border-rose-200 text-rose-700',
                          (doc.status === 'Pending' || !doc.status) && 'bg-amber-100 border-amber-200 text-amber-700'
                        )}>
                          {doc.status || 'Pending'}
                        </span>

                        {/* Date */}
                        <span className="text-xs text-slate-500">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>

                        {/* Size */}
                        <span className="text-xs font-semibold text-slate-500">{fmtSize(doc.size)}</span>

                        {/* Empty cell */}
                        <span />

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {activeFolderId === 'project_docs' && (doc.status === 'Pending' || !doc.status) && canManageApproval && (
                            <>
                              <button
                                onClick={() => handleAction(doc._id, 'Approved')}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAction(doc._id, 'Rejected')}
                                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="Download / View"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          {activeFolderId === 'project_docs' && isAdmin && (
                            <button
                              onClick={() => handleDelete(doc._id, doc.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>
        )}
      </div>

      {/* Upload confirmation modal */}
      <AnimatePresence>
        {isModalOpen && pendingFile && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsModalOpen(false); setPendingFile(null); }}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md relative z-10"
            >
              <GlassCard className="p-8 border-gray-200" gradient>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                      <Files className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Upload Document</h3>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{pendingFile.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setIsModalOpen(false); setPendingFile(null); }}
                    className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="pt-2 flex space-x-3">
                    <button
                      type="button"
                      onClick={() => { setIsModalOpen(false); setPendingFile(null); }}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Upload</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SkeletonLoader>
  );
};
