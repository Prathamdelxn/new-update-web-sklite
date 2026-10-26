'use client';

// =============================================================================
// Sky-Lite Web — Client Public Requirement Intake & Wishlist Portal
// Allows clients to self-fill their room requirements, style preferences & budget
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Home,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Sparkles,
  Palette,
  Armchair,
  Layers,
  Zap,
  Droplets,
  DollarSign,
  Calendar,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Phone,
  Send,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye
} from 'lucide-react';
import { interiorCrmService } from '@/services/interiorCrm.service';
import { cn } from '@/lib/utils';

interface ClientRoomRequirement {
  roomName: string;
  interiorType?: string;
  designStyle?: string;
  roomUsage?: string;
  furnitureRequirements?: string;
  storage?: string;
  electricalPoints?: string;
  lightingRequirements?: string;
  plumbingRequirements?: string;
  colours?: string;
  materials?: string;
  flooring?: string;
  ceiling?: string;
  budget?: string;
  description?: string;
}

const COMMON_ROOM_PRESETS = [
  'Living Room',
  'Master Bedroom',
  'Modular Kitchen',
  'Dining Area',
  'Kids Bedroom',
  'Guest Bedroom',
  'Foyer / Entryway',
  'Balcony',
  'Pooja Room',
  'Home Office / Study',
  'Walk-in Wardrobe',
  'Bathrooms',
];

const POPULAR_STYLES = [
  'Modern Minimalist',
  'Contemporary',
  'Scandinavian',
  'Japandi',
  'Industrial Luxury',
  'Classic Traditional',
  'Bohemian Chic',
  'Warm Neutral',
  'Art Deco',
];

const DEFAULT_ROOM: ClientRoomRequirement = {
  roomName: '',
  interiorType: 'Residential',
  designStyle: 'Modern Minimalist',
  roomUsage: '',
  furnitureRequirements: '',
  storage: '',
  electricalPoints: '',
  lightingRequirements: '',
  plumbingRequirements: '',
  colours: '',
  materials: '',
  flooring: '',
  ceiling: '',
  budget: '',
  description: '',
};

export default function ClientRequirementSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<any>(null);

  // Form state
  const [rooms, setRooms] = useState<ClientRoomRequirement[]>([]);
  const [overallBudget, setOverallBudget] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);
  const [collapsedRooms, setCollapsedRooms] = useState<{ [key: number]: boolean }>({});

  const fetchPublicData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await interiorCrmService.getPublicDrawingData(token);
      if (res?.success && res?.data) {
        setPortalData(res.data);

        // Pre-fill existing client requirements if previously submitted, or lead specs
        const existingClientReqs = res.data.clientRequirements;
        const fallbackTeamReqs = res.data.requirements;

        if (Array.isArray(existingClientReqs) && existingClientReqs.length > 0) {
          setRooms(existingClientReqs.map((r: any) => ({ ...DEFAULT_ROOM, ...r })));
          setSubmittedSuccessfully(Boolean(res.data.clientRequirementsSubmittedAt));
        } else if (Array.isArray(fallbackTeamReqs) && fallbackTeamReqs.length > 0) {
          setRooms(fallbackTeamReqs.map((r: any) => ({ ...DEFAULT_ROOM, ...r })));
        } else {
          setRooms([
            { ...DEFAULT_ROOM, roomName: 'Living Room' },
            { ...DEFAULT_ROOM, roomName: 'Master Bedroom' },
          ]);
        }

        if (res.data.clientRequirementsNotes) {
          setGeneralNotes(res.data.clientRequirementsNotes);
        }
        if (res.data.lead?.budgetRange) {
          setOverallBudget(res.data.lead.budgetRange);
        }

        if (typeof document !== 'undefined' && res.data.lead?.name) {
          document.title = `${res.data.lead.name} — Requirement Intake | SkyStruct Lite`;
        }
      } else {
        setError(res?.message || 'Requirement link not found or has expired.');
      }
    } catch (err: any) {
      console.error('Failed to load requirement portal', err);
      setError(err?.response?.data?.message || 'This requirement link is invalid, expired, or has been revoked.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchPublicData();
  }, [token]);

  const addRoom = (name = '') => {
    setRooms((prev) => [...prev, { ...DEFAULT_ROOM, roomName: name }]);
  };

  const removeRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, idx) => idx !== index));
  };

  const duplicateRoom = (index: number) => {
    const src = rooms[index];
    setRooms((prev) => [
      ...prev.slice(0, index + 1),
      { ...src, roomName: `${src.roomName} (Copy)` },
      ...prev.slice(index + 1),
    ]);
  };

  const updateRoomField = (index: number, field: keyof ClientRoomRequirement, value: string) => {
    setRooms((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const toggleCollapse = (index: number) => {
    setCollapsedRooms((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rooms.length === 0) {
      alert('Please add at least one room or space');
      return;
    }
    const hasEmptyNames = rooms.some((r) => !r.roomName.trim());
    if (hasEmptyNames) {
      alert('Please give every room or space a name before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await interiorCrmService.submitClientRequirements(token, {
        requirements: rooms,
        notes: generalNotes,
        budgetRange: overallBudget,
      });

      if (res?.success) {
        setSubmittedSuccessfully(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert(res?.message || 'Failed to submit requirements. Please try again.');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(err?.response?.data?.message || 'An error occurred while submitting your requirements.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-sm animate-pulse">
          <PenTool className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold tracking-tight text-slate-900">Loading Requirement Portal</h2>
        <p className="text-xs text-slate-500 mt-1">Preparing your private design briefing sheet...</p>
      </div>
    );
  }

  // Error Screen
  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">Link Inactive or Expired</h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2 mb-6 leading-relaxed">
          {error || 'This requirement share link is no longer available. Please request a new link from your design studio.'}
        </p>
      </div>
    );
  }

  const lead = portalData?.lead || {};
  const org = portalData?.organization || {};
  const hasDrawings = Array.isArray(portalData?.designFiles) && portalData.designFiles.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {org.logo ? (
              <img src={org.logo} alt={org.name || 'Studio'} className="h-7 w-auto max-w-[120px] object-contain shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                {(org.name || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="h-4 w-[1px] bg-slate-200 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {lead.name ? `${lead.name}'s Interior Brief` : 'Client Requirements Intake'}
              </h1>
              <p className="text-[10px] text-slate-500 truncate">Design Wishlist & Space Planning</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasDrawings && (
              <a
                href={`/share/drawing/${token}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
              >
                <Eye size={12} /> View Drawings
              </a>
            )}
            {org.phone && (
              <a
                href={`tel:${org.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                <Phone size={12} /> <span className="hidden sm:inline">Contact Studio</span>
              </a>
            )}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <ShieldCheck size={13} /> Verified Portal
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {/* Banner greeting */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 sm:p-7 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full inline-block">
              Client Specification Sheet
            </span>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight">
              Tell Us About Your Dream Home, {lead.name || 'Client'}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
              Fill in your room wishlist, preferred themes, and functional requirements. Your design team will use these exact notes to build your 2D layouts and 3D renders.
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-xl p-3 shrink-0 text-right sm:text-left space-y-1">
            <p className="text-[10px] font-bold text-emerald-200 uppercase">Property Type</p>
            <p className="text-xs font-bold flex items-center gap-1">
              <Home size={13} /> {lead.propertyType || 'Residential Flat'}
            </p>
            {lead.projectLocation && (
              <p className="text-[11px] text-emerald-100 truncate max-w-[180px]">{lead.projectLocation}</p>
            )}
          </div>
        </div>

        {/* Success Banner if already submitted */}
        {submittedSuccessfully && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-start gap-3 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm space-y-1">
              <p className="font-bold">Requirements Have Been Submitted!</p>
              <p className="text-emerald-700 leading-relaxed">
                Thank you! Your requirements were successfully transmitted to the design team. You can still modify any space below and click <strong>"Update Requirements"</strong> to submit changes anytime.
              </p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Space Adder Chips */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600" />
                  Quick Add Spaces / Rooms
                </h3>
                <p className="text-[11px] text-slate-500">Click any preset space to instantly add it to your wishlist:</p>
              </div>
              <button
                type="button"
                onClick={() => addRoom('Custom Room')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
              >
                <Plus size={13} /> Add Custom Space
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {COMMON_ROOM_PRESETS.map((preset) => {
                const isAlreadyAdded = rooms.some((r) => r.roomName.toLowerCase() === preset.toLowerCase());
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addRoom(preset)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-lg border font-medium transition-all active:scale-95 flex items-center gap-1",
                      isAlreadyAdded
                        ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        : "bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50"
                    )}
                  >
                    <Plus size={11} className={isAlreadyAdded ? "text-slate-400" : "text-emerald-600"} />
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rooms List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} className="text-emerald-600" />
                Configured Spaces ({rooms.length})
              </h3>
              <span className="text-[11px] text-slate-500">Customize specifications for each room</span>
            </div>

            {rooms.map((room, idx) => {
              const isCollapsed = collapsedRooms[idx] ?? false;

              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-2xs transition-all"
                >
                  {/* Room Card Header */}
                  <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={room.roomName}
                        onChange={(e) => updateRoomField(idx, 'roomName', e.target.value)}
                        placeholder="Space Name (e.g. Master Bedroom)"
                        className="font-bold text-xs sm:text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white px-1 py-0.5 rounded outline-none transition-all flex-1 min-w-[140px]"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => duplicateRoom(idx)}
                        title="Duplicate Space"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors text-xs"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRoom(idx)}
                        title="Remove Space"
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCollapse(idx)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                      >
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Room Card Body */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-6 space-y-4 text-xs">
                      {/* Row 1: Style & Interior Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Palette size={12} className="text-emerald-600" />
                            Preferred Design Style / Theme
                          </label>
                          <select
                            value={room.designStyle || 'Modern Minimalist'}
                            onChange={(e) => updateRoomField(idx, 'designStyle', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          >
                            {POPULAR_STYLES.map((style) => (
                              <option key={style} value={style}>{style}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Building2 size={12} className="text-emerald-600" />
                            Space Usage / Functionality
                          </label>
                          <input
                            type="text"
                            value={room.roomUsage || ''}
                            onChange={(e) => updateRoomField(idx, 'roomUsage', e.target.value)}
                            placeholder="e.g. Master suite, study nook, entertainment center"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Row 2: Furniture & Storage Wishlist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Armchair size={12} className="text-emerald-600" />
                            Furniture Wishlist
                          </label>
                          <textarea
                            rows={2}
                            value={room.furnitureRequirements || ''}
                            onChange={(e) => updateRoomField(idx, 'furnitureRequirements', e.target.value)}
                            placeholder="e.g. King bed with hydraulic storage, 2 side tables, ergonomic work chair, TV console"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none leading-relaxed"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Layers size={12} className="text-emerald-600" />
                            Storage & Wardrobe Needs
                          </label>
                          <textarea
                            rows={2}
                            value={room.storage || ''}
                            onChange={(e) => updateRoomField(idx, 'storage', e.target.value)}
                            placeholder="e.g. 4-door wardrobe with lofts, sliding glass shutters, dedicated shoe storage"
                            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Row 3: Colors & Lighting */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Palette size={12} className="text-emerald-600" />
                            Color Preferences & Accents
                          </label>
                          <input
                            type="text"
                            value={room.colours || ''}
                            onChange={(e) => updateRoomField(idx, 'colours', e.target.value)}
                            placeholder="e.g. Warm white walls, beige upholstery, gold hardware accents"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Zap size={12} className="text-emerald-600" />
                            Lighting & Electrical Points
                          </label>
                          <input
                            type="text"
                            value={room.lightingRequirements || ''}
                            onChange={(e) => updateRoomField(idx, 'lightingRequirements', e.target.value)}
                            placeholder="e.g. Warm 3000K ambient cove lights, reading lamps beside bed, AC point"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Row 4: Notes / Specific Wishes */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-emerald-600" />
                          Special Notes or Requests for this Space
                        </label>
                        <input
                          type="text"
                          value={room.description || ''}
                          onChange={(e) => updateRoomField(idx, 'description', e.target.value)}
                          placeholder="e.g. Needs soundproofing, child-friendly corners, space for large indoor plant"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Project-Wide Budget & Notes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <DollarSign size={14} className="text-emerald-600" />
              Overall Project Budget & General Notes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">Estimated Budget Range</label>
                <input
                  type="text"
                  value={overallBudget}
                  onChange={(e) => setOverallBudget(e.target.value)}
                  placeholder="e.g. ₹10 Lakhs - ₹15 Lakhs"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">General Notes / Questions for Design Team</label>
                <textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Any overall timelines, move-in target dates, or specific priorities..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm sticky bottom-4 z-30">
            <div>
              <p className="text-xs font-bold text-slate-900">Ready to Submit Your Brief?</p>
              <p className="text-[11px] text-slate-500">Your design team will be notified immediately to review your requirements.</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Transmitting Wishlist...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>{submittedSuccessfully ? 'Update My Requirements' : 'Submit My Requirements'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-12 text-center text-[11px] text-slate-500">
        <p>© {new Date().getFullYear()} {org.name || 'SkyStruct'}. Powered by SkyStruct Lite Architecture & CRM Portal.</p>
      </footer>
    </div>
  );
}
