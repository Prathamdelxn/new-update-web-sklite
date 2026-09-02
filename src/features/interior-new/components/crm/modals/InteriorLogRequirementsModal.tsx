'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  PenTool,
  Plus,
  Trash2,
  Building2,
  Sparkles,
  Sliders,
  Home,
  Briefcase,
  Utensils,
  Store,
  Layers,
  Zap,
  Droplets,
  Sun,
  Palette,
  Armchair,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/providers/ToastContext';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { motion, AnimatePresence } from 'framer-motion';

export interface RoomRequirement {
  roomName: string;
  description?: string;
  theme?: string;

  // Type of Interior
  interiorType?: string; // Residential, Commercial, Office, Restaurant, Retail, Other

  // Functional Requirements
  roomUsage?: string;
  furnitureRequirements?: string;
  storage?: string;
  electricalPoints?: string;
  lightingRequirements?: string;
  plumbingRequirements?: string;
  circulation?: string;

  // Aesthetic Requirements
  designStyle?: string;
  colours?: string;
  materials?: string;
  flooring?: string;
  ceiling?: string;
  wallFinishes?: string;
  furnitureStyle?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSuccess: () => void;
  users?: any[];
  initialRequirements?: RoomRequirement[];
  initialBudget?: string;
  isReadOnly?: boolean;
}

const INTERIOR_TYPES = [
  { id: 'Residential', label: 'Residential', icon: Home },
  { id: 'Commercial', label: 'Commercial', icon: Building2 },
  { id: 'Office', label: 'Office', icon: Briefcase },
  { id: 'Restaurant', label: 'Restaurant', icon: Utensils },
  { id: 'Retail', label: 'Retail', icon: Store },
  { id: 'Other', label: 'Other', icon: Layers },
];

const POPULAR_STYLES = [
  'Modern Minimalist',
  'Contemporary',
  'Scandinavian',
  'Japandi',
  'Industrial Luxury',
  'Classic / Traditional',
  'Bohemian Chic',
  'Warm Neutral',
];

const DEFAULT_ROOM: RoomRequirement = {
  roomName: '',
  interiorType: 'Residential',
  roomUsage: '',
  furnitureRequirements: '',
  storage: '',
  electricalPoints: '',
  lightingRequirements: '',
  plumbingRequirements: '',
  circulation: '',
  designStyle: '',
  colours: '',
  materials: '',
  flooring: '',
  ceiling: '',
  wallFinishes: '',
  furnitureStyle: '',
  description: '',
  theme: '',
};

export const InteriorLogRequirementsModal = ({
  isOpen,
  onClose,
  customerId,
  onSuccess,
  initialRequirements = [],
  initialBudget = '',
  isReadOnly = false
}: Props) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [budgetRange, setBudgetRange] = useState(initialBudget || '');
  const [activeSubTab, setActiveSubTab] = useState<{ [key: number]: 'functional' | 'aesthetic' | 'notes' }>({});
  const [collapsedRooms, setCollapsedRooms] = useState<{ [key: number]: boolean }>({});

  const [requirements, setRequirements] = useState<RoomRequirement[]>([
    { ...DEFAULT_ROOM, roomName: 'Living Room' }
  ]);

  useEffect(() => {
    if (isOpen) {
      setBudgetRange(initialBudget || '');
      if (initialRequirements && initialRequirements.length > 0) {
        setRequirements(
          initialRequirements.map((r) => ({
            ...DEFAULT_ROOM,
            ...r,
            interiorType: r.interiorType || 'Residential'
          }))
        );
      } else {
        setRequirements([{ ...DEFAULT_ROOM, roomName: 'Living Room' }]);
      }
      setActiveSubTab({});
      setCollapsedRooms({});
    }
  }, [isOpen, initialRequirements, initialBudget]);

  const addRoom = () => {
    setRequirements((prev) => [...prev, { ...DEFAULT_ROOM, roomName: '' }]);
  };

  const duplicateRoom = (index: number) => {
    const source = requirements[index];
    const cloned: RoomRequirement = {
      ...source,
      roomName: `${source.roomName || 'Room'} (Copy)`
    };
    setRequirements((prev) => [...prev, cloned]);
    toast.success('Room requirement duplicated');
  };

  const removeRoom = (index: number) => {
    if (requirements.length === 1) {
      toast.error('You need at least one room requirement.');
      return;
    }
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRoom = (index: number, field: keyof RoomRequirement, value: any) => {
    setRequirements((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const toggleCollapse = (index: number) => {
    setCollapsedRooms((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getSubTab = (index: number): 'functional' | 'aesthetic' | 'notes' => {
    return activeSubTab[index] || 'functional';
  };

  const setSubTab = (index: number, tab: 'functional' | 'aesthetic' | 'notes') => {
    setActiveSubTab((prev) => ({ ...prev, [index]: tab }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requirements.length === 0) {
      toast.error('Please add at least one room requirement.');
      return;
    }
    if (requirements.some((r) => !r.roomName || !r.roomName.trim())) {
      toast.error('Please specify a name for each room/space.');
      return;
    }

    setIsSubmitting(true);

    try {
      const sanitizedRequirements = requirements.map((r) => ({
        roomName: (r.roomName || '').trim(),
        interiorType: (r.interiorType || 'Residential').trim(),
        theme: (r.designStyle || r.theme || '').trim(),
        description: (r.description || '').trim(),

        // Functional
        roomUsage: (r.roomUsage || '').trim(),
        furnitureRequirements: (r.furnitureRequirements || '').trim(),
        storage: (r.storage || '').trim(),
        electricalPoints: (r.electricalPoints || '').trim(),
        lightingRequirements: (r.lightingRequirements || '').trim(),
        plumbingRequirements: (r.plumbingRequirements || '').trim(),
        circulation: (r.circulation || '').trim(),

        // Aesthetic
        designStyle: (r.designStyle || '').trim(),
        colours: (r.colours || '').trim(),
        materials: (r.materials || '').trim(),
        flooring: (r.flooring || '').trim(),
        ceiling: (r.ceiling || '').trim(),
        wallFinishes: (r.wallFinishes || '').trim(),
        furnitureStyle: (r.furnitureStyle || '').trim()
      }));

      const updatePayload: any = {
        status: 'Under Requirement',
        budgetRange: budgetRange.trim(),
        requirements: sanitizedRequirements
      };

      await interiorCrmService.updateCustomer(customerId, updatePayload);

      await interiorCrmService.createActivity({
        customer: customerId,
        type: 'Requirement Gathering',
        status: 'Completed',
        remarks: `Logged detailed functional & aesthetic requirements for ${sanitizedRequirements.length} rooms.`,
        completedDate: new Date()
      });

      toast.success('Design requirements saved successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to save requirements');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 md:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <PenTool size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[hsl(var(--foreground))] tracking-tight">
                Client Design Requirements & Specifications
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Structure requirements by Functional needs, Aesthetic styles, and Interior Type.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
          {/* Overall Project Scope & Estimated Budget */}
          <div className="bg-[hsl(var(--muted)/0.35)] border border-[hsl(var(--border))] rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <DollarSign size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                    Target Estimated Budget
                  </h3>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Client's target budget or approved commercial budget range for this interior scope.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} />
                <input
                  type="text"
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                  placeholder="e.g. ₹5L - ₹10L or ₹15,00,000"
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-2xl pl-9 pr-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all"
                  disabled={isReadOnly}
                />
              </div>

              {/* Quick Budget Selection Chips */}
              {!isReadOnly && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] mr-1">Quick Presets:</span>
                  {['₹3L - ₹5L', '₹5L - ₹10L', '₹10L - ₹15L', '₹15L - ₹25L', '₹25L - ₹50L', '₹50L+'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setBudgetRange(chip)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                        budgetRange === chip
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:border-amber-500/50 hover:text-[hsl(var(--foreground))]'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {requirements.map((req, index) => {
              const currentSubTab = getSubTab(index);
              const isCollapsed = !!collapsedRooms[index];

              return (
                <div
                  key={index}
                  className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl overflow-hidden transition-all"
                >
                  {/* Card Top Title Bar */}
                  <div className="p-4 md:px-6 bg-[hsl(var(--muted)/0.5)] border-b border-[hsl(var(--border))] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 max-w-sm">
                        <input
                          type="text"
                          value={req.roomName}
                          onChange={(e) => updateRoom(index, 'roomName', e.target.value)}
                          placeholder="e.g. Master Bedroom, Living Room, Executive Office"
                          className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-xs font-bold text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:font-normal"
                          required
                          disabled={isReadOnly}
                        />
                      </div>

                      {req.interiorType && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hidden sm:inline-block">
                          {req.interiorType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end md:self-auto">
                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => duplicateRoom(index)}
                            className="p-2 hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded-xl transition-colors"
                            title="Duplicate room"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRoom(index)}
                            className="p-2 hover:bg-rose-500/10 text-[hsl(var(--muted-foreground))] hover:text-rose-600 rounded-xl transition-colors"
                            title="Remove room"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleCollapse(index)}
                        className="p-2 hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] rounded-xl transition-colors"
                      >
                        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Card Collapsible Content */}
                  {!isCollapsed && (
                    <div className="p-5 md:p-6 space-y-5">
                      {/* 1. Type of Interior Selector */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                          Type of Interior
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {INTERIOR_TYPES.map((t) => {
                            const isSelected = (req.interiorType || 'Residential') === t.id;
                            const Icon = t.icon;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => updateRoom(index, 'interiorType', t.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border-[hsl(var(--border))]'
                                }`}
                              >
                                <Icon size={13} />
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sub-tabs: Functional vs Aesthetic vs General Notes */}
                      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pt-2">
                        <button
                          type="button"
                          onClick={() => setSubTab(index, 'functional')}
                          className={`pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 -mb-px outline-none ${
                            currentSubTab === 'functional'
                              ? 'border-emerald-600 text-emerald-600'
                              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                          }`}
                        >
                          <Sliders size={14} />
                          Functional Requirements
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubTab(index, 'aesthetic')}
                          className={`pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 -mb-px outline-none ${
                            currentSubTab === 'aesthetic'
                              ? 'border-emerald-600 text-emerald-600'
                              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                          }`}
                        >
                          <Palette size={14} />
                          Aesthetic Requirements
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubTab(index, 'notes')}
                          className={`pb-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 -mb-px outline-none ${
                            currentSubTab === 'notes'
                              ? 'border-emerald-600 text-emerald-600'
                              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                          }`}
                        >
                          <Sparkles size={14} />
                          Observations & Notes
                        </button>
                      </div>

                      {/* Tab Content 1: Functional Requirements */}
                      {currentSubTab === 'functional' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                              Room Usage & Primary Purpose
                            </label>
                            <input
                              type="text"
                              value={req.roomUsage || ''}
                              onChange={(e) => updateRoom(index, 'roomUsage', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                              placeholder="e.g. Master sleeping & dressing, Formal entertaining, Executive cabin"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                              Furniture Requirements
                            </label>
                            <input
                              type="text"
                              value={req.furnitureRequirements || ''}
                              onChange={(e) => updateRoom(index, 'furnitureRequirements', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                              placeholder="e.g. King-size hydraulic bed with upholstered headboard, 2 side tables, study desk"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                              Storage Requirements
                            </label>
                            <input
                              type="text"
                              value={req.storage || ''}
                              onChange={(e) => updateRoom(index, 'storage', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                              placeholder="e.g. 3-door floor-to-ceiling sliding wardrobe, overhead loft, hidden shoe rack"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                              <Zap size={13} className="text-amber-500" />
                              Electrical Points
                            </label>
                            <input
                              type="text"
                              value={req.electricalPoints || ''}
                              onChange={(e) => updateRoom(index, 'electricalPoints', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                              placeholder="e.g. 2-way bedside switches, 16A AC point, TV & soundbar console wiring, USB docks"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                              <Sun size={13} className="text-amber-500" />
                              Lighting Requirements
                            </label>
                            <input
                              type="text"
                              value={req.lightingRequirements || ''}
                              onChange={(e) => updateRoom(index, 'lightingRequirements', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                              placeholder="e.g. 3000K warm white cove lighting, recessed spot lights, bedside reading lamps"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5 flex items-center gap-1.5">
                              <Droplets size={13} className="text-cyan-500" />
                              Plumbing Requirements
                            </label>
                            <input
                              type="text"
                              value={req.plumbingRequirements || ''}
                              onChange={(e) => updateRoom(index, 'plumbingRequirements', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                              placeholder="e.g. Under-counter basin with hot/cold mixer, geyser provision, RO inlet"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                              Circulation & Space Clearance
                            </label>
                            <input
                              type="text"
                              value={req.circulation || ''}
                              onChange={(e) => updateRoom(index, 'circulation', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                              placeholder="e.g. Minimum 3ft walkway around bed, handicap accessibility, unobstructed door swing"
                            />
                          </div>
                        </div>
                      )}

                      {/* Tab Content 2: Aesthetic Requirements */}
                      {currentSubTab === 'aesthetic' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          {/* Popular styles quick chips */}
                          <div>
                            <label className="block text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">
                              Quick Style Presets
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {POPULAR_STYLES.map((style) => (
                                <button
                                  key={style}
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={() => updateRoom(index, 'designStyle', style)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                                    req.designStyle === style
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]'
                                  }`}
                                >
                                  {style}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                                Design Style
                              </label>
                              <input
                                type="text"
                                value={req.designStyle || ''}
                                onChange={(e) => updateRoom(index, 'designStyle', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                                placeholder="e.g. Modern Minimalist, Japandi, Industrial"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                                Colours & Palette
                              </label>
                              <input
                                type="text"
                                value={req.colours || ''}
                                onChange={(e) => updateRoom(index, 'colours', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                                placeholder="e.g. Warm beige, Olive green accent, Charcoal grey, Walnut wood"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                                Materials & Finishes
                              </label>
                              <input
                                type="text"
                                value={req.materials || ''}
                                onChange={(e) => updateRoom(index, 'materials', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                                placeholder="e.g. Natural teak veneer, Fluted glass, Brushed brass handles, Quartz tops"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                                Flooring Preferences
                              </label>
                              <input
                                type="text"
                                value={req.flooring || ''}
                                onChange={(e) => updateRoom(index, 'flooring', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                                placeholder="e.g. 4x2 Vitrified matte tiles, Hardwood parquet, Italian marble"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                                Ceiling & False Ceiling
                              </label>
                              <input
                                type="text"
                                value={req.ceiling || ''}
                                onChange={(e) => updateRoom(index, 'ceiling', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                                placeholder="e.g. Minimal peripheral gypsum ceiling with shadow gap & LED strip"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                                Wall Finishes & Paneling
                              </label>
                              <input
                                type="text"
                                value={req.wallFinishes || ''}
                                onChange={(e) => updateRoom(index, 'wallFinishes', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                                placeholder="e.g. Limewash texture on bed back wall, Charcoal louvers on TV panel"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                                Furniture Style & Upholstery
                              </label>
                              <input
                                type="text"
                                value={req.furnitureStyle || ''}
                                onChange={(e) => updateRoom(index, 'furnitureStyle', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                                placeholder="e.g. Low-profile modular frame, Boucle upholstery, Curved Scandinavian armchair"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tab Content 3: Observations & Notes */}
                      {currentSubTab === 'notes' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-xs font-bold text-[hsl(var(--muted-foreground))] mb-1.5">
                              Specific Room Instructions / Observations
                            </label>
                            <textarea
                              value={req.description || ''}
                              onChange={(e) => updateRoom(index, 'description', e.target.value)}
                              disabled={isReadOnly}
                              className="w-full bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] rounded-xl px-3.5 py-2.5 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none h-28 resize-none placeholder:text-[hsl(var(--muted-foreground)/0.6)] leading-relaxed"
                              placeholder="Enter any custom client requests, specific dimensions, appliances to fit, or constraints..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={addRoom}
              className="w-full py-4 border-2 border-dashed border-[hsl(var(--border))] rounded-2xl text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--accent))] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Another Room / Space
            </button>
          )}

          {/* Action Footer */}
          <div className="pt-4 flex gap-3 mt-auto border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] transition-colors"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[hsl(var(--primary-foreground))] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] transition-colors disabled:opacity-50 .2)]"
              >
                {isSubmitting ? 'Saving Requirements...' : 'Save Design Requirements'}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};
