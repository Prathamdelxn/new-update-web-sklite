'use client';

// Port of interior-os-frontend's projects/[projectId]/filemgt/page.tsx.
//
// IMPORTANT — missing backend wiring:
// The source page is entirely backed by `filemgtService` (getFiles,
// createFolder, uploadFile, deleteFile hitting /projects/:id/filemgt/*
// routes). None of these endpoints exist in interiorProject.service.ts, and
// no equivalent was found among the ported service methods (drawings/photos/
// handover upload are separate, unrelated endpoints). Per instructions, this
// view renders the full file-browser UI/shell but stubs every data-fetching
// and mutating action (folder browsing, upload, create folder, delete) with
// a "Coming soon" toast rather than inventing a new backend endpoint.

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  Plus,
  Upload,
  HardDrive,
  X,
  Loader2,
} from 'lucide-react';
import { Card, Button, Input } from '@/components/interior/ui';
import { useToast } from '@/providers/ToastContext';

interface InteriorFilemgtViewProps {
  projectId: string;
}

export default function InteriorFilemgtView({ projectId }: InteriorFilemgtViewProps) {
  const toast = useToast();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const notComingSoon = () => toast.info('File management is coming soon for this project.');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      notComingSoon();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    notComingSoon();
    setCreateFolderOpen(false);
    setNewFolderName('');
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
        <span className="text-[hsl(var(--foreground))] flex items-center gap-1">
          <HardDrive className="w-3.5 h-3.5" />
          Root
        </span>
      </div>

      <Card className="p-16 text-center border-dashed border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))/0.3]">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center mx-auto text-[hsl(var(--muted-foreground))]">
            <Folder className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">File management is coming soon</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              The project file browser backend is not yet connected for this workspace.
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
                  <Button variant="outline" type="button" onClick={() => setCreateFolderOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Folder
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
