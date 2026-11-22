'use client';
import { tr } from '@/i18n';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FileText, Upload, Image as ImageIcon, Trash2, Plus, Layers, Ruler, Clock, FolderOpen, CheckCircle2, AlertCircle, Sparkles, Check, Banknote } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { cn, formatCurrency } from '@/lib/utils';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  templateId?: string;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  templateId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [assetTab, setAssetTab] = useState<'images' | 'files'>('images');

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
    api
      .get('/template-categories')
      .then((r) => {
        const catList = Array.isArray(r.data) ? r.data : [];
        setCategories(catList);
        if (initialData) {
          setFormData({
            name: initialData.name || '',
            category: initialData.category?._id || initialData.category || catList[0]?._id || '',
            description: initialData.description || '',
            minBudget: initialData.minBudget?.toString() || '',
            maxBudget: initialData.maxBudget?.toString() || '',
            area: initialData.area?.toString() || '',
            estimatedDays: initialData.estimatedDays?.toString() || '',
          });
          setImages(Array.isArray(initialData.images) ? initialData.images : []);
          setFiles(Array.isArray(initialData.files) ? initialData.files : []);
        } else if (catList.length > 0) {
          setFormData((f) => ({ ...f, category: catList[0]._id }));
        }
      })
      .catch(() => {
        toast.error(tr("Failed to load categories"));
      });
  }, [isOpen, initialData]);

  const reset = () => {
    setFormData({
      name: '',
      category: categories[0]?._id || '',
      description: '',
      minBudget: '',
      maxBudget: '',
      area: '',
      estimatedDays: '',
    });
    setImages([]);
    setFiles([]);
    setAssetTab('images');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploadingImage(true);
    try {
      const urls = await Promise.all(picked.map((f) => uploadToCloudinary(f)));
      setImages((prev) => [...prev, ...urls]);
      toast.success(tr("{{pickedCount}} visual{{value}} uploaded", { pickedCount: picked.length, value: picked.length > 1 ? 's' : '' }));
    } catch {
      toast.error(tr("Image upload failed"));
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
        picked.map(async (f) => {
          const url = await uploadToCloudinary(f);
          return { name: f.name, url, size: f.size };
        })
      );
      setFiles((prev) => [...prev, ...uploaded]);
      toast.success(tr("{{pickedCount}} plan file{{value}} uploaded", { pickedCount: picked.length, value: picked.length > 1 ? 's' : '' }));
    } catch {
      toast.error(tr("File upload failed"));
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(tr("Template name is required"));
      return;
    }
    if (!formData.category) {
      toast.error(tr("Please select a category classification"));
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        minBudget: Number(formData.minBudget) || 0,
        maxBudget: Number(formData.maxBudget) || 0,
        area: Number(formData.area) || 0,
        estimatedDays: Number(formData.estimatedDays) || 0,
        images,
        files,
      };

      if (isEditing) {
        await api.patch(`/templates/${templateId}`, payload);
        toast.success(tr("Template updated successfully"));
      } else {
        await api.post('/templates', payload);
        toast.success(tr("Project template created successfully"));
      }
      onSuccess();
      onClose();
      if (!isEditing) reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (isEditing ? tr("Failed to update template") : tr("Failed to create template")));
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const minNum = Number(formData.minBudget) || 0;
  const maxNum = Number(formData.maxBudget) || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-3xl relative z-10"
          >
            <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
              
              {/* ── Modal Header ── */}
              <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-50 via-white to-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Layers className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-150">
                        {isEditing ? tr("Modify Template") : tr("Template Management")}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
                      {isEditing ? tr("Edit Project Template") : tr("Create New Project Template")}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onClose(); reset(); }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title={tr("Close modal")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Scrollable Form Body ── */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="p-6 space-y-5">
                  
                  {/* ── Panel 1: General Information & Category ── */}
                  <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4.5 space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                          {tr("General Information")}
                        </h3>
                      </div>
                      <span className="text-[10.5px] font-semibold text-slate-400">
                        {tr("Core Identity & Classification")}
                      </span>
                    </div>

                    {/* Template Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {tr("Template Name ")}<span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                          placeholder={tr("e.g. 3BHK Luxury Villa Template, Commercial Retail Shell...")}
                          className="w-full ps-10 pe-4 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300 shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Category Selection Cards */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          {tr("Classification Category ")}<span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {categories.length}{tr(" categories available")}
                        </span>
                      </div>

                      {categories.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {categories.map((cat) => {
                            const isSelected = formData.category === cat._id;
                            return (
                              <button
                                key={cat._id}
                                type="button"
                                onClick={() => setFormData((f) => ({ ...f, category: cat._id }))}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all text-start cursor-pointer",
                                  isSelected
                                    ? "bg-blue-50/90 text-blue-700 border-blue-400 shadow-2xs ring-1 ring-blue-500/20"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                                )}
                              >
                                <div className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border",
                                  isSelected ? "bg-blue-600 text-white border-blue-600" : "bg-slate-100 text-slate-500 border-slate-200/80"
                                )}>
                                  {isSelected ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <FolderOpen className="w-3.5 h-3.5" />}
                                </div>
                                <span className="truncate">{tr(cat.name)}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{tr("No categories found. Please create a category first under the Categories tab.")}</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          {tr("Standard Scope & Description")}
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {formData.description.length}{tr(" characters")}
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                        placeholder={tr("Detail standard site delivery milestones, turnkey materials, quality checks, and architectural scope...")}
                        className="w-full p-3 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300 shadow-2xs resize-none"
                      />
                    </div>
                  </div>

                  {/* ── Panel 2: Costing & Technical Dimensions ── */}
                  <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4.5 space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                          {tr("Estimates & Technical Specifications")}
                        </h3>
                      </div>
                      <span className="text-[10.5px] font-semibold text-slate-400">
                        {tr("Financial Thresholds & Physical Footprint")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Budget Range Section */}
                      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">
                            {tr("Estimated Budget Range")}
                          </label>
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{tr("Min Budget")}</span>
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={formData.minBudget}
                                onChange={(e) => setFormData((f) => ({ ...f, minBudget: e.target.value }))}
                                placeholder="0"
                                className="w-full ps-6 pe-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{tr("Max Budget")}</span>
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={formData.maxBudget}
                                onChange={(e) => setFormData((f) => ({ ...f, maxBudget: e.target.value }))}
                                placeholder="50,00,000"
                                className="w-full ps-6 pe-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        {(minNum > 0 || maxNum > 0) && (
                          <div className="pt-1 flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>{tr("Preview: ")}{formatCurrency(minNum, '₹')} – {formatCurrency(maxNum, '₹')}</span>
                          </div>
                        )}
                      </div>

                      {/* Area & Timeline Section */}
                      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">
                            {tr("Footprint & Execution Target")}
                          </label>
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{tr("Built-Up Area")}</span>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="0"
                                value={formData.area}
                                onChange={(e) => setFormData((f) => ({ ...f, area: e.target.value }))}
                                placeholder="e.g. 2400"
                                className="w-full ps-3 pe-10 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              />
                              <span className="absolute right-2 text-[10px] font-bold text-slate-400 pointer-events-none">{tr("ft²")}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{tr("Estimated Days")}</span>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="0"
                                value={formData.estimatedDays}
                                onChange={(e) => setFormData((f) => ({ ...f, estimatedDays: e.target.value }))}
                                placeholder="e.g. 60"
                                className="w-full ps-3 pe-12 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              />
                              <span className="absolute right-2 text-[10px] font-bold text-slate-400 pointer-events-none">{tr("Days")}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] font-semibold text-slate-400 pt-0.5">
                          {tr("Used to benchmark project schedules and automated Gantt chart timelines.")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Panel 3: Media & Architectural Assets ── */}
                  <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4.5 space-y-4">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                          {tr("Documentation & Visual Assets")}
                        </h3>
                      </div>
                      
                      {/* Segmented asset switch */}
                      <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-300/60">
                        <button
                          type="button"
                          onClick={() => setAssetTab('images')}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                            assetTab === 'images'
                              ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {tr("Images (")}{images.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssetTab('files')}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                            assetTab === 'files'
                              ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {tr("Drawings (")}{files.length})
                        </button>
                      </div>
                    </div>

                    {/* Image Assets Tab */}
                    {assetTab === 'images' && (
                      <div className="space-y-3">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                        />

                        {/* Upload trigger dropzone */}
                        <div
                          onClick={() => imageInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/30 flex flex-col items-center justify-center gap-1.5",
                            uploadingImage ? "border-blue-400 bg-blue-50/20" : "border-slate-200 hover:border-blue-400"
                          )}
                        >
                          {uploadingImage ? (
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center">
                              <Upload className="w-4 h-4" />
                            </div>
                          )}
                          <p className="text-xs font-bold text-slate-800">
                            {uploadingImage ? tr("Uploading reference visuals...") : tr("Upload Reference Images & Renders")}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {tr("PNG, JPG, WEBP up to 10MB each · First image becomes card cover")}
                          </p>
                        </div>

                        {/* Uploaded images grid */}
                        {images.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
                            {images.map((url, i) => (
                              <div
                                key={i}
                                className="group relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100"
                              >
                                <img loading="lazy" decoding="async" src={url} alt="" className="w-full h-full object-cover" />
                                {i === 0 && (
                                  <span className="absolute top-1.5 left-1.5 bg-blue-600/90 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-sm">
                                    {tr("Cover")}
                                  </span>
                                )}
                                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                                    className="p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-white hover:scale-105 transition-all shadow-sm cursor-pointer"
                                    title={tr("Delete image")}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* File Assets Tab */}
                    {assetTab === 'files' && (
                      <div className="space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileUpload}
                        />

                        {/* Upload trigger dropzone */}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/30 flex flex-col items-center justify-center gap-1.5",
                            uploadingFile ? "border-blue-400 bg-blue-50/20" : "border-slate-200 hover:border-blue-400"
                          )}
                        >
                          {uploadingFile ? (
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-150 flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <p className="text-xs font-bold text-slate-800">
                            {uploadingFile ? tr("Uploading architectural drawings...") : tr("Upload Plan Files & Specifications")}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {tr("PDF, DWG, DXF, or ZIP files · Downloadable during site survey & estimation")}
                          </p>
                        </div>

                        {/* Uploaded files list */}
                        {files.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {files.map((file, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs group hover:border-blue-300 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-150 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {tr(file.name)}
                                    </p>
                                    <p className="text-[10px] font-semibold text-slate-400">
                                      {formatFileSize(file.size)}{tr(" · Architectural Document")}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title={tr("Remove plan file")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Sticky Modal Footer ── */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0 mt-auto">
                  <span className="text-[11px] font-semibold text-slate-400">
                    <span className="text-rose-500 font-bold">*</span>{tr(" Required fields marked")}
                  </span>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => { onClose(); reset(); }}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      {tr("Cancel")}
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isLoading || uploadingImage || uploadingFile}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs border border-slate-300 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEditing ? tr("Saving Template...") : tr("Creating Template...")}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{isEditing ? tr("Save Changes") : tr("Create Template")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
