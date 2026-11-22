'use client';
import { tr } from '@/i18n';

// Port of interior-os-frontend's projects/[projectId]/photos/page.tsx.
// TanStack/sonner/zustand replaced with local useState/useEffect + interiorProjectService.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Plus, X, Loader2, Calendar, Trash2 } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { uploadToCloudinary } from '@/lib/upload';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';
import { useProjectPermissions } from '@/features/interior-new/hooks/useProjectPermissions';

interface InteriorPhotosViewProps {
  projectId: string;
}

export default function InteriorPhotosView({ projectId }: InteriorPhotosViewProps) {
  const toast = useToast();
  const { can: canDo } = useProjectPermissions(projectId);

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('progress');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const closeModal = () => {
    setIsModalOpen(false);
    setCaption('');
    setCategory('progress');
    setSelectedFile(null);
  };

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getPhotos(projectId);
      if (res.success && res.data) setPhotos(res.data);
    } catch (err) {
      console.error('Failed to load photos', err);
      toast.error(tr("Failed to fetch site photos history"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchPhotos();
  }, [projectId]);

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error(tr("Please select a photo file to upload"));
      return;
    }

    try {
      setSubmitting(true);
      const uploadToastId = toast.loading(tr("Uploading photo..."));
      let secureUrl = '';

      try {
        secureUrl = await uploadToCloudinary(selectedFile);
      } catch (cloudErr) {
        console.warn('Cloudinary upload fallback to backend upload:', cloudErr);
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await interiorProjectService.uploadPhotoFile(projectId, formData);
        if (!uploadRes.success || !uploadRes.data?.url) {
          throw new Error('Photo upload failed');
        }
        secureUrl = uploadRes.data.url;
      }
      toast.dismiss(uploadToastId);

      const payload = { caption, category, url: secureUrl };

      const res = await interiorProjectService.createPhoto(projectId, payload);
      if (res.success) {
        toast.success(tr("Site photo logged successfully!"));
        closeModal();
        fetchPhotos();
      }
    } catch (err: any) {
      console.error('Photo upload fail', err);
      toast.error(err.response?.data?.error || err.message || tr("Failed to log site photo"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm(tr("Are you sure you want to delete this site photo?"))) return;
    try {
      setDeletingId(photoId);
      const res = await interiorProjectService.deletePhoto(projectId, photoId);
      if (res.success) {
        toast.success(tr("Site photo deleted"));
        setPhotos((prev) => prev.filter((p) => p._id !== photoId));
      } else {
        toast.error(res.error || tr("Failed to delete photo"));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || tr("Failed to delete photo"));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPhotos = activeCategory === 'all' ? photos : photos.filter((p) => p.category === activeCategory);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">{tr("Site Progress Photos")}</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            {tr("Log site progress pictures, snag reports, and material delivery logs.")}
          </p>
        </div>
        {canDo('photos', 'create') && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 me-2" />
            {tr("Log Photo")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
        {['all', 'progress', 'snag', 'delivery', 'other'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
              activeCategory === cat
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
            )}
          >
            {tr(cat)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          {tr("No photos found. Click \"Log Photo\" to upload.")}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filteredPhotos.map((photo) => (
            <Card key={photo._id} className="overflow-hidden group hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all">
              {/* Simplified from source: no fullscreen lightbox/annotation viewer, just thumbnail + link */}
              <div className="relative h-48 w-full bg-[hsl(var(--muted))] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async"
                  src={photo.url}
                  alt={photo.caption || tr("Site progress image")}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[0.5625rem] uppercase font-bold bg-black/60 text-white backdrop-blur-sm">
                  {tr(photo.category)}
                </span>
                {canDo('photos', 'delete') && (
                  <button
                    type="button"
                    disabled={deletingId === photo._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo._id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm cursor-pointer"
                    title={tr("Delete photo")}
                  >
                    {deletingId === photo._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-[hsl(var(--foreground))] line-clamp-1">{photo.caption || tr("No caption added")}</p>
                <div className="flex items-center justify-between text-[0.625rem] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-2.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    {new Date(photo.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
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
                  <ImageIcon className="w-4 h-4 text-[hsl(var(--primary))]" />
                  {tr("Log Progress Photo")}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadPhoto}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{tr("Photo Caption / Note")}</label>
                    <Input placeholder={tr("e.g. Completed partition wall drywall boarding")} value={caption} onChange={(e) => setCaption(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">{tr("Select Category")}</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="progress">{tr("Daily Site Progress")}</option>
                      <option value="snag">{tr("Quality Snag defect")}</option>
                      <option value="delivery">{tr("Material Delivery check")}</option>
                      <option value="other">{tr("General Photo")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block mb-1">{tr("Upload Site Photo")}</label>
                    <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-5 flex flex-col items-center justify-center gap-2 hover:border-[hsl(var(--primary)/0.5)] transition-colors relative cursor-pointer bg-[hsl(var(--background))]">
                      <input
                        type="file"
                        required
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
                        }}
                      />
                      <ImageIcon className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs font-semibold text-center text-[hsl(var(--foreground))] px-2 truncate w-full">
                        {selectedFile ? selectedFile.name : tr("Click or drag site photo to upload")}
                      </span>
                      <span className="text-[0.625rem] text-[hsl(var(--muted-foreground))]">{tr("Images up to 50MB")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={closeModal}>
                    {tr("Cancel")}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin me-2" />}
                    {tr("Save & Upload Photo")}
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
