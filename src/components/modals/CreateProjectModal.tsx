'use client';

import { SkeletonLoader } from '@/components/skeletons/SkeletonLoader';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, ChevronLeft, ChevronRight, ChevronDown, FolderOpen,
  FileText, Zap, Upload, Trash2, MapPin, Check,
  Plus, Navigation, Eye, Search, Building2,
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { useAuth } from '@/providers/AuthContext';
import { hasAnyRolePermission } from '@/lib/permissions';
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

const inputCls = 'w-full bg-slate-50/80 border border-slate-250/90 rounded-xl py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all hover:border-slate-300';
const inputErrCls = 'w-full bg-slate-50/80 border border-red-400 rounded-xl py-2.5 px-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm transition-all';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1.5 ml-0.5 tracking-tight';

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
  const [categorySearch, setCategorySearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  
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
    setCategorySearch('');
    setTemplateSearch('');
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

  const filteredCategories = categories.filter(c =>
    c.name?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredTemplates = templatesForCategory.filter(t =>
    t.name?.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const stepTitle =
    step === 'category' ? 'Select Project Category' :
      step === 'template' ? 'Select Template or Custom' :
        isEditing ? 'Update Project Details' : 'Configure Project Setup';

  const hasDateErrors = Object.keys(dateErrors).length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-2xl relative z-10"
          >
            <div className="bg-white rounded-2xl border border-slate-300 max-h-[90vh] overflow-hidden flex flex-col">
              
              {/* ── Modal Header ── */}
              <div className="px-5 sm:px-6 py-3.5 border-b border-slate-150 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-50 via-white to-slate-50">
                <div className="flex items-center gap-3">
                  {!isEditing && step !== 'category' && (
                    <button
                      type="button"
                      onClick={() => setStep(step === 'configure' ? 'template' : 'category')}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                      title="Back to previous step"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center shrink-0">
                    {step === 'category' ? (
                      <FolderOpen className="w-4.5 h-4.5 stroke-[2]" />
                    ) : step === 'template' ? (
                      <FileText className="w-4.5 h-4.5 stroke-[2]" />
                    ) : (
                      <Building2 className="w-4.5 h-4.5 stroke-[2]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-150">
                        {isEditing ? 'Project Management' : `Step ${step === 'category' ? '1' : step === 'template' ? '2' : '3'} of 3`}
                      </span>
                      {!isEditing && (
                        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                          {step === 'category' ? 'Category Selection' : step === 'template' ? 'Template Selection' : 'Project Setup'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
                      {stepTitle}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <div className="hidden sm:flex items-center gap-1.5 mr-2">
                      <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold", step === 'category' ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700")}>1</span>
                      <span className="w-2.5 h-0.5 bg-slate-200" />
                      <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold", step === 'template' ? "bg-blue-600 text-white" : step === 'configure' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400")}>2</span>
                      <span className="w-2.5 h-0.5 bg-slate-200" />
                      <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold", step === 'configure' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>3</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable Body Content ── */}
              <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">

                {/* STEP 1: Category */}
                {step === 'category' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
                      <div>
                        <p className="text-xs font-semibold text-slate-600">
                          Choose a project category to browse matching templates or start with custom requirements.
                        </p>
                      </div>
                      {categories.length > 3 && (
                        <div className="relative w-full sm:w-56">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={categorySearch}
                            onChange={e => setCategorySearch(e.target.value)}
                            placeholder="Search categories..."
                            className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                        </div>
                      )}
                    </div>

                    <SkeletonLoader loading={loadingModal} preset="modal">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredCategories.map((cat, i) => {
                          const catTemplates = templates.filter(t => {
                            const catId = typeof t.category === 'object' ? t.category?._id : t.category;
                            return catId === cat._id;
                          });
                          const templateCount = catTemplates.length;

                          const iconThemes = [
                            { bg: 'bg-blue-50', border: 'border-blue-150', text: 'text-blue-600' },
                            { bg: 'bg-purple-50', border: 'border-purple-150', text: 'text-purple-600' },
                            { bg: 'bg-emerald-50', border: 'border-emerald-150', text: 'text-emerald-600' },
                            { bg: 'bg-amber-50', border: 'border-amber-150', text: 'text-amber-600' },
                            { bg: 'bg-rose-50', border: 'border-rose-150', text: 'text-rose-600' },
                            { bg: 'bg-cyan-50', border: 'border-cyan-150', text: 'text-cyan-600' },
                          ];
                          const theme = iconThemes[i % iconThemes.length];

                          return (
                            <button
                              key={cat._id}
                              type="button"
                              onClick={() => { setSelectedCategory(cat); setStep('template'); }}
                              className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:bg-blue-50/20 transition-all text-left cursor-pointer active:scale-[0.99]"
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105", theme.bg, theme.border, theme.text)}>
                                  <FolderOpen className="w-4.5 h-4.5" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-full">
                                  {templateCount} {templateCount === 1 ? 'template' : 'templates'}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-extrabold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                                  {cat.name}
                                </p>
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-blue-600 transition-colors mt-1">
                                  <span>Browse templates</span>
                                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        
                        {categories.length > 0 && !loadingModal && hasAnyRolePermission(user, 'category:create') && (
                          <button
                            type="button"
                            onClick={() => { setIsAddingCategory(true); setNewCategoryName(''); }}
                            className="group flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 bg-slate-50/40 text-center cursor-pointer transition-all min-h-[110px]"
                          >
                            <div className="w-9 h-9 rounded-xl border border-dashed border-slate-300 group-hover:border-blue-400 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors mb-2">
                              <Plus className="w-4.5 h-4.5" />
                            </div>
                            <span className="text-xs font-extrabold text-slate-700 group-hover:text-blue-700 transition-colors">
                              Add New Category
                            </span>
                            <span className="text-[10.5px] text-slate-400 mt-0.5">
                              Create custom group
                            </span>
                          </button>
                        )}

                        {categories.length === 0 && !loadingModal && (
                          <div className="col-span-full flex flex-col items-center justify-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <FolderOpen className="w-10 h-10 text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-700">No categories found</p>
                            <p className="text-xs text-slate-400 mb-4">Create your first category to organize projects and templates.</p>
                            <button
                              type="button"
                              onClick={() => { setIsAddingCategory(true); setNewCategoryName(''); }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
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
                    {/* Selected Category Bar */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center shrink-0">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current Category</span>
                          <h4 className="text-xs font-extrabold text-slate-800">{selectedCategory?.name}</h4>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep('category')}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Change Category
                      </button>
                    </div>

                    <p className="text-xs font-semibold text-slate-600">
                      Select a pre-configured template or build your project from scratch.
                    </p>

                    {/* Custom Build Option */}
                    <button
                      type="button"
                      onClick={handleCustom}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-amber-400 bg-gradient-to-r from-amber-50/60 via-white to-amber-50/20 hover:bg-amber-50/80 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Zap className="w-5 h-5 text-amber-600 fill-amber-500/20" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-slate-900 text-sm group-hover:text-amber-800 transition-colors">
                              Custom Requirement
                            </p>
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/80 border border-amber-200 px-1.5 py-0.2 rounded">
                              Start Blank
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Build from scratch without a template · Configure custom phases & milestones
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-amber-700 transition-colors pl-3 shrink-0">
                        <span>Start Custom</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>

                    {/* Templates Header */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          Available Templates
                        </p>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-full">
                          {templatesForCategory.length}
                        </span>
                      </div>
                      {templatesForCategory.length > 3 && (
                        <div className="relative w-48">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={templateSearch}
                            onChange={e => setTemplateSearch(e.target.value)}
                            placeholder="Filter templates..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>

                    {filteredTemplates.length > 0 ? (
                      <div className="space-y-2">
                        {filteredTemplates.map(tpl => (
                          <button
                            key={tpl._id}
                            type="button"
                            onClick={() => handleSelectTemplate(tpl)}
                            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:bg-blue-50/20 transition-all text-left group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <FileText className="w-4.5 h-4.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 text-sm truncate group-hover:text-blue-700 transition-colors">
                                  {tpl.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {tpl.area && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                      <span>{tpl.area} {tpl.areaUnit || 'sqft'}</span>
                                    </span>
                                  )}
                                  {tpl.estimatedDays && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                      <span>{tpl.estimatedDays} days</span>
                                    </span>
                                  )}
                                  {tpl.phases && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                      <span>{tpl.phases.length} phases</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors pl-3 shrink-0">
                              <span className="hidden sm:inline">Use Template</span>
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">No templates found for this category</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 mb-3">You can proceed directly with a custom setup</p>
                        <button
                          type="button"
                          onClick={handleCustom}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-amber-400 text-slate-700 hover:text-amber-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Proceed with Custom Requirement</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Configure */}
                {step === 'configure' && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {!isEditing && (
                      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center shrink-0">
                            <FolderOpen className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Project Category</p>
                            <p className="text-xs font-extrabold text-slate-800">{selectedCategory?.name || '—'}</p>
                          </div>
                          <div className="w-px h-6 bg-slate-200 mx-1" />
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: isCustom ? '#FEF3C7' : '#EFF6FF',
                              border: isCustom ? '1px solid #FDE68A' : '1px solid #DBEAFE',
                            }}
                          >
                            {isCustom ? <Zap className="w-4 h-4 text-amber-600" /> : <FileText className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Configuration</p>
                            <p className="text-xs font-extrabold text-slate-800">
                              {isCustom ? 'Custom Blank Project' : (selectedTemplate?.name || 'Template')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep('template')}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Change
                        </button>
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
                            className={`${inputCls} pl-10`} placeholder="e.g. 742 Evergreen Terrace, Suite 100"
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
                          <div className="flex border border-gray-200 rounded-xl relative focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 bg-white">
                            <div className="relative flex items-center bg-gray-100 border-r border-gray-200 cursor-pointer min-w-[80px] rounded-l-xl hover:bg-gray-200 transition-colors" onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}>
                              <div className="flex-1 px-3 py-3 text-sm font-semibold text-slate-600 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span className="flex items-center justify-center w-5 h-5 shrink-0">
                                    {(() => {
                                      const match = currencies.find(c => c.currencyCode === form.currency);
                                      return match ? (
                                        <img loading="lazy" decoding="async" src={`https://flagcdn.com/w20/${match.cca2.toLowerCase()}.png`} alt={match.cca2} className="w-5 h-auto rounded-[2px]" />
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
                                  <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-hidden bg-white border border-slate-300 rounded-xl z-50 flex flex-col">
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
                                              <img loading="lazy" decoding="async" src={`https://flagcdn.com/w40/${c.cca2.toLowerCase()}.png`} alt={c.name} className="w-6 h-auto rounded-sm" />
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
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-250 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-all text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || uploadingDoc || uploadingDrawing || hasDateErrors}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs cursor-pointer"
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
                <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs rounded-2xl">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-white w-full max-w-md p-5 rounded-2xl border border-slate-300"
                  >
                    <form onSubmit={handleCreateCategory}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center">
                            <FolderOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-150">
                              New Category
                            </span>
                            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
                              Create Project Category
                            </h3>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingCategory(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        Add a new category to group your project templates and custom projects.
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className={labelCls}>Category Name *</label>
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            placeholder="e.g. Residential, Commercial, Renovation..."
                            className={inputCls}
                            autoFocus
                            required
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingCategory(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-250 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isCreatingCategory || !newCategoryName.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
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
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-5xl relative z-10 bg-white rounded-2xl border border-slate-300 overflow-hidden flex flex-col h-[90vh]"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                      <h3 className="text-sm font-extrabold text-slate-900">Document Preview</h3>
                      <button type="button" onClick={() => setPreviewUrl(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4 relative">
                      {isPreviewLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                      )}
                      {previewType === 'image' ? (
                        <img loading="lazy" decoding="async" 
                          src={previewUrl} 
                          alt="Preview" 
                          onLoad={() => setIsPreviewLoading(false)}
                          className={cn("max-w-full max-h-full object-contain rounded-lg border border-slate-200 transition-opacity duration-300", isPreviewLoading ? "opacity-0" : "opacity-100")} 
                        />
                      ) : (
                        <iframe 
                          src={previewUrl} 
                          onLoad={() => setIsPreviewLoading(false)}
                          className={cn("w-full h-full rounded-lg border border-slate-200 transition-opacity duration-300", isPreviewLoading ? "opacity-0" : "opacity-100")} 
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
