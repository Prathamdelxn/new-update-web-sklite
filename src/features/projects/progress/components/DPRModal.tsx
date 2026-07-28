'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Camera, Calendar, Layout, Info, MessageSquare, TrendingUp, Plus } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';

interface DPRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export const DPRModal: React.FC<DPRModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    milestone: '',
    description: '',
    progressPercent: 10,
    date: new Date().toISOString().split('T')[0],
    photos: [] as string[]
  });

  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      const fetchMilestones = async () => {
        try {
          const response = await api.get(`/projects/${projectId}/milestones`);
          setMilestones(response.data);
        } catch (error) {
          console.error('Error fetching milestones:', error);
        }
      };
      fetchMilestones();
    }
  }, [isOpen, projectId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, photos: [...prev.photos, url] }));
    } catch {
      toast.error('Photo upload failed. Check your Cloudinary config.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const selectedMilestone = milestones.find(m => m._id === formData.milestone);
      await api.post(`/projects/${projectId}/work-progress`, {
        milestoneId: formData.milestone || null,
        milestoneName: selectedMilestone?.name || 'General',
        description: formData.description,
        progressPercent: formData.progressPercent,
        photos: formData.photos,
        date: formData.date,
      });
      toast.success('Progress report posted successfully!');
      onSuccess();
      onClose();
      setFormData({
        milestone: '',
        description: '',
        progressPercent: 10,
        date: new Date().toISOString().split('T')[0],
        photos: []
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to post report');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg relative z-10"
          >
            <GlassCard className="border-gray-200" gradient>
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Post Progress Update</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Daily site report & milestone log.</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">Update Date</label>
                      <div className="relative group">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600 ml-1">Milestone Tag</label>
                      <select
                        value={formData.milestone}
                        onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                      >
                        <option value="">General Work</option>
                        {milestones.map(m => (
                          <option key={m._id} value={m._id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-sm font-medium text-slate-600">Work Description</label>
                      <span className="text-[10px] font-bold text-slate-400">{formData.description.length}/200</span>
                    </div>
                    <textarea
                      required
                      maxLength={200}
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all resize-none"
                      placeholder="What work was completed today?"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-sm font-medium text-slate-600">Progress achieved</label>
                      <span className="text-lg font-black text-blue-600">{formData.progressPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={formData.progressPercent}
                      onChange={(e) => setFormData({ ...formData, progressPercent: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-600 ml-1">Site Photos</label>
                    <div className="flex flex-wrap gap-3">
                      {formData.photos.map((photo, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                          <img src={photo} alt="Upload" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <label className={`w-16 h-16 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center ${isUploading ? 'border-blue-300 bg-blue-50 cursor-not-allowed' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer text-slate-400 hover:text-blue-500'}`}>
                        {isUploading ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <Camera className="w-6 h-6" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 flex space-x-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-medium transition-all active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-2 py-3 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Posting...</span>
                        </>
                      ) : (
                        <span>Post Update</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
