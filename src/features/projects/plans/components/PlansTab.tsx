'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FolderPlus, MoreVertical, FileText, ChevronRight,
  CheckCircle2, XCircle, Clock, X, Loader2, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { PlanRoom } from '@/features/projects/plans/components/PlanRoom';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { hasProjectPermission, isProjectLocked } from '@/lib/permissions';

interface PlansTabProps {
  projectId: string;
}

export const PlansTab: React.FC<PlansTabProps> = ({ projectId }) => {
  const [folders, setFolders]                     = useState<any[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [selectedFolderId, setSelectedFolderId]   = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName]         = useState('');
  const [isCreating, setIsCreating]               = useState(false);
  const [folderMenuId, setFolderMenuId]           = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder]       = useState<{ _id: string; name: string } | null>(null);

  const toast = useToast();
  const { user } = useAuth();
  const { project } = useProjectContext();
  const isAdmin = user?.role?.name === 'Admin' || (user?.role?.permissions?.includes('*') ?? false);
  const isLocked = isProjectLocked(project);
  const canView = isAdmin || hasProjectPermission(user, project, 'plans:view');
  const canCreate = !isLocked && (isAdmin || hasProjectPermission(user, project, 'plans:create'));
  const canUpdate = !isLocked && (isAdmin || hasProjectPermission(user, project, 'plans:update') || hasProjectPermission(user, project, 'plans:edit'));
  const canDelete = !isLocked && (isAdmin || hasProjectPermission(user, project, 'plans:delete'));

  const fetchFolders = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/folders`);
      setFolders(res.data?.data || res.data || []);
    } catch {
      setFolders([]);
      toast.error('Failed to load plan folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFolders(); }, [projectId]);

  useEffect(() => {
    if (!folderMenuId) return;
    const close = () => setFolderMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [folderMenuId]);

  const handleDeleteFolder = async (id: string) => {
    setFolderMenuId(null);
    if (isLocked) { toast.error('This project is locked and can no longer be modified.'); return; }
    if (!window.confirm('Delete this folder and all its documents?')) return;
    try {
      await api.delete(`/projects/${projectId}/folders/${id}`);
      toast.success('Folder deleted');
      if (selectedFolderId === id) setSelectedFolderId(null);
      fetchFolders();
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFolder) return;
    if (isLocked) { toast.error('This project is locked and can no longer be modified.'); return; }
    try {
      await api.patch(`/projects/${projectId}/folders/${renamingFolder._id}`, { name: renamingFolder.name });
      toast.success('Folder renamed');
      setRenamingFolder(null);
      fetchFolders();
    } catch {
      toast.error('Failed to rename folder');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (isLocked) { toast.error('This project is locked and can no longer be modified.'); return; }
    setIsCreating(true);
    try {
      await api.post(`/projects/${projectId}/folders`, { name: newFolderName });
      toast.success('Folder created');
      setNewFolderName('');
      setIsCreateModalOpen(false);
      fetchFolders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  const selectedFolder = folders.find(f => f._id === selectedFolderId);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-slate-500">You don't have permission to view Design.</p>
      </div>
    );
  }

  return (
    <SkeletonLoader loading={loading} preset="list">
      {/* AnimatePresence mode="wait" smoothly swaps folder grid ↔ PlanRoom
          instead of an abrupt full remount that caused the screen flicker */}
      <AnimatePresence mode="wait" initial={false}>
        {selectedFolderId && selectedFolder ? (
          <motion.div
            key="plan-room"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <PlanRoom
              folder={selectedFolder}
              projectId={projectId}
              onBack={() => setSelectedFolderId(null)}
              onUpdate={() => fetchFolders()}
            />
          </motion.div>
        ) : (
          <motion.div
            key="folder-grid"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Design</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                    {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {folders.length > 0
                    ? `${folders.reduce((n, f) => n + (f.documents?.length || 0), 0)} plans across ${folders.length} folder${folders.length !== 1 ? 's' : ''}`
                    : 'Create folders to organise your drawings and plans.'}
                </p>
              </div>
              {canCreate && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>New Folder</span>
                </button>
              )}
            </div>

            {/* Folder grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {folders.map(folder => {
                const docCount  = folder.documents?.length || 0;
                const approved  = folder.documents?.filter((d: any) => (d.versions?.at(-1)?.approvalStatus || d.approvalStatus) === 'Approved').length || 0;
                const pending   = folder.documents?.filter((d: any) => (d.versions?.at(-1)?.approvalStatus || d.approvalStatus) === 'Pending').length  || 0;
                const rejected  = folder.documents?.filter((d: any) => (d.versions?.at(-1)?.approvalStatus || d.approvalStatus) === 'Rejected').length || 0;

                return (
                  <div
                    key={folder._id}
                    className="bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer overflow-hidden group/folder"
                    onClick={() => setSelectedFolderId(folder._id)}
                  >
                    {/* Card body */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          {(canUpdate || canDelete) && (
                          <button
                            onClick={() => setFolderMenuId(folderMenuId === folder._id ? null : folder._id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          )}
                          {folderMenuId === folder._id && (
                            <div className="absolute right-0 top-8 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                              {canUpdate && (
                              <button
                                onClick={() => { setRenamingFolder({ _id: folder._id, name: folder.name }); setFolderMenuId(null); }}
                                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                Rename
                              </button>
                              )}
                              {canDelete && (
                              <button
                                onClick={() => handleDeleteFolder(folder._id)}
                                className="w-full px-3.5 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="font-semibold text-slate-900 text-sm mb-0.5 group-hover/folder:text-blue-600 transition-colors truncate">
                        {folder.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">{docCount} plan{docCount !== 1 ? 's' : ''}</p>

                      {/* Approval mini-indicators */}
                      {docCount > 0 && (
                        <div className="flex items-center gap-3 mt-2.5">
                          {approved > 0 && (
                            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              {approved}
                            </div>
                          )}
                          {pending > 0 && (
                            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                              <Clock className="w-3 h-3" />
                              {pending}
                            </div>
                          )}
                          {rejected > 0 && (
                            <div className="flex items-center gap-1 text-[11px] font-medium text-red-500">
                              <XCircle className="w-3 h-3" />
                              {rejected}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
                      <div className="flex -space-x-1.5">
                        {folder.documents?.slice(0, 4).map((_: any, i: number) => (
                          <div key={i} className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                            <FileText className="w-2.5 h-2.5 text-slate-400" />
                          </div>
                        ))}
                        {docCount > 4 && (
                          <div className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <span className="text-[8px] font-semibold text-slate-400">+{docCount - 4}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-blue-600 group-hover/folder:gap-1.5 transition-all">
                        <span>Open</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {folders.length === 0 && (
                <div className="md:col-span-2 lg:col-span-3 py-16 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-xl bg-white">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                    <Folder className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">No folders yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Create a folder to start organising technical drawings and plans.
                  </p>
                  {canCreate && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <FolderPlus className="w-4 h-4" />
                      New Folder
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rename modal ── */}
      <AnimatePresence>
        {renamingFolder && (
          <motion.div
            key="rename-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setRenamingFolder(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-slate-900">Rename Folder</h3>
                  <button onClick={() => setRenamingFolder(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleRenameFolder} className="space-y-4">
                  <input
                    type="text" required autoFocus
                    value={renamingFolder.name}
                    onChange={e => setRenamingFolder(f => f ? { ...f, name: e.target.value } : f)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button" onClick={() => setRenamingFolder(null)}
                      className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors text-sm cursor-pointer"
                    >
                      Rename
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create modal ── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            key="create-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-slate-900">New Design Folder</h3>
                  <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Folder Name</label>
                    <input
                      type="text" required autoFocus
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="e.g. Architectural Drawings"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button" onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" disabled={isCreating}
                      className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isCreating ? 'Creating…' : 'Create Folder'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SkeletonLoader>
  );
};
