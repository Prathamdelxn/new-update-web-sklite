'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Map, Zap, Droplets, Mountain,
  DollarSign, Home, Wind, Ruler, Camera, Image as ImageIcon, Trash2, Plus, Info
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import api from '@/services/api.client';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/upload';
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
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      'w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out shrink-0 cursor-pointer focus:outline-none',
      checked ? activeColor : 'bg-slate-200'
    )}
  >
    <div
      className={cn(
        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out',
        checked ? 'translate-x-6' : 'translate-x-1'
      )}
    />
  </button>
);

const ToggleRow = ({ label, subLabel, checked, onChange, activeColor = 'bg-blue-600' }: any) => (
  <div className="flex items-center justify-between py-2">
    <div className="pr-4">
      <span className="text-xs font-semibold text-slate-800 block">{label}</span>
      {subLabel && <span className="text-[11px] text-slate-500 block mt-0.5">{subLabel}</span>}
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
  const [ceilingHeightUnit, setCeilingHeightUnit] = useState<'ft' | 'm' | 'in' | 'mm' | 'cm'>('ft');
  const [naturalLighting, setNaturalLighting] = useState('Good');
  const [ventilationAvailable, setVentilationAvailable] = useState(false);
  const [structuralModification, setStructuralModification] = useState(false);
  const [structuralNotes, setStructuralNotes] = useState('');
  const [clientStylePreference, setClientStylePreference] = useState('');

  // Extended Interior Diagnostic fields
  const [wallCondition, setWallCondition] = useState<'Solid Brick' | 'Gypsum Drywall' | 'RCC Concrete' | 'Mixed'>('Solid Brick');
  const [dampnessObserved, setDampnessObserved] = useState(false);
  const [dampnessNotes, setDampnessNotes] = useState('');
  const [elevatorAccessibility, setElevatorAccessibility] = useState<'Service Elevator Available' | 'Passenger Elevator Only' | 'Stairs Only'>('Service Elevator Available');
  const [elevatorCapacityKg, setElevatorCapacityKg] = useState('');
  const [electricalPhase, setElectricalPhase] = useState<'Single Phase' | 'Three Phase' | 'Unsure'>('Single Phase');
  const [acPipingReady, setAcPipingReady] = useState(false);
  const [plumbingDrainReady, setPlumbingDrainReady] = useState(false);

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
    setCeilingHeightUnit('ft');
    setNaturalLighting('Good');
    setVentilationAvailable(false);
    setStructuralModification(false);
    setStructuralNotes('');
    setClientStylePreference('');
    setWallCondition('Solid Brick');
    setDampnessObserved(false);
    setDampnessNotes('');
    setElevatorAccessibility('Service Elevator Available');
    setElevatorCapacityKg('');
    setElectricalPhase('Single Phase');
    setAcPipingReady(false);
    setPlumbingDrainReady(false);
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
        setCeilingHeightUnit(existingSurvey.ceilingHeightUnit || 'ft');
        setNaturalLighting(existingSurvey.naturalLighting || 'Good');
        setVentilationAvailable(existingSurvey.ventilationAvailable || false);
        setStructuralModification(existingSurvey.structuralModification || false);
        setStructuralNotes(existingSurvey.structuralNotes || '');
        setClientStylePreference(existingSurvey.clientStylePreference || '');
        setWallCondition(existingSurvey.wallCondition || 'Solid Brick');
        setDampnessObserved(existingSurvey.dampnessObserved || false);
        setDampnessNotes(existingSurvey.dampnessNotes || '');
        setElevatorAccessibility(existingSurvey.elevatorAccessibility || 'Service Elevator Available');
        setElevatorCapacityKg(existingSurvey.elevatorCapacityKg?.toString() || '');
        setElectricalPhase(existingSurvey.electricalPhase || 'Single Phase');
        setAcPipingReady(existingSurvey.acPipingReady || false);
        setPlumbingDrainReady(existingSurvey.plumbingDrainReady || false);
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
        payload.ceilingHeightUnit = ceilingHeightUnit;
        payload.naturalLighting = naturalLighting;
        payload.ventilationAvailable = ventilationAvailable;
        payload.structuralModification = structuralModification;
        payload.structuralNotes = structuralModification ? structuralNotes : undefined;
        payload.clientStylePreference = clientStylePreference || undefined;
        payload.wallCondition = wallCondition;
        payload.dampnessObserved = dampnessObserved;
        payload.dampnessNotes = dampnessObserved ? dampnessNotes : undefined;
        payload.elevatorAccessibility = elevatorAccessibility;
        payload.elevatorCapacityKg = elevatorCapacityKg ? Number(elevatorCapacityKg) : undefined;
        payload.electricalPhase = electricalPhase;
        payload.acPipingReady = acPipingReady;
        payload.plumbingDrainReady = plumbingDrainReady;
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

  const inputCls = 'w-full bg-slate-50/70 border border-slate-200 rounded-xl py-2 px-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all';
  const accessibilityOptions = isInterior
    ? ['Good', 'Fair', 'Poor', 'Needs Work']
    : ['Good', 'Fair', 'Poor', 'Hazardous'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="w-full max-w-2xl relative z-10 max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  {isInterior ? <Home className="w-5 h-5 text-blue-600" /> : <Map className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {existingSurvey
                      ? `Edit ${isInterior ? 'Interior' : 'Site'} Survey`
                      : (isInterior ? 'Record Interior Survey' : 'Record Site Survey')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isInterior ? 'Space condition, MEP & architectural diagnostics' : 'Physical terrain, MEP points & site conditions'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                
                {/* Section: Conditions & Utilities */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {isInterior ? 'Space & Condition Assessment' : 'Conditions & Utilities'}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-2 block">
                      {isInterior ? 'Overall Space Condition' : 'Overall Accessibility'}
                    </label>
                    <div className="p-1 bg-slate-100/90 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/50">
                      {accessibilityOptions.map(o => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setAccessibility(o)}
                          className={cn(
                            'py-2 px-3 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer',
                            accessibility === o
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
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
                  <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Terrain & Soil
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">Terrain / Soil Notes</label>
                      <textarea
                        required
                        rows={2.5}
                        value={terrainNotes}
                        onChange={e => setTerrainNotes(e.target.value)}
                        className={`${inputCls} resize-none`}
                        placeholder="Soil type, slope, clearing needed..."
                      />
                    </div>
                  </div>
                )}

                {/* Interior-only sections */}
                {isInterior && (
                  <>
                    {/* Room Details */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Room Details
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Room Count</label>
                          <input
                            type="number"
                            min="1"
                            value={roomCount}
                            onChange={e => setRoomCount(e.target.value)}
                            className={inputCls}
                            placeholder="e.g. 8"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Ceiling Height</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={ceilingHeight}
                              onChange={e => setCeilingHeight(e.target.value)}
                              className={`${inputCls} flex-1`}
                              placeholder="e.g. 10.5"
                            />
                            <select
                              value={ceilingHeightUnit}
                              onChange={e => setCeilingHeightUnit(e.target.value as any)}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
                            >
                              <option value="ft">ft</option>
                              <option value="m">m</option>
                              <option value="in">in</option>
                              <option value="mm">mm</option>
                              <option value="cm">cm</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-2 block">Natural Lighting</label>
                        <div className="p-1 bg-slate-100/90 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/50">
                          {['Excellent', 'Good', 'Limited', 'None'].map(o => (
                            <button
                              key={o}
                              type="button"
                              onClick={() => setNaturalLighting(o)}
                              className={cn(
                                'py-2 px-3 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer',
                                naturalLighting === o
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              )}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-1" />

                      <ToggleRow
                        label="Ventilation / AC Available"
                        subLabel="Existing ducting or split unit points"
                        checked={ventilationAvailable}
                        onChange={setVentilationAvailable}
                      />
                    </div>

                    {/* Wall & Moisture Diagnostics */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Wall & Moisture Diagnostics
                        </span>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-2 block">Wall Construction Type</label>
                        <div className="p-1 bg-slate-100/90 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/50">
                          {(['Solid Brick', 'Gypsum Drywall', 'RCC Concrete', 'Mixed'] as const).map(w => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => setWallCondition(w)}
                              className={cn(
                                'py-2 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer',
                                wallCondition === w
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              )}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-1" />

                      <ToggleRow
                        label="Dampness / Water Seepage Observed"
                        subLabel="Check for water stains or damp walls before woodwork"
                        checked={dampnessObserved}
                        onChange={setDampnessObserved}
                        activeColor="bg-rose-600"
                      />

                      {dampnessObserved && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Dampness & Leakage Details</label>
                          <textarea
                            rows={2}
                            value={dampnessNotes}
                            onChange={e => setDampnessNotes(e.target.value)}
                            className={`${inputCls} resize-none`}
                            placeholder="e.g. Seepage observed on Bedroom 2 outer wall..."
                          />
                        </div>
                      )}
                    </div>

                    {/* MEP & Utility Readiness */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          MEP & Services Readiness
                        </span>
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-2 block">Electrical Supply Phase</label>
                        <div className="p-1 bg-slate-100/90 rounded-xl grid grid-cols-3 gap-1 border border-slate-200/50">
                          {(['Single Phase', 'Three Phase', 'Unsure'] as const).map(phase => (
                            <button
                              key={phase}
                              type="button"
                              onClick={() => setElectricalPhase(phase)}
                              className={cn(
                                'py-2 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer',
                                electricalPhase === phase
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              )}
                            >
                              {phase}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-1" />

                      <ToggleRow
                        label="AC Copper Piping Laid"
                        subLabel="Internal refrigerant pipes pre-installed"
                        checked={acPipingReady}
                        onChange={setAcPipingReady}
                      />

                      <ToggleRow
                        label="Plumbing & Waste Outlets Positioned"
                        subLabel="Drainage points ready for kitchen/baths"
                        checked={plumbingDrainReady}
                        onChange={setPlumbingDrainReady}
                      />
                    </div>

                    {/* Freight & Elevator Access */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Material Access & Freight Logistics
                        </span>
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-2 block">Elevator / Stair Access</label>
                        <div className="p-1 bg-slate-100/90 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-1 border border-slate-200/50">
                          {(['Service Elevator Available', 'Passenger Elevator Only', 'Stairs Only'] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setElevatorAccessibility(opt)}
                              className={cn(
                                'py-2 px-2 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer',
                                elevatorAccessibility === opt
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {elevatorAccessibility !== 'Stairs Only' && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Elevator Capacity (kg)</label>
                          <input
                            type="number"
                            value={elevatorCapacityKg}
                            onChange={e => setElevatorCapacityKg(e.target.value)}
                            className={inputCls}
                            placeholder="e.g. 1000"
                          />
                        </div>
                      )}
                    </div>

                    {/* Structural & Design */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Structural & Design
                        </span>
                      </div>
                      
                      <ToggleRow
                        label="Structural Modifications Needed"
                        subLabel="Wall removal, partition additions, beam work"
                        checked={structuralModification}
                        onChange={setStructuralModification}
                        activeColor="bg-amber-600"
                      />
                      
                      {structuralModification && (
                        <div className="mt-2">
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Structural Notes</label>
                          <textarea
                            rows={2.5}
                            value={structuralNotes}
                            onChange={e => setStructuralNotes(e.target.value)}
                            className={`${inputCls} resize-none`}
                            placeholder="Describe required structural changes..."
                          />
                        </div>
                      )}
                      
                      <div className="border-t border-slate-100 pt-1 mt-2" />

                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Client Style Preference</label>
                        <textarea
                          rows={3}
                          value={clientStylePreference}
                          onChange={e => setClientStylePreference(e.target.value)}
                          className={`${inputCls} resize-none`}
                          placeholder="e.g. Modern minimalist, warm tones, open-plan kitchen preferred..."
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Photo Upload Sections */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Site Observation Media
                    </span>
                  </div>
                  
                  {/* Main Observation Image */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-2 block">
                      {isInterior ? 'Primary Space Photo (Key Observation)' : 'Primary Site Photo (Key Observation)'}
                    </label>
                    <input type="file" accept="image/*" className="hidden" ref={obsInputRef} onChange={handleObsImageSelect} />
                    
                    <div
                      onClick={() => obsInputRef.current?.click()}
                      className="w-full h-40 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden group transition-all"
                    >
                      {observationFile ? (
                        <img loading="lazy" decoding="async" src={URL.createObjectURL(observationFile)} alt="Obs preview" className="w-full h-full object-cover" />
                      ) : observationImage ? (
                        <img loading="lazy" decoding="async" src={observationImage} alt="Obs source" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <Camera className="w-7 h-7 text-slate-400 mx-auto mb-1 group-hover:text-blue-600 transition-colors" />
                          <p className="text-xs font-semibold text-slate-600">Select {isInterior ? 'space' : 'site'} observation image</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WEBP up to 10MB</p>
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
                        className="mt-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Image
                      </button>
                    )}
                  </div>

                  {/* Additional Room Photos (Interior-only) */}
                  {isInterior && (
                    <div className="border-t border-slate-100 pt-4">
                      <label className="text-xs font-semibold text-slate-700 mb-2.5 block">Additional Space Photos</label>
                      <input type="file" accept="image/*" multiple className="hidden" ref={addInputRef} onChange={handleAddPhotosSelect} />
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {/* Upload button */}
                        <div
                          onClick={() => addInputRef.current?.click()}
                          className="h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 group transition-all"
                        >
                          <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                          <span className="text-[10px] font-semibold text-slate-500">Add Photo</span>
                        </div>

                        {/* Existing Photos URLs */}
                        {additionalPhotos.map((url, idx) => (
                          <div key={`url-${idx}`} className="h-24 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden relative group">
                            <img loading="lazy" decoding="async" src={url} alt="Space attachment" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeAdditionalPhotoUrl(idx)}
                              className="absolute top-1 right-1 p-1 bg-white/90 rounded-md hover:bg-white text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {/* New Photos Files */}
                        {additionalFiles.map((file, idx) => (
                          <div key={`file-${idx}`} className="h-24 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden relative group">
                            <img loading="lazy" decoding="async" src={URL.createObjectURL(file)} alt="File attachment" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeAdditionalFile(idx)}
                              className="absolute top-1 right-1 p-1 bg-white/90 rounded-md hover:bg-white text-rose-600 transition-colors"
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
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Surveyor Comments
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">Observations & Remarks</label>
                    <textarea
                      rows={2.5}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className={`${inputCls} resize-none`}
                      placeholder="General observations, access notes, or site constraints..."
                    />
                  </div>
                </div>

                {/* Budget Impact (common) */}
                <div className={cn(
                  'p-4 sm:p-5 rounded-xl border transition-all space-y-3',
                  affectsBudget ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200'
                )}>
                  <ToggleRow
                    label="Affects Initial Budget?"
                    subLabel="Does this survey identify scope changes requiring budget adjustment?"
                    checked={affectsBudget}
                    onChange={setAffectsBudget}
                    activeColor="bg-amber-600"
                  />
                  {affectsBudget && (
                    <div className="pt-3 border-t border-amber-200/60 space-y-3">
                      <div className="flex items-center gap-2 p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-lg">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-900">
                          Current Active Budget:{' '}
                          <span className="font-bold">
                            {formatCurrency(currentBudgetAmount, project?.currency)}
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                            New Estimated Budget ({project?.currency || 'AED'})
                          </label>
                          <input
                            type="number"
                            required
                            value={recommendedBudget}
                            onChange={e => setRecommendedBudget(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium transition-all"
                            placeholder="e.g. 850000"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Reason</label>
                          <input
                            type="text"
                            required
                            value={budgetReason}
                            onChange={e => setBudgetReason(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium transition-all"
                            placeholder="e.g. Structural modifications required"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>{existingSurvey ? 'Update Survey Report' : 'Submit Survey Report'}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
