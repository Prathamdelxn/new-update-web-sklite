'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  Plus,
  Upload,
  HardDrive,
  X,
  Loader2,
  ChevronRight,
  FileText,
  Trash2,
} from 'lucide-react';
import { Card, Button, Input } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';
import interiorApiClient from '@/services/interiorApi.client';
import { formatDistanceToNow } from 'date-fns';
import { uploadToCloudinary } from '@/lib/upload';

interface InteriorFilemgtViewProps {
  projectId: string;
}

export default function InteriorFilemgtView({ projectId }: InteriorFilemgtViewProps) {
  const toast = useToast();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingFile, setViewingFile] = useState<any | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const parentIdQuery = currentFolderId ? `?parentId=${currentFolderId}` : '';
      const res = await interiorApiClient.get(`/projects/${projectId}/filemgt${parentIdQuery}`);
      if (res.data?.success) {
        setFiles(res.data.data.items || []);
        setBreadcrumbs(res.data.data.breadcrumbs || []);
      }
    } catch (err) {
      console.error('Failed to load files', err);
      toast.error('Failed to load file browser');
    } finally {
      setLoading(false);
    }
  }, [projectId, currentFolderId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsSubmitting(true);
        toast.info('Uploading file to cloud storage...');
        
        // Upload to Cloudinary from the frontend
        const fileUrl = await uploadToCloudinary(file);
        
        toast.info('Saving file to project...');
        // Send the URL and metadata to the backend
        await interiorApiClient.post(`/projects/${projectId}/filemgt/upload`, {
          fileUrl,
          name: file.name,
          size: file.size,
          type: file.type || file.name.split('.').pop() || 'unknown',
          parentId: currentFolderId || null
        });
        
        toast.success('File uploaded successfully');
        await loadFiles();
      } catch (err) {
        console.error('Failed to upload file', err);
        toast.error('Failed to upload file');
      } finally {
        setIsSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      setIsSubmitting(true);
      await interiorApiClient.post(`/projects/${projectId}/filemgt`, {
        name: newFolderName,
        parentId: currentFolderId
      });
      toast.success('Folder created successfully');
      setCreateFolderOpen(false);
      setNewFolderName('');
      await loadFiles();
    } catch (err) {
      console.error('Failed to create folder', err);
      toast.error('Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '--';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            File Management
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Organize site specifications, drawings, project contracts, and photos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>

          <Button onClick={() => setCreateFolderOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs font-medium">
        <button 
          onClick={() => setCurrentFolderId(null)}
          className="text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] flex items-center gap-1 transition-colors"
        >
          <HardDrive className="w-3.5 h-3.5" />
          Root
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb._id}>
            <ChevronRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
            <button
              onClick={() => setCurrentFolderId(crumb._id)}
              className="text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {loading ? (
        <Card className="p-16 flex items-center justify-center border-dashed border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))/0.3]">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </Card>
      ) : files.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))/0.3]">
          <div className="max-w-sm mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mx-auto text-[hsl(var(--muted-foreground))]">
              <Folder className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">This folder is empty</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Get started by creating a new folder or uploading a file.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button size="sm" variant="outline" onClick={() => setCreateFolderOpen(true)}>
                New Folder
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                Upload File
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <Card 
              key={file._id}
              className="p-4 flex items-start gap-3 hover:border-[hsl(var(--primary)/0.5)] cursor-pointer transition-colors group"
              onClick={() => {
                if (file.type === 'folder') {
                  setCurrentFolderId(file._id);
                } else if (file.fileUrl) {
                  setViewingFile(file);
                }
              }}
            >
              <div className="p-2 bg-[hsl(var(--primary)/0.1)] rounded-lg text-[hsl(var(--primary))]">
                {file.type === 'folder' ? (
                  <Folder className="w-6 h-6 fill-[hsl(var(--primary)/0.2)]" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <span>
                    {file.createdAt ? formatDistanceToNow(new Date(file.createdAt), { addSuffix: true }) : '--'}
                  </span>
                  {file.type === 'file' && (
                    <>
                      <span>•</span>
                      <span>{formatFileSize(file.fileSize)}</span>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {createFolderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <div>
                  <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">Create Folder</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Add a new subdirectory folder to the current level
                  </p>
                </div>
                <button
                  onClick={() => setCreateFolderOpen(false)}
                  className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateFolder}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Folder Name</label>
                    <Input
                      required
                      placeholder="e.g. Electrical Drawings"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setCreateFolderOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Create Folder
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[hsl(var(--primary)/0.1)] rounded-lg text-[hsl(var(--primary))]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[hsl(var(--foreground))] truncate max-w-[300px] sm:max-w-[500px]">
                      {viewingFile.name}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {formatFileSize(viewingFile.fileSize)} • {viewingFile.fileType?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(viewingFile.fileUrl, '_blank')}>
                    Open in New Tab
                  </Button>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="p-2 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-[hsl(var(--muted)/0.3)] relative overflow-hidden flex items-center justify-center">
                {['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(viewingFile.fileType?.toLowerCase()) || viewingFile.fileType?.startsWith('image') ? (
                  <img
                    src={viewingFile.fileUrl}
                    alt={viewingFile.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : ['pdf', 'txt', 'csv'].includes(viewingFile.fileType?.toLowerCase()) || viewingFile.fileType?.startsWith('application/pdf') ? (
                  <iframe
                    src={viewingFile.fileUrl}
                    className="w-full h-full border-none"
                    title={viewingFile.name}
                  />
                ) : (
                  <div className="text-center p-8 space-y-4">
                    <div className="w-16 h-16 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center mx-auto text-[hsl(var(--muted-foreground))]">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">No preview available for this file type.</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Please open it in a new tab to download or view it.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
