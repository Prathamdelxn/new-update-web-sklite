'use client';

// Port of interior-os-frontend's projects/[projectId]/drawings/page.tsx.
// TanStack/sonner/zustand replaced with local useState/useEffect + interiorProjectService,
// matching InteriorProjectOverviewView's conventions.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Plus, X, Loader2, FileDown, GitBranch } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface InteriorDrawingsViewProps {
  projectId: string;
}

export default function InteriorDrawingsView({ projectId }: InteriorDrawingsViewProps) {
  const toast = useToast();

  const [drawings, setDrawings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');

  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState('gfc');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isRevModalOpen, setIsRevModalOpen] = useState(false);
  const [targetDrawingId, setTargetDrawingId] = useState('');
  const [revName, setRevName] = useState('');
  const [revChanges, setRevChanges] = useState('');
  const [selectedRevFile, setSelectedRevFile] = useState<File | null>(null);

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setTitle('');
    setDiscipline('gfc');
    setSelectedFile(null);
  };

  const closeRevModal = () => {
    setIsRevModalOpen(false);
    setRevChanges('');
    setSelectedRevFile(null);
  };

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getDrawings(projectId);
      if (res.success && res.data) setDrawings(res.data);
    } catch (err) {
      console.error('Failed to load drawings', err);
      toast.error('Failed to fetch Drawings register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchDrawings();
  }, [projectId]);

  const handleSubmitDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Please fill in drawing title');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a drawing file to upload');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadToastId = toast.loading('Uploading drawing...');
      const uploadRes = await interiorProjectService.uploadDrawingFile(projectId, formData);
      toast.dismiss(uploadToastId);

      if (!uploadRes.success || !uploadRes.data?.url) {
        throw new Error('Drawing upload failed');
      }

      const fileUrl = uploadRes.data.url;
      toast.success('Drawing file uploaded!');

      const payload = { title, discipline, fileUrl };
      const res = await interiorProjectService.createDrawing(projectId, payload);
      if (res.success) {
        toast.success('Drawing registered successfully!');
        closeCreateModal();
        fetchDrawings();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Failed to register drawing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (drawingId: string, status: string) => {
    try {
      const res = await interiorProjectService.updateDrawing(projectId, { drawingId, status });
      if (res.success) {
        toast.success(`Drawing status updated to: ${status}`);
        fetchDrawings();
      }
    } catch (err) {
      console.error('Status update failed', err);
      toast.error('Failed to update approval status');
    }
  };

  const handleOpenRevModal = (dwgId: string, nextRev: number) => {
    setTargetDrawingId(dwgId);
    setRevName(`Rev ${nextRev}`);
    setRevChanges('');
    setSelectedRevFile(null);
    setIsRevModalOpen(true);
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName || !revChanges) {
      toast.error('Please specify revision details');
      return;
    }
    if (!selectedRevFile) {
      toast.error('Please select a revision file to upload');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedRevFile);

      const uploadToastId = toast.loading('Uploading revision file...');
      const uploadRes = await interiorProjectService.uploadDrawingFile(projectId, formData);
      toast.dismiss(uploadToastId);

      if (!uploadRes.success || !uploadRes.data?.url) {
        throw new Error('Revision upload failed');
      }

      const fileUrl = uploadRes.data.url;
      toast.success('Revision file uploaded!');

      const res = await interiorProjectService.updateDrawing(projectId, {
        drawingId: targetDrawingId,
        revisionName: revName,
        changes: revChanges,
        fileUrl,
      });
      if (res.success) {
        toast.success('New revision uploaded successfully!');
        closeRevModal();
        fetchDrawings();
      }
    } catch (err: any) {
      console.error('Revision fail', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to upload revision');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'under_review':
      case 'submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
    }
  };

  const filteredDrawings =
    selectedDiscipline === 'all' ? drawings : drawings.filter((d) => d.discipline === selectedDiscipline);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Drawings & Blueprints Register</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Manage Tender, Shop, GFC, and As-Built drawings with structured approval revisions logs.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Drawing
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
        {['all', 'tender', 'shop', 'gfc', 'as-built'].map((disc) => (
          <button
            key={disc}
            onClick={() => setSelectedDiscipline(disc)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
              selectedDiscipline === disc
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
            )}
          >
            {disc}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : filteredDrawings.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No drawings registered in this category. Click &quot;Add Drawing&quot; to upload.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDrawings.map((dwg) => {
            const currentRev = dwg.revisions[dwg.revisions.length - 1];
            const nextRevIndex = dwg.revisions.length;
            return (
              <Card key={dwg._id} className="overflow-hidden hover:border-[hsl(var(--primary)/0.3)] transition-all">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[hsl(var(--muted-foreground))]">{dwg.drawingNumber}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                        {dwg.discipline}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase', getStatusBadge(dwg.status))}>
                        {dwg.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))]">{dwg.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] flex-wrap">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3.5 h-3.5" /> Latest: <span className="font-semibold text-[hsl(var(--foreground))]">{currentRev.revision}</span>
                      </span>
                      {currentRev.changes && (
                        <span>
                          Changes: <span className="italic text-[hsl(var(--foreground))]">{currentRev.changes}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => window.open(currentRev.url, '_blank')}>
                      <FileDown className="w-4 h-4 mr-1.5" /> View DWG
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenRevModal(dwg._id, nextRevIndex)}>
                      Upload Rev
                    </Button>
                    {dwg.status !== 'approved' && (
                      <Button variant="outline" size="sm" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleApproveReject(dwg._id, 'approved')}>
                        Approve
                      </Button>
                    )}
                    {dwg.status !== 'rejected' && (
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleApproveReject(dwg._id, 'rejected')}>
                        Reject
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[hsl(var(--primary))]" />
                  Register Design Drawing
                </h3>
                <button onClick={closeCreateModal} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitDrawing}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Drawing Title</label>
                    <Input required placeholder="e.g. Electrical Layout Grid Plan" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Discipline Category</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                    >
                      <option value="tender">Tender Drawing</option>
                      <option value="shop">Shop Drawing</option>
                      <option value="gfc">GFC Drawing (Issued for Construction)</option>
                      <option value="as-built">As-Built Drawing</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block mb-1">Upload Drawing File (PDF or Image)</label>
                    <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-5 flex flex-col items-center justify-center gap-2 hover:border-[hsl(var(--primary)/0.5)] transition-colors relative cursor-pointer bg-[hsl(var(--background))]">
                      <input
                        type="file"
                        required
                        accept="application/pdf,image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
                        }}
                      />
                      <FileDown className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-semibold text-center text-[hsl(var(--foreground))] px-2 truncate w-full">
                        {selectedFile ? selectedFile.name : 'Click or drag drawing file to upload'}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">PDF or Images up to 50MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={closeCreateModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Register & Upload
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRevModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">Upload Revision: {revName}</h3>
                <button onClick={closeRevModal} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitRevision}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Describe Revision changes</label>
                    <Input
                      required
                      placeholder="e.g. Relocated main distribution board by 2 meters east"
                      value={revChanges}
                      onChange={(e) => setRevChanges(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block mb-1">New Revision File</label>
                    <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-5 flex flex-col items-center justify-center gap-2 hover:border-[hsl(var(--primary)/0.5)] transition-colors relative cursor-pointer bg-[hsl(var(--background))]">
                      <input
                        type="file"
                        required
                        accept="application/pdf,image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setSelectedRevFile(e.target.files[0]);
                        }}
                      />
                      <FileDown className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-semibold text-center text-[hsl(var(--foreground))] px-2 truncate w-full">
                        {selectedRevFile ? selectedRevFile.name : 'Click or drag revision file to upload'}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">PDF or Images up to 50MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={closeRevModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Upload Revision
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
