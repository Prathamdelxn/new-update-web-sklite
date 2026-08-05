'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, ChevronLeft, ChevronRight, ChevronDown, FolderOpen,
  FileText, Zap, Upload, Trash2, MapPin, Check,
  Plus, Navigation, Eye,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import api from '@/services/api.client';
import { uploadToCloudinary } from '@/lib/upload';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import countriesData from '@/data/countries.json';

const LocationPickerMap = dynamic(
  () => import('./LocationPickerMap').then(mod => mod.LocationPickerMap),
  { ssr: false }
);

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  projectId?: string;
}

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all';
const inputErrCls = 'w-full bg-gray-50 border border-red-400 rounded-xl py-3 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm transition-all';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1.5 ml-0.5';

const emptyForm = {
  name: '',
  siteLocationAddress: '',
  siteLocationLatitude: '',
  siteLocationLongitude: '',
  attendanceRadius: 100,
  area: '',
  areaUnit: 'sqft',
  budget: '',
  currency: 'AED',
  description: '',
  startDate: '',
  endDate: '',
  needSiteSurvey: false,
  projectType: 'Construction' as 'Construction' | 'Interior',
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen, onClose, onSuccess, initialData, projectId,
}) => {
  const isEditing = !!initialData && !!projectId;
  const toast = useToast();
  const { user } = useAuth();
  const isInterior =
    (user as any)?.industryType === 'interior' ||
    (user?.organization as any)?.industryType === 'interior';

  // ── Step state (only for create mode) ──
  const [step, setStep] = useState<'category' | 'template' | 'configure'>('category');
  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>(countriesData);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  
  // Category creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);

  // ── Form state ──
  const [form, setForm] = useState(emptyForm);
  const [documents, setDocuments] = useState<{ name: string; url: string; size: number; mimeType: string }[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [drawings, setDrawings] = useState<{ name: string; url: string; size: number; mimeType: string }[]>([]);
  const [uploadingDrawing, setUploadingDrawing] = useState(false);
  const drawingInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Date validation ──
  const [dateErrors, setDateErrors] = useState<{ startDate?: string; endDate?: string }>({});

  // ── Open effect ──
  React.useEffect(() => {
    if (!isOpen) return;
    setDateErrors({});
    if (isEditing) {
      setStep('configure');
      setForm({
        name: initialData.name || '',
        siteLocationAddress: initialData.siteLocation?.address || '',
        siteLocationLatitude: initialData.siteLocation?.latitude?.toString() || '',
        siteLocationLongitude: initialData.siteLocation?.longitude?.toString() || '',
        attendanceRadius: initialData.attendanceRadius ?? 100,
        area: initialData.area || '',
        areaUnit: initialData.areaUnit || 'sqft',
        budget: '',
        currency: initialData.currency || 'AED',
        description: initialData.description || '',
        startDate: initialData.startDate ? initialData.startDate.split('T')[0] : '',
        endDate: initialData.endDate ? initialData.endDate.split('T')[0] : '',
        needSiteSurvey: initialData.needSiteSurvey || false,
        projectType: (initialData.projectType as 'Construction' | 'Interior') || (isInterior ? 'Interior' : 'Construction'),
      });
      setDocuments(initialData.documents || []);
      // If we need to fetch drawings for editing, we could, but editing existing drawings isn't explicitly requested here
    } else {
      setStep('category');
      setForm({ ...emptyForm, projectType: isInterior ? 'Interior' : 'Construction' });
      setDocuments([]);
      setDrawings([]);
      setSelectedCategory(null);
      setSelectedTemplate(null);
      setIsCustom(false);
      fetchModalData();
    }
  }, [isOpen]);

  const fetchModalData = async () => {
    setLoadingModal(true);
    try {
      const [catRes, tempRes] = await Promise.all([
        api.get('/template-categories'),
        api.get('/templates')
      ]);
      setCategories(catRes.data);
      setTemplates(tempRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
    } finally {
      setLoadingModal(false);
    }
  };
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setIsCreatingCategory(true);
    try {
      const response = await api.post('/template-categories', { name });
      toast.success('Category created successfully!');
      setNewCategoryName('');
      setIsAddingCategory(false);
      
      // Refresh categories list
      const catRes = await api.get('/template-categories');
      setCategories(catRes.data);
      
      // Auto-select the newly created category
      const createdCategory = catRes.data.find(
        (c: any) => c.name.toLowerCase() === name.toLowerCase()
      ) || response.data;
      
      if (createdCategory) {
        setSelectedCategory(createdCategory);
        setStep('template');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setForm(f => ({
          ...f,
          siteLocationLatitude: latitude.toFixed(6),
          siteLocationLongitude: longitude.toFixed(6),
        }));
        toast.success('Location coordinates fetched!');

        // Attempt reverse geocoding via public Nominatim API
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setForm(f => ({
                ...f,
                siteLocationAddress: data.display_name,
              }));
            }
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        
        let errorMessage = 'Failed to get location';
        if (error.code === 1) errorMessage = 'Location permission denied. Please allow access in browser settings.';
        else if (error.code === 2) errorMessage = window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' ? 'Location requires HTTPS when accessed over the network.' : 'Location unavailable. Ensure device location services are enabled.';
        else if (error.code === 3) errorMessage = 'Location request timed out.';
        else if (error.message) errorMessage = error.message;

        toast.error(errorMessage);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Date validation helpers ──
  const validateDates = (startDate: string, endDate: string) => {
    const errs: { startDate?: string; endDate?: string } = {};
    if (endDate && !startDate) {
      errs.startDate = 'Start date is required when end date is set';
    } else if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s.getTime())) {
        errs.startDate = 'Invalid start date';
      } else if (isNaN(e.getTime())) {
        errs.endDate = 'Invalid end date';
      } else if (e < s) {
        errs.endDate = 'End date must be on or after start date';
      }
    }
    return errs;
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const updated = field === 'startDate'
      ? { startDate: value, endDate: form.endDate }
      : { startDate: form.startDate, endDate: value };
    setForm(f => ({ ...f, [field]: value }));
    setDateErrors(validateDates(updated.startDate, updated.endDate));
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploadingDoc(true);
    try {
      const uploaded = await Promise.all(
        picked.map(async f => {
          const url = await uploadToCloudinary(f);
          return { name: f.name, url, size: f.size, mimeType: f.type };
        })
      );
      setDocuments(prev => [...prev, ...uploaded]);
    } catch {
      toast.error('Document upload failed');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDrawingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploadingDrawing(true);
    try {
      const uploaded = await Promise.all(
        picked.map(async f => {
          const url = await uploadToCloudinary(f);
          return { name: f.name, url, size: f.size, mimeType: f.type };
        })
      );
      setDrawings(prev => [...prev, ...uploaded]);
    } catch {
      toast.error('Drawing upload failed');
    } finally {
      setUploadingDrawing(false);
      e.target.value = '';
    }
  };

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplate(tpl);
    setIsCustom(false);
    setForm(f => ({
      ...f,
      name: f.name || tpl.name,
      area: tpl.area?.toString() || f.area,
      budget: tpl.maxBudget?.toString() || f.budget,
    }));
    setStep('configure');
  };

  const handleCustom = () => {
    setIsCustom(true);
    setSelectedTemplate(null);
    setStep('configure');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }

    // Date validation on submit
    const errs = validateDates(form.startDate, form.endDate);
    if (Object.keys(errs).length > 0) {
      setDateErrors(errs);
      toast.error('Please fix the date errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const siteLocationObj = {
        address: form.siteLocationAddress,
        latitude: form.siteLocationLatitude ? Number(form.siteLocationLatitude) : undefined,
        longitude: form.siteLocationLongitude ? Number(form.siteLocationLongitude) : undefined,
      };

      if (isEditing) {
        const payload: any = {
          name: form.name,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          needSiteSurvey: form.needSiteSurvey,
          projectType: form.projectType,
          description: form.description || undefined,
          siteLocation: siteLocationObj,
          attendanceRadius: form.attendanceRadius ? Number(form.attendanceRadius) : 100,
        };
        if (form.area) payload.area = Number(form.area);
        payload.areaUnit = form.areaUnit;
        payload.currency = form.currency;
        await api.patch(`/projects/${projectId}`, payload);
        toast.success('Project updated successfully!');
      } else {
        const payload: any = {
          name: form.name,
          description: form.description || undefined,
          category: selectedCategory?._id,
          createdBy: user?.id,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          needSiteSurvey: form.needSiteSurvey,
          projectType: form.projectType,
          budget: form.budget ? form.budget : undefined,
          currency: form.currency,
          areaUnit: form.areaUnit,
          documents: documents.length > 0 ? documents : undefined,
          drawings: drawings.length > 0 ? drawings : undefined,
          siteLocation: siteLocationObj,
          attendanceRadius: form.attendanceRadius ? Number(form.attendanceRadius) : 100,
        };
        if (form.area) payload.area = Number(form.area);
        if (selectedTemplate) payload.templateId = selectedTemplate._id;
        await api.post('/projects', payload);
        toast.success('Project created successfully!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const templatesForCategory = selectedCategory
    ? templates.filter(t => {
      const catId = typeof t.category === 'object' ? t.category?._id : t.category;
      return catId === selectedCategory._id;
    })
    : templates;

  const stepTitle =
    step === 'category' ? 'Select Category' :
      step === 'template' ? 'Select Template' :
        isEditing ? 'Update Details' : 'Configure Setup';

  const hasDateErrors = Object.keys(dateErrors).length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {!isEditing && step !== 'category' && (
                      <button
                        onClick={() => setStep(step === 'configure' ? 'template' : 'category')}
                        className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-slate-500 hover:text-gray-900 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        {isEditing ? 'Edit Project' : 'New Project'}
                      </p>
                      <h2 className="text-xl font-black text-gray-900">{stepTitle}</h2>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* STEP 1: Category */}
                {step === 'category' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">Choose a project category to get started.</p>
                    <SkeletonLoader loading={loadingModal} preset="modal">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {categories.map((cat, i) => {
                          const iconColors = [
                            'text-blue-500 bg-blue-50 border-blue-100',
                            'text-purple-500 bg-purple-50 border-purple-100',
                            'text-emerald-500 bg-emerald-50 border-emerald-100',
                            'text-amber-500 bg-amber-50 border-amber-100',
                            'text-red-500 bg-red-50 border-red-100',
                            'text-cyan-500 bg-cyan-50 border-cyan-100',
                          ];
                          const c = iconColors[i % iconColors.length];
                          return (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() => { setSelectedCategory(cat); setStep('template'); }}
                              className="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-slate-50/50 transition-all text-left font-bold text-slate-700 hover:text-blue-700 hover:shadow-sm"
                            >
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0", c)}>
                                <FolderOpen className="w-4 h-4" />
                              </div>
                              <span className="truncate text-xs leading-none">{cat.name}</span>
                            </button>
                          );
                        })}
                        
                        {categories.length > 0 && !loadingModal && (
                          <button
                            type="button"
                            onClick={() => { setIsAddingCategory(true); setNewCategoryName(''); }}
                            className="flex items-center gap-3 p-2.5 rounded-2xl border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-450 hover:bg-slate-50 font-bold text-xs transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg border border-dashed border-slate-250 flex items-center justify-center shrink-0">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span>Add Category</span>
                          </button>
                        )}

                        {categories.length === 0 && !loadingModal && (
                          <div className="col-span-full flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <FolderOpen className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-500 mb-4">No categories available</p>
                            <button
                              type="button"
                              onClick={() => { setIsAddingCategory(true); setNewCategoryName(''); }}
                              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-md shadow-blue-600/10"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Create First Category</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </SkeletonLoader>
                  </div>
                )}

                {/* STEP 2: Template */}
                {step === 'template' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm font-bold text-blue-800">{selectedCategory?.name}</span>
                    </div>
                    <p className="text-sm text-slate-500">Select a template or start with a custom setup.</p>

                    <button
                      onClick={handleCustom}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                        <Zap className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-800">Custom Requirement</p>
                        <p className="text-xs text-amber-600 mt-0.5">Build from scratch without a template</p>
                      </div>
                    </button>

                    {templatesForCategory.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Templates</p>
                        {templatesForCategory.map(tpl => (
                          <button
                            key={tpl._id}
                            onClick={() => handleSelectTemplate(tpl)}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate group-hover:text-blue-700 transition-colors">{tpl.name}</p>
                              {(tpl.area || tpl.estimatedDays) && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {tpl.area ? `${tpl.area} sqft` : ''}
                                  {tpl.area && tpl.estimatedDays ? ' · ' : ''}
                                  {tpl.estimatedDays ? `${tpl.estimatedDays} days` : ''}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {templatesForCategory.length === 0 && (
                      <p className="text-sm text-center text-slate-400 py-4">No templates for this category.</p>
                    )}
                  </div>
                )}

                {/* STEP 3: Configure */}
                {step === 'configure' && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {!isEditing && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <FolderOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Category</p>
                          <p className="text-sm font-bold text-gray-900">{selectedCategory?.name || '—'}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200 mx-2" />
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: isCustom ? '#FEF3C7' : '#EFF6FF' }}>
                          {isCustom ? <Zap className="w-5 h-5 text-amber-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configuration</p>
                          <p className="text-sm font-bold text-gray-900">
                            {isCustom ? 'Custom Build' : `Template: ${selectedTemplate?.name}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Project Details */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Project Details</h3>

                      <div>
                        <label className={labelCls}>Project Name *</label>
                        <input required type="text" value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className={inputCls} placeholder="e.g. Skyline Residency"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5 ml-0.5">
                          <label className="text-xs font-bold text-slate-600">Site Location</label>
                          <button
                            type="button"
                            onClick={handleGetCurrentLocation}
                            disabled={isLocating}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-500 transition-colors disabled:opacity-50"
                          >
                            {isLocating ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Locating...</span>
                              </>
                            ) : (
                              <>
                                <Navigation className="w-3 h-3" />
                                <span>Get Current Location</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsMapOpen(true)}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white border border-gray-200 px-2 py-1 rounded-md"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Map</span>
                          </button>
                        </div>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" value={form.siteLocationAddress}
                            onChange={e => setForm(f => ({ ...f, siteLocationAddress: e.target.value }))}
                            className={`${inputCls} pl-10`} placeholder="e.g. 123 Luxury Ave, Mumbai"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className={labelCls}>Attendance Radius</label>
                          <input type="number" value={form.attendanceRadius}
                            onChange={e => setForm(f => ({ ...f, attendanceRadius: Number(e.target.value) || 0 }))}
                            className={inputCls} placeholder="e.g. 100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Project Area</label>
                          <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                            <input type="number" value={form.area}
                              onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                              className="w-full bg-gray-50 py-3 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none text-sm" placeholder="e.g. 2400"
                            />
                            <select
                              value={form.areaUnit}
                              onChange={e => setForm(f => ({ ...f, areaUnit: e.target.value as 'sqft' | 'sqm' }))}
                              className="bg-gray-100 border-l border-gray-200 text-sm font-semibold text-slate-600 px-3 outline-none cursor-pointer"
                            >
                              <option value="sqft">SQFT</option>
                              <option value="sqm">SQM</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Est Budget</label>
                          <div className="flex border border-gray-200 rounded-xl relative focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 bg-white shadow-sm">
                            <div className="relative flex items-center bg-gray-100 border-r border-gray-200 cursor-pointer min-w-[80px] rounded-l-xl hover:bg-gray-200 transition-colors" onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}>
                              <div className="flex-1 px-3 py-3 text-sm font-semibold text-slate-600 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span className="flex items-center justify-center w-5 h-5 shrink-0">
                                    {(() => {
                                      const match = currencies.find(c => c.currencyCode === form.currency);
                                      return match ? (
                                        <img src={`https://flagcdn.com/w20/${match.cca2.toLowerCase()}.png`} alt={match.cca2} className="w-5 h-auto shadow-sm rounded-[2px]" />
                                      ) : '🌍';
                                    })()}
                                  </span>
                                  {form.currency}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
                              </div>
                              {isCurrencyDropdownOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsCurrencyDropdownOpen(false); }} />
                                  <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-hidden bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex flex-col">
                                    <div className="p-2 border-b border-gray-100">
                                      <input 
                                        type="text" 
                                        placeholder="Search country or currency..." 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                        value={currencySearch}
                                        onChange={(e) => setCurrencySearch(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
                                      {currencies
                                        .filter(c => 
                                          c.name.toLowerCase().includes(currencySearch.toLowerCase()) || 
                                          c.currencyCode.toLowerCase().includes(currencySearch.toLowerCase()) ||
                                          c.currencyName.toLowerCase().includes(currencySearch.toLowerCase())
                                        )
                                        .map((c, i) => (
                                          <div 
                                            key={i} 
                                            className="px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 cursor-pointer rounded-lg transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setForm(f => ({ ...f, currency: c.currencyCode }));
                                              setIsCurrencyDropdownOpen(false);
                                              setCurrencySearch('');
                                            }}
                                          >
                                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                              <img src={`https://flagcdn.com/w40/${c.cca2.toLowerCase()}.png`} alt={c.name} className="w-6 h-auto shadow-sm rounded-sm" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                              <span className="text-sm font-bold text-gray-900 truncate">{c.name}</span>
                                              <span className="text-[10px] text-slate-500 truncate">{c.currencyCode} · {c.currencyName}</span>
                                            </div>
                                          </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            <input type="number" value={form.budget}
                              onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                              className="w-full bg-gray-50 py-3 px-4 text-gray-900 placeholder:text-slate-400 focus:outline-none text-sm rounded-r-xl" placeholder="e.g. 50000"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Date fields with validation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Start Date</label>
                          <input
                            type="date"
                            value={form.startDate}
                            onChange={e => handleDateChange('startDate', e.target.value)}
                            className={dateErrors.startDate ? inputErrCls : inputCls}
                          />
                          {dateErrors.startDate && (
                            <p className="mt-1 text-[11px] font-semibold text-red-500 flex items-center gap-1">
                              <span>⚠</span> {dateErrors.startDate}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className={labelCls}>Target End Date</label>
                          <input
                            type="date"
                            value={form.endDate}
                            min={form.startDate || undefined}
                            onChange={e => handleDateChange('endDate', e.target.value)}
                            className={dateErrors.endDate ? inputErrCls : inputCls}
                          />
                          {dateErrors.endDate && (
                            <p className="mt-1 text-[11px] font-semibold text-red-500 flex items-center gap-1">
                              <span>⚠</span> {dateErrors.endDate}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div
                              onClick={() => setForm(f => ({ ...f, needSiteSurvey: !f.needSiteSurvey }))}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${form.needSiteSurvey ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                            >
                              {form.needSiteSurvey && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-sm font-semibold text-slate-600">Need Site Survey</span>
                          </label>
                        </div>
                      </div>

                    </div>

                    {/* Technical Drawings */}
                    {!isEditing && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Technical Drawings</h3>
                          <button
                            type="button" onClick={() => drawingInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all"
                            disabled={uploadingDrawing}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Add Drawing</span>
                          </button>
                        </div>
                        <input ref={drawingInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleDrawingUpload} />

                        {drawings.length > 0 ? (
                          <div className="space-y-2">
                            {drawings.map((doc, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">{doc.name}</p>
                                  <p className="text-[10px] text-slate-400">{(doc.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewUrl(doc.url);
                                      setPreviewType(doc.mimeType?.startsWith('image') ? 'image' : 'pdf');
                                      setIsPreviewLoading(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                    title="Preview"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => setDrawings(prev => prev.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {uploadingDrawing && (
                              <div className="flex items-center gap-2 p-3 border border-dashed border-blue-200 rounded-xl text-blue-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-semibold">Uploading...</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button" onClick={() => drawingInputRef.current?.click()}
                            className="w-full border border-dashed border-gray-300 rounded-xl p-5 text-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all text-xs font-semibold"
                            disabled={uploadingDrawing}
                          >
                            {uploadingDrawing ? 'Uploading...' : 'No drawings attached. Upload CAD/PDF files.'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Documents */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Project Documents</h3>
                        <button
                          type="button" onClick={() => docInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all"
                          disabled={uploadingDoc}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Add File</span>
                        </button>
                      </div>
                      <input ref={docInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleDocUpload} />

                      {documents.length > 0 ? (
                        <div className="space-y-2">
                          {documents.map((doc, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{doc.name}</p>
                                <p className="text-[10px] text-slate-400">{(doc.size / 1024).toFixed(1)} KB</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewUrl(doc.url);
                                    setPreviewType(doc.mimeType?.startsWith('image') ? 'image' : 'pdf');
                                    setIsPreviewLoading(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button type="button" onClick={() => setDocuments(prev => prev.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Remove">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {uploadingDoc && (
                            <div className="flex items-center gap-2 p-3 border border-dashed border-blue-200 rounded-xl text-blue-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-xs font-semibold">Uploading...</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button" onClick={() => docInputRef.current?.click()}
                          className="w-full border border-dashed border-gray-300 rounded-xl p-5 text-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all text-xs font-semibold"
                          disabled={uploadingDoc}
                        >
                          {uploadingDoc ? 'Uploading...' : 'No documents attached. Upload site plans or images.'}
                        </button>
                      )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 font-bold transition-all">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || uploadingDoc || uploadingDrawing || hasDateErrors}
                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                      >
                        {isSubmitting
                          ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{isEditing ? 'Saving...' : 'Creating...'}</span></>
                          : <span>{isEditing ? 'Save Changes' : 'Finalize & Create'}</span>
                        }
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
            
            {/* Add Category Dialog Overlay */}
            <AnimatePresence>
              {isAddingCategory && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm rounded-2xl">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white w-full max-w-md p-6 rounded-2xl border border-gray-200 shadow-xl"
                  >
                    <form onSubmit={handleCreateCategory}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-black text-gray-900">Create New Category</h3>
                        <button
                          type="button"
                          onClick={() => setIsAddingCategory(false)}
                          className="p-1 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">Add a new category to group your project templates and custom projects.</p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Category Name *</label>
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            placeholder="e.g. Residential, Commercial..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-gray-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            autoFocus
                            required
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingCategory(false)}
                            className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-600 text-sm font-bold transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isCreatingCategory || !newCategoryName.trim()}
                            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {isCreatingCategory ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Create Category</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <LocationPickerMap
              isOpen={isMapOpen}
              onClose={() => setIsMapOpen(false)}
              onSelectLocation={(lat, lng) => setForm(f => ({
                ...f,
                siteLocationLatitude: lat.toFixed(6),
                siteLocationLongitude: lng.toFixed(6)
              }))}
              initialLat={form.siteLocationLatitude ? Number(form.siteLocationLatitude) : undefined}
              initialLng={form.siteLocationLongitude ? Number(form.siteLocationLongitude) : undefined}
            />

            <AnimatePresence>
              {previewUrl && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setPreviewUrl(null)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-5xl relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                      <h3 className="text-lg font-black text-gray-900">Document Preview</h3>
                      <button type="button" onClick={() => setPreviewUrl(null)} className="p-2 text-slate-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4 relative">
                      {isPreviewLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                      )}
                      {previewType === 'image' ? (
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          onLoad={() => setIsPreviewLoading(false)}
                          className={cn("max-w-full max-h-full object-contain rounded-lg shadow-sm transition-opacity duration-300", isPreviewLoading ? "opacity-0" : "opacity-100")} 
                        />
                      ) : (
                        <iframe 
                          src={previewUrl} 
                          onLoad={() => setIsPreviewLoading(false)}
                          className={cn("w-full h-full rounded-lg shadow-sm border-0 transition-opacity duration-300", isPreviewLoading ? "opacity-0" : "opacity-100")} 
                          title="PDF Preview" 
                        />
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
