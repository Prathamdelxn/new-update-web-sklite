'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FolderPlus, MoreVertical, FileText, ChevronRight,
  CheckCircle2, XCircle, Clock, X, Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import api from '@/services/api.client';
import { useToast } from '@/providers/ToastContext';
import { PlanRoom } from '@/features/projects/plans/components/PlanRoom';

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

  const fetchFolders = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/folders`);
      setFolders(res.data);
    } catch {
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
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Technical Plans & Drawings</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {folders.length > 0
                    ? `${folders.length} folder${folders.length !== 1 ? 's' : ''} · ${folders.reduce((n, f) => n + (f.documents?.length || 0), 0)} plans`
                    : 'Create folders to organise your drawings and plans.'}
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Folder</span>
              </button>
            </div>

            {/* Folder grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {folders.map(folder => {
                const docCount  = folder.documents?.length || 0;
                const approved  = folder.documents?.filter((d: any) => (d.versions?.at(-1)?.approvalStatus || d.approvalStatus) === 'Approved').length || 0;
                const pending   = folder.documents?.filter((d: any) => (d.versions?.at(-1)?.approvalStatus || d.approvalStatus) === 'Pending').length  || 0;
                const rejected  = folder.documents?.filter((d: any) => (d.versions?.at(-1)?.approvalStatus || d.approvalStatus) === 'Rejected').length || 0;

                return (
                  <GlassCard
                    key={folder._id}
                    className="p-0 overflow-hidden border-gray-200 group/folder hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    gradient
                    onClick={() => setSelectedFolderId(folder._id)}
                  >
                    {/* Card body */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 group-hover/folder:bg-blue-100 transition-colors">
                          <Folder className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setFolderMenuId(folderMenuId === folder._id ? null : folder._id)}
                            className="p-1.5 text-slate-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {folderMenuId === folder._id && (
                            <div className="absolute right-0 top-8 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                              <button
                                onClick={() => { setRenamingFolder({ _id: folder._id, name: folder.name }); setFolderMenuId(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleDeleteFolder(folder._id)}
                                className="w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="text-base font-black text-gray-900 mb-0.5 group-hover/folder:text-blue-700 transition-colors truncate">
                        {folder.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">{docCount} plan{docCount !== 1 ? 's' : ''}</p>

                      {/* Approval mini-indicators */}
                      {docCount > 0 && (
                        <div className="flex items-center gap-3 mt-3">
                          {approved > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              {approved}
                            </div>
                          )}
                          {pending > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                              <Clock className="w-3 h-3" />
                              {pending}
                            </div>
                          )}
                          {rejected > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                              <XCircle className="w-3 h-3" />
                              {rejected}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                      <div className="flex -space-x-1.5">
                        {folder.documents?.slice(0, 4).map((_: any, i: number) => (
                          <div key={i} className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                            <FileText className="w-2.5 h-2.5 text-slate-400" />
                          </div>
                        ))}
                        {docCount > 4 && (
                          <div className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span className="text-[8px] font-black text-slate-400">+{docCount - 4}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover/folder:gap-2 transition-all">
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </GlassCard>
                );
              })}

              {folders.length === 0 && (
                <div className="md:col-span-2 lg:col-span-3 py-24 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-200 rounded-3xl">
                  <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-5">
                    <Folder className="w-8 h-8 text-gray-300" />
                  </div>
                  <h4 className="text-base font-bold text-slate-500">No folders yet</h4>
                  <p className="text-sm text-slate-400 mt-1.5 max-w-xs">
                    Create a folder to start organising technical drawings and plans.
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all shadow-sm"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </button>
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
              <GlassCard className="p-7 border-gray-200" gradient>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-gray-900">Rename Folder</h3>
                  <button onClick={() => setRenamingFolder(null)} className="p-1.5 rounded-xl hover:bg-gray-100 text-slate-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleRenameFolder} className="space-y-4">
                  <input
                    type="text" required autoFocus
                    value={renamingFolder.name}
                    onChange={e => setRenamingFolder(f => f ? { ...f, name: e.target.value } : f)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button" onClick={() => setRenamingFolder(null)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all text-sm"
                    >
                      Rename
                    </button>
                  </div>
                </form>
              </GlassCard>
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
              <GlassCard className="p-7 border-gray-200" gradient>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-gray-900">New Plans Folder</h3>
                  <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 rounded-xl hover:bg-gray-100 text-slate-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Folder Name</label>
                    <input
                      type="text" required autoFocus
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="e.g. Architectural Drawings"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button" onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" disabled={isCreating}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isCreating ? 'Creating…' : 'Create Folder'}
                    </button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SkeletonLoader>
  );
};
