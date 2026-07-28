'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FileText, Upload, Image as ImageIcon, Trash2, Plus } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  templateId?: string;
}

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all';

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, onSuccess, initialData, templateId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const isEditing = !!templateId;

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    minBudget: '',
    maxBudget: '',
    area: '',
    estimatedDays: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<{ name: string; url: string; size: number }[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    api.get('/template-categories')
      .then(r => {
        setCategories(r.data);
        if (initialData) {
          setFormData({
            name: initialData.name || '',
            category: initialData.category?._id || initialData.category || r.data[0]?._id || '',
            description: initialData.description || '',
            minBudget: initialData.minBudget?.toString() || '',
            maxBudget: initialData.maxBudget?.toString() || '',
            area: initialData.area?.toString() || '',
            estimatedDays: initialData.estimatedDays?.toString() || '',
          });
          setImages(Array.isArray(initialData.images) ? initialData.images : []);
          setFiles(Array.isArray(initialData.files) ? initialData.files : []);
        } else if (r.data.length > 0) {
          setFormData(f => ({ ...f, category: r.data[0]._id }));
        }
      })
      .catch(() => {});
  }, [isOpen, initialData]);

  const reset = () => {
    setFormData({ name: '', category: categories[0]?._id || '', description: '', minBudget: '', maxBudget: '', area: '', estimatedDays: '' });
    setImages([]);
    setFiles([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploadingImage(true);
    try {
      const urls = await Promise.all(picked.map(f => uploadToCloudinary(f)));
      setImages(prev => [...prev, ...urls]);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploadingFile(true);
    try {
      const uploaded = await Promise.all(
        picked.map(async f => {
          const url = await uploadToCloudinary(f);
          return { name: f.name, url, size: f.size };
        })
      );
      setFiles(prev => [...prev, ...uploaded]);
    } catch {
      toast.error('File upload failed');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category) {
      toast.error('Template name and category are required');
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        minBudget: Number(formData.minBudget) || 0,
        maxBudget: Number(formData.maxBudget) || 0,
        area: Number(formData.area) || 0,
        estimatedDays: Number(formData.estimatedDays) || 0,
        images,
        files,
      };
      if (isEditing) {
        await api.patch(`/templates/${templateId}`, payload);
        toast.success('Template updated successfully!');
      } else {
        await api.post('/templates', payload);
        toast.success('Project template created successfully!');
      }
      onSuccess();
      onClose();
      if (!isEditing) reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (isEditing ? 'Failed to update template' : 'Failed to create template'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl relative z-10"
          >
            <GlassCard className="border-gray-200" gradient>
              <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{isEditing ? 'Edit Template' : 'New Project'}</p>
                    <h2 className="text-xl font-black text-gray-900">{isEditing ? 'Edit Project Template' : 'New Project Template'}</h2>
                  </div>
                  <button onClick={() => { onClose(); reset(); }} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Template Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Template Name</label>
                    <input
                      type="text" required value={formData.name}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      className={inputCls} placeholder="e.g. Shopping Mall Expansion"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat._id} type="button"
                          onClick={() => setFormData(f => ({ ...f, category: cat._id }))}
                          className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                            formData.category === cat._id
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-gray-50 border-gray-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Description</label>
                    <textarea
                      rows={3} value={formData.description}
                      onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                      className={`${inputCls} resize-none`}
                      placeholder="Describe the scope of this template..."
                    />
                  </div>

                  {/* Budget */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Estimated Budget ($)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">MIN</span>
                        <input
                          type="number" value={formData.minBudget}
                          onChange={e => setFormData(f => ({ ...f, minBudget: e.target.value }))}
                          className={`${inputCls} pl-12`} placeholder="0"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">MAX</span>
                        <input
                          type="number" value={formData.maxBudget}
                          onChange={e => setFormData(f => ({ ...f, maxBudget: e.target.value }))}
                          className={`${inputCls} pl-12`} placeholder="10,00,000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Area + Days */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Area (sq ft)</label>
                      <input
                        type="number" value={formData.area}
                        onChange={e => setFormData(f => ({ ...f, area: e.target.value }))}
                        className={inputCls} placeholder="e.g. 1500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Est. Duration (days)</label>
                      <input
                        type="number" value={formData.estimatedDays}
                        onChange={e => setFormData(f => ({ ...f, estimatedDays: e.target.value }))}
                        className={inputCls} placeholder="e.g. 45"
                      />
                    </div>
                  </div>

                  {/* Reference Images */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-700">Reference Images</label>
                      <button
                        type="button" onClick={() => imageInputRef.current?.click()}
                        className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1"
                        disabled={uploadingImage}
                      >
                        <Plus className="w-3 h-3" /> Add Image
                      </button>
                    </div>
                    <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                    {images.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {images.map((url, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                        {uploadingImage && (
                          <div className="w-20 h-20 rounded-xl border border-dashed border-blue-300 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button" onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="w-full border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all"
                      >
                        {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                        <span className="text-xs font-semibold">{uploadingImage ? 'Uploading...' : 'Select Images'}</span>
                        <span className="text-[10px]">Upload references or blueprints</span>
                      </button>
                    )}
                  </div>

                  {/* Plan Files */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-700">Project Plan Files</label>
                      <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1"
                        disabled={uploadingFile}
                      >
                        <Plus className="w-3 h-3" /> Add File
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                    {files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((file, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-900 truncate">{file.name}</p>
                              <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {uploadingFile && (
                          <div className="flex items-center gap-2 p-3 border border-dashed border-blue-200 rounded-xl text-blue-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-semibold">Uploading...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="w-full border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all"
                      >
                        {uploadingFile ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                        <span className="text-xs font-semibold">{uploadingFile ? 'Uploading...' : 'Upload Plans'}</span>
                        <span className="text-[10px]">PDF, DWG, or ZIP</span>
                      </button>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-4 flex gap-3 border-t border-gray-200">
                    <button
                      type="button" onClick={() => { onClose(); reset(); }}
                      className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" disabled={isLoading || uploadingImage || uploadingFile}
                      className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{isEditing ? 'Saving...' : 'Creating...'}</span></> : <span>{isEditing ? 'Save Changes' : 'Create Template'}</span>}
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
