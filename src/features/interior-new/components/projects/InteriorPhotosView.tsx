'use client';

// Port of interior-os-frontend's projects/[projectId]/photos/page.tsx.
// TanStack/sonner/zustand replaced with local useState/useEffect + interiorProjectService.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Plus, X, Loader2, Calendar } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { useToast } from '@/providers/ToastContext';
import { cn } from '@/lib/utils';

interface InteriorPhotosViewProps {
  projectId: string;
}

export default function InteriorPhotosView({ projectId }: InteriorPhotosViewProps) {
  const toast = useToast();

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      toast.error('Failed to fetch site photos history');
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
      toast.error('Please select a photo file to upload');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadToastId = toast.loading('Uploading photo...');
      const uploadRes = await interiorProjectService.uploadPhotoFile(projectId, formData);
      toast.dismiss(uploadToastId);

      if (!uploadRes.success || !uploadRes.data?.url) {
        throw new Error('Photo upload failed');
      }

      const secureUrl = uploadRes.data.url;
      toast.success('Photo uploaded!');

      const payload = { caption, category, url: secureUrl };

      const res = await interiorProjectService.createPhoto(projectId, payload);
      if (res.success) {
        toast.success('Site photo logged successfully!');
        closeModal();
        fetchPhotos();
      }
    } catch (err: any) {
      console.error('Photo upload fail', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to log site photo');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPhotos = activeCategory === 'all' ? photos : photos.filter((p) => p.category === activeCategory);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Site Progress Photos</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Log site progress pictures, snag reports, and material delivery logs.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Log Photo
        </Button>
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
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No photos found. Click &quot;Log Photo&quot; to upload.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filteredPhotos.map((photo) => (
            <Card key={photo._id} className="overflow-hidden group hover:shadow-md hover:border-[hsl(var(--primary)/0.3)] transition-all">
              {/* Simplified from source: no fullscreen lightbox/annotation viewer, just thumbnail + link */}
              <div className="relative h-48 w-full bg-[hsl(var(--muted))] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || 'Site progress image'}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-black/60 text-white backdrop-blur-sm">
                  {photo.category}
                </span>
              </div>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-[hsl(var(--foreground))] line-clamp-1">{photo.caption || 'No caption added'}</p>
                <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-2.5">
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
                  Log Progress Photo
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadPhoto}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Photo Caption / Note</label>
                    <Input placeholder="e.g. Completed partition wall drywall boarding" value={caption} onChange={(e) => setCaption(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Select Category</label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="progress">Daily Site Progress</option>
                      <option value="snag">Quality Snag defect</option>
                      <option value="delivery">Material Delivery check</option>
                      <option value="other">General Photo</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold block mb-1">Upload Site Photo</label>
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
                        {selectedFile ? selectedFile.name : 'Click or drag site photo to upload'}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Images up to 50MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save & Upload Photo
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
