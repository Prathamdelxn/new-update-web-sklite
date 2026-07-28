'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Map, Zap, Droplets, Mountain,
  DollarSign, Home, Wind, Ruler, Camera, Image as ImageIcon, Trash2, Plus, Info
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/upload';
import { useProjectContext } from '@/features/projects/contexts/ProjectContext';
import { formatCurrency } from '@/lib/utils';

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  projectType?: 'Construction' | 'Interior';
  project?: any;
  existingSurvey?: any;
}

const Switch = ({ checked, onChange, activeColor = 'bg-blue-600' }: { checked: boolean; onChange: (v: boolean) => void, activeColor?: string }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn(
      'w-12 h-6 rounded-full relative transition-all duration-300 ease-in-out shrink-0',
      checked ? activeColor : 'bg-slate-300'
    )}
  >
    <div className={cn(
      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ease-in-out shadow-sm',
      checked ? 'right-1' : 'left-1'
    )} />
  </button>
);

const ToggleRow = ({ label, subLabel, checked, onChange, activeColor }: any) => (
  <div className="flex items-center justify-between py-3">
    <div className="pr-4">
      <span className="text-sm font-bold text-slate-900 block">{label}</span>
      {subLabel && <span className="text-xs font-medium text-slate-500 block mt-0.5">{subLabel}</span>}
    </div>
    <Switch checked={checked} onChange={onChange} activeColor={activeColor} />
  </div>
);

export const SurveyModal: React.FC<SurveyModalProps> = ({
  isOpen, onClose, onSuccess, projectId, projectType = 'Construction', project, existingSurvey,
}) => {
  const isInterior = projectType === 'Interior';
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  console.log(project);
  const budgetHistory = project?.budgetHistory;
  const currentBudgetAmount = (budgetHistory && budgetHistory.length > 0) 
    ? budgetHistory[budgetHistory.length - 1].amount 
    : 0;

  // Common fields
  const [accessibility, setAccessibility] = useState('Good');
  const [powerAvailable, setPowerAvailable] = useState(false);
  const [waterAvailable, setWaterAvailable] = useState(false);
  const [notes, setNotes] = useState('');
  const [affectsBudget, setAffectsBudget] = useState(false);
  const [recommendedBudget, setRecommendedBudget] = useState('');
  const [budgetReason, setBudgetReason] = useState('');

  // Construction-only
  const [terrainNotes, setTerrainNotes] = useState('');

  // Interior-only
  const [roomCount, setRoomCount] = useState('');
  const [ceilingHeight, setCeilingHeight] = useState('');
  const [naturalLighting, setNaturalLighting] = useState('Good');
  const [ventilationAvailable, setVentilationAvailable] = useState(false);
  const [structuralModification, setStructuralModification] = useState(false);
  const [structuralNotes, setStructuralNotes] = useState('');
  const [clientStylePreference, setClientStylePreference] = useState('');

  // Media files states
  const [observationImage, setObservationImage] = useState<string>('');
  const [observationFile, setObservationFile] = useState<File | null>(null);
  
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  const obsInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setAccessibility('Good');
    setPowerAvailable(false);
    setWaterAvailable(false);
    setNotes('');
    setAffectsBudget(false);
    setRecommendedBudget('');
    setBudgetReason('');
    setTerrainNotes('');
    setRoomCount('');
    setCeilingHeight('');
    setNaturalLighting('Good');
    setVentilationAvailable(false);
    setStructuralModification(false);
    setStructuralNotes('');
    setClientStylePreference('');
    setObservationImage('');
    setObservationFile(null);
    setAdditionalPhotos([]);
    setAdditionalFiles([]);
  };

  useEffect(() => {
    if (isOpen) {
      if (existingSurvey) {
        setAccessibility(existingSurvey.accessibility || 'Good');
        setPowerAvailable(existingSurvey.powerAvailable || false);
        setWaterAvailable(existingSurvey.waterAvailable || false);
        setNotes(existingSurvey.surveyorComments || '');
        setAffectsBudget(existingSurvey.affectsBudget || false);
        setRecommendedBudget(existingSurvey.recommendedBudget?.toString() || '');
        setBudgetReason(existingSurvey.budgetReason || '');
        setTerrainNotes(existingSurvey.terrainNotes || '');
        setRoomCount(existingSurvey.roomCount?.toString() || '');
        setCeilingHeight(existingSurvey.ceilingHeight || '');
        setNaturalLighting(existingSurvey.naturalLighting || 'Good');
        setVentilationAvailable(existingSurvey.ventilationAvailable || false);
        setStructuralModification(existingSurvey.structuralModification || false);
        setStructuralNotes(existingSurvey.structuralNotes || '');
        setClientStylePreference(existingSurvey.clientStylePreference || '');
        setObservationImage(existingSurvey.observationImage || '');
        setAdditionalPhotos(existingSurvey.additionalPhotos || []);
        setObservationFile(null);
        setAdditionalFiles([]);
      } else {
        reset();
      }
    }
  }, [isOpen, existingSurvey]);

  const handleObsImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setObservationFile(e.target.files[0]);
    }
  };

  const handleAddPhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setAdditionalFiles(prev => [...prev, ...selected]);
    }
  };

  const removeAdditionalPhotoUrl = (idx: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const removeAdditionalFile = (idx: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Upload main observation image if a new file is picked
      let uploadedObsUrl = observationImage;
      if (observationFile) {
        uploadedObsUrl = await uploadToCloudinary(observationFile);
      }

      // 2. Upload any new additional photos files and merge with existing URLs
      const uploadedAdditionalUrls = await Promise.all(
        additionalFiles.map(file => uploadToCloudinary(file))
      );
      const mergedAdditionalPhotos = [...additionalPhotos, ...uploadedAdditionalUrls];

      const payload: any = {
        accessibility,
        powerAvailable,
        waterAvailable,
        surveyorComments: notes,
        affectsBudget,
        recommendedBudget: affectsBudget && recommendedBudget ? Number(recommendedBudget) : undefined,
        budgetReason: affectsBudget ? budgetReason : undefined,
        observationImage: uploadedObsUrl || undefined,
        additionalPhotos: mergedAdditionalPhotos,
        projectType,
      };

      if (isInterior) {
        payload.roomCount = roomCount ? Number(roomCount) : undefined;
        payload.ceilingHeight = ceilingHeight || undefined;
        payload.naturalLighting = naturalLighting;
        payload.ventilationAvailable = ventilationAvailable;
        payload.structuralModification = structuralModification;
        payload.structuralNotes = structuralModification ? structuralNotes : undefined;
        payload.clientStylePreference = clientStylePreference || undefined;
      } else {
        payload.terrainNotes = terrainNotes;
      }

      if (existingSurvey) {
        // PATCH update mode
        payload.action = 'UpdateDetails';
        await api.patch(`/projects/${projectId}/survey`, payload);
        toast.success('Site survey updated!');
      } else {
        // POST create mode
        await api.post(`/projects/${projectId}/survey`, payload);
        toast.success('Site survey report lodged!');
      }

      onSuccess();
      onClose();
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit survey');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-semibold';
  const accessibilityOptions = isInterior
    ? ['Good', 'Fair', 'Poor', 'Needs Work']
    : ['Good', 'Fair', 'Poor', 'Hazardous'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl relative z-10 max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl border', isInterior ? 'bg-purple-50 border-purple-150' : 'bg-blue-50 border-blue-150')}>
                  {isInterior ? <Home className="w-6 h-6 text-purple-600" /> : <Map className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {existingSurvey
                      ? `Edit ${isInterior ? 'Interior' : 'Site'} Survey`
                      : (isInterior ? 'Interior Space Survey' : 'Record Site Survey')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isInterior ? 'Space condition & design assessment' : 'Physical terrain and resource assessment'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Section: Conditions & Utilities */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-2">
                  {isInterior ? 'Space & Condition Assessment' : 'Conditions & Utilities'}
                </p>
                <div>
                  <label className="text-sm font-bold text-slate-900 mb-2 block">
                    {isInterior ? 'Overall Space Condition' : 'Overall Accessibility'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {accessibilityOptions.map(o => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setAccessibility(o)}
                        className={cn(
                          'py-2.5 rounded-xl border text-xs font-bold transition-all text-center',
                          accessibility === o
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/20'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                        )}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-1" />

                <ToggleRow
                  label={isInterior ? 'Electrical Points Accessible' : 'Power Infrastructure Available'}
                  subLabel={isInterior ? 'Existing outlets and wiring in place' : 'Existing grid connections'}
                  checked={powerAvailable}
                  onChange={setPowerAvailable}
                />

                <div className="border-t border-slate-100 pt-1" />

                <ToggleRow
                  label={isInterior ? 'Plumbing Accessible' : 'Water Connection Available'}
                  subLabel={isInterior ? 'Kitchen/bathroom plumbing lines' : 'Municipal or well connection'}
                  checked={waterAvailable}
                  onChange={setWaterAvailable}
                />
              </div>

              {/* Construction-only: Terrain */}
              {!isInterior && (
                <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-2">Terrain & Soil</p>
                  <label className="text-sm font-bold text-slate-900 block mb-1">Terrain / Soil Notes</label>
                  <textarea required rows={2.5} value={terrainNotes} onChange={e => setTerrainNotes(e.target.value)}
                    className={`${inputCls} resize-none`} placeholder="Soil type, slope, clearing needed..." />
                </div>
              )}

              {/* Interior-only sections */}
              {isInterior && (
                <>
                  {/* Room Details */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-2">Room Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-900 mb-2 block">Room Count</label>
                        <input type="number" min="1" value={roomCount} onChange={e => setRoomCount(e.target.value)}
                          className={inputCls} placeholder="e.g. 8" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-900 mb-2 block">Ceiling Height</label>
                        <input type="text" value={ceilingHeight} onChange={e => setCeilingHeight(e.target.value)}
                          className={inputCls} placeholder="e.g. 3.2m" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-900 mb-2 block">Natural Lighting</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['Excellent', 'Good', 'Limited', 'None'].map(o => (
                          <button key={o} type="button" onClick={() => setNaturalLighting(o)}
                            className={cn('py-2.5 rounded-xl border text-xs font-bold transition-all text-center',
                              naturalLighting === o
                                ? 'bg-amber-100 border-amber-400 text-amber-800'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                            )}>{o}</button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-1" />

                    <ToggleRow
                      label="Ventilation / AC Available"
                      subLabel="Existing ducting or split unit points"
                      checked={ventilationAvailable}
                      onChange={setVentilationAvailable}
                      activeColor="bg-cyan-500"
                    />
                  </div>

                  {/* Structural & Design */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-2">Structural & Design</p>
                    
                    <ToggleRow
                      label="Structural Modifications Needed"
                      subLabel="Wall removal, partition additions, beam work"
                      checked={structuralModification}
                      onChange={setStructuralModification}
                      activeColor="bg-orange-500"
                    />
                    
                    {structuralModification && (
                      <div className="mt-2">
                        <label className="text-sm font-bold text-slate-900 mb-2 block">Structural Notes</label>
                        <textarea rows={2.5} value={structuralNotes} onChange={e => setStructuralNotes(e.target.value)}
                          className={`${inputCls} resize-none`} placeholder="Describe required structural changes..." />
                      </div>
                    )}
                    
                    <div className="border-t border-slate-100 pt-1 mt-2" />

                    <div>
                      <label className="text-sm font-bold text-slate-900 mb-2 block">Client Style Preference</label>
                      <textarea rows={3} value={clientStylePreference} onChange={e => setClientStylePreference(e.target.value)}
                        className={`${inputCls} resize-none`} placeholder="e.g. Modern minimalist, warm tones, open-plan kitchen preferred..." />
                    </div>
                  </div>
                </>
              )}

              {/* Photo Upload Sections */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-6">
                
                {/* Main Observation Image */}
                <div>
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Media Observations</p>
                  <label className="text-sm font-bold text-slate-900 mb-2 block">
                    {isInterior ? 'Space Photo (Observation)' : 'Site Photo (Observation)'}
                  </label>
                  <input type="file" accept="image/*" className="hidden" ref={obsInputRef} onChange={handleObsImageSelect} />
                  
                  <div
                    onClick={() => obsInputRef.current?.click()}
                    className="w-full h-44 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden group transition-all"
                  >
                    {observationFile ? (
                      <img src={URL.createObjectURL(observationFile)} alt="Obs preview" className="w-full h-full object-cover" />
                    ) : observationImage ? (
                      <img src={observationImage} alt="Obs source" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="w-8 h-8 text-slate-450 mx-auto mb-1 group-hover:text-blue-500 transition-colors" />
                        <p className="text-xs font-bold text-slate-500">Select {isInterior ? 'space' : 'site'} observation image</p>
                      </div>
                    )}
                  </div>
                  {(observationFile || observationImage) && (
                    <button
                      type="button"
                      onClick={() => {
                        setObservationFile(null);
                        setObservationImage('');
                      }}
                      className="mt-3 text-xs font-bold text-red-500 flex items-center gap-1 hover:text-red-650"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Image
                    </button>
                  )}
                </div>

                {/* Additional Room Photos (Interior-only) */}
                {isInterior && (
                  <div>
                    <label className="text-sm font-bold text-slate-900 mb-3 block border-t border-slate-100 pt-4">Additional Space Photos</label>
                    <input type="file" accept="image/*" multiple className="hidden" ref={addInputRef} onChange={handleAddPhotosSelect} />
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {/* Upload button */}
                      <div
                        onClick={() => addInputRef.current?.click()}
                        className="h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-1 group transition-all"
                      >
                        <Plus className="w-6 h-6 text-slate-450 group-hover:text-blue-500" />
                        <span className="text-[10px] font-bold text-slate-500">Add Photo</span>
                      </div>

                      {/* Existing Photos URLs */}
                      {additionalPhotos.map((url, idx) => (
                        <div key={`url-${idx}`} className="h-24 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative group">
                          <img src={url} alt="Space attachment" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeAdditionalPhotoUrl(idx)}
                            className="absolute top-1 right-1 p-1 bg-white/80 rounded-lg hover:bg-white text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* New Photos Files */}
                      {additionalFiles.map((file, idx) => (
                        <div key={`file-${idx}`} className="h-24 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative group">
                          <img src={URL.createObjectURL(file)} alt="File attachment" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeAdditionalFile(idx)}
                            className="absolute top-1 right-1 p-1 bg-white/80 rounded-lg hover:bg-white text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Surveyor Comments (common) */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-100 pb-2">Comments</p>
                <label className="text-sm font-bold text-slate-900 block mb-1">Surveyor Comments</label>
                <textarea rows={2.5} value={notes} onChange={e => setNotes(e.target.value)}
                  className={`${inputCls} resize-none`} placeholder="General observations..." />
              </div>

              {/* Budget Impact (common) */}
              <div className={cn('p-5 rounded-2xl border transition-all', affectsBudget ? 'bg-red-50/50 border-red-200' : 'bg-slate-50 border-slate-250')}>
                <ToggleRow
                  label="Affects Initial Budget?"
                  subLabel="Does this survey require a budget update?"
                  checked={affectsBudget}
                  onChange={setAffectsBudget}
                  activeColor="bg-red-600"
                />
                {affectsBudget && (
                  <div className="mt-2 pt-4 border-t border-red-150/50 space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <Info className="w-4 h-4 text-blue-500 shrink-0" />
                      <p className="text-sm text-blue-900">
                        Current Active Budget:{' '}
                        <span className="font-black">
                          {formatCurrency(currentBudgetAmount, project?.currency)}
                        </span>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-900 mb-2 block">New Estimated Budget ({project?.currency || 'AED'})</label>
                        <input type="number" required value={recommendedBudget} onChange={e => setRecommendedBudget(e.target.value)}
                          className="w-full bg-white border border-red-150 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 font-semibold" />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-900 mb-2 block">Reason</label>
                        <input type="text" required value={budgetReason} onChange={e => setBudgetReason(e.target.value)}
                          className="w-full bg-white border border-red-150 rounded-xl py-2 px-3 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 font-semibold"
                          placeholder="e.g. Structural modifications required" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 shrink-0">
                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold transition-all">Cancel</button>
                <button type="submit" disabled={isLoading}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                  {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Submitting...</span></> : <span>Submit Assessment</span>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
