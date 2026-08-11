'use client';

// Port of interior-os-frontend's projects/[projectId]/snags/page.tsx.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Plus, X, Loader2, Calendar, MapPin, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/upload';

interface InteriorSnagsViewProps {
  projectId: string;
}

export default function InteriorSnagsView({ projectId }: InteriorSnagsViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [snags, setSnags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [editingSnagId, setEditingSnagId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const fetchSnags = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getSnags(projectId);
      if (res?.success && res?.data) {
        setSnags(res.data);
      }
    } catch (err) {
      console.error('Failed to load snags', err);
      toast.error('Failed to fetch Snag registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchSnags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreateOrUpdateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !location) {
      toast.error('Please fill in description and location');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        description,
        location,
        priority,
        photos,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      };

      let res;
      if (editingSnagId) {
        payload.snagId = editingSnagId;
        res = await interiorProjectService.updateSnag(projectId, payload);
      } else {
        res = await interiorProjectService.createSnag(projectId, payload);
      }
      
      if (res?.success) {
        toast.success(`Snag ${editingSnagId ? 'updated' : 'logged'} successfully!`);
        closeModal();
        fetchSnags();
      }
    } catch (err) {
      console.error('Snag submit fail', err);
      toast.error(`Failed to ${editingSnagId ? 'update' : 'log'} snag`);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (snag: any) => {
    setEditingSnagId(snag._id);
    setDescription(snag.description || '');
    setLocation(snag.location || '');
    setPriority(snag.priority || 'medium');
    setDueDate(snag.dueDate ? new Date(snag.dueDate).toISOString().split('T')[0] : '');
    setPhotos(snag.photos || []);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSnagId(null);
    setDescription('');
    setLocation('');
    setPriority('medium');
    setDueDate('');
    setPhotos([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      toast.info('Uploading image...');
      const url = await uploadToCloudinary(file);
      setPhotos((prev) => [...prev, url]);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Failed to upload image', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeleteSnag = async (snagId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Snag',
      message: 'Are you sure you want to delete this snag? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    
    if (!isConfirmed) return;
    
    try {
      const res = await interiorProjectService.deleteSnag(projectId, snagId);
      if (res?.success) {
        toast.success('Snag deleted successfully');
        fetchSnags();
      }
    } catch (err) {
      console.error('Failed to delete snag', err);
      toast.error('Failed to delete snag');
    }
  };

  const handleToggleStatus = async (snagId: string, currentStatus: string) => {
    try {
      const nextStatus =
        currentStatus === 'resolved'
          ? 'closed'
          : currentStatus === 'open' || currentStatus === 'assigned' || currentStatus === 'in_progress'
          ? 'resolved'
          : 'open';
      const res = await interiorProjectService.updateSnag(projectId, { snagId, status: nextStatus });
      if (res?.success) {
        toast.success(`Snag status updated to: ${nextStatus}`);
        fetchSnags();
      }
    } catch (err) {
      console.error('Toggle status failed', err);
      toast.error('Failed to update status');
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
      case 'high':
        return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'resolved':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Quality Snag Register</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Log site quality defects, assign vendor sub-contractors, and track closeout verification workflows.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Log Snag
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : snags.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No quality snags raised yet. Click &quot;Log Snag&quot; to record a punch list item.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snags.map((snag) => (
            <Card key={snag._id} className="hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))] leading-tight">
                      {snag.description}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border tracking-wider', getPriorityBadge(snag.priority))}>
                        {snag.priority}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border tracking-wider', getStatusBadge(snag.status))}>
                        {snag.status}
                      </span>
                      <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] ml-1 font-medium">
                        <MapPin className="w-3 h-3 text-blue-500" /> {snag.location}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditModal(snag)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteSnag(snag._id)} className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-md text-slate-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {snag.photos && snag.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {snag.photos.map((photo: string, index: number) => (
                      <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden border border-[hsl(var(--border))] group cursor-pointer shadow-sm" onClick={() => setViewingImage(photo)}>
                        <img src={photo} alt={`Snag photo ${index + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Due: {snag.dueDate ? new Date(snag.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </span>

                  <Button variant="outline" size="sm" className="h-8 text-[11px] font-semibold px-3" onClick={() => handleToggleStatus(snag._id, snag.status)}>
                    {snag.status === 'open' || snag.status === 'assigned' || snag.status === 'in_progress'
                      ? 'Mark Resolved'
                      : snag.status === 'resolved'
                      ? 'Verify & Close'
                      : 'Reopen Snag'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  <Bug className="w-4 h-4 text-[hsl(var(--primary))]" />
                  {editingSnagId ? 'Edit Punch List Snag' : 'Log Punch List Snag'}
                </h3>
                <button type="button" onClick={closeModal} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateSnag}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Defect Description</label>
                    <Input required placeholder="e.g. Scratched premium wall paint near main pantry" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Defect Location / Area</label>
                    <Input required placeholder="e.g. Floor 4, Cafeteria Pantry Zone" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Priority</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Target Resolve Date</label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Attachments (Images)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {photos.map((photo, i) => (
                        <div key={i} className="relative w-16 h-16 rounded border overflow-hidden cursor-pointer group" onClick={() => setViewingImage(photo)}>
                          <img src={photo} alt="Snag" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotos((prev) => prev.filter((_, index) => index !== i));
                            }}
                            className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="relative w-16 h-16 rounded border border-dashed border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.5)] transition-colors flex items-center justify-center">
                        {isUploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))]" />
                        ) : (
                          <>
                            <ImageIcon className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={isUploadingImage}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {editingSnagId ? 'Save Changes' : 'Log Snag'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm" onClick={() => setViewingImage(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-[hsl(var(--border))] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <Button size="sm" variant="outline" className="h-8 shadow-md" onClick={() => window.open(viewingImage, '_blank')}>
                  Open in New Tab
                </Button>
                <button
                  onClick={() => setViewingImage(null)}
                  className="p-1.5 bg-black/50 text-white rounded-md hover:bg-red-500 transition-colors shadow-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <img src={viewingImage} alt="Snag Attachment" className="max-w-full max-h-[85vh] object-contain bg-black/40" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
